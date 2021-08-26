// Flag Anchor 0,0
// Spawn 1 - 0, 1
// Spawn 2 - 0, -1
// Tower 1 - 0, 2
// Tower 2 - 0, -2
// Tower 3 - 2, 0
// Tower 4 - -2, 0
// Tower 5 - 1, 1
// Tower 6 - -1, -1
// Link Base - 1, -1
// Storage - -1, 0
// Terminal - 1, 0
// Nuker - -1, 1

import { Constants } from "utils/constants";
import { UtilPosition } from "utils/util.position";
export class ConstructionManager {
  private static getStoragePos(room: Room, anchor: RoomPosition): RoomPosition {
    return new RoomPosition(anchor.x - 1, anchor.y, room.name);
  }
  private static getTowerList(room: Room, anchor: RoomPosition): RoomPosition[] {
    if (room.controller) {
      const output = _.range(0, 6).map((i) => {
        const pos = Constants.towerOffsets[i];
        return new RoomPosition(anchor.x + pos.x, anchor.y + pos.y, room.name);
      });
      return output;
    }
    return [];
  }
  private static getSurrondingRoadList(room: Room, anchor: RoomPosition): RoomPosition[] {
    const output = _.range(-3, 4)
      .map((x) => {
        return _.range(-3, 4)
          .map((y) => {
            if (Math.abs(x) + Math.abs(y) === 3) {
              return new RoomPosition(anchor.x + x, anchor.y + y, room.name);
            } else {
              return null;
            }
          })
          .filter((item): item is RoomPosition => item != null);
      })
      .reduce((acc, arr) => acc.concat(arr), []);
    return output;
  }
  private static getRoadListToSources(room: Room, anchor: RoomPosition): RoomPosition[] {
    return room
      .find(FIND_SOURCES)
      .map((s) => {
        const path = anchor.findPathTo(s, { ignoreCreeps: true, swampCost: 1, ignoreRoads: true });
        return path.map((p) => new RoomPosition(p.x, p.y, room.name));
      })
      .reduce((acc, arr) => acc.concat(arr), []);
  }
  private static getRoadListToController(room: Room, anchor: RoomPosition): RoomPosition[] {
    if (room.controller) {
      return room.controller.pos
        .findPathTo(anchor, { ignoreCreeps: true, swampCost: 1, ignoreRoads: true })
        .map((p) => new RoomPosition(p.x, p.y, room.name));
    }
    return [];
  }
  private static getExtensionBlockType1(
    room: Room,
    anchor: RoomPosition,
    xMult: number,
    yMult: number
  ): RoomPosition[] {
    const baseX = anchor.x + 2 * xMult;
    const baseY = anchor.y + 2 * yMult;
    return [
      new RoomPosition(baseX, baseY, room.name),
      new RoomPosition(baseX + 1 * xMult, baseY, room.name),
      new RoomPosition(baseX, baseY + 1 * yMult, room.name),
      new RoomPosition(baseX + -1 * xMult, baseY + 1 * yMult, room.name),
      new RoomPosition(baseX + 1 * xMult, baseY + -1 * yMult, room.name)
    ];
  }
  private static getExtensionBlockType2(
    room: Room,
    anchor: RoomPosition,
    xMult: number,
    yMult: number
  ): RoomPosition[] {
    const baseX = anchor.x + 4 * xMult;
    const baseY = anchor.y + 4 * yMult;
    return [
      new RoomPosition(baseX, baseY, room.name),
      new RoomPosition(baseX + -1 * xMult, baseY, room.name),
      new RoomPosition(baseX, baseY + -1 * yMult, room.name),
      new RoomPosition(baseX + -1 * xMult, baseY + 1 * yMult, room.name),
      new RoomPosition(baseX + 1 * xMult, baseY + -1 * yMult, room.name),
      new RoomPosition(baseX + -2 * xMult, baseY + 1 * yMult, room.name),
      new RoomPosition(baseX + 1 * xMult, baseY + -2 * yMult, room.name),
      new RoomPosition(baseX + -2 * xMult, baseY + 2 * yMult, room.name),
      new RoomPosition(baseX + 2 * xMult, baseY + -2 * yMult, room.name)
    ];
  }
  private static getExtensionList(room: Room, anchor: RoomPosition): RoomPosition[] {
    return [
      ...this.getExtensionBlockType1(room, anchor, 1, 1),
      ...this.getExtensionBlockType1(room, anchor, 1, -1),
      ...this.getExtensionBlockType1(room, anchor, -1, 1),
      ...this.getExtensionBlockType1(room, anchor, -1, -1),
      ...this.getExtensionBlockType2(room, anchor, 1, 1),
      ...this.getExtensionBlockType2(room, anchor, 1, -1),
      ...this.getExtensionBlockType2(room, anchor, -1, 1),
      ...this.getExtensionBlockType2(room, anchor, -1, -1)
    ];
  }
  private static getRoomAnchor(room: Room): Flag | null {
    const anchor: Flag | null = room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0];
    if (anchor) {
      return anchor;
    } else {
      const spawn = room.find(FIND_MY_SPAWNS)[0];
      if (spawn) {
        const pos = spawn.pos;
        room.createFlag(pos.x, pos.y + 1, `${room.name}-Anchor`);
      }
      return null;
    }
  }
  private static getSourceContainerList(room: Room): RoomPosition[] {
    const sources = room.find(FIND_SOURCES);
    const spawn = room.find(FIND_MY_SPAWNS)[0];
    return sources.map((source) => {
      return UtilPosition.getClosestSurroundingTo(source.pos, spawn.pos);
    });
  }
  public static run2(room: Room) {
    const anchor = this.getRoomAnchor(room);
    const controller = room.controller;
    let activeConstructionSite = room.find(FIND_MY_CONSTRUCTION_SITES).length > 0;
    if (anchor && controller && !activeConstructionSite) {
      const level = controller.level;
      const structures = room.find(FIND_STRUCTURES);
      // Containers
      const containerCount = structures.filter((s) => s.structureType === STRUCTURE_CONTAINER).length;
      if (level > 2 && containerCount < room.find(FIND_SOURCES).length) {
        const containerList = this.getSourceContainerList(room);
        const nextContainerPos = containerList.find(
          (e) => e.lookFor(LOOK_STRUCTURES).filter((s) => s.structureType !== STRUCTURE_ROAD).length === 0
        );
        nextContainerPos?.createConstructionSite(STRUCTURE_CONTAINER);
        activeConstructionSite = true;
      }
      // Extensions
      const extensionCount = structures.filter((s) => s.structureType === STRUCTURE_EXTENSION).length;
      if (Constants.maxExtensions[level] > extensionCount && !activeConstructionSite) {
        const extensionList = this.getExtensionList(room, anchor.pos);
        const nextExtensionPos = extensionList.find(
          (e) => e.lookFor(LOOK_STRUCTURES).filter((s) => s.structureType !== STRUCTURE_ROAD).length === 0
        );
        nextExtensionPos?.createConstructionSite(STRUCTURE_EXTENSION);
        activeConstructionSite = true;
      }
      // Towers
      const towerCount = structures.filter((s) => s.structureType === STRUCTURE_TOWER).length;
      if (Constants.maxTowers[level] > towerCount && !activeConstructionSite) {
        const towerList = this.getTowerList(room, anchor.pos);
        const nextTowerPos = towerList.find(
          (e) => e.lookFor(LOOK_STRUCTURES).filter((s) => s.structureType !== STRUCTURE_ROAD).length === 0
        );
        nextTowerPos?.createConstructionSite(STRUCTURE_TOWER);
        activeConstructionSite = true;
      }
      // Storage
      const needsStorage =
        level >= 4 && room.find(FIND_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_STORAGE }).length === 0;
      if (!activeConstructionSite && needsStorage) {
        this.getStoragePos(room, anchor.pos).createConstructionSite(STRUCTURE_STORAGE);
        activeConstructionSite = true;
      }
      // Roads
      if (!activeConstructionSite && level > 2) {
        const roadList = this.getSurrondingRoadList(room, anchor.pos)
          .concat(this.getRoadListToSources(room, anchor.pos))
          .concat(this.getRoadListToController(room, anchor.pos));
        const nextRoadPos = roadList.find(
          (e) => e.lookFor(LOOK_STRUCTURES).length === 0 && e.lookFor(LOOK_SOURCES).length === 0
        );
        nextRoadPos?.createConstructionSite(STRUCTURE_ROAD);
        activeConstructionSite = true;
      }
      // buildTarget
      const target = room.find(FIND_CONSTRUCTION_SITES)[0];
      const creeps = _.filter(Game.creeps, (c) => c.memory.role === "builder");
      creeps.map((c) => (c.memory.workTarget = target ? target.id : ""));
      //  Generalise some code for the fixed position buildings?
    }
  }
}
