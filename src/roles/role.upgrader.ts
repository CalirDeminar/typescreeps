export class Upgrader {
  private static pathColour(): string {
    return "green";
  }
  private static getSourceTarget(creep: Creep): Structure | null {
    return creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: (s: AnyStructure) =>
        (s.structureType === STRUCTURE_SPAWN ||
          s.structureType === STRUCTURE_EXTENSION ||
          s.structureType === STRUCTURE_STORAGE) &&
        s.store.energy > 0 &&
        Memory.roomStore[creep.room.name].nextSpawn === null
    });
  }
  public static run(creep: Creep): void {
    const working = creep.memory.working;
    if (working && creep.carry.energy === 0) {
      creep.memory.working = false;
      creep.memory.workTarget = "";
    } else if (!working && creep.carry.energy === creep.carryCapacity) {
      creep.memory.working = true;
      creep.memory.targetSource = "";
    }
    if (creep.memory.working) {
      const controller: StructureController | null = Game.getObjectById(creep.memory.workTarget);
      if (controller && creep.upgradeController(controller) !== 0) {
        creep.moveTo(controller, { visualizePathStyle: { stroke: this.pathColour() } });
      }
    } else {
      const sourceTarget: Structure | null =
        creep.memory.targetStore !== "" ? Game.getObjectById(creep.memory.targetSource) : this.getSourceTarget(creep);
      if (sourceTarget && creep.withdraw(sourceTarget, RESOURCE_ENERGY) !== 0) {
        creep.moveTo(sourceTarget, {
          visualizePathStyle: { stroke: this.pathColour() }
        });
      }
    }
  }
}
