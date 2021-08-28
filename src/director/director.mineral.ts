import { Constants } from "utils/constants";
import { CreepBuilder } from "utils/creepBuilder";
import { CreepBase } from "roles/role.creep";
export class MineralDirector {
  private static operate(room: Room, terminal: StructureTerminal, mineral: Mineral): void {
    const mineralHarvester = _.filter(
      Game.creeps,
      (c) => c.memory.role === "mineralHarvester" && c.memory.targetSource === mineral.id
    );
    const creepNearDeath = mineralHarvester.filter((c) => c.ticksToLive && c.ticksToLive < 100).length > 0;
    const shouldSpawnAnother =
      mineralHarvester.length < Constants.maxMineralHarvester ||
      (mineralHarvester.length === Constants.maxMineralHarvester && creepNearDeath);
    if (shouldSpawnAnother) {
      Memory.roomStore[room.name].nextSpawn = {
        template: CreepBuilder.buildShuttleCreep(400),
        memory: {
          ...CreepBase.baseMemory,
          role: "harvesterShuttle",
          working: false,
          born: Game.time,
          targetSource: mineral.id,
          dropOffTarget: terminal.id,
          homeRoom: room.name,
          targetRoom: room.name
        }
      };
    }
    mineralHarvester.map((c) => {
      const empty = c.store.getUsedCapacity() === 0;
      const full = c.store.getFreeCapacity() === 0 || (c.ticksToLive && c.ticksToLive < 150);
      const inRangeOfMineral = c.pos.getRangeTo(mineral) <= 1;
      const inRangeOfTerminal = c.pos.getRangeTo(terminal) <= 1;
      switch (true) {
        case inRangeOfMineral && !full:
          c.harvest(mineral);
          break;
        case !inRangeOfMineral && !full:
          CreepBase.travelTo(c, mineral, "white");
          break;
        case !inRangeOfTerminal && full:
          CreepBase.travelTo(c, terminal, "white");
          break;
        case inRangeOfTerminal && full:
          c.transfer(terminal, mineral.mineralType);
          break;
        default:
          break;
      }
    });
  }
  public static run(room: Room) {
    const correctLevel = room.controller && room.controller.level >= 6;
    const terminal = room.find<StructureTerminal>(FIND_MY_STRUCTURES, {
      filter: (c) => c.structureType === STRUCTURE_TERMINAL
    })[0];
    const extractor = room.find<StructureExtractor>(FIND_MY_STRUCTURES, {
      filter: (c) => c.structureType === STRUCTURE_EXTRACTOR
    })[0];
    const mineral = extractor ? extractor.pos.lookFor(LOOK_MINERALS)[0] : false;
    if (correctLevel && terminal && extractor && mineral) {
      this.operate(room, terminal, mineral);
    }
  }
}
