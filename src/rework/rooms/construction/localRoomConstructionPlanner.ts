import { PositionsUtils } from "rework/utils/positions";
import { CoreRoomPlanner } from "director/core/director.roomPlanner";

export class LocalRoomConstructionPlanner {
  private static runRoad(from: RoomPosition, to: RoomPosition, avoids: RoomPosition[]): RoomPosition[] {
    return from
      .findPathTo(to, {
        ignoreCreeps: true,
        range: 1,
        swampCost: 1,
        costCallback: (roomName, costMatrix) => {
          avoids.map((av) => costMatrix.set(av.x, av.y, 10));
        }
      })
      .map((p) => new RoomPosition(p.x, p.y, from.roomName));
  }
  public static run(room: Room): void {
    const store = Memory.roomStore[room.name].constructionDirector;
    const shouldPlan = room.controller && room.controller.my && store.extensionTemplate.length === 0;
    if (!shouldPlan || !room.controller) {
      return;
    }
    const anchor = PositionsUtils.getAnchor(room);
    if (!anchor) {
      return;
    }
    const structures = CoreRoomPlanner.generateStructures(anchor);
    Memory.roomStore[room.name].constructionDirector.extensionTemplate = structures.extensions;
    Memory.roomStore[room.name].constructionDirector.towerTemplate = structures.towers;
    Memory.roomStore[room.name].constructionDirector.labTemplate = structures.labs;
    Memory.roomStore[room.name].constructionDirector.singleStructures = [
      {
        pos: structures.spawn1,
        type: STRUCTURE_SPAWN
      },
      {
        pos: structures.spawn2,
        type: STRUCTURE_SPAWN
      },
      {
        pos: structures.spawn3,
        type: STRUCTURE_SPAWN
      },
      {
        pos: structures.storage,
        type: STRUCTURE_STORAGE
      },
      {
        pos: structures.terminal,
        type: STRUCTURE_TERMINAL
      },
      {
        pos: structures.nuker,
        type: STRUCTURE_NUKER
      },
      {
        pos: structures.factory,
        type: STRUCTURE_FACTORY
      },
      {
        pos: structures.coreLink,
        type: STRUCTURE_LINK
      },
      {
        pos: structures.observer,
        type: STRUCTURE_OBSERVER
      },
      {
        pos: structures.powerSpawn,
        type: STRUCTURE_POWER_SPAWN
      }
    ];
    const avoids = store.extensionTemplate
      .concat(store.towerTemplate)
      .concat(store.singleStructures.map((s) => s.pos))
      .concat(store.labTemplate);
    const roads = room
      .find(FIND_SOURCES)
      .map((s) => s.pos)
      .concat(room.controller.pos)
      .concat(room.find(FIND_MINERALS).map((m) => m.pos))
      .reduce((acc: RoomPosition[], pos) => acc.concat(this.runRoad(pos, anchor, avoids)), [])
      .concat(structures.extensionRoads);
    Memory.roomStore[room.name].constructionDirector.internalRoadTemplate = roads;
  }
}
