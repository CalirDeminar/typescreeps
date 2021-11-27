import { PositionsUtils } from "rework/utils/positions";
import { LocalRoomCoreBuilder } from "./localRoomCoreBuilder";
import { LocalRoomCoreControllerHauler } from "./localRoomCoreControllerHauler";
import { LocalRoomCoreLinkHauler } from "./localRoomCoreLinkHauler";
import { LocalRoomCoreQueen } from "./localRoomCoreQueen";
import { LocalRoomCoreSpawning } from "./localRoomCoreSpawning";
import { LocalRoomCoreUpgrader } from "./localRoomCoreUpgrader";

export class LocalRoomCore {
  public static run(room: Room): void {
    const anchor = PositionsUtils.getAnchor(room);
    if (anchor) {
      LocalRoomCoreQueen.run(room);
      LocalRoomCoreBuilder.run(room);
      LocalRoomCoreLinkHauler.run(room);
      LocalRoomCoreUpgrader.run(room);
      LocalRoomCoreControllerHauler.run(room);
      LocalRoomCoreSpawning.run(room);
    }
  }
}
