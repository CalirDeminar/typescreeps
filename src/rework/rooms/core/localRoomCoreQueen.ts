import { PositionsUtils } from "rework/utils/positions";
import { CreepBuilder } from "utils/creepBuilder";

import { CreepBase } from "roles/role.creep";
import { CreepUtils } from "rework/utils/creepUtils";
export interface CreepQueenMemory {
  role: "queen";
  homeRoom: string;
  targetRoom: string;
  targetSource: string;
  working: boolean;
  workTarget: string;
}
export class LocalRoomCoreQueen {
  private static getStore(room: Room): StructureContainer | StructureStorage {
    const anchor = PositionsUtils.getAnchor(room);
    const container = anchor.findInRange<StructureContainer>(FIND_STRUCTURES, 1, {
      filter: (s) => s.structureType === STRUCTURE_CONTAINER
    });
    const storage = anchor.findInRange<StructureStorage>(FIND_STRUCTURES, 1, {
      filter: (s) => s.structureType === STRUCTURE_STORAGE
    });
    return storage[0] || container[0];
  }
  private static pathColour() {
    return "red";
  }
  private static getContainer(anchor: Flag): StructureContainer | StructureStorage | StructureLink | null {
    return (
      anchor.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 2, {
        filter: (s) => s.structureType === STRUCTURE_STORAGE
      })[0] ||
      anchor.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 1, {
        filter: (s) => s.structureType === STRUCTURE_CONTAINER
      })[0] ||
      null
    );
  }

  private static isWorking(
    creep: Creep,
    container: StructureContainer | StructureStorage | StructureLink
  ): "work" | "fuel" {
    const target = Game.getObjectById<StructureSpawn | StructureExtension>(creep.memory.workTarget);
    switch (true) {
      case creep.store.getUsedCapacity() < 50:
        return "fuel";
      case creep.store.getFreeCapacity() > 0 && creep.pos.isNearTo(container):
        // if full, go to work
        return "work";
      case creep.store.getUsedCapacity() >= 50:
        return "work";
      case !creep.memory.working && creep.store.getUsedCapacity() >= 50 && container.store[RESOURCE_ENERGY] === 0:
        // if container is empty, we have > 50 energy, go to work
        return "work";
      default:
        return "fuel";
    }
  }
  public static refuelSelf(creep: Creep, container: StructureContainer | StructureStorage | StructureLink): void {
    const nearContainer = creep.pos.isNearTo(container);
    if (nearContainer) {
      creep.withdraw(container, RESOURCE_ENERGY);
    } else {
      CreepBase.travelTo(creep, container, this.pathColour());
    }
  }
  private static getClosestStructure(
    creep: Creep,
    type: STRUCTURE_SPAWN | STRUCTURE_EXTENSION
  ): StructureSpawn | StructureExtension | null {
    return creep.pos.findClosestByPath<StructureSpawn | StructureExtension>(FIND_MY_STRUCTURES, {
      filter: (s) => s.structureType === type && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    });
  }
  private static getTerminal(creep: Creep): StructureTerminal | null {
    return creep.room.find<StructureTerminal>(FIND_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_TERMINAL && s.store.getUsedCapacity(RESOURCE_ENERGY) < 1000
    })[0];
  }
  private static findTarget(creep: Creep): string {
    const room = creep.room;
    const towers = creep.room.find<StructureTower>(FIND_MY_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_TOWER
    });
    const lowTowers = towers.filter((t) => t.store.getFreeCapacity(RESOURCE_ENERGY) > 250);
    const terminal = this.getTerminal(creep);
    const spawningFill = room.energyAvailable < room.energyCapacityAvailable;
    if (spawningFill) {
      const target =
        this.getClosestStructure(creep, STRUCTURE_EXTENSION) || this.getClosestStructure(creep, STRUCTURE_SPAWN);
      return target ? target.id : "";
    } else if (lowTowers.length > 0) {
      const target = creep.pos.findClosestByPath(lowTowers);
      return target ? target.id : "";
    } else if (terminal && terminal.store.getUsedCapacity(RESOURCE_ENERGY) < 1000) {
      return terminal.id;
    }
    return "";
  }
  private static fillCore(creep: Creep): void {
    let target = Game.getObjectById<StructureSpawn | StructureExtension | null>(creep.memory.workTarget);
    if (!target || target.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      creep.memory.workTarget = this.findTarget(creep);
    }
    if (creep.memory.workTarget) {
      const target = Game.getObjectById<StructureSpawn | StructureExtension | StructureTower>(creep.memory.workTarget);
      switch (true) {
        case target === null:
          break;
        case target &&
          (target.store.getFreeCapacity(RESOURCE_ENERGY) === 0 ||
            target.store.getUsedCapacity(RESOURCE_ENERGY) > 1000 ||
            (target.store.getFreeCapacity(RESOURCE_ENERGY) < 25 && target.structureType === STRUCTURE_TOWER)):
          creep.memory.workTarget = "";
          break;
        case target && creep.pos.isNearTo(target):
          if (target) {
            creep.transfer(target, RESOURCE_ENERGY);
          }
          break;
        default:
          if (target) {
            CreepBase.travelTo(creep, target, this.pathColour());
          }
          break;
      }
    }
  }
  private static runQueen(creep: Creep) {
    if (creep.ticksToLive) {
      const startCpu = Game.cpu.getUsed();
      const room = creep.room;
      const anchor = room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0];
      const container = this.getContainer(anchor);
      if (container) {
        switch (this.isWorking(creep, container)) {
          case "work":
            // console.log("Fill");
            this.fillCore(creep);
            break;
          case "fuel":
            // console.log("fuel");
            this.refuelSelf(creep, container);
            break;
        }
      }
      const endCpu = Game.cpu.getUsed();
      CreepUtils.recordCreepPerformance(creep, endCpu - startCpu);
    }
  }
  private static spawnQueen(room: Room, container: StructureContainer | StructureStorage): void {
    if (container && container.store.getUsedCapacity() > 0) {
      const activeQueens = CreepUtils.filterCreeps("queen", room.name, room.name);
      const queuedQueens = CreepUtils.filterQueuedCreeps(room.name, "queen", room.name, room.name);
      if (
        activeQueens.length < 1 ||
        (activeQueens.length === 1 &&
          activeQueens[0] &&
          activeQueens[0].ticksToLive &&
          activeQueens[0].ticksToLive < 100)
      ) {
        const optimalEnergy =
          activeQueens.length === 1
            ? Math.min(room.energyCapacityAvailable, 1250)
            : Math.max(room.energyAvailable, 300);
        const template = {
          template: CreepBuilder.buildHaulingCreep(optimalEnergy),
          memory: {
            ...CreepBase.baseMemory,
            role: "queen",
            working: false,
            homeRoom: room.name,
            targetRoom: room.name
          }
        };
        if (queuedQueens.length > 0) {
          const index = CreepUtils.findQueuedCreepIndex(room.name, "queen", room.name, room.name);
          if (index >= 0) {
            Memory.roomStore[room.name].spawnQueue[index] = template;
          }
        } else {
          Memory.roomStore[room.name].spawnQueue.push(template);
        }
      }
    }
  }
  public static run(room: Room): void {
    const store = this.getStore(room);
    this.spawnQueen(room, store);
    const queen = CreepUtils.filterCreeps("queen", room.name, room.name)[0];
    if (queen) {
      this.runQueen(queen);
    }
  }
}
