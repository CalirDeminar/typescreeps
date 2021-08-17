export class TowerR {
  static run(tower: StructureTower) {
    const target = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if (target) {
      tower.attack(target);
    } else {
      const percentEnergy = tower.energy / tower.energyCapacity;
      if (percentEnergy > 0.5) {
        const healTargets = tower.room.find(FIND_STRUCTURES, {
          filter: (s) => s.hits < s.hitsMax && s.hits < 20000
        });
        const healTarget = healTargets.sort((a, b) => a.hits - b.hits)[0];
        if (healTarget) {
          tower.repair(healTarget);
        }
      }
    }
  }
}
