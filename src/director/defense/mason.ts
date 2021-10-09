import { CreepBase } from "roles/role.creep";
import { CreepBuilder } from "utils/creepBuilder";
const repairLimit = 2_000_000;
export class DefenseMason {
  public static runMason(creep: Creep): void {
    if (creep.ticksToLive) {
      const storage = Game.getObjectById<StructureStorage>(creep.memory.refuelTarget);
      const allRamparts = creep.room.find(FIND_STRUCTURES, {
        filter: (s) =>
          (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL) && s.hits < repairLimit
      });
      const currentAvg = allRamparts.reduce((acc, r) => acc + r.hits, 0) / allRamparts.length;
      if (Game.time % 5 === 0) {
        console.log(`Avg Fortification HP: ${currentAvg.toPrecision(8)}`);
      }
      const currentTarget = creep.memory.workTarget
        ? Game.getObjectById<StructureRampart | StructureWall>(creep.memory.workTarget)
        : allRamparts.sort((a, b) => a.hits - b.hits)[0];
      if (currentTarget && storage) {
        creep.memory.workTarget = currentTarget.id;
        switch (true) {
          case currentTarget.hits > currentAvg + 10_000:
            creep.memory.workTarget = "";
            break;
          case creep.store.getUsedCapacity() === 0 && !creep.pos.isNearTo(storage):
            CreepBase.travelTo(creep, storage, "white");
            break;
          case creep.store.getUsedCapacity() === 0 &&
            creep.pos.isNearTo(storage) &&
            storage.store[RESOURCE_ENERGY] > creep.room.energyCapacityAvailable + creep.store.getCapacity():
            creep.withdraw(storage, RESOURCE_ENERGY);
            creep.memory.workTarget = "";
            break;
          case creep.store.getUsedCapacity() > 0 && !creep.pos.inRangeTo(currentTarget, 3):
            CreepBase.travelTo(creep, currentTarget, "white");
            break;
          case creep.store.getUsedCapacity() > 0 && creep.pos.inRangeTo(currentTarget, 3):
            creep.repair(currentTarget);
            break;
        }
      }
    }
  }
  public static runMasons(room: Room): void {
    _.filter(Game.creeps, (c) => c.memory.role === "mason" && c.memory.homeRoom === room.name).map((c) =>
      this.runMason(c)
    );
  }
  public static spawnMasons(room: Room): void {
    const activeMasons = _.filter(Game.creeps, (c) => c.memory.role === "mason" && c.memory.homeRoom === room.name);
    const queuedMasons = Memory.roomStore[room.name].spawnQueue.filter(
      (c) => c.memory.role === "mason" && c.memory.homeRoom === room.name
    );
    const storage = room.find<StructureStorage>(FIND_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_STORAGE
    })[0];
    const allRamparts = room.find(FIND_STRUCTURES, {
      filter: (s) =>
        (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL) && s.hits < repairLimit
    });
    const currentAvg = allRamparts.reduce((acc, r) => acc + r.hits, 0) / allRamparts.length;
    const needsTech =
      activeMasons.length + queuedMasons.length < 1 &&
      storage &&
      room.find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_RAMPART }).length > 0;
    const energyBudget =
      currentAvg < 1_000_000
        ? Math.min(room.energyCapacityAvailable, 1250)
        : currentAvg < 2_000_000
        ? Math.min(room.energyCapacityAvailable, 500)
        : 0;
    if (needsTech && energyBudget > 200) {
      Memory.roomStore[room.name].spawnQueue.push({
        template: CreepBuilder.buildScaledBalanced(Math.min(room.energyCapacityAvailable, energyBudget)),
        memory: {
          ...CreepBase.baseMemory,
          role: "mason",
          homeRoom: room.name,
          targetRoom: room.name,
          refuelTarget: storage.id
        }
      });
    }
  }
}
