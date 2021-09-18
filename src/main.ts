import { ErrorMapper } from "utils/ErrorMapper";
import { Logger } from "./utils/logger";
import { CoreDirector } from "director/director.core";
import { ExpansionDirector } from "director/director.expansion";
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  for (const name in Memory.creeps) {
    // Automatically delete memory of missing creeps
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }
  ExpansionDirector.run();
  for (const room in Game.rooms) {
    CoreDirector.run(Game.rooms[room]);
  }
  if (Game.cpu.bucket >= 10000 && ["shard0", "shard1", "shard2", "shard3"].includes(Game.shard.name)) {
    const cpu: any = Game.cpu;
    cpu.generatePixel();
  }
  Logger.log(Game);
});
