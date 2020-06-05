import { ConstructionManager } from "./manager.construction";
import { SourceManager } from "./manager.source";
import { CreepBuilder } from "../utils/creepBuilder";
export class RoomManager {
  private static memorySetup(room: Room) {
    if (!Memory.roomStore) {
      Memory.roomStore = {};
    }
    if (Memory.roomStore[room.name] === undefined) {
      Memory.roomStore[room.name] = {
        sources: room.find(FIND_SOURCES).map((s: Source): string => s.id),
        minerals: room.find(FIND_MINERALS).map((m: Mineral): string => m.id),
        controllerId: room.controller ? room.controller.id : "",
        nextSpawn: null
      };
    }
  }
  private static sumRoomRole(role: string, roomName: string): number {
    let count = 0;
    for (const key in Game.creeps) {
      const creep = Game.creeps[key];
      if (creep.memory.role === role && creep.memory.homeRoom === roomName) {
        count++;
      }
    }
    return count;
  }
  private static ManageUpgraders(room: Room) {
    const upgraderCount = 2;
    if (this.sumRoomRole("upgrader", room.name) < upgraderCount && room.controller && room.controller.my) {
      Memory.roomStore[room.name].nextSpawn = {
        template: CreepBuilder.buildShuttleCreep(room.energyCapacityAvailable),
        memory: {
          role: "upgrader",
          working: false,
          born: Game.time,
          targetSource: "",
          homeRoom: room.name,
          targetRoom: room.name,
          workTarget: room.controller.id,
          refuelTarget: "",
          dropOffTarget: "",
          targetStore: ""
        }
      };
    }
  }
  public static run(room: Room): void {
    if (room.controller && room.controller.my) {
      this.memorySetup(room);
      ConstructionManager.run(room);
      this.ManageUpgraders(room);
      SourceManager.run(room);
      const toSpawn = Memory.roomStore[room.name].nextSpawn;
      if (toSpawn != null) {
        const mainSpawn = room.find(FIND_MY_SPAWNS)[0];
        if (mainSpawn != null) {
          mainSpawn.createCreep(toSpawn.template, undefined, toSpawn.memory);
          Memory.roomStore[room.name].nextSpawn = null;
        }
      }
    }
  }
}
