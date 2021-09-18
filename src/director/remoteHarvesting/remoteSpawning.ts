import { CreepBase } from "roles/role.creep";
import { RemoteConstruction } from "./remoteConstruction";
export class RemoteSpawning {
  public static createTemplates(energy: number): { hauler: BodyPartConstant[]; worker: BodyPartConstant[] } {
    const workerN = 150;
    const workerOverhead = 50;
    const haulerN = 500;
    const scaleBudget = energy - 200;
    const sectionCount = Math.floor(scaleBudget / haulerN);
    return {
      hauler: [...new Array(sectionCount * 5).fill("carry"), ...new Array(sectionCount * 5).fill("move")],
      worker: [...new Array(sectionCount).fill("work"), ...new Array(sectionCount).fill("move"), "carry"]
    };
    // non-overhead = ener
    // harvester design - N*[WORK, MOVE] + [CARRY]
    // hauler design - 6N*[MOVE, CARRY]
    // ONLY spawn hauler if container has been made
  }
  private static haulerTemplate(energy: number): BodyPartConstant[] {
    return this.createTemplates(energy).hauler;
  }
  private static workerTemplate(energy: number): BodyPartConstant[] {
    return this.createTemplates(energy).worker;
  }
  private static spawnHarvester(
    sourceId: string,
    queuedHarvesters: CreepRecipie[],
    homeRoom: Room,
    targetRoomName: string,
    energyBudget: number
  ): void {
    const template = {
      template: this.workerTemplate(energyBudget),
      memory: {
        ...CreepBase.baseMemory,
        homeRoom: homeRoom.name,
        targetRoom: targetRoomName,
        targetSource: sourceId,
        role: "remoteHarvester",
        working: true
      }
    };
    if (queuedHarvesters.length > 0) {
      const index = Memory.roomStore[homeRoom.name].spawnQueue.findIndex((c) => {
        const mem = c.memory;
        return mem.role === "remoteHarvester" && mem.homeRoom === homeRoom.name && mem.targetSource === sourceId;
      });
      if (index >= 0) {
        Memory.roomStore[homeRoom.name].spawnQueue[index] = template;
      }
    } else {
      Memory.roomStore[homeRoom.name].spawnQueue.push(template);
    }
  }
  private static spawnHauler(
    container: StructureContainer | undefined,
    queuedHaulers: CreepRecipie[],
    homeRoom: Room,
    targetRoomName: string,
    energyBudget: number
  ): void {
    const template = {
      template: this.haulerTemplate(energyBudget),
      memory: {
        ...CreepBase.baseMemory,
        homeRoom: homeRoom.name,
        targetRoom: targetRoomName,
        targetSource: container?.id || "",
        role: "remoteHauler",
        working: true
      }
    };
    if (queuedHaulers.length > 0) {
      const index = Memory.roomStore[homeRoom.name].spawnQueue.findIndex((c) => {
        const mem = c.memory;
        return (
          mem.role === "remoteHauler" && mem.homeRoom === homeRoom.name && mem.targetSource === (container?.id || "")
        );
      });
      if (index >= 0) {
        Memory.roomStore[homeRoom.name].spawnQueue[index] = template;
      }
    } else {
      Memory.roomStore[homeRoom.name].spawnQueue.push(template);
    }
  }
  public static spawnCreeps(room: RemoteDirectorStore, index: number): void {
    const homeRoom = Game.rooms[room.homeRoomName];
    const energyBudget =
      room.sources.length > 1
        ? Math.min(homeRoom.energyCapacityAvailable, 2650)
        : Math.min(homeRoom.energyCapacityAvailable, 1000);
    const sources = room.sources;
    const hostile = room.hostileCreepCount > 0 || room.hostileTowerCount > 0 || room.hasInvaderCore;
    if (!hostile) {
      sources.find((s) => {
        const source = Game.getObjectById<Source>(s.sourceId);
        const container = source?.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 1, {
          filter: (s) => s.structureType === STRUCTURE_CONTAINER
        })[0];
        const harvesters = _.filter(Game.creeps, (c) => {
          const mem = c.memory;
          return mem.role === "remoteHarvester" && mem.homeRoom === homeRoom.name && mem.targetSource === s.sourceId;
        });
        const queuedHarvesters = _.filter(Memory.roomStore[homeRoom.name].spawnQueue, (c) => {
          const mem = c.memory;
          return mem.role === "remoteHarvester" && mem.homeRoom === homeRoom.name && mem.targetSource === s.sourceId;
        });
        if (harvesters.length < 1) {
          // console.log("spawnRemote Harvester");
          this.spawnHarvester(s.sourceId, queuedHarvesters, homeRoom, room.roomName, energyBudget);
        }
        if (homeRoom.energyCapacityAvailable >= 1000) {
          RemoteConstruction.runConstruction(room, index);
          const haulers = _.filter(Game.creeps, (c) => {
            const mem = c.memory;
            return (
              mem.role === "remoteHauler" && mem.homeRoom === room.homeRoomName && mem.targetSource === container?.id
            );
          });
          const queuedHaulers = _.filter(Memory.roomStore[homeRoom.name].spawnQueue, (c) => {
            const mem = c.memory;
            return (
              mem.role === "remoteHauler" && mem.homeRoom === room.homeRoomName && mem.targetSource === container?.id
            );
          });
          if (haulers.length < 1 && container) {
            // console.log("Spawn Remote Hauler");
            this.spawnHauler(container, queuedHaulers, homeRoom, room.roomName, energyBudget);
          }
        }
      });
    }
  }
}
