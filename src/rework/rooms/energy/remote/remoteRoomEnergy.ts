export interface RemoteEnergyMemory {
  remotes: {
    roomName: string;
    homeRoomName: string;
    controllerId: string;
    sourceIds: string[];
    roadQueue: RoomPosition[];
    roadsPathed: boolean;
    roadsConstructed: boolean;
    hasInvaderCore: boolean;
    hasHostileCreeps: boolean;
    hostileCreepCount: number;
    hostileTowerCount: number;
  }[];
}
export const remoteRoomEnergyDefault: RemoteEnergyMemory = {
  remotes: []
};
export class RemoteRoomEnergy {
  public static run(room: Room): void {}
}
