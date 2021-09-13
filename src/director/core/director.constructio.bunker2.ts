export class ConstructionBunker2Director {
  private static getAnchor(room: Room): Flag {
    return room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0];
  }
  private static getExtensionStar(base: RoomPosition, xMult: number, yMult: number): RoomPosition[] {
    return [
      new RoomPosition(base.x, base.y, base.roomName),
      new RoomPosition(base.x - 1 * xMult, base.y, base.roomName),
      new RoomPosition(base.x + 1 * xMult, base.y, base.roomName),
      new RoomPosition(base.x, base.y - 1 * yMult, base.roomName),
      new RoomPosition(base.x, base.y + 1 * yMult, base.roomName)
    ];
  }
  private static extensionSector(anchor: RoomPosition, xMult: number, yMult: number): RoomPosition[] {
    return [
      // 2
      new RoomPosition(anchor.x + 3 * xMult, anchor.y + 2 * yMult, anchor.roomName),
      new RoomPosition(anchor.x + 2 * xMult, anchor.y + 3 * yMult, anchor.roomName),
      new RoomPosition(anchor.x + 4 * xMult, anchor.y + 2 * yMult, anchor.roomName),
      new RoomPosition(anchor.x + 2 * xMult, anchor.y + 4 * yMult, anchor.roomName),
      // 3
      new RoomPosition(anchor.x + 4 * xMult, anchor.y + 3 * yMult, anchor.roomName),
      new RoomPosition(anchor.x + 3 * xMult, anchor.y + 4 * yMult, anchor.roomName),
      new RoomPosition(anchor.x + 5 * xMult, anchor.y + 3 * yMult, anchor.roomName),
      new RoomPosition(anchor.x + 3 * xMult, anchor.y + 5 * yMult, anchor.roomName),
      // 4
      new RoomPosition(anchor.x + 5 * xMult, anchor.y + 4 * yMult, anchor.roomName),
      new RoomPosition(anchor.x + 4 * xMult, anchor.y + 5 * yMult, anchor.roomName),
      new RoomPosition(anchor.x + 6 * xMult, anchor.y + 4 * yMult, anchor.roomName),
      new RoomPosition(anchor.x + 4 * xMult, anchor.y + 6 * yMult, anchor.roomName),
      // end cap
      new RoomPosition(anchor.x + 5 * xMult, anchor.y + 6 * yMult, anchor.roomName),
      new RoomPosition(anchor.x + 6 * xMult, anchor.y + 5 * yMult, anchor.roomName),
      new RoomPosition(anchor.x + 6 * xMult, anchor.y + 6 * yMult, anchor.roomName)
    ];
  }
  public static extensions(room: Room): RoomPosition[] {
    const anchor = this.getAnchor(room);
    return [
      ...this.extensionSector(new RoomPosition(anchor.pos.x, anchor.pos.y, anchor.pos.roomName), -1, -1),
      ...this.extensionSector(new RoomPosition(anchor.pos.x, anchor.pos.y + 1, anchor.pos.roomName), -1, +1),
      ...this.extensionSector(new RoomPosition(anchor.pos.x + 1, anchor.pos.y, anchor.pos.roomName), +1, -1),
      ...this.extensionSector(new RoomPosition(anchor.pos.x + 1, anchor.pos.y + 1, anchor.pos.roomName), +1, +1)
    ];
  }
  public static towers(room: Room): RoomPosition[] {
    const anchor = this.getAnchor(room);
    return [
      new RoomPosition(anchor.pos.x - 5, anchor.pos.y, anchor.pos.roomName),
      new RoomPosition(anchor.pos.x - 5, anchor.pos.y + 1, anchor.pos.roomName),
      new RoomPosition(anchor.pos.x - 1, anchor.pos.y - 4, anchor.pos.roomName),
      new RoomPosition(anchor.pos.x + 2, anchor.pos.y - 4, anchor.pos.roomName),
      new RoomPosition(anchor.pos.x - 1, anchor.pos.y + 5, anchor.pos.roomName),
      new RoomPosition(anchor.pos.x + 2, anchor.pos.y + 5, anchor.pos.roomName)
    ];
  }
  public static coreBuildings(room: Room): { pos: RoomPosition; type: BuildableStructureConstant }[] {
    const anchor = this.getAnchor(room);
    return [
      {
        pos: new RoomPosition(anchor.pos.x - 1, anchor.pos.y - 1, anchor.pos.roomName),
        type: STRUCTURE_SPAWN
      },
      {
        pos: new RoomPosition(anchor.pos.x + 2, anchor.pos.y + 2, anchor.pos.roomName),
        type: STRUCTURE_SPAWN
      },
      {
        pos: new RoomPosition(anchor.pos.x + 1, anchor.pos.y + 7, anchor.pos.roomName),
        type: STRUCTURE_SPAWN
      },
      {
        pos: new RoomPosition(anchor.pos.x - 1, anchor.pos.y + 2, anchor.pos.roomName),
        type: STRUCTURE_STORAGE
      },
      {
        pos: new RoomPosition(anchor.pos.x + 2, anchor.pos.y - 1, anchor.pos.roomName),
        type: STRUCTURE_TERMINAL
      },
      {
        pos: new RoomPosition(anchor.pos.x - 3, anchor.pos.y - 6, anchor.pos.roomName),
        type: STRUCTURE_NUKER
      },
      {
        pos: new RoomPosition(anchor.pos.x, anchor.pos.y + 7, anchor.pos.roomName),
        type: STRUCTURE_FACTORY
      },
      {
        pos: new RoomPosition(anchor.pos.x, anchor.pos.y + 1, anchor.pos.roomName),
        type: STRUCTURE_LINK
      },
      {
        pos: new RoomPosition(anchor.pos.x - 6, anchor.pos.y, anchor.pos.roomName),
        type: STRUCTURE_OBSERVER
      },
      {
        pos: new RoomPosition(anchor.pos.x - 6, anchor.pos.y + 1, anchor.pos.roomName),
        type: STRUCTURE_POWER_SPAWN
      }
    ];
  }
  public static labs(room: Room): RoomPosition[] {
    const anchor = this.getAnchor(room);
    return [
      // Right side
      new RoomPosition(anchor.pos.x + 5, anchor.pos.y + 2, anchor.pos.roomName),
      new RoomPosition(anchor.pos.x + 5, anchor.pos.y - 1, anchor.pos.roomName),
      new RoomPosition(anchor.pos.x + 6, anchor.pos.y + 2, anchor.pos.roomName),
      new RoomPosition(anchor.pos.x + 6, anchor.pos.y + 3, anchor.pos.roomName),
      new RoomPosition(anchor.pos.x + 6, anchor.pos.y - 1, anchor.pos.roomName),
      new RoomPosition(anchor.pos.x + 6, anchor.pos.y - 2, anchor.pos.roomName),
      new RoomPosition(anchor.pos.x + 7, anchor.pos.y + 3, anchor.pos.roomName),
      new RoomPosition(anchor.pos.x + 7, anchor.pos.y + 4, anchor.pos.roomName),
      new RoomPosition(anchor.pos.x + 7, anchor.pos.y - 2, anchor.pos.roomName),
      new RoomPosition(anchor.pos.x + 7, anchor.pos.y - 3, anchor.pos.roomName)
    ];
  }

  public static ramparts(room: Room): RoomPosition[] {
    const anchor = this.getAnchor(room).pos;
    const terrain = room.getTerrain();
    const rampartIndex = [0, 3, 6, 9, 10, 13, 16, 19];
    const topLine = _.range(anchor.x - 9, anchor.x + 11)
      .filter((x) => rampartIndex.includes(x - (anchor.x - 9)))
      .map((x) => new RoomPosition(x, anchor.y - 9, room.name));
    const bottomLine = _.range(anchor.x - 9, anchor.x + 11)
      .filter((x) => rampartIndex.includes(x - (anchor.x - 9)))
      .map((x) => new RoomPosition(x, anchor.y + 10, room.name));
    const lLine = _.range(anchor.y - 9, anchor.y + 11)
      .filter((y) => rampartIndex.includes(y - (anchor.y - 9)))
      .map((y) => new RoomPosition(anchor.x - 9, y, room.name));
    const rLine = _.range(anchor.y - 9, anchor.y + 11)
      .filter((y) => rampartIndex.includes(y - (anchor.y - 9)))
      .map((y) => new RoomPosition(anchor.x + 10, y, room.name));
    return [...new Set([...topLine, ...bottomLine, ...lLine, ...rLine])].filter((p) => terrain.get(p.x, p.y) !== 1);
  }
  public static walls(room: Room): RoomPosition[] {
    const anchor = this.getAnchor(room).pos;
    const terrain = room.getTerrain();
    const rampartIndex = [1, 2, 4, 5, 7, 8, 11, 12, 14, 15, 17, 18];
    const topLine = _.range(anchor.x - 9, anchor.x + 11)
      .filter((x) => rampartIndex.includes(x - (anchor.x - 9)))
      .map((x) => new RoomPosition(x, anchor.y - 9, room.name));
    const bottomLine = _.range(anchor.x - 9, anchor.x + 11)
      .filter((x) => rampartIndex.includes(x - (anchor.x - 9)))
      .map((x) => new RoomPosition(x, anchor.y + 10, room.name));
    const lLine = _.range(anchor.y - 9, anchor.y + 11)
      .filter((y) => rampartIndex.includes(y - (anchor.y - 9)))
      .map((y) => new RoomPosition(anchor.x - 9, y, room.name));
    const rLine = _.range(anchor.y - 9, anchor.y + 11)
      .filter((y) => rampartIndex.includes(y - (anchor.y - 9)))
      .map((y) => new RoomPosition(anchor.x + 10, y, room.name));
    return [...new Set([...topLine, ...bottomLine, ...lLine, ...rLine])].filter((p) => terrain.get(p.x, p.y) !== 1);
  }
  private static getCoreBuildingPreviewLetter(type: BuildableStructureConstant): string {
    return type === STRUCTURE_SPAWN
      ? "Sp"
      : type === STRUCTURE_STORAGE
      ? "St"
      : type === STRUCTURE_TERMINAL
      ? "Tm"
      : type === STRUCTURE_LINK
      ? "Lk"
      : type === STRUCTURE_NUKER
      ? "Nk"
      : type === STRUCTURE_FACTORY
      ? "Fc"
      : type === STRUCTURE_OBSERVER
      ? "Ob"
      : type === STRUCTURE_POWER_SPAWN
      ? "Ps"
      : "Cb";
  }
  public static staticRoads(room: Room): RoomPosition[] {
    const anchor = this.getAnchor(room).pos;
    return [
      // TL
      new RoomPosition(anchor.x - 1, anchor.y - 2, anchor.roomName),
      new RoomPosition(anchor.x - 2, anchor.y - 1, anchor.roomName),
      new RoomPosition(anchor.x - 0, anchor.y - 2, anchor.roomName),
      new RoomPosition(anchor.x - 2, anchor.y - 0, anchor.roomName),
      // base
      new RoomPosition(anchor.x - 2, anchor.y - 2, anchor.roomName),
      new RoomPosition(anchor.x - 1, anchor.y - 3, anchor.roomName),
      new RoomPosition(anchor.x - 3, anchor.y - 1, anchor.roomName),
      // stem
      new RoomPosition(anchor.x - 3, anchor.y - 3, anchor.roomName),
      new RoomPosition(anchor.x - 4, anchor.y - 4, anchor.roomName),
      new RoomPosition(anchor.x - 5, anchor.y - 5, anchor.roomName),
      // TR
      new RoomPosition(anchor.x + 2, anchor.y - 2, anchor.roomName),
      new RoomPosition(anchor.x + 1, anchor.y - 2, anchor.roomName),
      new RoomPosition(anchor.x + 3, anchor.y - 1, anchor.roomName),
      new RoomPosition(anchor.x + 3, anchor.y - 0, anchor.roomName),
      // base
      new RoomPosition(anchor.x + 3, anchor.y - 2, anchor.roomName),
      new RoomPosition(anchor.x + 2, anchor.y - 3, anchor.roomName),
      new RoomPosition(anchor.x + 4, anchor.y - 1, anchor.roomName),
      // stem
      new RoomPosition(anchor.x + 4, anchor.y - 3, anchor.roomName),
      new RoomPosition(anchor.x + 5, anchor.y - 4, anchor.roomName),
      new RoomPosition(anchor.x + 6, anchor.y - 5, anchor.roomName),
      // BL
      new RoomPosition(anchor.x - 1, anchor.y + 3, anchor.roomName),
      new RoomPosition(anchor.x - 0, anchor.y + 3, anchor.roomName),
      new RoomPosition(anchor.x - 2, anchor.y + 2, anchor.roomName),
      new RoomPosition(anchor.x - 2, anchor.y + 1, anchor.roomName),
      // base
      new RoomPosition(anchor.x - 2, anchor.y + 3, anchor.roomName),
      new RoomPosition(anchor.x - 1, anchor.y + 4, anchor.roomName),
      new RoomPosition(anchor.x - 3, anchor.y + 2, anchor.roomName),
      // stem
      new RoomPosition(anchor.x - 3, anchor.y + 4, anchor.roomName),
      new RoomPosition(anchor.x - 4, anchor.y + 5, anchor.roomName),
      new RoomPosition(anchor.x - 5, anchor.y + 6, anchor.roomName),
      // BR
      new RoomPosition(anchor.x + 2, anchor.y + 3, anchor.roomName),
      new RoomPosition(anchor.x + 1, anchor.y + 3, anchor.roomName),
      new RoomPosition(anchor.x + 3, anchor.y + 2, anchor.roomName),
      new RoomPosition(anchor.x + 3, anchor.y + 1, anchor.roomName),
      // base
      new RoomPosition(anchor.x + 3, anchor.y + 3, anchor.roomName),
      new RoomPosition(anchor.x + 2, anchor.y + 4, anchor.roomName),
      new RoomPosition(anchor.x + 4, anchor.y + 2, anchor.roomName),
      //stem
      new RoomPosition(anchor.x + 4, anchor.y + 4, anchor.roomName),
      new RoomPosition(anchor.x + 5, anchor.y + 5, anchor.roomName),
      new RoomPosition(anchor.x + 6, anchor.y + 6, anchor.roomName)
    ];
  }
  public static run(room: Room): void {
    // MOVE to BL of initial spawn
    const anchor = this.getAnchor(room);
    const extensions = this.extensions(room);
    const towers = this.towers(room);
    const coreBuildings = this.coreBuildings(room);
    const ramparts = this.ramparts(room);
    const walls = this.walls(room);
    const labs = this.labs(room);
    const roads = this.staticRoads(room);
    roads.map((p) => room.visual.text("R", p, { stroke: "Black", opacity: 0.2 }));
    labs.map((l) => room.visual.text("Lb", l, { stroke: "Blue" }));
    extensions.map((ex) => {
      room.visual.text("E", ex, { stroke: "Orange", opacity: 0.4 });
    });
    towers.map((ex) => {
      room.visual.text("T", ex, { stroke: "Red" });
    });
    coreBuildings.map((cb) => {
      room.visual.text(this.getCoreBuildingPreviewLetter(cb.type), cb.pos, { stroke: "Black" });
    });
    ramparts.map((r) => room.visual.text("R", r, { stroke: "Green", opacity: 0.2 }));
    walls.map((w) => room.visual.text("W", w, { stroke: "Grey", opacity: 0.2 }));
  }
}
