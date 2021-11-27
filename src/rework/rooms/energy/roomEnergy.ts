import { LocalRoomEnergy } from "./local/localRoomEnergy";
import { RemoteRoomEnergy } from "./remote/remoteRoomEnergy";
export class RoomEnergy {
  public static run(room: Room): void {
    LocalRoomEnergy.run(room);
    RemoteRoomEnergy.run(room);
  }
}
