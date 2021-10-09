import { CreepBase } from "roles/role.creep";
import { CreepBuilder } from "utils/creepBuilder";

export class RoomHelperDirector {
  private static getRoomToHelp(room: Room): string | null {
    const name = room.name;
    if (!!Memory.expansionDirector.targetRoom && Memory.expansionDirector.helperRooms[0] === name) {
      Memory.roomStore[name].helpOtherRoom = true;
      return Memory.expansionDirector.targetRoom;
    } else {
      Memory.roomStore[name].helpOtherRoom = false;
      return null;
    }
  }
  private static runHelper(creep: Creep): void {
    const inTarget = creep.pos.roomName === creep.memory.targetRoom;
    const workParts = creep.body.filter((p) => p.type === WORK).length;
    const full = creep.store.getFreeCapacity() < workParts * 2;
    const empty = creep.store.getUsedCapacity() === 0;
    switch (true) {
      case !inTarget:
        CreepBase.travelTo(creep, new RoomPosition(25, 25, creep.memory.targetRoom), "black", 25);
        // move to target room
        break;
      case inTarget && creep.memory.working && !empty:
      case inTarget && !creep.memory.working && full:
        creep.memory.working = true;
        const site = creep.room.find(FIND_CONSTRUCTION_SITES)[0];
        const controller = creep.room.controller;
        if (!(creep.pos.getRangeTo(site || controller) <= 3)) {
          CreepBase.travelTo(creep, site || controller, "black");
        } else {
          if (site) {
            creep.build(site);
          } else if (controller) {
            creep.upgradeController(controller);
          }
        }
        break;
      case inTarget && creep.memory.working && empty:
      case inTarget && !creep.memory.working && !full:
        creep.memory.working = false;
        const source = creep.pos.findClosestByPath(FIND_SOURCES, { filter: (s) => s.energy > workParts * 2 });
        if (source) {
          if (creep.pos.isNearTo(source)) {
            creep.harvest(source);
          } else {
            CreepBase.travelTo(creep, source, "black");
          }
        }
        // set not working
        // look for source
        // harvest source
        break;
    }
  }
  private static runHelpers(room: Room): void {
    const helpers = _.filter(Game.creeps, (c) => c.memory.role === "helper" && c.memory.homeRoom === room.name);
    helpers.map((c) => this.runHelper(c));
  }
  private static spawnHelpers(room: Room, targetRoom: string): void {
    const helpers = _.filter(
      Game.creeps,
      (c) => c.memory.role === "helper" && c.memory.targetRoom === targetRoom && c.memory.homeRoom === room.name
    );
    const spawningHelpers = Memory.roomStore[room.name].spawnQueue.filter(
      (c) => c.memory.role === "helper" && c.memory.targetRoom === targetRoom && c.memory.homeRoom === room.name
    );
    if (helpers.length + spawningHelpers.length < 2) {
      Memory.roomStore[room.name].spawnQueue.push({
        template: CreepBuilder.buildScaledBalanced(room.energyCapacityAvailable),
        memory: {
          ...CreepBase.baseMemory,
          role: "helper",
          targetRoom: targetRoom,
          homeRoom: room.name,
          working: false
        }
      });
    }
  }
  private static stopHelp(room: Room): void {
    if (Memory.expansionDirector.controllerId) {
      const targetController = Game.getObjectById<StructureController>(Memory.expansionDirector.controllerId);
      if (targetController && targetController.level >= 4) {
        Memory.expansionDirector = {
          targetRoom: null,
          controllerId: null,
          helperRooms: [],
          newSpawnPosition: null
        };
        Memory.roomStore[room.name].helpOtherRoom = false;
      }
    }
  }
  public static run(room: Room) {
    let cpu = Game.cpu.getUsed();
    let lastCpu = cpu;
    const helpRoom = this.getRoomToHelp(room);
    cpu = Game.cpu.getUsed();
    const getRoomCpu = cpu - lastCpu;
    lastCpu = cpu;
    if (helpRoom) {
      this.spawnHelpers(room, helpRoom);
      this.stopHelp(room);
    }
    cpu = Game.cpu.getUsed();
    const roomCpu = cpu - lastCpu;
    lastCpu = cpu;
    this.runHelpers(room);
    cpu = Game.cpu.getUsed();
    const helperCpu = cpu - lastCpu;
    if (Game.time % 5 === 0) {
      // console.log(
      //   `Helper: Get Room to Help: ${getRoomCpu.toPrecision(2)} - Run Room Functions: ${roomCpu.toPrecision(
      //     2
      //   )} - Run Helper Creeps: ${helperCpu.toPrecision(2)}`
      // );
    }
    // spawn hauler
  }
}
