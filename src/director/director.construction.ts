import { Constants } from "utils/constants";
import { ConstructionBunker2Director } from "./core/director.constructio.bunker2";
export class ConstructionDirector {
  public static setAnchor(room: Room) {
    const anchor: Flag | null = room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0];
    if (!anchor) {
      const spawn = room.find(FIND_MY_SPAWNS)[0];
      if (spawn) {
        const pos = spawn.pos;
        room.createFlag(pos.x + 1, pos.y + 1, `${room.name}-Anchor`);
      }
    }
  }
  private static getAnchor(room: Room): Flag {
    return room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0];
  }
  private static runRoad(from: RoomPosition, to: RoomPosition, avoids: RoomPosition[]): RoomPosition[] {
    return from
      .findPathTo(to, {
        ignoreCreeps: true,
        swampCost: 1,
        costCallback: (roomName, costMatrix) => {
          avoids.map((av) => costMatrix.set(av.x, av.y, 10));
        }
      })
      .map((p) => new RoomPosition(p.x, p.y, from.roomName));
  }
  private static populate(room: Room): void {
    if (room.controller) {
      const anchor = this.getAnchor(room);
      Memory.roomStore[room.name].constructionDirector.extensionTemplate = ConstructionBunker2Director.extensions(room);
      Memory.roomStore[room.name].constructionDirector.towerTemplate = ConstructionBunker2Director.towers(room);
      Memory.roomStore[room.name].constructionDirector.singleStructures = ConstructionBunker2Director.coreBuildings(
        room
      );
      Memory.roomStore[room.name].constructionDirector.labTemplate = ConstructionBunker2Director.labs(room);
      const store = Memory.roomStore[room.name].constructionDirector;
      const avoids = store.extensionTemplate
        .concat(store.towerTemplate)
        .concat(store.singleStructures.map((s) => s.pos))
        .concat(store.labTemplate)
        .concat(ConstructionBunker2Director.walls(room));
      const roads = room
        .find(FIND_SOURCES)
        .map((s) => s.pos)
        .concat(room.controller.pos)
        .reduce((acc: RoomPosition[], pos) => acc.concat(this.runRoad(pos, anchor.pos, avoids)), [])
        .concat(ConstructionBunker2Director.staticRoads(room));
      Memory.roomStore[room.name].constructionDirector.internalRoadTemplate = roads;
    }
  }
  private static nextExtension(room: Room, structures: AnyStructure[], level: number): boolean {
    const currentExtensions = structures.filter((s) => s.structureType === STRUCTURE_EXTENSION);
    const currentCount = currentExtensions.length;
    const currentMax = Constants.maxExtensions[level];
    if (currentCount < currentMax) {
      const template = Memory.roomStore[room.name].constructionDirector.extensionTemplate;
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
      const template = Memory.roomStore[room.name].constructionDirector.towerTemplate;
      const unbuilt = template.filter((t) => !currentTowers.some((t) => t.pos.isEqualTo(t)));
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
      const template = Memory.roomStore[room.name].constructionDirector.labTemplate;
      const unbuilt = template.filter((t) => !currentLabs.some((l) => l.pos.isEqualTo(t)));
      const next = unbuilt[0];
      if (next) {
        return next.createConstructionSite(STRUCTURE_LAB) === OK;
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
    switch (true) {
      case shouldBuildSpawn: {
        const next = Memory.roomStore[room.name].constructionDirector.singleStructures.filter(
          (s) => s.type === STRUCTURE_SPAWN
        )[0];
        if (next) {
          return next.pos.createConstructionSite(STRUCTURE_SPAWN) === OK;
        }
        break;
      }
      case shouldBuildStorage: {
        const next = Memory.roomStore[room.name].constructionDirector.singleStructures.filter(
          (s) => s.type === STRUCTURE_STORAGE
        )[0];
        if (next) {
          return next.pos.createConstructionSite(STRUCTURE_STORAGE) === OK;
        }
        break;
      }
      case shouldBuildTerminal: {
        const next = Memory.roomStore[room.name].constructionDirector.singleStructures.filter(
          (s) => s.type === STRUCTURE_TERMINAL
        )[0];
        if (next) {
          return next.pos.createConstructionSite(STRUCTURE_TERMINAL) === OK;
        }
        break;
      }
      case shouldBuildFactory: {
        const next = Memory.roomStore[room.name].constructionDirector.singleStructures.filter(
          (s) => s.type === STRUCTURE_FACTORY
        )[0];
        if (next) {
          return next.pos.createConstructionSite(STRUCTURE_FACTORY) === OK;
        }
        break;
      }
      case shouldBuildObserver: {
        const next = Memory.roomStore[room.name].constructionDirector.singleStructures.filter(
          (s) => s.type === STRUCTURE_OBSERVER
        )[0];
        if (next) {
          return next.pos.createConstructionSite(STRUCTURE_OBSERVER) === OK;
        }
        break;
      }
      case shouldBuildObserver: {
        const next = Memory.roomStore[room.name].constructionDirector.singleStructures.filter(
          (s) => s.type === STRUCTURE_NUKER
        )[0];
        if (next) {
          return next.pos.createConstructionSite(STRUCTURE_NUKER) === OK;
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
          r.lookFor(LOOK_STRUCTURES).filter((l) => l.structureType !== STRUCTURE_RAMPART).length === 0
      );
      if (next) {
        return next.createConstructionSite(STRUCTURE_ROAD) === OK;
      } else {
        Memory.roomStore[room.name].constructionDirector.roadsCreated = true;
      }
    }
    return false;
  }
  private static nextSite(room: Room): void {
    if (room.controller) {
      const level = room.controller.level;
      const structures = room.find(FIND_MY_STRUCTURES);
      const sites = room.find(FIND_CONSTRUCTION_SITES);
      if (sites.length === 0) {
        this.nextExtension(room, structures, level) ||
          this.singleStructures(room, structures, level) ||
          this.nextTower(room, structures, level) ||
          // this.nextLab(room, structures, level) ||
          this.buildRoads(room, level);
        // search single buildings
        // search roads
      }
    }
  }
  private static buildSites(room: Room): void {
    // TODO - change this from being responsibility of the builder, to the responsibility of the remote harvester
    //  for structures in remote rooms
    const target = room
      .find(FIND_CONSTRUCTION_SITES)
      .sort((a, b) => a.progressTotal - a.progress - (b.progressTotal - b.progress))[0];
    const creeps = _.filter(
      Game.creeps,
      (c) => c.memory.role === "builder" && c.memory.homeRoom === room.name && c.memory.targetRoom === room.name
    );
    creeps.map((c) => (c.memory.workTarget = target ? target.id : ""));
  }
  public static run(room: Room): void {
    this.setAnchor(room);
    this.populate(room);
    this.nextSite(room);
    this.buildSites(room);
  }
}
