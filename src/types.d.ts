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
    hostileCreepCount: number;
    hostileTowerCount: number;
    invaderCore: boolean;
  }
  interface SourceDirectorStore {
    sourceId: string;
    shuttleHarvesterIds: string[];
    staticHarvesterIds: string[];
    containerId: string | null;
    targetContainerId: string | null;
    containerDistanceByPath: number;
    linkId: string | null;
    targetLinkId: string | null;
  }
  interface CoreDirectorStore {
    anchorPos: RoomPosition;
    controllerId: string;
    containerId: string | null;
    storageId: string | null;
    terminalId: string | null;
    spawnIds: string[];
    populatorIds: string[];
    nextSpawn: CreepRecipie;
  }
  interface DefenseDirectorStore {
    towerIds: string[];
    alertLevel: 0 | 1 | 2 | 3;
    defenders: string[];
  }
  interface RemoteDirectorStore {
    roomName: string;
    controller: string;
    sources: {
      sourceId: string;
      harvesterIds: string[];
      targetContainerId: string | null;
    }[];
  }
  interface ConstructionDirectorStore {
    anchor: RoomPosition | null;
    containerTemplate: RoomPosition[];
    internalRoadTemplate: RoomPosition[];
    routeRoadTemplate: RoomPosition[];
    extensionTemplate: RoomPosition[];
    towerTemplate: RoomPosition[];
    remoteTemplate: RoomPosition[];
    storage: RoomPosition | null;
    terminal: RoomPosition | null;
    extractor: RoomPosition | null;
    baseTemplate: {}[];
  }
  interface RoomType {
    sources: string[];
    sourceDirector: SourceDirectorStore[];
    constructionDirector: ConstructionDirectorStore;
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
