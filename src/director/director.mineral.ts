import { Constants } from "utils/constants";
import { CreepBuilder } from "utils/creepBuilder";
import { CreepBase } from "roles/role.creep";
import { UtilPosition } from "utils/util.position";
export class MineralDirector {
  private static spawnMineralHarvester(room: Room, container: StructureContainer, mineral: Mineral): void {
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
          dropOffTarget: container.id,
          homeRoom: room.name,
          targetRoom: room.name
        }
      };
    }
  }
  private static runHarvester(creep: Creep, container: StructureContainer, mineral: Mineral): void {
    if (creep.ticksToLive) {
      const full = creep.store.getFreeCapacity() < creep.body.filter((p) => p.type === WORK).length * 1;
      const extractor = mineral.pos.findInRange<StructureExtractor>(FIND_MY_STRUCTURES, 1)[0];
      const extractorOffCooldown = extractor.cooldown === 0;
      const inRangeOfContainer = creep.pos.getRangeTo(container) === 0;
      if (!inRangeOfContainer) {
        CreepBase.travelTo(creep, container, "white");
      } else {
        if (full) {
          creep.transfer(container, mineral.mineralType);
        }
        if (extractorOffCooldown) {
          creep.harvest(mineral);
        }
      }
    }
  }
  private static runHauler(
    creep: Creep,
    container: StructureContainer,
    terminal: StructureTerminal,
    mineralType: MineralConstant
  ): void {
    if (creep.ticksToLive) {
      const hasCargo = creep.store.getUsedCapacity() > 0;
      if (hasCargo) {
        // dump cargo
        const nearTerminal = creep.pos.isNearTo(terminal);
        if (nearTerminal) {
          creep.transfer(terminal, mineralType);
        } else {
          CreepBase.travelTo(creep, terminal.pos, "blue");
        }
      } else {
        // pick up cargo
        const nearContainer = creep.pos.isNearTo(container);
        if (nearContainer) {
          if (container.store.getUsedCapacity() >= creep.store.getFreeCapacity() && creep.ticksToLive > 100) {
            creep.withdraw(container, mineralType);
          }
        } else {
          CreepBase.travelTo(creep, container.pos, "blue");
        }
      }
    }
  }
  private static operate(
    room: Room,
    terminal: StructureTerminal,
    mineral: Mineral,
    container: StructureContainer
  ): void {
    const mineralHarvester = _.filter(
      Game.creeps,
      (c) => c.memory.role === "mineralHarvester" && c.memory.targetSource === mineral.id
    );
    const mineralHauler = _.filter(
      Game.creeps,
      (c) => c.memory.role === "mineralHauler" && c.memory.workTarget === container.id
    );
    this.spawnMineralHarvester(room, container, mineral);
    mineralHarvester.map((c) => this.runHarvester(c, container, mineral));
    mineralHauler.map((c) => this.runHauler(c, container, terminal, mineral.mineralType));
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
        if (energy > 1000 && volume > 200) {
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
  private static getTerminal(room: Room): StructureTerminal | null {
    return room.find<StructureTerminal>(FIND_MY_STRUCTURES, {
      filter: (c) => c.structureType === STRUCTURE_TERMINAL
    })[0];
  }

  private static getExtractor(room: Room): StructureExtractor | null {
    return room.find<StructureExtractor>(FIND_MY_STRUCTURES, {
      filter: (c) => c.structureType === STRUCTURE_EXTRACTOR
    })[0];
  }
  private static getContainer(room: Room, mineral: Mineral | null): StructureContainer | null {
    return room.find<StructureContainer>(FIND_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_CONTAINER && mineral && s.pos.isNearTo(mineral)
    })[0];
  }
  public static run(room: Room) {
    const correctLevel = room.controller && room.controller.level >= 6;
    const terminal = this.getTerminal(room);
    const extractor = this.getExtractor(room);
    const mineral = extractor ? extractor.pos.lookFor(LOOK_MINERALS)[0] : null;
    const container = this.getContainer(room, mineral);
    if (terminal && Game.time % 500 === 0) {
      console.log("Running Terminal Sales");
      this.runTerminalOrders(terminal);
    }
    if (correctLevel && terminal && extractor && mineral && container) {
      this.operate(room, terminal, mineral, container);
    }
  }
}
