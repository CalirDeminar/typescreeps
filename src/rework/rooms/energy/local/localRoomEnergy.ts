import { PositionsUtils } from "rework/utils/positions";
import { LocalRoomEnergyConstruction } from "./localRoomEnergyConstruction";
import { LocalRoomEnergyShuttle } from "./localRoomEnergyShuttle";
import { LocalRoomEnergyContainer } from "./localRoomEnergyContainer";
import { LocalRoomEnergyLink } from "./localRoomEnergyLink";
export class LocalRoomEnergy {
  private static runSource(room: Room, source: Source): void {
    const container = source.pos
      .findInRange<StructureContainer>(FIND_STRUCTURES, 2)
      .filter((s) => s.structureType === "container")[0];
    const link = source.pos.findInRange<StructureLink>(FIND_STRUCTURES, 2).filter((s) => s.structureType === "link")[0];
    LocalRoomEnergyConstruction.placeStructures(source);
    switch (true) {
      case !!link:
        LocalRoomEnergyLink.run(source, link);
        break;
      case !!container:
        LocalRoomEnergyContainer.run(source);
        break;
      default:
        LocalRoomEnergyShuttle.run(source);
        break;
    }
  }
  public static run(room: Room): void {
    const sources = room.find(FIND_SOURCES);
    sources.forEach((s) => this.runSource(room, s));
  }
}
