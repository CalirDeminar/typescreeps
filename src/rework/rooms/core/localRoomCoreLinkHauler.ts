import { CreepUtils } from "rework/utils/creepUtils";
import { PositionsUtils } from "rework/utils/positions";
import { CreepBase } from "roles/role.creep";
export interface CreepLinkHaulerMemory {
  role: "linkHauler";
  homeRoom: string;
  targetRoom: string;
}
const deadRoomTemplate = [MOVE, CARRY, CARRY, CARRY, CARRY, CARRY];
const aliveRoomTemplate = [MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY];
export class LocalRoomCoreLinkHauler {
  private static runLinkHauler(
    creep: Creep,
    anchor: RoomPosition,
    anchorLink: StructureLink,
    controllerLink: StructureLink | undefined,
    storage: StructureStorage
  ): void {
    if (creep.ticksToLive) {
      const onStation = creep.pos.isEqualTo(anchor);
      if (!onStation) {
        const blockingCreep = anchor.lookFor(LOOK_CREEPS);
        blockingCreep.forEach((c) => CreepBase.flee(c, anchor));
        CreepBase.travelTo(creep, anchor, "red");
      }
      const hasCargo = creep.store.getUsedCapacity() > 0;
      const minStorageEnergy =
        storage.store.getUsedCapacity(RESOURCE_ENERGY) > storage.room.energyCapacityAvailable + 2000;
      const controllerLinkNeedsEnergy =
        minStorageEnergy && controllerLink && controllerLink.store.getFreeCapacity(RESOURCE_ENERGY) > 200;
      const canWithdraw =
        anchorLink.store.getUsedCapacity(RESOURCE_ENERGY) > Math.min(400, creep.store.getCapacity()) &&
        creep.store.getFreeCapacity() > 100;
      const linkFull = anchorLink.store.getFreeCapacity(RESOURCE_ENERGY) < 10;
      switch (true) {
        case !controllerLinkNeedsEnergy && canWithdraw:
          creep.withdraw(anchorLink, RESOURCE_ENERGY);
          break;
        case !controllerLinkNeedsEnergy && hasCargo:
          creep.transfer(storage, RESOURCE_ENERGY);
          break;
        case controllerLinkNeedsEnergy && minStorageEnergy && !hasCargo && !linkFull:
          creep.withdraw(storage, RESOURCE_ENERGY);
          break;
        case controllerLinkNeedsEnergy && hasCargo && !linkFull:
          if (controllerLink) {
            creep.transfer(anchorLink, RESOURCE_ENERGY);
          }
          break;
        case controllerLinkNeedsEnergy:
          if (controllerLink) {
            anchorLink.transferEnergy(controllerLink);
          }
          break;
        default:
          "";
      }
      if (controllerLinkNeedsEnergy && controllerLink) {
        anchorLink.transferEnergy(controllerLink);
      }
    }
  }
  private static runLinkHaulers(room: Room, anchor: RoomPosition, link: StructureLink): void {
    const storage = room.find<StructureStorage>(FIND_MY_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_STORAGE
    })[0];
    const controllerLink = room.controller?.pos.findInRange<StructureLink>(FIND_MY_STRUCTURES, 3, {
      filter: (s) => s.structureType === STRUCTURE_LINK
    })[0];
    CreepUtils.filterCreeps("linkHauler", room.name, room.name).forEach((c) =>
      this.runLinkHauler(c, anchor, link, controllerLink, storage)
    );
  }
  private static spawnLinkHauler(room: Room, link: StructureLink): void {
    if (link) {
      const currentLinkHaulers = CreepUtils.filterCreeps("linkHauler", room.name, room.name);
      const queuedLinkHaulers = CreepUtils.filterQueuedCreeps(room.name, "linkHauler", room.name, room.name);
      const deadRoom = _.filter(Game.creeps, (c) => c.memory.homeRoom === room.name).length < 4;
      if (
        currentLinkHaulers.length < 1 ||
        (currentLinkHaulers.length === 1 &&
          _.filter(currentLinkHaulers, (c) => c.ticksToLive && c.ticksToLive < 50).length > 0)
      ) {
        // TODO - update template
        const template = {
          template: deadRoom ? deadRoomTemplate : aliveRoomTemplate,
          memory: {
            ...CreepBase.baseMemory,
            role: "linkHauler",
            working: false,
            homeRoom: room.name,
            targetRoom: room.name,
            workTarget: link.id
          }
        };
        if (queuedLinkHaulers.length > 0) {
          const index = CreepUtils.findQueuedCreepIndex(room.name, "linkHauler", room.name, room.name);
          if (index >= 0) {
            Memory.roomStore[room.name].spawnQueue[index] = template;
          }
        } else {
          Memory.roomStore[room.name].spawnQueue.push(template);
        }
      }
    }
  }
  public static run(room: Room): void {
    const anchor = PositionsUtils.getAnchor(room);
    const anchorLink = anchor.findInRange<StructureLink>(FIND_MY_STRUCTURES, 1, {
      filter: (s) => s.structureType === STRUCTURE_LINK
    })[0];
    if (anchorLink) {
      this.spawnLinkHauler(room, anchorLink);
      this.runLinkHaulers(room, anchor, anchorLink);
    }
  }
}
