import { CreepBase } from "roles/role.creep";
import { CreepBuilder } from "utils/creepBuilder";
import { Queen } from "roles/role.queen";
export class QueenDirector {
  public static spawnQueen(room: Room, container: StructureContainer | StructureStorage | null): void {
    if (container && container.store.getUsedCapacity() > 0) {
      const activeQueens = _.filter(
        Game.creeps,
        (c) => c.memory.role === "queen" && c.memory.targetRoom === room.name && c.memory.homeRoom === room.name
      );
      const queuedQueens = Memory.roomStore[room.name].spawnQueue.filter(
        (c) => c.memory.role === "queen" && c.memory.targetRoom === room.name && c.memory.homeRoom === room.name
      );
      if (
        activeQueens.length < 1 ||
        (activeQueens.length === 1 &&
          activeQueens[0] &&
          activeQueens[0].ticksToLive &&
          activeQueens[0].ticksToLive < 100)
      ) {
        const optimalEnergy =
          activeQueens.length === 1
            ? Math.min(room.energyCapacityAvailable, 1250)
            : Math.max(room.energyAvailable, 300);
        const template = {
          template: CreepBuilder.buildHaulingCreep(optimalEnergy),
          memory: {
            ...CreepBase.baseMemory,
            role: "queen",
            working: false,
            born: Game.time,
            homeRoom: room.name,
            targetRoom: room.name
          }
        };
        if (queuedQueens.length > 0) {
          const index = Memory.roomStore[room.name].spawnQueue.findIndex(
            (c) => c.memory.role === "queen" && c.memory.homeRoom === room.name && c.memory.targetRoom === room.name
          );
          if (index >= 0) {
            Memory.roomStore[room.name].spawnQueue[index] = template;
          }
        } else {
          Memory.roomStore[room.name].spawnQueue.push(template);
        }
      }
    }
  }
  private static runQueen(creep: Creep, container: StructureContainer | StructureStorage): void {
    Queen.run(creep);
  }
  public static runQueens(room: Room, container: StructureContainer | StructureStorage): void {
    _.filter(
      Game.creeps,
      (c) => c.memory.role === "queen" && c.memory.targetRoom === room.name && c.memory.homeRoom === room.name
    ).map((c) => this.runQueen(c, container));
  }
}
