import { ErrorMapper } from "utils/ErrorMapper";
import { RoomManager } from "./managers/manager.room";
import { Harvester } from "./roles/role.harvester";
import { Hauler } from "./roles/role.hauler";
import { Upgrader } from "./roles/role.upgrader";
import { Builder } from "./roles/role.builder";
import { Scout } from "roles/role.scout";
import { Logger } from "./utils/logger";
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);
  console.log(`Bucket: ${Game.cpu.bucket}`)
  Logger.log(Game);

  for (const name in Memory.creeps) {
    // Automatically delete memory of missing creeps
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    } else {
      const creep = Game.creeps[name];
      switch (creep.memory.role) {
        case "harvesterShuttle":
        case "harvesterStatic":
        case "harvester":
          Harvester.run(creep);
          break;
        case "upgrader":
          Upgrader.run(creep);
          break;
        case "builder":
          Builder.run(creep);
          break;
        case "hauler":
          Hauler.run(creep);
          break;
        case "scout":
          Scout.run(creep);
          break;
      }
    }
  }
  for (const room in Game.rooms) {
    RoomManager.run(Game.rooms[room]);
  }
  if (Game.cpu.bucket >= 10000) {
    const cpu: any = Game.cpu;
    //cpu.generatePixel();
  }
});
