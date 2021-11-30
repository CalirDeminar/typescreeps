// example declaration file - remove these and add your own custom typings

import { ExpansionStore } from "rework/global/expansion/globalExpansion";
import { ScoutingDirectorStore } from "rework/global/scouting/globalScouting";
import { RoomMemory } from "rework/rooms/room";

declare global {
  interface CreepMemory {
    role: string;
    working: boolean;
    targetSource: string;
    targetStore: string;
    homeRoom: string;
    targetRoom: string;
    workTarget: string;
    upgradeTarget: string;
    refuelTarget: string;
    dropOffTarget: string;
    scoutPositions: RoomPosition[];
    lastPosition: RoomPosition | null;
    stuckCounter: number;
    performanceHistory: number[];
  }
  interface CreepRecipie {
    template: BodyPartConstant[];
    memory: CreepMemory;
  }
  interface HasPos {
    pos: RoomPosition;
  }
  interface Memory {
    uuid: number;
    log: any;
    roomStore: {
      [key: string]: RoomMemory;
    };
    expansionDirector: ExpansionStore;
    scoutingDirector: ScoutingDirectorStore;
  }
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
