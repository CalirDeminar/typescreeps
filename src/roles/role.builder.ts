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
      .find(FIND_CONSTRUCTION_SITES)
      .sort((s1: ConstructionSite, s2: ConstructionSite) => s2.progress - s1.progress);
    //console.log(JSON.stringify(sites));
    const target = sites[0];
    return target ? target.id : "";
  }
  public static run(creep: Creep): void {
    const working = creep.memory.working;
    const empty = creep.store.getUsedCapacity() === 0;
    const full = creep.store.getUsedCapacity() === creep.store.getCapacity();
    const hasTarget = creep.memory.workTarget !== "";
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
    if (working) {
      const buildTarget: ConstructionSite | null = Game.getObjectById(creep.memory.workTarget);
      const buildTargetInRange = buildTarget && creep.pos.getRangeTo(buildTarget) <= 3;
      switch(true) {
        case buildTarget && buildTargetInRange:
          if(buildTarget) {
            creep.build(buildTarget)
          }
          break;
        case buildTarget && !buildTargetInRange:
          if (buildTarget) {
            this.travelTo(creep, buildTarget, this.pathColour());
          }
          break;
        default:
          Upgrader.run(creep);
      }
    } else {
      const sourceTarget: Structure | null =
        creep.memory.targetStore !== "" ? Game.getObjectById(creep.memory.targetSource) : this.getSourceTarget(creep);
      if (sourceTarget){
        const sourceTargetRange = creep.pos.getRangeTo(sourceTarget);
        if(sourceTargetRange > 1) {
          this.travelTo(creep, sourceTarget, this.pathColour());
        } else {
          creep.withdraw(sourceTarget, RESOURCE_ENERGY);
        }
      }
    }
  }
}
