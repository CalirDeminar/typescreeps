import { CreepBuilder } from "../utils/creepBuilder";
import { Constants } from "utils/constants";
export class SourceManager {
  private static runShuttle(source: Source, currentMinimumCount: number): void {
    const activeHarvesters = _.filter(
      Game.creeps,
      (creep: Creep) => creep.memory.role === "harvesterShuttle" && creep.memory.targetSource === source.id
    );
    if (activeHarvesters.length < Constants.maxShuttles && activeHarvesters.length <= currentMinimumCount) {
      Memory.roomStore[source.room.name].nextSpawn = {
        template: CreepBuilder.buildShuttleCreep(source.room.energyCapacityAvailable),
        memory: {
          role: "harvesterShuttle",
          working: false,
          born: Game.time,
          targetSource: source.id,
          homeRoom: source.room.name,
          targetRoom: source.room.name,
          workTarget: "",
          refuelTarget: "",
          dropOffTarget: "",
          targetStore: "",
          upgradeTarget: "",
        }
      };
    }
  }
  private static runContainer(source: Source, container: Structure): void {
    const activeHarvesters = _.filter(
      Game.creeps,
      (creep: Creep) => creep.memory.role === "harvesterStatic" && creep.memory.targetSource === source.id
    );
    const oldHarvesters = _.filter(
      Game.creeps,
      (creep: Creep) => creep.memory.role === "harvesterShuttle" && creep.memory.targetSource === source.id
    );
    if (activeHarvesters.length > 0 && oldHarvesters.length > 0) {
      oldHarvesters.map((h) => h.suicide());
    }
    const haulers = _.filter(
      Game.creeps,
      (c: Creep) => c.memory.role === "hauler" && c.memory.targetSource === container.id
    );
    if (haulers.length < Constants.maxHaulers || (haulers.length === 1 && haulers[0] && haulers[0].ticksToLive && haulers[0].ticksToLive < 100)) {
      Memory.roomStore[source.room.name].nextSpawn = {
        template: CreepBuilder.buildHaulingCreep(source.room.energyCapacityAvailable),
        memory: {
          role: "hauler",
          working: false,
          born: Game.time,
          targetSource: container.id,
          homeRoom: source.room.name,
          targetRoom: source.room.name,
          workTarget: "",
          refuelTarget: "",
          dropOffTarget: "",
          targetStore: "",
          upgradeTarget: ""
        }
      };
    } else if (
      activeHarvesters.length < Constants.maxStatic ||
      (activeHarvesters.length == 1 && activeHarvesters[0] && activeHarvesters[0].ticksToLive && activeHarvesters[0].ticksToLive < 100)
    ) {
      Memory.roomStore[source.room.name].nextSpawn = {
        template: CreepBuilder.buildStaticHarvester(source.room.energyCapacityAvailable),
        memory: {
          role: "harvesterStatic",
          working: false,
          born: Game.time,
          targetSource: source.id,
          homeRoom: source.room.name,
          targetRoom: source.room.name,
          workTarget: "",
          refuelTarget: "",
          dropOffTarget: "",
          targetStore: container.id,
          upgradeTarget: "",
        }
      };
    }
  }
  private static getRoomHarvesterMinimum(room: Room): number {
    const activeHarvesters = _.filter(
      Game.creeps,
      (creep: Creep) => creep.memory.role === "harvesterShuttle"
    );
    const sources = room.find(FIND_SOURCES);
    return Math.min(...sources.map((source: Source) => activeHarvesters.filter((harv: Creep) => harv.memory.targetSource === source.id).length));
  }
  public static run(room: Room): void {
    _.map(room.find(FIND_SOURCES), (source: Source) => {
      const container = source.pos.findInRange(FIND_STRUCTURES, 1, {
        filter: (s: Structure) => s.structureType === STRUCTURE_CONTAINER
      })[0];
      if (container) {
        this.runContainer(source, container);
        // assign hauler store targets
      } else {
        const currentMinimumCount = this.getRoomHarvesterMinimum(room)
        this.runShuttle(source, currentMinimumCount);
        // assign shuttle store targets
      }
    });
  }
}
