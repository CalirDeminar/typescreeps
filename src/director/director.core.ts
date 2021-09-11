import { CreepBase } from "roles/role.creep";
import { CreepBuilder } from "../utils/creepBuilder";
import { Queen } from "../roles/role.queen";
import { QueenDirector } from "./core/director.queen";
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
import { SpawnDirector } from "./core/director.spawn";
import { LinkHaulerDirector } from "./core/director.linkHauler";
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
      LinkHaulerDirector.spawnLinkHauler(room, link);
      LinkHaulerDirector.runLinkHaulers(room, link, storage, anchor);
      QueenDirector.runQueens(room, storage || container);
      this.spawnUpgrader(room);
      this.runUpgraders(room);
      this.spawnBuilder(room);
      this.runBuilders(room);
      QueenDirector.spawnQueen(room, storage || container);
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
      SpawnDirector.runSpawn(room);
      // memory init
      //      handle initialising non-existent keys
      // handle primary structure construction away from the main construction manager
      //      central container
      //      storage
      //      terminal
    }
  }
}
