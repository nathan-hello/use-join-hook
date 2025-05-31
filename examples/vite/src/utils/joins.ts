import { JoinMap, MockLogicWave, TGlobalParams } from "use-join";

export const J = {
  Audio: {
    Control: {
      Level: { join: 1, type: "number", effects: { debounce: 5 } },
      Mute: { join: 7, type: "boolean", effects: { resetAfterMs: 100 } },
    },
    Management: {
      InUse: { join: 2, type: "number" },
    },
  },
  ManyStrings: { type: "string", join: { start: 10, end: 13 } },
} as const satisfies JoinMap;

const LogicWaveReverseString: MockLogicWave<"string"> = (v, get, pub) => {
  const asdf = v.split("").reverse().join("");
  return asdf;
};

export const MockControlSystem: TGlobalParams<typeof J> = {
  JoinMap: J,
  logicWaves: {
    boolean: {
      "7": {
        logicWave: (v, get, pub) => {
          if (!v) {
            return;
          }
          return !get("boolean", 7);
        },
      },
    },
    number: {
      "1": {
        logicWave: (v, get, pub) => {
          const inUse = get("number", 2);
          if (inUse === 1) {
            pub("number", 99, v);
            console.log("from level", get("number", 99));
            return v;
          }
          if (inUse === 2) {
            pub("number", 100, v);
            return v;
          }
          return 0;
        },
      },
      "2": {
        initialValue: 1,
      },
    },
    string: {
      "10": {
        initialValue: "first",
        logicWave: LogicWaveReverseString,
      },
      "11": {
        initialValue: "first",
        logicWave: LogicWaveReverseString,
      },
      "12": {
        initialValue: "first",
        logicWave: LogicWaveReverseString,
      },
      "13": {
        initialValue: "first",
        logicWave: LogicWaveReverseString,
      },
    },
  },
};
