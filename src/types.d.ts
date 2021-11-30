// example declaration file - remove these and add your own custom typings

import { Dictionary } from "lodash";

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
  interface ScoutingDirectorStore {
    scoutedRooms: ScoutedRoom[];
    scoutQueue: RoomPosition[];
    scanningIndex: number;
  }
  interface ScoutedRoom {
    sources: { id: string; pos: RoomPosition }[];
    mineral: { id: string; pos: RoomPosition; mineralType: MineralConstant } | null;
    controller: { id: string; owner: string | null; reservation: string | null; pos: RoomPosition } | null;
    deposit: {
      id: string;
      type: DepositConstant;
      pos: RoomPosition;
      ticksToDecay: number;
      lastCooldown: number;
    } | null;
    powerBank: { id: string; pos: RoomPosition; power: number } | null;
    keeperLair: { id: string; pos: RoomPosition }[];
    invaderCore: { id: string; pos: RoomPosition } | null;
    towers: { id: string; pos: RoomPosition }[];
    name: string;
    freeTiles: string;
    settleableTiles: string;
    settlingScanningIndex: number;
    doneScanning: boolean;
  }
  interface DefenseDirectorStore {
    towers: string[];
    alertLevel: 0 | 1 | 2 | 3 | 4;
    alertStartTimestamp: number;
    defenders: string[];
    rampartMap: RoomPosition[];
    wallMap: RoomPosition[];
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
  interface ConstructionDirectorStore2 {
    internalRoadTemplate: RoomPosition[];
    towerTemplate: RoomPosition[];
    extensionTemplate: RoomPosition[];
    labTemplate: RoomPosition[];
    singleStructures: { type: BuildableStructureConstant; pos: RoomPosition }[];
    roadsCreated: boolean;
  }
  interface RoomType {
    sources: string[];
    constructionDirector: ConstructionDirectorStore2;
    remoteDirector: RemoteDirectorStore[];
    controllerId: string;
    minerals: string[];
    nextSpawn: CreepRecipie | null;
    spawnQueue: CreepRecipie[];
    buildingThisTick: boolean;
    remoteRooms: { [roomid: string]: remoteRoom };
    defenseDirector: DefenseDirectorStore;
    helpOtherRoom: boolean;
  }
  interface ExpansionDirectorStore {
    discardedRooms: string[];
    targetRoom: string | null;
    controllerId: string | null;
    newSpawnPosition: RoomPosition | null;
    helperRooms: string[];
    activeCalcingRoom: string | undefined;
    validExtensionLocations: RoomPosition[] | undefined;
    validExtensionDistances: { pos: RoomPosition; distance: number }[] | undefined;
    validExtensionScratchPad: { pos: RoomPosition; valid: boolean }[];
  }
  interface Memory {
    uuid: number;
    log: any;
    roomStore: {
      [key: string]: RoomType;
    };
    expansionDirector: ExpansionDirectorStore;
    scoutingDirector: ScoutingDirectorStore;
  }
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
