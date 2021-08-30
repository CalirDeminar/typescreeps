import { Constants } from "utils/constants";
import { ConstructionTemplates } from "./templates/constructionTemplates";
export class ConstructionDirector {
  public static setAnchor(room: Room) {
    const anchor: Flag | null = room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0];
    if (!anchor) {
      const spawn = room.find(FIND_MY_SPAWNS)[0];
      if (spawn) {
        const pos = spawn.pos;
        room.createFlag(pos.x, pos.y + 1, `${room.name}-Anchor`);
      }
    } else {
      Memory.roomStore[room.name].constructionDirector.anchor = anchor.pos;
    }
  }
  private static populateBuildingStore(room: Room): void {
    Memory.roomStore[room.name].constructionDirector.containerTemplate = ConstructionTemplates.containers(room);
    Memory.roomStore[room.name].constructionDirector.extensionTemplate = ConstructionTemplates.extensions(room);
    Memory.roomStore[room.name].constructionDirector.towerTemplate = ConstructionTemplates.towers(room);
    Memory.roomStore[room.name].constructionDirector.storage = ConstructionTemplates.storage(room);
    Memory.roomStore[room.name].constructionDirector.terminal = ConstructionTemplates.terminal(room);
    Memory.roomStore[room.name].constructionDirector.extractor = ConstructionTemplates.extractor(room);
    Memory.roomStore[room.name].constructionDirector.anchorLink = ConstructionTemplates.anchorLink(room);
    Memory.roomStore[room.name].constructionDirector.sourceLinks = ConstructionTemplates.sourceLinks(room);
    Memory.roomStore[room.name].constructionDirector.buildingsCreated = true;
  }
  private static populateRoadStore(room: Room): void {
    Memory.roomStore[room.name].constructionDirector.internalRoadTemplate = ConstructionTemplates.surroundingRoads(
      room
    );
    Memory.roomStore[room.name].constructionDirector.routeRoadTemplate = [
      ...new Set(
        ConstructionTemplates.sourceRoads(room)
          .concat(ConstructionTemplates.controllerRoads(room))
          .concat(ConstructionTemplates.remoteSourceRoads(room))
      )
    ];
    Memory.roomStore[room.name].constructionDirector.roadsCreated = true;
  }
  private static populate(room: Room) {
    const store = Memory.roomStore[room.name].constructionDirector;
    const isPeriodic = Game.time % 5000 === 0;
    if (!store.buildingsCreated) {
      console.log("Placing Buildings");
      this.populateBuildingStore(room);
    }
    if (!store.roadsCreated) {
      console.log("Routing Roads");
      this.populateRoadStore(room);
    }
  }
  private static nextSingleStructure(
    targetType: BuildableStructureConstant,
    structures: AnyStructure[],
    currentMax: number,
    pos: RoomPosition | null
  ): boolean {
    const currentCount = structures.filter((s) => s.structureType === targetType).length;
    if (pos && currentCount < currentMax) {
      pos = new RoomPosition(pos.x, pos.y, pos.roomName);
      return pos.createConstructionSite(targetType) === OK;
    }
    return false;
  }
  private static nextStructure(
    targetType: BuildableStructureConstant,
    structures: AnyStructure[],
    currentMax: number,
    template: RoomPosition[],
    terrain: RoomTerrain,
    roomName: string
  ): boolean {
    const currentCount = structures.filter((s) => s.structureType === targetType).length;
    if (currentCount < currentMax) {
      const next = template.find((p) => {
        p = new RoomPosition(p.x, p.y, p.roomName);
        return (
          p.roomName === roomName &&
          terrain.get(p.x, p.y) !== 1 &&
          p.lookFor(LOOK_STRUCTURES).filter((s) => {
            if (targetType === STRUCTURE_ROAD) {
              return true;
            }
            return s.structureType !== STRUCTURE_ROAD;
          }).length === 0
        );
      });
      if (next) {
        const rtn = new RoomPosition(next.x, next.y, next.roomName).createConstructionSite(targetType);
        return rtn === OK;
      }
      return false;
    }
    return false;
  }
  private static nextSite(room: Room) {
    const activeSite = room.find(FIND_CONSTRUCTION_SITES).length > 0;
    const structures = room.find(FIND_STRUCTURES);
    if (!activeSite && room.controller) {
      const level = room.controller.level;
      const store = Memory.roomStore[room.name].constructionDirector;
      const terrain = room.getTerrain();
      this.nextStructure(
        STRUCTURE_CONTAINER,
        structures,
        Constants.maxContainers[level],
        store.containerTemplate,
        terrain,
        room.name
      ) ||
        this.nextStructure(
          STRUCTURE_EXTENSION,
          structures,
          Constants.maxExtensions[level],
          store.extensionTemplate,
          terrain,
          room.name
        ) ||
        this.nextStructure(
          STRUCTURE_ROAD,
          structures,
          level > 2 ? store.internalRoadTemplate.length + store.routeRoadTemplate.length : 0,
          store.internalRoadTemplate,
          terrain,
          room.name
        ) ||
        this.nextStructure(
          STRUCTURE_ROAD,
          structures,
          level > 2 ? store.internalRoadTemplate.length + store.routeRoadTemplate.length : 0,
          store.routeRoadTemplate,
          terrain,
          room.name
        ) ||
        this.nextStructure(
          STRUCTURE_TOWER,
          structures,
          Constants.maxTowers[level],
          store.towerTemplate,
          terrain,
          room.name
        ) ||
        this.nextSingleStructure(STRUCTURE_STORAGE, structures, Constants.maxStorage[level], store.storage) ||
        this.nextSingleStructure(STRUCTURE_LINK, structures, Constants.maxLinks[level], store.anchorLink) ||
        this.nextStructure(
          STRUCTURE_LINK,
          structures,
          Constants.maxLinks[level],
          store.sourceLinks,
          terrain,
          room.name
        ) ||
        this.nextSingleStructure(STRUCTURE_TERMINAL, structures, Constants.maxTerminal[level], store.terminal) ||
        this.nextSingleStructure(STRUCTURE_EXTRACTOR, structures, Constants.maxExtractor[level], store.extractor);
    }
  }
  private static buildSites(room: Room): void {
    const target = room.find(FIND_CONSTRUCTION_SITES)[0];
    const creeps = _.filter(Game.creeps, (c) => c.memory.role === "builder");
    creeps.map((c) => (c.memory.workTarget = target ? target.id : ""));
  }
  public static run(room: Room): void {
    this.setAnchor(room);
    this.populate(room);
    this.nextSite(room);
    this.buildSites(room);
  }
}
