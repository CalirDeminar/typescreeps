import { CreepBase } from "roles/role.creep";
import { Harvester } from "roles/role.harvester";
import { Constants } from "utils/constants";
import { CreepBuilder } from "utils/creepBuilder";
export class SourceDirector {
  private static creepNearDeath(creeps: Creep[]): boolean {
    return creeps.filter((c) => c.ticksToLive && c.ticksToLive < 100).length > 0;
  }
  private static findStaticHarvesters(source: Source): string[] {
    return _.filter(Game.creeps, (c) => c.memory.role === "harvesterStatic" && c.memory.targetSource === source.id).map(
      (c) => c.id
    );
  }
  private static findShuttleHarvesters(source: Source): string[] {
    return _.filter(
      Game.creeps,
      (c) => c.memory.role === "harvesterShuttle" && c.memory.targetSource === source.id
    ).map((c) => c.id);
  }
  private static findAdjacentStructure(source: Source, targetType: STRUCTURE_CONTAINER | STRUCTURE_LINK): string[] {
    return source.pos
      .findInRange(FIND_STRUCTURES, 1, { filter: (s) => s.structureType === targetType })
      .map((s) => s.id);
  }
  private static initaliseRoom(room: Room): void {
    Memory.roomStore[room.name].sourceDirector = room.find(FIND_SOURCES).map(
      (s): SourceDirectorStore => {
        const shuttles = this.findShuttleHarvesters(s);
        const statics = this.findStaticHarvesters(s);
        const containerId = this.findAdjacentStructure(s, STRUCTURE_CONTAINER)[0];
        const linkId = this.findAdjacentStructure(s, STRUCTURE_LINK)[0];
        return {
          sourceId: s.id,
          shuttleHarvesterIds: shuttles,
          staticHarvesterIds: statics,
          containerId: containerId,
          targetContainerId: null,
          linkId: linkId,
          targetLinkId: "",
          containerDistanceByPath: -1
        };
      }
    );
  }
  private static runShuttleCreep(creep: Creep): void {
    Harvester.run(creep);
  }
  private static runShuttle(store: SourceDirectorStore): void {
    const source = Game.getObjectById<Source>(store.sourceId);
    if (source != null) {
      const empty = source.energy === 0;
      const room = source.room;
      const shuttles = this.findShuttleHarvesters(source)
        .map((id) => Game.creeps[id])
        .filter((c) => !!c);
      const shouldSpawnShuttle =
        shuttles.length < Constants.maxShuttles ||
        (shuttles.length === Constants.maxShuttles && this.creepNearDeath(shuttles));
      if (shouldSpawnShuttle) {
        Memory.roomStore[room.name].nextSpawn = {
          template: CreepBuilder.buildShuttleCreep(
            shuttles.length === 0 ? room.energyAvailable : room.energyCapacityAvailable
          ),
          memory: {
            ...CreepBase.baseMemory,
            role: "harvesterShuttle",
            working: true,
            born: Game.time,
            targetSource: source.id,
            targetSourcePos: source.pos,
            homeRoom: room.name,
            targetRoom: room.name
          }
        };
      }
      shuttles.map((creep) => {
        creep.memory.working =
          empty && creep.memory.working && creep.store[RESOURCE_ENERGY] ? false : creep.memory.working;
        this.runShuttleCreep(creep);
      });
    }
  }
  private static runStaticCreep(creep: Creep): void {
    Harvester.run(creep);
  }
  private static runStatic(store: SourceDirectorStore): void {}
  private static runSource(store: SourceDirectorStore): void {
    const container = Game.getObjectById(store.containerId || "");
    if (!!container) {
      this.runStatic(store);
    } else {
      this.runShuttle(store);
    }
  }
  public static run(room: Room) {
    const isInitialised =
      !!Memory.roomStore[room.name].sourceDirector && Memory.roomStore[room.name].sourceDirector.length > 0;
    const roomEstablished = room.controller && room.controller.my && room.controller.level >= 1;
    switch (true) {
      case !roomEstablished:
        break;
      case isInitialised:
        _.map(Memory.roomStore[room.name].sourceDirector, (s) => this.runSource(s));
        break;
      default:
        this.initaliseRoom(room);
    }
  }
}
