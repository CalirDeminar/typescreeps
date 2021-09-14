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
    const anchor = Game.flags[remRoom.anchorId];
    if (Object.keys(Game.rooms).includes(remRoom.roomName) && Object.keys(Game.rooms).includes(anchor.pos.roomName)) {
      const room = Game.rooms[remRoom.roomName];
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
            if (sourceExit) {
              const anchorExit = UtilPosition.getOtherSideOfExit(sourceExit);
              if (anchorExit && sourceExit) {
                const sourcePath = source.pos
                  .findPathTo(sourceExit, { ignoreCreeps: true, swampCost: 1 })
                  .map((s) => new RoomPosition(s.x, s.y, source.pos.roomName));
                const anchorPath = anchor.pos
                  .findPathTo(anchorExit, {
                    ignoreCreeps: true,
                    swampCost: 1,
                    costCallback: (roomName, costMatrix) => {
                      const store = Memory.roomStore[roomName]?.constructionDirector;
                      if (store) {
                        const obsticals = store.extensionTemplate
                          .concat(store.towerTemplate)
                          .concat(Memory.roomStore[roomName].defenseDirector.wallMap)
                          .concat(store.labTemplate)
                          .concat(store.singleStructures.map((s) => s.pos));
                        obsticals.map((ext) => costMatrix.set(ext.x, ext.y, 10));
                      }
                    }
                  })
                  .map((s) => new RoomPosition(s.x, s.y, anchor.pos.roomName));
                return acc.concat(sourcePath).concat(anchorPath);
              }
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
      // Roads to Source and around Core
      if (!room.roadsPathed && Object.keys(Game.rooms).includes(room.roomName)) {
        // if (true) {
        const roads = this.getRoadsToAnchor(room);
        Memory.roomStore[room.homeRoomName].remoteDirector[index] = {
          ...Memory.roomStore[room.homeRoomName].remoteDirector[index],
          roadQueue: roads,
          roadsPathed: roads && roads.length > 0 ? true : false
        };
      }
      if (!room.roadsConstructed && room.roadQueue.length > 0 && level > 3) {
        // remote room
        const remRoom = Object.keys(Game.rooms).includes(room.roomName) ? Game.rooms[room.roomName] : null;
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
        if (!Memory.roomStore[homeRoom.name].buildingThisTick) {
          const nextSite = room.roadQueue.find(
            (p) =>
              p.roomName === homeRoom.name &&
              Object.keys(Game.rooms).includes(p.roomName) &&
              new RoomPosition(p.x, p.y, p.roomName)
                .lookFor(LOOK_STRUCTURES)
                .filter((s) => s.structureType !== STRUCTURE_RAMPART).length === 0
          );
          if (nextSite) {
            const rtn = homeRoom.createConstructionSite(nextSite.x, nextSite.y, STRUCTURE_ROAD);
            Memory.roomStore[homeRoom.name].buildingThisTick = rtn === OK;
          }
        }

        // check roads done
        if (
          !room.roadQueue.find(
            (p) =>
              Object.keys(Game.rooms).includes(p.roomName) &&
              new RoomPosition(p.x, p.y, p.roomName).lookFor(LOOK_STRUCTURES).length === 0
          )
        ) {
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
    if (Object.keys(Game.rooms).includes(room.roomName)) {
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
    if ((Game.time + Constants.remoteHarvestingTimingOffset) % 100 === 0) {
      const intel = Memory.roomStore[roomName].scoutingDirector.scoutedRooms;
      _.map(intel, (intelRoom) => {
        const alreadyRemoteHarvesting = Object.values(Memory.roomStore)
          .reduce((acc: string[], roomStore) => acc.concat(roomStore.remoteDirector.map((rd) => rd.roomName)), [])
          .includes(intelRoom.name);
        if (!alreadyRemoteHarvesting) {
          const roomRoute = Game.map.findRoute(roomName, intelRoom.name);
          const homeRoom = Game.rooms[roomName];
          const anchor = Game.rooms[roomName].find(FIND_FLAGS, {
            filter: (f) => f.name === `${roomName}-Anchor`
          })[0];
          const isFirstOwnedRoom =
            _.filter(Game.rooms, (room, key) => room.controller && room.controller.my).length <= 1;
          if (
            roomRoute !== -2 &&
            roomRoute.length < 2 &&
            intelRoom.sources.length > 0 &&
            homeRoom.controller &&
            isFirstOwnedRoom
          ) {
            const sources = intelRoom.sources.map((s) => {
              return { sourceId: s.id, targetContainerId: null };
            });
            Memory.roomStore[roomName].remoteDirector = Memory.roomStore[roomName].remoteDirector.concat([
              {
                roomName: intelRoom.name,
                homeRoomName: anchor.pos.roomName,
                anchorId: anchor ? anchor.name : "",
                controllerId: intelRoom.controller ? intelRoom.controller.id : "",
                sources: sources,
                roadQueue: [],
                roadsPathed: false,
                roadsConstructed: false,
                hasInvaderCore: intelRoom.invaderCore !== null,
                hasHostileCreeps: false,
                hostileCreepCount: 0,
                hostileTowerCount: intelRoom.towers.length
              }
            ]);
          }
        }
      });
    }
  }
  private static spawnHarvesters(room: RemoteDirectorStore): void {
    const sources = room.sources;
    const hostile = room.hostileCreepCount > 0 || room.hostileTowerCount > 0 || room.hasInvaderCore;
    sources.find((s) => {
      const harvesters = _.filter(
        Game.creeps,
        (c) =>
          c.memory.role === "remoteHarvester" &&
          c.memory.homeRoom === room.homeRoomName &&
          c.memory.targetSource === s.sourceId
      );
      const harvestersInQueue = Memory.roomStore[room.homeRoomName].spawnQueue.filter(
        (c) =>
          c.memory.role === "remoteHarvester" &&
          c.memory.homeRoom === room.homeRoomName &&
          c.memory.targetSource === s.sourceId
      );
      if (harvesters.length + harvestersInQueue.length < Constants.maxRemoteShuttles && !hostile) {
        const maxEnergy = Math.min(Game.rooms[room.homeRoomName].energyCapacityAvailable, 1200);
        Memory.roomStore[room.homeRoomName].spawnQueue.push({
          template: CreepBuilder.buildShuttleCreep(maxEnergy),
          memory: {
            ...CreepBase.baseMemory,
            homeRoom: room.homeRoomName,
            targetRoom: room.roomName,
            targetSource: s.sourceId,
            role: "remoteHarvester",
            working: true
          }
        });
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
    if (creep.ticksToLive && !CreepBase.fleeHostiles(creep)) {
      // TODO - periodic huge CPU spike from this function on the % 100 tick mark
      let cpu = Game.cpu.getUsed();
      let lastCpu = cpu;
      const source = Game.getObjectById<Source>(creep.memory.targetSource);
      const remRoom = Memory.roomStore[creep.memory.homeRoom].remoteDirector.find(
        (r) => r.roomName === creep.memory.targetRoom
      );
      const targetRoomHostile = remRoom ? remRoom.hostileCreepCount > 0 : false;
      this.setWorkingState(creep);
      CreepBase.maintainRoad(creep);
      const working = creep.memory.working;
      cpu = Game.cpu.getUsed();
      const setupCpu = cpu - lastCpu;
      lastCpu = cpu;
      let lastAction = "";
      switch (true) {
        case working && source && creep.pos.isNearTo(source.pos):
          if (source && source.energy > 0) {
            creep.harvest(source);
          }
          lastAction = "harvest";
          break;
        case working && source && !creep.pos.isNearTo(source.pos):
          if (source) {
            CreepBase.travelTo(creep, source.pos, "orange", 1);
            lastAction = "travelToSource";
          }
          break;
        case targetRoomHostile &&
          creep.pos.roomName !== creep.memory.targetRoom &&
          UtilPosition.isBoundary(creep.pos.x, creep.pos.y):
          CreepBase.travelTo(creep, anchor, "orange", 3);
          lastAction = "travelOverBoundary";
          break;
        case working && !targetRoomHostile && creep.pos.roomName !== creep.memory.targetRoom:
          CreepBase.travelToRoom(creep, "orange", creep.memory.targetRoom);
          lastAction = "travelToTargetRoom";
          break;
        case !working && creep.pos.roomName !== creep.memory.homeRoom:
          if (constructionSite) {
            if (creep.pos.inRangeTo(constructionSite, 3)) {
              creep.build(constructionSite);
              lastAction = "build";
            } else {
              CreepBase.travelTo(creep, constructionSite, "orange", 2);
              lastAction = "travelToConSite";
            }
          } else {
            CreepBase.travelTo(creep, anchor, "orange", 5);
            lastAction = "travelToHomeRoom";
          }
          break;
        case !working && creep.pos.roomName === creep.memory.homeRoom:
          const storeTarget =
            CreepBase.findStorage(creep) ||
            CreepBase.findContainer(creep) ||
            CreepBase.findSpawn(creep) ||
            CreepBase.findExtension(creep);
          if (storeTarget) {
            if (creep.pos.isNearTo(storeTarget)) {
              creep.transfer(storeTarget, RESOURCE_ENERGY);
              lastAction = "transferCargo";
            } else {
              CreepBase.travelTo(creep, storeTarget, "orange", 1);
              lastAction = "travelToStore";
            }
          }
          break;
      }
      cpu = Game.cpu.getUsed();
      const actionCpu = cpu - lastCpu;
      // if (actionCpu > 1) {
      //   console.log(
      //     `Remote harvester: ${creep.name} - setup: ${setupCpu.toPrecision(2)} - action: ${actionCpu.toPrecision(
      //       2
      //     )} - ${lastAction}`
      //   );
      // }
    }
  }
  private static runHarvesters(room: RemoteDirectorStore): void {
    const remRoom = Object.keys(Game.rooms).includes(room.roomName) ? Game.rooms[room.roomName] : null;
    const anchor = Game.flags[room.anchorId];
    const constructionSite = remRoom
      ? remRoom
          .find(FIND_CONSTRUCTION_SITES)
          .sort((a, b) => a.progressTotal - a.progress - (b.progressTotal - b.progress))[0]
      : null;

    const harvesters = _.filter(
      Game.creeps,
      (c) =>
        c.memory.role === "remoteHarvester" &&
        c.memory.targetRoom === room.roomName &&
        c.memory.homeRoom === room.homeRoomName
    );
    harvesters.map((creep) => {
      this.runHarvester(creep, anchor, constructionSite);
    });
  }
  private static runDefense(room: RemoteDirectorStore): void {
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
          template: [TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK],
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
    const needsReserver =
      (reservers.length + spawningReservers.length < 1 || (reservers.length === 1 && reserverNearDeath)) &&
      homeRoom.energyCapacityAvailable > 1000 &&
      !hostile;
    if (needsReserver) {
      const template = {
        template: [MOVE, CLAIM],
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
    let cpu = Game.cpu.getUsed();
    let lastCpu = cpu;
    this.updateRoomFromIntel(room, index);
    cpu = Game.cpu.getUsed();
    const updateRoomsCpu = cpu - lastCpu;
    lastCpu = cpu;
    this.runConstruction(room, index);
    cpu = Game.cpu.getUsed();
    const constructionCpu = cpu - lastCpu;
    lastCpu = cpu;
    this.spawnHarvesters(room);
    cpu = Game.cpu.getUsed();
    const spawnHarvesterCpu = cpu - lastCpu;
    lastCpu = cpu;
    this.runHarvesters(room);
    cpu = Game.cpu.getUsed();
    const runHarvesterCpu = cpu - lastCpu;
    lastCpu = cpu;
    this.runDefense(room);
    cpu = Game.cpu.getUsed();
    const runDefenseCpu = cpu - lastCpu;
    lastCpu = cpu;
    this.runReserver(room);
    cpu = Game.cpu.getUsed();
    const runReserverCpu = cpu - lastCpu;
    if (room.hostileCreepCount > 0 && room.hostileCreepCount < 2) {
      console.log(`Hostiles in room: ${room.roomName}`);
    }
    if (Game.time % 5 === 0) {
      // console.log(
      //   `Run Remote Room CPU Usage:` +
      //     `Update Rooms: ${updateRoomsCpu.toPrecision(3)} ` +
      //     `Run Construction: ${constructionCpu.toPrecision(3)} ` +
      //     `Spawn Harvester CPU: ${spawnHarvesterCpu.toPrecision(3)}  ` +
      //     `Run Harvester CPU: ${runHarvesterCpu.toPrecision(3)}  ` +
      //     `Run Defense Cpu: ${runDefenseCpu.toPrecision(3)} ` +
      //     `Run Reserver CPU: ${runReserverCpu.toPrecision(3)}`
      // );
    }
  }
  private static getRemoteRooms(room: Room): RemoteDirectorStore[] {
    return _.map(Memory.roomStore[room.name].remoteDirector, (r) => r);
  }
  public static run(room: Room): void {
    this.addRoomsToRemote(room.name);
    this.getRemoteRooms(room).map((r, i) => this.runRoom(r, i));
  }
}
