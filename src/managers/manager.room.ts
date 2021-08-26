import { ConstructionManager } from "./manager.construction";
import { SourceManager } from "./manager.source";
import { DefenseManager } from "./manager.defense";
import { RemoteManager } from "./manager.remote";
import { CreepBuilder } from "../utils/creepBuilder";
import { Constants } from "utils/constants";
import { CreepBase } from "roles/role.creep";
const maxBuilders = Constants.builders;
const maxUpgraders = Constants.upgraders;
export class RoomManager {
  public static baseMemory: RoomType = {
    sources: [],
    minerals: [],
    controllerId: "",
    nextSpawn: null,
    remoteRooms: {}
  };
  private static memorySetup(room: Room) {
    if (!Memory.roomStore) {
      console.log("Initialising roomStore");
      Memory.roomStore = {};
    }
    const currentRooms = Object.keys(Game.rooms);
    _.map(Object.keys(Memory.roomStore), (roomKey) => {
      if (!currentRooms.includes(roomKey)) {
        delete Memory.roomStore[roomKey];
      }
    });
    if (Memory.roomStore[room.name] === undefined) {
      console.log(`Initialising roomStore for ${room.name}`);
      Memory.roomStore[room.name] = {
        sources: room.find(FIND_SOURCES).map((s: Source): string => s.id),
        minerals: room.find(FIND_MINERALS).map((m: Mineral): string => m.id),
        controllerId: room.controller ? room.controller.id : "",
        nextSpawn: null,
        remoteRooms: {}
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
    if (this.sumRoomRole("upgrader", room.name) < maxUpgraders && room.controller && room.controller.my) {
      Memory.roomStore[room.name].nextSpawn = {
        template: CreepBuilder.buildScaledBalanced(Math.min(room.energyCapacityAvailable, 400)),
        memory: {
          ...CreepBase.baseMemory,
          role: "upgrader",
          working: false,
          born: Game.time,
          homeRoom: room.name,
          targetRoom: room.name,
          upgradeTarget: room.controller.id
        }
      };
    }
  }
  private static ManageHaulers(room: Room) {
    room.find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_CONTAINER }).map((container) => {
      const haulers = _.filter(
        Game.creeps,
        (c: Creep) => c.memory.role === "hauler" && c.memory.targetSource === container.id
      );
      const haulerNearDeath =
        haulers.length <= Constants.maxHaulers &&
        _.filter(haulers, (h) => h.ticksToLive && h.ticksToLive < 125).length > 0;
      if (Memory.roomStore[room.name].nextSpawn != null && (haulers.length < Constants.maxHaulers || haulerNearDeath)) {
        Memory.roomStore[room.name].nextSpawn = {
          template: CreepBuilder.buildHaulingCreep(Math.min(room.energyCapacityAvailable, 750)),
          memory: {
            ...CreepBase.baseMemory,
            role: "hauler",
            working: false,
            born: Game.time,
            targetSource: container.id,
            targetSourcePos: container.pos,
            homeRoom: room.name,
            targetRoom: room.name
          }
        };
      }
    });
  }
  private static ManageBuilders(room: Room) {
    const energyFull = room.energyCapacityAvailable - room.energyAvailable === 0;
    //const creepNearDeath = _.filter(Game.creeps, (c: Creep) => c.ticksToLive && c.ticksToLive < 100 && c.memory.role !== "builder").length > 0;
    const towersNeedEnergy =
      _.filter(
        room.find(FIND_MY_STRUCTURES, {
          filter: (s) => {
            return s.structureType === STRUCTURE_TOWER && s.store[RESOURCE_ENERGY] <= 500;
          }
        })
      ).length > 0;
    const builderCountLow =
      this.sumRoomRole("builder", room.name) < maxBuilders && room.controller && room.controller.my;
    // RHS of "or" statement spawns builders on demand, as energy allows
    //    If energy is low, stores should never fill, so won't waste energy on building or upgrading.
    if (builderCountLow || (energyFull && Memory.roomStore[room.name].nextSpawn === null && !towersNeedEnergy)) {
      Memory.roomStore[room.name].nextSpawn = {
        template: CreepBuilder.buildScaledBalanced(room.energyCapacityAvailable),
        memory: {
          ...CreepBase.baseMemory,
          role: "builder",
          working: false,
          born: Game.time,
          homeRoom: room.name,
          targetRoom: room.name
        }
      };
    }
  }
  public static run(room: Room): void {
    if (room.controller && room.controller.my) {
      this.memorySetup(room);
      ConstructionManager.run2(room);
      this.ManageBuilders(room);
      this.ManageUpgraders(room);
      this.ManageHaulers(room);
      SourceManager.run(room);
      DefenseManager.run(room);
      RemoteManager.run(room);
      const toSpawn = Memory.roomStore[room.name].nextSpawn;
      if (toSpawn != null) {
        const mainSpawn = room.find(FIND_MY_SPAWNS)[0];
        if (mainSpawn != null) {
          const resp = mainSpawn.spawnCreep(toSpawn.template, `${toSpawn.memory.role}-${Game.time}`, {
            memory: toSpawn.memory
          });
          if (resp === OK) {
            console.log("Nulling Nextspawn");
            Memory.roomStore[room.name].nextSpawn = null;
          }
        }
      }
    }
  }
}
