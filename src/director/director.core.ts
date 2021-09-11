import { CreepBase } from "roles/role.creep";
import { CreepBuilder } from "../utils/creepBuilder";
import { Queen } from "../roles/role.queen";
import { Upgrader } from "roles/role.upgrader";
import { Constants } from "utils/constants";
import { Builder } from "roles/role.builder";
import { ConstructionDirector } from "./director.construction";
import { MineralDirector } from "./director.mineral";
import { RemoteHarvestingDirector } from "./director.remoteHarvesting";
import { SourceDirector } from "./director.source";
import { DefenseDirector } from "director/director.defense";
import { ScoutingDirector } from "./director.scouting";
import { RoomHelperDirector } from "./director.roomHelper";
import { lookup } from "dns";
export class CoreDirector {
  public static baseMemory: RoomType = {
    sources: [],
    minerals: [],
    controllerId: "",
    nextSpawn: null,
    spawnQueue: [],
    buildingThisTick: false,
    remoteRooms: {},
    sourceDirector: [],
    constructionDirector: {
      anchor: null,
      anchorContainer: null,
      internalRoadTemplate: [],
      routeRoadTemplate: [],
      mineralRoadTemplate: [],
      extensionTemplate: [],
      baseTemplate: [],
      towerTemplate: [],
      sourceLinks: [],
      buildingsCreated: false,
      roadsCreated: false
    },
    remoteDirector: [],
    defenseDirector: {
      towers: [],
      alertLevel: 0,
      alertStartTimestamp: -1,
      defenders: [],
      rampartMap: [],
      hostileCreeps: [],
      activeTarget: null
    },
    scoutingDirector: {
      scoutedRooms: [],
      scoutQueue: []
    },
    helpOtherRoom: false
  };
  private static createAnchor(room: Room): void {
    const spawn = room.find(FIND_MY_SPAWNS)[0];
    if (spawn) {
      const pos = spawn.pos;
      room.createFlag(pos.x, pos.y + 1, `${room.name}-Anchor`);
    }
  }
  private static getAnchor(room: Room): Flag {
    return room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0];
  }
  private static findStructuresByAnchor(anchor: Flag, type: BuildableStructureConstant): Structure[] {
    return anchor.pos.findInRange(FIND_STRUCTURES, 1).filter((s) => s.structureType === type);
  }
  private static findStructureByAnchor(anchor: Flag, type: BuildableStructureConstant): Structure | null {
    return anchor.pos.findInRange(FIND_STRUCTURES, 1).filter((s) => s.structureType === type)[0];
  }
  private static runQueen(creep: Creep, container: StructureContainer | StructureStorage): void {
    Queen.run(creep);
  }
  private static runQueens(room: Room, container: StructureContainer | StructureStorage): void {
    _.filter(
      Game.creeps,
      (c) => c.memory.role === "queen" && c.memory.targetRoom === room.name && c.memory.homeRoom === room.name
    ).map((c) => this.runQueen(c, container));
  }
  private static spawnQueen(room: Room, container: StructureContainer | StructureStorage | null): void {
    if (container && container.store.getUsedCapacity() > 0) {
      const activeQueens = _.filter(
        Game.creeps,
        (c) => c.memory.role === "queen" && c.memory.targetRoom === room.name && c.memory.homeRoom === room.name
      );
      const queuedQueens = Memory.roomStore[room.name].spawnQueue.filter(
        (c) => c.memory.role === "queen" && c.memory.targetRoom === room.name && c.memory.homeRoom === room.name
      );
      if (
        activeQueens.length < 1 ||
        (activeQueens.length === 1 &&
          activeQueens[0] &&
          activeQueens[0].ticksToLive &&
          activeQueens[0].ticksToLive < 100)
      ) {
        const optimalEnergy = activeQueens.length === 1 ? 1000 : Math.max(room.energyAvailable, 300);
        const template = {
          template: CreepBuilder.buildHaulingCreep(optimalEnergy),
          memory: {
            ...CreepBase.baseMemory,
            role: "queen",
            working: false,
            born: Game.time,
            homeRoom: room.name,
            targetRoom: room.name
          }
        };
        if (queuedQueens.length > 0) {
          const index = Memory.roomStore[room.name].spawnQueue.findIndex(
            (c) => c.memory.role === "queen" && c.memory.homeRoom === room.name && c.memory.targetRoom === room.name
          );
          if (index >= 0) {
            Memory.roomStore[room.name].spawnQueue[index] = template;
          }
        } else {
          Memory.roomStore[room.name].spawnQueue.push(template);
        }
      }
    }
  }
  private static runLinkHauler(creep: Creep, link: StructureLink, storage: StructureStorage, anchor: Flag): void {
    if (creep.ticksToLive) {
      const onStation = creep.pos.isEqualTo(anchor.pos);
      if (!onStation) {
        CreepBase.travelTo(creep, anchor.pos, "black");
      } else {
        const hasCargo = creep.store.getUsedCapacity() > 0;
        const canWithdraw =
          link.store.getUsedCapacity(RESOURCE_ENERGY) > Math.min(400, creep.store.getCapacity()) &&
          creep.store.getFreeCapacity() > 100;
        const spawn = creep.pos.findInRange<StructureSpawn>(FIND_STRUCTURES, 1, {
          filter: (s) => s.structureType === STRUCTURE_SPAWN && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        })[0];

        if (hasCargo) {
          if (spawn) {
            creep.transfer(spawn, RESOURCE_ENERGY);
          } else {
            creep.transfer(storage, RESOURCE_ENERGY);
          }
        }
        if (canWithdraw) {
          creep.withdraw(link, RESOURCE_ENERGY);
        }
      }
    }
  }
  private static runLinkHaulers(
    room: Room,
    link: StructureLink | null,
    storage: StructureStorage | null,
    anchor: Flag
  ): void {
    if (link && storage) {
      _.filter(Game.creeps, (c) => c.memory.role === "linkHauler" && c.memory.homeRoom === room.name).map((c) =>
        this.runLinkHauler(c, link, storage, anchor)
      );
    }
  }
  private static spawnLinkHauler(room: Room, link: StructureLink | null): void {
    if (link) {
      const currentLinkHaulers = _.filter(
        Game.creeps,
        (c) => c.memory.role === "linkHauler" && c.memory.homeRoom === room.name
      );
      const queuedLinkHaulers = Memory.roomStore[room.name].spawnQueue.filter(
        (c) => c.memory.role === "linkHauler" && c.memory.homeRoom === room.name
      );
      const deadRoom = _.filter(Game.creeps, (c) => c.memory.homeRoom === room.name).length < 4;
      if (
        currentLinkHaulers.length < 1 ||
        (currentLinkHaulers.length === 1 &&
          _.filter(currentLinkHaulers, (c) => c.ticksToLive && c.ticksToLive < 50).length > 0)
      ) {
        // TODO - update template
        const template = {
          template: deadRoom
            ? [MOVE, CARRY, CARRY, CARRY, CARRY, CARRY]
            : [MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY],
          memory: {
            ...CreepBase.baseMemory,
            role: "linkHauler",
            working: false,
            born: Game.time,
            homeRoom: room.name,
            targetRoom: room.name,
            workTarget: link.id
          }
        };
        if (queuedLinkHaulers.length > 0) {
          const index = Memory.roomStore[room.name].spawnQueue.findIndex(
            (c) =>
              c.memory.role === "linkHauler" &&
              c.memory.homeRoom === room.name &&
              c.memory.targetRoom === room.name &&
              c.memory.workTarget === link.id
          );
          if (index >= 0) {
            Memory.roomStore[room.name].spawnQueue[index] = template;
          }
        } else {
          Memory.roomStore[room.name].spawnQueue.push(template);
        }
      }
    }
  }
  private static runUpgrader(creep: Creep): void {
    Upgrader.run(creep);
  }
  private static runUpgraders(room: Room): void {
    // put fixed controller search here
    _.filter(Game.creeps, (c) => c.memory.role === "upgrader" && c.memory.homeRoom === room.name).map((c) =>
      this.runUpgrader(c)
    );
  }
  private static spawnUpgrader(room: Room): void {
    const queuedUpgraders = Memory.roomStore[room.name].spawnQueue.filter(
      (c) => c.memory.role === "upgrader" && c.memory.homeRoom === room.name
    );
    const activeUpgraders = _.filter(
      Game.creeps,
      (c) => c.memory.role === "upgrader" && c.memory.homeRoom === room.name
    );
    const shouldSpawnUpgrader = activeUpgraders.length;
    if (room.controller && room.controller.my && shouldSpawnUpgrader) {
      const template = {
        template: CreepBuilder.buildScaledBalanced(Math.min(room.energyCapacityAvailable, 400)),
        memory: {
          ...CreepBase.baseMemory,
          role: "upgrader",
          working: false,
          born: Game.time,
          homeRoom: room.name,
          targetRoom: room.name,
          upgradeTarget: room.controller.id
        }
      };
      if (room.controller && queuedUpgraders.length > 0) {
        const index = Memory.roomStore[room.name].spawnQueue.findIndex(
          (c) =>
            c.memory.role === "upgrader" &&
            c.memory.homeRoom === room.name &&
            c.memory.targetRoom === room.name &&
            room.controller &&
            c.memory.upgradeTarget === room.controller.id
        );
        if (index >= 0) {
          Memory.roomStore[room.name].spawnQueue[index] = template;
        }
      } else {
        Memory.roomStore[room.name].spawnQueue.push(template);
      }
    }
  }
  private static runBuilder(creep: Creep): void {
    Builder.run(creep);
  }
  private static runBuilders(room: Room): void {
    _.filter(Game.creeps, (c) => c.memory.role === "builder" && c.memory.homeRoom === room.name).map((c) =>
      this.runBuilder(c)
    );
  }
  private static spawnBuilder(room: Room): void {
    const energyFull = room.energyCapacityAvailable - room.energyAvailable === 0 || room.energyAvailable > 1000;
    const towersNeedEnergy =
      _.filter(
        room.find(FIND_MY_STRUCTURES, {
          filter: (s) => {
            return s.structureType === STRUCTURE_TOWER && s.store[RESOURCE_ENERGY] <= 500;
          }
        })
      ).length > 0;
    const builders = _.filter(Game.creeps, (c) => c.memory.role === "builder" && c.memory.homeRoom === room.name);
    const buildersNeedEnergy =
      builders.reduce((acc, creep) => {
        return acc + (creep.memory.working ? 0 : creep.store.getCapacity());
      }, 0) > 250;
    if (
      energyFull &&
      Memory.roomStore[room.name].spawnQueue.length === 0 &&
      !towersNeedEnergy &&
      !buildersNeedEnergy &&
      builders.length < Constants.builders
    ) {
      Memory.roomStore[room.name].spawnQueue.push({
        template: CreepBuilder.buildScaledBalanced(room.energyCapacityAvailable),
        memory: {
          ...CreepBase.baseMemory,
          role: "builder",
          working: false,
          born: Game.time,
          homeRoom: room.name,
          targetRoom: room.name
        }
      });
    }
  }
  private static createConstructionSites(room: Room): void {
    const controller = room.controller;
    if (controller) {
      // inner roads at lvl 2/3
      // middle roads at lvl 5
      // outer roads at lvl 6
      const anchor = this.getAnchor(room);
      const alreadyBuilding = Memory.roomStore[room.name].buildingThisTick;
      switch (true) {
        case controller.level >= 3 && !alreadyBuilding && !this.findStructureByAnchor(anchor, STRUCTURE_CONTAINER):
          if (room.createConstructionSite(anchor.pos.x, anchor.pos.y + 1, STRUCTURE_CONTAINER) === OK) {
            Memory.roomStore[room.name].buildingThisTick = true;
          }
          break;
        case controller.level >= 4 && !alreadyBuilding && !this.findStructureByAnchor(anchor, STRUCTURE_STORAGE):
          if (room.createConstructionSite(anchor.pos.x - 1, anchor.pos.y, STRUCTURE_STORAGE) === OK) {
            Memory.roomStore[room.name].buildingThisTick = true;
          }
          break;
        case controller.level >= 5 && !alreadyBuilding && !this.findStructureByAnchor(anchor, STRUCTURE_LINK):
          if (room.createConstructionSite(anchor.pos.x - 1, anchor.pos.y - 1, STRUCTURE_LINK) === OK) {
            Memory.roomStore[room.name].buildingThisTick = true;
          }
          break;
        case controller.level >= 6 && !alreadyBuilding && !this.findStructureByAnchor(anchor, STRUCTURE_TERMINAL):
          if (room.createConstructionSite(anchor.pos.x + 1, anchor.pos.y, STRUCTURE_TERMINAL) === OK) {
            Memory.roomStore[room.name].buildingThisTick = true;
          }
          break;
        case controller.level >= 7 &&
          !alreadyBuilding &&
          this.findStructuresByAnchor(anchor, STRUCTURE_TERMINAL).length < 2:
          if (room.createConstructionSite(anchor.pos.x + 1, anchor.pos.y + 1, STRUCTURE_SPAWN) === OK) {
            Memory.roomStore[room.name].buildingThisTick = true;
          }
          break;

        default:
          undefined;
      }
    }
  }
  private static initMemory(room: Room): void {
    if (!Memory.roomStore) {
      // init roomStore
      Memory.roomStore = {};
    }
    // remove old rooms from the roomStore
    _.map(Memory.roomStore, (r, name) => {
      if (name && !Object.keys(Game.rooms).includes(name)) {
        delete Memory.roomStore[name];
      }
    });
    // initial room init
    if (Memory.roomStore[room.name] === undefined) {
      Memory.roomStore[room.name] = {
        ...this.baseMemory,
        sources: room.find(FIND_SOURCES).map((s: Source): string => s.id),
        minerals: room.find(FIND_MINERALS).map((m: Mineral): string => m.id),
        controllerId: room.controller ? room.controller.id : ""
      };
    }
    // set BuildingThisTick flag
    if (Object.keys(Memory.roomStore).includes(room.name)) {
      Memory.roomStore[room.name] = {
        ...Memory.roomStore[room.name],
        buildingThisTick: room.find(FIND_CONSTRUCTION_SITES).length > 0
      };
    }
    if (!Object.keys(Memory.roomStore[room.name]).includes("defenderDirector")) {
      Memory.roomStore[room.name].defenseDirector = this.baseMemory.defenseDirector;
    }
  }
  private static getRoleScore(
    role: string,
    storedEnergy: boolean,
    hasFilledLink: boolean,
    energyInContainers: boolean
  ): number {
    switch (role) {
      case "queen":
        return storedEnergy ? 9999999999 : 31;
      case "linkHauler":
        return !storedEnergy && hasFilledLink ? 9999999998 : 49;
      case "hauler":
        return energyInContainers ? 95 : 45;
      case "harvesterStatic":
        return 50;
      case "harvesterShuttle":
        return 40;
      case "remoteHarvester":
        return 30;
      case "reserver":
        return 29;
      case "mason":
        return 28;
      case "remoteDefender":
        return 25;
      case "upgrader":
        return 20;
      case "claimer":
        return 15;
      case "helper":
        return 10;
      default:
        return 0;
    }
  }
  public static sortSpawnQueue(
    queue: CreepRecipie[],
    storedEnergy: boolean,
    hasFilledLink: boolean,
    energyInContainers: boolean
  ): CreepRecipie[] {
    return [...queue]
      .sort((a, b) => {
        return (
          this.getRoleScore(a.memory.role, storedEnergy, hasFilledLink, energyInContainers) -
          this.getRoleScore(b.memory.role, storedEnergy, hasFilledLink, energyInContainers)
        );
      })
      .reverse();
  }
  private static costCreep(creep: CreepRecipie): number {
    return creep.template.reduce((acc: number, part: BodyPartConstant) => {
      switch (part) {
        case CARRY:
        case MOVE:
          return acc + 50;
        case WORK:
          return acc + 100;
        case ATTACK:
          return acc + 80;
        case RANGED_ATTACK:
          return acc + 150;
        case HEAL:
          return acc + 250;
        case CLAIM:
          return acc + 600;
        case TOUGH:
          return acc + 10;
        default:
          return acc;
      }
    }, 0);
  }
  private static runSpawn(room: Room): void {
    const spawnQueue = Memory.roomStore[room.name].spawnQueue;
    const storedEnergy = room.storage ? room.storage.store[RESOURCE_ENERGY] > room.energyCapacityAvailable * 3 : true;
    const hasFilledLink =
      room.find(FIND_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_LINK && s.store[RESOURCE_ENERGY] > 1200
      }).length > 0;
    const energyInContainers =
      room
        .find<StructureContainer>(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_CONTAINER })
        .reduce((acc, cont) => acc + cont.store[RESOURCE_ENERGY], 0) > 3000;
    const sortedQueue = this.sortSpawnQueue(spawnQueue, storedEnergy, hasFilledLink, energyInContainers);
    Memory.roomStore[room.name].spawnQueue = sortedQueue;
    const toSpawn = sortedQueue[0];
    // console.log(`${toSpawn.memory.role}: ` + JSON.stringify(toSpawn.template));
    if (toSpawn) {
      const freeSpawn = room.find(FIND_MY_SPAWNS, { filter: (s) => !s.spawning })[0];
      // TODO - check here that the room can currently afford to spawn a creep of this cost
      if (freeSpawn && this.costCreep(toSpawn) <= room.energyAvailable) {
        const resp = freeSpawn.spawnCreep(toSpawn.template, `${toSpawn.memory.role}-${Game.time}`, {
          memory: toSpawn.memory
        });
        if (resp === OK) {
          Memory.roomStore[room.name].nextSpawn = null;
          Memory.roomStore[room.name].spawnQueue = sortedQueue.slice(1);
        }
      }
      if (this.costCreep(toSpawn) > room.energyAvailable) {
        Memory.roomStore[room.name].spawnQueue = sortedQueue.slice(1);
      }
    }
  }
  private static runCore(room: Room): void {
    let anchor = this.getAnchor(room);
    if (!anchor) {
      this.createAnchor(room);
      anchor = this.getAnchor(room);
    }
    if (anchor) {
      const container = anchor.pos
        .findInRange<StructureContainer>(FIND_STRUCTURES, 1)
        .filter((s) => s.structureType === STRUCTURE_CONTAINER)[0];
      const storage = anchor.pos
        .findInRange<StructureStorage>(FIND_STRUCTURES, 1)
        .filter((s) => s.structureType === STRUCTURE_STORAGE)[0];
      const link = anchor.pos
        .findInRange<StructureLink>(FIND_STRUCTURES, 1)
        .filter((s) => s.structureType === STRUCTURE_LINK)[0];
      this.createConstructionSites(room);
      this.spawnLinkHauler(room, link);
      this.runLinkHaulers(room, link, storage, anchor);
      this.runQueens(room, storage || container);
      this.spawnUpgrader(room);
      this.runUpgraders(room);
      this.spawnBuilder(room);
      this.runBuilders(room);
      this.spawnQueen(room, storage || container);
    }
  }
  private static runDirectors(room: Room): void {
    let lastCpu = Game.cpu.getUsed();
    SourceDirector.run(room);
    let cpu = Game.cpu.getUsed();
    const sourceDirCpu = cpu - lastCpu;
    lastCpu = cpu;
    ConstructionDirector.run(room);
    cpu = Game.cpu.getUsed();
    const conDirCpu = cpu - lastCpu;
    lastCpu = cpu;
    MineralDirector.run(room);
    cpu = Game.cpu.getUsed();
    const minDirCpu = cpu - lastCpu;
    lastCpu = cpu;
    ScoutingDirector.run(room);
    cpu = Game.cpu.getUsed();
    const scoutDir = cpu - lastCpu;
    lastCpu = cpu;
    RemoteHarvestingDirector.run(room);
    cpu = Game.cpu.getUsed();
    const remHarvDirCpu = cpu - lastCpu;
    lastCpu = cpu;
    DefenseDirector.run(room);
    cpu = Game.cpu.getUsed();
    const defManCpu = cpu - lastCpu;
    RoomHelperDirector.run(room);
    cpu = Game.cpu.getUsed();
    const roomHelpDirCpu = cpu - lastCpu;
    lastCpu = cpu;
    this.runCore(room);
    cpu = Game.cpu.getUsed();
    const coreDirCpu = cpu - lastCpu;
    if (Game.time % 5 === 0) {
      console.log(
        `CPU: Room: ${room.name}  ` +
          `SourceDir: ${sourceDirCpu.toPrecision(2)} ` +
          `ConDir: ${conDirCpu.toPrecision(2)}  ` +
          `MinDir: ${minDirCpu.toPrecision(2)}  ` +
          `ScoutDir: ${scoutDir.toPrecision(2)}  ` +
          `RemHarvDir: ${remHarvDirCpu.toPrecision(2)}  ` +
          `DefMan: ${defManCpu.toPrecision(2)}  ` +
          `RoomHelperDir: ${roomHelpDirCpu.toPrecision(2)}  ` +
          `CoreDir: ${coreDirCpu.toPrecision(2)}  `
      );
    }
  }
  public static run(room: Room): void {
    if (room.controller && room.controller.my && room.controller.level >= 1) {
      this.initMemory(room);
      this.runDirectors(room);
      this.runSpawn(room);
      // memory init
      //      handle initialising non-existent keys
      // handle primary structure construction away from the main construction manager
      //      central container
      //      storage
      //      terminal
    }
  }
}
