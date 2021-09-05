import { CreepBase } from "./role.creep";

export class Queen extends CreepBase {
  private static pathColour() {
    return "red";
  }
  private static getContainer(anchor: Flag): StructureContainer | StructureStorage | StructureLink | null {
    return (
      anchor.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 1, {
        filter: (s) => s.structureType === STRUCTURE_STORAGE
      })[0] ||
      anchor.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 1, {
        filter: (s) => s.structureType === STRUCTURE_CONTAINER
      })[0] ||
      null
    );
  }
  private static getLink(anchor: Flag): StructureLink | null {
    return anchor.pos.findInRange<StructureLink>(FIND_STRUCTURES, 1, {
      filter: (s) => s.structureType === STRUCTURE_LINK
    })[0];
  }
  private static isWorking(
    creep: Creep,
    container: StructureContainer | StructureStorage | StructureLink
  ): "work" | "fuel" | "dump" {
    const target = Game.getObjectById<StructureSpawn | StructureExtension>(creep.memory.workTarget);
    switch (true) {
      case creep.store.getUsedCapacity() < 50:
        return "fuel";
      case creep.store.getFreeCapacity() > 0 && creep.pos.isNearTo(container):
        // if full, go to work
        return "work";
      case creep.store.getUsedCapacity() >= 50:
        return "work";
      case !creep.memory.working && creep.store.getUsedCapacity() >= 50 && container.store[RESOURCE_ENERGY] === 0:
        // if container is empty, we have > 50 energy, go to work
        return "work";
      default:
        return "fuel";
    }
  }
  public static refuelSelf(creep: Creep, container: StructureContainer | StructureStorage | StructureLink): void {
    const nearContainer = creep.pos.isNearTo(container);
    if (nearContainer) {
      creep.withdraw(container, RESOURCE_ENERGY);
    } else {
      this.travelTo(creep, container, this.pathColour());
    }
  }
  private static getClosestStructure(
    creep: Creep,
    type: STRUCTURE_SPAWN | STRUCTURE_EXTENSION
  ): StructureSpawn | StructureExtension | null {
    return creep.pos.findClosestByPath<StructureSpawn | StructureExtension>(FIND_MY_STRUCTURES, {
      filter: (s) => s.structureType === type && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    });
  }
  private static findTarget(creep: Creep): string {
    const room = creep.room;
    const towers = creep.room.find<StructureTower>(FIND_MY_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_TOWER
    });
    const lowTowers = towers.filter((t) => t.store.getFreeCapacity(RESOURCE_ENERGY) > 250);
    const spawningFill = room.energyAvailable < room.energyCapacityAvailable;
    if (spawningFill) {
      const target =
        this.getClosestStructure(creep, STRUCTURE_EXTENSION) || this.getClosestStructure(creep, STRUCTURE_SPAWN);
      return target ? target.id : "";
    } else if (lowTowers.length > 0) {
      const target = creep.pos.findClosestByPath(lowTowers);
      return target ? target.id : "";
    }
    return "";
  }
  public static fillCore(creep: Creep): void {
    let target = Game.getObjectById<StructureSpawn | StructureExtension | null>(creep.memory.workTarget);
    if (!target || target.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      creep.memory.workTarget = this.findTarget(creep);
    }
    if (creep.memory.workTarget) {
      const target = Game.getObjectById<StructureSpawn | StructureExtension | StructureTower>(creep.memory.workTarget);
      switch (true) {
        case target === null:
          break;
        case target && target.store.getFreeCapacity(RESOURCE_ENERGY) === 0:
          creep.memory.workTarget = "";
          break;
        case target && creep.pos.isNearTo(target):
          if (target) {
            creep.transfer(target, RESOURCE_ENERGY);
          }
          break;
        default:
          if (target) {
            this.travelTo(creep, target, this.pathColour());
          }
          break;
      }
    }
  }
  private static dumpEnergy(creep: Creep, anchor: Flag): void {
    const storage = anchor.pos.findInRange<StructureStorage>(FIND_STRUCTURES, 1, {
      filter: (s) => s.structureType === STRUCTURE_STORAGE
    })[0];
    if (storage) {
      if (creep.pos.isNearTo(storage)) {
        creep.transfer(storage, RESOURCE_ENERGY);
      } else {
        this.travelTo(creep, storage, this.pathColour());
      }
    }
  }
  public static run(creep: Creep) {
    if (creep.ticksToLive) {
      const room = creep.room;
      const anchor = room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0];
      const container = this.getContainer(anchor);
      if (container) {
        switch (this.isWorking(creep, container)) {
          case "work":
            this.fillCore(creep);
            break;
          case "fuel":
            this.refuelSelf(creep, container);
            break;
          case "dump":
            this.dumpEnergy(creep, anchor);
        }
      }
    }
  }
}
