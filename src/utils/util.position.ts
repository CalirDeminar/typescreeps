export class UtilPosition {
    public static getClosestSurroundingTo(anchor: RoomPosition, target: RoomPosition): RoomPosition {
        const room = Game.rooms[anchor.roomName];
        const terrain = room.getTerrain();
        const surroundings = _.range(-1, 2).map((x) => {
            return _.range(-1, 2).map((y) => {
              return {x: x, y: y};
            })
          }).reduce((acc, arr) => acc.concat(arr),[]);
        const rangeList = surroundings.filter((tile: {x: number; y: number}) => {
            return terrain.get(anchor.x + tile.x, anchor.y + tile.y) === 0;
        }).map((tile: {x: number, y: number}): RoomPosition => {
            return (new RoomPosition(anchor.x + tile.x, anchor.y + tile.y, room.name));
        }).sort((p1, p2) => {
            const len = p1.findPathTo(target, {ignoreCreeps: true, swampCost: 1}).length - p2.findPathTo(target, {ignoreCreeps: true, swampCost: 1}).length;
            return len;
        });
        const rtn = rangeList[0];
        if (rtn) {
            return rtn
        } else {
            return anchor;
        }
    }
}
