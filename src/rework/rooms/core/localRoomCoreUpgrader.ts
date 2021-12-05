import { CreepUtils } from "rework/utils/creepUtils";
import { CreepBase } from "roles/role.creep";
import { Constants } from "utils/constants";
import { CreepBuilder } from "utils/creepBuilder";
export interface CreepUpgraderMemory {
  role: "upgrader" | "builder";
  homeRoom: string;
  targetRoom: string;
  targetSource: string;
  working: boolean;
  upgradeTarget: string;
}
export class LocalRoomCoreUpgrader {
  private static pathColour(): string {
    return "green";
  }
  private static spawnUpgrader(room: Room): void {
    const activeUpgraders = CreepUtils.filterCreeps("upgrader", room.name, room.name);
    const queuedUpgraders = CreepUtils.filterQueuedCreeps(room.name, "upgrader", room.name, room.name);
    const level = room.controller?.level || 0;
    const shouldSpawnUpgrader = activeUpgraders.length < Constants.upgraders;
    if (room.controller && room.controller.my && shouldSpawnUpgrader) {
      const template = {
        template: CreepBuilder.buildScaledBalanced(Math.min(room.energyCapacityAvailable, 400)),
        memory: {
          ...CreepBase.baseMemory,
          role: "upgrader",
          working: false,
          homeRoom: room.name,
          targetRoom: room.name,
          upgradeTarget: room.controller.id
        }
      };
      if (room.controller && queuedUpgraders.length > 0) {
        const index = CreepUtils.findQueuedCreepIndex(room.name, "upgrader", room.name, room.name);
        if (index >= 0) {
          Memory.roomStore[room.name].spawnQueue[index] = template;
        }
      } else {
        Memory.roomStore[room.name].spawnQueue.push(template);
      }
    }
  }
  public static getEnergySource(room: Room): StructureContainer | StructureLink | StructureSpawn | undefined {
    const containerHaulers = CreepUtils.filterCreeps("controllerHauler", room.name);
    // const isSpawning = Memory.roomStore[room.name].spawnQueue.length > 0;
    // if (isSpawning) {
    //   return undefined;
    // }
    const container = room.controller?.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 3, {
      filter: (s) =>
        s.structureType === STRUCTURE_CONTAINER &&
        s.pos.findInRange(FIND_SOURCES, 1).length === 0 &&
        containerHaulers.length > 0
    })[0];
    const link = room.controller?.pos.findInRange<StructureLink>(FIND_MY_STRUCTURES, 3, {
      filter: (s) => s.structureType === STRUCTURE_LINK
    })[0];
    return link || container;
  }
  public static runUpgrader(
    creep: Creep,
    energySource: StructureContainer | StructureLink | StructureSpawn | undefined
  ): void {
    if (creep.ticksToLive) {
      const startCpu = Game.cpu.getUsed();
      const controller = Game.getObjectById<StructureController>(creep.memory.upgradeTarget);
      CreepBase.maintainRoad(creep);
      const working = creep.memory.working;
      const empty = creep.store.getFreeCapacity() === 0;
      if (!creep.memory.upgradeTarget && creep.room.controller) {
        creep.memory.upgradeTarget = creep.room.controller.id;
      }
      if (working && creep.carry.energy === 0) {
        creep.memory.working = false;
      } else if (!working && creep.carry.energy > 0) {
        creep.memory.working = true;
        creep.memory.targetSource = "";
      }
      if (creep.memory.working) {
        if (controller && creep.upgradeController(controller) !== 0) {
          creep.moveTo(controller, { visualizePathStyle: { stroke: this.pathColour() } });
        }
      } else {
        const controllerContainer = energySource || CreepBase.getSourceTarget(creep);
        const sourceTarget:
          | StructureContainer
          | StructureLink
          | StructureExtension
          | StructureSpawn
          | StructureStorage
          | Tombstone
          | undefined
          | null =
          creep.memory.targetStore !== ""
            ? Game.getObjectById<StructureContainer | StructureLink | null>(creep.memory.targetSource)
            : controllerContainer;
        const sourceEmpty = sourceTarget?.store.energy === 0;
        if (sourceTarget && sourceEmpty) {
          const path = PathFinder.search(creep.pos, { pos: sourceTarget.pos, range: 2 }, { flee: true }).path;
          creep.moveByPath(path);
        } else if (sourceTarget && creep.withdraw(sourceTarget, RESOURCE_ENERGY) !== 0) {
          creep.moveTo(sourceTarget, {
            visualizePathStyle: { stroke: this.pathColour() }
          });
        }
      }
      const endCpu = Game.cpu.getUsed();
      CreepUtils.recordCreepPerformance(creep, endCpu - startCpu);
    }
  }
  public static run(room: Room): void {
    const container = this.getEnergySource(room);
    this.spawnUpgrader(room);
    const builders = CreepUtils.filterCreeps("builder", room.name, room.name);
    const sites = room.find(FIND_CONSTRUCTION_SITES);
    if (sites.length === 0 || (sites && builders.length > 0)) {
      CreepUtils.filterCreeps("upgrader", room.name, room.name).forEach((c) => this.runUpgrader(c, container));
    }
  }
}
