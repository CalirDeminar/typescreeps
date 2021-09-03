import { CreepBase } from "roles/role.creep";
import { Constants } from "utils/constants";
import { CreepBuilder } from "utils/creepBuilder";
import { UtilPosition } from "utils/util.position";

export class RemoteHarvestingDirector {
  private static isBoundary(x: number, y: number): boolean {
    const boundaries = [0, 49];
    return boundaries.includes(x) || boundaries.includes(y);
  }
  private static getRoadsToAnchor(remRoom: RemoteDirectorStore): RoomPosition[] {
    if (Object.keys(Game.rooms).includes(remRoom.roomName)) {
      const room = Game.rooms[remRoom.roomName];
      const anchor = Game.flags[remRoom.anchorId];
      const homeRoom = Game.rooms[anchor.pos.roomName];
      const roads = room
        .find(FIND_SOURCES)
        .reduce((acc: RoomPosition[], source: Source) => {
          // base road on boundry to exit closest to source
          const anchorToSourceExitDir = homeRoom.findExitTo(room.name);
          const sourceToAnchorExitDir = room.findExitTo(homeRoom.name);
          if (
            anchorToSourceExitDir !== -2 &&
            anchorToSourceExitDir !== -10 &&
            sourceToAnchorExitDir !== -2 &&
            sourceToAnchorExitDir !== -10
          ) {
            const sourceExit = source.pos.findClosestByPath(sourceToAnchorExitDir);
            const anchorExit = UtilPosition.getOtherSideOfExit(sourceExit || source.pos);
            if (anchorExit && sourceExit) {
              const sourcePath = source.pos
                .findPathTo(sourceExit, { ignoreCreeps: true, swampCost: 1 })
                .map((s) => new RoomPosition(s.x, s.y, source.pos.roomName));
              const anchorPath = anchor.pos
                .findPathTo(anchorExit, { ignoreCreeps: true, swampCost: 1 })
                .map((s) => new RoomPosition(s.x, s.y, anchor.pos.roomName));
              return acc.concat(sourcePath).concat(anchorPath);
            }
          }
          return acc;
        }, [])
        .filter((p) => !this.isBoundary(p.x, p.y));
      return roads;
    }
    return [];
  }
  private static runConstruction(room: RemoteDirectorStore, index: number): void {
    // should generate roads from sources to anchor as soon as level requirement is met. This path calc should only be done once, and flagged as such
    // This is done for the remote room and the home room

    // TODO - test remote room -> home room road intersection. They should connect across the same set of transfer tiles
    const homeRoom = Game.rooms[room.homeRoomName];
    if (homeRoom) {
      const homeController = homeRoom.controller;
      const level = homeController ? homeController.level : 0;
      if (!room.roadsPathed) {
        // if (true) {
        const roads = this.getRoadsToAnchor(room);
        Memory.roomStore[room.homeRoomName].remoteDirector[index] = {
          ...Memory.roomStore[room.homeRoomName].remoteDirector[index],
          roadQueue: roads,
          roadsPathed: true
        };
      }
      if (!room.roadsConstructed && room.roadQueue.length > 0 && level >= 3) {
        // remote room
        const remRoom = Game.rooms[room.roomName];
        if (remRoom) {
          const remRoomHasConstructionSite = remRoom.find(FIND_CONSTRUCTION_SITES).length > 0;
          if (!remRoomHasConstructionSite) {
            const nextSite = room.roadQueue.find((p) => {
              p = new RoomPosition(p.x, p.y, p.roomName);
              return p.roomName === remRoom.name && p.lookFor(LOOK_STRUCTURES).length === 0;
            });
            if (nextSite) {
              remRoom.createConstructionSite(nextSite.x, nextSite.y, STRUCTURE_ROAD);
            }
          }
        }
        // home room
        const homeRoomHasConstructionSite = homeRoom.find(FIND_CONSTRUCTION_SITES).length > 0;
        if (!homeRoomHasConstructionSite) {
          const nextSite = room.roadQueue.find(
            (p) =>
              p.roomName === homeRoom.name &&
              new RoomPosition(p.x, p.y, p.roomName).lookFor(LOOK_STRUCTURES).length === 0
          );
          if (nextSite) {
            homeRoom.createConstructionSite(nextSite.x, nextSite.y, STRUCTURE_ROAD);
          }
        }

        // check roads done
        if (!room.roadQueue.find((p) => new RoomPosition(p.x, p.y, p.roomName).lookFor(LOOK_STRUCTURES).length === 0)) {
          Memory.roomStore[room.homeRoomName].remoteDirector[index] = {
            ...Memory.roomStore[room.homeRoomName].remoteDirector[index],
            roadsConstructed: true
          };
        }
      }
    }
  }
  private static updateRoomFromIntel(room: RemoteDirectorStore, index: number): void {
    const intel = Memory.roomStore[room.homeRoomName].remoteRooms[room.roomName];
    if (room.roomName in Object.keys(Game.rooms)) {
      const localRoom = Game.rooms[room.roomName];
      // update remoteDirectorStore
      const hostileCreeps = localRoom.find(FIND_HOSTILE_CREEPS);
      const hasInvaderCore =
        localRoom.find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_INVADER_CORE }).length > 0;
      const hostileTowerCount = localRoom.find(FIND_HOSTILE_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_TOWER
      }).length;
      Memory.roomStore[room.homeRoomName].remoteDirector[index] = {
        ...Memory.roomStore[room.homeRoomName].remoteDirector[index],
        hasInvaderCore: hasInvaderCore,
        hostileCreepCount: hostileCreeps.length,
        hasHostileCreeps: hostileCreeps.length > 0,
        hostileTowerCount: hostileTowerCount
      };
      Memory.roomStore[room.homeRoomName].remoteRooms[room.roomName] = {
        ...Memory.roomStore[room.homeRoomName].remoteRooms[room.roomName],
        invaderCore: hasInvaderCore,
        hostileCreepCount: hostileCreeps.length,
        hostileTowerCount: hostileTowerCount
      };
      // update remoteRooms store
    } else if (intel) {
      Memory.roomStore[room.homeRoomName].remoteDirector[index] = {
        ...Memory.roomStore[room.homeRoomName].remoteDirector[index],
        hasInvaderCore: intel.invaderCore,
        hostileCreepCount: intel.hostileCreepCount,
        hasHostileCreeps: intel.hostileCreepCount > 0,
        hostileTowerCount: intel.hostileTowerCount
      };
    }
  }
  private static addRoomsToRemote(roomName: string): void {
    if (Game.time % 100 === 0) {
      const intel = Memory.roomStore[roomName].remoteRooms;
      _.map(intel, (intelRoom, intelRoomName) => {
        const alreadyRemoteHarvesting = !!Memory.roomStore[roomName].remoteDirector.find((rd) => {
          return rd.roomName === intelRoomName;
        });
        if (intelRoomName && !alreadyRemoteHarvesting) {
          const route = Game.map.findRoute(roomName, intelRoomName);
          const homeRoom = Game.rooms[roomName];
          const anchor = Game.rooms[roomName].find(FIND_FLAGS, {
            filter: (f) => f.name === `${roomName}-Anchor`
          })[0];
          if (route !== -2 && route.length < 2 && intelRoom.sources.length > 0 && homeRoom.controller) {
            const sources = intelRoom.sources.map((s) => {
              return { sourceId: s.id, targetContainerId: null };
            });
            Memory.roomStore[roomName].remoteDirector = Memory.roomStore[roomName].remoteDirector.concat([
              {
                roomName: intelRoom.name,
                homeRoomName: anchor.pos.roomName,
                anchorId: anchor ? anchor.name : "",
                controllerId: homeRoom.controller.id,
                sources: sources,
                roadQueue: [],
                roadsPathed: false,
                roadsConstructed: false,
                hasInvaderCore: intelRoom.invaderCore,
                hasHostileCreeps: intelRoom.hostileCreepCount > 0,
                hostileCreepCount: intelRoom.hostileCreepCount,
                hostileTowerCount: intelRoom.hostileTowerCount
              }
            ]);
          }
        }
      });
    }
  }
  private static spawnHarvesters(room: RemoteDirectorStore): void {
    const sources = room.sources;
    sources.find((s) => {
      const harvesters = _.filter(
        Game.creeps,
        (c) =>
          c.memory.role === "remoteHarvester" &&
          c.memory.homeRoom === room.homeRoomName &&
          c.memory.targetSource === s.sourceId
      );
      const isSpawning =
        Memory.roomStore[room.homeRoomName].nextSpawn &&
        (Memory.roomStore[room.homeRoomName].nextSpawn?.memory.role.includes("harvester") ||
          Memory.roomStore[room.homeRoomName].nextSpawn?.memory.role.includes("Harvester"));
      if (harvesters.length < Constants.maxRemoteShuttles && !isSpawning) {
        const maxEnergy = Math.min(Game.rooms[room.homeRoomName].energyCapacityAvailable, 1200);
        Memory.roomStore[room.homeRoomName].nextSpawn = {
          template: CreepBuilder.buildShuttleCreep(maxEnergy),
          memory: {
            ...CreepBase.baseMemory,
            homeRoom: room.homeRoomName,
            targetRoom: room.roomName,
            targetSource: s.sourceId,
            role: "remoteHarvester",
            working: true
          }
        };
      }
    });
  }
  private static setWorkingState(creep: Creep) {
    const working = creep.memory.working;
    const workParts = creep.body.filter((p) => p.type === WORK).length;
    const full = creep.store.getFreeCapacity() < workParts * 2;
    const empty = creep.store.getUsedCapacity() === 0;
    if (!working && empty) {
      creep.memory.working = true;
      creep.memory.dropOffTarget = "";
    } else if (working && full) {
      creep.memory.working = false;
    }
  }
  private static runHarvester(creep: Creep, anchor: Flag, constructionSite: ConstructionSite | null): void {
    if (creep.ticksToLive) {
      const source = Game.getObjectById<Source>(creep.memory.targetSource);
      this.setWorkingState(creep);
      CreepBase.maintainRoad(creep);
      const working = creep.memory.working;
      switch (true) {
        case working && source && creep.pos.isNearTo(source.pos):
          if (source && source.energy > 0) {
            creep.harvest(source);
          }
          break;
        case working && source && !creep.pos.isNearTo(source.pos):
          if (source) {
            CreepBase.travelTo(creep, source.pos, "orange");
          }
          break;
        case working && creep.pos.roomName !== creep.memory.targetRoom:
          CreepBase.travelToRoom(creep, "orange", creep.memory.targetRoom);
          break;
        case !working && creep.pos.roomName !== creep.memory.homeRoom:
          if (constructionSite) {
            if (creep.pos.inRangeTo(constructionSite, 3)) {
              creep.build(constructionSite);
            } else {
              CreepBase.travelTo(creep, constructionSite, "orange");
            }
          } else {
            CreepBase.travelTo(creep, anchor, "orange");
          }
          break;
        case !working && creep.pos.roomName === creep.memory.homeRoom:
          const storeTarget =
            CreepBase.findStorage(creep) ||
            CreepBase.findContainer(creep) ||
            CreepBase.findSpawn(creep) ||
            CreepBase.findExtension(creep);
          if (storeTarget && source) {
            if (creep.pos.isNearTo(storeTarget)) {
              creep.transfer(storeTarget, RESOURCE_ENERGY);
              if (creep.pos.isNearTo(source)) {
                if (source.energy > 0) {
                  creep.harvest(source);
                }
                creep.memory.working = true;
              }
            } else {
              CreepBase.travelTo(creep, storeTarget, "orange");
            }
          }
          break;
      }
    }
  }
  private static runHarvesters(room: RemoteDirectorStore): void {
    const remRoom = Game.rooms[room.roomName];
    const anchor = Game.flags[room.anchorId];
    const constructionSite = remRoom
      ? remRoom
          .find(FIND_CONSTRUCTION_SITES)
          .sort((a, b) => a.progressTotal - a.progress - (b.progressTotal - b.progress))[0]
      : null;

    const harvesters = _.filter(
      Game.creeps,
      (c) => c.memory.role === "remoteHarvester" && c.memory.targetRoom === room.roomName
    );
    harvesters.map((creep) => {
      this.runHarvester(creep, anchor, constructionSite);
    });
  }
  private static runDefense(room: RemoteDirectorStore): void {
    const homeRoom = Game.rooms[room.homeRoomName];
    const spawning = Memory.roomStore[room.homeRoomName].nextSpawn !== null;
    const defenderCost = 390;
    const currentDefenders = _.filter(
      Game.creeps,
      (c) => c.memory.role === "remoteDefender" && c.memory.targetRoom === room.roomName
    );
    const spawnDefender =
      !spawning &&
      (room.hostileCreepCount === 1 || room.hasInvaderCore) &&
      room.hostileTowerCount === 0 &&
      homeRoom.energyCapacityAvailable > defenderCost;
    if (spawnDefender && currentDefenders.length < 1) {
      const roomRoute = Game.map.findRoute(homeRoom.name, room.roomName);
      const roomReachable = roomRoute !== -2 && roomRoute.length <= Constants.maxRemoteRoomDistance;
      if (roomReachable) {
        Memory.roomStore[homeRoom.name].nextSpawn = {
          template: [ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE],
          memory: {
            ...CreepBase.baseMemory,
            role: "remoteDefender",
            working: false,
            born: Game.time,
            targetRoom: room.roomName,
            homeRoom: homeRoom.name
          }
        };
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
          if (target && creep.pos.isNearTo(target)) {
            creep.attack(target);
          } else if (target) {
            CreepBase.travelTo(creep, target, "red");
          }
        }
      }
    });
  }
  private static runReserver(room: RemoteDirectorStore): void {
    const homeRoom = Game.rooms[room.homeRoomName];
    const spawning = Memory.roomStore[room.homeRoomName].nextSpawn !== null;
    const reservers = _.filter(
      Game.creeps,
      (c) => c.memory.role === "reserver" && c.memory.targetRoom === room.roomName
    );
    const reserverNearDeath = reservers.filter((c) => c.ticksToLive && c.ticksToLive < 100).length > 0;
    const needsReserver =
      (reservers.length < 1 || (reservers.length === 1 && reserverNearDeath)) &&
      !spawning &&
      homeRoom.energyCapacityAvailable > 750;
    if (needsReserver) {
      Memory.roomStore[room.homeRoomName].nextSpawn = {
        template: [MOVE, CLAIM],
        memory: {
          ...CreepBase.baseMemory,
          role: "reserver",
          homeRoom: room.homeRoomName,
          targetRoom: room.roomName
        }
      };
    }
    reservers.map((creep) => {
      const controller = Game.rooms[room.roomName] ? Game.rooms[room.roomName].controller : undefined;
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
            if (controller && controller.reservation === undefined) {
              creep.reserveController(controller);
            } else if (controller) {
              creep.attackController(controller);
            }
            break;
        }
      }
    });
  }
  private static runRoom(room: RemoteDirectorStore, index: number) {
    this.updateRoomFromIntel(room, index);
    this.runConstruction(room, index);
    this.spawnHarvesters(room);
    this.runHarvesters(room);
    this.runDefense(room);
    this.runReserver(room);
  }
  private static getRemoteRooms(room: Room): RemoteDirectorStore[] {
    return _.map(Memory.roomStore[room.name].remoteDirector, (r) => r);
  }
  public static run(room: Room): void {
    this.addRoomsToRemote(room.name);
    this.getRemoteRooms(room).map((r, i) => this.runRoom(r, i));
  }
}
