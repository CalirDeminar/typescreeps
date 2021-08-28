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
  private static runContainer(source: Source, container: Structure, anchorLink: StructureLink | null): void {
    const activeHarvesters = this.getCreepRoleAt("harvesterStatic", source.id);
    const oldHarvesters = this.getCreepRoleAt("harvesterShuttle", source.id);
    const sourceLink = this.getSourceLink(source);
    if (activeHarvesters.length > 0 && oldHarvesters.length > 0) {
      oldHarvesters.map((h) => h.suicide());
    }
    if (sourceLink && anchorLink && sourceLink.cooldown === 0 && sourceLink.store[RESOURCE_ENERGY] > 100) {
      sourceLink.transferEnergy(
        anchorLink,
        Math.min(sourceLink.store[RESOURCE_ENERGY], 800 - anchorLink.store[RESOURCE_ENERGY])
      );
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
          Math.min(allHaulers.length < 1 ? 200 : source.room.energyCapacityAvailable, 1000)
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
  private static getSourceContainer(source: Source): StructureContainer | null {
    return source.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 1, {
      filter: (s: Structure) => s.structureType === STRUCTURE_CONTAINER
    })[0];
  }
  private static getSourceLink(source: Source): StructureLink | null {
    return source.pos.findInRange<StructureLink>(FIND_STRUCTURES, 1, {
      filter: (s: Structure) => s.structureType === STRUCTURE_LINK
    })[0];
  }
  private static getAnchor(room: Room): Flag {
    return room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0];
  }
  private static getAnchorLink(room: Room): StructureLink | null {
    const anchor = this.getAnchor(room);
    return anchor.pos.findInRange<StructureLink>(FIND_MY_STRUCTURES, 1, {
      filter: (s) => s.structureType === STRUCTURE_LINK
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
    const anchorLink = this.getAnchorLink(room);
    _.map(room.find(FIND_SOURCES), (source: Source) => {
      const container = this.getSourceContainer(source);
      if (container) {
        this.runContainer(source, container, anchorLink);
        // assign hauler store targets
      } else {
        this.runShuttle(source, maxMissingHarvesters);
        // assign shuttle store targets
      }
    });
  }
}
