import { CreepUtils } from "rework/utils/creepUtils";
import { PositionsUtils } from "rework/utils/positions";
import { packPosList, unpackPosList } from "utils/packrat";
import { CreepBase } from "roles/role.creep";
export interface ScoutingDirectorStore {
  scoutedRooms: ScoutedRoom[];
  scoutQueue: RoomPosition[];
  scanningIndex: number;
}
export interface ScoutedRoom {
  sources: { id: string; pos: RoomPosition }[];
  mineral: { id: string; pos: RoomPosition; mineralType: MineralConstant } | null;
  controller: { id: string; owner: string | null; reservation: string | null; pos: RoomPosition } | null;
  deposit: {
    id: string;
    type: DepositConstant;
    pos: RoomPosition;
    ticksToDecay: number;
    lastCooldown: number;
  } | null;
  powerBank: { id: string; pos: RoomPosition; power: number } | null;
  keeperLair: { id: string; pos: RoomPosition }[];
  invaderCore: { id: string; pos: RoomPosition } | null;
  towers: { id: string; pos: RoomPosition }[];
  name: string;
  freeTiles: string;
  settleableTiles: string;
  settlingScanningIndex: number;
  doneScanning: boolean;
}
export const scoutingDirectorDefault: ScoutingDirectorStore = {
  scoutedRooms: [],
  scoutQueue: [],
  scanningIndex: 0
};

export class GlobalScouting {
  private static scoutedRoomNames(): string[] {
    const inhabitedRooms = Object.keys(Memory.roomStore);
    const scoutedRooms = Memory.scoutingDirector.scoutedRooms.map((r) => r.name);
    return [...inhabitedRooms, ...scoutedRooms];
  }
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
  private static scoutRoom(creep: Creep): void {
    const room = creep.room;
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
    const index = Memory.scoutingDirector.scoutedRooms.findIndex((r) => r.name === room.name);
    if (index >= 0) {
      Memory.scoutingDirector.scoutedRooms[index] = record;
    } else {
      Memory.scoutingDirector.scoutedRooms = Memory.scoutingDirector.scoutedRooms.concat(record);
    }
  }
  private static runScouts(): void {
    const inhabitedRooms = Object.keys(Memory.roomStore);
    CreepUtils.filterCreeps("scout").forEach((creep) => {
      if (creep.ticksToLive) {
        const queue = creep.memory.scoutPositions;
        const staleNext = queue[0];
        const next = staleNext ? new RoomPosition(staleNext.x, staleNext.y, staleNext.roomName) : undefined;
        if (creep.room.name !== creep.memory.homeRoom && !inhabitedRooms.includes(creep.room.name)) {
          // record this room
          this.scoutRoom(creep);
        }
        switch (true) {
          case creep.memory.scoutPositions.length === 0: {
            creep.suicide();
            break;
          }
          case next && creep.pos.getRangeTo(next) < 15: {
            // slice queue, next target
            const sliced = creep.memory.scoutPositions.slice(1);
            creep.memory.scoutPositions = sliced;
            break;
          }
          default: {
            if (!next) {
              break;
            }
            CreepBase.travelTo(creep, next, "blue", 10);
            // detect if stuck
            let lastPos = creep.memory.lastPosition;
            creep.memory.lastPosition = creep.pos;
            if (lastPos) {
              lastPos = new RoomPosition(lastPos.x, lastPos.y, lastPos.roomName);
              if (lastPos.isEqualTo(creep.pos)) {
                creep.memory.stuckCounter += 1;
              } else {
                creep.memory.lastPosition = creep.pos;
                creep.memory.stuckCounter = 0;
              }
              if (creep.memory.stuckCounter > 10) {
                creep.memory.stuckCounter = 0;
                const sliced = creep.memory.scoutPositions.slice(1);
                creep.memory.scoutPositions = sliced;
              }
            }
          }
        }
      }
    });
  }
  private static updateLists(): void {
    const knownRooms = this.scoutedRoomNames();
    const unscouted = knownRooms
      .reduce((acc: string[], roomName) => {
        const exitMap = Game.map.describeExits(roomName);
        const exits = Object.values(exitMap).filter<string>((c): c is string => !!c);
        return acc.concat(exits);
      }, [])
      .filter((e) => !knownRooms.includes(e))
      .map((e) => new RoomPosition(25, 25, e));
    Memory.scoutingDirector.scoutQueue = unscouted;
  }
  private static getSpawningRoom(): string | undefined {
    return Object.keys(Memory.roomStore).filter((n) => {
      const roomVisible = Object.keys(Game.rooms).includes(n);
      if (!roomVisible) {
        return false;
      }
      const room = Game.rooms[n];
      return room.controller && room.controller.level > 1;
    })[0];
  }
  private static spawnScouts(): void {
    const spawningRoom = this.getSpawningRoom();
    const scouts = CreepUtils.filterCreeps("scout");
    const queuedScouts = CreepUtils.filterAllQueuedCreeps("scout");
    const canSpawnScout = !!spawningRoom && scouts.length + queuedScouts.length === 0;
    if (canSpawnScout && spawningRoom) {
      Memory.roomStore[spawningRoom].spawnQueue.push({
        template: [MOVE],
        memory: {
          ...CreepBase.baseMemory,
          role: "scout",
          homeRoom: spawningRoom,
          scoutPositions: Memory.scoutingDirector.scoutQueue.sort(() => Math.random() - 0.5)
        }
      });
    }
  }
  public static run(): void {
    this.updateLists();
    this.spawnScouts();
    this.runScouts();
    // update settlement data - move to expansion class
  }
}
