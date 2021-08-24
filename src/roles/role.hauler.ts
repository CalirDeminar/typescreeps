import { Logger } from "utils/logger";

export class Hauler {
  private static pathColour(): string {
    return "blue";
  }
  private static getStoreTarget(creep: Creep): Structure | null {
    return creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: (s: AnyStructure) =>
        s.structureType === STRUCTURE_SPAWN && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0 ||
        s.structureType === STRUCTURE_EXTENSION && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    }) || creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: (s: AnyStructure) =>
        s.structureType === STRUCTURE_TOWER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    }) || creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: (s: AnyStructure) =>
        s.structureType === STRUCTURE_STORAGE && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    });
  }
  private static getContainerTarget(creep: Creep): string {
    const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: (s) =>
      (s.structureType === STRUCTURE_CONTAINER
      || s.structureType === STRUCTURE_STORAGE)
      && s.store[RESOURCE_ENERGY] > (creep.store.getCapacity() / 2)
    });
    return target ? target.id : "";
  }
  public static run(creep: Creep): void {
    const withdrawing = creep.memory.working;
    const empty = creep.store[RESOURCE_ENERGY] === 0;
    const full = creep.store.getFreeCapacity() === 0;
    let container: StructureContainer | null = Game.getObjectById(creep.memory.workTarget) || Game.getObjectById(creep.memory.targetSource);
    switch(true) {
      case withdrawing && container?.store.getUsedCapacity() === 0:
      case !withdrawing && empty:
        creep.memory.working = true;
        creep.memory.workTarget = this.getContainerTarget(creep);
        container = Game.getObjectById(creep.memory.workTarget);
        break;
      case withdrawing && full:
        creep.memory.working = false;
        creep.memory.workTarget = "";
        creep.memory.dropOffTarget = "";
        break;
    }
    if (withdrawing) {
      if (container && creep.withdraw(container, RESOURCE_ENERGY) !== 0 && creep.pos.getRangeTo(container) > 1) {
        creep.moveTo(container, { visualizePathStyle: { stroke: this.pathColour() } });
      }
    } else {
      const storeTarget: Structure | null =
        creep.memory.targetStore !== "" ? Game.getObjectById(creep.memory.targetStore) : this.getStoreTarget(creep);
      if (storeTarget && creep.transfer(storeTarget, RESOURCE_ENERGY) !== 0) {
        creep.moveTo(storeTarget, {
          visualizePathStyle: { stroke: this.pathColour() }
        });
      }
    }
  }
}
