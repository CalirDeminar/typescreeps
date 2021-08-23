import { ConstructionManager } from "./manager.construction";
import { SourceManager } from "./manager.source";
import { DefenseManager } from "./manager.defense";
import { CreepBuilder } from "../utils/creepBuilder";
import { Constants } from "utils/constants";
const maxBuilders = Constants.builders;
const maxUpgraders = Constants.upgraders;
export class RoomManager {
  private static memorySetup(room: Room) {
    if (!Memory.roomStore) {
      console.log("Initialising roomStore");
      Memory.roomStore = {};
    }
    if (Memory.roomStore[room.name] === undefined) {
      console.log(`Initialising roomStore for ${room.name}`);
      Memory.roomStore[room.name] = {
        sources: room.find(FIND_SOURCES).map((s: Source): string => s.id),
        minerals: room.find(FIND_MINERALS).map((m: Mineral): string => m.id),
        controllerId: room.controller ? room.controller.id : "",
        nextSpawn: null,
        sourceRoadsQueued: false,
        buildQueue: {}
      };
    }
  }
  private static memoryCleanup(room: Room): void {
    const constIds: string[] = room.find(FIND_CONSTRUCTION_SITES).map((c: ConstructionSite) => c.id);
    for (const id in Memory.roomStore[room.name].buildQueue) {
      if (!constIds.includes(id)) {
        delete Memory.roomStore[room.name].buildQueue[id];
      }
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
    if (this.sumRoomRole("upgrader", room.name) < maxUpgraders && room.controller && room.controller.my) {
      Memory.roomStore[room.name].nextSpawn = {
        template: CreepBuilder.buildShuttleCreep(room.energyCapacityAvailable),
        memory: {
          role: "upgrader",
          working: false,
          born: Game.time,
          targetSource: "",
          homeRoom: room.name,
          targetRoom: room.name,
          workTarget: "",
          upgradeTarget: room.controller.id,
          refuelTarget: "",
          dropOffTarget: "",
          targetStore: ""
        }
      };
    }
  }
  private static ManageBuilders(room: Room) {
    if (this.sumRoomRole("builder", room.name) < maxBuilders && room.controller && room.controller.my && room.controller.level > 1) {
      Memory.roomStore[room.name].nextSpawn = {
        template: CreepBuilder.buildShuttleCreep(room.energyCapacityAvailable),
        memory: {
          role: "builder",
          working: false,
          born: Game.time,
          targetSource: "",
          homeRoom: room.name,
          targetRoom: room.name,
          workTarget: "",
          upgradeTarget: "",
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
      this.memoryCleanup(room);
      ConstructionManager.run2(room);
      this.ManageBuilders(room);
      this.ManageUpgraders(room);
      SourceManager.run(room);
      DefenseManager.run(room);
      const toSpawn = Memory.roomStore[room.name].nextSpawn;
      if (toSpawn != null) {
        const mainSpawn = room.find(FIND_MY_SPAWNS)[0];
        if (mainSpawn != null) {
          const resp = mainSpawn.spawnCreep(toSpawn.template, `${toSpawn.memory.role}-${Game.time}`, {memory: toSpawn.memory});
          if (resp === OK) {
            console.log("Nulling Nextspawn")
            Memory.roomStore[room.name].nextSpawn = null;
          }
        }
      }
    }
  }
}
