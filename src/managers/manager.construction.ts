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
export class ConstructionManager {
  private static getStoragePos(room: Room, anchor: RoomPosition): RoomPosition {
    return new RoomPosition(anchor.x - 1, anchor.y, room.name);
  }
  private static getTowerList(room: Room, anchor: RoomPosition): RoomPosition[] {
    if (room.controller) {
      const output =  _.range(0, 6).map((i) => {
        const pos = Constants.towerOffsets[i];
        return new RoomPosition(anchor.x + pos.x, anchor.y + pos.y, room.name);
      })
      return output;
    }
    return [];
  }
  private static getSurrondingRoadList(room: Room, anchor: RoomPosition): RoomPosition[] {
    const output = _.range(-3, 4).map((x) => {
      return _.range(-3, 4).map((y) => {
        if (Math.abs(x) + Math.abs(y) === 3) {
          return new RoomPosition(anchor.x + x, anchor.y + y, room.name);
        } else {
          return null;
        }
      }).filter((item): item is RoomPosition => item != null)
    }).reduce((acc, arr) => acc.concat(arr),[]);
    return output;
  }
  private static getRoadListToSources(room: Room, anchor: RoomPosition): RoomPosition[] {
    return room.find(FIND_SOURCES).map((s) => {
      const path = anchor.findPathTo(s, {ignoreCreeps: true, swampCost: 1});
      return path.map((p) => new RoomPosition(p.x, p.y, room.name))
    }).reduce((acc, arr) => acc.concat(arr),[]);
  }
  private static getRoadListToController(room: Room, anchor: RoomPosition): RoomPosition[] {
    if (room.controller) {
      return room.controller.pos.findPathTo(anchor, {ignoreCreeps: true}).map((p) => new RoomPosition(p.x, p.y, room.name));
    }
    return [];
  }
  private static getExtensionBlock(room: Room, anchor: RoomPosition, xMult: number, yMult: number): RoomPosition[] {
    const baseX = anchor.x + (2*xMult);
    const baseY = anchor.y + (2*yMult);
    return [
      new RoomPosition(baseX + (-1*xMult), baseY + (1*yMult), room.name),
      new RoomPosition(baseX, baseY + (1*yMult), room.name),
      new RoomPosition(baseX, baseY, room.name),
      new RoomPosition(baseX + (1*xMult), baseY, room.name),
      new RoomPosition(baseX + (1*xMult), baseY + (-1*yMult), room.name),
      new RoomPosition(baseX + (1*xMult), baseY + (1*yMult), room.name),
      new RoomPosition(baseX, baseY + (2*yMult), room.name),
      new RoomPosition(baseX + (2*xMult), baseY, room.name)
    ];
  }
  private static getExtensionList(room: Room, anchor: RoomPosition): RoomPosition[] {
    return [...this.getExtensionBlock(room, anchor, 1, 1),
      ...this.getExtensionBlock(room, anchor, 1, -1),
      ...this.getExtensionBlock(room, anchor, -1, 1),
      ...this.getExtensionBlock(room, anchor, -1, -1)
    ];
  }
  private static getRoomAnchor(room: Room): Flag | null {
    const anchor: Flag | null = room.find(FIND_FLAGS, {filter: (f) => f.name === `${room.name}-Anchor`})[0];
    if (anchor) {
      return anchor;
    } else {
      const spawn = room.find(FIND_MY_SPAWNS)[0]
      if (spawn) {
        const pos = spawn.pos;
        room.createFlag(pos.x, pos.y+1, `${room.name}-Anchor`)
      }
      return null;
    }
  }
  private static getSourceContainerList(room: Room): RoomPosition[] {
    const sources = room.find(FIND_SOURCES);
    const spawn = room.find(FIND_MY_SPAWNS)[0]
    return sources.map((source) => {
      const terrain = room.getTerrain();
      const surroundings = _.range(-1, 2).map((x) => {
        return _.range(-1, 2).map((y) => {
          return {x: x, y: y};
        })
      }).reduce((acc, arr) => acc.concat(arr),[]);

      const rangeList = surroundings.filter((tile: {x: number; y: number}) => {
        return terrain.get(source.pos.x + tile.x, source.pos.y + tile.y) === 0;
      }).sort((tile: {x: number, y: number}): number => {
        if (spawn) {
          return (new RoomPosition(source.pos.x + tile.x, source.pos.y + tile.y, room.name).findPathTo(spawn, {ignoreCreeps: true, swampCost: 1}).length);
        }
        return Infinity;
      });
      const rtn = rangeList[0];
      if (rtn) {
        return new RoomPosition(source.pos.x + rtn.x, source.pos.y + rtn.y, room.name)
      } else {
        return source.pos;
      }
    })
  }
  public static run2(room: Room) {
    const anchor = this.getRoomAnchor(room);
    const controller = room.controller;
    let activeConstructionSite = room.find(FIND_MY_CONSTRUCTION_SITES).length > 0;
    if (anchor && controller && !activeConstructionSite) {
      const level = controller.level;
      const structures = room.find(FIND_STRUCTURES);
      // Extensions
      const extensionCount = structures.filter((s) => s.structureType === STRUCTURE_EXTENSION).length
      if (Constants.maxExtensions[level] > extensionCount && !activeConstructionSite) {
        const extensionList = this.getExtensionList(room, anchor.pos);
        const nextExtensionPos = extensionList.find((e) => e.lookFor(LOOK_STRUCTURES).length === 0)
        nextExtensionPos?.createConstructionSite(STRUCTURE_EXTENSION)
        activeConstructionSite = true;
      }
      // Containers
      const containerCount = structures.filter((s) => s.structureType === STRUCTURE_CONTAINER).length
      if (level > 2 && containerCount < room.find(FIND_SOURCES).length) {
        console.log("Need More Containers");
        const containerList = this.getSourceContainerList(room);
        console.log(containerList);
        const nextContainerPos = containerList.find((e) => e.lookFor(LOOK_STRUCTURES).length === 0)
        nextContainerPos?.createConstructionSite(STRUCTURE_CONTAINER);
        activeConstructionSite = true;
      }
      // Towers
      const towerCount = structures.filter((s) => s.structureType === STRUCTURE_TOWER).length
      if (Constants.maxTowers[level] > towerCount && !activeConstructionSite) {
        const towerList = this.getTowerList(room, anchor.pos);
        const nextTowerPos = towerList.find((e) => e.lookFor(LOOK_STRUCTURES).length === 0)
        nextTowerPos?.createConstructionSite(STRUCTURE_TOWER);
        activeConstructionSite = true;
      }
      // Storage
      const needsStorage = level >= 4 && room.find(FIND_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_STORAGE}).length === 0
      if (!activeConstructionSite && needsStorage) {
        this.getStoragePos(room, anchor.pos).createConstructionSite(STRUCTURE_STORAGE);
        activeConstructionSite = true;
      }
      // Roads
      if (!activeConstructionSite && level > 2) {
        const roadList = this.getSurrondingRoadList(room, anchor.pos)
          .concat(this.getRoadListToSources(room, anchor.pos))
          .concat(this.getRoadListToController(room, anchor.pos));
        const nextRoadPos = roadList.find((e) => e.lookFor(LOOK_STRUCTURES).length === 0 && e.lookFor(LOOK_SOURCES).length === 0)
        nextRoadPos?.createConstructionSite(STRUCTURE_ROAD)
        activeConstructionSite = true;
      }
      //  Generalise some code for the fixed position buildings?
    }
  }
}
