export class Logger {
  static log(game: Game) {
    let report = "";
    const creepNames = Object.keys(game.creeps);
    const creepTotals = creepNames.reduce((acc: any, name: string) => {
      const creep = game.creeps[name];
      if (Object.keys(acc).includes(creep.memory.role)) {
        return { ...acc, [creep.memory.role]: acc[creep.memory.role] + 1 };
      } else {
        return { ...acc, [creep.memory.role]: 1 };
      }
    }, {});
    for (const name in creepTotals) {
      report = report + `${name}: ${creepTotals[name]} `;
    }
    console.log(`Tick: ${Game.time} Bucket: ${Game.cpu.bucket} ` + report);
  }
}
