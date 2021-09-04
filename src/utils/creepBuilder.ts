export class CreepBuilder {
  public static buildShuttleCreep(energy: number): (WORK | CARRY | MOVE)[] {
    const noParts = Math.floor(energy / 250);
    let body: (WORK | CARRY | MOVE)[] = [];
    for (let i = 0; i < noParts; i++) {
      body = body.concat([WORK, CARRY, MOVE, MOVE]);
    }
    return body;
  }
  public static buildHaulingCreep(energy: number): (CARRY | MOVE)[] {
    const noParts = Math.floor(energy / 150);
    let body: (CARRY | MOVE)[] = [];
    for (let i = 0; i < noParts && i < 15; i++) {
      body = body.concat([CARRY, CARRY, MOVE]);
    }
    return body;
  }
  public static buildStaticHarvester(energy: number): (WORK | CARRY | MOVE)[] {
    const workParts = Math.floor((energy - 150) / 100);
    const body: (WORK | CARRY | MOVE)[] = [CARRY, MOVE, MOVE];
    if (workParts >= 4) {
      for (let i = 0; i < workParts && i < 6; i++) {
        body.push(WORK);
      }
      return body;
    } else {
      return this.buildShuttleCreep(energy);
    }
  }
  public static buildScaledBalanced(energy: number): (WORK | CARRY | MOVE)[] {
    const noParts = Math.floor(energy / 200);
    let body: (WORK | CARRY | MOVE)[] = [];
    for (let i = 0; i < noParts; i++) {
      body = body.concat([WORK, CARRY, MOVE]);
    }
    return body;
  }
  public static buildMineralHarvester(energy: number): (WORK | CARRY | MOVE)[] {
    const noParts = Math.floor(energy / 400);
    let body: (WORK | CARRY | MOVE)[] = [];
    for (let i = 0; i < noParts; i++) {
      body = body.concat([WORK, WORK, WORK, CARRY, MOVE]);
    }
    return body;
  }
}
