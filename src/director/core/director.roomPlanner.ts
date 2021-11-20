import { reduce } from "lodash";
import path from "path";
const pathChecks = [];
export class CoreRoomPlanner {
  private static removePosDupes(i: RoomPosition[]): RoomPosition[] {
    return i.reduce((acc: RoomPosition[], o) => {
      const isDupe = acc.some((a) => a.isEqualTo(o));
      return isDupe ? acc : [...acc, o];
    }, []);
  }
  private static clampToRoomMinimums(i: number): number {
    switch (true) {
      case i <= 2:
        return 3;
      case i >= 48:
        return 47;
      default:
        return i;
    }
  }
  private static getRoomPositions(roomName: string, filtered: boolean): RoomPosition[] {
    const terrain = Game.map.getRoomTerrain(roomName);
    return _.range(3, 47)
      .reduce((acc: RoomPosition[], x) => {
        return acc.concat(
          _.range(3, 47).map((y) => {
            return new RoomPosition(x, y, roomName);
          })
        );
      }, [])
      .filter(
        (pos) =>
          !filtered ||
          (terrain.get(pos.x, pos.y) !== 1 &&
            pos
              .lookFor(LOOK_STRUCTURES)
              .filter((s) => s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_RAMPART).length === 1)
      );
  }
  public static getCrossPlan(pos: RoomPosition): RoomPosition[] {
    return [
      new RoomPosition(pos.x, pos.y, pos.roomName),
      new RoomPosition(pos.x + 1, pos.y, pos.roomName),
      new RoomPosition(pos.x - 1, pos.y, pos.roomName),
      new RoomPosition(pos.x, pos.y + 1, pos.roomName),
      new RoomPosition(pos.x, pos.y - 1, pos.roomName)
    ];
  }
  private static getBlockingMask(pos: RoomPosition): RoomPosition[] {
    return _.range(this.clampToRoomMinimums(pos.x - 2), this.clampToRoomMinimums(pos.x + 3)).reduce(
      (acc: RoomPosition[], x) => {
        return acc.concat(
          _.range(this.clampToRoomMinimums(pos.y - 2), this.clampToRoomMinimums(pos.y + 3)).map((y) => {
            return new RoomPosition(x, y, pos.roomName);
          })
        );
      },
      []
    );
  }
  private static getAdjacentSlots(pos: RoomPosition): RoomPosition[] {
    return [
      { x: pos.x + 2, y: pos.y + 2 },
      { x: pos.x - 2, y: pos.y - 2 },
      { x: pos.x + 2, y: pos.y - 2 },
      { x: pos.x - 2, y: pos.y + 2 }
    ]
      .filter((p: { x: number; y: number }) => {
        return p.x < 47 && p.x > 3 && p.y < 47 && p.y > 3;
      })
      .map((p) => {
        return new RoomPosition(p.x, p.y, pos.roomName);
      });
  }
  private static slotFree(pos: RoomPosition, avoids: RoomPosition[]): boolean {
    const plan = this.getCrossPlan(pos);
    const blockingMask = this.getBlockingMask(pos);
    const terrain = Game.map.getRoomTerrain(pos.roomName);
    const taken = avoids.some((a) => plan.some((p) => a.isEqualTo(p)));
    const clipsTerrain = plan.some((p) => terrain.get(p.x, p.y) === 1);
    const blockingSource = blockingMask.some((p) => p.lookFor(LOOK_SOURCES).length > 0);
    const blockingController = blockingMask.some(
      (p) => p.lookFor(LOOK_STRUCTURES).filter((s) => s.structureType === STRUCTURE_CONTROLLER).length > 0
    );
    const diagonalOneBlocked =
      terrain.get(this.clampToRoomMinimums(pos.x + 1), this.clampToRoomMinimums(pos.y + 1)) === 1 &&
      terrain.get(this.clampToRoomMinimums(pos.x - 1), this.clampToRoomMinimums(pos.y - 1)) === 1;
    const diagonalTwoBlocked =
      terrain.get(this.clampToRoomMinimums(pos.x + 1), this.clampToRoomMinimums(pos.y - 1)) === 1 &&
      terrain.get(this.clampToRoomMinimums(pos.x - 1), this.clampToRoomMinimums(pos.y + 1)) === 1;
    const vertBlocked =
      terrain.get(this.clampToRoomMinimums(pos.x + 2), this.clampToRoomMinimums(pos.y)) === 1 &&
      terrain.get(this.clampToRoomMinimums(pos.x - 2), this.clampToRoomMinimums(pos.y)) === 1;
    const horBlocked =
      terrain.get(this.clampToRoomMinimums(pos.x), this.clampToRoomMinimums(pos.y + 2)) === 1 &&
      terrain.get(this.clampToRoomMinimums(pos.x), this.clampToRoomMinimums(pos.y - 2)) === 1;
    // Check that at least one of each "side" is free for access
    return (
      !taken &&
      !clipsTerrain &&
      !blockingSource &&
      !blockingController &&
      !diagonalOneBlocked &&
      !diagonalTwoBlocked &&
      !vertBlocked &&
      !horBlocked
    );
  }
  private static straightRun(anchor: RoomPosition, maxTiles: number, currentTiles: RoomPosition[]): RoomPosition[] {
    return new Array(maxTiles)
      .fill(null)
      .reduce(
        (acc: RoomPosition[], _n) => {
          if (acc.length < maxTiles) {
            const slots = acc.reduce((slots: RoomPosition[], an: RoomPosition) => {
              return slots.concat(this.getAdjacentSlots(an));
            }, []);
            const filteredSlots = slots.filter((s) => this.slotFree(s, acc));

            return this.removePosDupes(acc.concat(filteredSlots));
          }
          return acc;
        },
        [anchor, ...currentTiles]
      )
      .slice(1, maxTiles + 1);
  }
  public static runWithRetries(anchor: RoomPosition, maxTiles: number): RoomPosition[] {
    let levels = [anchor];
    for (let _lvl in _.range(0, 2)) {
      const lvlSlots = levels.reduce((acc: RoomPosition[], pos) => acc.concat(this.getAdjacentSlots(pos)), []);
      levels = this.removePosDupes(levels.concat(lvlSlots));
    }
    return levels
      .reduce((acc: RoomPosition[], an: RoomPosition) => {
        const slotsRemaining = maxTiles + 8 - acc.length;
        const newSlots = this.straightRun(an, slotsRemaining, acc);
        return this.removePosDupes(acc.concat(newSlots)).filter((p) => !anchor.isEqualTo(p));
      }, [])
      .slice(0, maxTiles);
  }
  private static populateExtensionMemory(room: Room): void {
    const requiredTiles = 12;
    const memory = Memory.roomStore[room.name].roomPlanner;
    const controller = room.controller;
    if (!memory.validExtensionScratchPad) {
      memory.validExtensionScratchPad = [];
      memory.validExtensionLocations = undefined;
    }
    const unPlanned = !memory.validExtensionLocations;
    const roomTiles = this.getRoomPositions(room.name, false);
    const base = memory.validExtensionScratchPad;
    // calculate valid extension bases
    if (unPlanned) {
      const unCalcualted = memory.validExtensionScratchPad.length !== roomTiles.length;
      if (unCalcualted) {
        const calculatedTiles = base.map((d) => d.pos);
        const nextTile = roomTiles[calculatedTiles.length];
        if (nextTile) {
          const valid = this.runWithRetries(nextTile, requiredTiles).length === requiredTiles;
          Memory.roomStore[room.name].roomPlanner.validExtensionScratchPad.push({
            pos: nextTile,
            valid: valid
          });
        }
      } else {
        Memory.roomStore[room.name].roomPlanner.validExtensionLocations = base.filter((b) => b.valid).map((b) => b.pos);
        Memory.roomStore[room.name].roomPlanner.validExtensionScratchPad = [];
      }
      base.forEach((t) =>
        room.visual.circle(t.pos.x, t.pos.y, { fill: t.valid ? "green" : "red", radius: 0.5, opacity: 0.25 })
      );
    } else {
      if (!memory.validExtensionDistances) {
        memory.validExtensionDistances = [];
      }
      if (
        memory.validExtensionDistances &&
        memory.validExtensionLocations &&
        memory.validExtensionDistances.length !== memory.validExtensionLocations.length
      ) {
        const nextTile = memory.validExtensionLocations[memory.validExtensionDistances.length];
        if (nextTile && controller) {
          const path = PathFinder.search(nextTile, { pos: controller.pos, range: 1 });
          memory.validExtensionDistances.push({ pos: nextTile, distance: path.cost });
        }
      }
      memory.validExtensionLocations?.forEach((t) =>
        room.visual.circle(t.x, t.y, { fill: "green", radius: 0.5, opacity: 0.25 })
      );
    }
  }
  public static generateStructures(anchor: RoomPosition) {
    const tileCores = this.runWithRetries(anchor, 17);
    const techCore = tileCores[1];
    const extensionTiles = tileCores
      .slice(4, 16)
      .reduce((acc: RoomPosition[], e: RoomPosition) => acc.concat(this.getCrossPlan(e)), []);
    const towerTiles = this.getCrossPlan(tileCores[0]);
    const labTiles = [...this.getCrossPlan(tileCores[2]), ...this.getCrossPlan(tileCores[3])];
    const coreLink = new RoomPosition(anchor.x - 1, anchor.y, anchor.roomName);
    const storage = new RoomPosition(anchor.x + 1, anchor.y, anchor.roomName);
    const terminal = new RoomPosition(anchor.x, anchor.y - 1, anchor.roomName);
    const spawn1 = new RoomPosition(anchor.x, anchor.y + 1, anchor.roomName);
    const spawn2 = new RoomPosition(techCore.x, techCore.y, techCore.roomName);
    const spawn3 = new RoomPosition(techCore.x, techCore.y + 1, techCore.roomName);
    const powerSpawn = new RoomPosition(techCore.x - 1, techCore.y, techCore.roomName);
    const factory = new RoomPosition(techCore.x, techCore.y - 1, techCore.roomName);
    const nuker = new RoomPosition(techCore.x + 1, techCore.y, techCore.roomName);
    const observer = new RoomPosition(tileCores[16].x, tileCores[16].y, tileCores[16].roomName);
    return {
      extensions: extensionTiles,
      labs: labTiles,
      towers: towerTiles,
      storage,
      coreLink,
      terminal,
      spawn1,
      spawn2,
      spawn3,
      powerSpawn,
      factory,
      nuker,
      observer
    };
  }
  public static run(room: Room): void {
    if (room.controller && room.controller.my) {
      const anchor = room.find(FIND_FLAGS, { filter: (f) => f.name.match(/Test \d/) })[0];
      if (anchor) {
        // this.populateExtensionMemory(room);
      }
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
