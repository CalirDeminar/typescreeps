import { CreepBase } from "roles/role.creep";
import { Constants } from "utils/constants";
export class RemoteManager {
  private static getSurroundingRoomNames(room: Room): RoomPosition[] {
    const baseName = room.name;
    const matches = baseName.match(/^(\w)(\d+)(\w)(\d+)$/);
    return [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ]
      .reduce((acc: RoomPosition[], c: { x: number; y: number }) => {
        if (matches) {
          const hDir = matches[1];
          const hDist = matches[2];
          const vDir = matches[3];
          const vDist = matches[4];
          const targetRoomName = `${hDir}${parseInt(hDist) + c.x}${vDir}${parseInt(vDist) + c.y}`;
          // only travel to directly adjacent rooms
          const roomRoute = Game.map.findRoute(room.name, targetRoomName);
          if (roomRoute != -2 && roomRoute.length <= Constants.maxRemoteRoomDistance) {
            return acc.concat([new RoomPosition(25, 25, targetRoomName)]);
          } else {
            return acc;
          }
        } else {
          return acc;
        }
      }, [])
      .sort((a, b) => {
        const routeA = Game.map.findRoute(room.name, a.roomName);
        const routeB = Game.map.findRoute(room.name, b.roomName);
        const roomsToA = routeA !== -2 ? routeA.length : 100000;
        const roomsToB = routeB !== -2 ? routeB.length : 100000;
        return roomsToA - roomsToB;
      });
  }
  private static spawnScout(room: Room) {
    const spawn = room.find(FIND_MY_SPAWNS)[0];
    const scouts = _.filter(Game.creeps, (c) => c.memory.role === "scout");
    const shouldSpawnScout =
      room.controller &&
      room.controller.level > 1 &&
      Game.time % (room.controller.level === 2 ? Constants.earlyScoutFrequency : Constants.lateScoutFrequency) === 0 &&
      spawn &&
      scouts.length === 0;
    if (shouldSpawnScout) {
      const initialTargets = this.getSurroundingRoomNames(room);
      Memory.roomStore[room.name].nextSpawn = {
        template: [MOVE],
        memory: {
          ...CreepBase.baseMemory,
          role: "scout",
          homeRoom: room.name,
          scoutPositions: initialTargets
        }
      };
    }
  }
  public static run(room: Room) {
    this.spawnScout(room);
  }
}
