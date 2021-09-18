import { CreepBase } from "roles/role.creep";
export class RemoteReserver {
  public static runReserver(room: RemoteDirectorStore): void {
    const homeRoom = Game.rooms[room.homeRoomName];
    const hostile = room.hostileCreepCount > 0 || room.hostileTowerCount > 0;
    const reservers = _.filter(
      Game.creeps,
      (c) =>
        c.memory.role === "reserver" && c.memory.targetRoom === room.roomName && c.memory.homeRoom === room.homeRoomName
    );
    const spawningReservers = Memory.roomStore[room.homeRoomName].spawnQueue.filter(
      (c) =>
        c.memory.role === "reserver" && c.memory.targetRoom === room.roomName && c.memory.homeRoom === room.homeRoomName
    );
    const reserverNearDeath = reservers.filter((c) => c.ticksToLive && c.ticksToLive < 100).length > 0;
    const targetRoom = Object.keys(Game.rooms).includes(room.roomName) ? Game.rooms[room.roomName] : undefined;
    const lowTicks =
      (targetRoom &&
        targetRoom.controller &&
        targetRoom.controller.reservation &&
        targetRoom.controller.reservation.ticksToEnd < 1000) ||
      (targetRoom && targetRoom.controller && !targetRoom.controller.reservation);
    // console.log(`Reserver Low Ticks: ${lowTicks}`);
    const needsReserver =
      room.sources.length > 1 &&
      lowTicks &&
      (reservers.length + spawningReservers.length < 1 || (reservers.length === 1 && reserverNearDeath)) &&
      homeRoom.energyCapacityAvailable > 1300 &&
      !hostile;
    if (needsReserver) {
      const template = {
        template: [CLAIM, CLAIM, MOVE, MOVE],
        memory: {
          ...CreepBase.baseMemory,
          role: "reserver",
          homeRoom: room.homeRoomName,
          targetRoom: room.roomName
        }
      };
      if (spawningReservers.length > 0) {
        const index = Memory.roomStore[room.homeRoomName].spawnQueue.findIndex(
          (c) =>
            c.memory.role === "reserver" &&
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
    reservers.map((creep) => {
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
        }
      }
    });
  }
}
