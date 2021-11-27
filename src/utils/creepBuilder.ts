export class CreepBuilder {
  public static buildShuttleCreep(energy: number): (WORK | CARRY | MOVE)[] {
    const noParts = Math.min(12, Math.floor(energy / 250));
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
    const noParts = Math.min(Math.floor(energy / 200), 16);
    if (noParts > 0) {
      return [...new Array(noParts).fill(WORK), ...new Array(noParts).fill(CARRY), ...new Array(noParts).fill(MOVE)];
    }
    return [];
  }
  public static buildMineralHarvester(energy: number): (WORK | CARRY | MOVE)[] {
    const moveParts = Math.ceil((energy - 50) / 1000);
    const workParts = Math.min(Math.floor((energy - 50 - moveParts * 50) / 100), 43);

    return [CARRY, ...new Array(moveParts).fill(MOVE), ...new Array(workParts).fill(WORK)];
  }
  public static buildRoadHauler(energy: number): (WORK | CARRY | MOVE)[] {
    const thirds = Math.floor(energy / 3 / 50);
    const moveParts = thirds;
    const carryParts = thirds * 2;
    return [...new Array(moveParts).fill(MOVE), ...new Array(carryParts).fill(CARRY)];
  }
  public static createRemoteCreeps(energy: number): { hauler: BodyPartConstant[]; worker: BodyPartConstant[] } {
    const workerN = 150;
    const workerOverhead = 50;
    const haulerN = 500;
    const scaleBudget = energy;
    const sectionCount = Math.floor(scaleBudget / haulerN);
    return {
      hauler: [...new Array(sectionCount * 5).fill("carry"), ...new Array(sectionCount * 5).fill("move")],
      worker: [...new Array(sectionCount).fill("work"), ...new Array(sectionCount).fill("move"), "carry"]
    };
    // non-overhead = ener
    // harvester design - N*[WORK, MOVE] + [CARRY]
    // hauler design - 6N*[MOVE, CARRY]
    // ONLY spawn hauler if container has been made
  }
}
