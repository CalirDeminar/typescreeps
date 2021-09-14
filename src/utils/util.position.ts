export class UtilPosition {
  public static getClosestSurroundingTo(
    anchor: RoomPosition,
    target: RoomPosition,
    avoid: RoomPosition[] = []
  ): RoomPosition {
    const room = Game.rooms[anchor.roomName];
    const terrain = room.getTerrain();
    const structStore = Memory.roomStore[anchor.roomName].constructionDirector;
    const defStore = Memory.roomStore[anchor.roomName].defenseDirector;
    const avoids = structStore.extensionTemplate
      .concat(structStore.towerTemplate)
      .concat(structStore.labTemplate)
      .concat(structStore.singleStructures.map((s) => s.pos))
      .concat(defStore.wallMap);
    const surroundings = _.range(-1, 2)
      .map((x) => {
        return _.range(-1, 2).map((y) => {
          return { x: x, y: y };
        });
      })
      .reduce((acc, arr) => acc.concat(arr), []);
    const rangeList = surroundings
      .filter((tile: { x: number; y: number }) => {
        return (
          terrain.get(anchor.x + tile.x, anchor.y + tile.y) === 0 &&
          !avoids.some((p: RoomPosition) => p.x === tile.x && p.y === tile.y)
        );
      })
      .map(
        (tile: { x: number; y: number }): RoomPosition => {
          return new RoomPosition(anchor.x + tile.x, anchor.y + tile.y, room.name);
        }
      )
      .filter((p1) => avoid.find((p2) => p1.isEqualTo(p2)) === undefined)
      .sort((p1, p2) => {
        const len =
          p1.findPathTo(target, { ignoreCreeps: true, swampCost: 1 }).length -
          p2.findPathTo(target, { ignoreCreeps: true, swampCost: 1 }).length;
        return len;
      });
    const rtn = rangeList[0];
    if (rtn) {
      return rtn;
    } else {
      return anchor;
    }
  }
  public static isBoundary(x: number, y: number): boolean {
    const boundaries = [0, 49];
    return boundaries.includes(x) || boundaries.includes(y);
  }
  public static roomHasVision(roomName: string): boolean {
    return Object.keys(Game.rooms).includes(roomName);
  }
  public static invertDir(dir: string): string {
    switch (dir) {
      case "N":
        return "S";
      case "S":
        return "N";
      case "E":
        return "W";
      case "W":
        return "E";
      default:
        return dir;
    }
  }
  public static navigateRoomName(roomName: string, x: number, y: number): string {
    const matches = roomName.match(/^(\w)(\d+)(\w)(\d+)$/);
    if (matches) {
      let hDir = matches[1];
      const hDist = matches[2];
      let vDir = matches[3];
      const vDist = matches[4];
      const xMotion = hDir === "E" ? x : x * -1;
      const yMotion = vDir === "N" ? y : y * -1;
      let newHDist = parseInt(hDist) + xMotion;
      let newVDist = parseInt(vDist) + yMotion;
      hDir = newHDist < 0 ? this.invertDir(hDir) : hDir;
      vDir = newVDist < 0 ? this.invertDir(vDir) : vDir;
      newHDist = newHDist < 0 ? Math.abs(newHDist) - 1 : newHDist;
      newVDist = newVDist < 0 ? Math.abs(newVDist) - 1 : newVDist;
      return `${hDir}${newHDist}${vDir}${newVDist}`;
    }
    return "";
  }
  public static getOtherSideOfExit(pos: RoomPosition): RoomPosition {
    const xMovement = pos.x === 0 ? -1 : pos.x === 49 ? 1 : 0;
    const yMovement = pos.y === 0 ? 1 : pos.y === 49 ? -1 : 0;
    switch (true) {
      case !!xMovement:
        const newX = xMovement === 1 ? 0 : 49;
        return new RoomPosition(newX, pos.y, this.navigateRoomName(pos.roomName, xMovement, 0));
      // return { x: newX, y: pos.y, roomName: this.navigateRoomName(pos.roomName, xMovement, 0) };
      case !!yMovement:
        const newY = yMovement === 1 ? 49 : 0;
        return new RoomPosition(pos.x, newY, this.navigateRoomName(pos.roomName, 0, yMovement));
      // return { x: pos.x, y: newY, roomName: this.navigateRoomName(pos.roomName, 0, yMovement) };
      default:
        return pos;
    }
  }
}
