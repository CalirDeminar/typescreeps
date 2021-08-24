import { CreepBase } from "roles/role.creep";
export class RemoteManager {
    public static run(room: Room) {
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        const scouts = _.filter(Game.creeps, (c) => c.memory.role === "scout");
        if(spawn  && scouts.length === 0) {
            const initialTargets = [
                room.find(FIND_EXIT_TOP)[0],
                room.find(FIND_EXIT_RIGHT)[0],
                room.find(FIND_EXIT_BOTTOM)[0],
                room.find(FIND_EXIT_LEFT)[0],
            ].filter((t) => t != null);
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
