import { CreepBuilder } from "../utils/creepBuilder";
export class SourceManager {
  private static maxShuttleHarvesters(): number {
    return 4;
  }
  private static runShuttle(source: Source): void {
    const activeHarvesters = _.filter(
      Game.creeps,
      (creep: Creep) => creep.memory.role === "harvester" && creep.memory.targetSource === source.id
    );
    if (activeHarvesters.length < this.maxShuttleHarvesters()) {
      Memory.roomStore[source.room.name].nextSpawn = {
        template: CreepBuilder.buildShuttleCreep(source.room.energyCapacityAvailable),
        memory: {
          role: "harvester",
          working: false,
          born: Game.time,
          targetSource: source.id,
          homeRoom: source.room.name,
          targetRoom: source.room.name,
          workTarget: "",
          refuelTarget: "",
          dropOffTarget: "",
          targetStore: ""
        }
      };
    }
  }
  private static runContainer(source: Source, container: Structure): void {
    const activeHarvesters = _.filter(
      Game.creeps,
      (creep: Creep) => creep.memory.role === "harvester" && creep.memory.targetSource === source.id
    );
    const haulers = _.filter(
      Game.creeps,
      (c: Creep) => c.memory.role === "hauler" && c.memory.targetSource === container.id
    );
    if (
      activeHarvesters.length < 1 ||
      (activeHarvesters[0] && activeHarvesters[0].ticksToLive && activeHarvesters[0].ticksToLive < 100)
    ) {
      Memory.roomStore[source.room.name].nextSpawn = {
        template: CreepBuilder.buildShuttleCreep(source.room.energyCapacityAvailable),
        memory: {
          role: "harvester",
          working: false,
          born: Game.time,
          targetSource: source.id,
          homeRoom: source.room.name,
          targetRoom: source.room.name,
          workTarget: "",
          refuelTarget: "",
          dropOffTarget: "",
          targetStore: container.id
        }
      };
    } else if (haulers.length < 1 || (haulers[0] && haulers[0].ticksToLive && haulers[0].ticksToLive < 100)) {
      Memory.roomStore[source.room.name].nextSpawn = {
        template: CreepBuilder.buildShuttleCreep(source.room.energyCapacityAvailable),
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
          targetStore: ""
        }
      };
    }
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
        this.runShuttle(source);
        // assign shuttle store targets
      }
    });
  }
}
