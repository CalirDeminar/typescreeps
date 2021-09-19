export class Logger {
  static log(game: Game) {
    Object.values(Game.rooms).forEach((room: Room) => {
      let report = "";
      const creepNames = Object.keys(game.creeps);
      const creepTotals = creepNames.sort().reduce((acc: any, name: string) => {
        const creep = game.creeps[name];
        if (creep.memory.homeRoom === room.name) {
          if (Object.keys(acc).includes(creep.memory.role)) {
            return { ...acc, [creep.memory.role]: acc[creep.memory.role] + 1 };
          } else {
            return { ...acc, [creep.memory.role]: 1 };
          }
        }
        return acc;
      }, {});
      for (const name in creepTotals) {
        report = report + `   ${name}: ${creepTotals[name]}`;
      }
      if (Game.time % 5 === 0 && room.controller && room.controller.my) {
        console.log(
          `Tick: ${Game.time} Room: ${room.name} Bucket: ${
            Game.cpu.bucket
          }    Execution Time: ${Game.cpu.getUsed().toPrecision(5)}` + report
        );
      }
      room.visual.text(`Tick: ${Game.time}`, 2, 1, { align: "left" });
      room.visual.text(`Room: ${room.name}`, 2, 2, { align: "left" });
      room.visual.text(`Bucket: ${Game.cpu.bucket}`, 2, 3, { align: "left" });
      room.visual.text(`Execution Time: ${Game.cpu.getUsed().toPrecision(5)}`, 2, 4, { align: "left" });
      const scoutedRooms = Memory.roomStore[room.name]
        ? Memory.roomStore[room.name].scoutingDirector.scoutedRooms.map((r) => `${r.name} ${r.settleable ? "*" : ""}`)
        : [];
      room.visual.text(`Scouted Rooms: ${JSON.stringify(scoutedRooms)}`, 2, 5, { align: "left" });
      _.reduce(
        creepTotals,
        (acc: number, total: number, key: string) => {
          room.visual.text(`${key}: ${total}`, 2, acc, { align: "left" });
          return acc + 1;
        },
        7
      );
    });
    if (Game.time % 5 === 0) {
      console.log("-------------------------------");
    }
  }
}
