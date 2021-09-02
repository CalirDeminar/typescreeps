import { assert } from "chai";
import { UtilPosition } from "utils/util.position";
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

  it("Test util.position.getOtherSideOfExit", () => {
    const q1 = { x: 0, y: 12, roomName: "W22N8" };
    const a1 = { x: 49, y: 12, roomName: "W23N8" };
    const q2 = { x: 0, y: 12, roomName: "W0N25" };
    const a2 = { x: 49, y: 12, roomName: "W1N25" };
    const q3 = { x: 49, y: 12, roomName: "W0N25" };
    const a3 = { x: 0, y: 12, roomName: "E0N25" };
    const q4 = { x: 12, y: 49, roomName: "E12N0" };
    const a4 = { x: 12, y: 0, roomName: "E12S0" };
    const q5 = { x: 12, y: 49, roomName: "W22N8" };
    const a5 = { x: 12, y: 0, roomName: "W22N7" };
    assert.deepEqual(UtilPosition.getOtherSideOfExit(q1), a1);
    assert.deepEqual(UtilPosition.getOtherSideOfExit(q2), a2);
    assert.deepEqual(UtilPosition.getOtherSideOfExit(q3), a3);
    assert.deepEqual(UtilPosition.getOtherSideOfExit(q4), a4);
    assert.deepEqual(UtilPosition.getOtherSideOfExit(q5), a5);
  });
});
