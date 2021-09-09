import { CreepBase } from "roles/role.creep";
import { helper } from "../../test/integration/helper";
import { ExpansionScouting } from "./scoutingExpansions/expansionScouting";

export class ExpansionDirector {
  private static memoryInit(): void {
    if (!Memory.expansionDirector) {
      Memory.expansionDirector = {
        targetRoom: null,
        controllerId: null,
        newSpawnPosition: null,
        helperRooms: []
      };
    }
  }
  private static canExpand(): boolean {
    const controllableRoomCount = Game.gcl.level;
    const existingRooms = Object.values(Memory.roomStore);
    const currentRoomCount = existingRooms.length;
    const settleableRoomCount = existingRooms.reduce((acc: number, room) => {
      return acc + room.scoutingDirector.scoutedRooms.filter((scoutedRoom) => scoutedRoom.settleable).length;
    }, 0);
    // console.log(`Current Room Count: ${currentRoomCount} - controllable Room Count: ${controllableRoomCount}`);
    return controllableRoomCount > currentRoomCount && settleableRoomCount > 0;
  }
  private static shouldExpand(): boolean {
    const existingRooms = Object.values(Memory.roomStore);
    return existingRooms.every((room) => {
      const controller = Game.getObjectById<StructureController>(room.controllerId);
      if (controller) {
        const hasConstructionSites = controller?.room.find(FIND_CONSTRUCTION_SITES).length > 0;
        return controller.level > 5 && !hasConstructionSites;
      }
      return false;
    });
  }
  private static getNextRoom(): ScoutedRoom | null {
    const existingRooms = Object.values(Memory.roomStore);
    const scoutedRooms = existingRooms.reduce(
      (acc: ScoutedRoom[], room) => acc.concat(room.scoutingDirector.scoutedRooms),
      []
    );
    const existingMinerals = existingRooms.map((room) => {
      const mineral = Game.getObjectById<Mineral>(room.minerals[0]);
      return mineral?.mineralType;
    });
    const existingRemoteRoomNames = existingRooms.reduce(
      (acc: string[], room) => acc.concat(room.scoutingDirector.scoutedRooms.map((scoutedRoom) => scoutedRoom.name)),
      []
    );
    const expansionCandidates = scoutedRooms.filter((room) => room.settleable);
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
        Game.rooms[Memory.expansionDirector.targetRoom].controller! &&
        Game.rooms[Memory.expansionDirector.targetRoom].controller!.my
      )
    ) {
      const helperRoomName = Memory.expansionDirector.helperRooms[0];
      const helperRoom = Game.rooms[helperRoomName];
      const helperRoomStore = Memory.roomStore[helperRoomName];
      const claimers = _.filter(
        Game.creeps,
        (c) => c.memory.role === "claimer" && c.memory.targetRoom === Memory.expansionDirector.targetRoom
      );
      if (helperRoomStore.nextSpawn === null && helperRoom.energyAvailable > 650 && claimers.length === 0) {
        Memory.roomStore[helperRoomName].nextSpawn = {
          template: [CLAIM, MOVE],
          memory: {
            ...CreepBase.baseMemory,
            role: "claimer",
            targetRoom: Memory.expansionDirector.targetRoom,
            workTarget: Memory.expansionDirector.controllerId || "",
            homeRoom: helperRoomName
          }
        };
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
      }
    }
  }
  private static chooseRoom(): void {
    if (this.shouldExpand() && this.canExpand() && !Memory.expansionDirector.targetRoom) {
      const expansionRoom = this.getNextRoom();
      if (expansionRoom) {
        const spawnPos = ExpansionScouting.getExpansionRoomSpawnPos(expansionRoom);
        const controllerId = expansionRoom.controller?.id;
        if (spawnPos && controllerId) {
          Memory.expansionDirector = {
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
    if (Memory.roomStore && Memory.expansionDirector) {
      this.memoryInit();
      this.chooseRoom();
      this.spawnClaimer();
      this.runClaimers();
      this.placeNewSpawn();
    }
    // possibly do this check a few sequential times to ensure this is really the state of the colony
    // console.log(`Should Expand: ${this.shouldExpand()} - Can Expand: ${this.canExpand()}`);
  }
}
