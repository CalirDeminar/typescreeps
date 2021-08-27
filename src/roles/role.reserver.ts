import { CreepBase } from "./role.creep";
export class Reserver extends CreepBase {
  private static pathColour() {
    return "black";
  }
  public static run(creep: Creep): void {
    if (creep.room.name === creep.memory.targetRoom) {
    } else {
    }
    switch (true) {
      case creep.room.name === creep.memory.targetRoom:
        const controller = creep.room.controller;
        if (controller) {
          const range = creep.pos.getRangeTo(controller);
          if (range > 1) {
            this.travelTo(creep, controller, this.pathColour());
          } else {
            creep.reserveController(controller);
          }
        }
        break;
      default:
        this.travelToRoom(creep, this.pathColour(), creep.memory.targetRoom);
    }
  }
}
