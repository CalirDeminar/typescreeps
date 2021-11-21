import { CreepBase } from "roles/role.creep";
import { CreepBuilder } from "../utils/creepBuilder";
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
import { SpawnDirector } from "./core/director.spawn";
import { LinkHaulerDirector } from "./core/director.linkHauler";
import { ConstructionBunker2Director } from "./core/director.constructio.bunker2";
import { UtilPosition } from "utils/util.position";
import { ControllerHaulerDirector } from "./core/director.controllerHauler";
import { CoreRoomPlanner } from "./core/director.roomPlanner";
import { WallPlanner } from "./defense/wallPlanner";
export class CoreDirector {
  public static baseMemory: RoomType = {
    sources: [],
    minerals: [],
    controllerId: "",
    nextSpawn: null,
    spawnQueue: [],
    buildingThisTick: false,
    remoteRooms: {},
    constructionDirector: {
      internalRoadTemplate: [],
      extensionTemplate: [],
      towerTemplate: [],
      roadsCreated: false,
      singleStructures: [],
      labTemplate: []
    },
    remoteDirector: [],
    defenseDirector: {
      towers: [],
      alertLevel: 0,
      alertStartTimestamp: -1,
      defenders: [],
      rampartMap: [],
      wallMap: [],
      hostileCreeps: [],
      activeTarget: null
    },
    scoutingDirector: {
      scoutedRooms: [],
      scoutQueue: []
    },
    helpOtherRoom: false
  };
  private static getAnchor(room: Room): Flag {
    return room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0];
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
    const level = room.controller?.level || 0;
    const shouldSpawnUpgrader = activeUpgraders.length < 1 && (Object.keys(Memory.roomStore).length === 1 || level > 2);
    if (room.controller && room.controller.my && shouldSpawnUpgrader) {
      const template = {
        template: CreepBuilder.buildScaledBalanced(Math.min(room.energyCapacityAvailable, 400)),
        memory: {
          ...CreepBase.baseMemory,
          role: "upgrader",
          working: false,
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
    const hasSites = room.find(FIND_CONSTRUCTION_SITES).length > 0;
    _.filter(Game.creeps, (c) => c.memory.role === "builder" && c.memory.homeRoom === room.name).map((c) =>
      hasSites ? this.runBuilder(c) : this.runUpgrader(c)
    );
  }
  private static spawnBuilder(room: Room): void {
    const storage = room.storage;
    const energyFull = room.energyCapacityAvailable - room.energyAvailable === 0 || room.energyAvailable > 1000;
    const storageHasBuffer = storage
      ? storage.store.getUsedCapacity(RESOURCE_ENERGY) > room.energyCapacityAvailable * 3
      : true;
    const towersNeedEnergy =
      _.filter(Game.creeps, (c) => c.memory.role === "queen").length > 0 &&
      _.filter(
        room.find(FIND_MY_STRUCTURES, {
          filter: (s) => {
            return s.structureType === STRUCTURE_TOWER && s.store[RESOURCE_ENERGY] < 500;
          }
        })
      ).length > 0;
    const builders = _.filter(Game.creeps, (c) => c.memory.role === "builder" && c.memory.homeRoom === room.name);
    const buildersNeedEnergy =
      builders.reduce((acc, creep) => {
        return acc + (creep.memory.working ? 0 : creep.store.getCapacity());
      }, 0) > 250;
    const spawners = room.find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_SPAWN });
    if (
      spawners.length > 0 &&
      room.controller &&
      room.controller.level < 8 &&
      energyFull &&
      storageHasBuffer &&
      Memory.roomStore[room.name].spawnQueue.length === 0 &&
      !towersNeedEnergy &&
      !buildersNeedEnergy &&
      builders.length < Constants.builders &&
      Memory.roomStore[room.name].defenseDirector.alertLevel === 0
    ) {
      Memory.roomStore[room.name].spawnQueue.push({
        template: CreepBuilder.buildScaledBalanced(Math.min(room.energyCapacityAvailable, 2500)),
        memory: {
          ...CreepBase.baseMemory,
          role: "builder",
          working: false,
          homeRoom: room.name,
          targetRoom: room.name
        }
      });
    }
  }
  private static findControllerContainer(controllerPos: RoomPosition): StructureContainer | undefined {
    return controllerPos.findInRange<StructureContainer>(FIND_STRUCTURES, 3, {
      filter: (s) => s.structureType === STRUCTURE_CONTAINER && s.pos.findInRange(FIND_SOURCES, 1).length === 0
    })[0];
  }
  private static findControllerLink(controllerPos: RoomPosition): StructureLink | undefined {
    return controllerPos.findInRange<StructureLink>(FIND_STRUCTURES, 4, {
      filter: (s) => s.structureType === STRUCTURE_LINK && s.pos.findInRange(FIND_SOURCES, 2).length === 0
    })[0];
  }
  private static createConstructionSites(room: Room): void {
    const controller = room.controller;
    if (controller) {
      // inner roads at lvl 2/3
      // middle roads at lvl 5
      // outer roads at lvl 6
      const anchor = this.getAnchor(room);
      const alreadyBuilding = Memory.roomStore[room.name].buildingThisTick;
      const anchorContainer = UtilPosition.findByPosition(anchor.pos, STRUCTURE_CONTAINER);
      const controllerContainer = this.findControllerContainer(controller.pos);
      const controllerLink = this.findControllerLink(controller.pos);
      const anchorLink = UtilPosition.findByPosition(anchor.pos, STRUCTURE_LINK, 2);
      const anchorLinkPos = Memory.roomStore[room.name].constructionDirector.singleStructures.filter(
        (s) => s.type === STRUCTURE_LINK
      )[0];
      switch (true) {
        case controller.level >= 3 && controller.level <= 5 && !alreadyBuilding && !anchorContainer && !anchorLink:
          if (room.createConstructionSite(anchor.pos.x, anchor.pos.y, STRUCTURE_CONTAINER) === OK) {
            Memory.roomStore[room.name].buildingThisTick = true;
          }
          break;
        case controller.level >= 5 && !alreadyBuilding && !anchorLink:
          if (room.createConstructionSite(anchorLinkPos.pos.x, anchorLinkPos.pos.y, STRUCTURE_LINK) === OK) {
            Memory.roomStore[room.name].buildingThisTick = true;
          }
          break;
        case !!anchorLink && !!anchorContainer:
          if (anchorContainer) {
            anchorContainer.destroy();
          }
          break;
        case controller.level >= 3 &&
          !alreadyBuilding &&
          !controllerContainer &&
          Constants.maxLinks[controller.level] < 4: {
          console.log("Building Controller Container");
          const structStore = Memory.roomStore[room.name].constructionDirector;
          const defStore = Memory.roomStore[room.name].defenseDirector;
          const avoids = structStore.extensionTemplate
            .concat(structStore.towerTemplate)
            .concat(structStore.labTemplate)
            .concat(structStore.singleStructures.map((s) => s.pos))
            .concat(defStore.wallMap);
          const containerPos = UtilPosition.getClosestSurroundingTo(
            UtilPosition.getClosestSurroundingTo(
              UtilPosition.getClosestSurroundingTo(controller.pos, anchor.pos, avoids),
              anchor.pos,
              avoids
            ),
            anchor.pos,
            avoids
          );
          if (containerPos && room.createConstructionSite(containerPos.x, containerPos.y, STRUCTURE_CONTAINER) === OK) {
            Memory.roomStore[room.name].buildingThisTick = true;
          }
          break;
        }
        case Constants.maxLinks[controller.level] >= 4 && !controllerLink: {
          const structStore = Memory.roomStore[room.name].constructionDirector;
          const defStore = Memory.roomStore[room.name].defenseDirector;
          const avoids = structStore.extensionTemplate
            .concat(structStore.towerTemplate)
            .concat(structStore.labTemplate)
            .concat(structStore.singleStructures.map((s) => s.pos))
            .concat(defStore.wallMap);
          const containerPos = UtilPosition.getClosestSurroundingTo(controller.pos, anchor.pos, avoids);
          const linkPos = UtilPosition.getClosestSurroundingTo(controller.pos, anchor.pos, [...avoids, containerPos]);
          if (linkPos && room.createConstructionSite(linkPos.x, linkPos.y, STRUCTURE_LINK) === OK) {
            Memory.roomStore[room.name].buildingThisTick = true;
          }
          break;
        }
        case !!controllerLink && !!controllerContainer:
          controllerContainer?.destroy();
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
        minerals: room.find(FIND_MINERALS).map((m: Mineral): string => m.id)
      };
    }
    // set BuildingThisTick flag
    if (Object.keys(Memory.roomStore).includes(room.name)) {
      Memory.roomStore[room.name] = {
        ...Memory.roomStore[room.name],
        buildingThisTick: room.find(FIND_CONSTRUCTION_SITES).length > 0
      };
    }
    if (!Object.keys(Memory.roomStore[room.name]).includes("defenseDirector")) {
      Memory.roomStore[room.name].defenseDirector = this.baseMemory.defenseDirector;
    }
  }

