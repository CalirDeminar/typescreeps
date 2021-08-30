export class Logger {
  static log(game: Game) {
    if (Game.time % 5 === 0) {
      let report = "";
      const creepNames = Object.keys(game.creeps);
      const creepTotals = creepNames.sort().reduce((acc: any, name: string) => {
        const creep = game.creeps[name];
        if (Object.keys(acc).includes(creep.memory.role)) {
          return { ...acc, [creep.memory.role]: acc[creep.memory.role] + 1 };
        } else {
          return { ...acc, [creep.memory.role]: 1 };
        }
      }, {});
      for (const name in creepTotals) {
        report = report + `   ${name}: ${creepTotals[name]}`;
      }
      console.log(
        `Tick: ${Game.time} Bucket: ${Game.cpu.bucket}    Execution Time: ${Game.cpu.getUsed().toPrecision(5)}` + report
      );
    }
  }
}
