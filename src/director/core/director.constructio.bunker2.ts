import { CoreRoomPlanner } from "./director.roomPlanner";
export class ConstructionBunker2Director {
  private static getAnchor(room: Room): Flag {
    return room.find(FIND_FLAGS, { filter: (f) => f.name === `${room.name}-Anchor` })[0];
  }
  public static extensions(room: Room): RoomPosition[] {
    const anchor = this.getAnchor(room);
    const structures = CoreRoomPlanner.generateStructures(anchor.pos);
    return structures.extensions;
  }
  public static towers(room: Room): RoomPosition[] {
    const anchor = this.getAnchor(room);
    const structures = CoreRoomPlanner.generateStructures(anchor.pos);
    return structures.towers;
  }
  public static coreBuildings(room: Room): { pos: RoomPosition; type: BuildableStructureConstant }[] {
    const anchor = this.getAnchor(room);
    const structures = CoreRoomPlanner.generateStructures(anchor.pos);
    return [
      {
        pos: structures.spawn1,
        type: STRUCTURE_SPAWN
      },
      {
        pos: structures.spawn2,
        type: STRUCTURE_SPAWN
      },
      {
        pos: structures.spawn3,
        type: STRUCTURE_SPAWN
      },
      {
        pos: structures.storage,
        type: STRUCTURE_STORAGE
      },
      {
        pos: structures.terminal,
        type: STRUCTURE_TERMINAL
      },
      {
        pos: structures.nuker,
        type: STRUCTURE_NUKER
      },
      {
        pos: structures.factory,
        type: STRUCTURE_FACTORY
      },
      {
        pos: structures.coreLink,
        type: STRUCTURE_LINK
      },
      {
        pos: structures.observer,
        type: STRUCTURE_OBSERVER
      },
      {
        pos: structures.powerSpawn,
        type: STRUCTURE_POWER_SPAWN
      }
    ];
  }
  public static labs(room: Room): RoomPosition[] {
    const anchor = this.getAnchor(room);
    const structures = CoreRoomPlanner.generateStructures(anchor.pos);
    return structures.labs;
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
    // const anchor = this.getAnchor(room).pos;
    return new Array<RoomPosition>();
  }
  public static run(room: Room): void {
    const memory = Memory.roomStore[room.name].constructionDirector;
    const extensions = memory.extensionTemplate;
    const towers = memory.towerTemplate;
    const coreBuildings = memory.singleStructures;
    const labs = memory.labTemplate;
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
  }
}
