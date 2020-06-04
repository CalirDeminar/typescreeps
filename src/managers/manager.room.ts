import { ConstructionManager } from "./manager.construction";
import { SourceManager } from "./manager.source";
const memorySetup = (room: Room) => {
  if (!Memory.roomStore) {
    Memory.roomStore = {};
  }
  if (Memory.roomStore[room.name] === undefined) {
    Memory.roomStore[room.name] = {
      sources: room.find(FIND_SOURCES).map((s: Source): string => s.id),
      minerals: room.find(FIND_MINERALS).map((m: Mineral): string => m.id),
      controllerId: room.controller ? room.controller.id : "",
      nextSpawn: null
    };
  }
};
export class RoomManager {
  public static run(room: Room): void {
    if (room.controller && room.controller.my) {
      memorySetup(room);
      ConstructionManager.run(room);
      SourceManager.run(room);
    }
  }
}
