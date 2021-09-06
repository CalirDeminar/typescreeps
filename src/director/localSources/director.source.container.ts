import { Constants } from "utils/constants";
import { CreepBuilder } from "utils/creepBuilder";
import { CreepBase } from "roles/role.creep";

export class SourceContainerDirector {
  private static getCreepRoleAt(role: string, sourceId: string): Creep[] {
    return _.filter(Game.creeps, (c) => c.memory.role === role && c.memory.targetSource === sourceId);
  }
  private static shouldReplaceCreeps(creeps: Creep[], max: number): boolean {
    return creeps.length < max || (creeps.length === max && !!creeps.find((c) => c.ticksToLive && c.ticksToLive < 150));
  }
  private static spawnStaticHarvester(room: Room, source: Source, container: StructureContainer): boolean {
    const activeHarvesters = this.getCreepRoleAt("harvesterStatic", source.id);
    const hasHarvesterActive = !!activeHarvesters.find((c) => !!c.ticksToLive);
    const shouldReplaceHarvester = this.shouldReplaceCreeps(activeHarvesters, Constants.maxStatic);
    // clean up old shuttles
    if (hasHarvesterActive) {
      this.getCreepRoleAt("harvesterShuttle", source.id).map((c) => c.suicide());
    }
    if (shouldReplaceHarvester) {
      Memory.roomStore[source.room.name].nextSpawn = {
        template: CreepBuilder.buildStaticHarvester(source.room.energyCapacityAvailable),
        memory: {
          ...CreepBase.baseMemory,
          role: "harvesterStatic",
          working: false,
          born: Game.time,
          targetSource: source.id,
          homeRoom: source.room.name,
          targetRoom: source.room.name,
          targetStore: container.id
        }
      };
      return true;
    }
    return false;
  }
  private static spawnHaulers(room: Room, container: StructureContainer, anchor: Flag): boolean {
    const allHaulers = _.filter(Game.creeps, (c: Creep) => c.memory.role === "hauler");
    const activeHaulers = this.getCreepRoleAt("hauler", container.id);
    const maxHaulers = room.energyCapacityAvailable > 1000 ? 1 : Constants.maxHaulers;
    const shouldReplaceHauler = this.shouldReplaceCreeps(activeHaulers, maxHaulers);
    if (shouldReplaceHauler) {
      const toSpend =
        allHaulers.length < 1
          ? Math.max(200, Math.min(room.energyAvailable, 1000))
          : Math.min(room.energyCapacityAvailable, 1000);
      Memory.roomStore[room.name].nextSpawn = {
        template: CreepBuilder.buildHaulingCreep(toSpend),
        memory: {
          ...CreepBase.baseMemory,
          role: "hauler",
          working: false,
          born: Game.time,
          targetSource: container.id,
          homeRoom: room.name,
          targetRoom: room.name
        }
      };
      return true;
    }
    return false;
  }
  private static spawnCreeps(room: Room, source: Source, container: StructureContainer, anchor: Flag): void {
    // TODO - base spawn priority on amount of energy in room in containers
    this.spawnStaticHarvester(room, source, container) || this.spawnHaulers(room, container, anchor);
  }
  private static setWorkingState(creep: Creep) {
    const working = creep.memory.working;
    const workParts = creep.body.filter((p) => p.type === WORK).length;
    const full = creep.store.getFreeCapacity() < workParts * 2;
    const empty = creep.store.getUsedCapacity() === 0;
    if (!working && empty) {
      creep.memory.working = true;
      creep.memory.dropOffTarget = "";
    } else if (working && full) {
      creep.memory.working = false;
    }
  }
  private static runHarvester(creep: Creep, source: Source): void {
    if (creep.ticksToLive) {
      this.setWorkingState(creep);
      const working = creep.memory.working;
      const container = working ? null : CreepBase.findContainer(creep);
      const workParts = creep.body.filter((p) => p.type === WORK).length;
      const repairContainer =
        container && creep.store.getUsedCapacity() > workParts && container.hits < container.hitsMax - workParts * 100;
      switch (true) {
        case container && creep.pos.getRangeTo(container) > 0:
          CreepBase.travelTo(creep, container ? container : source, "orange", 0);
          break;
        case repairContainer && container && creep.pos.isNearTo(container):
          if (container) {
            creep.repair(container);
          }
        case working && creep.pos.isNearTo(source):
          if (source.energy > 0) {
            creep.harvest(source);
          }
          break;
        case working:
          CreepBase.travelTo(creep, container ? container : source, "orange", 0);
          break;
        case !working && container && creep.pos.isNearTo(container):
          if (container) {
            creep.transfer(container, RESOURCE_ENERGY);
            if (source.energy > 0 && creep.pos.isNearTo(source)) {
              creep.harvest(source);
            }
          }
          break;
        default:
          if (container) {
            CreepBase.travelTo(creep, container, "orange");
          }
      }
    }
  }
  private static runHarvesters(source: Source): void {
    _.filter(Game.creeps, (c) => c.memory.role === "harvesterStatic" && c.memory.targetSource === source.id)
      .sort((a, b) => a.store.getUsedCapacity() - b.store.getUsedCapacity())
      .map((c) => {
        this.runHarvester(c, source);
      });
  }
  private static getStoreTarget(creep: Creep): Structure | null {
    return (
      creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (s: AnyStructure) =>
          s.structureType === STRUCTURE_STORAGE && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
      }) ||
      creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (s: AnyStructure) =>
          s.structureType === STRUCTURE_CONTAINER &&
          s.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
          s.pos.findInRange(FIND_FLAGS, 1).length > 0
      }) ||
      creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (s: AnyStructure) => s.structureType === STRUCTURE_SPAWN && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
      }) ||
      creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (s: AnyStructure) =>
          s.structureType === STRUCTURE_EXTENSION && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
      })
    );
  }
  private static runHauler(creep: Creep, container: StructureContainer): void {
    if (creep.ticksToLive && !CreepBase.fleeHostiles(creep)) {
      let withdrawing = creep.memory.working;
      const empty = creep.store.getUsedCapacity() === 0;
      const full = creep.store.getFreeCapacity() === 0;
      // setup working state
      switch (true) {
        case withdrawing && container.store.getUsedCapacity() === 0:
        case !withdrawing && empty && creep.ticksToLive > 100:
          creep.memory.working = true;
          break;
        case withdrawing && full:
          creep.memory.working = false;
          creep.memory.dropOffTarget = "";
      }
      withdrawing = creep.memory.working;
      const storeTarget: Structure | null =
        creep.memory.targetStore !== "" ? Game.getObjectById(creep.memory.targetStore) : this.getStoreTarget(creep);
      switch (true) {
        case withdrawing && creep.pos.isNearTo(container):
          if (container.store.getUsedCapacity() > Math.min(creep.store.getFreeCapacity(), 2000)) {
            // only withdraw energy if going to fill in 1 go
            //  reduces intents
            //  stops 2 haulers fighting over energy store in container
            creep.withdraw(container, RESOURCE_ENERGY);
          }
          break;
        case withdrawing:
          CreepBase.travelTo(creep, container, "blue");
          break;
        case storeTarget && creep.pos.isNearTo(storeTarget):
          if (storeTarget) {
            creep.transfer(storeTarget, RESOURCE_ENERGY);
          }
          break;
        case !!storeTarget:
          if (storeTarget) {
            CreepBase.travelTo(creep, storeTarget, "blue");
          }
      }
    }
  }
  private static runHaulers(container: StructureContainer, anchor: Flag): void {
    _.filter(Game.creeps, (c) => c.memory.role === "hauler" && c.memory.targetSource === container.id).map((c) => {
      this.runHauler(c, container);
    });
  }
  public static run(room: Room, source: Source, container: StructureContainer, anchor: Flag): void {
    this.spawnCreeps(room, source, container, anchor);
    this.runHarvesters(source);
    this.runHaulers(container, anchor);
  }
}
