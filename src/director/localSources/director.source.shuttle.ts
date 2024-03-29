import { Constants } from "utils/constants";
import { CreepBase } from "roles/role.creep";
import { CreepBuilder } from "utils/creepBuilder";
export class SourceShuttleDirector {
  private static getMaxMissingShuttles(): number {
    const counts = _.reduce(
      Game.creeps,
      (acc: { [key: string]: number }, creep) => {
        if (creep.memory.role === "shuttleHarvester") {
          if (creep.memory.targetSource in acc) {
            return { ...acc, [creep.memory.targetSource]: acc[creep.memory.targetSource] + 1 };
          } else {
            return { ...acc, [creep.memory.targetSource]: 1 };
          }
        } else {
          return acc;
        }
      },
      {}
    );
    const missings = _.map(counts, (c) => Constants.maxShuttles - c);
    return Math.max(...missings);
  }
  private static spawnShuttles(room: Room, source: Source): void {
    const maxMissing = this.getMaxMissingShuttles();
    const activeHarvesters = _.filter(
      Game.creeps,
      (c) =>
        c.memory.role === "harvesterShuttle" && c.memory.targetSource === source.id && c.memory.homeRoom === room.name
    );
    const queuedHarvesters = Memory.roomStore[room.name].spawnQueue.filter(
      (c) =>
        c.memory.role === "harvesterShuttle" && c.memory.targetSource === source.id && c.memory.homeRoom === room.name
    );
    const missingHarvesters = Constants.maxShuttles - activeHarvesters.length;
    const harvestersEmpty = missingHarvesters >= Constants.maxShuttles;
    const deadRoom = _.filter(Game.creeps, (c) => c.memory.homeRoom === source.room.name).length < 4;
    if (missingHarvesters > 0 && missingHarvesters >= maxMissing) {
      const template = {
        template: CreepBuilder.buildShuttleCreep(deadRoom ? room.energyAvailable : source.room.energyCapacityAvailable),
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
        const index = Memory.roomStore[source.room.name].spawnQueue.findIndex(
          (c) =>
            c.memory.role === "harvesterShuttle" &&
            c.memory.homeRoom === room.name &&
            c.memory.targetRoom === room.name &&
            c.memory.targetSource === source.id
        );
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
  private static runShuttle(creep: Creep, source: Source, storeTargets: string[]): string[] {
    if (creep.ticksToLive) {
      this.setWorkingState(creep);
      CreepBase.maintainRoad(creep);
      const working = creep.memory.working;
      const storeTarget = working
        ? null
        : CreepBase.findContainer(creep) || CreepBase.findSpawn(creep) || CreepBase.findExtension(creep, storeTargets);
      // currently only filtering out extensions, as need to account for remaining volume for larger containers
      if (storeTarget) {
        storeTargets.concat([storeTarget.id]);
      }
      switch (true) {
        case working && creep.pos.isNearTo(source):
          creep.harvest(source);
          break;
        case working:
          CreepBase.travelTo(creep, source, "orange");
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
    return storeTargets;
  }
  private static runShuttles(source: Source): void {
    // list of extensions being delivered to already
    let storeTargets: string[] = [];
    _.filter(
      Game.creeps,
      (c) =>
        c.memory.role === "harvesterShuttle" &&
        c.memory.targetSource === source.id &&
        c.memory.homeRoom === source.room.name
    ).map((creep) => {
      const source = Game.getObjectById<Source>(creep.memory.targetSource);
      if (source) {
        storeTargets = this.runShuttle(creep, source, storeTargets);
      }
    });
  }
  public static run(room: Room, source: Source, anchor: Flag): void {
    this.spawnShuttles(room, source);
    this.runShuttles(source);
  }
}
