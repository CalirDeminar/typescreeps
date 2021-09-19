import { Constants } from "utils/constants";
import { CreepBase } from "roles/role.creep";
export class RemoteDefense {
  public static run(room: RemoteDirectorStore): void {
    const homeRoom = Game.rooms[room.homeRoomName];
    const defenderCost = 430;
    const currentDefenders = _.filter(
      Game.creeps,
      (c) =>
        c.memory.role === "remoteDefender" &&
        c.memory.targetRoom === room.roomName &&
        c.memory.homeRoom === room.homeRoomName
    );
    const spawningDefenders = Memory.roomStore[room.homeRoomName].spawnQueue.filter(
      (c) =>
        c.memory.role === "remoteDefender" &&
        c.memory.targetRoom === room.roomName &&
        c.memory.homeRoom === room.homeRoomName
    );
    const spawnDefender =
      (room.hostileCreepCount === 1 || room.hasInvaderCore) &&
      room.hostileTowerCount === 0 &&
      homeRoom.energyCapacityAvailable > defenderCost;
    if (spawnDefender && currentDefenders.length + spawningDefenders.length < 1) {
      console.log("Spawning Defender");
      const roomRoute = Game.map.findRoute(homeRoom.name, room.roomName);
      const roomReachable = roomRoute !== -2 && roomRoute.length <= Constants.maxRemoteRoomDistance;
      if (roomReachable) {
        Memory.roomStore[homeRoom.name].spawnQueue.push({
          template: [TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, ATTACK, ATTACK, ATTACK, MOVE],
          memory: {
            ...CreepBase.baseMemory,
            role: "remoteDefender",
            working: false,
            born: Game.time,
            targetRoom: room.roomName,
            homeRoom: homeRoom.name
          }
        });
      }
    }
    currentDefenders.map((creep) => {
      if (creep.ticksToLive) {
        if (creep.pos.roomName !== creep.memory.targetRoom) {
          const roomCenter = new RoomPosition(25, 25, creep.memory.targetRoom);
          CreepBase.travelTo(creep, roomCenter, "red", 23);
        } else {
          const target =
            creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS) ||
            creep.room.find<StructureInvaderCore>(FIND_STRUCTURES, {
              filter: (s) => s.structureType === STRUCTURE_INVADER_CORE
            })[0];
          if (target && creep.pos.getRangeTo(target) <= 2) {
            creep.attack(target);
          }
          if (target) {
            CreepBase.travelTo(creep, target, "red", 0);
          }
        }
      }
    });
  }
}
