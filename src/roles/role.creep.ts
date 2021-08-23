export class CreepBase {
  static getSourceTarget(creep: Creep): Structure | null {
    return creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: (s: AnyStructure) =>
        (s.structureType === STRUCTURE_SPAWN ||
          s.structureType === STRUCTURE_STORAGE) &&
        s.store && s.store[RESOURCE_ENERGY] > 100 &&
        Memory.roomStore[creep.room.name].nextSpawn === null
    }) || creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: (s: AnyStructure) =>
          (s.structureType === STRUCTURE_EXTENSION) &&
        s.store && s.store[RESOURCE_ENERGY] > 10 &&
        Memory.roomStore[creep.room.name].nextSpawn === null
    });
  }
}
