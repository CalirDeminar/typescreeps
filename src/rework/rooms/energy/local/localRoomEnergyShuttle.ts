import { Constants } from "utils/constants";
import { CreepBase } from "roles/role.creep";
import { CreepBuilder } from "utils/creepBuilder";
import { CreepUtils } from "rework/utils/creepUtils";
export interface CreepHarvesterShuttleMemory {
  role: "harvesterShuttle";
  working: boolean;
  targetSource: string;
  homeRoom: string;
  targetRoom: string;
  dropOffTarget: string;
}
export class LocalRoomEnergyShuttle {
  private static spawnShuttles(source: Source): void {
    const room = source.room;
    const activeHarvesters = CreepUtils.filterCreeps("harvesterShuttle", room.name, room.name, source.id);
    const queuedHarvesters = CreepUtils.filterQueuedCreeps(
      room.name,
      "harvesterShuttle",
      room.name,
      room.name,
      source.id
    );
    const missingHarvesters = Constants.maxShuttles - activeHarvesters.length;
    if (missingHarvesters > 0) {
      const deadRoom = _.filter(Game.creeps, (c) => c.memory.homeRoom === source.room.name).length < 4;
      const energy = deadRoom ? source.room.energyAvailable : source.room.energyCapacityAvailable;
      const template = {
        template: CreepBuilder.buildShuttleCreep(energy),
        memory: {
          ...CreepBase.baseMemory,
          role: "harvesterShuttle",
          working: true,
          targetSource: source.id,
          homeRoom: source.room.name,
          targetRoom: source.room.name
        }
      };
      if (queuedHarvesters.length > 0) {
        const index = CreepUtils.findQueuedCreepIndex(room.name, "harvesterShuttle", room.name, room.name, source.id);
        if (index >= 0) {
          Memory.roomStore[source.room.name].spawnQueue[index] = template;
        }
      } else {
        Memory.roomStore[source.room.name].spawnQueue.push(template);
      }
    }
  }
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
  private static runShuttle(creep: Creep, source: Source, site: ConstructionSite | undefined): void {
    if (creep.ticksToLive) {
      this.setWorkingState(creep);
      CreepBase.maintainRoad(creep);
      const working = creep.memory.working;
      const storeTarget = working
        ? null
        : CreepBase.findContainer(creep) || CreepBase.findSpawn(creep) || CreepBase.findExtension(creep, []);
      switch (true) {
        case working && creep.pos.isNearTo(source):
          creep.harvest(source);
          break;
        case working:
          CreepBase.travelTo(creep, source, "orange");
          break;
        case !working && site && creep.pos.isNearTo(source):
          CreepBase.flee(creep, source.pos);
          break;
        case !working && site && !creep.pos.isNearTo(source):
          if (site) {
            creep.build(site);
          }
          break;
        case !working && storeTarget && creep.pos.isNearTo(storeTarget):
          if (storeTarget) {
            creep.transfer(storeTarget, RESOURCE_ENERGY);
          }
          break;
        default:
          if (storeTarget) {
            CreepBase.travelTo(creep, storeTarget, "orange");
          }
      }
    }
  }
  private static runShuttles(source: Source): void {
    const site = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1)[0];
    _.filter(
      Game.creeps,
      (c) =>
        c.memory.role === "harvesterShuttle" &&
        c.memory.targetSource === source.id &&
        c.memory.homeRoom === source.room.name
    ).map((creep) => {
      this.runShuttle(creep, source, site);
    });
  }
  public static run(source: Source): void {
    this.spawnShuttles(source);
    this.runShuttles(source);
  }
}
