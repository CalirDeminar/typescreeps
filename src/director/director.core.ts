import { CreepBase } from "roles/role.creep";
import { CreepBuilder } from "../utils/creepBuilder";
import { Queen } from "../roles/role.queen";
import { Upgrader } from "roles/role.upgrader";
import { Constants } from "utils/constants";
import { Builder } from "roles/role.builder";
import { ConstructionDirector } from "./director.construction";
import { MineralDirector } from "./director.mineral";
import { RemoteManager } from "managers/manager.remote";
import { RemoteHarvestingDirector } from "./director.remoteHarvesting";
import { SourceDirector } from "./director.source";
import { DefenseManager } from "managers/manager.defense";
export class CoreDirector {
  public static baseMemory: RoomType = {
    sources: [],
    minerals: [],
    controllerId: "",
    nextSpawn: null,
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
    remoteDirector: []
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
  private static findStructureByAnchor(anchor: Flag, type: BuildableStructureConstant): Structure | null {
    return anchor.pos.findInRange(FIND_STRUCTURES, 1).filter((s) => s.structureType === type)[0];
  }
  private static runQueen(creep: Creep, container: StructureContainer | StructureStorage): void {
    Queen.run(creep);
  }
  private static runQueens(room: Room, container: StructureContainer | StructureStorage): void {
    _.filter(Game.creeps, (c) => c.memory.role === "queen" && c.memory.targetRoom === room.name).map((c) =>
      this.runQueen(c, container)
    );
  }
  private static spawnQueen(room: Room, container: StructureContainer | StructureStorage | null): void {
    if (container && container.store.getUsedCapacity() > 0) {
      const activeQueens = _.filter(
        Game.creeps,
        (c) => c.memory.role === "queen" && c.memory.targetRoom === room.name && c.memory.homeRoom === room.name
      );
      if (
        activeQueens.length < 1 ||
        (activeQueens.length === 1 && activeQueens[0].ticksToLive && activeQueens[0].ticksToLive < 100)
      ) {
        const optimalEnergy = activeQueens.length === 1 ? 1000 : Math.max(room.energyAvailable, 300);
        Memory.roomStore[room.name].nextSpawn = {
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
        const canWithdraw = link.store.getUsedCapacity(RESOURCE_ENERGY) > 400 && creep.store.getFreeCapacity() > 100;
        if (hasCargo) {
          creep.transfer(storage, RESOURCE_ENERGY);
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
      const spawning = Memory.roomStore[room.name].nextSpawn;
      if (
        currentLinkHaulers.length < 1 ||
        (currentLinkHaulers.length === 1 &&
          _.filter(currentLinkHaulers, (c) => c.ticksToLive && c.ticksToLive < 50).length > 0 &&
          !spawning)
      ) {
        // TODO - update template
        Memory.roomStore[room.name].nextSpawn = {
          template: [MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY],
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
    const shouldSpawnUpgrader =
      _.filter(Game.creeps, (c) => c.memory.role === "upgrader" && c.memory.homeRoom === room.name).length < 1;
    if (room.controller && room.controller.my && shouldSpawnUpgrader) {
      Memory.roomStore[room.name].nextSpawn = {
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
      Memory.roomStore[room.name].nextSpawn === null &&
      !towersNeedEnergy &&
      !buildersNeedEnergy &&
      builders.length < Constants.builders
    ) {
      Memory.roomStore[room.name].nextSpawn = {
        template: CreepBuilder.buildScaledBalanced(room.energyCapacityAvailable),
        memory: {
          ...CreepBase.baseMemory,
          role: "builder",
          working: false,
          born: Game.time,
          homeRoom: room.name,
          targetRoom: room.name
        }
      };
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
  }
  private static runSpawn(room: Room): void {
    const toSpawn = Memory.roomStore[room.name].nextSpawn;
    if (toSpawn) {
      const freeSpawn = room.find(FIND_MY_SPAWNS, { filter: (s) => !s.spawning })[0];
      if (freeSpawn) {
        const resp = freeSpawn.spawnCreep(toSpawn.template, `${toSpawn.memory.role}-${Game.time}`, {
          memory: toSpawn.memory
        });
        if (resp === OK) {
          Memory.roomStore[room.name].nextSpawn = null;
        }
      }
    }
  }
  private static runDirectors(room: Room): void {
    SourceDirector.run(room);
    ConstructionDirector.run(room);
    MineralDirector.run(room);
    RemoteManager.run(room);
    RemoteHarvestingDirector.run(room);
    DefenseManager.run(room);
  }
  public static run(room: Room): void {
    if (room.controller && room.controller.my && room.controller.level >= 1) {
      this.initMemory(room);
      let anchor = this.getAnchor(room);
      if (!anchor) {
        this.createAnchor(room);
        anchor = this.getAnchor(room);
      }
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
      this.runDirectors(room);
      this.spawnQueen(room, storage || container);
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
