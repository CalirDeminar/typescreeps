import { CreepBuilder } from "utils/creepBuilder";
import { CreepBase } from "roles/role.creep";
import { CreepUtils } from "rework/utils/creepUtils";
import { RemoteEnergyMemory } from "./remoteRoomEnergy";
import { PositionsUtils } from "rework/utils/positions";
import { packPosList, unpackPosList } from "utils/packrat";
import { RoomUtils } from "rework/utils/roomUtils";

export class RemoteRoomEnergyHauler {
  private static getPath(creep: Creep, room: RemoteEnergyMemory, anchor: Flag): RoomPosition[] {
    const sourceRecord = room.sources.find((s) => s.sourceId === creep.memory.targetSource);
    const sourceRecordIndex = room.sources.findIndex((s) => s.sourceId === creep.memory.targetSource);
    const roomIndex = Memory.roomStore[room.homeRoomName].remoteEnergy.findIndex((r) => r.roomName === room.roomName);
    if (
      !sourceRecord ||
      (creep.pos.roomName !== room.roomName && sourceRecord && sourceRecord.path && sourceRecord.path.length === 0)
    ) {
      return [];
    }
    const source = Game.getObjectById<Source>(sourceRecord.sourceId);
    if (!source) {
      return [];
    }
    if (sourceRecord.path && sourceRecord.path.length > 0) {
      return unpackPosList(sourceRecord.path);
    }
    const targetRoomStructures = creep.room
      .find(FIND_STRUCTURES, {
        filter: (s) => s.structureType !== STRUCTURE_CONTAINER && s.structureType !== STRUCTURE_ROAD
      })
      .map((s) => s.pos);
    const route = PathFinder.search(
      anchor.pos,
      {
        pos: new RoomPosition(source.pos.x, source.pos.y, source.pos.roomName),
        range: 1
      },
      {
        roomCallback: (roomName) => {
          const cm = PositionsUtils.getRoomTerrainCostMatrix(roomName);
          const isTargetRoom = roomName === room.roomName;
          const localAvoids = PositionsUtils.getRoomAvoids(roomName).concat(isTargetRoom ? targetRoomStructures : []);
          localAvoids.forEach((a) => cm.set(a.x, a.y, 255));
          return cm;
        },
        maxRooms: 3
      }
    );
    if (route.incomplete) {
      return [];
    }
    Memory.roomStore[room.homeRoomName].remoteEnergy[roomIndex].sources[sourceRecordIndex].path = packPosList(
      route.path
    );
    return route.path;
  }
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
  public static spawn(room: RemoteEnergyMemory, index: number): void {
    const startCpu = Game.cpu.getUsed();
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
      const haulers = CreepUtils.filterCreeps("remoteHauler", room.homeRoomName, room.roomName, s.sourceId);
      const queuedHaulers = CreepUtils.filterQueuedCreeps(
        room.homeRoomName,
        "remoteHauler",
        room.homeRoomName,
        room.roomName,
        s.sourceId
      );
      const needsHauler = haulers.length + queuedHaulers.length === 0;
      const haulerNearDeath =
        haulers.length === 1 &&
        queuedHaulers.length === 0 &&
        haulers[0] &&
        haulers[0].ticksToLive &&
        haulers[0].ticksToLive < 100;
      if (needsHauler || haulerNearDeath) {
        // console.log(queuedHaulers.length);
        const template = {
          template: CreepBuilder.createRemoteCreeps(energyBudget).hauler,
          memory: {
            ...CreepBase.baseMemory,
            homeRoom: homeRoom.name,
            targetRoom: room.roomName,
            targetSource: source.id,
            workTarget: container.id,
            role: "remoteHauler",
            working: true
          }
        };
        const index = CreepUtils.findQueuedCreepIndex(
          room.homeRoomName,
          "remoteHauler",
          room.homeRoomName,
          room.roomName,
          s.sourceId
        );
        if (index >= 0) {
          Memory.roomStore[homeRoom.name].spawnQueue[index] = template;
        } else {
          Memory.roomStore[homeRoom.name].spawnQueue.push(template);
        }
      }
    });
    const usedCpu = Game.cpu.getUsed() - startCpu;
    RoomUtils.recordFilePerformance(room.homeRoomName, "roomRemoteEnergyHauling", usedCpu);
  }
  public static run(creep: Creep, anchor: Flag): void {
    if (creep.ticksToLive && !CreepBase.fleeHostiles(creep)) {
      const startCpu = Game.cpu.getUsed();
      let withdrawing = creep.memory.working;
      const container = Game.getObjectById<StructureContainer>(creep.memory.workTarget);
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
      const remRoom = Memory.roomStore[creep.memory.homeRoom].remoteEnergy.find(
        (r) => r.roomName === creep.memory.targetRoom
      );
      const targetRoomHostile = remRoom ? remRoom.hostileCreepCount > 0 : false;
      const path = remRoom ? this.getPath(creep, remRoom, anchor) : [];
      const validPath = path.length > 0;
      switch (true) {
        case targetRoomHostile:
          validPath
            ? CreepBase.travelByPath(creep, anchor.pos, path, 5)
            : CreepBase.travelTo(creep, anchor, "orange", 5);
          break;
        case withdrawing && creep.room.name !== creep.memory.targetRoom:
          // move to target room
          validPath
            ? CreepBase.travelByPath(creep, path[path.length - 1], path)
            : CreepBase.travelTo(creep, new RoomPosition(25, 25, creep.memory.targetRoom), "black", 20);
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
            validPath
              ? CreepBase.travelByPath(creep, container.pos, path, 1)
              : CreepBase.travelTo(creep, container, "black", 1);
          }
          break;
        case !withdrawing && creep.room.name !== creep.memory.homeRoom:
          validPath
            ? CreepBase.travelByPath(creep, anchor.pos, path, 5)
            : CreepBase.travelTo(creep, new RoomPosition(25, 25, creep.memory.homeRoom), "black", 20);
          break;
        case !withdrawing && creep.room.name === creep.memory.homeRoom:
          const storeTarget =
            creep.memory.targetStore !== ""
              ? Game.getObjectById<StructureContainer>(creep.memory.targetStore)
              : this.getStoreTarget(creep);
          const storeNearAnchor = storeTarget?.pos.findInRange(FIND_FLAGS, 1, {
            filter: (f) => f.name === `${storeTarget.pos.roomName}-Anchor`
          });
          if (storeTarget) {
            switch (true) {
              case creep.pos.isNearTo(storeTarget):
                const rtn = creep.transfer(storeTarget, RESOURCE_ENERGY);
                if (rtn === OK) {
                  creep.memory.targetStore = "";
                }
                break;
              case creep.pos.getRangeTo(anchor.pos) > 4:
                CreepBase.travelByPath(creep, anchor.pos, path);
                break;
              default:
                CreepBase.travelTo(creep, storeTarget, "black", 1);
                break;
            }
          }
          break;
      }
      const endCpu = Game.cpu.getUsed();
      CreepUtils.recordCreepPerformance(creep, endCpu - startCpu);
    }
  }
}
