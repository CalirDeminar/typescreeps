import { Upgrader } from "./role.upgrader";
import { CreepBase } from "./role.creep";
export class Builder extends CreepBase {
  private static pathColour(): string {
    return "red";
  }
  private static getWorkTarget(creep: Creep): string {
    const room = creep.room;
    const roomMemory = Memory.roomStore[room.name];
    const sites = room
      .find(FIND_CONSTRUCTION_SITES, {
        filter: (site: ConstructionSite) =>
          (Object.keys(roomMemory.buildQueue).includes(site.id) && roomMemory.buildQueue[site.id] > 0) ||
          !Object.keys(roomMemory.buildQueue).includes(site.id)
      })
      .sort((s1: ConstructionSite, s2: ConstructionSite) => s2.progress - s1.progress);
    console.log(JSON.stringify(sites));
    const target = sites[0];
    if (target) {
      const targetWork = Memory.roomStore[room.name].buildQueue[target.id] || target.progressTotal;
      Memory.roomStore[room.name].buildQueue[target.id] = targetWork - creep.carryCapacity;
    }
    return target ? target.id : "";
  }
  public static run(creep: Creep): void {
    const working = creep.memory.working;
    if (working && creep.carry.energy === 0) {
      creep.memory.working = false;
    } else if (!working && creep.carry.energy === creep.carryCapacity) {
      creep.memory.working = true;
      creep.memory.workTarget = this.getWorkTarget(creep);
    } else if (creep.memory.workTarget === "") {
      creep.memory.workTarget = this.getWorkTarget(creep);
    }
    if (creep.ticksToLive === 1) {
      Memory.roomStore[Room.name].buildQueue[creep.memory.workTarget] += creep.carryCapacity;
    }
    if (creep.memory.working) {
      const buildTarget: ConstructionSite | null = Game.getObjectById(creep.memory.workTarget);
      if (buildTarget && creep.build(buildTarget) !== 0) {
        creep.moveTo(buildTarget, { visualizePathStyle: { stroke: this.pathColour() } });
      } else if (!buildTarget) {
        Upgrader.run(creep);
      }
    } else {
      const sourceTarget: Structure | null =
        creep.memory.targetStore !== "" ? Game.getObjectById(creep.memory.targetSource) : this.getSourceTarget(creep);
      if (sourceTarget && creep.withdraw(sourceTarget, RESOURCE_ENERGY) !== 0) {
        creep.moveTo(sourceTarget, {
          visualizePathStyle: { stroke: this.pathColour() }
        });
      }
    }
  }
}
