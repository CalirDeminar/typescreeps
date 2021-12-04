import { initial } from "lodash";
import { PositionsUtils } from "rework/utils/positions";
import { Constants } from "utils/constants";
import { packPosList } from "utils/packrat";
import { RemoteEnergyMemory } from "./remoteRoomEnergy";

export class RemoteRoomEnergyIntel {
  private static addNewRemoteRoom(room: Room): void {
    const borders = PositionsUtils.getRoomNeighbors(room);
    const store = Memory.roomStore[room.name].remoteEnergy;
    const intel = Memory.scoutingDirector.scoutedRooms.filter(
      (r) => r.towers.length === 0 && r.keeperLair.length === 0 && borders.includes(r.name)
    );
    const scoutedRoomNames = intel.map((r) => r.name);
    const currentRemotes = Object.values(Memory.roomStore).reduce(
      (acc: string[], s) => acc.concat(s.remoteEnergy.map((rd) => rd.roomName)),
      []
    );
    const assessmentInterval = Game.time + (Constants.remoteHarvestingTimingOffset % 100) === 0;
    const initialAssesment =
      store.length === 0 || borders.some((b) => b && scoutedRoomNames.includes(b) && !currentRemotes.includes(b));
    if (assessmentInterval || initialAssesment) {
      const availableDoubleSourceRooms = intel
        .filter((r) => r.sources.length === 2 && !currentRemotes.includes(r.name))
        .sort(() => Math.random() - 0.5);
      const availableSingleSourceRooms = intel
        .filter((r) => r.sources.length === 1 && !currentRemotes.includes(r.name))
        .sort(() => Math.random() - 0.5);
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
          const sources = newRoom.sources.map((s) => {
            return {
              sourceId: s.id,
              targetContainerId: null,
              path: packPosList([])
            };
          });
          Memory.roomStore[room.name].remoteEnergy = store.concat([
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
  private static updateRoomFromIntel(room: RemoteEnergyMemory, index: number): void {
    const intelIndex = Memory.scoutingDirector.scoutedRooms.findIndex((r) => r.name === room.roomName);
    const intel = Memory.scoutingDirector.scoutedRooms[intelIndex];
    const dueIntelUpdate = Game.time % 10 === 0;
    if (dueIntelUpdate && Object.keys(Game.rooms).includes(room.roomName)) {
      const localRoom = Game.rooms[room.roomName];
      // update remoteDirectorStore
      const hostileCreeps = localRoom.find(FIND_HOSTILE_CREEPS);
      const invaderCore = localRoom.find(FIND_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_INVADER_CORE
      })[0];
      const hasInvaderCore = !!invaderCore;
      const towers = localRoom.find(FIND_HOSTILE_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_TOWER
      });
      const hostileTowerCount = towers.length;
      Memory.roomStore[room.homeRoomName].remoteEnergy[index] = {
        ...Memory.roomStore[room.homeRoomName].remoteEnergy[index],
        hasInvaderCore: hasInvaderCore,
        hostileCreepCount: hostileCreeps.length,
        hasHostileCreeps: hostileCreeps.length > 0,
        hostileTowerCount: hostileTowerCount
      };
      Memory.scoutingDirector.scoutedRooms[intelIndex] = {
        ...Memory.scoutingDirector.scoutedRooms[intelIndex],
        invaderCore: hasInvaderCore ? { id: invaderCore.id, pos: invaderCore.pos } : null,
        towers: towers.map((t) => ({ id: t.id, pos: t.pos }))
      };
      // update remoteRooms store
    }
  }
  public static run(room: Room): void {
    this.addNewRemoteRoom(room);
    const remotes = Memory.roomStore[room.name].remoteEnergy;
    remotes.forEach((r, i) => this.updateRoomFromIntel(r, i));
  }
}
