export class CreepBuilder {
  public static buildShuttleCreep(energy: number): (WORK | CARRY | MOVE)[] {
    const noParts = Math.floor(energy / 250);
    if (noParts > 0) {
      return [
        ...new Array(noParts).fill(WORK),
        ...new Array(noParts * 2).fill(CARRY),
        ...new Array(noParts).fill(MOVE)
      ];
    }
    return [];
  }
  public static buildHaulingCreep(energy: number): (CARRY | MOVE)[] {
    const noParts = Math.min(Math.floor(energy / 150), 15);
    if (noParts > 0) {
      return [...new Array(noParts * 2).fill(CARRY), ...new Array(noParts).fill(MOVE)];
    }
    return [];
  }
  public static buildStaticHarvester(energy: number): (WORK | CARRY | MOVE)[] {
    const workParts = Math.min(Math.floor((energy - 150) / 100), 6);
    if (workParts >= 4) {
      return [...new Array(workParts).fill(WORK), CARRY, MOVE, MOVE];
    } else {
      return this.buildShuttleCreep(energy);
    }
  }
  public static buildScaledBalanced(energy: number): (WORK | CARRY | MOVE)[] {
    const noParts = Math.floor(energy / 200);
    if (noParts > 0) {
      return [...new Array(noParts).fill(WORK), ...new Array(noParts).fill(CARRY), ...new Array(noParts).fill(MOVE)];
    }
    return [];
  }
  public static buildMineralHarvester(energy: number): (WORK | CARRY | MOVE)[] {
    const moveParts = Math.ceil((energy - 50) / 1000);
    const workParts = Math.floor((energy - 50 - moveParts * 50) / 100);

    return [CARRY, ...new Array(moveParts).fill(MOVE), ...new Array(workParts).fill(WORK)];
  }
  public static buildRoadHauler(energy: number): (WORK | CARRY | MOVE)[] {
    const thirds = Math.floor(energy / 3 / 50);
    const moveParts = thirds;
    const carryParts = thirds * 2;
    return [...new Array(moveParts).fill(MOVE), ...new Array(carryParts).fill(CARRY)];
  }
}
