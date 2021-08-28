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
        template: CreepBuilder.buildMineralHarvester(400),
        memory: {
          ...CreepBase.baseMemory,
          role: "mineralHarvester",
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
      const full =
        c.store.getFreeCapacity() < c.body.filter((p) => p.type === WORK).length * 1 ||
        (c.ticksToLive && c.ticksToLive < 150);
      const inRangeOfMineral = c.pos.getRangeTo(mineral) <= 1;
      const inRangeOfTerminal = c.pos.getRangeTo(terminal) <= 1;
      switch (true) {
        case inRangeOfMineral && !full:
          const extractor = mineral.pos.findInRange<StructureExtractor>(FIND_MY_STRUCTURES, 1)[0];
          if (extractor.cooldown === 0) {
            c.harvest(mineral);
          }
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
  private static runTerminalOrders(terminal: StructureTerminal): void {
    const store = terminal.store;
    const keys = Object.keys(store);
    const minerals = [
      RESOURCE_HYDROGEN,
      RESOURCE_OXYGEN,
      RESOURCE_UTRIUM,
      RESOURCE_KEANIUM,
      RESOURCE_LEMERGIUM,
      RESOURCE_ZYNTHIUM,
      RESOURCE_CATALYST
    ];
    minerals
      .filter((k) => k in keys)
      .map((material) => {
        const volume = store[material];
        const energy = store[RESOURCE_ENERGY];
        if (energy > 1000) {
          const order = Game.market
            .getAllOrders(
              (order) => order.resourceType === material && order.type === ORDER_BUY && order.remainingAmount > volume
            )
            .sort((a, b) => b.price - a.price)[0];
          if (
            order &&
            order.roomName &&
            Game.market.calcTransactionCost(volume, terminal.room.name, order.roomName) <= 1000
          ) {
            Game.market.deal(order.id, volume);
          }
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
    if (terminal && Game.time % 500 === 0) {
      console.log("Running Terminal Sales");
      this.runTerminalOrders(terminal);
    }
    if (correctLevel && terminal && extractor && mineral) {
      this.operate(room, terminal, mineral);
    }
  }
}
