import { UtilPosition } from "utils/util.position";
export class RemoteConstruction {
  private static isBoundary(x: number, y: number): boolean {
    const boundaries = [0, 49];
    return boundaries.includes(x) || boundaries.includes(y);
  }
  private static getRoadsToAnchor(remRoom: RemoteDirectorStore): RoomPosition[] {
    const anchor = Game.flags[remRoom.anchorId];
    if (Object.keys(Game.rooms).includes(remRoom.roomName) && Object.keys(Game.rooms).includes(anchor.pos.roomName)) {
      const room = Game.rooms[remRoom.roomName];
      const homeRoom = Game.rooms[anchor.pos.roomName];
      const roads = room
        .find(FIND_SOURCES)
        .reduce((acc: RoomPosition[], source: Source) => {
          // base road on boundry to exit closest to source
          const anchorToSourceExitDir = homeRoom.findExitTo(room.name);
          const sourceToAnchorExitDir = room.findExitTo(homeRoom.name);
          if (
            anchorToSourceExitDir !== -2 &&
            anchorToSourceExitDir !== -10 &&
            sourceToAnchorExitDir !== -2 &&
            sourceToAnchorExitDir !== -10
          ) {
            const sourceExit = source.pos.findClosestByPath(sourceToAnchorExitDir);
            if (sourceExit) {
              const anchorExit = UtilPosition.getOtherSideOfExit(sourceExit);
              if (anchorExit && sourceExit) {
                const sourcePath = source.pos
                  .findPathTo(sourceExit, { ignoreCreeps: true, swampCost: 1 })
                  .map((s) => new RoomPosition(s.x, s.y, source.pos.roomName));
                const anchorPath = anchor.pos
                  .findPathTo(anchorExit, {
                    ignoreCreeps: true,
                    swampCost: 1,
                    costCallback: (roomName, costMatrix) => {
                      const store = Memory.roomStore[roomName]?.constructionDirector;
                      if (store) {
                        const obsticals = store.extensionTemplate
                          .concat(store.towerTemplate)
                          .concat(Memory.roomStore[roomName].defenseDirector.wallMap)
                          .concat(store.labTemplate)
                          .concat(store.singleStructures.map((s) => s.pos));
                        obsticals.map((ext) => costMatrix.set(ext.x, ext.y, 10));
                      }
                    }
                  })
                  .map((s) => new RoomPosition(s.x, s.y, anchor.pos.roomName));
                return acc.concat(sourcePath).concat(anchorPath);
              }
            }
          }
          return acc;
        }, [])
        .filter((p) => !this.isBoundary(p.x, p.y));
      return roads;
    }
    return [];
  }
  private static initRoadQueue(room: RemoteDirectorStore, index: number): void {
    const roads = this.getRoadsToAnchor(room);
    Memory.roomStore[room.homeRoomName].remoteDirector[index] = {
      ...Memory.roomStore[room.homeRoomName].remoteDirector[index],
      roadQueue: roads,
      roadsPathed: roads && roads.length > 0 ? true : false
    };
  }
  // private static buildRemoteRoads(room: RemoteDirectorStore): void {
  //   const remRoom = Object.keys(Game.rooms).includes(room.roomName) ? Game.rooms[room.roomName] : null;
  //   if (remRoom) {
  //     const remRoomHasConstructionSite = remRoom.find(FIND_CONSTRUCTION_SITES).length > 0;
  //     if (!remRoomHasConstructionSite) {
  //       const nextSite = room.roadQueue.find((p) => {
  //         p = new RoomPosition(p.x, p.y, p.roomName);
  //         return p.roomName === remRoom.name && p.lookFor(LOOK_STRUCTURES).length === 0;
  //       });
  //       if (nextSite) {
  //         remRoom.createConstructionSite(nextSite.x, nextSite.y, STRUCTURE_ROAD);
  //       }
  //     }
  //   }
  // }
  private static buildHomeRoads(room: RemoteDirectorStore): void {
    const homeRoom = Game.rooms[room.homeRoomName];
    if (!Memory.roomStore[homeRoom.name].buildingThisTick) {
      const nextSite = room.roadQueue.find(
        (p) =>
          p.roomName === homeRoom.name &&
          Object.keys(Game.rooms).includes(p.roomName) &&
          new RoomPosition(p.x, p.y, p.roomName)
            .lookFor(LOOK_STRUCTURES)
            .filter((s) => s.structureType !== STRUCTURE_RAMPART).length === 0
      );
      if (nextSite) {
        const rtn = homeRoom.createConstructionSite(nextSite.x, nextSite.y, STRUCTURE_ROAD);
        Memory.roomStore[homeRoom.name].buildingThisTick = rtn === OK;
      }
    }
  }
  private static createRemoteContainers(room: RemoteDirectorStore): void {
    if (Object.keys(Game.rooms).includes(room.roomName)) {
      const targetRoom = Game.rooms[room.roomName];
      const sources = targetRoom.find(FIND_SOURCES);
      const terrain = targetRoom.getTerrain();
      sources.map((source) => {
        const container = source.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 1, {
          filter: (s) => s.structureType === STRUCTURE_CONTAINER
        })[0];
        if (!container) {
          let built = false;
          _.range(-1, 2).map((x) => {
            _.range(-1, 2).map((y) => {
              const pos = new RoomPosition(source.pos.x + x, source.pos.y + y, source.pos.roomName);
              if (terrain.get(pos.x, pos.y) !== 1 && !built) {
                pos.createConstructionSite(STRUCTURE_CONTAINER);
                built = true;
              }
            });
          });
        }
      });
    }
  }
  public static runConstruction(room: RemoteDirectorStore, index: number): void {
    const homeRoom = Game.rooms[room.homeRoomName];
    this.createRemoteContainers(room);
    if (homeRoom) {
      const homeController = homeRoom.controller;
      const level = homeController ? homeController.level : 0;
      // Roads to Source and around Core
      if (!room.roadsPathed && Object.keys(Game.rooms).includes(room.roomName)) {
        this.initRoadQueue(room, index);
      }
      if (!room.roadsConstructed && room.roadQueue.length > 0 && level > 3) {
        // remote room
        // this.buildRemoteRoads(room);
        // home room
        this.buildHomeRoads(room);

        // check roads done
        if (
          !room.roadQueue.find(
            (p) =>
              Object.keys(Game.rooms).includes(p.roomName) &&
              new RoomPosition(p.x, p.y, p.roomName).lookFor(LOOK_STRUCTURES).length === 0
          )
        ) {
          Memory.roomStore[room.homeRoomName].remoteDirector[index] = {
            ...Memory.roomStore[room.homeRoomName].remoteDirector[index],
            roadsConstructed: true
          };
        }
      }
    }
  }
}
