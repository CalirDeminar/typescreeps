export class Constants {
  public static upgraders = 1;
  public static builders = 0;
  public static maxShuttles = 4;
  public static maxRemoteRoomDistance = 1;
  public static maxRemoteShuttles = 2;
  public static maxStatic = 1;
  public static maxHaulers = 2;
  public static haulerVolume = 200;
  public static maxExtensions = [0, 0, 5, 10, 20, 30, 40, 50, 60];
  public static maxTowers = [0, 0, 0, 1, 1, 2, 2, 3, 6];
  public static maxContainers = [0, 0, 0, 3, 3, 3, 3, 3, 3];
  public static maxStorage = [0, 0, 0, 0, 1, 1, 1, 1, 1];
  public static maxTerminal = [0, 0, 0, 0, 0, 0, 1, 1, 1];
  public static maxExtractor = [0, 0, 0, 0, 0, 0, 1, 1, 1];
  public static buildRoadsFrom = 3;
  public static scoutFrequency = 1500;
  public static terminalPlacent = { x: 1, y: 0 };
  public static towerOffsets = [
    { x: 0, y: 2 },
    { x: 0, y: -2 },
    { x: 2, y: 0 },
    { x: -2, y: 0 },
    { x: 1, y: 1 },
    { x: -1, y: -2 }
  ];
}
// [0, 0, 0, 0, 0, 0, 0, 0, 0]
// Flag Anchor 0,0
// Spawn 1 - 0, 1
// Spawn 2 - 0, -1
// Tower 1 - 0, 2
// Tower 2 - 0, -2
// Tower 3 - 2, 0
// Tower 4 - -2, 0
// Tower 5 - 1, 1
// Tower 6 - -1, -1
// Link Base - 1, -1
// Storage - -1, 0
// Terminal - 1, 0
// Nuker - -1, 1
