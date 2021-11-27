import { CreepUtils } from "rework/utils/creepUtils";
import { UtilPosition } from "utils/util.position";
import { CreepBase } from "roles/role.creep";
export interface CreepRemoteDefenderMemory {
  role: "remoteDefender";
  homeRoom: string;
  targetRoom: string;
}
const defenderTemplate = [TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, ATTACK, ATTACK, ATTACK, MOVE];
export class LocalRoomDefenseDefenders {
  private static runDefender(creep: Creep, anchor: RoomPosition, targetRoom: RemoteDirectorStore | undefined): void {
    if (creep.ticksToLive) {
      switch (true) {
        case !targetRoom:
          CreepBase.travelTo(creep, anchor, "red", 5);
          break;
        case targetRoom && creep.pos.roomName !== targetRoom.roomName:
          if (targetRoom) {
            const roomCenter = new RoomPosition(25, 25, targetRoom.roomName);
            CreepBase.travelTo(creep, roomCenter, "red", 23);
          }
          break;
        case targetRoom && creep.pos.roomName === targetRoom.roomName:
          const target =
            creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS) ||
            creep.room.find<StructureInvaderCore>(FIND_STRUCTURES, {
              filter: (s) => s.structureType === STRUCTURE_INVADER_CORE
            })[0];
          if (target && creep.pos.getRangeTo(target) <= 2) {
            creep.attack(target);
          }
          if (target) {
            CreepBase.travelTo(creep, target, "red", 0);
          }
          break;
      }
    }
  }
  private static spawnDefender(room: Room): void {
    const spawningDefenders = CreepUtils.filterQueuedCreeps(room.name, "remoteDefender", room.name);
    if (room.energyCapacityAvailable >= CreepUtils.getBodyCost(defenderTemplate)) {
      const template = {
        template: defenderTemplate,
        memory: {
          ...CreepBase.baseMemory,
          role: "remoteDefender",
          working: false,
          homeRoom: room.name
        }
      };
      if (spawningDefenders.length === 0) {
        Memory.roomStore[room.name].spawnQueue.push(template);
      } else {
        const index = CreepUtils.findQueuedCreepIndex(room.name, "remoteDefender", room.name);
        if (index >= 0) {
          Memory.roomStore[room.name].spawnQueue[index] = template;
        }
      }
    }
  }
  public static run(room: Room): void {
    const currentDefenders = CreepUtils.filterCreeps("remoteDefender", room.name);
    const remotes = Memory.roomStore[room.name].remoteDirector;
    const remotesToDefend = remotes
      .filter((r) => (r.hostileCreepCount === 1 || r.hasInvaderCore) && r.hostileTowerCount === 0)
      .sort((r) => 5 - r.sources.length);
    if (currentDefenders.length < 1 && remotesToDefend.length > 0) {
      this.spawnDefender(room);
    }
    const targetRoom = remotesToDefend[0];
    if (!!targetRoom) {
      const anchor = UtilPosition.getAnchor(room);
      currentDefenders.forEach((c) => this.runDefender(c, anchor, targetRoom));
    }
  }
}
