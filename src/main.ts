import { ErrorMapper } from "utils/ErrorMapper";
import { Scout } from "roles/role.scout";
import { Logger } from "./utils/logger";
import { CoreDirector } from "director/director.core";
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  let lastCpu = Game.cpu.getUsed();
  let cpu = 0;
  for (const name in Memory.creeps) {
    // Automatically delete memory of missing creeps
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    } else {
      const creep = Game.creeps[name];
      switch (creep.memory.role) {
        case "scout":
          Scout.run(creep);
          cpu = Game.cpu.getUsed();
          // console.log(`${creep.name} - ${(cpu - lastCpu).toPrecision(5)}`);
          lastCpu = cpu;
          break;
      }
    }
  }
  const creepTime = Game.cpu.getUsed();
  for (const room in Game.rooms) {
    CoreDirector.run(Game.rooms[room]);
  }
  const roomManagerTime = Game.cpu.getUsed() - creepTime;
  // console.log(`CPU: Creeps: ${creepTime.toPrecision(5)}   RoomManager: ${roomManagerTime.toPrecision(5)}`);
  if (Game.cpu.bucket >= 10000) {
    const cpu: any = Game.cpu;
    //cpu.generatePixel();
  }
  Logger.log(Game);
});
