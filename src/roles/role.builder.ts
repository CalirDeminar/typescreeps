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
    //console.log(JSON.stringify(sites));
    const target = sites[0];
    if (target) {
      const targetWork = Memory.roomStore[room.name].buildQueue[target.id] || target.progressTotal;
      Memory.roomStore[room.name].buildQueue[target.id] = targetWork - creep.store.getUsedCapacity();
    }
    return target ? target.id : "";
  }
  public static run(creep: Creep): void {
    const working = creep.memory.working;
    const empty = creep.store.getUsedCapacity() === 0;
    const full = creep.store.getUsedCapacity() === creep.store.getCapacity();
    const hasTarget = creep.memory.workTarget !== "";
    const lastTickAlive = creep.ticksToLive === 1;
    switch(true) {
      case working && empty:
        creep.memory.working = false;
        break;
      case !working && full:
        creep.memory.working = true;
        creep.memory.workTarget = this.getWorkTarget(creep);
        const currTarget: ConstructionSite | STRUCTURE_CONTROLLER | null = Game.getObjectById(creep.memory.workTarget);
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
    if (lastTickAlive) {
      Memory.roomStore[Room.name].buildQueue[creep.memory.workTarget] += creep.carryCapacity;
    }
    if (working) {
      const buildTarget: ConstructionSite | null = Game.getObjectById(creep.memory.workTarget);
      if (buildTarget && creep.build(buildTarget) !== 0) {
        creep.moveTo(buildTarget, { visualizePathStyle: { stroke: this.pathColour() } });
      } else if (!buildTarget) {
        console.log("Builder Running Upgrade")
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
