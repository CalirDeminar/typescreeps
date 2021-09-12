import { CreepBase } from "roles/role.creep";
export class LinkHaulerDirector {
  private static runLinkHauler(creep: Creep, link: StructureLink, storage: StructureStorage, anchor: Flag): void {
    if (creep.ticksToLive) {
      const onStation = creep.pos.isNearTo(storage.pos) && creep.pos.isNearTo(link.pos);
      if (!onStation) {
        if (!creep.pos.isNearTo(storage.pos)) {
          CreepBase.travelTo(creep, storage.pos, "black");
        } else if (!creep.pos.isNearTo(link.pos)) {
          CreepBase.travelTo(creep, link.pos, "black");
        }
      } else {
        const hasCargo = creep.store.getUsedCapacity() > 0;
        const canWithdraw =
          link.store.getUsedCapacity(RESOURCE_ENERGY) > Math.min(400, creep.store.getCapacity()) &&
          creep.store.getFreeCapacity() > 100;
        const spawn = creep.pos.findInRange<StructureSpawn>(FIND_STRUCTURES, 1, {
          filter: (s) => s.structureType === STRUCTURE_SPAWN && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        })[0];

        if (hasCargo) {
          if (spawn) {
            creep.transfer(spawn, RESOURCE_ENERGY);
          } else {
            creep.transfer(storage, RESOURCE_ENERGY);
          }
        }
        if (canWithdraw) {
          creep.withdraw(link, RESOURCE_ENERGY);
        }
      }
    }
  }
  public static runLinkHaulers(
    room: Room,
    link: StructureLink | null,
    storage: StructureStorage | null,
    anchor: Flag
  ): void {
    if (link && storage) {
      _.filter(Game.creeps, (c) => c.memory.role === "linkHauler" && c.memory.homeRoom === room.name).map((c) =>
        this.runLinkHauler(c, link, storage, anchor)
      );
    }
  }
  public static spawnLinkHauler(room: Room, link: StructureLink | null): void {
    if (link) {
      const currentLinkHaulers = _.filter(
        Game.creeps,
        (c) => c.memory.role === "linkHauler" && c.memory.homeRoom === room.name
      );
      const queuedLinkHaulers = Memory.roomStore[room.name].spawnQueue.filter(
        (c) => c.memory.role === "linkHauler" && c.memory.homeRoom === room.name
      );
      const deadRoom = _.filter(Game.creeps, (c) => c.memory.homeRoom === room.name).length < 4;
      if (
        currentLinkHaulers.length < 1 ||
        (currentLinkHaulers.length === 1 &&
          _.filter(currentLinkHaulers, (c) => c.ticksToLive && c.ticksToLive < 50).length > 0)
      ) {
        // TODO - update template
        const template = {
          template: deadRoom
            ? [MOVE, CARRY, CARRY, CARRY, CARRY, CARRY]
            : [MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY],
          memory: {
            ...CreepBase.baseMemory,
            role: "linkHauler",
            working: false,
            born: Game.time,
            homeRoom: room.name,
            targetRoom: room.name,
            workTarget: link.id
          }
        };
        if (queuedLinkHaulers.length > 0) {
          const index = Memory.roomStore[room.name].spawnQueue.findIndex(
            (c) =>
              c.memory.role === "linkHauler" &&
              c.memory.homeRoom === room.name &&
              c.memory.targetRoom === room.name &&
              c.memory.workTarget === link.id
          );
          if (index >= 0) {
            Memory.roomStore[room.name].spawnQueue[index] = template;
          }
        } else {
          Memory.roomStore[room.name].spawnQueue.push(template);
        }
      }
    }
  }
}
