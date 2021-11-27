import { CreepUtils } from "rework/utils/creepUtils";
import { CreepBase } from "roles/role.creep";

export class RemoteRoomEnergyReservation {
  private static spawnReserver(room: RemoteDirectorStore): void {
    const homeRoom = Game.rooms[room.homeRoomName];
    const hostile = room.hostileCreepCount > 0 || room.hostileTowerCount > 0;
    const enoughSources = room.sources.length >= 2;
    const enoughEnergy = homeRoom.energyCapacityAvailable >= 2000;
    const targetRoom = Object.keys(Game.rooms).includes(room.roomName) ? Game.rooms[room.roomName] : undefined;
    const lowTicks =
      (targetRoom &&
        targetRoom.controller &&
        targetRoom.controller.reservation &&
        targetRoom.controller.reservation.ticksToEnd < 1000) ||
      (targetRoom && targetRoom.controller && !targetRoom.controller.reservation);
    if (!hostile && enoughSources && enoughEnergy && lowTicks) {
      const reservers = CreepUtils.filterCreeps("remoteReserver", room.homeRoomName, room.roomName);
      const spawningReservers = CreepUtils.filterQueuedCreeps(
        room.homeRoomName,
        "remoteReserver",
        room.homeRoomName,
        room.roomName
      );
      const reserverNearDeath = reservers.filter((c) => c.ticksToLive && c.ticksToLive < 100).length > 0;
      // console.log(`Reserver Low Ticks: ${lowTicks}`);
      const needsReserver =
        reservers.length + spawningReservers.length < 1 || (reservers.length === 1 && reserverNearDeath);
      if (needsReserver) {
        const template = {
          template: [CLAIM, CLAIM, MOVE, MOVE],
          memory: {
            ...CreepBase.baseMemory,
            role: "remoteReserver",
            homeRoom: room.homeRoomName,
            targetRoom: room.roomName
          }
        };
        if (spawningReservers.length > 0) {
          const index = Memory.roomStore[room.homeRoomName].spawnQueue.findIndex(
            (c) =>
              c.memory.role === "remoteReserver" &&
              c.memory.homeRoom === room.homeRoomName &&
              c.memory.targetRoom === room.roomName
          );
          if (index >= 0) {
            Memory.roomStore[room.homeRoomName].spawnQueue[index] = template;
          }
        } else {
          Memory.roomStore[room.homeRoomName].spawnQueue.push(template);
        }
      }
    }
  }
  private static runReserver(creep: Creep, room: RemoteDirectorStore): void {
    const controller =
      Object.keys(Game.rooms).includes(room.roomName) && Game.rooms[room.roomName]
        ? Game.rooms[room.roomName].controller
        : undefined;
    if (creep.ticksToLive) {
      switch (true) {
        case creep.pos.roomName != room.roomName:
          CreepBase.travelToRoom(creep, "red", room.roomName);
          break;
        case creep.pos.roomName === creep.memory.targetRoom && controller && !creep.pos.isNearTo(controller):
          if (controller) {
            CreepBase.travelTo(creep, controller, "red");
          }
          break;
        case creep.pos.roomName === creep.memory.targetRoom && controller && creep.pos.isNearTo(controller):
          if (
            controller &&
            (controller.reservation === undefined || controller.reservation.username !== "InvaderCore")
          ) {
            creep.reserveController(controller);
          } else if (controller) {
            creep.attackController(controller);
          }
          break;
        default:
          break;
      }
    }
  }
  public static run(room: RemoteDirectorStore): void {
    this.spawnReserver(room);
    const reservers = CreepUtils.filterCreeps("remoteReserver", room.homeRoomName, room.roomName);
    reservers.forEach((c) => this.runReserver(c, room));
  }
}
