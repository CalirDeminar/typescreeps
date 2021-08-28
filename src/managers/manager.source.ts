import { CreepBuilder } from "../utils/creepBuilder";
import { CreepBase } from "roles/role.creep";
import { Constants } from "utils/constants";
export class SourceManager {
  private static getCreepRoleAt(role: string, sourceId: string): Creep[] {
    return _.filter(Game.creeps, (c) => c.memory.role === role && c.memory.targetSource === sourceId);
  }
  private static runShuttle(source: Source, maxMissingHarvesters: number): void {
    const missingHarvesters = this.getMissingHarvesters(source);
    const harvestersEmpty = missingHarvesters >= Constants.maxShuttles;
    if (missingHarvesters > 0 && missingHarvesters >= maxMissingHarvesters) {
      Memory.roomStore[source.room.name].nextSpawn = {
        template: CreepBuilder.buildShuttleCreep(harvestersEmpty ? 250 : source.room.energyCapacityAvailable),
        memory: {
          ...CreepBase.baseMemory,
          role: "harvesterShuttle",
          working: false,
          born: Game.time,
          targetSource: source.id,
          targetSourcePos: source.pos,
          homeRoom: source.room.name,
          targetRoom: source.room.name
        }
      };
    }
  }
  private static runContainer(source: Source, container: Structure): void {
    const activeHarvesters = this.getCreepRoleAt("harvesterStatic", source.id);
    const oldHarvesters = this.getCreepRoleAt("harvesterShuttle", source.id);
    if (activeHarvesters.length > 0 && oldHarvesters.length > 0) {
      oldHarvesters.map((h) => h.suicide());
    }
    const allHaulers = _.filter(Game.creeps, (c: Creep) => c.memory.role === "hauler");
    const haulers = _.filter(
      Game.creeps,
      (c: Creep) => c.memory.role === "hauler" && c.memory.targetSource === container.id
    );
    if (
      haulers.length < Constants.maxHaulers ||
      (haulers.length === 1 && haulers[0] && haulers[0].ticksToLive && haulers[0].ticksToLive < 125)
    ) {
      Memory.roomStore[source.room.name].nextSpawn = {
        template: CreepBuilder.buildHaulingCreep(
          Math.min(allHaulers.length < 1 ? 200 : source.room.energyCapacityAvailable, 800)
        ),
        memory: {
          ...CreepBase.baseMemory,
          role: "hauler",
          working: false,
          born: Game.time,
          targetSource: container.id,
          targetSourcePos: container.pos,
          homeRoom: source.room.name,
          targetRoom: source.room.name
        }
      };
    } else if (
      activeHarvesters.length < Constants.maxStatic ||
      (activeHarvesters.length == 1 &&
        activeHarvesters[0] &&
        activeHarvesters[0].ticksToLive &&
        activeHarvesters[0].ticksToLive < 100)
    ) {
      Memory.roomStore[source.room.name].nextSpawn = {
        template: CreepBuilder.buildStaticHarvester(source.room.energyCapacityAvailable),
        memory: {
          ...CreepBase.baseMemory,
          role: "harvesterStatic",
          working: false,
          born: Game.time,
          targetSource: source.id,
          targetSourcePos: source.pos,
          homeRoom: source.room.name,
          targetRoom: source.room.name,
          targetStore: container.id
        }
      };
    }
  }
  private static getSourceContainer(source: Source): AnyStructure | null {
    return source.pos.findInRange(FIND_STRUCTURES, 1, {
      filter: (s: Structure) => s.structureType === STRUCTURE_CONTAINER
    })[0];
  }
  private static getMissingHarvesters(source: Source): number {
    const container = this.getSourceContainer(source);
    const maxHarvesters = container ? Constants.maxStatic : Constants.maxShuttles;
    const creepCount = _.filter(
      Game.creeps,
      (c) =>
        c.memory.targetSource === source.id &&
        (c.memory.role === "harvesterShuttle" || c.memory.role === "harvesterStatic")
    ).length;
    return maxHarvesters - creepCount;
  }
  private static getMostMissingHarvesters(room: Room): number {
    return Math.max(
      ...room.find(FIND_SOURCES).map((s) => {
        return this.getMissingHarvesters(s);
      })
    );
  }
  public static run(room: Room): void {
    const maxMissingHarvesters = this.getMostMissingHarvesters(room);
    _.map(room.find(FIND_SOURCES), (source: Source) => {
      const container = this.getSourceContainer(source);
      if (container) {
        this.runContainer(source, container);
        // assign hauler store targets
      } else {
        this.runShuttle(source, maxMissingHarvesters);
        // assign shuttle store targets
      }
    });
  }
}
