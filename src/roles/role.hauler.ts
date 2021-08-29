import { Logger } from "utils/logger";
import { CreepBase } from "./role.creep";
export class Hauler extends CreepBase {
  private static pathColour(): string {
    return "blue";
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
  private static getContainerTarget(creep: Creep): string {
    return creep.memory.targetSource;
  }
  public static run(creep: Creep): void {
    if (creep.ticksToLive) {
      const withdrawing = creep.memory.working;
      const empty = creep.store[RESOURCE_ENERGY] === 0;
      const full = creep.store.getFreeCapacity() === 0;
      let container: StructureContainer | null =
        Game.getObjectById(creep.memory.workTarget) || Game.getObjectById(creep.memory.targetSource);
      switch (true) {
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
      if (withdrawing && container) {
        const rangeToContainer = creep.pos.getRangeTo(container);
        if (rangeToContainer > 1) {
          this.travelTo(creep, container, this.pathColour());
        } else {
          creep.withdraw(container, RESOURCE_ENERGY);
        }
      } else {
        const storeTarget: Structure | null =
          creep.memory.targetStore !== "" ? Game.getObjectById(creep.memory.targetStore) : this.getStoreTarget(creep);
        if (storeTarget) {
          const rangeToStore = creep.pos.getRangeTo(storeTarget);
          if (rangeToStore > 1) {
            this.travelTo(creep, storeTarget, this.pathColour());
          } else {
            creep.transfer(storeTarget, RESOURCE_ENERGY);
          }
        }
      }
    }
  }
}
