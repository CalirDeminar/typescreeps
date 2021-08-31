import { ErrorMapper } from "utils/ErrorMapper";
import { RoomManager } from "./managers/manager.room";
import { Harvester } from "./roles/role.harvester";
import { Hauler } from "./roles/role.hauler";
import { Upgrader } from "./roles/role.upgrader";
import { Builder } from "./roles/role.builder";
import { Scout } from "roles/role.scout";
import { Reserver } from "roles/role.reserver";
import { Queen } from "roles/role.queen";
import { Logger } from "./utils/logger";
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
        case "harvesterShuttle":
        case "harvesterStatic":
        case "harvester":
          if(creep.memory.targetRoom !== creep.memory.homeRoom){
            Harvester.run(creep);
            cpu = Game.cpu.getUsed();
            // console.log(`${creep.name} - ${(cpu - lastCpu).toPrecision(5)}`);
            lastCpu = cpu;
          }
          break;
        case "upgrader":
          Upgrader.run(creep);
          cpu = Game.cpu.getUsed();
          // console.log(`${creep.name} - ${(cpu - lastCpu).toPrecision(5)}`);
          lastCpu = cpu;
          break;
        case "builder":
          Builder.run(creep);
          cpu = Game.cpu.getUsed();
          // console.log(`${creep.name} - ${(cpu - lastCpu).toPrecision(5)}`);
          lastCpu = cpu;
          break;
        case "scout":
          Scout.run(creep);
          cpu = Game.cpu.getUsed();
          // console.log(`${creep.name} - ${(cpu - lastCpu).toPrecision(5)}`);
          lastCpu = cpu;
          break;
        case "reserver":
          Reserver.run(creep);
          cpu = Game.cpu.getUsed();
          // console.log(`${creep.name} - ${(cpu - lastCpu).toPrecision(5)}`);
          lastCpu = cpu;
          break;
        case "queen":
          Queen.run(creep);
          cpu = Game.cpu.getUsed();
          // console.log(`${creep.name} - ${(cpu - lastCpu).toPrecision(5)}`);
          lastCpu = cpu;
          break;
      }
    }
  }
  const creepTime = Game.cpu.getUsed();
  for (const room in Game.rooms) {
    RoomManager.run(Game.rooms[room]);
  }
  const roomManagerTime = Game.cpu.getUsed() - creepTime;
  // console.log(`CPU: Creeps: ${creepTime.toPrecision(5)}   RoomManager: ${roomManagerTime.toPrecision(5)}`);
  if (Game.cpu.bucket >= 10000) {
    const cpu: any = Game.cpu;
    //cpu.generatePixel();
  }
  Logger.log(Game);
});
