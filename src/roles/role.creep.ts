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
    born: 0,
    targetSource: "",
    targetStore: "",
    homeRoom: "",
    targetRoom: "",
    workTarget: "",
    upgradeTarget: "",
    refuelTarget: "",
    dropOffTarget: "",
    scoutPositions: [],
    targetSourcePos: null
  };
  public static travelTo(creep: Creep, target: RoomPosition | HasPos, pathColour: string, range?: number | 1) {
    const targetPos = "pos" in target ? target.pos : target;
    const creepNearby = creep.pos.findInRange(FIND_MY_CREEPS, 1);
    if (creep.fatigue <= 0) {
      creep.moveTo(targetPos, { visualizePathStyle: { stroke: pathColour }, ignoreCreeps: !creepNearby, range: range });
      // if (creep.room.name === targetPos.roomName) {
      //   const rangeToTarget = creep.pos.getRangeTo(target);
      //   if (rangeToTarget > 1) {
      //     creep.moveTo(targetPos, { visualizePathStyle: { stroke: pathColour }, ignoreCreeps: !creepNearby });
      //   }
      // } else {
      //   const dir = creep.room.findExitTo(targetPos.roomName);
      //   if (dir !== -2 && dir !== -10) {
      //     const exit = creep.room.find(dir).sort((i, j) => creep.pos.getRangeTo(i) - creep.pos.getRangeTo(j))[0];
      //     creep.moveTo(exit, { visualizePathStyle: { stroke: pathColour }, ignoreCreeps: !creepNearby });
      //   }
      // }
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
  public static findLink(creep: Creep, ignore: string[] = []): Structure | null {
    return creep.pos.findInRange<StructureLink>(FIND_MY_STRUCTURES, 1, {
      filter: (s) => s.structureType === STRUCTURE_LINK && !ignore.includes(s.id) && s.store[RESOURCE_ENERGY] < 750
    })[0];
  }
  static getSourceTarget(creep: Creep): Structure | null {
    const homeRoom = Game.rooms[creep.memory.homeRoom];
    const isSpawning = Memory.roomStore[homeRoom.name].nextSpawn !== null;
    if (creep.room.name !== creep.memory.homeRoom) {
      this.travelToRoom(creep, "", homeRoom.name);
      return null;
    } else {
      const containerExists =
        homeRoom.find(FIND_STRUCTURES, {
          filter: (s: AnyStructure) => {
            return (
              (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) &&
              s.pos.findInRange(FIND_FLAGS, 1).length > 0
            );
          }
        }).length > 0;
      const harvestableStorage = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: this.filterStructures(STRUCTURE_STORAGE, homeRoom.energyCapacityAvailable + creep.store.getCapacity())
      });
      if (harvestableStorage) {
        return harvestableStorage;
      }
      const harvestableContainer = creep.pos.findClosestByPath(FIND_STRUCTURES, {
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
        const harvestableSpawn = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: this.filterStructures(STRUCTURE_SPAWN, 100)
        });
        if (harvestableSpawn) {
          return harvestableSpawn;
        }
        const harvestableExtension = creep.pos.findClosestByPath(FIND_STRUCTURES, {
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
