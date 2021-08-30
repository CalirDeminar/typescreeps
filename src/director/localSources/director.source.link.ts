import { CreepBase } from "roles/role.creep";
import { CreepBuilder } from "utils/creepBuilder";
import { Constants } from "utils/constants";
export class SourceLinkDirector {
  private static getCreepRoleAt(role: string, sourceId: string): Creep[] {
    return _.filter(Game.creeps, (c) => c.memory.role === role && c.memory.targetSource === sourceId);
  }
  private static shouldReplaceCreeps(creeps: Creep[], max: number): boolean {
    return creeps.length < max || (creeps.length === max && !!creeps.find((c) => c.ticksToLive && c.ticksToLive < 100));
  }
  private static spawnStaticHarvester(room: Room, source: Source, link: StructureLink): boolean {
    const activeHarvesters = this.getCreepRoleAt("harvesterStatic", source.id);
    const shouldReplaceHarvester = this.shouldReplaceCreeps(activeHarvesters, Constants.maxStatic);
    if (shouldReplaceHarvester) {
      Memory.roomStore[source.room.name].nextSpawn = {
        template: CreepBuilder.buildStaticHarvester(source.room.energyCapacityAvailable),
        memory: {
          ...CreepBase.baseMemory,
          role: "harvesterStatic",
          working: false,
          born: Game.time,
          targetSource: source.id,
          homeRoom: source.room.name,
          targetRoom: source.room.name,
          targetStore: link.id
        }
      };
      return true;
    }
    return false;
  }
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
  private static runHarvester(creep: Creep, source: Source): void {
    if (creep.ticksToLive) {
      this.setWorkingState(creep);
      const working = creep.memory.working;
      const link = working ? null : CreepBase.findLink(creep);
      switch (true) {
        case working && creep.pos.isNearTo(source):
          creep.harvest(source);
          break;
        case working:
          CreepBase.travelTo(creep, source, "orange");
          break;
        case !working && link && creep.pos.isNearTo(link):
          if (link) {
            creep.transfer(link, RESOURCE_ENERGY);
            if (creep.pos.isNearTo(source)) {
              creep.harvest(source);
            }
          }
          break;
        default:
          if (link) {
            CreepBase.travelTo(creep, link, "orange");
          }
      }
    }
  }
  private static runHarvesters(source: Source): void {
    _.filter(Game.creeps, (c) => c.memory.role === "harvesterStatic" && c.memory.targetSource === source.id)
      .sort((a, b) => a.store.getUsedCapacity() - b.store.getUsedCapacity())
      .map((c) => {
        this.runHarvester(c, source);
      });
  }
  private static runLink(link: StructureLink, anchor: Flag): void{
    const anchorLink = this.getAnchorLink(link.room, anchor);
    if(link && anchorLink && link.cooldown === 0){
      const toTransfer = Math.min(800 - anchorLink.store[RESOURCE_ENERGY], link.store[RESOURCE_ENERGY]);
      const transferBoundary = 200;
      if(toTransfer > transferBoundary){
        link.transferEnergy(anchorLink, toTransfer);
      }
    }
  }
  private static getAnchorLink(room: Room, anchor: Flag): StructureLink | null {
    return anchor.pos.findInRange<StructureLink>(FIND_MY_STRUCTURES, 1, {
      filter: (s) => s.structureType === STRUCTURE_LINK
    })[0];
  }
  public static run(room: Room, source: Source, link: StructureLink, anchor: Flag): void {
    this.runHarvesters(source);
    this.spawnStaticHarvester(room, source, link)
  }
}
