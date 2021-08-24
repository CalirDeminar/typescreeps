export class CreepBase {
  private static filterStructures(type: STRUCTURE_STORAGE | STRUCTURE_SPAWN | STRUCTURE_EXTENSION, energyLimit: number) {
    return ((s: AnyStructure) => s.structureType === type && s.store[RESOURCE_ENERGY] > energyLimit);
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
    scoutPositions: []
  }
  static getSourceTarget(creep: Creep): Structure | null {
    const isSpawning = Memory.roomStore[creep.room.name].nextSpawn !== null;
    if(!isSpawning) {
      const harvestableStorage = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: this.filterStructures(STRUCTURE_STORAGE, 100)});
      if (harvestableStorage) {
        return harvestableStorage;
      }
      const harvestableSpawn = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: this.filterStructures(STRUCTURE_SPAWN, 100)});
      if (harvestableSpawn) {
        return harvestableSpawn;
      }
      const harvestableExtension = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: this.filterStructures(STRUCTURE_EXTENSION, 10)});
      if (harvestableExtension){
        return harvestableExtension;
      }
      return null;
    }
    return null;
  }
}
