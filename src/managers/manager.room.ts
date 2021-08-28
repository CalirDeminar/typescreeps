import { ConstructionDirector } from "director/director.construction";
import { MineralDirector } from "director/director.mineral";
import { SourceManager } from "./manager.source";
import { DefenseManager } from "./manager.defense";
import { RemoteManager } from "./manager.remote";
import { CreepBuilder } from "../utils/creepBuilder";
import { Constants } from "utils/constants";
import { CreepBase } from "roles/role.creep";
const maxUpgraders = Constants.upgraders;
export class RoomManager {
  public static baseMemory: RoomType = {
    sources: [],
    minerals: [],
    controllerId: "",
    nextSpawn: null,
    remoteRooms: {},
    sourceDirector: [],
    constructionDirector: {
      anchor: null,
      anchorContainer: null,
      containerTemplate: [],
      internalRoadTemplate: [],
      routeRoadTemplate: [],
      extensionTemplate: [],
      remoteTemplate: [],
      storage: null,
      terminal: null,
      extractor: null,
      baseTemplate: [],
      towerTemplate: [],
      anchorLink: null,
      sourceLinks: []
    }
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
        remoteRooms: {},
        sourceDirector: [],
        constructionDirector: {
          anchor: null,
          anchorContainer: null,
          containerTemplate: [],
          internalRoadTemplate: [],
          routeRoadTemplate: [],
          extensionTemplate: [],
          remoteTemplate: [],
          storage: null,
          terminal: null,
          extractor: null,
          baseTemplate: [],
          towerTemplate: [],
          anchorLink: null,
          sourceLinks: []
        }
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
    const anchor: Flag | null = room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0];
    if (anchor) {
      const centralContainer = anchor.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 1, {
        filter: (s) => s.structureType === STRUCTURE_CONTAINER
      })[0];
      if (centralContainer && centralContainer.store.getUsedCapacity() > 0) {
        const activeQueens = _.filter(Game.creeps, (c) => c.memory.role === "queen");
        if (
          activeQueens.length < 1 ||
          (activeQueens.length === 1 && activeQueens[0].ticksToLive && activeQueens[0].ticksToLive < 100)
        ) {
          const energy = 500;
          Memory.roomStore[room.name].nextSpawn = {
            template: CreepBuilder.buildHaulingCreep(Math.min(room.energyAvailable, energy)),
            memory: {
              ...CreepBase.baseMemory,
              role: "queen",
              working: false,
              born: Game.time,
              homeRoom: room.name,
              targetRoom: room.name
            }
          };
        }
      }
    }
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
    const count = this.sumRoomRole("builder", room.name);
    // RHS of "or" statement spawns builders on demand, as energy allows
    //    If energy is low, stores should never fill, so won't waste energy on building or upgrading.
    if (
      energyFull &&
      Memory.roomStore[room.name].nextSpawn === null &&
      !towersNeedEnergy &&
      count < Constants.builders
    ) {
      Memory.roomStore[room.name].nextSpawn = {
        template: CreepBuilder.buildScaledBalanced(Math.min(room.energyCapacityAvailable, 1000)),
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
      ConstructionDirector.run(room);
      MineralDirector.run(room);
      RemoteManager.run(room);
      this.ManageBuilders(room);
      this.ManageUpgraders(room);
      SourceManager.run(room);
      DefenseManager.run(room);
      this.ManageHaulers(room);
      const toSpawn = Memory.roomStore[room.name].nextSpawn;
      if (toSpawn != null) {
        const mainSpawn = room.find(FIND_MY_SPAWNS)[0];
        if (mainSpawn != null) {
          const resp = mainSpawn.spawnCreep(toSpawn.template, `${toSpawn.memory.role}-${Game.time}`, {
            memory: toSpawn.memory
          });
          if (resp === OK) {
            Memory.roomStore[room.name].nextSpawn = null;
          }
        }
      }
    }
  }
}
