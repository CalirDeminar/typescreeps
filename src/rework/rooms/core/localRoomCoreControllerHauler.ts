import { CreepUtils } from "rework/utils/creepUtils";
import { UtilPosition } from "utils/util.position";
import { CreepBuilder } from "utils/creepBuilder";
import { CreepBase } from "roles/role.creep";
export interface CreepControllerHaulerMemory {
  role: "controllerHauler";
  homeRoom: string;
  targetRoom: string;
  targetStore: string;
  workTarget: string;
}
export class LocalRoomCoreControllerHauler {
  private static runHauler(creep: Creep, room: Room, container: StructureContainer): void {
    const empty = creep.store.getUsedCapacity() === 0;
    const containerNeedsEnergy =
      container.store.getFreeCapacity() > 500 && Memory.roomStore[room.name].defenceDirector.alertLevel === 0;
    switch (true) {
      case empty && creep.memory.workTarget === "" && containerNeedsEnergy: {
        const target = CreepBase.getSourceTarget(creep);
        if (target) {
          creep.memory.workTarget = target.id;
          CreepBase.travelTo(creep, target, "orange");
        }
        break;
      }
      case empty && creep.memory.workTarget && containerNeedsEnergy: {
        const target =
          room.find(FIND_TOMBSTONES, { filter: (t) => t.store.getUsedCapacity() > 100 })[0] ||
          Game.getObjectById<StructureStorage>(creep.memory.workTarget);
        if (target) {
          if (creep.pos.isNearTo(target)) {
            creep.withdraw(target, RESOURCE_ENERGY);
            creep.memory.workTarget = "";
          } else {
            CreepBase.travelTo(creep, target, "orage");
          }
        }
        break;
      }
      case !empty && creep.pos.isNearTo(container): {
        creep.transfer(container, RESOURCE_ENERGY);
        break;
      }
      case !empty: {
        CreepBase.travelTo(creep, container, "orange");
        break;
      }
    }
  }
  private static spawnHaulers(room: Room, container: StructureContainer): void {
    const haulers = CreepUtils.filterCreeps("controllerHauler", room.name, room.name);
    const sites = room.find(FIND_CONSTRUCTION_SITES);
    const energyBudget = Math.min(room.energyCapacityAvailable, 2000);
    const neededHaulers = Math.round(2000 / room.energyCapacityAvailable);
    const spawnHauler =
      (haulers.length < 1 || (haulers.length < neededHaulers && energyBudget < 2000)) &&
      (!sites || sites.length === 0) &&
      Memory.roomStore[room.name].defenceDirector.alertLevel === 0;
    if (spawnHauler) {
      const energyBudget = Math.min(room.energyCapacityAvailable, 2000);
      const template = {
        template: CreepBuilder.buildHaulingCreep(energyBudget),
        memory: {
          ...CreepBase.baseMemory,
          role: "controllerHauler",
          homeRoom: room.name,
          targetRoom: room.name,
          targetStore: container.id
        }
      };
      const index = CreepUtils.findQueuedCreepIndex(room.name, "controllerHauler", room.name, room.name);
      if (index >= 0) {
        Memory.roomStore[room.name].spawnQueue[index] = template;
      } else {
        Memory.roomStore[room.name].spawnQueue.push(template);
      }
    }
  }
  public static run(room: Room): void {
    const controller = room.controller;
    if (!controller) {
      return;
    }
    const anchor = UtilPosition.getAnchor(room);
    const distance = anchor && controller ? anchor.getRangeTo(controller) : 0;
    if (distance <= 10) {
      return;
    }
    const hasLink =
      controller.pos.findInRange(FIND_MY_STRUCTURES, 3, { filter: (s) => s.structureType === STRUCTURE_LINK }).length >
      0;
    const container = controller.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 3, {
      filter: (s) => s.structureType === STRUCTURE_CONTAINER && s.pos.findInRange(FIND_SOURCES, 1).length === 0
    })[0];
    if (hasLink || !container) {
      return;
    }
    this.spawnHaulers(room, container);
    CreepUtils.filterCreeps("controllerHauler", room.name, room.name).forEach((c) =>
      this.runHauler(c, room, container)
    );
  }
}
