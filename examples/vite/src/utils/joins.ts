import { JoinMap, MockLogicWave, JoinParams, LogFunction } from "use-join";

export const J = {
  Audio: {
    Control: {
      Level: { join: 1, type: "number", effects: { debounce: 5 } },
      Mute: { join: 1, type: "boolean", effects: { resetAfterMs: 100 } },
    },
    Management: {
      InUse: { join: 2, type: "number" },
    },
  },
  ManyStrings: { type: "string", join: { start: 1, end: 4 } },
} as const satisfies JoinMap;

const LogicWaveReverseString: MockLogicWave<"string"> = (v, get, pub) => {
  const asdf = v.split("").reverse().join("");
  return asdf;
};

export const joinParams: JoinParams = {
  MockControlSystem: {
    JoinMap: J,
    logicWaves: {
      boolean: {
        "1": {
          // This mocks a SIMPL "Toggle" block.
          // Publishing `true` clocks the output, `false` does nothing.
          logicWave: (v, get, pub) => {
            if (!v) {
              return get("boolean", 1);
            }
            return !get("boolean", 1);
          },
        },
      },
      number: {
        "2": {
          // We reset Level to `0` because we don't have a way of maintaining
          // arbitrary values between logicWaves that weren't previously defined as joins.
          logicWave: (v, get, pub) => {
            pub("number", 1, 0);

            return v;
          },
          initialValue: 1,
        },
      },
      // Just for fun. Also notice how we can reuse mock functions instead of inlining them.
      string: {
        "1": {
          initialValue: "tsrif",
          logicWave: LogicWaveReverseString,
        },
        "2": {
          initialValue: "dnoces",
          logicWave: LogicWaveReverseString,
        },
        "3": {
          initialValue: "driht",
          logicWave: LogicWaveReverseString,
        },
        "4": {
          initialValue: "htruof",
          logicWave: LogicWaveReverseString,
        },
      },
    },
  },
};
