import { CreepUtils } from "rework/utils/creepUtils";
import { PositionsUtils } from "rework/utils/positions";
import { CreepBase } from "roles/role.creep";
import { CreepBuilder } from "utils/creepBuilder";
import { RemoteEnergyMemory } from "./remoteRoomEnergy";

export class RemoteRoomEnergyHarvester {
  private static setWorkingState(creep: Creep) {
    const working = creep.memory.working;
    const workParts = creep.body.filter((p) => p.type === WORK).length;
    const full = creep.store.getFreeCapacity() < workParts * 2;
    const empty = creep.store.getUsedCapacity() === 0;
    if (!working && empty) {
      creep.memory.working = true;
      creep.memory.dropOffTarget = "";
    } else if (working && full) {
      creep.memory.working = false;
    }
  }
  public static spawn(room: RemoteEnergyMemory, index: number): void {
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
      const sourceId = s.sourceId;

      const harvesters = CreepUtils.filterCreeps("remoteHarvester", room.homeRoomName, room.roomName, sourceId);
      const queuedHarvesters = CreepUtils.filterQueuedCreeps(
        room.homeRoomName,
        "remoteHarvester",
        room.homeRoomName,
        room.roomName,
        sourceId
      );
      const harvesterNearDeath =
        harvesters.length === 1 &&
        queuedHarvesters.length === 0 &&
        harvesters[0].ticksToLive &&
        harvesters[0].ticksToLive < 100;
      const lowHarvesters = harvesters.length + queuedHarvesters.length === 0;
      if (harvesterNearDeath || lowHarvesters) {
        const template = {
          template: CreepBuilder.createRemoteCreeps(energyBudget).worker,
          memory: {
            ...CreepBase.baseMemory,
            homeRoom: homeRoom.name,
            targetRoom: room.roomName,
            targetSource: sourceId,
            role: "remoteHarvester",
            working: true
          }
        };
        if (queuedHarvesters.length > 0) {
          const index = CreepUtils.findQueuedCreepIndex(
            room.homeRoomName,
            "remoteHarvester",
            room.homeRoomName,
            room.roomName,
            sourceId
          );
          if (index >= 0) {
            Memory.roomStore[homeRoom.name].spawnQueue[index] = template;
          }
        } else {
          Memory.roomStore[homeRoom.name].spawnQueue.push(template);
        }
      }
    });
  }
  public static run(
    creep: Creep,
    room: RemoteEnergyMemory,
    anchor: Flag,
    constructionSite: ConstructionSite | null
  ): void {
    if (creep.ticksToLive && !CreepBase.fleeHostiles(creep)) {
      const startCpu = Game.cpu.getUsed();
      CreepBase.maintainRoad(creep);
      const source = Game.getObjectById<Source>(creep.memory.targetSource);

      // if (!source) {
      //   return;
      // }
      const container = source?.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 1, {
        filter: (s) => s.structureType === STRUCTURE_CONTAINER
      })[0];
      const hostileRoom = room.hostileCreepCount > 0;
      this.setWorkingState(creep);
      const working = creep.memory.working;
      const inTargetRoom = creep.pos.roomName === creep.memory.targetRoom;
      switch (true) {
        case hostileRoom: {
          CreepBase.travelTo(creep, anchor, "orange", 5);
          break;
        }
        case working && source && creep.pos.isNearTo(source.pos): {
          if (source && source.energy > 0) {
            creep.harvest(source);
          }
          break;
        }
        case working && !inTargetRoom: {
          CreepBase.travelToRoom(creep, "orange", creep.memory.targetRoom);
          break;
        }
        case working && source && !creep.pos.isNearTo(source.pos): {
          if (source) {
            CreepBase.travelTo(creep, container?.pos || source.pos, "orange", container ? 0 : 1);
          }
          break;
        }
        case !working && !!container: {
          if (container) {
            const containerDamage = container.hitsMax - container.hits;
            const repairAmount = creep.body.filter((p) => p.type === WORK).length * 100;
            switch (true) {
              case !creep.pos.isNearTo(container):
                CreepBase.travelTo(creep, container, "orange", 1);
                break;
              case containerDamage > repairAmount:
                creep.repair(container);
                break;
              case container && creep.pos.isEqualTo(container.pos):
                if (source && source.energy > 0) {
                  creep.harvest(source);
                }
                break;
              case true:
                creep.transfer(container, RESOURCE_ENERGY);
                break;
            }
          }
          break;
        }
        case !working && creep.pos.roomName !== creep.memory.homeRoom:
          if (constructionSite) {
            if (creep.pos.inRangeTo(constructionSite, 3)) {
              creep.build(constructionSite);
            } else {
              CreepBase.travelTo(creep, constructionSite, "orange", 2);
            }
          } else {
            CreepBase.travelTo(creep, anchor, "orange", 5);
          }
          break;
        case !working && creep.pos.roomName === creep.memory.homeRoom:
          const storeTarget =
            CreepBase.findStorage(creep) ||
            CreepBase.findContainer(creep) ||
            CreepBase.findSpawn(creep) ||
            CreepBase.findExtension(creep);
          if (storeTarget) {
            if (creep.pos.isNearTo(storeTarget)) {
              creep.transfer(storeTarget, RESOURCE_ENERGY);
            } else {
              CreepBase.travelTo(creep, storeTarget, "orange", 1);
            }
          }
          break;
      }
      const endCpu = Game.cpu.getUsed();
      CreepUtils.recordCreepPerformance(creep, endCpu - startCpu);
      // harvesting
      // construction sites
    }
  }
}
