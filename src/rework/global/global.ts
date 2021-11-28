export interface GlobalMemory {
  roomStore: { [roomName: string]: RoomMemory };
  expansionDirector: {};
  scoutingDirector: {};
  defenseDirector: {};
  labDirector: {};
}
export const defaultMemory: GlobalMemory = {
  roomStore: {},
  expansionDirector: {},
  scoutingDirector: {},
  defenseDirector: {},
  labDirector: {}
};
export function runGlobal(): void {}
