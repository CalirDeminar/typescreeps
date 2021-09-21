import { CreepBase } from "./role.creep";
export class Upgrader extends CreepBase {
  private static pathColour(): string {
    return "green";
  }
  private static getControllerContainer(creep: Creep, controller: StructureController): Structure | null {
    const target = controller.pos.findInRange(FIND_STRUCTURES, 4, {
      filter: (s) =>
        s.structureType === STRUCTURE_CONTAINER &&
        s.pos.findInRange(FIND_SOURCES, 1).length === 0 &&
        (_.filter(
          Game.creeps,
          (c) => c.memory.role === "controllerHauler" && c.memory.homeRoom === creep.memory.homeRoom
        ).length > 0 ||
          s.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getCapacity())
    })[0];
    return target;
  }
  private static getControllerLink(creep: Creep, controller: StructureController): Structure | null {
    const target = controller.pos.findInRange(FIND_MY_STRUCTURES, 3, {
      filter: (s) => s.structureType === STRUCTURE_LINK
    })[0];
    return target;
  }
  public static run(creep: Creep): void {
    if (creep.ticksToLive) {
      const controller = Game.getObjectById<StructureController>(creep.memory.upgradeTarget);
      this.maintainRoad(creep);
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
        const controllerContainer = controller
          ? this.getControllerContainer(creep, controller) || this.getControllerLink(creep, controller)
          : null;
        const sourceTarget: Structure | Tombstone | null =
          creep.memory.targetStore !== ""
            ? Game.getObjectById(creep.memory.targetSource)
            : controllerContainer || this.getSourceTarget(creep);
        if (sourceTarget && creep.withdraw(sourceTarget, RESOURCE_ENERGY) !== 0) {
          creep.moveTo(sourceTarget, {
            visualizePathStyle: { stroke: this.pathColour() }
          });
        }
      }
    }
  }
}
