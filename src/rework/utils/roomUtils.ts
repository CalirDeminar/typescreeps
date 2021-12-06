export class RoomUtils {
  public static recordFilePerformance(roomName: string, fileName: string, performance: number): void {
    if (!Memory.roomStore[roomName].filePerformance) {
      Memory.roomStore[roomName].filePerformance = {};
    }
    if (Object.keys(Memory.roomStore).includes(roomName)) {
      const recordLimit = 50;
      const baseRecord = Memory.roomStore[roomName].filePerformance;
      const oldPerfHistory = Object.keys(baseRecord).includes(fileName) ? baseRecord[fileName] : [];
      const newPerfHistory =
        oldPerfHistory.length >= recordLimit
          ? oldPerfHistory.slice(1, recordLimit - 1).concat(performance)
          : oldPerfHistory.concat(performance);
      Memory.roomStore[roomName].filePerformance[fileName] = newPerfHistory;
    }
  }
}
