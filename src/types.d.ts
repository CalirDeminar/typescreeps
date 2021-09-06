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
    name: string;
    anchor: RoomPosition;
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
    towers: string[];
    alertLevel: 0 | 1 | 2 | 3 | 4;
    alertStartTimestamp: number;
    defenders: string[];
    rampartMap: RoomPosition[];
    hostileCreeps: CreepCombatSheet[];
    activeTarget: string | null;
  }
  interface CreepCombatSheet {
    name: string;
    maxEffectiveHealing: number;
    maxRawHealing: number;
    toughBuffer: number;
    toughHealMultiplier: number;
    safeBuffer: number;
    dismantlePower: number;
    meleePower: number;
    rangedPower: number;
  }
  interface RemoteDirectorStore {
    roomName: string;
    homeRoomName: string;
    controllerId: string;
    anchorId: string;
    sources: {
      sourceId: string;
      targetContainerId: string | null;
    }[];
    roadQueue: RoomPosition[];
    roadsPathed: boolean;
    roadsConstructed: boolean;
    hasInvaderCore: boolean;
    hasHostileCreeps: boolean;
    hostileCreepCount: number;
    hostileTowerCount: number;
  }
  interface ConstructionDirectorStore {
    anchor: RoomPosition | null;
    anchorContainer: RoomPosition | null;
    internalRoadTemplate: RoomPosition[];
    routeRoadTemplate: RoomPosition[];
    mineralRoadTemplate: RoomPosition[];
    extensionTemplate: RoomPosition[];
    towerTemplate: RoomPosition[];
    sourceLinks: RoomPosition[];
    baseTemplate: {}[];
    buildingsCreated: boolean;
    roadsCreated: boolean;
  }
  interface RoomType {
    sources: string[];
    sourceDirector: SourceDirectorStore[];
    constructionDirector: ConstructionDirectorStore;
    remoteDirector: RemoteDirectorStore[];
    controllerId: string;
    minerals: string[];
    nextSpawn: CreepRecipie | null;
    buildingThisTick: boolean;
    remoteRooms: { [roomid: string]: remoteRoom };
    defenseDirector: DefenseDirectorStore;
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
