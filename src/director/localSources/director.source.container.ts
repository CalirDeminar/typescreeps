import { Constants } from "utils/constants";
import { CreepBuilder } from "utils/creepBuilder";
import { CreepBase } from "roles/role.creep";

export class SourceContainerDirector {
  private static getCreepRoleAt(role: string, sourceId: string, roomName: string): Creep[] {
    return _.filter(
      Game.creeps,
      (c) => c.memory.role === role && c.memory.targetSource === sourceId && c.memory.homeRoom === roomName
    );
  }
  private static shouldReplaceCreeps(creeps: Creep[], queuedCreeps: CreepRecipie[], max: number): boolean {
    return (
      creeps.length + queuedCreeps.length < max ||
      (creeps.length + queuedCreeps.length === max && !!creeps.find((c) => c.ticksToLive && c.ticksToLive < 150))
    );
  }
  private static spawnStaticHarvester(room: Room, source: Source, container: StructureContainer): boolean {
    const activeHarvesters = this.getCreepRoleAt("harvesterStatic", source.id, room.name);
    const queuedHarvesters = Memory.roomStore[room.name].spawnQueue.filter(
      (c) =>
        c.memory.role === "harvesterStatic" && c.memory.targetSource === source.id && c.memory.homeRoom === room.name
    );
    const hasHarvesterActive = !!activeHarvesters.find((c) => !!c.ticksToLive);
    const shouldReplaceHarvester = this.shouldReplaceCreeps(activeHarvesters, [], Constants.maxStatic);
    const deadRoom = _.filter(Game.creeps, (c) => c.memory.homeRoom === source.room.name).length < 4;
    // clean up old shuttles
    if (hasHarvesterActive) {
      this.getCreepRoleAt("harvesterShuttle", source.id, room.name).map((c) => c.suicide());
    }
    if (shouldReplaceHarvester) {
      const template = {
        template: deadRoom
          ? CreepBuilder.buildScaledBalanced(source.room.energyAvailable)
          : CreepBuilder.buildStaticHarvester(source.room.energyCapacityAvailable),
        memory: {
          ...CreepBase.baseMemory,
          role: "harvesterStatic",
          working: false,
          targetSource: source.id,
          homeRoom: source.room.name,
          targetRoom: source.room.name,
          targetStore: container.id
        }
      };
      if (queuedHarvesters.length > 0) {
        const index = Memory.roomStore[source.room.name].spawnQueue.findIndex((c) => {
          c.memory.role === "harvesterStatic" &&
            c.memory.targetSource === source.id &&
            c.memory.homeRoom === source.room.name &&
            c.memory.targetRoom === source.room.name &&
            c.memory.targetStore === container.id;
        });
        if (index >= 0) {
          Memory.roomStore[source.room.name].spawnQueue[index] = template;
        }
      } else {
        Memory.roomStore[source.room.name].spawnQueue.push(template);
      }
      return true;
    }
    return false;
  }
  private static spawnHaulers(room: Room, container: StructureContainer, anchor: Flag): boolean {
    const range = anchor.pos.findPathTo(container.pos, { ignoreCreeps: true }).length;
    const allHaulers = _.filter(
      Game.creeps,
      (c: Creep) => c.memory.role === "hauler" && c.memory.homeRoom === room.name
    );
    const activeHaulers = this.getCreepRoleAt("hauler", container.id, room.name);
    const currentCarry = _.reduce(activeHaulers, (acc, c) => acc + c.store.getCapacity(), 0);
    const currentThroughput = ((currentCarry / (range + range * 2)) * (1500 - range)) / 1500;
    // console.log("----------------------");
    // console.log(`Range: ${range}  Capacity: ${currentCarry}   Throughput: ${currentThroughput}`);
    const queuedHaulers = Memory.roomStore[room.name].spawnQueue.filter(
      (c) => c.memory.role === "hauler" && c.memory.targetSource === container.id && c.memory.homeRoom === room.name
    );
    const maxHaulers = room.energyCapacityAvailable > 1000 ? 1 : Constants.maxHaulers;
    const deadRoom = _.filter(Game.creeps, (c) => c.memory.homeRoom === room.name).length < 4;
    const shouldReplaceHauler =
      this.shouldReplaceCreeps(activeHaulers, [], maxHaulers) ||
      (activeHaulers.length < maxHaulers + 1 && currentThroughput < 10);
    if (shouldReplaceHauler) {
      const toSpend = deadRoom
        ? room.energyAvailable
        : allHaulers.length > 0
        ? Math.max(300, Math.min(room.energyAvailable, 1000))
        : Math.min(room.energyCapacityAvailable, 1000);
      const template = {
        template: CreepBuilder.buildHaulingCreep(toSpend),
        memory: {
          ...CreepBase.baseMemory,
          role: "hauler",
          working: false,
          targetSource: container.id,
          homeRoom: room.name,
          targetRoom: room.name
        }
      };
      if (queuedHaulers.length > 0) {
        const index = Memory.roomStore[room.name].spawnQueue.findIndex(
          (c) =>
            c.memory.role === "hauler" &&
            c.memory.targetSource === container.id &&
            c.memory.homeRoom === room.name &&
            c.memory.targetRoom === room.name
        );
        if (index >= 0) {
          Memory.roomStore[room.name].spawnQueue[index] = template;
        }
      } else {
        Memory.roomStore[room.name].spawnQueue.push(template);
      }

      return true;
    }
    return false;
  }
  private static spawnCreeps(room: Room, source: Source, container: StructureContainer, anchor: Flag): void {
    // TODO - base spawn priority on amount of energy in room in containers
    this.spawnStaticHarvester(room, source, container) || this.spawnHaulers(room, container, anchor);
  }
  private static setWorkingState(creep: Creep, container: StructureContainer) {
    const working = creep.memory.working;
    const workParts = creep.body.filter((p) => p.type === WORK).length;
    const full =
      creep.store.getFreeCapacity() < workParts * 2 &&
      !creep.pos.isEqualTo(container.pos) &&
      container.store.getFreeCapacity() >= creep.store.getUsedCapacity();
    const empty = creep.store.getUsedCapacity() === 0;
    if (!working && empty) {
      creep.memory.working = true;
      creep.memory.dropOffTarget = "";
    } else if (working && full) {
      creep.memory.working = false;
    }
  }
  private static runHarvester(creep: Creep, source: Source, container: StructureContainer): void {
    if (creep.ticksToLive) {
      this.setWorkingState(creep, container);
      const working = creep.memory.working;
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
  private static runHarvesters(source: Source, container: StructureContainer): void {
    _.filter(
      Game.creeps,
      (c) =>
        c.memory.role === "harvesterStatic" &&
        c.memory.targetSource === source.id &&
        c.memory.homeRoom === source.room.name
    )
      .sort((a, b) => a.store.getUsedCapacity() - b.store.getUsedCapacity())
      .map((c) => {
        this.runHarvester(c, source, container);
      });
  }
  private static getStoreTarget(creep: Creep): Structure | null {
    return (
      creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (s: AnyStructure) => s.structureType === STRUCTURE_STORAGE
      }) ||
      creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (s: AnyStructure) =>
          s.structureType === STRUCTURE_CONTAINER &&
          s.store.getFreeCapacity() > 0 &&
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
      const startCpu = Game.cpu.getUsed();
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
        creep.memory.targetStore !== "" ? Game.getObjectById(creep.memory.targetStore) : null;
      const setupCpu = Game.cpu.getUsed() - startCpu;
      switch (true) {
        case withdrawing && creep.pos.isNearTo(container):
          const resource = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1)[0];
          if (resource) {
            creep.pickup(resource);
          } else if (container.store.getUsedCapacity() > Math.min(creep.store.getFreeCapacity(), 2000)) {
            // only withdraw energy if going to fill in 1 go
            //  reduces intents
            //  stops 2 haulers fighting over energy store in container
            creep.withdraw(container, RESOURCE_ENERGY);
          }
          break;
        case withdrawing:
          CreepBase.travelTo(creep, container, "blue");
          break;
        case !withdrawing && creep.memory.targetStore === "":
          const target = this.getStoreTarget(creep);
          creep.memory.targetStore = target ? target.id : "";
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
      const actionCpu = Game.cpu.getUsed() - (setupCpu + startCpu);
      if (Game.time % 5 === 0) {
        // console.log(`Hauler: ${creep.name}: setup: ${setupCpu.toPrecision(2)} - actions: ${actionCpu.toPrecision(2)}`);
      }
    }
  }
  private static runHaulers(container: StructureContainer, anchor: Flag): void {
    _.filter(
      Game.creeps,
      (c) =>
        c.memory.role === "hauler" &&
        c.memory.targetSource === container.id &&
        c.memory.homeRoom === container.room.name
    ).map((c) => {
      this.runHauler(c, container);
    });
  }
  public static run(room: Room, source: Source, container: StructureContainer, anchor: Flag): void {
    let cpu = Game.cpu.getUsed();
    let lastCpu = cpu;
    this.spawnCreeps(room, source, container, anchor);
    cpu = Game.cpu.getUsed();
    const spawnCpu = cpu - lastCpu;
    lastCpu = cpu;
    this.runHarvesters(source, container);
    cpu = Game.cpu.getUsed();
    const harvesterCpu = cpu - lastCpu;
    lastCpu = cpu;
    this.runHaulers(container, anchor);
    cpu = Game.cpu.getUsed();
    const haulerCpu = cpu - lastCpu;
    if (Game.time % 5 === 0) {
      // console.log(
      //   `Source Runner: ${source.id} - ` +
      //     `SpawnCpu: ${spawnCpu.toPrecision(2)} - ` +
      //     `harvesterCpu: ${harvesterCpu.toPrecision(2)} - ` +
      //     `haulerCpu ${haulerCpu.toPrecision(2)}`
      // );
    }
  }
}
