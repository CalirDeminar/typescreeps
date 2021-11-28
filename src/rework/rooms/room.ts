import { RoomEnergy } from "./energy/roomEnergy";
import { RoomMineral } from "./mineral/roomMineral";
import { RemoteEnergyMemory, remoteRoomEnergyDefault } from "./energy/remote/remoteRoomEnergy";
import { LocalRoomCore } from "./core/localRoomCore";
import { LocalRoomConstruction } from "./construction/localRoomConstruction";
import { LocalRoomDefense } from "./defense/localRoomDefense";
export interface RoomMemory {
  remoteEnergy: RemoteEnergyMemory;
  nextSpawn: CreepRecipie | null;
  spawnQueue: CreepRecipie[];
  buildingThisTick: boolean;
  helpOtherRoom: boolean;
}
export const roomMemoryDefault: RoomMemory = {
  remoteEnergy: remoteRoomEnergyDefault,
  nextSpawn: null,
  spawnQueue: [],
  buildingThisTick: false,
  helpOtherRoom: false
};
const baseMemory: RoomType = {
  sources: [],
  minerals: [],
  controllerId: "",
  nextSpawn: null,
  spawnQueue: [],
  buildingThisTick: false,
  remoteRooms: {},
  constructionDirector: {
    internalRoadTemplate: [],
    extensionTemplate: [],
    towerTemplate: [],
    roadsCreated: false,
    singleStructures: [],
    labTemplate: []
  },
  remoteDirector: [],
  defenseDirector: {
    towers: [],
    alertLevel: 0,
    alertStartTimestamp: -1,
    defenders: [],
    rampartMap: [],
    wallMap: [],
    hostileCreeps: [],
    activeTarget: null
  },
  helpOtherRoom: false
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
    Memory.roomStore[room.name] = {
      ...baseMemory,
      sources: room.find(FIND_SOURCES).map((s: Source): string => s.id),
      minerals: room.find(FIND_MINERALS).map((m: Mineral): string => m.id)
    };
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
  initMemory(room);
  LocalRoomConstruction.run(room);
  LocalRoomDefense.run(room);
  RoomEnergy.run(room);
  RoomMineral.run(room);
  LocalRoomCore.run(room);
}
