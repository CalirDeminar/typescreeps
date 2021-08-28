import { CreepBase } from "roles/role.creep";
import { CreepBuilder } from "utils/creepBuilder";
import { Constants } from "utils/constants";
export class RemoteManager {
  private static getSurroundingRoomNames(room: Room): RoomPosition[] {
    const baseName = room.name;
    const currentWestString = baseName.match(/^W(\d+)N\d+/);
    const currentNorthString = baseName.match(/^W\d+N(\d+)/);
    return [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ]
      .reduce((acc: RoomPosition[], c: { x: number; y: number }) => {
        if (currentWestString && currentNorthString) {
          const targetRoomName = `W${parseInt(currentWestString[1]) + c.x}N${parseInt(currentNorthString[1]) + c.y}`;
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
      Game.time %
        (Game.time % Constants.earlyScoutFrequency === 2
          ? Constants.earlyScoutFrequency
          : Constants.lateScoutFrequency) ===
        0 &&
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
  private static remoteHarvest(room: Room) {
    const remoteRooms = Memory.roomStore[room.name].remoteRooms;
    _.map(remoteRooms, (targetRoom, targetRoomName) => {
      if (!targetRoom.hostile && targetRoomName) {
        const roomRoute = Game.map.findRoute(room.name, targetRoomName);
        if (roomRoute !== -2 && roomRoute.length <= Constants.maxRemoteRoomDistance) {
          targetRoom.sources.map((s) => {
            const harvesterCreepCount = _.filter(
              Game.creeps,
              (c) => c.memory.role === "harvesterShuttle" && c.memory.targetSource === s.id
            ).length;
            const reserverCreepCount = _.filter(
              Game.creeps,
              (c) => c.memory.role === "reserver" && c.memory.targetRoom === s.pos.roomName
            ).length;
            const needsHarvester = harvesterCreepCount < Constants.maxRemoteShuttles;
            const needsReserver = reserverCreepCount < 1 && room.energyCapacityAvailable > 650;
            switch (true) {
              case needsReserver:
                Memory.roomStore[room.name].nextSpawn = {
                  template: [MOVE, CLAIM],
                  memory: {
                    ...CreepBase.baseMemory,
                    role: "reserver",
                    working: false,
                    born: Game.time,
                    homeRoom: room.name,
                    targetRoom: s.pos.roomName
                  }
                };
                break;
              case needsHarvester:
                Memory.roomStore[room.name].nextSpawn = {
                  template: CreepBuilder.buildShuttleCreep(room.energyCapacityAvailable),
                  memory: {
                    ...CreepBase.baseMemory,
                    role: "harvesterShuttle",
                    working: false,
                    born: Game.time,
                    targetSource: s.id,
                    targetSourcePos: s.pos,
                    homeRoom: room.name,
                    targetRoom: s.pos.roomName
                  }
                };
                break;
            }
          });
        }
      }
    });
  }
  public static getRemoteSourcePositions(room: Room): RoomPosition[] {
    const remoteRooms = Memory.roomStore[room.name].remoteRooms;
    return _.filter(remoteRooms, (targetRoom, targetRoomName) => {
      if (!targetRoom.hostile && targetRoomName) {
        const roomRoute = Game.map.findRoute(room.name, targetRoomName);
        if (roomRoute !== -2 && roomRoute.length <= Constants.maxRemoteRoomDistance) {
          return true;
        }
      }
      return false;
    }).reduce((acc: RoomPosition[], r) => {
      return acc.concat(r.sources.map((s) => s.pos));
    }, []);
  }
  public static run(room: Room) {
    this.spawnScout(room);
    this.remoteHarvest(room);
  }
}
