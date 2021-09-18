const bunkerRadius = 11;
export class ExpansionScouting {
  public static isExpandableByTerrain(room: ScoutedRoom): boolean {
    const terrain = new Room.Terrain(room.name);
    if (terrain) {
      const bounds = _.range(bunkerRadius + 2, 48 - bunkerRadius);
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
  public static getExpansionRoomSpawnPos(room: ScoutedRoom): RoomPosition | null {
    const spots = this.getExpansionSpots(room.name);
    const rRoom = Game.rooms[room.name];
    if (rRoom) {
      const sources = rRoom.find(FIND_SOURCES);
      const controller = room.controller;
      const positions = sources.map((s) => s.pos).concat(controller ? controller.pos : []);
      return spots.sort((a, b) => {
        const aDistance = positions.reduce((acc: number, p: RoomPosition) => {
          return acc + a.findPathTo(a.x, a.y, { ignoreCreeps: true, swampCost: 1 }).length;
        }, 0);
        const bDistance = positions.reduce((acc: number, p: RoomPosition) => {
          return acc + a.findPathTo(b.x, b.y, { ignoreCreeps: true, swampCost: 1 }).length;
        }, 0);
        return aDistance - bDistance;
      })[0];
    }
    return null;
  }
  public static getExpansionSpots(roomName: string): RoomPosition[] {
    const terrain = new Room.Terrain(roomName);
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
      return possibleSpots.map((s) => new RoomPosition(s.x, s.y, roomName));
    }
    return [];
  }
  public static expandable(room: ScoutedRoom): boolean {
    const enoughSources = room.sources.length > 1;
    const claimed = room.controller && room.controller.owner !== null;
    const hasTowers = room.towers.length > 0;
    const isSourceKeeperRoom = room.keeperLair.length > 0;
    return enoughSources && !claimed && !hasTowers && !isSourceKeeperRoom;
  }
}
