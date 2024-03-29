import { Constants } from "utils/constants";
import { RemoteHarvester } from "./remoteHarvesting/remoteHarvester";
import { RemoteHauler } from "./remoteHarvesting/remoteHauler";
import { RemoteReserver } from "./remoteHarvesting/remoteReserver";
import { RemoteSpawning } from "./remoteHarvesting/remoteSpawning";
export class RemoteHarvestingDirector {
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
    // const isFirstOwnedRoom = _.filter(Game.rooms, (room, key) => room.controller && room.controller.my).length <= 1;
    const currentBorders = Object.values(Game.map.describeExits(roomName)).filter((n) => {
      if (n) {
        const exitDir = Game.rooms[roomName].findExitTo(n);
        if (exitDir !== -2 && exitDir !== -10) {
          const exit = Game.rooms[roomName].find(exitDir, { filter: (p) => p.lookFor(LOOK_STRUCTURES).length === 0 });
          return exit.length > 0;
        }
      }
      return false;
    });
    const intel = Memory.scoutingDirector.scoutedRooms;
    const scoutedRooms = intel.map((r) => r.name);
    if (
      ((Game.time + Constants.remoteHarvestingTimingOffset) % 100 === 0 ||
        Memory.roomStore[roomName].remoteDirector.length === 0) &&
      currentBorders.every((b) => b && scoutedRooms.includes(b))
    ) {
      const currentRooms = Object.values(Memory.roomStore).reduce(
        (acc: string[], s) => acc.concat(s.remoteDirector.map((rd) => rd.roomName)),
        []
      );
      const availableDoubleSourceRooms = intel.filter((r) => r.sources.length === 2 && !currentRooms.includes(r.name));
      const availableSingleSourceRooms = intel.filter((r) => r.sources.length === 1 && !currentRooms.includes(r.name));
      const intelRoom = availableDoubleSourceRooms[0] || availableSingleSourceRooms[0] || undefined;
      if (intelRoom) {
        const anchor = Game.rooms[roomName].find(FIND_FLAGS, {
          filter: (f) => f.name === `${roomName}-Anchor`
        })[0];
        const roomRoute = Game.map.findRoute(roomName, intelRoom.name);
        const allReachable =
          intelRoom.sources.filter((s) => {
            const path = PathFinder.search(anchor.pos, { pos: s.pos, range: 1 }, { maxOps: 1000 });
            return !path.incomplete;
          }).length === intelRoom.sources.length;
        const homeRoom = Game.rooms[roomName];

        if (
          roomRoute !== -2 &&
          roomRoute.length < 2 &&
          allReachable &&
          intelRoom.sources.length > 0 &&
          homeRoom.controller
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
    const haulers = _.filter(
      Game.creeps,
      (c) =>
        c.memory.role === "remoteHauler" &&
        c.memory.targetRoom === room.roomName &&
        c.memory.homeRoom === room.homeRoomName
    );
    harvesters.map((creep) => {
      RemoteHarvester.runHarvester(creep, anchor, constructionSite);
    });
    haulers.map((creep) => RemoteHauler.runRemote(creep, anchor));
  }

  private static runRoom(room: RemoteDirectorStore, index: number) {
    let cpu = Game.cpu.getUsed();
    let lastCpu = cpu;
    this.updateRoomFromIntel(room, index);
    cpu = Game.cpu.getUsed();
    const updateRoomsCpu = cpu - lastCpu;
    lastCpu = cpu;
    RemoteSpawning.spawnCreeps(room, index);
    cpu = Game.cpu.getUsed();
    const spawnHarvesterCpu = cpu - lastCpu;
    lastCpu = cpu;
    this.runHarvesters(room);
    cpu = Game.cpu.getUsed();
    const runHarvesterCpu = cpu - lastCpu;
    lastCpu = cpu;
    RemoteReserver.runReserver(room);
    cpu = Game.cpu.getUsed();
    // const runReserverCpu = cpu - lastCpu;
    // _.filter(Game.creeps, (c) => c.memory.role === "remoteHauler" && c.memory.homeRoom === room.roomName && c.memory.targetRoom && )
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
