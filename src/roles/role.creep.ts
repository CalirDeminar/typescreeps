export class CreepBase {
  private static filterStructures(
    type: STRUCTURE_STORAGE | STRUCTURE_SPAWN | STRUCTURE_EXTENSION,
    energyLimit: number
  ) {
    return (s: AnyStructure) => s.structureType === type && s.store[RESOURCE_ENERGY] > energyLimit;
  }
  public static baseMemory: CreepMemory = {
    role: "",
    working: false,
    born: 0,
    targetSource: "",
    targetStore: "",
    homeRoom: "",
    targetRoom: "",
    workTarget: "",
    upgradeTarget: "",
    refuelTarget: "",
    dropOffTarget: "",
    scoutPositions: [],
    targetSourcePos: null
  };
  public static travelTo(creep: Creep, target: RoomPosition | HasPos, pathColour: string) {
    const targetPos = "pos" in target ? target.pos : target;
    const creepNearby = creep.pos.findInRange(FIND_MY_CREEPS, 1);
    if (creep.fatigue <= 0) {
      creep.moveTo(targetPos, { visualizePathStyle: { stroke: pathColour }, ignoreCreeps: !creepNearby });
      // if (creep.room.name === targetPos.roomName) {
      //   const rangeToTarget = creep.pos.getRangeTo(target);
      //   if (rangeToTarget > 1) {
      //     creep.moveTo(targetPos, { visualizePathStyle: { stroke: pathColour }, ignoreCreeps: !creepNearby });
      //   }
      // } else {
      //   const dir = creep.room.findExitTo(targetPos.roomName);
      //   if (dir !== -2 && dir !== -10) {
      //     const exit = creep.room.find(dir).sort((i, j) => creep.pos.getRangeTo(i) - creep.pos.getRangeTo(j))[0];
      //     creep.moveTo(exit, { visualizePathStyle: { stroke: pathColour }, ignoreCreeps: !creepNearby });
      //   }
      // }
    }
  }
  static getSourceTarget(creep: Creep): Structure | null {
    const isSpawning = Memory.roomStore[creep.room.name].nextSpawn !== null;
    if (!isSpawning) {
      const harvestableStorage = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: this.filterStructures(STRUCTURE_STORAGE, 100)
      });
      if (harvestableStorage) {
        return harvestableStorage;
      }
      const harvestableSpawn = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: this.filterStructures(STRUCTURE_SPAWN, 100)
      });
      if (harvestableSpawn) {
        return harvestableSpawn;
      }
      const harvestableExtension = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: this.filterStructures(STRUCTURE_EXTENSION, 10)
      });
      if (harvestableExtension) {
        return harvestableExtension;
      }
      return null;
    }
    return null;
  }
}
