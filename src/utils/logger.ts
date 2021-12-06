const sections = ["Status (time & resources)", "Creep Counts & Performance", "Performance Breakdown"];
const creepRoles = [
  "harvesterShuttle",
  "staticHarvester",
  "hauler",
  "controllerHauler",
  "remoteHauler",
  "remoteHarvester",
  "upgrader",
  "builder",
  "queen",
  "linkHauler",
  "mason",
  "mineralHarvester",
  "mineralHauler",
  "pathfinder",
  "patrol",
  "remoteDefender"
];
const performanceUnits = [
  "roomConstruction",
  "roomBuilder",
  "roomControllerHauling",
  "roomLinkHauling",
  "roomQueen",
  "roomSpawning",
  "roomUpgrading",
  "roomDefenceBase",
  "roomDefenceDefenders",
  "roomDefenceTowers",
  "roomDefenseFortifications",
  "roomLocalEnergyConstruction",
  "roomLocalEnergyContainer",
  "roomLocalEnergyLink",
  "roomLocalEnergyShuttle",
  "roomRemoteEnergyConstruction",
  "roomRemoteEnergyHarvesting",
  "roomRemoteEnergyHauling",
  "roomRemoteEnergyIntel",
  "roomRemoteEnergyReservation",
  "rooMineral"
];
//  status
//    roomName
//    tick
//    execTime
//    bucket
//  creeps per role
//    live count
//    queued count
//    avg cpu cost
//  resources
//    energy
//    minerals

const textStyle: { align: "left" | "right"; opacity: number } = { align: "left", opacity: 0.5 };

export class Logger {
  private static getCreepPerformanceFigures(roomName: string) {
    const creeps = Object.values(Game.creeps).filter((c) => c.memory.homeRoom === roomName);
    const vals = creeps.map((c) => ({
      role: c.memory.role,
      performance: c.memory.performanceHistory.reduce((t, n) => t + n, 0) / (c.memory.performanceHistory.length || 1)
    }));
    return vals.reduce(
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
      new Array<{
        role: string;
        performance: number;
      }>()
    );
  }
  static log(game: Game) {
    Object.values(Game.rooms).forEach((room: Room) => {
      if (room.controller && room.controller.my) {
        const startCpu = Game.cpu.getUsed();
        const floatPrecision = 3;
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
        const creepPerformance = this.getCreepPerformanceFigures(room.name);
        room.visual.text(`Room: ${room.name}`, 2, 1, textStyle);
        room.visual.text(`Tick: ${Game.time}`, 2, 2, textStyle);
        room.visual.text(`Bucket: ${Game.cpu.bucket}`, 2, 3, textStyle);
        room.visual.text(`CPU Used: ${Game.cpu.getUsed().toFixed(floatPrecision)}`, 2, 4, textStyle);

        room.visual.text(`Creeps:`, 2, 7, textStyle);
        const maxRole = _.max(creepPerformance, (r) => r.performance).role;
        creepRoles.forEach((role, index) => {
          room.visual.text(role, 2, 8 + index, textStyle);
          room.visual.text(creepTotals[role] || "0", 8, 8 + index, textStyle);
          const colour = role === maxRole ? "red" : "white";
          const perf = creepPerformance.find((p) => p.role === role)?.performance || 0;
          const total = perf * (creepTotals[role] || 0);
          room.visual.text(perf.toFixed(floatPrecision), 9, 8 + index, { ...textStyle, color: colour });
          room.visual.text(total.toFixed(floatPrecision), 12, 8 + index, { ...textStyle, color: colour });
        });

        room.visual.text(`Resources: `, 15, 7, textStyle);

        room.visual.text(`Performance: `, 23, 7, textStyle);
        const performanceList = _.map(
          Memory.roomStore[room.name]?.filePerformance,
          (a, b) => a.reduce((acc, r) => acc + r, 0) / (a.length || 1)
        );
        const maxPerformance = Math.max(...performanceList).toFixed(floatPrecision);
        const totalPerformance = performanceList.reduce((acc, v) => acc + v, 0);
        performanceUnits.forEach((unit, index) => {
          room.visual.text(unit, 23, 8 + index, textStyle);
          const record = Memory.roomStore[room.name]?.filePerformance[unit];
          const usedCpu = record
            ? (record.reduce((acc, r) => acc + r, 0) / (record.length || 1)).toFixed(floatPrecision)
            : "";
          const colour = usedCpu === maxPerformance ? "red" : "white";
          room.visual.text(usedCpu, 33, 8 + index, { ...textStyle, color: colour });
        });
        room.visual.text(
          `Total: ${totalPerformance.toFixed(floatPrecision)}`,
          23,
          8 + performanceUnits.length + 1,
          textStyle
        );
        const cpuUsed = Game.cpu.getUsed() - startCpu;
        room.visual.text(`Log Cpu: ${cpuUsed.toFixed(floatPrecision)}`, 2, 5, textStyle);
      }
    });
    // if (Game.time % 5 === 0) {
    //   console.log("-------------------------------");
    // }
  }
}
