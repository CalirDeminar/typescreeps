import { RoomEnergy } from "./energy/roomEnergy";
import { RoomMineral } from "./mineral/roomMineral";
import { RemoteEnergyMemory, remoteRoomEnergyDefault } from "./energy/remote/remoteRoomEnergy";
import { LocalRoomCore } from "./core/localRoomCore";
import { LocalRoomConstruction } from "./construction/localRoomConstruction";
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
export function runRoom(room: Room): void {
  RoomEnergy.run(room);
  RoomMineral.run(room);
  LocalRoomConstruction.run(room);
  LocalRoomCore.run(room);
}
