import { RoomUtils } from "rework/utils/roomUtils";
import { RemoteEnergyMemory } from "./remoteRoomEnergy";

export class RemoteRoomEnergyConstruction {
  private static createContainer(room: RemoteEnergyMemory): void {
    const homeRoomVisible = Object.keys(Game.rooms).includes(room.homeRoomName);
    const targetRoomVisible = Object.keys(Game.rooms).includes(room.roomName);
    if (targetRoomVisible && homeRoomVisible && Game.rooms[room.homeRoomName].energyCapacityAvailable >= 1_000) {
      const targetRoom = Game.rooms[room.roomName];
      const terrain = targetRoom.getTerrain();
      const sources = targetRoom.find(FIND_SOURCES);
      sources.forEach((source) => {
        const container = source.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 1, {
          filter: (s) => s.structureType === STRUCTURE_CONTAINER
        })[0];
        const site = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 2)[0];
        if (!container && !site) {
          let built = false;
          _.range(-1, 2).map((x) => {
            _.range(-1, 2).map((y) => {
              const pos = new RoomPosition(source.pos.x + x, source.pos.y + y, source.pos.roomName);
              if (terrain.get(pos.x, pos.y) !== 1 && !built) {
                if (pos.createConstructionSite(STRUCTURE_CONTAINER) === OK) {
                  built = true;
                }
              }
            });
          });
        }
      });
    }
  }
  public static run(room: RemoteEnergyMemory, index: number): void {
    const startCpu = Game.cpu.getUsed();
    this.createContainer(room);
    const usedCpu = Game.cpu.getUsed() - startCpu;
    RoomUtils.recordFilePerformance(room.homeRoomName, "roomRemoteEnergyConstruction", usedCpu);
    // spawn remote containers if home room energyCap > 1k
    // create roads if level > 3
  }
}
