import { ConstructionTemplates } from "director/templates/constructionTemplates";
import { CreepBase } from "roles/role.creep";
import { CreepBuilder } from "utils/creepBuilder";
import { CreepCombat } from "utils/creepCombat";
import { UtilPosition } from "utils/util.position";
export class DefenseDirector {
  // Alert Levels
  // 0 - No Hostiles
  // 1 - Killable hostiles out of range
  // 2 - Killable hostiles in range
  // 3 - Killable hostiles in range - with energy rationing
  // 4 - Unkillable hostiles - spawn rampart defender
  public static maintainRoom(room: Room): void {
    const towers = room.find(FIND_MY_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_TOWER });
    const target = room
      .find(FIND_STRUCTURES, {
        filter: (s) => s.hits < s.hitsMax - 500 && s.hits < (s.structureType === STRUCTURE_RAMPART ? 2_500 : 200_000)
      })
      .sort((a, b) => a.hits - b.hits)[0];
    towers.map((t) => {
      if (t.structureType === STRUCTURE_TOWER && t.store[RESOURCE_ENERGY] / 1000 > 0.5) {
        if (target) {
          t.repair(target);
        }
      }
    });
  }
  private static getTarget(room: Room, targets: Creep[], towers: StructureTower[]): Creep {
    // check for volleyable targets
    const anchor = room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0];
    const store = Memory.roomStore[room.name].defenseDirector;
    const stats = store.hostileCreeps;
    const damagesTaken = targets.map((creep) => {
      const stat = stats.find((stat) => stat.name === creep.name);
      if (stat) {
        const range = anchor.pos.getRangeTo(creep.pos);
        const towerDamage = this.towerDamage(range);
        if (towerDamage >= stat.safeBuffer) {
          return { creep: creep, damage: Infinity };
        }
        return { creep: creep, damage: towerDamage / stat.toughHealMultiplier };
      }
      return { creep: creep, damage: 0 };
    });
    return damagesTaken.sort((a, b) => a.damage - b.damage)[0].creep;
  }
  public static defendRoom(room: Room, targets: Creep[]): void {
    let store = Memory.roomStore[room.name].defenseDirector;
    if (store.alertLevel >= 2) {
      const towers = room.find<StructureTower>(FIND_MY_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_TOWER
      });
      const currentTargetAlive = !!targets.find((t) => t.name === store.activeTarget);
      if (!currentTargetAlive) {
        Memory.roomStore[room.name].defenseDirector.activeTarget = this.getTarget(room, targets, towers).name;
        store = Memory.roomStore[room.name].defenseDirector;
      }
      const target = targets.find((t) => t.name === store.activeTarget);
      if (target) {
        towers.map((t) => {
          if (t.structureType === STRUCTURE_TOWER) {
            t.attack(target);
          }
        });
      }
    }
  }
  private static runTowers(room: Room, targets: Creep[]): void {
    if (targets.length > 0) {
      this.defendRoom(room, targets);
    } else {
      this.maintainRoom(room);
    }
  }
  private static makeSourceRamparts(room: Room): RoomPosition[] {
    const anchor = room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0];
    return room
      .find(FIND_SOURCES)
      .map((source) => {
        return [
          UtilPosition.getClosestSurroundingTo(source.pos, anchor.pos),
          UtilPosition.getClosestSurroundingTo(UtilPosition.getClosestSurroundingTo(source.pos, anchor.pos), anchor.pos)
        ];
      })
      .reduce((acc, p) => acc.concat(p), []);
  }
  private static makeRamparts(room: Room): void {
    const controller = room.controller;
    const terrain = room.getTerrain();
    const store = Memory.roomStore[room.name].defenseDirector;
    const rampartMap = store.rampartMap.map((p) => new RoomPosition(p.x, p.y, p.roomName));
    if (controller && rampartMap.length > 0 && controller.level >= 4) {
      rampartMap.map((p) => {
        if (
          terrain.get(p.x, p.y) !== 1 &&
          p.lookFor(LOOK_STRUCTURES).filter((s) => s.structureType === STRUCTURE_RAMPART).length === 0
        ) {
          room.createConstructionSite(p, STRUCTURE_RAMPART);
        }
      });
    }
  }
  private static runMaintinenceTech(creep: Creep): void {
    if (creep.ticksToLive) {
      const repairLimit = 2_000_000;
      const storage = Game.getObjectById<StructureStorage>(creep.memory.refuelTarget);
      const currentTarget = creep.memory.workTarget
        ? Game.getObjectById<StructureRampart>(creep.memory.workTarget)
        : creep.room
            .find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_RAMPART && s.hits < repairLimit })
            .sort((a, b) => a.hits - b.hits)[0];
      if (currentTarget && storage) {
        creep.memory.workTarget = currentTarget.id;
        switch (true) {
          case creep.store.getUsedCapacity() === 0 && !creep.pos.isNearTo(storage):
            CreepBase.travelTo(creep, storage, "white");
            break;
          case creep.store.getUsedCapacity() === 0 &&
            creep.pos.isNearTo(storage) &&
            storage.store[RESOURCE_ENERGY] > creep.room.energyCapacityAvailable + creep.store.getCapacity():
            creep.withdraw(storage, RESOURCE_ENERGY);
            creep.memory.workTarget = "";
            break;
          case creep.store.getUsedCapacity() > 0 && !creep.pos.isNearTo(currentTarget):
            CreepBase.travelTo(creep, currentTarget, "white");
            break;
          case creep.store.getUsedCapacity() > 0 && creep.pos.isNearTo(currentTarget):
            creep.repair(currentTarget);
            break;
        }
      }
    }
  }
  private static runMaintinenceTechs(room: Room): void {
    _.filter(Game.creeps, (c) => c.memory.role === "maintinenceTech" && c.memory.homeRoom === room.name).map((c) =>
      this.runMaintinenceTech(c)
    );
  }
  private static spawnMaintinenceTech(room: Room): void {
    const techs = _.filter(Game.creeps, (c) => c.memory.role === "maintinenceTech" && c.memory.homeRoom === room.name);
    const storage = room.find<StructureStorage>(FIND_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_STORAGE
    })[0];
    const needsTech =
      techs.length < 1 &&
      storage &&
      room.find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_RAMPART }).length > 0;
    if (needsTech) {
      Memory.roomStore[room.name].nextSpawn = {
        template: CreepBuilder.buildScaledBalanced(room.energyCapacityAvailable),
        memory: {
          ...CreepBase.baseMemory,
          role: "maintinenceTech",
          homeRoom: room.name,
          targetRoom: room.name,
          refuelTarget: storage.id
        }
      };
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
    if (store.rampartMap === []) {
      // initial init
      const towers = room
        .find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_TOWER })
        .map((s) => s.id);
      Memory.roomStore[room.name].defenseDirector.towers = towers;
      const rampartMap = ConstructionTemplates.ramparts(room).concat(this.makeSourceRamparts(room));
      Memory.roomStore[room.name].defenseDirector.rampartMap = rampartMap;
    }
    // periodic refresh
    const period = store.alertLevel ? 5 : 1000;
    if (Game.time % period === 0) {
      const rampartMap = ConstructionTemplates.ramparts(room).concat(this.makeSourceRamparts(room));
      Memory.roomStore[room.name].defenseDirector.rampartMap = rampartMap;
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
        console.log(JSON.stringify(c.body));
        return { ...CreepCombat.getCreepCombatFigures(c.body), name: c.name };
      });
    Memory.roomStore[room.name].defenseDirector.hostileCreeps = baselineSheets.concat(sheetsToAdd);
  }
  private static getPeakHostilesTank(room: Room): number {
    const store = Memory.roomStore[room.name].defenseDirector;
    console.log(JSON.stringify(store.hostileCreeps));
    const maxMultiplier = Math.max(...store.hostileCreeps.map((c) => c.toughHealMultiplier));
    const totalHealing = store.hostileCreeps.reduce((acc, c) => acc + c.maxRawHealing, 0);
    return maxMultiplier * totalHealing;
  }
  private static towerDamage(range: number): number {
    if (range <= TOWER_OPTIMAL_RANGE) {
      return 1;
    }
    if (range >= TOWER_FALLOFF_RANGE) {
      return 1 - TOWER_FALLOFF;
    }
    var towerFalloffPerTile = TOWER_FALLOFF / (TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE);
    return 1 - (range - TOWER_OPTIMAL_RANGE) * towerFalloffPerTile;
  }
  private static setAlert(room: Room, targets: Creep[]): void {
    let store = Memory.roomStore[room.name].defenseDirector;
    if (targets.length === 0) {
      Memory.roomStore[room.name].defenseDirector.alertLevel = 0;
      Memory.roomStore[room.name].defenseDirector.alertStartTimestamp = -1;
      Memory.roomStore[room.name].defenseDirector.activeTarget = null;
      Memory.roomStore[room.name].defenseDirector.hostileCreeps = [];
    } else {
      console.log("Hostiles In Room");
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
      const hostileTank = this.getPeakHostilesTank(room);
      const currentRange = Math.min(...targets.map((c) => anchor.pos.getRangeTo(c.pos)));
      const maxTowerDamage = towerCount * 400;
      const currentTowerDamage = towerCount * (this.towerDamage(currentRange) * 600);
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
      //    maintinence tech then queen have energy priority
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
  public static run(room: Room): void {
    const targets = room.find(FIND_HOSTILE_CREEPS);
    this.populateMemory(room);
    this.setAlert(room, targets);
    this.runTowers(room, targets);
    this.makeRamparts(room);
    this.checkToSafeMode(room);
    this.spawnMaintinenceTech(room);
    this.runMaintinenceTechs(room);
  }
}
