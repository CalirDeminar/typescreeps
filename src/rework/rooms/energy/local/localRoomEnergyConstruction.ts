import { Constants } from "utils/constants";
import { PositionsUtils } from "rework/utils/positions";
import { RoomUtils } from "rework/utils/roomUtils";
export class LocalRoomEnergyConstruction {
  private static doPlaceStructure(pos: RoomPosition, type: BuildableStructureConstant): boolean {
    const validPos =
      pos
        .lookFor(LOOK_STRUCTURES)
        .filter((s) => s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_RAMPART).length === 0;
    const buildingThisTick = Memory.roomStore[pos.roomName].buildingThisTick;
    if (validPos && !buildingThisTick) {
      return pos.createConstructionSite(type) === OK;
    }
    return false;
  }
  public static getCoreStructures(room: Room, anchor: RoomPosition) {
    // const anchor = PositionsUtils.getAnchor(room);
    const container = PositionsUtils.findStructureInRange(anchor, 1, STRUCTURE_CONTAINER);
    const link = PositionsUtils.findStructureInRange(anchor, 1, STRUCTURE_LINK);
    return {
      container: container?.pos,
      link: link?.pos
    };
  }
  public static getSourceStructures(source: Source) {
    const container = PositionsUtils.findStructureInRange(source.pos, 1, STRUCTURE_CONTAINER);
    const link = PositionsUtils.findStructureInRange(source.pos, 2, STRUCTURE_LINK);
    return {
      container,
      link
    };
  }
  private static genreateAvoids(room: Room): RoomPosition[] {
    const structStore = Memory.roomStore[room.name].constructionDirector;
    const defStore = Memory.roomStore[room.name].defenceDirector;
    return structStore.extensionTemplate
      .concat(structStore.towerTemplate)
      .concat(structStore.labTemplate)
      .concat(structStore.singleStructures.map((s) => s.pos))
      .concat(defStore.wallMap);
  }
  public static placeStructures(source: Source): void {
    const startCpu = Game.cpu.getUsed();
    const room = source.room;
    const anchor = PositionsUtils.getAnchor(room);
    const controller = room.controller;
    // const activeSite = room.find(FIND_CONSTRUCTION_SITES).length > 0 || Memory.roomStore[room.name].buildingThisTick;
    if (controller && anchor) {
      const avoids = this.genreateAvoids(room);
      const coreStructures = this.getCoreStructures(room, anchor);
      const sourceStructures = this.getSourceStructures(source);
      const shouldBuildContainer =
        Constants.maxContainers[controller.level] > 0 && !sourceStructures.link && !sourceStructures.container;
      const shouldBuildLink = Constants.maxLinks[controller.level] && !!coreStructures.link && !sourceStructures.link;
      switch (true) {
        case !coreStructures.container && Constants.maxContainers[controller.level] > 0:
          if (coreStructures.container && this.doPlaceStructure(coreStructures.container, STRUCTURE_CONTAINER)) {
            Memory.roomStore[room.name].buildingThisTick = true;
          }
          break;
        case shouldBuildContainer:
          const pos = PositionsUtils.getClosestSurroundingTo(source.pos, anchor, avoids);
          if (this.doPlaceStructure(pos, STRUCTURE_CONTAINER)) {
            Memory.roomStore[room.name].buildingThisTick = true;
          }
          break;
        case shouldBuildLink:
          const creepPos = PositionsUtils.getClosestSurroundingTo(source.pos, anchor, avoids);
          const linkPos = PositionsUtils.getClosestSurroundingTo(creepPos, anchor, avoids);
          if (this.doPlaceStructure(linkPos, STRUCTURE_LINK)) {
            Memory.roomStore[room.name].buildingThisTick = true;
          }
          break;
        case !!sourceStructures.link && !!sourceStructures.container:
          if (sourceStructures.container) {
            sourceStructures.container.destroy();
          }
          break;
      }
      const usedCpu = Game.cpu.getUsed() - startCpu;
      RoomUtils.recordFilePerformance(room.name, "roomLocalEnergyConstruction", usedCpu);
    }
  }
}
