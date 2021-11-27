import { CreepBuilder } from "utils/creepBuilder";
import { CreepBase } from "roles/role.creep";
import { CreepUtils } from "rework/utils/creepUtils";

export class RemoteRoomEnergyHauler {
  private static getStoreTarget(creep: Creep): Structure | null {
    return (
      creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (s: AnyStructure) => s.structureType === STRUCTURE_STORAGE
      }) ||
      creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (s: AnyStructure) =>
          s.structureType === STRUCTURE_CONTAINER &&
          s.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
          s.pos.findInRange(FIND_FLAGS, 1).length > 0
      }) ||
      creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (s: AnyStructure) => s.structureType === STRUCTURE_SPAWN && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
      }) ||
      creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (s: AnyStructure) =>
          s.structureType === STRUCTURE_EXTENSION && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
      })
    );
  }
  public static spawn(room: RemoteDirectorStore, index: number): void {
    const homeRoom = Game.rooms[room.homeRoomName];
    const energyBudget =
      room.sources.length > 1
        ? Math.min(homeRoom.energyCapacityAvailable, 2500)
        : Math.min(homeRoom.energyCapacityAvailable, 1500);
    const sources = room.sources;
    const hostile = room.hostileCreepCount > 0 || room.hostileTowerCount > 0 || room.hasInvaderCore;
    if (hostile) {
      return;
    }
    sources.forEach((s) => {
      const source = Game.getObjectById<Source>(s.sourceId);
      if (!source) {
        return;
      }
      const container = source.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 1, {
        filter: (s) => s.structureType === STRUCTURE_CONTAINER
      })[0];
      if (!container) {
        return;
      }
      const haulers = CreepUtils.filterCreeps("remoteHauler", room.homeRoomName, room.roomName, container.id);
      const queuedHaulers = CreepUtils.filterQueuedCreeps(
        room.homeRoomName,
        "remoteHauler",
        room.homeRoomName,
        room.roomName,
        container.id
      );
      const needsHauler = haulers.length + queuedHaulers.length === 0;
      const haulerNearDeath =
        queuedHaulers.length === 0 && haulers[0] && haulers[0].ticksToLive && haulers[0].ticksToLive < 100;
      if (needsHauler || haulerNearDeath) {
        const template = {
          template: CreepBuilder.createRemoteCreeps(energyBudget).hauler,
          memory: {
            ...CreepBase.baseMemory,
            homeRoom: homeRoom.name,
            targetRoom: room.roomName,
            targetSource: container.id,
            role: "remoteHauler",
            working: true
          }
        };
        const index = CreepUtils.findQueuedCreepIndex(
          room.homeRoomName,
          "remoteHauler",
          room.homeRoomName,
          room.roomName,
          container.id
        );
        if (index >= 0) {
          Memory.roomStore[homeRoom.name].spawnQueue[index] = template;
        } else {
          Memory.roomStore[homeRoom.name].spawnQueue.push(template);
        }
      }
    });
  }
  public static run(creep: Creep, anchor: Flag): void {
    if (creep.ticksToLive && !CreepBase.fleeHostiles(creep)) {
      let withdrawing = creep.memory.working;
      const container = Game.getObjectById<StructureContainer>(creep.memory.targetSource);
      const empty = creep.store.getUsedCapacity() === 0;
      const full = creep.store.getFreeCapacity() === 0;
      const nearDeath = creep.ticksToLive < 100;
      switch (true) {
        case withdrawing && container && container.store.getUsedCapacity() === 0:
        case !withdrawing && empty && creep.ticksToLive > 100:
          creep.memory.working = true;
          break;
        case withdrawing && full:
          creep.memory.working = false;
          creep.memory.dropOffTarget = "";
      }
      withdrawing = creep.memory.working;
      const remRoom = Memory.roomStore[creep.memory.homeRoom].remoteDirector.find(
        (r) => r.roomName === creep.memory.targetRoom
      );
      const targetRoomHostile = remRoom ? remRoom.hostileCreepCount > 0 : false;
      switch (true) {
        case targetRoomHostile:
          CreepBase.travelTo(creep, anchor, "orange", 5);
          break;
        case withdrawing && creep.room.name !== creep.memory.targetRoom:
          // move to target room
          CreepBase.travelTo(creep, new RoomPosition(25, 25, creep.memory.targetRoom), "black", 20);
          break;
        case withdrawing && creep.room.name === creep.memory.targetRoom:
          if (
            container &&
            creep.pos.isNearTo(container) &&
            !nearDeath &&
            container.store.getUsedCapacity() >= creep.store.getFreeCapacity()
          ) {
            creep.withdraw(container, RESOURCE_ENERGY);
          } else if (container) {
            CreepBase.travelTo(creep, container, "black", 1);
          }
          break;
        case !withdrawing && creep.room.name !== creep.memory.homeRoom:
          CreepBase.travelTo(creep, new RoomPosition(25, 25, creep.memory.homeRoom), "black", 20);
          break;
        case !withdrawing && creep.room.name === creep.memory.homeRoom:
          const storeTarget =
            creep.memory.targetStore !== ""
              ? Game.getObjectById<StructureContainer>(creep.memory.targetStore)
              : this.getStoreTarget(creep);
          if (storeTarget) {
            if (creep.pos.isNearTo(storeTarget)) {
              const rtn = creep.transfer(storeTarget, RESOURCE_ENERGY);
              if (rtn === OK) {
                creep.memory.targetStore = "";
              }
            } else {
              CreepBase.travelTo(creep, storeTarget, "black", 1);
            }
          }
      }
    }
  }
}
