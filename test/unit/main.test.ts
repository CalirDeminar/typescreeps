import { assert } from "chai";
import { CreepCombat } from "utils/creepCombat";
// import { UtilPosition } from "utils/util.position";
import { loop } from "../../src/main";
import { Game, Memory } from "./mock";
import { UtilPosition } from "utils/util.position";
import { CreepBase } from "roles/role.creep";
import { CoreDirector } from "director/director.core";

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
  it("Test Room Coordinate Navigration", () => {
    assert.equal(UtilPosition.navigateRoomName("N3E4", -1, -1), "N4E5");
    assert.equal(UtilPosition.navigateRoomName("N1E1", 1, 1), "N0E0");
    assert.equal(UtilPosition.navigateRoomName("N0E0", 1, 1), "S0W0");
  });
  it("spawnQueue sorting with energy in link, containers and storage", () => {
    const emptyCreepRec = { template: [], memory: { ...CreepBase.baseMemory } };
    const preRoleOrder = ["queen", "linkHauler", "harvesterStatic", "hauler", "remoteHarvester"];

    const preQueue = preRoleOrder.map((r) => {
      return { ...emptyCreepRec, memory: { ...emptyCreepRec.memory, role: r } };
    });
    const postRoleOrder = CoreDirector.sortSpawnQueue(preQueue, true, true, true).map((cr) => cr.memory.role);
    console.log(postRoleOrder);
    assert.deepEqual(postRoleOrder, ["queen", "hauler", "harvesterStatic", "linkHauler", "remoteHarvester"]);
  });
  it("spawnQueue sorting with no energy in link, containers or storage", () => {
    const emptyCreepRec = { template: [], memory: { ...CreepBase.baseMemory } };
    const preRoleOrder = [
      "remoteHarvester",
      "remoteDefender",
      "reserver",
      "hauler",
      "harvesterStatic",
      "linkHauler",
      "queen",
      "remoteHarvester"
    ];

    const preQueue = preRoleOrder.map((r) => {
      return { ...emptyCreepRec, memory: { ...emptyCreepRec.memory, role: r } };
    });
    const postRoleOrder = CoreDirector.sortSpawnQueue(preQueue, false, false, false).map((cr) => cr.memory.role);
    console.log(postRoleOrder);
    assert.deepEqual(postRoleOrder, [
      "harvesterStatic",
      "linkHauler",
      "hauler",
      "queen",
      "remoteHarvester",
      "remoteHarvester",
      "reserver",
      "remoteDefender"
    ]);
  });
  it("spawnQueue sorting with no energy in link, containers or storage", () => {
    const emptyCreepRec = { template: [], memory: { ...CreepBase.baseMemory } };
    const preRoleOrder = [
      "queen",
      "linkHauler",
      "harvesterStatic",
      "hauler",
      "remoteHarvester",
      "reserver",
      "remoteDefender"
    ];

    const preQueue = preRoleOrder.map((r) => {
      return { ...emptyCreepRec, memory: { ...emptyCreepRec.memory, role: r } };
    });
    const postRoleOrder = CoreDirector.sortSpawnQueue(preQueue, false, false, false).map((cr) => cr.memory.role);
    console.log(postRoleOrder);
    assert.deepEqual(postRoleOrder, [
      "harvesterStatic",
      "linkHauler",
      "hauler",
      "queen",
      "remoteHarvester",
      "reserver",
      "remoteDefender"
    ]);
  });
  it("spawnQueue sorting with no energy in link or storage, but in containers", () => {
    const emptyCreepRec = { template: [], memory: { ...CreepBase.baseMemory } };
    const preRoleOrder = [
      "queen",
      "linkHauler",
      "harvesterStatic",
      "hauler",
      "remoteHarvester",
      "reserver",
      "remoteDefender"
    ];

    const preQueue = preRoleOrder.map((r) => {
      return { ...emptyCreepRec, memory: { ...emptyCreepRec.memory, role: r } };
    });
    const postRoleOrder = CoreDirector.sortSpawnQueue(preQueue, false, false, true).map((cr) => cr.memory.role);
    console.log(postRoleOrder);
    assert.deepEqual(postRoleOrder, [
      "hauler",
      "harvesterStatic",
      "linkHauler",
      "queen",
      "remoteHarvester",
      "reserver",
      "remoteDefender"
    ]);
  });
  it("spawnQueue sorting with no energy in link or storage, but in containers", () => {
    const emptyCreepRec = { template: [], memory: { ...CreepBase.baseMemory } };
    const preRoleOrder = [
      "remoteHarvester",
      "remoteHarvester",
      "remoteHarvester",
      "remoteHarvester",
      "remoteHarvester",
      "remoteHarvester",
      "remoteHarvester",
      "reserver",
      "reserver",
      "mason",
      "harvesterStatic",
      "harvesterStatic",
      "remoteHarvester"
    ];

    const preQueue = preRoleOrder.map((r) => {
      return { ...emptyCreepRec, memory: { ...emptyCreepRec.memory, role: r } };
    });
    const postRoleOrder = CoreDirector.sortSpawnQueue(preQueue, false, false, true).map((cr) => cr.memory.role);
    console.log(postRoleOrder);
  });
});
