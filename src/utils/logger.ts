export class Logger {
  private static logCreepPerformance(): void {
    const creeps = Object.values(Game.creeps);
    const vals = creeps.map((c) => ({
      role: c.memory.role,
      performance: c.memory.performanceHistory.reduce((t, n) => t + n, 0) / (c.memory.performanceHistory.length || 1)
    }));
    const roleMap = vals.reduce(
      (existingRoles: { role: string; performance: number }[], incomingRole: { role: string; performance: number }) => {
        const index = existingRoles.findIndex((r) => r.role === incomingRole.role);
        if (index >= 0) {
          const ref = existingRoles[index];
          const newRole = { role: ref.role, performance: (ref.performance + incomingRole.performance) / 2 };
          const rtn = existingRoles;
          rtn[index] = newRole;
          return rtn;
        } else {
          return existingRoles.concat([incomingRole]);
        }
      },
      []
    );
    let output = "Creep Perf: ";
    roleMap
      .sort((a, b) => a.performance - b.performance)
      .forEach((r) => (output += ` ${r.role}: ${r.performance.toFixed(5)} - `));
    console.log(output);
  }
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
        this.logCreepPerformance();
      }
      room.visual.text(`Tick: ${Game.time}`, 2, 1, { align: "left" });
      room.visual.text(`Room: ${room.name}`, 2, 2, { align: "left" });
      room.visual.text(`Bucket: ${Game.cpu.bucket}`, 2, 3, { align: "left" });
      room.visual.text(`Execution Time: ${Game.cpu.getUsed().toPrecision(5)}`, 2, 4, { align: "left" });
      const scoutedRooms = Memory.scoutingDirector.scoutedRooms
        .filter((r) => r.settleableTiles.length > 0)
        .map((r) => `${r.name} ${r.settleableTiles.length > 0 ? "*" : ""}`);

      room.visual.text(`Expansion Candidates: ${JSON.stringify(scoutedRooms)}`, 2, 5, { align: "left" });
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
