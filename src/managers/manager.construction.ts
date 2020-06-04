const maxExtensions = [0, 0, 5, 10, 20, 30, 40, 50, 60];
const placeExtension = (room: Room) => {
  const base = room.find(FIND_FLAGS, { filter: (f: Flag) => Flag.name.includes("base") })[0];
  let done = false;
  let rad = 4;
  while (!done) {
    for (let x = rad * -1; x <= rad; x++) {
      for (let y = rad * -1; y <= rad; y++) {
        const isReserved = (Math.abs(x) < 2 && Math.abs(y) < 2) || (Math.abs(x) === 2 && Math.abs(y) === 2);
        const hasObstructions =
          _.filter(room.lookAt(base.pos.x + x, base.pos.y), (t: { type: string }) => {
            return t.type === "structure" || t.type === "constructionSite";
          }).length > 0;
        const isOnPattern = (x + y) % 4 === 0;
        if (!isReserved && !hasObstructions && isOnPattern) {
          room.createConstructionSite(base.pos.x + x, base.pos.y + y, STRUCTURE_EXTENSION);
          done = true;
        }
      }
    }
    rad += 2;
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
  }
}
