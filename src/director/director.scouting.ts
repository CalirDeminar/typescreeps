import { Constants } from "utils/constants";
import { CreepBase } from "roles/role.creep";
import { ExpansionScouting } from "./scoutingExpansions/expansionScouting";
import { CoreRoomPlanner } from "./core/director.roomPlanner";
import { packPosList, unpackPosList } from "utils/packrat";
export class ScoutingDirector {
  private static getFreeRoomTiles(roomName: string): RoomPosition[] {
    const terrain = Game.map.getRoomTerrain(roomName);
    return _.range(3, 46)
      .reduce((acc: RoomPosition[], x) => {
        return acc.concat(
          _.range(3, 46).map((y) => {
            return new RoomPosition(x, y, roomName);
          })
        );
      }, [])
      .filter((pos) => terrain.get(pos.x, pos.y) !== 1);
  }
  private static getRoomCenter(roomName: string): RoomPosition {
    return new RoomPosition(25, 25, roomName);
  }
  private static getSurroundingRoomNames(room: string): RoomPosition[] {
    const exitMap = Game.map.describeExits(room);
    return Object.entries(exitMap)
      .filter((n) => {
        if (n[1] && Game.rooms[room]) {
          const exitDir = Game.rooms[room].findExitTo(n[1]);
          if (exitDir !== -2 && exitDir !== -10) {
            const exit = Game.rooms[room].find(exitDir, { filter: (p) => p.lookFor(LOOK_STRUCTURES).length === 0 });
            return exit.length > 0;
          }
        }
        return false;
      })
      .reduce((acc: RoomPosition[], r) => {
        if (r[1]) {
          return acc.concat(this.getRoomCenter(r[1]));
        }
        return acc;
      }, []);
  }
  private static getExits(creep: Creep): RoomPosition[] {
    const room = creep.room;
    const exitMap = Game.map.describeExits(room.name);
    const rtn = Object.entries(exitMap)
      .reduce((acc: RoomPosition[], r) => {
        if (r[1]) {
          return acc.concat(this.getRoomCenter(r[1]));
        }
        return acc;
      }, [])
      .filter((r) => !creep.memory.scoutPositions.some((p) => r.roomName === p.roomName));
    return rtn.filter((r) => {
      const path = PathFinder.search(creep.pos, r, { maxOps: 1000 });
      const blockedByStructures = path.path
        .filter((p) => p.roomName === creep.pos.roomName)
        .some((r) => r.lookFor(LOOK_STRUCTURES).filter((s) => s.structureType === STRUCTURE_WALL).length > 0);
      // console.log(
      //   `Path to: ${r.roomName} - Incomplete: ${path.incomplete} - Blocked By Structure: ${blockedByStructures}`
      // );
      return !path.incomplete && !blockedByStructures;
    });
  }
  private static recordRoom(creep: Creep): void {
    const room = creep.room;
    const roomExists = Memory.scoutingDirector.scoutedRooms.map((r) => r.name).includes(creep.room.name);
    if (!roomExists) {
      const sources = room.find(FIND_SOURCES).map((s) => {
        return { id: s.id, pos: s.pos };
      });
      const m = room.find(FIND_MINERALS)[0];
      const mineral = m ? { id: m.id, pos: m.pos, mineralType: m.mineralType } : null;
      const controller = room.controller
        ? {
            id: room.controller.id,
            pos: room.controller.pos,
            owner: room.controller.owner?.username || null,
            reservation: room.controller.reservation?.username || null
          }
        : null;
      const d = room.find(FIND_DEPOSITS)[0];
      const deposit = d
        ? { id: d.id, type: d.depositType, pos: d.pos, ticksToDecay: d.ticksToDecay, lastCooldown: d.lastCooldown }
        : null;
      const pb = room.find<StructurePowerBank>(FIND_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_POWER_BANK
      })[0];
      const powerBank = pb ? { id: pb.id, pos: pb.pos, power: pb.power } : null;
      const keeperLair = room.find<StructureKeeperLair>(FIND_HOSTILE_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_KEEPER_LAIR
      });
      const ic = room.find<StructureInvaderCore>(FIND_HOSTILE_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_INVADER_CORE
      })[0];
      const invaderCore = ic ? { id: ic.id, pos: ic.pos } : null;
      const towers = room.find<StructureTower>(FIND_HOSTILE_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_TOWER
      });
      const freeTileFilterPositions = sources.map((s) => s.pos);
      if (mineral) {
        freeTileFilterPositions.push(mineral.pos);
      }
      if (room.controller) {
        freeTileFilterPositions.push(room.controller.pos);
      }
      const filterX = freeTileFilterPositions.map((p) => p.x);
      const filterY = freeTileFilterPositions.map((p) => p.y);
      const filterLimits = {
        xMin: Math.min(...filterX),
        xMax: Math.max(...filterX),
        yMin: Math.min(...filterY),
        yMax: Math.max(...filterY)
      };
      const record = {
        sources: sources,
        mineral: mineral,
        controller: controller,
        deposit: deposit,
        powerBank: powerBank,
        keeperLair: keeperLair,
        invaderCore: invaderCore,
        towers: towers,
        terrain: {},
        name: room.name,
        settleableTiles: packPosList([]),
        settlingScanningIndex: 0,
        freeTiles: packPosList(
          this.getFreeRoomTiles(room.name).filter(
            (p) =>
              p.x > filterLimits.xMin && p.x < filterLimits.xMax && p.y > filterLimits.yMin && p.y < filterLimits.yMax
          )
        ),
        doneScanning: false
      };
      Memory.scoutingDirector.scoutedRooms = Memory.scoutingDirector.scoutedRooms.concat(record);
    }
  }
  private static runScouts(room: Room): void {
    _.filter(Game.creeps, (c) => c.memory.role === "scout" && c.memory.homeRoom === room.name).map((creep) => {
      if (creep.ticksToLive) {
        const positions = creep.memory.scoutPositions;
        const nextPosition = positions[0];
        if (creep.room.name !== creep.memory.homeRoom) {
          this.recordRoom(creep);
        }
        switch (true) {
          case positions.length === 0:
            creep.suicide();
            break;
          case creep.room.name === nextPosition.roomName:
            // get room exits and names to visit next
            const sliced = creep.memory.scoutPositions.slice(1);
            const adjacentRooms = this.getExits(creep);
            creep.memory.scoutPositions = sliced.concat(adjacentRooms);
            break;
          default:
            const target = new RoomPosition(nextPosition.x, nextPosition.y, nextPosition.roomName);
            const avoids = creep.room
              .find(FIND_STRUCTURES, {
                filter: (s) => s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_RAMPART
              })
              .map((s) => s.pos);
            const rtn = CreepBase.travelTo(creep, target, "green", 20);
            if (rtn === -2) {
              const sliced = creep.memory.scoutPositions.slice(1);
              creep.memory.scoutPositions = sliced;
            }
            // detect stuck
            let lastPos = creep.memory.lastPosition;
            if (lastPos) {
              lastPos = new RoomPosition(lastPos.x, lastPos.y, lastPos.roomName);
              if (lastPos.isEqualTo(creep.pos)) {
                creep.memory.lastPosition = creep.pos;
                creep.memory.stuckCounter += 1;
              } else {
                creep.memory.stuckCounter = 0;
              }
              if (creep.memory.stuckCounter > 10) {
                const sliced = creep.memory.scoutPositions.slice(1);
                const adjacentRooms = this.getExits(creep);
                creep.memory.scoutPositions = sliced.concat(adjacentRooms);
              }
            }
          // if (Game.time % 50 === 0) {
          //   const route = PathFinder.search(creep.pos, target, {
          //     maxOps: 1000,
          //     roomCallback: (roomName: string) => {
          //       const costMatrix = new PathFinder.CostMatrix();
          //       const terrain = Game.map.getRoomTerrain(roomName);
          //       const localAvoids = avoids.filter((p) => p.roomName === roomName);
          //       _.range(0, 49).map((x) =>
          //         _.range(0, 49).map((y) => {
          //           const t = terrain.get(x, y);
          //           const tCost = t === 0 ? 0 : t === 1 ? 10 : t === 2 ? 1 : 255;
          //           const wCost = localAvoids.filter((p) => p.x === x && p.y === y).length > 0 ? 10 : 0;
          //           costMatrix.set(x, y, Math.max(tCost, wCost));
          //         })
          //       );
          //       return costMatrix;
          //     }
          //   });
          // }
        }
      }
    });
  }
  private static spawnScout(room: Room): void {
    const scouts = _.filter(Game.creeps, (c) => c.memory.role === "scout" && c.memory.homeRoom === room.name);
    const spawningScouts = Memory.roomStore[room.name].spawnQueue.filter(
      (c) => c.memory.role === "scout" && c.memory.homeRoom === room.name
    );
    const shouldSpawnScout =
      room.controller &&
      room.controller.level > 1 &&
      ((Game.time + Constants.scoutingTimingOffset) %
        (room.controller.level === 2 ? Constants.earlyScoutFrequency : Constants.lateScoutFrequency) ===
        0 ||
        Memory.scoutingDirector.scoutedRooms === []) &&
      scouts.length + spawningScouts.length === 0;
    if (shouldSpawnScout) {
      const initialTargets = this.getSurroundingRoomNames(room.name);
      Memory.roomStore[room.name].spawnQueue.push({
        template: [MOVE],
        memory: {
          ...CreepBase.baseMemory,
          role: "scout",
          homeRoom: room.name,
          scoutPositions: initialTargets
        }
      });
      const knownRooms = Memory.scoutingDirector.scoutedRooms
        .map((r) => r.name)
        .concat(Object.keys(Memory.roomStore))
        .concat(Memory.roomStore[room.name].remoteDirector.map((r) => r.roomName));
      const unexploredTargets = [
        ...new Set(
          knownRooms.reduce((acc: RoomPosition[], r: string) => acc.concat(this.getSurroundingRoomNames(r)), [])
        )
      ];
      console.log(`Unexplored Targets: ${JSON.stringify(unexploredTargets.map((r) => r.roomName))}`);
      if (unexploredTargets.length > 0) {
        Memory.roomStore[room.name].spawnQueue.push({
          template: [MOVE],
          memory: {
            ...CreepBase.baseMemory,
            role: "scout",
            homeRoom: room.name,
            scoutPositions: unexploredTargets
          }
        });
      }
    }
  }
  public static updateSettlementIntel(): boolean {
    const requiredTiles = 17;
    const memory = Memory.scoutingDirector;
    const roomIndex = memory.scanningIndex;
    const room = memory.scoutedRooms[roomIndex];
    if (!room) {
      // room doesn't exist in memory
      Memory.scoutingDirector.scanningIndex = 0;
      return false;
    }
    const freeTiles = unpackPosList(room.freeTiles);
    const settleableTiles = unpackPosList(room.settleableTiles);
    const scanIndex = room.settlingScanningIndex;
    if (scanIndex === freeTiles.length - 1 || room.doneScanning) {
      // finished scanning this room
      Memory.scoutingDirector.scanningIndex += 1;
      Memory.scoutingDirector.scoutedRooms[roomIndex].doneScanning = true;
    }
    const canScan = Game.cpu.bucket > 200;
    if (canScan) {
      // scan part of the room
      const scanningCount = 1;
      const nextTiles = freeTiles.slice(scanIndex, scanIndex + scanningCount);
      const newSettleableTiles = settleableTiles.concat(
        nextTiles.filter((t) => CoreRoomPlanner.straightRun(t, requiredTiles, []).length === requiredTiles)
      );
      Memory.scoutingDirector.scoutedRooms[roomIndex].settleableTiles = packPosList(newSettleableTiles);
      Memory.scoutingDirector.scoutedRooms[roomIndex].settlingScanningIndex += scanningCount;
    }
    return true;
  }
  private static initMemory(): void {
    if (!Object.keys(Memory).includes("scoutingDirector")) {
      Memory.scoutingDirector = {
        scoutedRooms: [],
        scoutQueue: [],
        scanningIndex: 0
      };
    }
  }
  public static run(room: Room): void {
    this.initMemory();
    this.spawnScout(room);
    this.runScouts(room);
    this.updateSettlementIntel();
  }
}
