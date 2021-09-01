export class Scout {
  public static recordCurrentRoom(creep: Creep): void {
    const sources = creep.room.find(FIND_SOURCES);
    const minerals = creep.room.find(FIND_MINERALS);
    const hostileCreeps = creep.room.find(FIND_HOSTILE_CREEPS).length;
    const hostileTowers = creep.room.find(FIND_HOSTILE_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_TOWER
    }).length;
    const invaderCore =
      creep.room.find(FIND_HOSTILE_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_INVADER_CORE
      }).length > 0;
    const hostile = hostileCreeps > 0 || creep.room.find(FIND_HOSTILE_STRUCTURES).length > 0;
    Memory.roomStore[creep.memory.homeRoom].remoteRooms[creep.pos.roomName] = {
      sources: sources,
      minerals: minerals,
      hostile: hostile,
      hostileCreepCount: hostileCreeps,
      hostileTowerCount: hostileTowers,
      invaderCore: invaderCore,
      name: creep.pos.roomName,
      anchor: Game.rooms[creep.memory.homeRoom].find(FIND_FLAGS, {
        filter: (f) => f.name === `${creep.memory.homeRoom}-Anchor`
      })[0].pos
    };
    //creep.memory.scoutPositions = creep.memory.scoutPositions.concat(exits);
  }
  public static run(creep: Creep): void {
    if (creep.ticksToLive) {
      const homeRoom = Memory.roomStore[creep.memory.homeRoom];
      const knownRooms = Object.keys(homeRoom.remoteRooms).concat([creep.memory.homeRoom]);
      const positions = creep.memory.scoutPositions;
      const target = positions[0];
      //const path = creep.pos.findPathTo(target, {maxRooms: 2})
      if (creep.room.name !== creep.memory.homeRoom) {
        this.recordCurrentRoom(creep);
      }
      switch (true) {
        case !knownRooms.includes(creep.pos.roomName):
          // console.log("Record Room");
          // this.recordCurrentRoom(creep);
          break;
        case !positions || positions.length === 0:
          // console.log("Suicide");
          // nothing left to scout, so suicide
          creep.suicide();
          break;
        case creep.room.name === target.roomName:
          // console.log("At Target");
          // wait for room transfer
          creep.moveTo(target);
          creep.memory.scoutPositions = creep.memory.scoutPositions.slice(1);
          break;
        default:
          // console.log("Move To Target");
          const dir = creep.room.findExitTo(target.roomName);
          if (dir !== -2 && dir !== -10) {
            const exit = creep.room.find(dir)[0];
            const moveToResp = creep.moveTo(exit);
          }
      }
    }
  }
}
