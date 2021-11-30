export interface ExpansionStore {
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
export class GlobalExpansion {
  public static run(): void {}
}
