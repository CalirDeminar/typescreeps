import { ErrorMapper } from "utils/ErrorMapper";
import { RoomManager } from "./managers/manager.room";
import { Harvester } from "./roles/role.harvester";
import { Hauler } from "./roles/role.hauler";
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    } else {
      const creep = Game.creeps[name];
      switch (creep.memory.role) {
        case "harvester":
          Harvester.run(creep);
          break;
        case "hauler":
          Hauler.run(creep);
          break;
      }
    }
  }
  for (const room in Game.rooms) {
    RoomManager.run(Game.rooms[room]);
  }
});
