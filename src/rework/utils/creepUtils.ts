import { CreepBuilderMemory } from "rework/rooms/core/localRoomCoreBuilder";
import { CreepUpgraderMemory } from "rework/rooms/core/localRoomCoreUpgrader";
import { CreepControllerHaulerMemory } from "rework/rooms/core/localRoomCoreControllerHauler";
import { CreepQueenMemory } from "rework/rooms/core/localRoomCoreQueen";
import { CreepHarvesterShuttleMemory } from "rework/rooms/energy/local/localRoomEnergyShuttle";
import { CreepHarvesterStaticLinkMemory } from "rework/rooms/energy/local/localRoomEnergyLink";
import { CreepHarvesterStaticContainerMemory } from "rework/rooms/energy/local/localRoomEnergyContainer";
import { CreepHaulerContainerMemory } from "rework/rooms/energy/local/localRoomEnergyContainer";

export type CreepMemory =
  | CreepBuilderMemory
  | CreepUpgraderMemory
  | CreepControllerHaulerMemory
  | CreepQueenMemory
  | CreepHarvesterShuttleMemory
  | CreepHarvesterStaticLinkMemory
  | CreepHarvesterStaticContainerMemory
  | CreepHaulerContainerMemory;
export class CreepUtils {
  public static filterCreeps(role: string, homeRoom?: string, targetRoom?: string, targetSource?: string): Creep[] {
    return _.filter(
      Game.creeps,
      (c) =>
        c.memory.role === role &&
        (!homeRoom || c.memory.homeRoom === homeRoom) &&
        (!targetRoom || c.memory.targetRoom === targetRoom) &&
        (!targetSource || c.memory.targetSource === targetSource)
    );
  }
  public static filterQueuedCreeps(
    roomName: string,
    role: string,
    homeRoom?: string,
    targetRoom?: string,
    targetSource?: string
  ): CreepRecipie[] {
    return Memory.roomStore[roomName].spawnQueue.filter(
      (c) =>
        c.memory.role === role &&
        (!homeRoom || c.memory.homeRoom === homeRoom) &&
        (!targetRoom || c.memory.targetRoom === targetRoom) &&
        (!targetSource || c.memory.targetSource === targetSource)
    );
  }
  public static filterAllQueuedCreeps(
    role: string,
    homeRoom?: string,
    targetRoom?: string,
    targetSource?: string
  ): CreepRecipie[] {
    return Object.values(Memory.roomStore).reduce(
      (acc: CreepRecipie[], r) =>
        acc.concat(
          r.spawnQueue.filter(
            (c) =>
              c.memory.role === role &&
              (!homeRoom || c.memory.homeRoom === homeRoom) &&
              (!targetRoom || c.memory.targetRoom === targetRoom) &&
              (!targetSource || c.memory.targetSource === targetSource)
          )
        ),
      []
    );
  }
  public static findQueuedCreepIndex(
    roomName: string,
    role: string,
    homeRoom: string,
    targetRoom?: string,
    targetSource?: string
  ): number {
    return Memory.roomStore[roomName].spawnQueue.findIndex(
      (c) =>
        c.memory.role === role &&
        c.memory.homeRoom === homeRoom &&
        (!targetRoom || c.memory.targetRoom === targetRoom) &&
        (!targetSource || c.memory.targetSource === targetSource)
    );
  }
  public static getBodyPartCost(part: BodyPartConstant): number {
    switch (part) {
      case TOUGH:
        return 10;
      case CARRY:
      case MOVE:
        return 50;
      case ATTACK:
        return 80;
      case WORK:
        return 100;
      case RANGED_ATTACK:
        return 150;
      case HEAL:
        return 250;
      case CLAIM:
        return 600;
      default:
        return 0;
    }
  }
  public static getBodyCost(body: BodyPartConstant[]): number {
    return body.reduce((acc: number, part: BodyPartConstant) => acc + this.getBodyPartCost(part), 0);
  }
  public static recordCreepPerformance(creep: Creep, timeToRun: number): void {
    const history = creep.memory.performanceHistory;
    if (history === undefined) {
      creep.memory.performanceHistory = [timeToRun];
    }
    const sliceLine = history.length >= 50 ? 1 : 0;
    creep.memory.performanceHistory = history.slice(sliceLine).concat([timeToRun]);
  }
}
