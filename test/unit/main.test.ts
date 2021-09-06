import { assert } from "chai";
import { CreepCombat } from "utils/creepCombat";
// import { UtilPosition } from "utils/util.position";
import { loop } from "../../src/main";
import { Game, Memory } from "./mock";

describe("main", () => {
  before(() => {
    // runs before all test in this block
  });

  beforeEach(() => {
    // runs before each test in this block
    // @ts-ignore : allow adding Game to global
    global.Game = _.clone(Game);
    // @ts-ignore : allow adding Memory to global
    global.Memory = _.clone(Memory);
  });

  it("should export a loop function", () => {
    assert.isTrue(typeof loop === "function");
  });

  it("should return void when called with no context", () => {
    assert.isUndefined(loop());
  });

  // it("Test util.position.getOtherSideOfExit", () => {
  //   const q1 = { x: 0, y: 12, roomName: "W22N8" };
  //   const a1 = { x: 49, y: 12, roomName: "W23N8" };
  //   const q2 = { x: 0, y: 12, roomName: "W0N25" };
  //   const a2 = { x: 49, y: 12, roomName: "W1N25" };
  //   const q3 = { x: 49, y: 12, roomName: "W0N25" };
  //   const a3 = { x: 0, y: 12, roomName: "E0N25" };
  //   const q4 = { x: 12, y: 49, roomName: "E12N0" };
  //   const a4 = { x: 12, y: 0, roomName: "E12S0" };
  //   const q5 = { x: 12, y: 49, roomName: "W22N8" };
  //   const a5 = { x: 12, y: 0, roomName: "W22N7" };
  //   assert.deepEqual(UtilPosition.getOtherSideOfExit(q1), a1);
  //   assert.deepEqual(UtilPosition.getOtherSideOfExit(q2), a2);
  //   assert.deepEqual(UtilPosition.getOtherSideOfExit(q3), a3);
  //   assert.deepEqual(UtilPosition.getOtherSideOfExit(q4), a4);
  //   assert.deepEqual(UtilPosition.getOtherSideOfExit(q5), a5);
  // });

  // it("Test Creep Calculation ", () => {
  //   const heal = new Array(20).fill({ type: "heal", hits: 100, boost: "XLHO2" });
  //   const movement = new Array(10).fill({ type: "move", hits: 100 });
  //   const tough = new Array(10).fill({ type: "tough", hits: 100, boost: "XGHO2" });
  //   const newBody = heal.concat(movement).concat(tough);
  //   assert.deepEqual(CreepCombat.getCreepCombatFigures(newBody), {
  //     maxEffectiveHealing: 3207,
  //     toughBuffer: 3340,
  //     safeBuffer: 4340,
  //     toughHealMultiplier: 3.34,
  //     maxRawHealing: 960,
  //     dismantlePower: 0,
  //     meleePower: 0,
  //     rangedPower: 0
  //   });
  //   assert.equal(
  //     CreepCombat.getCreepEffectiveHealing([
  //       { type: "tough", hits: 100 },
  //       { type: "tough", hits: 100 },
  //       { type: "heal", hits: 100 }
  //     ]),
  //     12,
  //     "basic components"
  //   );
  //   assert.equal(
  //     CreepCombat.getCreepEffectiveHealing([
  //       { type: "tough", hits: 100 },
  //       { type: "tough", hits: 100 },
  //       { type: "heal", hits: 100, boost: "XLHO2" }
  //     ]),
  //     48,
  //     "boosted heal"
  //   );
  //   assert.equal(
  //     CreepCombat.getCreepEffectiveHealing([
  //       { type: "tough", hits: 100, boost: "XGHO2" },
  //       { type: "tough", hits: 100, boost: "XGHO2" },
  //       { type: "heal", hits: 100, boost: "XLHO2" }
  //     ]),
  //     161,
  //     "boosted heal & tough"
  //   );
  // });

  it("Test Invader Parsign", () => {
    // 24 move
    // 25 heal
    // 1 move
    const healerBody = [
      ...new Array(24).fill({ type: "move", hits: 100 }),
      ...new Array(25).fill({ type: "heal", hits: 100 }),
      ...new Array(1).fill({ type: "move", hits: 100 })
    ];
    // 15 tough
    // 24 move
    // 3 ranged attack
    // 4 work
    // 2 attack
    // 1 move
    const attackerBody = [
      ...new Array(15).fill({ type: "tough", hits: 100 }),
      ...new Array(24).fill({ type: "move", hits: 100 }),
      ...new Array(3).fill({ type: "rangedAttack", hits: 100 }),
      ...new Array(4).fill({ type: "work", hits: 100 }),
      ...new Array(2).fill({ type: "attack", hits: 100 }),
      { type: "move", hits: 100 }
    ];
    const attacker = CreepCombat.getCreepCombatFigures(attackerBody);
    console.log(attacker);
    const healer = CreepCombat.getCreepCombatFigures(healerBody);
    console.log(healer);
  });
});
