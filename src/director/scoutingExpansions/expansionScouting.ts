const bunkerRadius = 9;
export class ExpansionScouting {
  public static isExpandableByTerrain(room: ScoutedRoom): boolean {
    const terrain = new Room.Terrain(room.name);
    if (terrain) {
      const bounds = _.range(bunkerRadius + 1, 48 - bunkerRadius);
      const offsets = _.range(0 - bunkerRadius, bunkerRadius + 1)
        .reduce((acc: { x: number; y: number }[], x: number) => {
          return acc.concat(
            _.range(0 - bunkerRadius, bunkerRadius + 1).map((y) => {
              return { x: x, y: y };
            })
          );
        }, [])
        .filter((c) => Math.abs(c.x) + Math.abs(c.y) <= bunkerRadius);
      const searchSpace = bounds.reduce((acc: { x: number; y: number }[], x) => {
        return acc.concat(
          bounds.map((y) => {
            return { x: x, y: y };
          })
        );
      }, []);
      const possibleSpots = searchSpace.filter((spot) => {
        return offsets.every((offset) => {
          //console.log(`Room: ${room.name} - x: ${spot.x + offset.x} - y: ${spot.y + offset.y}`);
          return terrain.get(spot.x + offset.x, spot.y + offset.y) !== 1;
        });
      });
      if (possibleSpots.length > 0) {
        return true;
      }
    }
    return false;
  }
  public static expandable(room: ScoutedRoom): boolean {
    const enoughSources = room.sources.length > 1;
    const claimed = room.controller && room.controller.owner !== null;
    const hasTowers = room.towers.length > 0;
    const isSourceKeeperRoom = room.keeperLair.length > 0;
    return enoughSources && !claimed && !hasTowers && !isSourceKeeperRoom;
  }
}
