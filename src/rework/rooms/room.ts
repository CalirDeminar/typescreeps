import { RoomEnergy } from "./energy/roomEnergy";
import { RoomMineral } from "./mineral/roomMineral";
import { RemoteEnergyMemory, remoteRoomEnergyDefault } from "./energy/remote/remoteRoomEnergy";
import { LocalRoomCore } from "./core/localRoomCore";
import {
  ConstructionDirectorStore,
  constructionDirectorDefault,
  LocalRoomConstruction
} from "./construction/localRoomConstruction";
import { DefenceDirectorStore, defenceDirectorStoreDefault, LocalRoomDefense } from "./defense/localRoomDefense";
export interface RoomMemory {
  remoteEnergy: RemoteEnergyMemory[];
  defenceDirector: DefenceDirectorStore;
  constructionDirector: ConstructionDirectorStore;
  nextSpawn: CreepRecipie | null;
  spawnQueue: CreepRecipie[];
  buildingThisTick: boolean;
  helpOtherRoom: boolean;
  visualBuffer: string;
}
export const roomMemoryDefault: RoomMemory = {
  remoteEnergy: remoteRoomEnergyDefault,
  defenceDirector: defenceDirectorStoreDefault,
  constructionDirector: constructionDirectorDefault,
  nextSpawn: null,
  spawnQueue: [],
  buildingThisTick: false,
  helpOtherRoom: false,
  visualBuffer: ""
};
function initMemory(room: Room): void {
  if (!Memory.roomStore) {
    // init roomStore
    Memory.roomStore = {};
  }
  // remove old rooms from the roomStore
  _.map(Memory.roomStore, (r, name) => {
    if (name && !Object.keys(Game.rooms).includes(name)) {
      delete Memory.roomStore[name];
    }
  });
  // initial room init
  if (Memory.roomStore[room.name] === undefined) {
    Memory.roomStore[room.name] = roomMemoryDefault;
    const freshRoom = Object.keys(Game.rooms).length === 1;
    if (freshRoom) {
      Memory.scoutingDirector = { scoutedRooms: [], scoutQueue: [], scanningIndex: 0 };
    }
  }
  // set BuildingThisTick flag
  if (Object.keys(Memory.roomStore).includes(room.name)) {
    Memory.roomStore[room.name] = {
      ...Memory.roomStore[room.name],
      buildingThisTick: room.find(FIND_CONSTRUCTION_SITES).length > 0
    };
  }
}
export function runRoom(room: Room): void {
  if (room.controller && room.controller.my) {
    initMemory(room);
    LocalRoomConstruction.run(room);
    LocalRoomDefense.run(room);
    RoomEnergy.run(room);
    RoomMineral.run(room);
    LocalRoomCore.run(room);
  }
}
