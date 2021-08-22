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

import { Position } from "source-map";
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
const placeTowers = (room: Room): void => {
  // TODO - handle > 4 towers
  if (room.controller) {
    const base = room.find(FIND_FLAGS, { filter: (f: Flag) => f.name.includes("base") })[0];
    let currentTowerCount = room.find(FIND_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_TOWER}).length
    let hasBuiltThisPass = currentTowerCount >= maxTowers[room.controller.level];
    for(let x=-1; x <= 1; x+=2) {
      for(let y=-1; y <=1; y+=2) {
        const hasObstructions =
          _.filter(room.lookAt(base.pos.x + x, base.pos.y + y), (t: { type: string }) => {
            return t.type === "structure" || t.type === "constructionSite";
          }).length > 0;
          if (!hasBuiltThisPass && !hasObstructions) {
            room.createConstructionSite(base.pos.x + x, base.pos.y + y, STRUCTURE_TOWER)
            hasBuiltThisPass = true;
          }
      }
    }
  }
}
const buildRoads = (room: Room): void => {
  const sources = room.find(FIND_SOURCES);
  const base = room.find(FIND_FLAGS, { filter: (f: Flag) => f.name.includes("base") })[0];
  for (const sourceName in sources) {
    const source = sources[sourceName];
    const pathToSource = source.pos.findPathTo(base.pos);
    _.map(pathToSource, (step: PathStep) => {
      room.createConstructionSite(step.x, step.y, STRUCTURE_ROAD);
    });
  }
  const controller = room.controller;
  if (controller) {
    const pathToController = controller.pos.findPathTo(base.pos);
    _.map(pathToController, (step: PathStep) => {
      if (step.x !== controller.pos.x && step.y !== controller.pos.y) {
        room.createConstructionSite(step.x, step.y, STRUCTURE_ROAD);
      }
    });
  }
  Memory.roomStore[room.name].sourceRoadsQueued = true;
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
    placeTowers(room);
  }
  private static placeExtensionBlock(room: Room, anchor: RoomPosition, xMult: number, yMult: number): void {
    const baseX = anchor.x += (2*xMult);
    const baseY = anchor.y += (2*yMult);
    [
      RoomPosition(baseX + (-1*xMult), baseY + (1*yMult), room.name),
      RoomPosition(baseX, baseY + (1*yMult), room.name),
      RoomPosition(baseX, baseY, room.name),
      RoomPosition(baseX + (1*xMult), baseY, room.name),
      RoomPosition(baseX + (1*xMult), baseY + (-1*yMult), room.name)
    ].map((pos: RoomPosition) => pos.createConstructionSite(STRUCTURE_EXTENSION))
  }
  private static placeExtensions(room: Room, anchor: RoomPosition): void {
    this.placeExtensionBlock(room, anchor, 1, 1);
  }
  private static getRoomAnchor(room: Room): Flag | null {
    const anchor: Flag | null = room.find(FIND_FLAGS, {filter: (f) => f.name === `${room.name}-Anchor`})[0];
    if (anchor) {
      return anchor;
    } else {
      const spawn = room.find(FIND_MY_SPAWNS)[0]
      if (spawn) {
        const pos = spawn.pos;
        room.createFlag(pos.x, pos.y-1, `${room.name}-Anchor`)
      }
      return null;
    }
  }
  public static run2(room: Room) {
    const anchor = this.getRoomAnchor(room);
    if (anchor) {
      this.placeExtensions(room, anchor.pos);
    }
  }
}
