import { CreepBase } from "roles/role.creep";
import { CreepBuilder } from "utils/creepBuilder";
import { Constants } from "utils/constants";
import { UtilPosition } from "utils/util.position";
import { CreepUtils } from "rework/utils/creepUtils";
import { RoomUtils } from "rework/utils/roomUtils";
export interface CreepHarvesterStaticLinkMemory {
  role: "harvesterStatic";
  homeRoom: string;
  targetRoom: string;
  targetSource: string;
  working: boolean;
}
export class LocalRoomEnergyLink {
  private static shouldReplaceCreeps(creeps: Creep[], queuedCreeps: CreepRecipie[], max: number): boolean {
    return (
      creeps.length + queuedCreeps.length < max ||
      (creeps.length + queuedCreeps.length === max && !!creeps.find((c) => c.ticksToLive && c.ticksToLive < 150))
    );
  }
  private static spawnStaticHarvester(source: Source, link: StructureLink): boolean {
    const room = source.room;
    const activeHarvesters = CreepUtils.filterCreeps("harvesterStatic", room.name, room.name, source.id);
    const queuedHarvesters = CreepUtils.filterQueuedCreeps(
      room.name,
      "harvesterStatic",
      room.name,
      room.name,
      source.id
    );
    const shouldReplaceHarvester = this.shouldReplaceCreeps(activeHarvesters, [], Constants.maxStatic);
    const deadRoom = _.filter(Game.creeps, (c) => c.memory.homeRoom === source.room.name).length < 4;
    if (shouldReplaceHarvester) {
      const budget = deadRoom ? source.room.energyAvailable : source.room.energyCapacityAvailable;
      const template = {
        template: CreepBuilder.buildStaticLinkHarvester(
          deadRoom ? source.room.energyAvailable : source.room.energyCapacityAvailable
        ),
        memory: {
          ...CreepBase.baseMemory,
          role: "harvesterStatic",
          working: false,
          targetSource: source.id,
          homeRoom: source.room.name,
          targetRoom: source.room.name,
          targetStore: link.id
        }
      };
      if (queuedHarvesters.length > 0) {
        const index = CreepUtils.findQueuedCreepIndex(room.name, "harvesterStatic", room.name, room.name, source.id);
        if (index >= 0) {
          Memory.roomStore[source.room.name].spawnQueue[index] = template;
        }
      } else {
        Memory.roomStore[source.room.name].spawnQueue.push(template);
      }
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
    } else if (working && full) {
      creep.memory.working = false;
    }
  }
  private static getHarvestSpot(room: Room, link: Structure | null, source: Source): RoomPosition | undefined {
    if (link) {
      const terrain = room.getTerrain();
      const linkEdges = _.range(-1, 2)
        .map((x) => {
          return _.range(-1, 2).map((y) => new RoomPosition(link.pos.x + x, link.pos.y + y, link.pos.roomName));
        })
        .reduce((acc, l) => acc.concat(l), []);
      return linkEdges.find((p) => p.isNearTo(source.pos) && terrain.get(p.x, p.y) !== 1);
    }
    return undefined;
  }
  private static runHarvester(creep: Creep, source: Source): void {
    if (creep.ticksToLive) {
      const startCpu = Game.cpu.getUsed();
      this.setWorkingState(creep);
      const working = creep.memory.working;
      const link = CreepBase.findLink(creep);
      switch (true) {
        case working && creep.pos.isNearTo(source) && link && creep.pos.isNearTo(link):
          creep.harvest(source);
          break;
        case working:
          const spot = this.getHarvestSpot(creep.room, link, source);
          if (spot) {
            CreepBase.travelTo(creep, spot, "orange");
          } else {
            CreepBase.travelTo(creep, source, "orange");
          }
          break;
        case !working && link && creep.pos.isNearTo(link):
          if (link) {
            creep.transfer(link, RESOURCE_ENERGY);
            if (creep.pos.isNearTo(source)) {
              creep.harvest(source);
            }
            creep.memory.working = true;
          }
          break;
        default:
          if (link) {
            CreepBase.travelTo(creep, link, "orange");
          }
      }
      const endCpu = Game.cpu.getUsed();
      CreepUtils.recordCreepPerformance(creep, endCpu - startCpu);
    }
  }
  private static runHarvesters(source: Source): void {
    _.filter(
      Game.creeps,
      (c) =>
        c.memory.role === "harvesterStatic" &&
        c.memory.targetSource === source.id &&
        c.memory.homeRoom === source.room.name
    )
      .sort((a, b) => a.store.getUsedCapacity() - b.store.getUsedCapacity())
      .map((c) => {
        this.runHarvester(c, source);
      });
  }
  private static runLink(link: StructureLink, anchor: RoomPosition): void {
    const anchorLink = this.getAnchorLink(anchor);
    if (link && anchorLink && link.cooldown === 0) {
      const toTransfer = Math.min(800 - anchorLink.store[RESOURCE_ENERGY], link.store[RESOURCE_ENERGY]);
      const transferBoundary = 200;
      if (toTransfer > transferBoundary) {
        link.transferEnergy(anchorLink, toTransfer);
      }
    }
  }
  private static getAnchorLink(anchor: RoomPosition): StructureLink | null {
    return anchor.findInRange<StructureLink>(FIND_MY_STRUCTURES, 1, {
      filter: (s) => s.structureType === STRUCTURE_LINK
    })[0];
  }
  public static run(source: Source, link: StructureLink): void {
    const startCpu = Game.cpu.getUsed();
    const anchor = UtilPosition.getAnchor(source.room);

    this.spawnStaticHarvester(source, link);
    this.runLink(link, anchor);
    const usedCpu = Game.cpu.getUsed() - startCpu;
    RoomUtils.recordFilePerformance(source.room.name, "roomLocalEnergyLink", usedCpu);
    this.runHarvesters(source);
  }
}
