import util_mincut, { Rect, Tile } from "./mincut";
const UNWALKABLE = -1;
const NORMAL = 0;
const PROTECTED = 1;
const TO_EXIT = 2;
const EXIT = 3;
type terrainTypes = -1 | 0 | 1 | 2 | 3;
export class WallPlanner {
  private static getRoomArray(roomName: string): terrainTypes[][] {
    const bounds = { x1: 0, y1: 0, x2: 49, y2: 49 };
    const terrain = Game.map.getRoomTerrain(roomName);
    let room = new Array(50).fill(0).map((_x) => new Array(50).fill(UNWALKABLE));
    _.range(bounds.x1, bounds.x2 + 1).forEach((x) => {
      _.range(bounds.y1, bounds.y2 + 1).forEach((y) => {
        if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
          // CHECK TO_EXIT IS NEXT TO AN EXIT
          switch (true) {
            case x === 0 || y === 0 || x === 49 || y === 49: {
              room[x][y] = UNWALKABLE;
              break;
            }
            case x === 1 || y === 1 || x === 48 || y === 48: {
              room[x][y] = TO_EXIT;
              break;
            }
            default:
              room[x][y] = NORMAL;
          }
        }
      });
      return room;
    });

    return room;
  }
  private static paddBounds(perimeter: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }): { x1: number; y1: number; x2: number; y2: number } {
    const buffer = 2;
    return {
      x1: Math.max(perimeter.x1 - buffer, 2),
      y1: Math.max(perimeter.y1 - buffer, 2),
      x2: Math.min(perimeter.x2 + buffer, 47),
      y2: Math.min(perimeter.y2 + buffer, 47)
    };
  }
  public static getPerimeterOld(room: Room) {
    const roomEdges = { x1: 50, y1: 50, x2: 0, y2: 0 };
    const memory = Memory.roomStore[room.name].constructionDirector;
    const structures = [
      ...memory.extensionTemplate,
      ...memory.towerTemplate,
      ...memory.labTemplate,
      ...memory.singleStructures.map((s) => s.pos),
      ...memory.internalRoadTemplate
    ];
    const sources = room.find(FIND_SOURCES).map((s) => s.pos);
    const minerals = room.find(FIND_MINERALS).map((s) => s.pos);
    // TODO - add paths from sources & controller & mineral to anchor
    const toProtect = [...structures, ...sources, ...minerals];
    const xs = toProtect.map((p) => p.x);
    const ys = toProtect.map((p) => p.y);
    const rect = this.paddBounds({
      x1: Math.min(roomEdges.x1, ...xs),
      y1: Math.min(roomEdges.y1, ...ys),
      x2: Math.max(roomEdges.x2, ...xs),
      y2: Math.max(roomEdges.y2, ...ys)
    });
    let roomArray = this.getRoomArray(room.name);
    _.range(rect.x1, rect.x2 + 1).forEach((x) => {
      _.range(rect.y1, rect.y2 + 1).forEach((y) => {
        if (roomArray[x][y] === NORMAL) {
          roomArray[x][y] = PROTECTED;
        }
      });
    });
    roomArray.forEach((next, x) => {
      next.forEach((value, y) => {
        const color =
          value === UNWALKABLE ? "black" : value === PROTECTED ? "blue" : value === TO_EXIT ? "red" : "grey";
        const opacity = value === UNWALKABLE ? 0 : value === TO_EXIT ? 0.3 : 0.15;
        room.visual.circle(x, y, { radius: 0.5, fill: color, opacity: opacity });
      });
    });
    return rect;
  }
  private static getBoundingRect(structures: RoomPosition[]) {
    const roomEdges = { x1: 50, y1: 50, x2: 0, y2: 0 };
    const xs = structures.map((p) => p.x);
    const ys = structures.map((p) => p.y);
    return this.paddBounds({
      x1: Math.min(roomEdges.x1, ...xs),
      y1: Math.min(roomEdges.y1, ...ys),
      x2: Math.max(roomEdges.x2, ...xs),
      y2: Math.max(roomEdges.y2, ...ys)
    });
  }
  public static getPerimeter(room: Room) {
    const memory = Memory.roomStore[room.name].constructionDirector;
    const sources = room.find(FIND_SOURCES).map((s) => s.pos);
    const minerals = room.find(FIND_MINERALS).map((s) => s.pos);
    const structures = room.controller
      ? memory.singleStructures.map((s) => s.pos).concat(room.controller.pos)
      : memory.singleStructures.map((s) => s.pos);
    const rects = [
      this.getBoundingRect(memory.extensionTemplate),
      this.getBoundingRect(memory.towerTemplate),
      this.getBoundingRect(memory.labTemplate),
      this.getBoundingRect([...structures, ...minerals]),
      this.getBoundingRect(memory.internalRoadTemplate),
      this.getBoundingRect(sources)
    ];
    // TODO - write own minCut alg
    const chokes = util_mincut.GetCutTiles(room.name, rects);
    const walls = chokes.reduce(
      (acc: RoomPosition[], c: Tile, i: number) => (i % 3 ? acc.concat([new RoomPosition(c.x, c.y, room.name)]) : acc),
      []
    );
    const ramparts = chokes.reduce(
      (acc: RoomPosition[], c: Tile, i: number) =>
        !(i % 3) ? acc.concat([new RoomPosition(c.x, c.y, room.name)]) : acc,
      []
    );
    walls.forEach((c, i) => room.visual.text(`W`, c.x, c.y, { stroke: "green", opacity: 0.3 }));
    ramparts.forEach((c, i) => room.visual.text(`R`, c.x, c.y, { stroke: "green", opacity: 0.3 }));
    return { walls, ramparts };
  }
}
