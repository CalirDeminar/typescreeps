export class Harvester {
  private static pathColour(): string {
    return "orange";
  }
  private static setWorkingState(creep: Creep) {
    const working = creep.memory.working;
    const workParts = creep.body.filter((p) => p.type === WORK).length
    const full = creep.store.getFreeCapacity() < (workParts * 2);
    const empty = creep.store.getUsedCapacity() === 0;
    if (!working && empty) {
      creep.memory.working = true;
      creep.memory.dropOffTarget = "";
    } else if (working && full) {
      creep.memory.working = false;
    }
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
    this.setWorkingState(creep);
    const working = creep.memory.working;
    let sourcePos = creep.memory.targetSourcePos;
    if (sourcePos){
      sourcePos = new RoomPosition(sourcePos.x, sourcePos.y, sourcePos.roomName);
      switch(true) {
        case working:
          // move to source or harvest source
          if (!creep.pos.isNearTo(sourcePos)) {
            creep.moveTo(sourcePos, { visualizePathStyle: {stroke: this.pathColour() }});
          } else {
            const source = sourcePos.findInRange(FIND_SOURCES, 1)[0];
            creep.harvest(source);
          }
          break;
        case creep.pos.roomName != creep.memory.homeRoom:
          // returning to home room
          const homeController = Game.rooms[creep.memory.homeRoom].controller;
          if (homeController) {
            creep.moveTo(homeController.pos, { visualizePathStyle: {stroke: this.pathColour() }});
          }
          break;
        default:
          // store in container in home room
          const storeTarget = this.getStoreTarget(creep);
          if (storeTarget) {
            if(creep.pos.isNearTo(storeTarget.pos)) {
              creep.transfer(storeTarget, RESOURCE_ENERGY);
            } else {
              creep.moveTo(storeTarget, { visualizePathStyle: {stroke: this.pathColour() }});
            }
          }
      }
    }
  }
}
