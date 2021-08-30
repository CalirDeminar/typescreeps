import { CreepBase } from "roles/role.creep";
import { CreepBuilder } from "utils/creepBuilder";
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
  private static spawnReserver(
    room: Room,
    source: Source,
    roomRoute:
      | {
          exit: ExitConstant;
          room: string;
        }[]
      | -2
  ) {
    if (roomRoute !== -2 && roomRoute.length <= Constants.maxRemoteRoomDistance) {
      const reserverCreepCount = _.filter(
        Game.creeps,
        (c) => c.memory.role === "reserver" && c.memory.targetRoom === source.pos.roomName
      ).length;
      const needsReserver = reserverCreepCount < 1 && room.energyCapacityAvailable > 650;
      if (needsReserver) {
        Memory.roomStore[room.name].nextSpawn = {
          template: [MOVE, CLAIM],
          memory: {
            ...CreepBase.baseMemory,
            role: "reserver",
            working: false,
            born: Game.time,
            homeRoom: room.name,
            targetRoom: source.pos.roomName
          }
        };
      }
    }
  }
  private static spawnRemoteHarvester(
    room: Room,
    source: Source,
    roomRoute:
      | {
          exit: ExitConstant;
          room: string;
        }[]
      | -2
  ) {
    if (roomRoute !== -2 && roomRoute.length <= Constants.maxRemoteRoomDistance) {
      const harvesterCreepCount = _.filter(
        Game.creeps,
        (c) => c.memory.role === "harvesterShuttle" && c.memory.targetSource === source.id
      ).length;
      const needsHarvester = harvesterCreepCount < Constants.maxRemoteShuttles;
      if (needsHarvester) {
        Memory.roomStore[room.name].nextSpawn = {
          template: CreepBuilder.buildShuttleCreep(Math.min(room.energyCapacityAvailable, 1000)),
          memory: {
            ...CreepBase.baseMemory,
            role: "harvesterShuttle",
            working: false,
            born: Game.time,
            targetSource: source.id,
            targetSourcePos: source.pos,
            homeRoom: room.name,
            targetRoom: source.pos.roomName
          }
        };
      }
    }
  }
  private static spawnCombatants(room: Room, intel: remoteRoom, targetRoomName: string) {
    if (
      intel.hostileCreepCount < 2 &&
      intel.hostileTowerCount < 1 &&
      intel.invaderCore &&
      room.energyCapacityAvailable > 390
    ) {
      const currentDefenders = _.filter(
        Game.creeps,
        (c) => c.memory.role === "remoteDefender" && c.memory.targetRoom === targetRoomName
      );
      if (currentDefenders.length < 1) {
        const roomRoute = Game.map.findRoute(room.name, targetRoomName);
        const roomReachable = roomRoute !== -2 && roomRoute.length <= Constants.maxRemoteRoomDistance;
        if (roomReachable) {
          Memory.roomStore[room.name].nextSpawn = {
            template: [ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE],
            memory: {
              ...CreepBase.baseMemory,
              role: "remoteDefender",
              working: false,
              born: Game.time,
              targetRoom: targetRoomName,
              homeRoom: room.name
            }
          };
        }
      }
    }
  }
  private static runDefenderCreeps(targetRoomName: string): void {
    _.filter(Game.creeps, (c) => c.memory.role === "remoteDefender" && c.memory.targetRoom === targetRoomName).map(
      (c) => {
        if (c.pos.roomName !== targetRoomName) {
          const roomCenter = new RoomPosition(25, 25, targetRoomName);
          CreepBase.travelTo(c, roomCenter, "red", 23);
        } else {
          const invaderCore = c.room.find<StructureInvaderCore>(FIND_HOSTILE_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_INVADER_CORE
          })[0];
          const hostileCreep = c.pos.findClosestByPath(FIND_HOSTILE_CREEPS);
          const target = hostileCreep || invaderCore;
          if (target) {
            if (c.pos.isNearTo(target)) {
              c.attack(target);
            } else {
              CreepBase.travelTo(c, target, "red", 1);
            }
          }
        }
      }
    );
  }
  private static remoteHarvest(room: Room) {
    const remoteRooms = Memory.roomStore[room.name].remoteRooms;
    _.map(remoteRooms, (targetRoom, targetRoomName) => {
      if (targetRoomName) {
        this.doIntel(targetRoomName, room.name);
        if (!targetRoom.hostile) {
          const roomRoute = Game.map.findRoute(room.name, targetRoomName);
          targetRoom.sources.map((s) => {
            this.spawnReserver(room, s, roomRoute);
            this.spawnRemoteHarvester(room, s, roomRoute);
          });
        }
        this.runDefenderCreeps(targetRoomName);
        if (targetRoom.hostile) {
          this.spawnCombatants(room, targetRoom, targetRoomName);
        }
      }
    });
  }
  private static doIntel(roomName: string, baseRoom: string) {
    const room = Game.rooms[roomName];
    if (room) {
      const hostileCreepCount = room.find(FIND_HOSTILE_CREEPS).length;
      const hostileTowerCount = room.find(FIND_HOSTILE_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_TOWER
      }).length;
      const invaderCorePresent =
        room.find(FIND_HOSTILE_STRUCTURES, {
          filter: (s) => s.structureType === STRUCTURE_INVADER_CORE
        }).length > 0;
      const hostile = hostileCreepCount > 0 || room.find(FIND_HOSTILE_STRUCTURES).length > 0;
      const currentIntel = Memory.roomStore[baseRoom].remoteRooms[roomName];
      Memory.roomStore[baseRoom].remoteRooms[roomName] = {
        ...currentIntel,
        hostile: hostile,
        hostileCreepCount: hostileCreepCount,
        hostileTowerCount: hostileTowerCount,
        invaderCore: invaderCorePresent
      };
    }
  }
  public static run(room: Room) {
    this.spawnScout(room);
    this.remoteHarvest(room);
  }
}
