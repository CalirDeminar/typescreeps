import { ConstructionTemplates } from "director/templates/constructionTemplates";
import { UtilPosition } from "utils/util.position";
export class DefenseManager {
  public static maintainRoom(room: Room): void {
    const towers = room.find(FIND_MY_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_TOWER });
    towers.map((t) => {
      if (t.structureType === STRUCTURE_TOWER && t.store[RESOURCE_ENERGY] / 1000 > 0.5) {
        const target = t.room
          .find(FIND_STRUCTURES, {
            filter: (s) =>
              s.hits < s.hitsMax - 500 && s.hits < (s.structureType === STRUCTURE_RAMPART ? 10_000 : 200_000)
          })
          .sort((a, b) => a.hits - b.hits)[0];
        if (target) {
          t.repair(target);
        }
      }
    });
  }
  public static defendRoom(room: Room, targets: Creep[]): void {
    const towers = room.find(FIND_MY_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_TOWER });
    const lowestHealthCreep = targets.sort((c) => c.hits)[0];
    towers.map((t) => {
      if (t.structureType === STRUCTURE_TOWER) {
        t.attack(lowestHealthCreep);
      }
    });
  }
  private static runTowers(room: Room, targets: Creep[]): void {
    if (targets.length > 0) {
      this.defendRoom(room, targets);
    } else {
      this.maintainRoom(room);
    }
  }
  private static makeSourceRamparts(room: Room): RoomPosition[] {
    const anchor = room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0];
    return room
      .find(FIND_SOURCES)
      .map((source) => {
        return [
          UtilPosition.getClosestSurroundingTo(source.pos, anchor.pos),
          UtilPosition.getClosestSurroundingTo(UtilPosition.getClosestSurroundingTo(source.pos, anchor.pos), anchor.pos)
        ];
      })
      .reduce((acc, p) => acc.concat(p), []);
  }
  private static makeRamparts(room: Room): void {
    const controller = room.controller;
    if (controller && controller.level >= 4) {
      ConstructionTemplates.ramparts(room)
        .concat(this.makeSourceRamparts(room))
        .map((p) => {
          room.createConstructionSite(p, STRUCTURE_RAMPART);
        });
    }
  }
  private static runMaintinenceTech(creep: Creep): void {
    const repairLimit = 2_000_000;
  }
  private static spawnMaintinenceTech(room: Room): void {
    const techs = _.filter(Game.creeps, (c) => c.memory.role === "maintinenceTech" && c.memory.homeRoom === room.name);
    const needsTech =
      techs.length < 1 &&
      room.find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_RAMPART }).length > 0;
    if (needsTech) {
    }
  }
  public static run(room: Room): void {
    const targets = room.find(FIND_HOSTILE_CREEPS);
    this.runTowers(room, targets);
    this.makeRamparts(room);
  }
}
