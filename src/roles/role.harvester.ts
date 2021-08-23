export class Harvester {
  private static pathColour(): string {
    return "orange";
  }
  private static getStoreTarget(creep: Creep): Structure | null {
    return creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: (s: AnyStructure) =>
        (s.structureType === STRUCTURE_SPAWN ||
          s.structureType === STRUCTURE_EXTENSION ||
          s.structureType === STRUCTURE_CONTAINER) &&
        s.store.energy <
          (s.structureType === STRUCTURE_EXTENSION || s.structureType === STRUCTURE_SPAWN ? s.energyCapacity : 2000)
    });
  }
  public static run(creep: Creep): void {
    const working = creep.memory.working;
    if (!working && creep.carry.energy === 0) {
      creep.memory.working = true;
      creep.memory.dropOffTarget = "";
    } else if (working && creep.carry.energy === creep.carryCapacity) {
      creep.memory.working = false;
    }
    if (creep.memory.working) {
      const source: Source | null = Game.getObjectById(creep.memory.targetSource);
      if (source && creep.harvest(source) !== 0) {
        const container = source.pos.findInRange(FIND_STRUCTURES, 1, {
          filter: (s) => s.structureType === STRUCTURE_CONTAINER && s.pos.lookFor(LOOK_CREEPS).length === 0
        })[0];
        creep.moveTo(container || source, {
          visualizePathStyle: { stroke: this.pathColour() }
        });
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
