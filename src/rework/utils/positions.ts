export class PositionsUtils {
  public static getAnchor(room: Room): RoomPosition {
    return room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0].pos;
  }
  public static findStructureInRange(pos: RoomPosition, range: number, structureType: BuildableStructureConstant) {
    return pos.findInRange(FIND_STRUCTURES, range).filter((s) => s.structureType === structureType)[0];
  }
  public static getSurroundingFreeTiles(anchor: RoomPosition): RoomPosition[] {
    const terrain = Game.map.getRoomTerrain(anchor.roomName);
    return _.range(-1, 2)
      .reduce((acc: RoomPosition[], x: number) => {
        return acc.concat(
          _.range(-1, 2).map((y: number) => {
            return new RoomPosition(anchor.x + x, anchor.y + y, anchor.roomName);
          })
        );
      }, [])
      .filter((p: RoomPosition) => !p.isEqualTo(anchor) && terrain.get(p.x, p.y) !== 1);
  }
  public static getClosestSurroundingTo(
    anchor: RoomPosition,
    target: RoomPosition,
    avoid: RoomPosition[] = []
  ): RoomPosition {
    const surroundings = this.getSurroundingFreeTiles(anchor).filter((t) => !avoid.some((a) => a.isEqualTo(t)));
    const rangeList = surroundings.sort((p1, p2) => {
      const len =
        p1.findPathTo(target, { ignoreCreeps: true, swampCost: 1, range: 1 }).length -
        p2.findPathTo(target, { ignoreCreeps: true, swampCost: 1, range: 1 }).length;
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
