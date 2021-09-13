import { Constants } from "utils/constants";
import { CreepBuilder } from "utils/creepBuilder";
import { CreepBase } from "roles/role.creep";
import { UtilPosition } from "utils/util.position";
export class MineralDirector {
  private static spawnMineralHarvester(room: Room, container: StructureContainer, mineral: Mineral): void {
    const mineralHarvester = _.filter(
      Game.creeps,
      (c) =>
        c.memory.role === "mineralHarvester" && c.memory.targetSource === mineral.id && c.memory.homeRoom === room.name
    );
    const mineralHarvesterQueue = Memory.roomStore[room.name].spawnQueue.filter(
      (c) =>
        c.memory.role === "mineralHarvester" && c.memory.targetSource === mineral.id && c.memory.homeRoom === room.name
    );
    const creepNearDeath = mineralHarvester.filter((c) => c.ticksToLive && c.ticksToLive < 100).length > 0;
    const shouldSpawnAnother =
      (mineralHarvester.length < Constants.maxMineralHarvester ||
        (mineralHarvester.length === Constants.maxMineralHarvester && creepNearDeath)) &&
      mineral.mineralAmount > 250;
    if (shouldSpawnAnother) {
      const template = {
        template: CreepBuilder.buildMineralHarvester(room.energyCapacityAvailable),
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
      if (mineralHarvesterQueue.length > 0) {
        const index = Memory.roomStore[room.name].spawnQueue.findIndex(
          (c) =>
            c.memory.role === "mineralHarvester" &&
            c.memory.targetSource === mineral.id &&
            c.memory.dropOffTarget === container.id &&
            c.memory.homeRoom === room.name &&
            c.memory.targetRoom === room.name
        );
        if (index >= 0) {
          Memory.roomStore[room.name].spawnQueue[index] = template;
        }
      } else {
        Memory.roomStore[room.name].spawnQueue.push(template);
      }
    }
  }
  private static runHarvester(creep: Creep, container: StructureContainer, mineral: Mineral): void {
    if (creep.ticksToLive && mineral.mineralAmount > 0) {
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
      } else if (creep.ticksToLive > 100) {
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
  private static spawnHauler(room: Room, container: StructureContainer, mineral: Mineral): void {
    const mineralHaulers = _.filter(
      Game.creeps,
      (c) => c.memory.role === "mineralHauler" && c.memory.homeRoom === room.name
    );
    const mineralHaulerQueue = Memory.roomStore[room.name].spawnQueue.filter(
      (c) => c.memory.role === "mineralHauler" && c.memory.homeRoom === room.name
    );
    if (mineralHaulers.length < 1 && container.store.getUsedCapacity() > (room.energyCapacityAvailable / 10) * 50) {
      const template = {
        template: CreepBuilder.buildRoadHauler(room.energyCapacityAvailable / 5),
        memory: {
          ...CreepBase.baseMemory,
          role: "mineralHauler",
          working: false,
          born: Game.time,
          targetSource: mineral.id,
          dropOffTarget: container.id,
          homeRoom: room.name,
          targetRoom: room.name
        }
      };
      if (mineralHaulerQueue.length > 0) {
        const index = Memory.roomStore[room.name].spawnQueue.findIndex(
          (c) =>
            c.memory.role === "mineralHarvester" &&
            c.memory.targetSource === mineral.id &&
            c.memory.dropOffTarget === container.id &&
            c.memory.homeRoom === room.name &&
            c.memory.targetRoom === room.name
        );
        if (index >= 0) {
          Memory.roomStore[room.name].spawnQueue[index] = template;
        }
      } else {
        Memory.roomStore[room.name].spawnQueue.push(template);
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
      (c) =>
        c.memory.role === "mineralHarvester" && c.memory.targetSource === mineral.id && c.memory.homeRoom === room.name
    );
    const mineralHauler = _.filter(
      Game.creeps,
      (c) =>
        c.memory.role === "mineralHauler" && c.memory.workTarget === container.id && c.memory.homeRoom === room.name
    );
    this.spawnMineralHarvester(room, container, mineral);
    this.spawnHauler(room, container, mineral);
    _.filter(Game.creeps, (c) => c.memory.role === "mineralHauler" && c.memory.homeRoom === room.name).map((c) =>
      this.runHauler(c, container, terminal, mineral.mineralType)
    );
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
  private static placeExtractor(room: Room): boolean {
    const mineral = room.find(FIND_MINERALS)[0];
    if (mineral) {
      return room.createConstructionSite(mineral.pos.x, mineral.pos.y, STRUCTURE_EXTRACTOR) === OK;
    }
    return false;
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
  private static placeContainer(room: Room): boolean {
    const mineral = room.find(FIND_MINERALS)[0];
    const anchor = room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0];
    if (mineral && anchor) {
      const containerSpot = UtilPosition.getClosestSurroundingTo(mineral.pos, anchor.pos);
      return containerSpot.createConstructionSite(STRUCTURE_CONTAINER) === OK;
    }
    return false;
  }

  private static placeStructures(
    room: Room,
    extractor: StructureExtractor | null,
    container: StructureContainer | null
  ): void {
    const isBuilding = Memory.roomStore[room.name].buildingThisTick;
    switch (true) {
      case !isBuilding && !extractor:
        this.placeExtractor(room);
        break;
      case !isBuilding && !container:
        this.placeContainer(room);
        break;
      default:
        undefined;
    }
  }
  public static run(room: Room) {
    const correctLevel = room.controller && room.controller.level >= 6;
    const terminal = this.getTerminal(room);
    const extractor = this.getExtractor(room);
    const mineral = extractor ? extractor.pos.lookFor(LOOK_MINERALS)[0] : null;
    const container = this.getContainer(room, mineral);
    this.placeStructures(room, extractor, container);
    if (terminal && (Game.time + Constants.mineralTimingOffset) % 500 === 0) {
      console.log("Running Terminal Sales");
      this.runTerminalOrders(terminal);
    }
    if (terminal && extractor && mineral && container) {
      this.operate(room, terminal, mineral, container);
    }
  }
}
