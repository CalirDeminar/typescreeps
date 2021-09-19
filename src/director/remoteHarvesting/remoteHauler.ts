import { CreepBase } from "roles/role.creep";
import { CreepCombat } from "utils/creepCombat";

export class RemoteHauler {
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
  public static runRemote(creep: Creep, anchor: Flag) {
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
