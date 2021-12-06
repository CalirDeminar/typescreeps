import { CombatUtils } from "rework/utils/combat";
import { RoomUtils } from "rework/utils/roomUtils";

export class LocalRoomDefenseTowers {
  public static maintainRoom(room: Room): void {
    const towers = room.find(FIND_MY_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_TOWER });
    const damagedCreep = _.filter(Game.creeps, (c) => c.pos.roomName === room.name && c.hits < c.hitsMax)[0];
    const target = room
      .find(FIND_STRUCTURES, {
        filter: (s) =>
          s.hits < s.hitsMax - 500 &&
          s.hits < (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL ? 2_500 : 200_000)
      })
      .sort((a, b) => a.hits - b.hits)[0];
    towers.map((t) => {
      if (t.structureType === STRUCTURE_TOWER && t.store[RESOURCE_ENERGY] / 1000 > 0.5) {
        if (damagedCreep) {
          t.heal(damagedCreep);
        } else if (target) {
          t.repair(target);
        }
      }
    });
  }
  private static getTarget(room: Room, targets: Creep[], towers: StructureTower[]): Creep | null {
    // check for volleyable targets
    const anchor = room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0];
    const store = Memory.roomStore[room.name].defenceDirector;
    const stats = store.hostileCreeps;
    const totalHealing = stats.reduce((acc, s) => acc + s.maxRawHealing, 0);
    const damagesTaken = targets.map((creep) => {
      const stat = stats.find((stat) => stat.name === creep.name);
      if (stat) {
        const range = anchor.pos.getRangeTo(creep.pos);
        const towerDamage = CombatUtils.towerDamage(range) * towers.length;
        if (towerDamage >= stat.safeBuffer) {
          return { creep: creep, damage: Infinity };
        }
        return { creep: creep, damage: towerDamage / stat.toughHealMultiplier };
      }
      return { creep: creep, damage: 0 };
    });
    const bestTarget = damagesTaken.sort((a, b) => a.damage - b.damage)[0];
    if (bestTarget.damage > totalHealing) {
      return bestTarget.creep;
    }
    return null;
  }
  public static defendRoom(room: Room, targets: Creep[]): boolean {
    let store = Memory.roomStore[room.name].defenceDirector;
    if (store.alertLevel >= 2) {
      const towers = room.find<StructureTower>(FIND_MY_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_TOWER
      });
      const currentTargetAlive = !!targets.find((t) => t.name === store.activeTarget);
      if (!currentTargetAlive || Game.time % 10 === 0) {
        const newTarget = this.getTarget(room, targets, towers);
        if (newTarget) {
          console.log(`New Target: ${newTarget.name}`);
          Memory.roomStore[room.name].defenceDirector.activeTarget = newTarget.name;
          store = Memory.roomStore[room.name].defenceDirector;
        } else {
          Memory.roomStore[room.name].defenceDirector.activeTarget = null;
        }
      }
      const target = targets.find((t) => t.name === store.activeTarget);
      if (target) {
        return towers
          .map((t) => {
            if (t.structureType === STRUCTURE_TOWER) {
              t.attack(target);
              return true;
            }
            return false;
          })
          .some((t) => t === true);
      }
    }
    return false;
  }
  public static runTowers(room: Room, targets: Creep[]): void {
    const startCpu = Game.cpu.getUsed();
    this.defendRoom(room, targets) || this.maintainRoom(room);
    const usedCpu = Game.cpu.getUsed() - startCpu;
    RoomUtils.recordFilePerformance(room.name, "roomDefenceTowers", usedCpu);
  }
}
