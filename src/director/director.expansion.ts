import { CreepBase } from "roles/role.creep";
import { helper } from "../../test/integration/helper";
import { ExpansionScouting } from "./scoutingExpansions/expansionScouting";
import { unpackPosList } from "utils/packrat";

export class ExpansionDirector {
  private static memoryInit(): void {
    if (Memory.expansionDirector === undefined) {
      Memory.expansionDirector = {
        discardedRooms: [],
        targetRoom: null,
        controllerId: null,
        newSpawnPosition: null,
        helperRooms: [],
        activeCalcingRoom: undefined,
        validExtensionLocations: undefined,
        validExtensionDistances: undefined,
        validExtensionScratchPad: []
      };
    }
  }
  private static canExpand(): boolean {
    const controllableRoomCount = Game.gcl.level;
    const existingRooms = Object.values(Memory.roomStore);
    const currentRoomCount = existingRooms.length;
    const settleableRoomCount = Memory.scoutingDirector.scoutedRooms.filter(
      (scoutedRoom) => scoutedRoom.settleableTiles.length > 0
    ).length;
    // console.log(`Current Room Count: ${currentRoomCount} - controllable Room Count: ${controllableRoomCount}`);
    return controllableRoomCount > currentRoomCount && settleableRoomCount > 0;
  }
  private static shouldExpand(): boolean {
    const existingRooms = Object.values(Memory.roomStore);
    return existingRooms.every((room) => {
      const controller = Game.getObjectById<StructureController>(room.controllerId);
      if (controller) {
        const hasConstructionSites = controller?.room.find(FIND_CONSTRUCTION_SITES).length > 0;
        return controller.level > 4 && !hasConstructionSites;
      }
      return false;
    });
  }
  private static getNextRoom(): ScoutedRoom | null {
    const existingRooms = Object.values(Memory.roomStore);
    const scoutedRooms = Memory.scoutingDirector.scoutedRooms;

    const existingMinerals = existingRooms.map((room) => {
      const mineral = Game.getObjectById<Mineral>(room.minerals[0]);
      return mineral?.mineralType;
    });
    const existingRemoteRoomNames = existingRooms.reduce(
      (acc: string[], room) => acc.concat(room.remoteDirector.map((remoteRoom) => remoteRoom.roomName)),
      []
    );
    const expansionCandidates = scoutedRooms.filter((room) => room.settleableTiles.length > 0);
    const sortedCandidates = expansionCandidates.sort((a, b) => {
      const aWeighting =
        (a.mineral && existingMinerals.includes(a.mineral.mineralType) ? 2 : 0) +
        (existingRemoteRoomNames.includes(a.name) ? 1 : 0);
      const bWeighting =
        (b.mineral && existingMinerals.includes(b.mineral.mineralType) ? 2 : 0) +
        (existingRemoteRoomNames.includes(b.name) ? 1 : 0);
      return aWeighting - bWeighting;
    });
    return sortedCandidates[0];
  }
  private static spawnClaimer(): void {
    if (
      !!Memory.expansionDirector.targetRoom &&
      Memory.expansionDirector.helperRooms.length > 0 &&
      !(
        Game.rooms[Memory.expansionDirector.targetRoom] &&
        Game.rooms[Memory.expansionDirector.targetRoom].controller !== undefined &&
        Game.rooms[Memory.expansionDirector.targetRoom].controller?.my
      )
    ) {
      const helperRoomName = Memory.expansionDirector.helperRooms[0];
      const helperRoom = Game.rooms[helperRoomName];
      const helperRoomStore = Memory.roomStore[helperRoomName];
      const claimers = _.filter(
        Game.creeps,
        (c) => c.memory.role === "claimer" && c.memory.targetRoom === Memory.expansionDirector.targetRoom
      );
      const claimerQueue = helperRoomStore.spawnQueue.filter(
        (c) => c.memory.role === "claimer" && c.memory.targetRoom === Memory.expansionDirector.targetRoom
      );
      if (helperRoom.energyAvailable > 650 && claimers.length + claimerQueue.length === 0) {
        Memory.roomStore[helperRoomName].spawnQueue.push({
          template: [CLAIM, MOVE],
          memory: {
            ...CreepBase.baseMemory,
            role: "claimer",
            targetRoom: Memory.expansionDirector.targetRoom,
            workTarget: Memory.expansionDirector.controllerId || "",
            homeRoom: helperRoomName
          }
        });
      }
    }
  }
  private static runClaimer(creep: Creep): void {
    if (creep.pos.roomName !== creep.memory.targetRoom) {
      CreepBase.travelTo(creep, new RoomPosition(25, 25, creep.memory.targetRoom), "blue", 20);
    } else {
      const controller = creep.room.controller;
      if (controller) {
        if (creep.pos.isNearTo(controller)) {
          creep.claimController(controller);
        } else {
          CreepBase.travelTo(creep, controller.pos, "blue");
        }
        if (controller.my) {
          creep.suicide();
        }
      }
    }
  }
  private static runClaimers(): void {
    if (!!Memory.expansionDirector.targetRoom && Memory.expansionDirector.helperRooms.length > 0) {
      const helperRoomName = Memory.expansionDirector.helperRooms[0];
      _.filter(
        Game.creeps,
        (c) =>
          c.memory.role === "claimer" &&
          c.memory.homeRoom === helperRoomName &&
          c.memory.targetRoom === Memory.expansionDirector.targetRoom
      ).map((c) => this.runClaimer(c));
    }
  }
  private static placeNewSpawn() {
    const stalePos = Memory.expansionDirector.newSpawnPosition;
    if (stalePos && Object.keys(Game.rooms).includes(stalePos.roomName)) {
      const pos = new RoomPosition(stalePos.x, stalePos.y, stalePos.roomName);
      const room = Game.rooms[pos.roomName];
      const spawns = room.find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_SPAWN });
      const constructionSites = room.find(FIND_CONSTRUCTION_SITES, {
        filter: (s) => s.structureType === STRUCTURE_SPAWN
      });
      if (spawns.length === 0 && constructionSites.length === 0) {
        pos.createConstructionSite(STRUCTURE_SPAWN);
        room.createFlag(pos.x, pos.y - 1, `${room.name}-Anchor`);
      }
    }
  }
  private static chooseRoom(): void {
    if (this.shouldExpand() && this.canExpand() && !Memory.expansionDirector.targetRoom) {
      const expansionRoom = this.getNextRoom();
      if (expansionRoom) {
        const possibleTiles = unpackPosList(expansionRoom.settleableTiles);
        const middleIndex = Math.floor(possibleTiles.length / 2);
        const spawnPos = possibleTiles[middleIndex];
        const controllerId = expansionRoom.controller?.id;
        if (spawnPos && controllerId) {
          Memory.expansionDirector = {
            ...Memory.expansionDirector,
            targetRoom: expansionRoom.name,
            controllerId: expansionRoom.controller?.id || "",
            newSpawnPosition: spawnPos,
            helperRooms: Object.keys(Memory.roomStore).sort((a, b) => {
              const aRoute = Game.map.findRoute(a, expansionRoom.name);
              const bRoute = Game.map.findRoute(b, expansionRoom.name);
              if (aRoute !== -2 && bRoute !== -2) {
                return aRoute.length - bRoute.length;
              }
              return 0;
            })
          };
        }
      }
    }
  }
  public static run(): void {
    this.memoryInit();
    if (Memory.roomStore && Memory.expansionDirector) {
      this.chooseRoom();
      this.spawnClaimer();
      this.runClaimers();
      this.placeNewSpawn();
    }
    // possibly do this check a few sequential times to ensure this is really the state of the colony
    // console.log(`Should Expand: ${this.shouldExpand()} - Can Expand: ${this.canExpand()}`);
  }
}
