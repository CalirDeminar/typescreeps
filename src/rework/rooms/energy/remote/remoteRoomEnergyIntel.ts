import { initial } from "lodash";
import { PositionsUtils } from "rework/utils/positions";
import { Constants } from "utils/constants";

export class RemoteRoomEnergyIntel {
  private static addNewRemoteRoom(room: Room): void {
    const borders = PositionsUtils.getRoomNeighbors(room);
    const store = Memory.roomStore[room.name].remoteDirector;
    const intel = Memory.scoutingDirector.scoutedRooms.filter(
      (r) => r.towers.length === 0 && r.keeperLair.length === 0
    );
    const scoutedRoomNames = intel.map((r) => r.name);
    const currentRemotes = Object.values(Memory.roomStore).reduce(
      (acc: string[], s) => acc.concat(s.remoteDirector.map((rd) => rd.roomName)),
      []
    );
    const assessmentInterval = Game.time + (Constants.remoteHarvestingTimingOffset % 100) === 0;
    const initialAssesment =
      store.length === 0 || borders.some((b) => b && scoutedRoomNames.includes(b) && !currentRemotes.includes(b));
    if (assessmentInterval || initialAssesment) {
      const availableDoubleSourceRooms = intel.filter(
        (r) => r.sources.length === 2 && !currentRemotes.includes(r.name) && borders.includes(r.name)
      );
      const availableSingleSourceRooms = intel.filter(
        (r) => r.sources.length === 1 && !currentRemotes.includes(r.name) && borders.includes(r.name)
      );
      const newRoom = availableDoubleSourceRooms[0] || availableSingleSourceRooms[0] || undefined;
      if (newRoom) {
        const anchor = PositionsUtils.getAnchor(room);
        const sourceLocations = newRoom.sources.map((s) => new RoomPosition(s.pos.x, s.pos.y, s.pos.roomName));

        const sourcesReachable =
          sourceLocations.filter((source) => {
            const path = PathFinder.search(anchor, { pos: source, range: 1 }, { maxRooms: 3 });
            return !path.incomplete;
          }).length === sourceLocations.length;
        if (sourcesReachable) {
          const sources = newRoom.sources.map((s) => ({ sourceId: s.id, targetContainerId: null }));
          Memory.roomStore[room.name].remoteDirector = store.concat([
            {
              roomName: newRoom.name,
              homeRoomName: room.name,
              anchorId: `${room.name}-Anchor`,
              controllerId: newRoom.controller ? newRoom.controller.id : "",
              sources: sources,
              roadQueue: [],
              roadsPathed: false,
              roadsConstructed: false,
              hasInvaderCore: newRoom.invaderCore !== null,
              hasHostileCreeps: false,
              hostileCreepCount: 0,
              hostileTowerCount: newRoom.towers.length
            }
          ]);
        }
      }
    }
  }
  private static updateRoomFromIntel(room: RemoteDirectorStore, index: number): void {
    const intel = Memory.roomStore[room.homeRoomName].remoteRooms[room.roomName];
    const dueIntelUpdate = Game.time % 10 === 0;
    if (dueIntelUpdate && Object.keys(Game.rooms).includes(room.roomName)) {
      const localRoom = Game.rooms[room.roomName];
      // update remoteDirectorStore
      const hostileCreeps = localRoom.find(FIND_HOSTILE_CREEPS);
      const hasInvaderCore =
        localRoom.find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_INVADER_CORE }).length > 0;
      const hostileTowerCount = localRoom.find(FIND_HOSTILE_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_TOWER
      }).length;
      Memory.roomStore[room.homeRoomName].remoteDirector[index] = {
        ...Memory.roomStore[room.homeRoomName].remoteDirector[index],
        hasInvaderCore: hasInvaderCore,
        hostileCreepCount: hostileCreeps.length,
        hasHostileCreeps: hostileCreeps.length > 0,
        hostileTowerCount: hostileTowerCount
      };
      Memory.roomStore[room.homeRoomName].remoteRooms[room.roomName] = {
        ...Memory.roomStore[room.homeRoomName].remoteRooms[room.roomName],
        invaderCore: hasInvaderCore,
        hostileCreepCount: hostileCreeps.length,
        hostileTowerCount: hostileTowerCount
      };
      // update remoteRooms store
    } else if (intel) {
      Memory.roomStore[room.homeRoomName].remoteDirector[index] = {
        ...Memory.roomStore[room.homeRoomName].remoteDirector[index],
        hasInvaderCore: intel.invaderCore,
        hostileCreepCount: intel.hostileCreepCount,
        hasHostileCreeps: intel.hostileCreepCount > 0,
        hostileTowerCount: intel.hostileTowerCount
      };
    }
  }
  public static run(room: Room): void {
    this.addNewRemoteRoom(room);
    const remotes = Memory.roomStore[room.name].remoteDirector;
    remotes.forEach((r, i) => this.updateRoomFromIntel(r, i));
  }
}
