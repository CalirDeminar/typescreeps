import { CreepBase } from "roles/role.creep";
import { UtilPosition } from "utils/util.position";
export class RemoteHarvester {
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
  public static runHarvester(creep: Creep, anchor: Flag, constructionSite: ConstructionSite | null): void {
    if (creep.ticksToLive && !CreepBase.fleeHostiles(creep)) {
      // TODO - periodic huge CPU spike from this function on the % 100 tick mark
      let cpu = Game.cpu.getUsed();
      let lastCpu = cpu;
      const source = Game.getObjectById<Source>(creep.memory.targetSource);
      const container = source
        ? source.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 1, {
            filter: (s) =>
              s.structureType === STRUCTURE_CONTAINER && s.store.getFreeCapacity() > creep.store.getUsedCapacity()
          })[0]
        : undefined;
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
        case working && source && !creep.pos.isNearTo(source.pos) && !targetRoomHostile:
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
        case !working && !!container:
          if (container) {
            const containerDamage = container.hitsMax - container.hits;
            const repairAmount = creep.body.filter((p) => p.type === WORK).length * 100;
            switch (true) {
              case !creep.pos.isNearTo(container):
                CreepBase.travelTo(creep, container, "orange", 1);
                break;
              case containerDamage > repairAmount:
                creep.repair(container);
                break;
              case true:
                creep.transfer(container, RESOURCE_ENERGY);
                break;
            }
          }
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
}
