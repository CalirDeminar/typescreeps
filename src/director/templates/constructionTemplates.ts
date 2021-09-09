import { UtilPosition } from "utils/util.position";
import { Constants } from "utils/constants";
export class ConstructionTemplates {
  private static getAnchor(room: Room): Flag {
    return room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0];
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
  public static extensions(room: Room): RoomPosition[] {
    const anchor = this.getAnchor(room);
    return [
      ...this.getExtensionBlockType1(room, anchor.pos, 1, 1),
      ...this.getExtensionBlockType1(room, anchor.pos, 1, -1),
      ...this.getExtensionBlockType1(room, anchor.pos, -1, 1),
      ...this.getExtensionBlockType1(room, anchor.pos, -1, -1),
      ...this.getExtensionBlockType2(room, anchor.pos, 1, 1),
      ...this.getExtensionBlockType2(room, anchor.pos, 1, -1),
      ...this.getExtensionBlockType2(room, anchor.pos, -1, 1),
      ...this.getExtensionBlockType2(room, anchor.pos, -1, -1)
    ];
  }
  public static containers(room: Room): RoomPosition[] {
    const anchor = this.getAnchor(room);
    const sources = room.find(FIND_SOURCES);
    return [new RoomPosition(anchor.pos.x, anchor.pos.y + 1, anchor.pos.roomName)];
  }
  public static towers(room: Room): RoomPosition[] {
    const anchor = this.getAnchor(room);
    return _.range(0, 6).map((i) => {
      const pos = Constants.towerOffsets[i];
      return new RoomPosition(anchor.pos.x + pos.x, anchor.pos.y + pos.y, anchor.pos.roomName);
    });
  }
  public static storage(room: Room): RoomPosition {
    const anchor = this.getAnchor(room);
    return new RoomPosition(anchor.pos.x - 1, anchor.pos.y, anchor.pos.roomName);
  }
  public static terminal(room: Room): RoomPosition {
    const anchor = this.getAnchor(room);
    return new RoomPosition(anchor.pos.x + 1, anchor.pos.y, anchor.pos.roomName);
  }
  public static extractor(room: Room): RoomPosition {
    const mineral = room.find(FIND_MINERALS)[0];
    return new RoomPosition(mineral.pos.x, mineral.pos.y, mineral.pos.roomName);
  }
  public static extractorContainer(room: Room): RoomPosition {
    const mineral = room.find(FIND_MINERALS)[0];
    const anchor = this.getAnchor(room);
    return UtilPosition.getClosestSurroundingTo(mineral.pos, anchor.pos);
  }
  private static getRoadMask(room: Room): RoomPosition[] {
    const store = Memory.roomStore[room.name].constructionDirector;
    return store.extensionTemplate.concat(store.towerTemplate).concat(store.sourceLinks);
  }
  public static surroundingRoads(room: Room): RoomPosition[] {
    const anchor = this.getAnchor(room);
    return _.range(-6, 7)
      .map((x) =>
        _.range(-6, 7)
          .map((y) => {
            if (Math.abs(x) + Math.abs(y) === 3 || Math.abs(x) + Math.abs(y) === 6) {
              return new RoomPosition(anchor.pos.x + x, anchor.pos.y + y, room.name);
            } else {
              return null;
            }
          })
          .filter((item): item is RoomPosition => item != null)
      )
      .reduce((acc, arr) => acc.concat(arr), []);
  }
  public static sourceRoads(room: Room): RoomPosition[] {
    const anchor = this.getAnchor(room);
    const mask = this.getRoadMask(room);
    return room
      .find(FIND_SOURCES)
      .map((source) => {
        const path = anchor.pos.findPathTo(UtilPosition.getClosestSurroundingTo(source.pos, anchor.pos), {
          ignoreCreeps: true,
          swampCost: 1
        });
        return path.map((p) => new RoomPosition(p.x, p.y, room.name));
      })
      .reduce((acc, arr) => acc.concat(arr), []);
  }
  public static mineralRoads(room: Room): RoomPosition[] {
    const anchor = this.getAnchor(room);
    return room
      .find(FIND_MINERALS)
      .map((s) => {
        const path = anchor.pos.findPathTo(s, { ignoreCreeps: true, swampCost: 1 });
        return path.map((p) => new RoomPosition(p.x, p.y, room.name));
      })
      .reduce((acc, arr) => acc.concat(arr), []);
  }
  public static isBoundary(x: number, y: number): boolean {
    const boundaries = [0, 49];
    return boundaries.includes(x) || boundaries.includes(y);
  }
  public static remoteSourceRoads(room: Room): RoomPosition[] {
    const anchor = this.getAnchor(room);
    const mask = this.getRoadMask(room);
    const remoteStore = Memory.roomStore[room.name].remoteRooms;
    const remoteSources = _.reduce(remoteStore, (acc: Source[], r) => acc.concat(r.sources), []);
    return _.reduce(
      remoteSources,
      (acc: RoomPosition[], s: Source) => {
        const source = Game.getObjectById<Source>(s.id);
        if (source) {
          const anchorToSourceExitDir = room.findExitTo(source.room);
          const sourceToAnchorExitDir = source.room.findExitTo(room);
          if (
            anchorToSourceExitDir !== -2 &&
            anchorToSourceExitDir !== -10 &&
            sourceToAnchorExitDir !== -2 &&
            sourceToAnchorExitDir !== -10
          ) {
            const anchorToSourceExits = room.find(anchorToSourceExitDir);
            const sourceToAnchorExits = source.room.find(sourceToAnchorExitDir);
            // TODO - ensure these exits are opposite each other on the boundary
            const sourceClosestExit = source.pos.findClosestByPath(sourceToAnchorExits);
            const anchorClosestExit = anchor.pos.findClosestByPath(anchorToSourceExits);
            if (anchorClosestExit && sourceClosestExit) {
              const sourcePath = source.pos
                .findPathTo(sourceClosestExit, { ignoreCreeps: true, swampCost: 1 })
                .map((p) => new RoomPosition(p.x, p.y, source.pos.roomName))
                .reverse();
              const anchorPath = anchor.pos
                .findPathTo(anchorClosestExit, { ignoreCreeps: true, swampCost: 1 })
                .map((p) => new RoomPosition(p.x, p.y, room.name));
              return acc
                .concat(anchorPath)
                .concat(sourcePath)
                .filter((p) => !this.isBoundary(p.x, p.y) && !mask.includes(p));
            }
          }
        }
        return acc;
      },
      []
    );
  }
  public static controllerRoads(room: Room): RoomPosition[] {
    const anchor = this.getAnchor(room);
    const mask = this.getRoadMask(room);
    const controller = room.controller;
    if (!controller) {
      return [];
    } else {
      return anchor.pos
        .findPathTo(controller, { ignoreCreeps: true, swampCost: 1, ignoreRoads: true, ignore: mask })
        .map((p) => new RoomPosition(p.x, p.y, room.name));
    }
  }
  public static anchorLink(room: Room): RoomPosition {
    const anchor = this.getAnchor(room);
    return new RoomPosition(anchor.pos.x - 1, anchor.pos.y - 1, room.name);
  }
  public static sourceLinks(room: Room): RoomPosition[] {
    const anchor = this.getAnchor(room);
    const sources = room.find(FIND_SOURCES);
    const containers = this.containers(room);
    return sources.map((source) => {
      return UtilPosition.getClosestSurroundingTo(source.pos, anchor.pos, containers);
    });
  }
  public static ramparts(room: Room): RoomPosition[] {
    const anchor = this.getAnchor(room);
    const rtn = _.range(-12, 13)
      .map((x) => {
        return _.range(-12, 13)
          .map((y) => {
            const range = Math.abs(x) + Math.abs(y);
            if (range === 10 || range === 11) {
              return new RoomPosition(anchor.pos.x + x, anchor.pos.y + y, anchor.pos.roomName);
            } else {
              return null;
            }
          })
          .filter((p): p is RoomPosition => p !== null);
      })
      .reduce((acc, s) => acc.concat(s), []);
    return rtn;
  }
}
