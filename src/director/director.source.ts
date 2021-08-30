import { Constants } from "utils/constants";
import { UtilPosition } from "utils/util.position";
import { SourceShuttleDirector } from "./localSources/director.source.shuttle";
import { SourceContainerDirector } from "./localSources/director.source.container";
import { SourceLinkDirector } from "./localSources/director.source.link";
export class SourceDirector {
  private static getAnchor(room: Room): Flag {
    return room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0];
  }
  private static getLink(source: Source): StructureLink | null {
    return source.pos.findInRange<StructureLink>(FIND_STRUCTURES, 1).filter((s) => s.structureType === "link")[0];
  }
  private static getContainer(source: Source): StructureContainer | null {
    return source.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 1).filter((s) => s.structureType === "container")[0];
  }
  private static doPlaceStructure(pos: RoomPosition, type: BuildableStructureConstant): boolean {
    if(pos.lookFor(LOOK_STRUCTURES).filter((s) => s.structureType !== STRUCTURE_ROAD).length === 0){
      return pos.createConstructionSite(type) === 0;
    }
    return false;
  }
  private static placeStructures(
    room: Room,
    source: Source,
    anchor: Flag,
    container: StructureContainer | null,
    link: StructureLink | null
  ): void {
    const controller = room.controller;
    const activeSite = room.find(FIND_CONSTRUCTION_SITES).length > 0;
    if (controller && !activeSite) {
      const level = controller.level;
      const shouldHaveContainers = Constants.maxContainers[level] > 0 && !link;
      const shouldHaveLinks = Constants.maxLinks[level] > 0;
      if (!container && shouldHaveContainers && !shouldHaveLinks) {
        console.log("Placing Containers");
        this.doPlaceStructure(new RoomPosition(anchor.pos.x, anchor.pos.y + 1, anchor.pos.roomName), STRUCTURE_CONTAINER) ||
          this.doPlaceStructure(UtilPosition.getClosestSurroundingTo(source.pos, anchor.pos), STRUCTURE_CONTAINER);
      } else {
        const canHaveNewLink =
          shouldHaveLinks &&
          room.find(FIND_MY_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_LINK }).length <
            Constants.maxLinks[level];
        if (!link && shouldHaveLinks && canHaveNewLink) {
          this.doPlaceStructure(new RoomPosition(anchor.pos.x -1, anchor.pos.y -1, anchor.pos.roomName), STRUCTURE_LINK) ||
            UtilPosition.getClosestSurroundingTo(source.pos, anchor.pos, container ? [container.pos] : []).createConstructionSite(STRUCTURE_LINK);
        }
        if (link && container) {
          container.destroy();
        }
      }
    }
  }
  private static runSource(room: Room, source: Source, anchor: Flag): void {
    const container = this.getContainer(source);
    const link = this.getLink(source);
    this.placeStructures(room, source, anchor, container, link);
    switch (true) {
      case !!link:
        if (link) {
          SourceLinkDirector.run(room, source, link, anchor);
        }
        break;
      case !!container:
        if (container) {
          SourceContainerDirector.run(room, source, container, anchor);
        }
        break;
      default:
        SourceShuttleDirector.run(room, source, anchor);
        break;
    }
  }
  public static run(room: Room): void {
    const sources = room.find(FIND_SOURCES);
    const anchor = this.getAnchor(room);
    sources.map((s) => this.runSource(room, s, anchor));
  }
}
