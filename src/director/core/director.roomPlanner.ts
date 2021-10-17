import { reduce } from "lodash";
import path from "path";
const pathChecks = [];
export class CoreRoomPlanner {
  private static getRoomPositions(roomName: string): RoomPosition[] {
    const terrain = Game.map.getRoomTerrain(roomName);
    return _.range(3, 47)
      .reduce((acc: RoomPosition[], x) => {
        return acc.concat(
          _.range(3, 47).map((y) => {
            return new RoomPosition(x, y, roomName);
          })
        );
      }, [])
      .filter((pos) => terrain.get(pos.x, pos.y) !== 1);
  }
  private static getFreeForTile(pos: RoomPosition): boolean {
    const range = 1;
    const terrain = Game.map.getRoomTerrain(pos.roomName);
    const minX = Math.max(pos.x - range, 2);
    const maxX = Math.min(48, pos.x + range + 1);
    const minY = Math.max(pos.y - range, 2);
    const maxY = Math.min(48, pos.y + range + 1);
    const ranges = _.range(minX, maxX).reduce((acc: RoomPosition[], x) => {
      return acc.concat(
        _.range(minY, maxY).map((y) => {
          return new RoomPosition(x, y, pos.roomName);
        })
      );
    }, []);
    return (
      ranges.length ===
      ranges.filter((pos) => {
        const isXEdge = pos.x === minX || pos.x === maxX;
        const isYEdge = pos.y === minY || pos.y === maxY;
        const isCorner = isXEdge && isYEdge;
        const terrainValue = terrain.get(pos.x, pos.y);
        if (isCorner) {
          return terrainValue === 0;
        }
        return terrainValue !== 1;
      }).length
    );
  }
  private static getFeatureDistance(
    pos: RoomPosition,
    features: RoomPosition[]
  ): { pos: RoomPosition; distance: number } {
    const costs = features.map((feat) => {
      const path = PathFinder.search(pos, { pos: feat, range: 1 }, { swampCost: 2 });
      if (path.incomplete) {
        return Infinity;
      }
      return path.cost;
    });
    return {
      pos: pos,
      distance: _.sum(costs)
    };
  }
  private static getAnchorPoint(
    posList: RoomPosition[],
    sources: Source[],
    minerals: Mineral[],
    controller: StructureController
  ): RoomPosition {
    const anchorCheckPoints = [
      { x: 0, y: 2 },
      { x: 0, y: -2 },
      { x: 2, y: 0 },
      { x: -2, y: 0 }
    ];
    const reducedPosList = posList.filter((pos) =>
      anchorCheckPoints.some((offset) =>
        posList.some((posL) => posL.x === pos.x + offset.x && posL.y === pos.y + offset.y)
      )
    );
    const ranges = reducedPosList.map((pos) => {
      const sourcePathCosts = sources.map((source) => {
        const path = PathFinder.search(pos, { pos: source.pos, range: 1 }, { swampCost: 2 });
        if (path.incomplete) {
          return Infinity;
        }
        return path.cost;
      });
      const mineralPathCosts = minerals.map((mineral) => {
        const path = PathFinder.search(pos, { pos: mineral.pos, range: 1 }, { swampCost: 2 });
        if (path.incomplete) {
          return Infinity;
        }
        return path.cost;
      });
      const controllerPath = PathFinder.search(pos, { pos: controller.pos, range: 1 }, { swampCost: 2 });
      const controllerCost = controllerPath.incomplete ? Infinity : controllerPath.cost;
      return {
        pos: pos,
        rangeTotal: controllerCost + _.sum([...sourcePathCosts, ...mineralPathCosts])
      };
    });
    return _.min(ranges, (r) => r.rangeTotal).pos;
  }
  private static populateMemory(room: Room): void {
    const sources = room.find(FIND_SOURCES);
    const minerals = room.find(FIND_MINERALS);
    const controller = room.controller;
    const featureLists = [...sources, ...minerals];
    const featurePositions = (controller ? [controller, ...featureLists] : featureLists).map((f) => f.pos);
    const store = Memory.roomStore[room.name].roomPlanner;
    if (store.walkableTiles.length === 0) {
      Memory.roomStore[room.name].roomPlanner.walkableTiles = this.getRoomPositions(room.name);
    }
    if (store.buildableTiles.length === 0) {
      Memory.roomStore[room.name].roomPlanner.buildableTiles = store.walkableTiles.filter((pos) =>
        this.getFreeForTile(pos)
      );
    }
    if (store.featureDistanceStore.length !== store.buildableTiles.length && store.buildableTiles.length > 0) {
      console.log("calc tile Distances");
      const currentDistances = store.featureDistanceStore;
      const start = currentDistances.length;
      const blockSize = 10;
      const end = Math.min(store.buildableTiles.length, start + blockSize);
      const blockSource = store.buildableTiles.slice(start, end);
      const processed = blockSource.map((b) => this.getFeatureDistance(b, featurePositions));
      Memory.roomStore[room.name].roomPlanner.featureDistanceStore = currentDistances.concat(processed);
    }
  }
  private static displayMemory(room: Room): void {
    const store = Memory.roomStore[room.name].roomPlanner;
    store.walkableTiles.map((t) => room.visual.circle(t.x, t.y, { stroke: "black", opacity: 0.1 }));
    store.buildableTiles.map((t) => room.visual.circle(t.x, t.y, { stroke: "black", opacity: 0.2, fill: "blue" }));
    store.featureDistanceStore.map((t) =>
      room.visual.text(t.distance.toString(), t.pos.x, t.pos.y, { stroke: "black", opacity: 0.2 })
    );
  }
  public static run(room: Room): void {
    if (room.controller && room.controller.my) {
      console.log(room.name);
      const exits = room.find(FIND_EXIT);
      exits.map((exit) => room.visual.text("Exit", exit, { stroke: "Black", opacity: 0.2 }));
      this.populateMemory(room);
      this.displayMemory(room);
    }
  }
}

// links
// source 1
// source 2
// hatchery
// evo chamber
// controller
// spore crawler
