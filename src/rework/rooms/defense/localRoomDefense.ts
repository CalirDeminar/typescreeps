import { CombatUtils } from "rework/utils/combat";
import { LocalRoomDefenseDefenders } from "./localRoomDefenseDefenders";
import { LocalRoomDefenseFortifications } from "./localRoomDefenseFortifications";
import { LocalRoomDefenseTowers } from "./localRoomDefenseTowers";

export interface CreepCombatSheet {
  name: string;
  maxEffectiveHealing: number;
  maxRawHealing: number;
  toughBuffer: number;
  toughHealMultiplier: number;
  safeBuffer: number;
  dismantlePower: number;
  meleePower: number;
  rangedPower: number;
}
export interface DefenceDirectorStore {
  towers: string[];
  alertLevel: 0 | 1 | 2 | 3 | 4;
  alertStartTimestamp: number;
  defenders: string[];
  hostileCreeps: CreepCombatSheet[];
  rampartMap: RoomPosition[];
  wallMap: RoomPosition[];
  activeTarget: string | null;
}
export const defenceDirectorStoreDefault: DefenceDirectorStore = {
  towers: [],
  alertLevel: 0,
  alertStartTimestamp: -1,
  defenders: [],
  rampartMap: [],
  wallMap: [],
  hostileCreeps: [],
  activeTarget: null
};
export class LocalRoomDefense {
  private static getTargets(room: Room): Creep[] {
    return room.find(FIND_HOSTILE_CREEPS, {
      filter: (s) =>
        s.body.some(
          (b) => b.type === WORK || b.type === ATTACK || b.type === RANGED_ATTACK || b.type === HEAL || b.type === CLAIM
        )
    });
  }
  private static parseHostiles(room: Room, targets: Creep[]): void {
    const incomingNames = targets.map((c) => c.name);
    const existingNames = Memory.roomStore[room.name].defenceDirector.hostileCreeps.map((c) => c.name);
    const namesToAdd = incomingNames.filter((n) => !existingNames.includes(n));
    const baselineSheets = Memory.roomStore[room.name].defenceDirector.hostileCreeps.filter((c) =>
      incomingNames.includes(c.name)
    );
    const sheetsToAdd = targets
      .filter((c) => namesToAdd.includes(c.name))
      .map((c) => {
        return { ...CombatUtils.getCreepCombatFigures(c.body), name: c.name };
      });
    Memory.roomStore[room.name].defenceDirector.hostileCreeps = baselineSheets.concat(sheetsToAdd);
  }
  private static getMinHostileTank(room: Room): number {
    const store = Memory.roomStore[room.name].defenceDirector;
    const maxMultiplier = Math.min(...store.hostileCreeps.map((c) => c.toughHealMultiplier));
    const totalHealing = store.hostileCreeps.reduce((acc, c) => acc + c.maxRawHealing, 0);
    return maxMultiplier * totalHealing;
  }

  private static setAlertLevel(room: Room, targets: Creep[]): void {
    let store = Memory.roomStore[room.name].defenceDirector;
    if (targets.length === 0) {
      Memory.roomStore[room.name].defenceDirector.alertLevel = 0;
      Memory.roomStore[room.name].defenceDirector.alertStartTimestamp = -1;
      Memory.roomStore[room.name].defenceDirector.activeTarget = null;
      Memory.roomStore[room.name].defenceDirector.hostileCreeps = [];
    } else {
      if (Game.time % 5 === 0) {
        console.log("Hostiles In Room");
      }
      const anchor = room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0];
      const towers = room.find(FIND_MY_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_TOWER });
      const towerCount = towers.length;
      this.parseHostiles(room, targets);
      if (store.alertStartTimestamp === -1) {
        Memory.roomStore[room.name].defenceDirector.alertStartTimestamp = Game.time;
      }
      store = Memory.roomStore[room.name].defenceDirector;
      const timeWithHostiles = Game.time - store.alertStartTimestamp;
      const refillLimit = 25;
      const hostileTank = this.getMinHostileTank(room);
      const currentRange = Math.min(...targets.map((c) => anchor.pos.getRangeTo(c.pos)));
      const maxTowerDamage = towerCount * 400;
      const currentTowerDamage = towerCount * CombatUtils.towerDamage(currentRange);
      console.log(`Tower Damage: ${currentTowerDamage} - Hostile Tank: ${hostileTank}`);
      switch (true) {
        case hostileTank < maxTowerDamage && hostileTank > currentTowerDamage:
          console.log("Hold Fire");
          Memory.roomStore[room.name].defenceDirector.alertLevel = 1;
          // hold fire for the range to close
          break;
        case hostileTank < currentTowerDamage && timeWithHostiles < refillLimit:
          console.log("Engaging With Towers");
          Memory.roomStore[room.name].defenceDirector.alertLevel = 2;
          // killable with current towers
          break;
        case hostileTank < currentTowerDamage && timeWithHostiles >= refillLimit:
          console.log("Engage With Towers - Energy Needed");
          Memory.roomStore[room.name].defenceDirector.alertLevel = 3;
          // killable with current towers, but energy needed
          break;
        case hostileTank >= maxTowerDamage || (timeWithHostiles >= refillLimit && hostileTank >= currentTowerDamage):
          console.log("Hold Fire - Creeps Needed");
          Memory.roomStore[room.name].defenceDirector.alertLevel = 4;
          // need to spawn creeps, but energy needed
          break;
        default:
          console.log("Should be Unreachable");
      }
      // killable with current towers - lvl 1
      // killable with current towers && timeWithHostiles > 25 - lvl 2
      //    need to start giving towers energy priority
      // killable with current towers && timeWithHostiles > 25 && ramparts getting low - lvl 3
      //    mason then queen have energy priority
      //    calculate incoming rampart damage
      //      spawn more techs if needed
      // Unkillable with current towers - lvl 4
      //  Towers not to fire unless enough backup spawned and in place
      //    Spawn rampart defender immediatly when enough energy
      //      Little bit of MOVE and the rest ATTACK for rampart melee
      //  Builders & Upgraders can no longer refuel
      //    Possible on other alert levels as well, check existing priorities
    }
  }
  private static checkToSafeMode(room: Room): void {
    const damagedStructures = room.find(FIND_STRUCTURES).filter((s) => {
      return (
        (s.structureType === STRUCTURE_EXTENSION ||
          s.structureType === STRUCTURE_SPAWN ||
          s.structureType === STRUCTURE_TOWER ||
          s.structureType === STRUCTURE_STORAGE ||
          s.structureType === STRUCTURE_LINK) &&
        s.hits < s.hitsMax
      );
    });
    if (damagedStructures.length > 0 && room.controller && room.controller.safeModeAvailable) {
      room.controller.activateSafeMode();
    }
  }
  public static run(room: Room): void {
    const targets = CombatUtils.getTargets(room);
    this.setAlertLevel(room, targets);
    this.checkToSafeMode(room);
    LocalRoomDefenseTowers.runTowers(room, targets);
    LocalRoomDefenseFortifications.run(room);
    LocalRoomDefenseDefenders.run(room);
  }
}