  private static runCore(room: Room): void {
    let anchor = this.getAnchor(room);
    if (anchor) {
      const container = anchor.pos
        .findInRange<StructureContainer>(FIND_STRUCTURES, 1)
        .filter((s) => s.structureType === STRUCTURE_CONTAINER)[0];
      const storage = anchor.pos
        .findInRange<StructureStorage>(FIND_STRUCTURES, 2)
        .filter((s) => s.structureType === STRUCTURE_STORAGE)[0];
      const link = anchor.pos
        .findInRange<StructureLink>(FIND_STRUCTURES, 2)
        .filter((s) => s.structureType === STRUCTURE_LINK)[0];
      const controllerLink = room.controller ? this.findControllerLink(room.controller.pos) : undefined;
      this.createConstructionSites(room);
      LinkHaulerDirector.spawnLinkHauler(room, link);
      LinkHaulerDirector.runLinkHaulers(room, link, controllerLink, storage, anchor);
      QueenDirector.runQueens(room, storage || container);
      this.spawnUpgrader(room);
      this.runUpgraders(room);
      this.spawnBuilder(room);
      this.runBuilders(room);
      ControllerHaulerDirector.run(room);
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
    lastCpu = cpu;
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
    CoreRoomPlanner.run(room);
    if (room.controller && room.controller.my && room.controller.level >= 1) {
      this.initMemory(room);
      this.runDirectors(room);
      SpawnDirector.runSpawn(room);
      ConstructionBunker2Director.run(room);
      // WallPlanner.getPerimeter(room);

      // memory init
      //      handle initialising non-existent keys
      // handle primary structure construction away from the main construction manager
      //      central container
      //      storage
      //      terminal
    }
  }
}
