const maxExtensions = [0, 0, 5, 10, 20, 30, 40, 50, 60];
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
      buildRoads(room);
    }
  }
}
