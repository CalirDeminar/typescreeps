import { Constants } from "utils/constants";
import { CreepBase } from "roles/role.creep";
export class ScoutingDirector {
  private static getRoomCenter(roomName: string): RoomPosition {
    return new RoomPosition(25, 25, roomName);
  }
  private static getSurroundingRoomNames(room: Room): RoomPosition[] {
    const exitMap = Game.map.describeExits(room.name);
    return Object.entries(exitMap).reduce((acc: RoomPosition[], r) => {
      if (r[1]) {
        return acc.concat(this.getRoomCenter(r[1]));
      }
      return acc;
    }, []);
  }
  private static getExits(creep: Creep): RoomPosition[] {
    const room = creep.room;
    const existingRooms = Memory.roomStore[creep.memory.homeRoom].scoutingDirector.scoutedRooms.map((r) => r.name);
    const exitMap = Game.map.describeExits(room.name);
    const rtn = Object.entries(exitMap).reduce((acc: RoomPosition[], r) => {
      if (r[1]) {
        return acc.concat(this.getRoomCenter(r[1]));
      }
      return acc;
    }, []);
    console.log(JSON.stringify(rtn));
    return rtn.filter((r) => !existingRooms.includes(r.roomName));
  }
  private static recordRoom(creep: Creep): void {
    const room = creep.room;
    const roomExists = Memory.roomStore[creep.memory.homeRoom].scoutingDirector.scoutedRooms
      .map((r) => r.name)
      .includes(creep.room.name);
    console.log(`Room ${creep.room.name} exists: ${roomExists}`);
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
      const record = {
        sources: sources,
        mineral: mineral,
        controller: controller,
        deposit: deposit,
        powerBank: powerBank,
        keeperLair: keeperLair,
        invaderCore: invaderCore,
        towers: towers,
        terrain: room.getTerrain(),
        name: room.name
      };
      Memory.roomStore[creep.memory.homeRoom].scoutingDirector.scoutedRooms = Memory.roomStore[
        creep.memory.homeRoom
      ].scoutingDirector.scoutedRooms.concat(record);
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
            CreepBase.travelTo(creep, nextPosition, "green");
        }
      }
      // move to target square
      // check
    });
  }
  private static spawnScout(room: Room): void {
    const scouts = _.filter(Game.creeps, (c) => c.memory.role === "scout");
    const shouldSpawnScout =
      room.controller &&
      room.controller.level > 1 &&
      (Game.time % (room.controller.level === 2 ? Constants.earlyScoutFrequency : Constants.lateScoutFrequency) === 0 ||
        Memory.roomStore[room.name].scoutingDirector.scoutedRooms === []) &&
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
  public static run(room: Room): void {
    this.spawnScout(room);
    this.runScouts(room);
  }
}
