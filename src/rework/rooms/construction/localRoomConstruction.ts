import { CreepUtils } from "rework/utils/creepUtils";
import { PositionsUtils } from "rework/utils/positions";
import { Constants } from "utils/constants";
import { UtilPosition } from "utils/util.position";
import { LocalRoomConstructionPlanner } from "./localRoomConstructionPlanner";

export interface ConstructionDirectorStore {
  internalRoadTemplate: RoomPosition[];
  towerTemplate: RoomPosition[];
  extensionTemplate: RoomPosition[];
  labTemplate: RoomPosition[];
  singleStructures: { type: BuildableStructureConstant; pos: RoomPosition }[];
  roadsCreated: boolean;
}
export const constructionDirectorDefault: ConstructionDirectorStore = {
  internalRoadTemplate: [],
  towerTemplate: [],
  extensionTemplate: [],
  labTemplate: [],
  singleStructures: [],
  roadsCreated: false
};
export class LocalRoomConstruction {
  private static createAnchor(room: Room): void {
    const anchor = PositionsUtils.getAnchor(room);
    if (!anchor && room.controller && room.controller.my) {
      const spawn = room.find(FIND_MY_SPAWNS)[0];
      if (spawn) {
        room.createFlag(spawn.pos.x, spawn.pos.y - 1, `${room.name}-Anchor`);
      }
    }
  }
  private static nextExtension(room: Room, structures: AnyStructure[], level: number): boolean {
    const currentExtensions = structures.filter((s) => s.structureType === STRUCTURE_EXTENSION);
    const currentCount = currentExtensions.length;
    const currentMax = Constants.maxExtensions[level];
    const terrain = room.getTerrain();
    if (currentCount < currentMax) {
      const template = Memory.roomStore[room.name].constructionDirector.extensionTemplate
        .map((p) => new RoomPosition(p.x, p.y, p.roomName))
        .filter((p) => terrain.get(p.x, p.y) !== 1);
      const unbuilt = template.filter((t) => !currentExtensions.some((e) => e.pos.isEqualTo(t)));
      const next = unbuilt[0];
      if (next) {
        return next.createConstructionSite(STRUCTURE_EXTENSION) === OK;
      }
    }
    return false;
  }
  private static nextTower(room: Room, structures: AnyStructure[], level: number): boolean {
    const currentTowers = structures.filter((s) => s.structureType === STRUCTURE_TOWER);
    const currentCount = currentTowers.length;
    const currentMax = Constants.maxTowers[level];
    if (currentCount < currentMax) {
      const template = Memory.roomStore[room.name].constructionDirector.towerTemplate.map(
        (p) => new RoomPosition(p.x, p.y, p.roomName)
      );
      const unbuilt = template.filter((t1) => !currentTowers.some((t2) => t1.isEqualTo(t2)));
      const next = unbuilt[0];
      if (next) {
        return next.createConstructionSite(STRUCTURE_TOWER) === OK;
      }
    }
    return false;
  }
  private static nextLab(room: Room, structures: AnyStructure[], level: number): boolean {
    const currentLabs = structures.filter((s) => s.structureType === STRUCTURE_LAB);
    const currentCount = currentLabs.length;
    const currentMax = Constants.maxLabs[level];
    if (currentCount < currentMax) {
      const template = Memory.roomStore[room.name].constructionDirector.labTemplate.map(
        (p) => new RoomPosition(p.x, p.y, p.roomName)
      );
      const unbuilt = template.filter((t) => !currentLabs.some((l) => l.pos.isEqualTo(t)));
      const next = unbuilt[0];
      if (next) {
        return new RoomPosition(next.x, next.y, next.roomName).createConstructionSite(STRUCTURE_LAB) === OK;
      }
    }
    return false;
  }
  public static singleStructures(room: Room, structures: AnyStructure[], level: number): boolean {
    const currentSpawns = structures.filter((s) => s.structureType === STRUCTURE_SPAWN);
    const shouldBuildSpawn = currentSpawns.length < Constants.maxSpawns[level];
    const currentStorage = structures.filter((s) => s.structureType === STRUCTURE_STORAGE);
    const shouldBuildStorage = currentStorage.length < Constants.maxStorage[level];
    const currentTerminal = structures.filter((s) => s.structureType === STRUCTURE_TERMINAL);
    const shouldBuildTerminal = currentTerminal.length < Constants.maxTerminal[level];
    const currentFactory = structures.filter((s) => s.structureType === STRUCTURE_FACTORY);
    const shouldBuildFactory = currentFactory.length < Constants.maxFactories[level];
    const currentObserver = structures.filter((s) => s.structureType === STRUCTURE_OBSERVER);
    const shouldBuildObserver = currentObserver.length < Constants.maxObservers[level];
    const currentNuker = structures.filter((s) => s.structureType === STRUCTURE_NUKER);
    const shouldBuildNuker = currentNuker.length < Constants.maxNukers[level];
    const currentPowerSpawn = structures.filter((s) => s.structureType === STRUCTURE_POWER_SPAWN);
    const shouldBuildPowerSpawn = currentPowerSpawn.length < Constants.maxPowerSpawns[level];
    const coreLink = structures.filter(
      (s) =>
        s.structureType === STRUCTURE_LINK &&
        s.pos.findInRange(FIND_FLAGS, 1, { filter: (f) => f.name === `${room.name}-Anchor` })
    );
    const shouldBuildCoreLink = coreLink.length === 0 && Constants.maxLinks[level] >= 1;
    switch (true) {
      case shouldBuildSpawn: {
        const next = Memory.roomStore[room.name].constructionDirector.singleStructures.filter(
          (s) =>
            s.type === STRUCTURE_SPAWN &&
            new RoomPosition(s.pos.x, s.pos.y, s.pos.roomName).lookFor(LOOK_STRUCTURES).length === 0
        )[0];
        if (next) {
          return (
            new RoomPosition(next.pos.x, next.pos.y, next.pos.roomName).createConstructionSite(STRUCTURE_SPAWN) === OK
          );
        }
        break;
      }
      case shouldBuildStorage: {
        const next = Memory.roomStore[room.name].constructionDirector.singleStructures.filter(
          (s) => s.type === STRUCTURE_STORAGE
        )[0];
        if (next) {
          return (
            new RoomPosition(next.pos.x, next.pos.y, next.pos.roomName).createConstructionSite(STRUCTURE_STORAGE) === OK
          );
        }
        break;
      }
      case shouldBuildCoreLink: {
        const next = Memory.roomStore[room.name].constructionDirector.singleStructures.filter(
          (s) => s.type === STRUCTURE_LINK
        )[0];
        if (next) {
          return (
            new RoomPosition(next.pos.x, next.pos.y, next.pos.roomName).createConstructionSite(STRUCTURE_LINK) === OK
          );
        }
        break;
      }
      case shouldBuildTerminal: {
        const next = Memory.roomStore[room.name].constructionDirector.singleStructures.filter(
          (s) => s.type === STRUCTURE_TERMINAL
        )[0];
        if (next) {
          return (
            new RoomPosition(next.pos.x, next.pos.y, next.pos.roomName).createConstructionSite(STRUCTURE_TERMINAL) ===
            OK
          );
        }
        break;
      }
      case shouldBuildFactory: {
        const next = Memory.roomStore[room.name].constructionDirector.singleStructures.filter(
          (s) => s.type === STRUCTURE_FACTORY
        )[0];
        if (next) {
          return (
            new RoomPosition(next.pos.x, next.pos.y, next.pos.roomName).createConstructionSite(STRUCTURE_FACTORY) === OK
          );
        }
        break;
      }
      case shouldBuildObserver: {
        const next = Memory.roomStore[room.name].constructionDirector.singleStructures.filter(
          (s) => s.type === STRUCTURE_OBSERVER
        )[0];
        if (next) {
          return (
            new RoomPosition(next.pos.x, next.pos.y, next.pos.roomName).createConstructionSite(STRUCTURE_OBSERVER) ===
            OK
          );
        }
        break;
      }
      case shouldBuildObserver: {
        const next = Memory.roomStore[room.name].constructionDirector.singleStructures.filter(
          (s) => s.type === STRUCTURE_NUKER
        )[0];
        if (next) {
          return (
            new RoomPosition(next.pos.x, next.pos.y, next.pos.roomName).createConstructionSite(STRUCTURE_NUKER) === OK
          );
        }
        break;
      }
      default:
        return false;
    }
    return false;
  }
  private static buildRoads(room: Room, level: number): boolean {
    if (!Memory.roomStore[room.name].constructionDirector.roadsCreated && level >= 4) {
      const terrain = room.getTerrain();
      const template = Memory.roomStore[room.name].constructionDirector.internalRoadTemplate;
      const next = template.find(
        (r) =>
          terrain.get(r.x, r.y) !== 1 &&
          new RoomPosition(r.x, r.y, r.roomName)
            .lookFor(LOOK_STRUCTURES)
            .filter((l) => l.structureType !== STRUCTURE_RAMPART).length === 0
      );
      if (next) {
        return new RoomPosition(next.x, next.y, next.roomName).createConstructionSite(STRUCTURE_ROAD) === OK;
      } else {
        Memory.roomStore[room.name].constructionDirector.roadsCreated = true;
      }
    }
    return false;
  }
  private static buildControllerContainer(room: Room, level: number): boolean {
    const controller = room.controller;
    if (!controller) {
      return false;
    }
    const container = controller.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 3, {
      filter: (s) => s.structureType === STRUCTURE_CONTAINER && s.pos.findInRange(FIND_SOURCES, 1).length === 0
    })[0];
    const canHaveLink = Constants.maxLinks[level] >= 4;
    const anchor = UtilPosition.getAnchor(room);
    const anchorContainer = anchor.findInRange(FIND_STRUCTURES, 1, {
      filter: (s) => s.structureType === STRUCTURE_CONTAINER
    });
    if (!container && level >= 3 && !canHaveLink && !!anchorContainer) {
      const structStore = Memory.roomStore[room.name].constructionDirector;
      const defStore = Memory.roomStore[room.name].defenseDirector;
      const avoids = structStore.extensionTemplate
        .concat(structStore.towerTemplate)
        .concat(structStore.labTemplate)
        .concat(structStore.singleStructures.map((s) => s.pos))
        .concat(defStore.wallMap);
      const containerPos = PositionsUtils.getClosestSurroundingTo(
        PositionsUtils.getClosestSurroundingTo(
          PositionsUtils.getClosestSurroundingTo(controller.pos, anchor, avoids),
          anchor,
          avoids
        ),
        anchor,
        avoids
      );
      const rtn = containerPos.createConstructionSite(STRUCTURE_CONTAINER) === OK;
      if (rtn) {
        Memory.roomStore[room.name].buildingThisTick = true;
      }
      return rtn;
    }
    return false;
  }
  private static nextSite(room: Room): void {
    if (room.controller) {
      const level = room.controller.level;
      const structures = room.find(FIND_MY_STRUCTURES);
      const sites = room.find(FIND_CONSTRUCTION_SITES);
      if (sites.length === 0) {
        const rtn =
          this.nextExtension(room, structures, level) ||
          this.singleStructures(room, structures, level) ||
          this.nextTower(room, structures, level) ||
          this.buildControllerContainer(room, level) ||
          this.buildRoads(room, level) ||
          this.nextLab(room, structures, level);
        if (rtn) {
          Memory.roomStore[room.name].buildingThisTick = true;
        }
        // search single buildings
        // search roads
      }
    }
  }
  private static buildSites(room: Room): void {
    // TODO - change this from being responsibility of the builder, to the responsibility of the remote harvester
    //  for structures in remote rooms
    const sites = room.find(FIND_CONSTRUCTION_SITES);
    const siteIds = sites.map<string>((s) => s.id);
    const creeps = CreepUtils.filterCreeps("builder", room.name, room.name);
    // clear workTarget of creeps who's target is complete
    creeps.filter((c) => !siteIds.includes(c.memory.workTarget)).map((c) => (c.memory.workTarget = ""));
    const targets = sites
      .filter(
        (s) =>
          // filter out structures with though builders to finish them
          creeps
            .filter((c) => c.memory.workTarget === s.id)
            .reduce((acc: number, c: Creep) => acc + c.store.getUsedCapacity(RESOURCE_ENERGY), 0) <
          s.progressTotal - s.progress
      )
      .sort((a, b) => a.progressTotal - a.progress - (b.progressTotal - b.progress));
    let index = 0;
    creeps.map((c) => {
      if (c.memory.workTarget === "") {
        const target = targets[index];
        if (target) {
          c.memory.workTarget = target.id;
          if (c.store.getUsedCapacity(RESOURCE_ENERGY) > target.progressTotal - target.progress) {
            index += 1;
          }
        }
      }
    });
  }
  public static run(room: Room): void {
    this.createAnchor(room);
    LocalRoomConstructionPlanner.run(room);
    this.nextSite(room);
    this.buildSites(room);
  }
}
