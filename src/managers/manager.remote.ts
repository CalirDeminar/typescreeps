import { CreepBase } from "roles/role.creep";
import { CreepBuilder } from "utils/creepBuilder";
export class RemoteManager {
    public static getSurroundingRoomNames(room: Room): RoomPosition[] {
        const baseName = room.name;
        const currentWestString = baseName.match(/^W(\d+)N\d+/);
        const currentNorthString = baseName.match(/^W\d+N(\d+)/);
        return [{x: -1, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}].reduce((acc: RoomPosition[], c: {x: number, y: number}) => {
            if (currentWestString && currentNorthString) {
                const targetRoomName = `W${parseInt(currentWestString[1]) + c.x}N${parseInt(currentNorthString[1]) + c.y}`;
                return acc.concat([new RoomPosition(25, 25, targetRoomName)]);
            } else {
                return acc;
            }
        }, [])
    }
    public static run(room: Room) {
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        const anchor = room.find(FIND_FLAGS, {filter: (f) => f.name === `${room.name}-Anchor`})[0];
        const scouts = _.filter(Game.creeps, (c) => c.memory.role === "scout");
        const shouldSpawnScout = Game.time % 3_000 === 0 && room.controller && room.controller.level > 1 && spawn  && scouts.length === 0;
        if(shouldSpawnScout) {
            const initialTargets = this.getSurroundingRoomNames(room);
            Memory.roomStore[room.name].nextSpawn = {
                template: [MOVE],
                memory: {
                    ...CreepBase.baseMemory,
                    role: "scout",
                    homeRoom: room.name,
                    scoutPositions: initialTargets
                }
            };
        }
        _.map(Memory.roomStore[room.name].remoteRooms, ((rRoom) => {
            // find scouted sources in range
            const sourcesInRange = rRoom.sources.filter((s) => {
                if (s.pos) {
                    const pos = new RoomPosition(s.pos.x, s.pos.y, s.pos.roomName)
                    return anchor.pos.findPathTo(pos, {maxRooms: 2}).length < 25;
                }
                return false;
            });
            // console.log(`sourcesInRange: ${sourcesInRange.length}`)
            // for each source in range, spawn 2 remote harvesters if some missing
            sourcesInRange.map((s) => {
                if (!rRoom.hostile) {
                    const activeShuttles = _.filter(Game.creeps, (c) => c.memory.role === "harvesterShuttle" && c.memory.targetSource === s.id).length
                    const needsMoreShuttles = activeShuttles < 2;
                    if (needsMoreShuttles) {
                        Memory.roomStore[room.name].nextSpawn = {
                            template: CreepBuilder.buildShuttleCreep(room.energyCapacityAvailable),
                            memory: {
                                ...CreepBase.baseMemory,
                                role: "harvesterShuttle",
                                homeRoom: room.name,
                                targetSource: s.id,
                                targetSourcePos: s.pos
                            }
                        };
                    }
                }
            })
            // check if room is close enough
            // check if room has sources
            // run source manager? / shuttle
        }))
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
