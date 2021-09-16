export class SpawnDirector {
  private static getRoleScore(
    role: string,
    storedEnergy: boolean,
    hasFilledLink: boolean,
    energyInContainers: boolean
  ): number {
    switch (role) {
      case "queen":
        return storedEnergy ? 9999999999 : 31;
      case "linkHauler":
        return !storedEnergy && hasFilledLink ? 9999999998 : 49;
      case "hauler":
        return energyInContainers ? 95 : 45;
      case "harvesterStatic":
        return 50;
      case "harvesterShuttle":
        return 40;
      case "remoteHarvester":
        return 30;
      case "reserver":
        return 29;
      case "mason":
        return 28;
      case "remoteDefender":
        return 25;
      case "upgrader":
        return 20;
      case "claimer":
        return 15;
      case "helper":
        return 10;
      default:
        return 0;
    }
  }
  public static sortSpawnQueue(
    queue: CreepRecipie[],
    storedEnergy: boolean,
    hasFilledLink: boolean,
    energyInContainers: boolean
  ): CreepRecipie[] {
    return [...queue]
      .sort((a, b) => {
        return (
          this.getRoleScore(a.memory.role, storedEnergy, hasFilledLink, energyInContainers) -
          this.getRoleScore(b.memory.role, storedEnergy, hasFilledLink, energyInContainers)
        );
      })
      .reverse();
  }
  private static costCreep(creep: CreepRecipie): number {
    return creep.template.reduce((acc: number, part: BodyPartConstant) => {
      switch (part) {
        case CARRY:
        case MOVE:
          return acc + 50;
        case WORK:
          return acc + 100;
        case ATTACK:
          return acc + 80;
        case RANGED_ATTACK:
          return acc + 150;
        case HEAL:
          return acc + 250;
        case CLAIM:
          return acc + 600;
        case TOUGH:
          return acc + 10;
        default:
          return acc;
      }
    }, 0);
  }
  public static runSpawn(room: Room): void {
    const spawnQueue = Memory.roomStore[room.name].spawnQueue;
    const storedEnergy = room.storage ? room.storage.store[RESOURCE_ENERGY] > room.energyCapacityAvailable * 3 : true;
    const hasFilledLink =
      room.find(FIND_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_LINK && s.store[RESOURCE_ENERGY] > 1200
      }).length > 0;
    const energyInContainers =
      room
        .find<StructureContainer>(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_CONTAINER })
        .reduce((acc, cont) => acc + cont.store[RESOURCE_ENERGY], 0) > 3000;
    const sortedQueue = this.sortSpawnQueue(spawnQueue, storedEnergy, hasFilledLink, energyInContainers);
    Memory.roomStore[room.name].spawnQueue = sortedQueue;
    const toSpawn = sortedQueue[0];
    // console.log(`${toSpawn.memory.role}: ` + JSON.stringify(toSpawn.template));
    if (toSpawn) {
      const freeSpawn = room.find(FIND_MY_SPAWNS, { filter: (s) => !s.spawning })[0];
      // TODO - check here that the room can currently afford to spawn a creep of this cost
      if (freeSpawn && this.costCreep(toSpawn) <= room.energyAvailable) {
        const resp = freeSpawn.spawnCreep(toSpawn.template, `${toSpawn.memory.role}-${Game.time}`, {
          memory: toSpawn.memory
        });
        if (resp === OK) {
          Memory.roomStore[room.name].nextSpawn = null;
          Memory.roomStore[room.name].spawnQueue = sortedQueue.slice(1);
        } else {
        }
      }
      if (this.costCreep(toSpawn) > room.energyAvailable) {
        Memory.roomStore[room.name].spawnQueue = sortedQueue.slice(1);
      }
      if (this.costCreep(toSpawn) > room.energyCapacityAvailable || toSpawn.template.length === 0) {
        console.log(`bad creep cost - ${toSpawn.memory.role}`);
        Memory.roomStore[room.name].spawnQueue = sortedQueue.slice(1);
      }
    }
  }
}
