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
    return [new RoomPosition(anchor.pos.x, anchor.pos.y + 1, anchor.pos.roomName)].concat(
      sources.map((source) => {
        return UtilPosition.getClosestSurroundingTo(source.pos, anchor.pos);
      })
    );
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
  private static getRoadMask(room: Room): RoomPosition[] {
    const store = Memory.roomStore[room.name].constructionDirector;
    return store.containerTemplate.concat(store.extensionTemplate).concat(store.towerTemplate);
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
      .map((s) => {
        const path = anchor.pos.findPathTo(s, { ignoreCreeps: true, swampCost: 1, ignoreRoads: true, ignore: mask });
        return path.map((p) => new RoomPosition(p.x, p.y, room.name));
      })
      .reduce((acc, arr) => acc.concat(arr), []);
  }
}
