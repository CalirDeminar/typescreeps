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
        s.structureType === STRUCTURE_STORAGE && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    });
  }
  public static run(creep: Creep): void {
    const working = creep.memory.working;
    if (!working && creep.carry.energy === 0) {
      creep.memory.working = true;
    } else if (working && creep.carry.energy === creep.carryCapacity) {
      creep.memory.working = false;
      creep.memory.dropOffTarget = "";
    }
    if (creep.memory.working) {
      const container: StructureContainer | null = Game.getObjectById(creep.memory.targetSource);
      if (container && creep.withdraw(container, RESOURCE_ENERGY) !== 0) {
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
