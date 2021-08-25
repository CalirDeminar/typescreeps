import { CreepBase } from "roles/role.creep";
export class RemoteManager {
    public static getSurroundingRoomNames(room: Room): RoomPosition[] {
        const baseName = room.name;
        const currentWestString = baseName.match(/^W(\d+)N\d+/);
        const currentNorthString = baseName.match(/^W\d+N(\d+)/);
        console.log(currentWestString);
        console.log(currentNorthString);
        return [{x: -1, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}].reduce((acc: RoomPosition[], c: {x: number, y: number}) => {
            if (currentWestString && currentNorthString) {
                const targetRoomName = `W${parseInt(currentWestString[1]) + c.x}N${parseInt(currentNorthString[1]) + c.y}`;
                console.log(targetRoomName);
                return acc.concat([new RoomPosition(25, 25, targetRoomName)]);
            } else {
                return acc;
            }
        }, [])
    }
    public static run(room: Room) {
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        const scouts = _.filter(Game.creeps, (c) => c.memory.role === "scout");
        if(room.controller && room.controller.level > 1 && spawn  && scouts.length === 0) {
            const initialTargets = this.getSurroundingRoomNames(room);
            spawn.spawnCreep(
                [MOVE],
                `scout-${Game.time}`,
                {
                    memory: {
                        ...CreepBase.baseMemory,
                        role: "scout",
                        homeRoom: room.name,
                        scoutPositions: initialTargets
                    }
                })
        }

        // needs an initial hasScouted flag
        //      just start off with scouting a single time
        // store a set of roomNames
        //  along with source and controller ids

        // get a distance to spawn for each remote source
        // calculate expected lifetime trips and carry back for creep
        // calulate cost of creep
        // if profit for creep over lifetime > N, build remote harvester
        // might need to have far more move parts than normal shuttle creep
    }
}
