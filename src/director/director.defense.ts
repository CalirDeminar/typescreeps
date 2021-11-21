import { CreepBase } from "roles/role.creep";
import { CreepCombat } from "utils/creepCombat";
import { UtilPosition } from "utils/util.position";
import { DefenseMason } from "./defense/mason";
import { DefenseTowers } from "./defense/towers";
import { WallPlanner } from "./defense/wallPlanner";
export class DefenseDirector {
  // Alert Levels
  // 0 - No Hostiles
  // 1 - Killable hostiles out of range
  // 2 - Killable hostiles in range
  // 3 - Killable hostiles in range - with energy rationing
  // 4 - Unkillable hostiles - spawn rampart defender
  private static makeSourceRamparts(room: Room): RoomPosition[] {
    const anchor = room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0];
    const structStore = Memory.roomStore[room.name].constructionDirector;
    const defStore = Memory.roomStore[room.name].defenseDirector;
    const avoids = structStore.extensionTemplate
      .concat(structStore.towerTemplate)
      .concat(structStore.labTemplate)
      .concat(structStore.singleStructures.map((s) => s.pos))
      .concat(defStore.wallMap);
    return room
      .find(FIND_SOURCES)
      .map((source) => {
        return [
          UtilPosition.getClosestSurroundingTo(source.pos, anchor.pos, avoids),
          UtilPosition.getClosestSurroundingTo(
            UtilPosition.getClosestSurroundingTo(source.pos, anchor.pos, avoids),
            anchor.pos,
            avoids
          )
        ];
      })
      .reduce((acc, p) => acc.concat(p), []);
  }
  private static makeFortification(room: Room): void {
    const controller = room.controller;
    const terrain = room.getTerrain();
    const memory = Memory.roomStore[room.name].defenseDirector;
    const store = Memory.roomStore[room.name].defenseDirector;
    const storage = room.find<StructureStorage>(FIND_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_STORAGE
    })[0];
    const strategicStructures = room
      .find(FIND_MY_STRUCTURES, {
        filter: (s) => {
          const type = s.structureType;
          return type === STRUCTURE_SPAWN || type === STRUCTURE_STORAGE || type === STRUCTURE_TERMINAL;
        }
      })
      .map((s) => s.pos);
    const rampartMap = strategicStructures.concat(memory.rampartMap).map((w) => new RoomPosition(w.x, w.y, w.roomName));
    const wallMap = memory.wallMap.map((w) => new RoomPosition(w.x, w.y, w.roomName));
    const refreshFrequency = store.alertLevel === 0 ? 500 : 50;
    const runThisTick = Game.time % refreshFrequency === 0;
    // rampartMap.map((r) => {
    //   room.visual = room.visual.text("R", new RoomPosition(r.x, r.y, room.name), { stroke: "Black" });
    // });
    if (
      runThisTick &&
      rampartMap.length > 0 &&
      controller &&
      controller.level >= 4 &&
      storage !== undefined &&
      room.energyCapacityAvailable > 1000
    ) {
      rampartMap.map((p) => {
        if (
          p.roomName === room.name &&
          terrain.get(p.x, p.y) !== 1 &&
          p
            .lookFor(LOOK_STRUCTURES)
            .filter((s) => s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL).length === 0
        ) {
          new RoomPosition(p.x, p.y, p.roomName).createConstructionSite(STRUCTURE_RAMPART);
        }
      });
      wallMap.map((p) => {
        if (
          terrain.get(p.x, p.y) !== 1 &&
          p
            .lookFor(LOOK_STRUCTURES)
            .filter((s) => s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL).length === 0
        ) {
          new RoomPosition(p.x, p.y, p.roomName).createConstructionSite(STRUCTURE_WALL);
        }
      });
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
  private static populateMemory(room: Room): void {
    // initial populate
    // check rampart map periodically
    //  more often if there are hostiles in room
    const store = Memory.roomStore[room.name].defenseDirector;
    if (store.rampartMap.length === 0) {
      const defences = WallPlanner.getPerimeter(room);
      const towers = room
        .find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_TOWER })
        .map((s) => s.id);
      Memory.roomStore[room.name].defenseDirector.towers = towers;
      const rampartMap = defences.ramparts;
      const wallMap = defences.walls;
      Memory.roomStore[room.name].defenseDirector = {
        ...Memory.roomStore[room.name].defenseDirector,
        rampartMap: rampartMap,
        wallMap: wallMap
      };
    } else {
      store.rampartMap.forEach((r) => room.visual.text("R", r.x, r.y, { stroke: "green", opacity: 0.3 }));
      store.wallMap.forEach((r) => room.visual.text("W", r.x, r.y, { stroke: "green", opacity: 0.3 }));
    }
    if (!Object.keys(store).includes("alertStartTimestamp")) {
      Memory.roomStore[room.name].defenseDirector.alertStartTimestamp = -1;
    }
  }
  private static parseHostiles(room: Room, targets: Creep[]): void {
    const incomingNames = targets.map((c) => c.name);
    const existingNames = Memory.roomStore[room.name].defenseDirector.hostileCreeps.map((c) => c.name);
    const namesToAdd = incomingNames.filter((n) => !existingNames.includes(n));
    const baselineSheets = Memory.roomStore[room.name].defenseDirector.hostileCreeps.filter((c) =>
      incomingNames.includes(c.name)
    );
    const sheetsToAdd = targets
      .filter((c) => namesToAdd.includes(c.name))
      .map((c) => {
        return { ...CreepCombat.getCreepCombatFigures(c.body), name: c.name };
      });
    Memory.roomStore[room.name].defenseDirector.hostileCreeps = baselineSheets.concat(sheetsToAdd);
  }
  private static getMinHostileTank(room: Room): number {
    const store = Memory.roomStore[room.name].defenseDirector;
    const maxMultiplier = Math.min(...store.hostileCreeps.map((c) => c.toughHealMultiplier));
    const totalHealing = store.hostileCreeps.reduce((acc, c) => acc + c.maxRawHealing, 0);
    return maxMultiplier * totalHealing;
  }
  private static towerDamage(range: number): number {
    if (range <= TOWER_OPTIMAL_RANGE) {
      return 1 * 600;
    }
    if (range >= TOWER_FALLOFF_RANGE) {
      return (1 - TOWER_FALLOFF) * 600;
    }
    var towerFalloffPerTile = TOWER_FALLOFF / (TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE);
    return (1 - (range - TOWER_OPTIMAL_RANGE) * towerFalloffPerTile) * 600;
  }
  private static setAlert(room: Room, targets: Creep[]): void {
    let store = Memory.roomStore[room.name].defenseDirector;
    if (targets.length === 0) {
      Memory.roomStore[room.name].defenseDirector.alertLevel = 0;
      Memory.roomStore[room.name].defenseDirector.alertStartTimestamp = -1;
      Memory.roomStore[room.name].defenseDirector.activeTarget = null;
      Memory.roomStore[room.name].defenseDirector.hostileCreeps = [];
    } else {
      if (Game.time % 5 === 0) {
        console.log("Hostiles In Room");
      }
      const anchor = room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0];
      const towers = room.find(FIND_MY_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_TOWER });
      const towerCount = towers.length;
      this.parseHostiles(room, targets);
      if (store.alertStartTimestamp === -1) {
        Memory.roomStore[room.name].defenseDirector.alertStartTimestamp = Game.time;
      }
      store = Memory.roomStore[room.name].defenseDirector;
      const timeWithHostiles = Game.time - store.alertStartTimestamp;
      const refillLimit = 25;
      const hostileTank = this.getMinHostileTank(room);
      const currentRange = Math.min(...targets.map((c) => anchor.pos.getRangeTo(c.pos)));
      const maxTowerDamage = towerCount * 400;
      const currentTowerDamage = towerCount * this.towerDamage(currentRange);
      console.log(`Current Tower Damage: ${currentTowerDamage}`);
      switch (true) {
        case hostileTank < maxTowerDamage && hostileTank > currentTowerDamage:
          console.log("Hold Fire");
          Memory.roomStore[room.name].defenseDirector.alertLevel = 1;
          // hold fire for the range to close
          break;
        case hostileTank < currentTowerDamage && timeWithHostiles < refillLimit:
          console.log("Engaging With Towers");
          Memory.roomStore[room.name].defenseDirector.alertLevel = 2;
          // killable with current towers
          break;
        case hostileTank <= currentTowerDamage && timeWithHostiles >= refillLimit:
          console.log("Engage With Towers - Energy Needed");
          Memory.roomStore[room.name].defenseDirector.alertLevel = 3;
          // killable with current towers, but energy needed
          break;
        case hostileTank > maxTowerDamage:
          console.log("Hold Fire - Creeps Needed");
          Memory.roomStore[room.name].defenseDirector.alertLevel = 4;
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
  private static spawnRemoteDefense(room: Room, spawningDefenders: CreepRecipie[]): void {
    if (room.energyCapacityAvailable >= 430) {
      const template = {
        template: [TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, ATTACK, ATTACK, ATTACK, MOVE],
        memory: {
          ...CreepBase.baseMemory,
          role: "remoteDefender",
          working: false,
          homeRoom: room.name
        }
      };
      if (spawningDefenders.length === 0) {
        Memory.roomStore[room.name].spawnQueue.push(template);
      } else {
        const index = Memory.roomStore[room.name].spawnQueue.findIndex(
          (c) => c.memory.role === "remoteDefender" && c.memory.homeRoom === room.name
        );
        if (index >= 0) {
          Memory.roomStore[room.name].spawnQueue[index] = template;
        }
      }
    }
  }
  private static runDefender(creep: Creep, anchor: Flag, targetRoom: RemoteDirectorStore | undefined): void {
    if (creep.ticksToLive) {
      switch (true) {
        case !targetRoom:
          CreepBase.travelTo(creep, anchor, "red", 5);
          break;
        case targetRoom && creep.pos.roomName !== targetRoom.roomName:
          if (targetRoom) {
            const roomCenter = new RoomPosition(25, 25, targetRoom.roomName);
            CreepBase.travelTo(creep, roomCenter, "red", 23);
          }
          break;
        case targetRoom && creep.pos.roomName === targetRoom.roomName:
          const target =
            creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS) ||
            creep.room.find<StructureInvaderCore>(FIND_STRUCTURES, {
              filter: (s) => s.structureType === STRUCTURE_INVADER_CORE
            })[0];
          if (target && creep.pos.getRangeTo(target) <= 2) {
            creep.attack(target);
          }
          if (target) {
            CreepBase.travelTo(creep, target, "red", 0);
          }
          break;
      }
    }
  }
  private static remoteDefense(room: Room): void {
    const anchor = room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0];
    const defenderCost = 430;
    const currentDefenders = _.filter(
      Game.creeps,
      (c) => c.memory.role === "remoteDefender" && c.memory.homeRoom === room.name
    );
    const spawningDefenders = Memory.roomStore[room.name].spawnQueue.filter(
      (c) => c.memory.role === "remoteDefender" && c.memory.homeRoom === room.name
    );
    const remotes = Memory.roomStore[room.name].remoteDirector;
    const remotesToDefend = remotes.filter(
      (r) => (r.hostileCreepCount === 1 || r.hasInvaderCore) && r.hostileTowerCount === 0
    );
    if (currentDefenders.length < 1 && remotesToDefend.length > 0) {
      this.spawnRemoteDefense(room, spawningDefenders);
    }
    const targetRoom: RemoteDirectorStore | undefined = remotesToDefend.sort((r) => r.sources.length).reverse()[0];
    currentDefenders.map((c) => this.runDefender(c, anchor, targetRoom));
  }
  public static run(room: Room): void {
    const targets = room.find(FIND_HOSTILE_CREEPS, {
      filter: (s) =>
        s.body.some(
          (b) => b.type === WORK || b.type === ATTACK || b.type === RANGED_ATTACK || b.type === HEAL || b.type === CLAIM
        )
    });
    this.populateMemory(room);
    this.setAlert(room, targets);
    DefenseTowers.runTowers(room, targets);
    this.makeFortification(room);
    this.checkToSafeMode(room);
    DefenseMason.spawnMasons(room);
    DefenseMason.runMasons(room);
    this.remoteDefense(room);
  }
}
