import { CreepUtils } from "rework/utils/creepUtils";
import { PositionsUtils } from "rework/utils/positions";
import { CreepBase } from "roles/role.creep";

export class GlobalScouting {
  private static scoutedRoomNames(): string[] {
    const inhabitedRooms = Object.keys(Memory.roomStore);
    const scoutedRooms = Memory.scoutingDirector.scoutedRooms.map((r) => r.name);
    return [...inhabitedRooms, ...scoutedRooms];
  }
  private static runScouts(): void {
    const inhabitedRooms = Object.keys(Memory.roomStore);
    CreepUtils.filterCreeps("scout").forEach((creep) => {
      if (creep.ticksToLive) {
        const queue = creep.memory.scoutPositions;
        const next = queue[0];
        if (creep.room.name !== creep.memory.homeRoom && !inhabitedRooms.includes(creep.room.name)) {
          // record this room
        }
        switch (true) {
          case PositionsUtils.length === 0: {
            creep.suicide();
            break;
          }
          case creep.room.name === next.roomName: {
            // slice queue, next target
            const sliced = creep.memory.scoutPositions.slice(1);
            creep.memory.scoutPositions = sliced;
            break;
          }
          default: {
            CreepBase.travelTo(creep, next, "blue", 10);
            // detect if stuck
            let lastPos = creep.memory.lastPosition;
            if (lastPos) {
              lastPos = new RoomPosition(lastPos.x, lastPos.y, lastPos.roomName);
              if (lastPos.isEqualTo(creep.pos)) {
                creep.memory.stuckCounter += 1;
              } else {
                creep.memory.lastPosition = creep.pos;
                creep.memory.stuckCounter = 0;
              }
              if (creep.memory.stuckCounter > 10) {
                creep.memory.stuckCounter = 0;
                const sliced = creep.memory.scoutPositions.slice(1);
                creep.memory.scoutPositions = sliced;
              }
            }
          }
        }
      }
    });
  }
  private static updateLists(): void {
    const knownRooms = this.scoutedRoomNames();
    const unscouted = knownRooms
      .reduce((acc: string[], roomName) => acc.concat(Object.values(Game.map.describeExits(roomName))), [])
      .filter((e) => !knownRooms.includes(e))
      .map((e) => new RoomPosition(25, 25, e));
    Memory.scoutingDirector.scoutQueue = unscouted;
  }
  private static getSpawningRoom(): string | undefined {
    return Object.keys(Memory.roomStore).filter((n) => {
      const roomVisible = Object.keys(Game.rooms).includes(n);
      if (!roomVisible) {
        return false;
      }
      const room = Game.rooms[n];
      return room.controller && room.controller.level > 1;
    })[0];
  }
  private static spawnScouts(): void {
    const spawningRoom = this.getSpawningRoom();
    const scouts = CreepUtils.filterCreeps("scout");
    const queuedScouts = CreepUtils.filterAllQueuedCreeps("scout");
    const canSpawnScout = !!spawningRoom && scouts.length + queuedScouts.length === 0;
    if (canSpawnScout) {
      Memory.roomStore[spawningRoom].spawnQueue.push({
        template: [MOVE],
        memory: {
          ...CreepBase.baseMemory,
          role: "scout",
          homeRoom: spawningRoom,
          scoutPositions: Memory.scoutingDirector.scoutQueue
        }
      });
    }
  }
  public static run(): void {
    this.updateLists();
    this.spawnScouts();
    this.runScouts();
    // update settlement data - move to expansion class
  }
}
