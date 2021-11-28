export class CombatUtils {
  private static getHeal(type: BodyPartConstant, boost: string | number | undefined): number {
    switch (true) {
      case boost === "LO" && type === "heal":
        return 12 * 2;
      case boost === "LHO2" && type === "heal":
        return 12 * 3;
      case boost === "XLHO2" && type === "heal":
        return 12 * 4;
      case type === "heal":
        return 12;
      default:
        return 0;
    }
  }
  private static getEHP(type: BodyPartConstant, boost: string | number | undefined, currentHP: number): number {
    switch (true) {
      case boost === "GO" && type === "tough":
        return currentHP * 1.3;
      case boost === "GHO2" && type === "tough":
        return currentHP * 2;
      case boost === "XGHO2" && type === "tough":
        return currentHP * 3.34;
      default:
        return currentHP;
    }
  }
  private static getDissassemblePower(type: BodyPartConstant, boost: string | number | undefined): number {
    switch (true) {
      case boost === "ZH" && type === "work":
        return 50 * 2;
      case boost === "ZH2O" && type === "work":
        return 50 * 3;
      case boost === "XZH2O" && type === "work":
        return 50 * 4;
      case type === "work":
        return 50;
      default:
        return 0;
    }
  }
  private static getMeleeAttackPower(type: BodyPartConstant, boost: string | number | undefined): number {
    switch (true) {
      case boost === "UH" && type === "attack":
        return 30 * 2;
      case boost === "UH2O" && type === "attack":
        return 30 * 3;
      case boost === "XUH2O" && type === "attack":
        return 30 * 4;
      case type === "attack":
        return 30;
      default:
        return 0;
    }
  }
  private static getRangedAttackPower(type: BodyPartConstant, boost: string | number | undefined): number {
    switch (true) {
      case boost === "KO" && type === "ranged_attack":
        return 10 * 2;
      case boost === "KH2O" && type === "ranged_attack":
        return 10 * 3;
      case boost === "XKH2O" && type === "ranged_attack":
        return 10 * 4;
      case type === "ranged_attack":
        return 10;
      default:
        return 0;
    }
  }
  public static getCreepEHP(body: Creep["body"]): number {
    return body.reduce((acc, part) => acc + this.getEHP(part.type, part.boost, part.hits), 0);
  }
  public static getCreepSafeEHP(body: Creep["body"]): number {
    return body
      .filter((part) => part.type !== "heal")
      .reduce((acc, part) => {
        return acc + this.getEHP(part.type, part.boost, part.hits);
      }, 0);
  }
  public static getCreepToughEHP(body: Creep["body"]): number {
    return body
      .filter((part) => part.type === "tough")
      .reduce((acc, part) => acc + this.getEHP(part.type, part.boost, part.hits), 0);
  }
  public static getCreepRawHealing(body: Creep["body"]): number {
    return body.reduce((acc, part) => acc + this.getHeal(part.type, part.boost), 0);
  }
  public static getAvgHealMultiplier(body: Creep["body"]): number {
    const toughEHP = this.getCreepToughEHP(body);
    const rawHP = body.filter((part) => part.type === "tough").length * 100;
    return rawHP > 0 ? toughEHP / rawHP : 1;
  }
  public static getCreepEffectiveHealing(body: Creep["body"]): number {
    return Math.ceil(this.getCreepRawHealing(body) * this.getAvgHealMultiplier(body));
  }
  public static getCreepDismantlePower(body: Creep["body"]): number {
    return body.reduce((acc, part) => acc + this.getDissassemblePower(part.type, part.boost), 0);
  }
  public static getCreepMeleePower(body: Creep["body"]): number {
    return body.reduce((acc, part) => acc + this.getMeleeAttackPower(part.type, part.boost), 0);
  }
  public static getCreepRangedPower(body: Creep["body"]): number {
    return body.reduce((acc, part) => acc + this.getRangedAttackPower(part.type, part.boost), 0);
  }
  public static getCreepCombatFigures(
    body: Creep["body"]
  ): {
    maxEffectiveHealing: number;
    maxRawHealing: number;
    toughBuffer: number;
    toughHealMultiplier: number;
    safeBuffer: number;
    dismantlePower: number;
    meleePower: number;
    rangedPower: number;
  } {
    return {
      maxEffectiveHealing: this.getCreepEffectiveHealing(body),
      maxRawHealing: this.getCreepRawHealing(body),
      toughBuffer: this.getCreepToughEHP(body),
      toughHealMultiplier: this.getAvgHealMultiplier(body),
      safeBuffer: this.getCreepSafeEHP(body),
      dismantlePower: this.getCreepDismantlePower(body),
      meleePower: this.getCreepMeleePower(body),
      rangedPower: this.getCreepRangedPower(body)
    };
  }
  public static towerDamage(range: number): number {
    if (range <= TOWER_OPTIMAL_RANGE) {
      return 1 * 600;
    }
    if (range >= TOWER_FALLOFF_RANGE) {
      return (1 - TOWER_FALLOFF) * 600;
    }
    var towerFalloffPerTile = TOWER_FALLOFF / (TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE);
    return (1 - (range - TOWER_OPTIMAL_RANGE) * towerFalloffPerTile) * 600;
  }
  public static getTargets(room: Room): Creep[] {
    return room.find(FIND_HOSTILE_CREEPS, {
      filter: (s) =>
        s.body.some(
          (b) => b.type === WORK || b.type === ATTACK || b.type === RANGED_ATTACK || b.type === HEAL || b.type === CLAIM
        )
    });
  }
  public static getHostileTiles(room: Room): RoomPosition[] {
    const hostiles = this.getTargets(room);
    const aggroRange = _.range(-3, 4).reduce(
      (acc: { x: number; y: number }[], x) => acc.concat(_.range(-3, 4).map((y) => ({ x: x, y: y }))),
      []
    );
    return hostiles.reduce(
      (acc: RoomPosition[], c: Creep) =>
        acc.concat(aggroRange.map((r) => new RoomPosition(c.pos.x + r.x, c.pos.y + r.y, c.pos.roomName))),
      []
    );
  }
}
