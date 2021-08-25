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
        const shouldSpawnScout = Game.time % 1500 === 0 && room.controller && room.controller.level > 1 && spawn  && scouts.length === 0;
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
        if (Game.time % 100 === 0) {
            const remoteSources = _.reduce(Memory.roomStore[room.name].remoteRooms, (acc: {source: Source, hostile: boolean}[], rRoom) => {
                const rtn = rRoom.sources.filter((s) => {
                    if (s.pos) {
                        const pos = new RoomPosition(s.pos.x, s.pos.y, s.pos.roomName)
                        const path = anchor.pos.findPathTo(pos, {maxRooms: 1, ignoreCreeps: true, });
                        return path.length < 30;
                    }
                    return false;
                }).map((s) => {return {source: s, hostile: rRoom.hostile}});
                return acc.concat(rtn);
            }, []);
            console.log(`Remote Source Count: ${remoteSources.length}`)
            remoteSources.map((t) => {
                if(!t.hostile && _.filter(Game.creeps, (c) => c.memory.role === "harvesterShuttle" && c.memory.targetSource === t.source.id).length < 1) {
                    const creepMemory = {
                        ...CreepBase.baseMemory,
                        role: "harvesterShuttle",
                        homeRoom: room.name,
                        targetSource: t.source.id,
                        targetSourcePos: t.source.pos
                    };
                    Memory.roomStore[room.name].nextSpawn = {
                        template: CreepBuilder.buildShuttleCreep(room.energyCapacityAvailable),
                        memory: creepMemory
                    };
                }
            });
        }
    }
}
