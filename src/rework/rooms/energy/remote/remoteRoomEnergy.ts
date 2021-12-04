import path from "path";
import { CreepUtils } from "rework/utils/creepUtils";
import { RemoteRoomEnergyConstruction } from "./remoteRoomEnergyConstruction";
import { RemoteRoomEnergyHarvester } from "./remoteRoomEnergyHarvester";
import { RemoteRoomEnergyHauler } from "./remoteRoomEnergyHauler";
import { RemoteRoomEnergyIntel } from "./remoteRoomEnergyIntel";
import { RemoteRoomEnergyReservation } from "./remoteRoomEnergyReservation";

export interface RemoteEnergyMemory {
  roomName: string;
  homeRoomName: string;
  controllerId: string;
  anchorId: string;
  sources: {
    sourceId: string;
    targetContainerId: string | null;
    path?: string;
  }[];
  roadQueue: RoomPosition[];
  roadsPathed: boolean;
  roadsConstructed: boolean;
  hasInvaderCore: boolean;
  hasHostileCreeps: boolean;
  hostileCreepCount: number;
  hostileTowerCount: number;
}
export const remoteRoomEnergyDefault: RemoteEnergyMemory[] = [];
export class RemoteRoomEnergy {
  private static runRoom(room: RemoteEnergyMemory, index: number): void {
    const remRoomVisible = Object.keys(Game.rooms).includes(room.roomName);
    const remRoom = remRoomVisible ? Game.rooms[room.roomName] : null;
    const anchor = Game.flags[room.anchorId];
    const harvesters = CreepUtils.filterCreeps("remoteHarvester", room.homeRoomName, room.roomName);
    const haulers = CreepUtils.filterCreeps("remoteHauler", room.homeRoomName, room.roomName);
    const constructionSite = remRoom
      ? remRoom
          .find(FIND_CONSTRUCTION_SITES)
          .sort((a, b) => a.progressTotal - a.progress - (b.progressTotal - b.progress))[0]
      : null;
    RemoteRoomEnergyConstruction.run(room, index);
    RemoteRoomEnergyReservation.run(room);
    RemoteRoomEnergyHarvester.spawn(room, index);
    RemoteRoomEnergyHauler.spawn(room, index);
    harvesters.forEach((c) => RemoteRoomEnergyHarvester.run(c, room, anchor, constructionSite));
    haulers.forEach((c) => RemoteRoomEnergyHauler.run(c, anchor));
  }
  public static run(room: Room): void {
    RemoteRoomEnergyIntel.run(room);
    Memory.roomStore[room.name].remoteEnergy.forEach((r, i) => this.runRoom(r, i));
  }
}
