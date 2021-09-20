import { CreepBase } from "roles/role.creep";
export class LinkHaulerDirector {
  private static runLinkHauler(
    creep: Creep,
    link: StructureLink,
    controllerLink: StructureLink | undefined,
    storage: StructureStorage,
    anchor: Flag
  ): void {
    if (creep.ticksToLive) {
      const onStation = creep.pos.isNearTo(storage.pos) && creep.pos.isNearTo(link.pos);
      if (!onStation) {
        CreepBase.travelTo(creep, new RoomPosition(storage.pos.x + 1, storage.pos.y, storage.pos.roomName), "black");
      } else {
        const hasCargo = creep.store.getUsedCapacity() > 0;
        const minStorageEnergy =
          storage.store.getUsedCapacity(RESOURCE_ENERGY) > storage.room.energyCapacityAvailable + 2000;
        const controllerLinkNeedsEnergy =
          minStorageEnergy && controllerLink && controllerLink.store.getFreeCapacity(RESOURCE_ENERGY) > 200;
        const canWithdraw =
          link.store.getUsedCapacity(RESOURCE_ENERGY) > Math.min(400, creep.store.getCapacity()) &&
          creep.store.getFreeCapacity() > 100;
        const linkFull = link.store.getFreeCapacity(RESOURCE_ENERGY) < 10;
        // if (link.room.name === "W6N1") {
        //   console.log(
        //     `CanWithdraw: ${canWithdraw} - hasCargo: ${hasCargo} - ControllerLinkNeedsEnergy: ${controllerLinkNeedsEnergy} - MinStorageEnergy: ${minStorageEnergy} - ControllerLinkEnergyCheck: ${
        //       controllerLink && controllerLink.store.getFreeCapacity(RESOURCE_ENERGY) > 40
        //     }`
        //   );
        // }
        switch (true) {
          case !controllerLinkNeedsEnergy && canWithdraw:
            creep.withdraw(link, RESOURCE_ENERGY);
            break;
          case !controllerLinkNeedsEnergy && hasCargo:
            creep.transfer(storage, RESOURCE_ENERGY);
            break;
          case controllerLinkNeedsEnergy && minStorageEnergy && !hasCargo && !linkFull:
            creep.withdraw(storage, RESOURCE_ENERGY);
            break;
          case controllerLinkNeedsEnergy && hasCargo && !linkFull:
            if (controllerLink) {
              creep.transfer(link, RESOURCE_ENERGY);
            }
            break;
          case controllerLinkNeedsEnergy:
            if (controllerLink) {
              link.transferEnergy(controllerLink);
            }
            break;
          default:
            "";
        }
        if (controllerLinkNeedsEnergy && controllerLink) {
          link.transferEnergy(controllerLink);
        }
      }
    }
  }
  public static runLinkHaulers(
    room: Room,
    link: StructureLink | null,
    controllerLink: StructureLink | undefined,
    storage: StructureStorage | null,
    anchor: Flag
  ): void {
    if (link && storage) {
      _.filter(Game.creeps, (c) => c.memory.role === "linkHauler" && c.memory.homeRoom === room.name).map((c) =>
        this.runLinkHauler(c, link, controllerLink, storage, anchor)
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
