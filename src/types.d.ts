// example declaration file - remove these and add your own custom typings

import { Dictionary } from "lodash";

declare global {
  interface CreepMemory {
    role: string;
    working: boolean;
    born: number;
    targetSource: string;
    targetSourcePos: RoomPosition | null;
    targetStore: string;
    homeRoom: string;
    targetRoom: string;
    workTarget: string;
    upgradeTarget: string;
    refuelTarget: string;
    dropOffTarget: string;
    scoutPositions: RoomPosition[];
  }
  interface CreepRecipie {
    template: BodyPartConstant[];
    memory: CreepMemory;
  }
  interface HasPos {
    pos: RoomPosition;
  }
  interface remoteRoom {
    sources: Source[];
    minerals: Mineral[];
    hostile: boolean;
  }
  interface RoomType {
    sources: string[];
    controllerId: string;
    minerals: string[];
    nextSpawn: CreepRecipie | null;
    remoteRooms: { [roomid: string]: remoteRoom };
  }
  interface Memory {
    uuid: number;
    log: any;
    roomStore: {
      [key: string]: RoomType;
    };
  }
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
