export class Scout {
    public static recordCurrentRoom(creep: Creep): void {
        const sources = creep.room.find(FIND_SOURCES);
        const minerals = creep.room.find(FIND_MINERALS);
        const hostile = creep.room.find(FIND_HOSTILE_CREEPS).length > 0 || creep.room.find(FIND_HOSTILE_STRUCTURES).length > 0;
        Memory.roomStore[creep.memory.homeRoom].remoteRooms[creep.pos.roomName] = {
            sources: sources,
            minerals: minerals,
            hostile: hostile
        }
        const exits = [
            creep.room.find(FIND_EXIT_TOP),
            creep.room.find(FIND_EXIT_RIGHT),
            creep.room.find(FIND_EXIT_BOTTOM),
            creep.room.find(FIND_EXIT_LEFT),
        ].filter((a) => {
            return a.find((p) => {
                return p.isEqualTo(creep.pos);
            }) === undefined;
        }).map((a) => a[0]);
        //creep.memory.scoutPositions = creep.memory.scoutPositions.concat(exits);
    }
    public static run(creep: Creep): void {
        const homeRoom = Memory.roomStore[creep.memory.homeRoom];
        const knownRooms = Object.keys(homeRoom.remoteRooms).concat([creep.memory.homeRoom])
        const positions = creep.memory.scoutPositions;
        const target = positions[0];
        //const path = creep.pos.findPathTo(target, {maxRooms: 2})
        if (creep.room.name !== creep.memory.homeRoom) {
            this.recordCurrentRoom(creep);
        }
        switch(true) {
            case !(knownRooms.includes(creep.pos.roomName)):
                // console.log("Record Room");
                // this.recordCurrentRoom(creep);
                break;
            case !positions || positions.length === 0:
                // console.log("Suicide");
                // nothing left to scout, so suicide
                creep.suicide();
                break;
            case creep.room.name === target.roomName:
                // console.log("At Target");
                // wait for room transfer
                creep.moveTo(target);
                creep.memory.scoutPositions = creep.memory.scoutPositions.slice(1);
                break;
            default:
                // console.log("Move To Target");
                const dir = creep.room.findExitTo(target.roomName);
                if (dir !== -2 && dir !== -10) {
                    const exit = creep.room.find(dir)[0];
                    const moveToResp = creep.moveTo(exit);
                }
        }
        console.log("-----")
    }
}
