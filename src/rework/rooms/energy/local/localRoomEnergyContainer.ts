import { CreepUtils } from "rework/utils/creepUtils";
import { PositionsUtils } from "rework/utils/positions";
import { RoomUtils } from "rework/utils/roomUtils";
import { CreepBase } from "roles/role.creep";
import { Constants } from "utils/constants";
import { CreepBuilder } from "utils/creepBuilder";
import { UtilPosition } from "utils/util.position";
export interface CreepHarvesterStaticContainerMemory {
  role: "harvesterStatic";
  homeRoom: string;
  targetRoom: string;
  targetSource: string;
}
export interface CreepHaulerContainerMemory {
  role: "hauler";
  homeRoom: string;
  targetRoom: string;
  working: boolean;
  targetSource: string;
  targetStore: string;
  dropOfTarget: string;
}
export class LocalRoomEnergyContainer {
  private static deadRoom(room: Room): boolean {
    const energyStorage = room.find<StructureStorage | StructureContainer>(FIND_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE
    });
    const totalEnergy = energyStorage.reduce((acc: number, store) => store.store.getUsedCapacity() + acc, 0);
    const energyToFill = totalEnergy >= room.energyCapacityAvailable;
    const canHarvest = CreepUtils.filterCreeps("staticHarvester", room.name, room.name).length > 0;
    const canMoveEnergy =
      CreepUtils.filterCreeps("hauler", room.name, room.name).length +
        CreepUtils.filterCreeps("queen", room.name, room.name).length >
      0;
    return !((energyToFill && canMoveEnergy) || (canHarvest && canMoveEnergy));
  }
  private static shouldReplaceCreeps(creeps: Creep[], queuedCreeps: CreepRecipie[], max: number): boolean {
    return (
      creeps.length + queuedCreeps.length < max
      // || (creeps.length + queuedCreeps.length === max && !!creeps.find((c) => c.ticksToLive && c.ticksToLive < 150))
    );
  }
  private static getStoreTarget(creep: Creep): Structure | null {
    const anchor = UtilPosition.getAnchor(creep.room);
    if (!anchor) {
      return null;
    }
    const storage = anchor.findInRange(FIND_MY_STRUCTURES, 1, {
      filter: (s) => s.structureType === STRUCTURE_STORAGE && s.store.getFreeCapacity()
    })[0];
    const container = anchor.findInRange(FIND_STRUCTURES, 1, {
      filter: (s) => s.structureType === STRUCTURE_CONTAINER && s.store.getFreeCapacity()
    })[0];
    const spawn = anchor.findInRange(FIND_MY_STRUCTURES, 1, {
      filter: (s) =>
        s.structureType === STRUCTURE_SPAWN && s.store.getFreeCapacity(RESOURCE_ENERGY) > creep.store.getCapacity()
    })[0];
    const extension = creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: (s: AnyStructure) =>
        s.structureType === STRUCTURE_EXTENSION && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    });
    return storage || container || spawn || extension;
  }
  private static spawnStaticHarvester(source: Source, container: Structure): boolean {
    const room = source.room;
    const activeHarvesters = CreepUtils.filterCreeps("harvesterStatic", room.name, room.name, source.id);
    const queuedHarvesters = CreepUtils.filterQueuedCreeps(
      room.name,
      "harvesterStatic",
      room.name,
      room.name,
      source.id
    );
    const hasHarvesterActive = !!activeHarvesters.find((c) => !!c.ticksToLive);
    const shouldReplaceHarvester = this.shouldReplaceCreeps(activeHarvesters, [], Constants.maxStatic);
    const deadRoom = this.deadRoom(source.room);
    // clean up old shuttles
    if (hasHarvesterActive) {
      CreepUtils.filterCreeps("harvesterShuttle", room.name, room.name, source.id).map((c) => c.suicide());
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
        const index = CreepUtils.findQueuedCreepIndex(room.name, "harvesterStatic", room.name, room.name, source.id);
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
  private static spawnHaulers(source: Source, container: StructureContainer): boolean {
    // const anchor = UtilPosition.getAnchor(source.room);
    const room = source.room;
    // const range = anchor.findPathTo(source.pos, { ignoreCreeps: true }).length;
    const allHaulers = CreepUtils.filterCreeps("hauler", room.name, room.name);
    const activeHaulers = CreepUtils.filterCreeps("hauler", room.name, room.name, container.id);
    // const currentCarry = _.reduce(activeHaulers, (acc, c) => acc + c.store.getCapacity(), 0);
    // const currentThroughput = ((currentCarry / (range + range * 2)) * (1500 - range)) / 1500;
    // console.log("----------------------");
    // console.log(`Range: ${range}  Capacity: ${currentCarry}   Throughput: ${currentThroughput}`);
    const queuedHaulers = CreepUtils.filterQueuedCreeps(room.name, "hauler", room.name, room.name, container.id);
    const maxHaulers = room.energyCapacityAvailable > 1000 ? 1 : Constants.maxHaulers;
    const deadRoom = this.deadRoom(source.room);
    const shouldReplaceHauler = this.shouldReplaceCreeps(activeHaulers, queuedHaulers, maxHaulers);
    // (activeHaulers.length < maxHaulers + 1 && currentThroughput < 10);
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
            c.memory.targetSource === source.id &&
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
  private static spawnCreeps(source: Source, container: StructureContainer): void {
    this.spawnHaulers(source, container);
    this.spawnStaticHarvester(source, container);
  }
  private static runHauler(creep: Creep, source: Source, container: StructureContainer): void {
    if (creep.ticksToLive) {
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
        creep.memory.targetStore !== "" ? Game.getObjectById<Structure>(creep.memory.targetStore) : null;
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
        case !withdrawing && (creep.memory.targetStore === "" || (storeTarget && Game.time % 10 === 0)):
          const target = this.getStoreTarget(creep);
          creep.memory.targetStore = target ? target.id : "";
        // break;
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

      const endCpu = Game.cpu.getUsed();
      CreepUtils.recordCreepPerformance(creep, endCpu - startCpu);
    }
  }
  private static runHarvester(creep: Creep, source: Source, container: StructureContainer): void {
    if (creep.ticksToLive) {
      const startCpu = Game.cpu.getUsed();
      if (container && creep.pos.getRangeTo(container) > 0) {
        // move to source / container
        CreepBase.travelTo(creep, container ? container : source, "orange");
        return;
      }
      const workParts = creep.body.filter((p) => p.type === WORK).length;
      const repairContainer =
        container && creep.store.getUsedCapacity() > workParts && container.hits < container.hitsMax - workParts * 100;
      if (repairContainer && container && creep.pos.isNearTo(container)) {
        // maintain container
        creep.repair(container);
        return;
      }
      const creepFull =
        creep.store.getFreeCapacity() < workParts * 2 &&
        !creep.pos.isEqualTo(container.pos) &&
        container.store.getFreeCapacity() >= creep.store.getUsedCapacity();
      const canDropEnergy = creep.pos.isEqualTo(container.pos);
      if (creep.pos.isNearTo(source) && source.energy > 0 && (canDropEnergy || !creepFull)) {
        // always harvest if energy to harvest
        creep.harvest(source);
      }
      // if we're not on the container and near full, then we'll transfer to it
      if (creepFull && !canDropEnergy) {
        creep.transfer(container, RESOURCE_ENERGY);
      }
      const endCpu = Game.cpu.getUsed();
      CreepUtils.recordCreepPerformance(creep, endCpu - startCpu);
    }
  }
  private static runCreeps(source: Source, container: StructureContainer): void {
    const harvesters = _.filter(
      Game.creeps,
      (c) =>
        c.memory.role === "harvesterStatic" &&
        c.memory.targetSource === source.id &&
        c.memory.homeRoom === source.room.name
    );
    const haulers = _.filter(
      Game.creeps,
      (c) =>
        c.memory.role === "hauler" && c.memory.targetSource === container.id && c.memory.homeRoom === source.room.name
    );
    harvesters.forEach((creep) => this.runHarvester(creep, source, container));
    haulers.forEach((creep) => this.runHauler(creep, source, container));
  }
  public static run(source: Source): void {
    const startCpu = Game.cpu.getUsed();
    const container = PositionsUtils.findStructureInRange(source.pos, 1, STRUCTURE_CONTAINER);
    if (container && container.structureType === STRUCTURE_CONTAINER) {
      this.spawnCreeps(source, container);
      const usedCpu = Game.cpu.getUsed() - startCpu;
      RoomUtils.recordFilePerformance(source.room.name, "roomLocalEnergyContainer", usedCpu);
      this.runCreeps(source, container);
    }
  }
}
