export class CreepBase {
  private static filterStructures(
    type: STRUCTURE_STORAGE | STRUCTURE_SPAWN | STRUCTURE_EXTENSION | STRUCTURE_CONTAINER,
    energyLimit: number
  ) {
    return (s: AnyStructure) => {
      return s.structureType === type && s.store[RESOURCE_ENERGY] > energyLimit;
    };
  }
  public static baseMemory: CreepMemory = {
    role: "",
    working: false,
    targetSource: "",
    targetStore: "",
    homeRoom: "",
    targetRoom: "",
    workTarget: "",
    upgradeTarget: "",
    refuelTarget: "",
    dropOffTarget: "",
    scoutPositions: [],
    lastPosition: null,
    stuckCounter: 0
  };
  public static travelTo(
    creep: Creep,
    target: RoomPosition | HasPos,
    pathColour: string,
    range?: number | 1,
    avoids?: RoomPosition[]
  ) {
    const targetPos = "pos" in target ? target.pos : target;
    const creepNearby = creep.pos.findInRange(FIND_MY_CREEPS, 1);
    if (creep.fatigue <= 0) {
      const rtn = creep.moveTo(targetPos, {
        visualizePathStyle: { stroke: pathColour },
        ignoreCreeps: !creepNearby,
        range: range,
        reusePath: creepNearby ? 5 : 20,
        maxOps: 1000,
        costCallback: (roomName: string, costMatrix: CostMatrix) => {
          if (roomName === creep.pos.roomName && avoids && avoids.length > 0) {
            avoids.forEach((p) => costMatrix.set(p.x, p.y, 10));
          }
        }
      });
      return rtn;
    }
    return 0;
  }
  public static flee(creep: Creep, hostile: RoomPosition) {
    if (creep.fatigue <= 0) {
      let path = PathFinder.search(creep.pos, { pos: hostile, range: 50 }, { flee: true }).path;
      creep.moveByPath(path);
    }
  }
  public static fleeHostiles(creep: Creep): boolean {
    const hostile = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 10).sort((a) => creep.pos.getRangeTo(a))[0];
    if (!hostile) {
      return false;
    } else if (creep.fatigue <= 0) {
      this.flee(creep, hostile.pos);
      return true;
    } else {
      return true;
    }
  }
  public static travelToRoom(creep: Creep, pathColour: string, targetRoom: string) {
    const roomCenter = new RoomPosition(25, 25, targetRoom);
    this.travelTo(creep, roomCenter, pathColour, 20);
  }
  public static maintainRoad(creep: Creep): void {
    const workParts = creep.body.filter((p) => p.type === WORK).length;
    if (workParts > 0 && creep.store[RESOURCE_ENERGY] > 0) {
      const road = creep.pos.lookFor(LOOK_STRUCTURES).filter((s) => s.structureType === STRUCTURE_ROAD)[0];
      if (road && road.hits <= road.hitsMax - 100 * workParts) {
        creep.repair(road);
      }
    }
  }
  public static findStorage(creep: Creep, ignore: string[] = []): Structure | null {
    return creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: (s) =>
        s.structureType === STRUCTURE_STORAGE && !ignore.includes(s.id) && s.store.energy < s.store.getCapacity()
    });
  }
  public static findContainer(creep: Creep, ignore: string[] = []): Structure | null {
    return creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: (s) =>
        s.structureType === STRUCTURE_CONTAINER && !ignore.includes(s.id) && s.store.energy < s.store.getCapacity()
    });
  }
  public static findSpawn(creep: Creep, ignore: string[] = []): Structure | null {
    return creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_SPAWN && !ignore.includes(s.id) && s.store.energy < s.energyCapacity
    });
  }
  public static findExtension(creep: Creep, ignore: string[] = []): Structure | null {
    return creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
      filter: (s) =>
        s.structureType === STRUCTURE_EXTENSION && !ignore.includes(s.id) && s.store.energy < s.energyCapacity
    });
  }
  public static findFilledTombstone(creep: Creep): Tombstone | null {
    return creep.pos.findClosestByPath(FIND_TOMBSTONES, {
      filter: (t) => t.store.getUsedCapacity(RESOURCE_ENERGY) > 200
    });
  }
  public static findLink(creep: Creep, ignore: string[] = []): Structure | null {
    const source = Game.getObjectById<Source>(creep.memory.targetSource);
    if (source) {
      return source.pos.findInRange<StructureLink>(FIND_MY_STRUCTURES, 2, {
        filter: (s) => s.structureType === STRUCTURE_LINK && !ignore.includes(s.id) && s.store[RESOURCE_ENERGY] < 750
      })[0];
    } else {
      return null;
    }
  }
  static getSourceTarget(
    creep: Creep
  ): StructureContainer | StructureStorage | StructureLink | StructureSpawn | StructureExtension | Tombstone | null {
    const homeRoom = Game.rooms[creep.memory.homeRoom];
    const isSpawning = Memory.roomStore[homeRoom.name].spawnQueue.length > 0;
    if (creep.room.name !== creep.memory.homeRoom) {
      this.travelToRoom(creep, "", homeRoom.name);
      return null;
    } else {
      const tombStone = this.findFilledTombstone(creep);
      if (tombStone) {
        return tombStone;
      }
      const containerExists =
        homeRoom.find(FIND_STRUCTURES, {
          filter: (s: AnyStructure) => {
            return (
              (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) &&
              s.pos.findInRange(FIND_FLAGS, 1).length > 0
            );
          }
        }).length > 0;
      const storageExists = !!homeRoom.storage;
      const harvestableStorage =
        homeRoom.storage &&
        homeRoom.storage.store.getUsedCapacity(RESOURCE_ENERGY) >
          homeRoom.energyCapacityAvailable + creep.store.getCapacity()
          ? homeRoom.storage
          : null;
      if (storageExists) {
        return harvestableStorage;
      }
      const harvestableContainer = creep.pos.findClosestByPath<StructureContainer>(FIND_STRUCTURES, {
        filter: (s: AnyStructure) => {
          return (
            s.structureType === STRUCTURE_CONTAINER &&
            s.pos.findInRange(FIND_FLAGS, 1).length > 0 &&
            s.store[RESOURCE_ENERGY] > Math.min(homeRoom.energyCapacityAvailable + creep.store.getCapacity(), 1800)
          );
        }
      });
      if (harvestableContainer) {
        return harvestableContainer;
      }
      if (!isSpawning && !containerExists) {
        const harvestableSpawn = creep.pos.findClosestByPath<StructureSpawn>(FIND_STRUCTURES, {
          filter: this.filterStructures(STRUCTURE_SPAWN, 100)
        });
        if (harvestableSpawn) {
          return harvestableSpawn;
        }
        const harvestableExtension = creep.pos.findClosestByPath<StructureExtension>(FIND_STRUCTURES, {
          filter: this.filterStructures(STRUCTURE_EXTENSION, 10)
        });
        if (harvestableExtension) {
          return harvestableExtension;
        }
        return null;
      }
      return null;
    }
  }
}
