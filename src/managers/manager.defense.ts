export class DefenseManager {
  public static maintainRoom(room: Room): void {
    const towers = room.find(FIND_MY_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_TOWER });
    towers.map((t) => {
      if (t.structureType === STRUCTURE_TOWER && t.store[RESOURCE_ENERGY] / 1000 > 0.5) {
        const target = t.room
          .find(FIND_STRUCTURES, {
            filter: (s) =>
              s.hits < s.hitsMax - 500 && s.hits < (s.structureType === STRUCTURE_RAMPART ? 10_000 : 200_000)
          })
          .sort((a, b) => a.hits - b.hits)[0];
        if (target) {
          t.repair(target);
        }
      }
    });
  }
  public static defendRoom(room: Room, targets: Creep[]): void {
    const towers = room.find(FIND_MY_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_TOWER });
    const lowestHealthCreep = targets.sort((c) => c.hits)[0];
    towers.map((t) => {
      if (t.structureType === STRUCTURE_TOWER) {
        t.attack(lowestHealthCreep);
      }
    });
  }
  public static run(room: Room): void {
    const targets = room.find(FIND_HOSTILE_CREEPS);
    if (targets.length > 0) {
      this.defendRoom(room, targets);
    } else {
      this.maintainRoom(room);
    }
  }
}
