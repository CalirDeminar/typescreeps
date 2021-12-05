import { CreepBase } from "roles/role.creep";
import { CreepBuilder } from "utils/creepBuilder";
import { Constants } from "utils/constants";
import { LocalRoomCoreUpgrader } from "./localRoomCoreUpgrader";
import { CreepUtils } from "rework/utils/creepUtils";
export interface CreepBuilderMemory {
  role: "builder";
  homeRoom: string;
  targetRoom: string;
  targetSource: string;
  working: boolean;
  workTarget: string;
}
export class LocalRoomCoreBuilder {
  private static pathColour(): string {
    return "red";
  }
  private static getWorkTarget(creep: Creep): string {
    const room = creep.room;
    const sites = room
      .find(FIND_CONSTRUCTION_SITES)
      .sort((s1: ConstructionSite, s2: ConstructionSite) => s2.progress - s1.progress);
    //console.log(JSON.stringify(sites));
    const target = sites[0];
    return target ? target.id : "";
  }
  private static runBuilder(creep: Creep): void {
    if (creep.ticksToLive && !CreepBase.fleeHostiles(creep)) {
      const startCpu = Game.cpu.getUsed();
      CreepBase.maintainRoad(creep);
      const working = creep.memory.working;
      const empty = creep.store.getUsedCapacity() === 0;
      const full = creep.store.getUsedCapacity() === creep.store.getCapacity();
      const hasTarget = creep.memory.workTarget !== "";
      switch (true) {
        case working && empty:
          creep.memory.working = false;
          break;
        case !working && full:
          creep.memory.working = true;
          creep.memory.workTarget = this.getWorkTarget(creep);
          const currTarget: ConstructionSite | STRUCTURE_CONTROLLER | null = Game.getObjectById(
            creep.memory.workTarget
          );
          if (currTarget && Object.keys(currTarget).includes("isPowerEnabled")) {
            creep.memory.workTarget === "";
          }
          break;
        case !hasTarget:
          creep.memory.workTarget = this.getWorkTarget(creep);
          break;
        default:
          true;
      }
      if (working) {
        const buildTarget = Game.getObjectById<ConstructionSite>(creep.memory.workTarget);
        const buildTargetInRange = buildTarget && creep.pos.getRangeTo(buildTarget) <= 3;
        switch (true) {
          case buildTarget && buildTargetInRange:
            if (buildTarget) {
              creep.build(buildTarget);
            }
            break;
          case buildTarget && !buildTargetInRange:
            if (buildTarget) {
              CreepBase.travelTo(creep, buildTarget, this.pathColour());
            }
            break;
          case creep.pos.roomName !== creep.memory.homeRoom:
            CreepBase.travelToRoom(creep, "black", creep.memory.homeRoom);
        }
      } else {
        const sourceTarget: Structure | Tombstone | null = CreepBase.getSourceTarget(creep);
        if (sourceTarget) {
          const sourceTargetRange = creep.pos.getRangeTo(sourceTarget);
          if (sourceTargetRange > 1) {
            CreepBase.travelTo(creep, sourceTarget, this.pathColour());
          } else {
            creep.withdraw(sourceTarget, RESOURCE_ENERGY);
          }
        } else {
          const anchor = creep.room.find(FIND_FLAGS, { filter: (f) => f.name === `${creep.room.name}-Anchor` })[0];
          if (anchor && creep.pos.getRangeTo(anchor) <= 3) {
            const path = PathFinder.search(creep.pos, { pos: anchor.pos, range: 4 }, { flee: true }).path;
            creep.moveByPath(path);
          }
        }
      }
      const endCpu = Game.cpu.getUsed();
      CreepUtils.recordCreepPerformance(creep, endCpu - startCpu);
    }
  }
  private static runBuilders(room: Room): void {
    const hasSites = room.find(FIND_CONSTRUCTION_SITES).length > 0;
    const container = LocalRoomCoreUpgrader.getEnergySource(room);
    _.filter(Game.creeps, (c) => c.memory.role === "builder" && c.memory.homeRoom === room.name).map((c) => {
      hasSites ? this.runBuilder(c) : LocalRoomCoreUpgrader.runUpgrader(c, container);
    });
  }
  private static spawnBuilder(room: Room): void {
    const storage = room.storage;
    const energyFull = room.energyCapacityAvailable - room.energyAvailable === 0 || room.energyAvailable > 1000;
    const storageHasBuffer = storage
      ? storage.store.getUsedCapacity(RESOURCE_ENERGY) > room.energyCapacityAvailable * 3
      : true;
    const towersNeedEnergy =
      _.filter(Game.creeps, (c) => c.memory.role === "queen").length > 0 &&
      _.filter(
        room.find(FIND_MY_STRUCTURES, {
          filter: (s) => {
            return s.structureType === STRUCTURE_TOWER && s.store[RESOURCE_ENERGY] < 500;
          }
        })
      ).length > 0;
    const builders = _.filter(Game.creeps, (c) => c.memory.role === "builder" && c.memory.homeRoom === room.name);
    const buildersNeedEnergy =
      builders.reduce((acc, creep) => {
        return acc + (creep.memory.working ? 0 : creep.store.getCapacity());
      }, 0) > 250;
    const roomHostile = Memory.roomStore[room.name].defenceDirector.alertLevel > 0;
    const spawners = room.find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_SPAWN });
    if (
      !roomHostile &&
      spawners.length > 0 &&
      room.controller &&
      (room.controller.level < 8 || room.find(FIND_CONSTRUCTION_SITES).length > 0) &&
      energyFull &&
      storageHasBuffer &&
      Memory.roomStore[room.name].spawnQueue.length === 0 &&
      !towersNeedEnergy &&
      !buildersNeedEnergy &&
      builders.length < Constants.builders &&
      Memory.roomStore[room.name].defenceDirector.alertLevel === 0
    ) {
      Memory.roomStore[room.name].spawnQueue.push({
        template: CreepBuilder.buildScaledBalanced(Math.min(room.energyCapacityAvailable, 2500)),
        memory: {
          ...CreepBase.baseMemory,
          role: "builder",
          working: false,
          homeRoom: room.name,
          targetRoom: room.name
        }
      });
    }
  }
  public static run(room: Room): void {
    this.spawnBuilder(room);
    this.runBuilders(room);
  }
}
