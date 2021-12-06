import { CreepUtils } from "rework/utils/creepUtils";
import { UtilPosition } from "utils/util.position";
import { CreepBase } from "roles/role.creep";
import { RemoteEnergyMemory } from "../energy/remote/remoteRoomEnergy";
import { RoomUtils } from "rework/utils/roomUtils";
export interface CreepRemoteDefenderMemory {
  role: "remoteDefender";
  homeRoom: string;
  targetRoom: string;
}
const defenderTemplate = [TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, ATTACK, ATTACK, ATTACK, MOVE];
export class LocalRoomDefenseDefenders {
  private static runDefender(creep: Creep, anchor: RoomPosition, targetRoom: RemoteEnergyMemory | undefined): void {
    if (creep.ticksToLive) {
      const startCpu = Game.cpu.getUsed();
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
          const targetCore = creep.room.find<StructureInvaderCore>(FIND_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_INVADER_CORE
          })[0];
          const targetCreep = targetCore ? undefined : creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS);
          const target = targetCreep || targetCore;
          if (target && creep.pos.getRangeTo(target) <= 2) {
            creep.attack(target);
          }
          if (target && (creep.pos.getRangeTo(target) > 1 || targetCreep)) {
            CreepBase.travelTo(creep, target, "red", 0);
          }
          break;
      }
      const endCpu = Game.cpu.getUsed();
      CreepUtils.recordCreepPerformance(creep, endCpu - startCpu);
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
    const startCpu = Game.cpu.getUsed();
    const currentDefenders = CreepUtils.filterCreeps("remoteDefender", room.name);
    const remotes = Memory.roomStore[room.name].remoteEnergy;
    const remotesToDefend = remotes.filter(
      (r) => (r.hostileCreepCount === 1 || r.hasInvaderCore) && r.hostileTowerCount === 0
    );
    if (currentDefenders.length < 1 && remotesToDefend.length > 0) {
      this.spawnDefender(room);
    }
    const targetRoom = remotesToDefend[0];
    if (!!targetRoom) {
      const anchor = UtilPosition.getAnchor(room);
      const usedCpu = Game.cpu.getUsed() - startCpu;
      RoomUtils.recordFilePerformance(room.name, "roomDefenceDefenders", usedCpu);
      currentDefenders.forEach((c) => this.runDefender(c, anchor, targetRoom));
    } else {
      const usedCpu = Game.cpu.getUsed() - startCpu;
      RoomUtils.recordFilePerformance(room.name, "roomDefenceDefenders", usedCpu);
    }
  }
}
