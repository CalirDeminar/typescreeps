import { WallPlanner } from "director/defense/wallPlanner";
import { CreepBase } from "roles/role.creep";
import { CreepBuilder } from "utils/creepBuilder";
import { CreepUtils } from "rework/utils/creepUtils";
import { Constants } from "utils/constants";
import { CombatUtils } from "rework/utils/combat";
export class LocalRoomDefenseFortifications {
  private static findStrategicStructures(room: Room): RoomPosition[] {
    return room
      .find(FIND_MY_STRUCTURES, {
        filter: (s) => {
          const type = s.structureType;
          return type === STRUCTURE_SPAWN || type === STRUCTURE_STORAGE || type === STRUCTURE_TERMINAL;
        }
      })
      .map((s) => s.pos);
  }
  private static spawnMasons(room: Room): void {
    const highAlertLevel = Memory.roomStore[room.name].defenceDirector.alertLevel >= 2;
    const masonTarget = highAlertLevel ? 2 : 1;
    const activeMasons = CreepUtils.filterCreeps("mason", room.name, room.name);
    const queuedMasons = CreepUtils.filterQueuedCreeps(room.name, "mason", room.name, room.name);
    const storage = room.find<StructureStorage>(FIND_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_STORAGE
    })[0];
    const allRamparts = room.find(FIND_STRUCTURES, {
      filter: (s) =>
        (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL) && s.hits < Constants.repairLimit
    });
    const currentAvg = allRamparts.reduce((acc, r) => acc + r.hits, 0) / (allRamparts.length || 1);
    const needsNewMason = activeMasons.length + queuedMasons.length < masonTarget && storage && allRamparts.length > 0;
    const energyBudget =
      currentAvg < 1_000_000 || highAlertLevel
        ? Math.min(room.energyCapacityAvailable, 1250)
        : currentAvg < 2_000_000
        ? Math.min(room.energyCapacityAvailable, 500)
        : 0;
    if (needsNewMason && energyBudget > 200) {
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
  private static runMason(creep: Creep, hostileTiles: RoomPosition[]): void {
    if (creep.ticksToLive) {
      const storage = Game.getObjectById<StructureStorage>(creep.memory.refuelTarget);
      const allRamparts = creep.room.find(FIND_STRUCTURES, {
        filter: (s) =>
          (s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL) &&
          s.hits < Constants.repairLimit
      });
      const currentAvg = allRamparts.reduce((acc, r) => acc + r.hits, 0) / allRamparts.length;
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
            CreepBase.travelTo(creep, storage, "white", 1, hostileTiles);
            break;
          case creep.store.getUsedCapacity() === 0 &&
            creep.pos.isNearTo(storage) &&
            storage.store[RESOURCE_ENERGY] > creep.room.energyCapacityAvailable + creep.store.getCapacity():
            creep.withdraw(storage, RESOURCE_ENERGY);
            creep.memory.workTarget = "";
            break;
          case creep.store.getUsedCapacity() > 0 && !creep.pos.inRangeTo(currentTarget, 3):
            CreepBase.travelTo(creep, currentTarget, "white", 3, hostileTiles);
            break;
          case creep.store.getUsedCapacity() > 0 && creep.pos.inRangeTo(currentTarget, 3):
            creep.repair(currentTarget);
            break;
        }
      }
    }
  }
  private static runMasons(room: Room): void {
    const hotTiles = CombatUtils.getHostileTiles(room);
    CreepUtils.filterCreeps("mason", room.name, room.name).forEach((c) => this.runMason(c, hotTiles));
  }
  private static planDefences(room: Room): void {
    const store = Memory.roomStore[room.name].defenceDirector;
    if (store.rampartMap.length === 0 || store.wallMap.length === 0) {
      // TODO - Move WallPlanner into rework
      const defences = WallPlanner.getPerimeter(room);
      Memory.roomStore[room.name].defenceDirector = {
        ...store,
        rampartMap: defences.ramparts,
        wallMap: defences.walls
      };
    } else {
      store.rampartMap.forEach((r) => room.visual.text("R", r.x, r.y, { stroke: "green", opacity: 0.3 }));
      store.wallMap.forEach((r) => room.visual.text("W", r.x, r.y, { stroke: "green", opacity: 0.3 }));
    }
  }
  private static makeDefences(room: Room): void {
    const controller = room.controller;
    const terrian = room.getTerrain();
    const store = Memory.roomStore[room.name].defenceDirector;
    const storage = room.find<StructureStorage>(FIND_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_STORAGE
    })[0];
    const refreshFrequency = store.alertLevel === 0 ? 500 : 50;
    const runThisTick = Game.time % refreshFrequency === 0;
    if (
      runThisTick &&
      store.rampartMap.length > 0 &&
      controller &&
      controller.level >= 4 &&
      !!storage &&
      room.energyCapacityAvailable > 1000
    ) {
      const strategicStructures = this.findStrategicStructures(room);
      const rampartMap = strategicStructures
        .concat(store.rampartMap)
        .map((w) => new RoomPosition(w.x, w.y, w.roomName));
      const wallMap = store.wallMap.map((w) => new RoomPosition(w.x, w.y, w.roomName));
      rampartMap.forEach((p) => {
        if (p.roomName === room.name && terrian.get(p.x, p.y) !== 1) {
          new RoomPosition(p.x, p.y, room.name).createConstructionSite(STRUCTURE_RAMPART);
        }
      });
      wallMap.forEach((p) => {
        if (
          p.roomName === room.name &&
          terrian.get(p.x, p.y) !== 1 &&
          p
            .lookFor(LOOK_STRUCTURES)
            .filter((s) => s.structureType === STRUCTURE_RAMPART || s.structureType === STRUCTURE_WALL).length === 0
        ) {
          new RoomPosition(p.x, p.y, p.roomName).createConstructionSite(STRUCTURE_WALL);
        }
      });
    }
  }
  public static run(room: Room): void {
    this.planDefences(room);
    this.makeDefences(room);
    this.spawnMasons(room);
    this.runMasons(room);
  }
}
