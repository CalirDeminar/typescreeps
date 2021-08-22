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
const maxExtensions = Constants.maxExtensions;
const maxTowers = Constants.maxTowers;
const placeExtension = (room: Room) => {
  const base = room.find(FIND_FLAGS, { filter: (f: Flag) => f.name.includes("base") })[0];
  let done = false;
  let rad = 2;
  while (!done) {
    for (let x = rad * -1; x <= rad; x++) {
      for (let y = rad * -1; y <= rad; y++) {
        const isReserved = Math.abs(x) < 2 && Math.abs(y) < 2;
        const hasObstructions =
          _.filter(room.lookAt(base.pos.x + x, base.pos.y + y), (t: { type: string }) => {
            return t.type === "structure" || t.type === "constructionSite";
          }).length > 0;
        const isOnPattern = Math.abs(x + y) % 4 === 0 && x % 2 === 0 && y % 2 === 0;
        if (!isReserved && !hasObstructions && isOnPattern) {
          room.createConstructionSite(base.pos.x + x, base.pos.y + y, STRUCTURE_EXTENSION);
          done = true;
          break;
        }
      }
    }
    rad += 2;
  }
};
const placeContainers = (room: Room): void => {
  const sources = room.find(FIND_SOURCES);
  for (const sourceName in sources) {
    const source = sources[sourceName];
    const containers = source.pos.findInRange(FIND_STRUCTURES, 1, {
      filter: (s: Structure) => s.structureType === STRUCTURE_CONTAINER
    });
    const containerSites = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
      filter: (s) => s.structureType === STRUCTURE_CONTAINER
    });
    if (containers.length + containerSites.length < 1) {
      const creepInRange = source.pos.findInRange(FIND_MY_CREEPS, 1, {
        filter: (c: Creep) => c.memory.role === "harvester"
      })[0];
      if (creepInRange != null) {
        source.room.createConstructionSite(creepInRange.pos, STRUCTURE_CONTAINER);
      }
    }
  }
};

export class ConstructionManager {
  public static run(room: Room) {
    const builtExtensions = room.find(FIND_STRUCTURES, {
      filter: (s: Structure) => s.structureType === STRUCTURE_EXTENSION
    });
    const buildingExtensions = room.find(FIND_CONSTRUCTION_SITES, {
      filter: (c: ConstructionSite) => c.structureType === STRUCTURE_EXTENSION
    });
    const rcl = room.controller ? room.controller.level : 0;
    if (builtExtensions.length + buildingExtensions.length < maxExtensions[rcl]) {
      placeExtension(room);
    }
    if (
      room.controller &&
      room.controller.my &&
      room.controller.level > 2 &&
      !Memory.roomStore[room.name].sourceRoadsQueued
    ) {
      placeContainers(room);
      //buildRoads(room);
    }
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
  private static getRoadList(room: Room, anchor: RoomPosition): RoomPosition[] {
    const output = _.range(-3, 4).map((x) => {
      return _.range(-3, 4).map((y) => {
        if (Math.abs(x) + Math.abs(y) === 3) {
          return new RoomPosition(anchor.x + x, anchor.y + y, room.name);
        } else {
          return null;
        }
      }).filter((item): item is RoomPosition => item != null)
    }).flat()
    return output;
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
  public static run2(room: Room) {
    const anchor = this.getRoomAnchor(room);
    const controller = room.controller;
    let activeConstructionSite = room.find(FIND_MY_CONSTRUCTION_SITES).length > 0;
    if (anchor && controller && !activeConstructionSite) {
      const level = controller.level;
      const structures = room.find(FIND_MY_STRUCTURES);
      // Extensions
      const extensionCount = structures.filter((s) => s.structureType === STRUCTURE_EXTENSION).length
      if (Constants.maxExtensions[level] > extensionCount && !activeConstructionSite) {
        const extensionList = this.getExtensionList(room, anchor.pos);
        const nextExtensionPos = extensionList.find((e) => e.lookFor(LOOK_STRUCTURES).length === 0)
        nextExtensionPos?.createConstructionSite(STRUCTURE_EXTENSION)
        activeConstructionSite = true;
      }
      // Towers
      const towerCount = structures.filter((s) => s.structureType === STRUCTURE_TOWER).length
      if (Constants.maxTowers[level] > towerCount && !activeConstructionSite) {
        const towerList = this.getTowerList(room, anchor.pos);
        const nextTowerPos = towerList.find((e) => e.lookFor(LOOK_STRUCTURES).length === 0)
        nextTowerPos?.createConstructionSite(STRUCTURE_EXTENSION)
        activeConstructionSite = true;
      }
      // Roads
      if (!activeConstructionSite) {
        const roadList = this.getRoadList(room, anchor.pos);
        const nextRoadPos = roadList.find((e) => e.lookFor(LOOK_STRUCTURES).length === 0)
        nextRoadPos?.createConstructionSite(STRUCTURE_ROAD)
        activeConstructionSite = true;
      }
    }
  }
}
