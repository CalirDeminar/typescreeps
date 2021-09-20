import { CreepBuilder } from "utils/creepBuilder";
import { UtilPosition } from "utils/util.position";
import { CreepBase } from "roles/role.creep";

export class ControllerHaulerDirector {
  private static runHauler(room: Room, container: any): void {
    const haulers = _.filter(
      Game.creeps,
      (c) =>
        c.memory.role === "controllerHauler" && c.memory.homeRoom === room.name && c.memory.targetStore === container.id
    );
    haulers.map((creep) => {
      const empty = creep.store.getUsedCapacity() === 0;
      const containerNeedsEnergy =
        container.store.getFreeCapacity() > 500 && Memory.roomStore[room.name].defenseDirector.alertLevel === 0;
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
    });
  }
  private static spawnHauler(room: Room, container: Structure): void {
    const haulers = _.filter(
      Game.creeps,
      (c) =>
        c.memory.role === "controllerHauler" && c.memory.homeRoom === room.name && c.memory.targetStore === container.id
    );
    const sites = room.find(FIND_CONSTRUCTION_SITES);
    const spawnHauler =
      haulers.length < 1 &&
      (!sites || sites.length === 0) &&
      Memory.roomStore[room.name].defenseDirector.alertLevel === 0;
    if (spawnHauler) {
      const energyBudget = Math.min(room.energyCapacityAvailable, 2000);
      const template = {
        template: CreepBuilder.buildHaulingCreep(energyBudget),
        memory: {
          ...CreepBase.baseMemory,
          role: "controllerHauler",
          homeRoom: room.name,
          targetStore: container.id
        }
      };
      const index = Memory.roomStore[room.name].spawnQueue.findIndex(
        (c) =>
          c.memory.role === "controllerHauler" &&
          c.memory.homeRoom === room.name &&
          c.memory.targetStore === container.id
      );
      if (index >= 0) {
        Memory.roomStore[room.name].spawnQueue[index] = template;
      } else {
        Memory.roomStore[room.name].spawnQueue.push(template);
      }
    }
  }
  public static run(room: Room): void {
    const controller = room.controller;
    const container = controller ? UtilPosition.findByPosition(controller.pos, STRUCTURE_CONTAINER) : null;
    if (controller && container) {
      this.spawnHauler(room, container);
      this.runHauler(room, container);
    }
  }
}