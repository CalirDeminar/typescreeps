import { GlobalExpansion } from "./expansion/globalExpansion";
import { GlobalScouting, scoutingDirectorDefault, ScoutingDirectorStore } from "./scouting/globalScouting";

export interface GlobalMemory {
  roomStore: { [roomName: string]: RoomMemory };
  expansionDirector: {};
  scoutingDirector: ScoutingDirectorStore;
  defenseDirector: {};
  labDirector: {};
}
export const defaultMemory: GlobalMemory = {
  roomStore: {},
  expansionDirector: {},
  scoutingDirector: scoutingDirectorDefault,
  defenseDirector: {},
  labDirector: {}
};
export function runGlobal(): void {
  GlobalScouting.run();
  GlobalExpansion.run();
}
