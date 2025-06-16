import {
  JoinMap,
  MockLogicWave,
  JoinParams,
  JoinMapKeysToStringUnion,
} from "use-join";

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
  ManyStrings: [
    { type: "string", join: 1 },
    { type: "string", join: 2 },
    { type: "string", join: 3 },
    { type: "string", join: 4 },
  ],
} as const satisfies JoinMap;

const LogicWaveReverseString: MockLogicWave<any, "string"> = (v, get, pub) => {
  const asdf = v.split("").reverse().join("");
  return asdf;
};

export const joinParams: JoinParams<typeof J> = {
  MockControlSystem: {
    JoinMap: J,
    logicWaves: {
      boolean: {
        "Audio.Control.Mute": {
          // This mocks a SIMPL "Toggle" block.
          // Publishing `true` clocks the output, `false` does nothing.
          logicWave: (v, get, pub) => {
            if (!v) {
              return get("boolean", "Audio.Control.Mute");
            }
            return !get("boolean", "Audio.Control.Mute");
          },
        },
      },
      number: {
        "Audio.Control.Level": {
          // We reset Level to `0` because we don't have a way of maintaining
          // arbitrary values between logicWaves that weren't previously defined as joins.
          logicWave: (v, get, pub) => {
            pub("number", "Audio.Control.Level", 0);

            return v;
          },
          initialValue: 1,
        },
      },
      // Just for fun. Also notice how we can reuse mock functions instead of inlining them.
      string: {
        "ManyStrings.0": {
          initialValue: "tsrif",
          logicWave: LogicWaveReverseString,
        },
        "ManyStrings[1]": {
          initialValue: "dnoces",
          logicWave: LogicWaveReverseString,
        },
        "ManyStrings[2]": {
          initialValue: "driht",
          logicWave: LogicWaveReverseString,
        },
        "ManyStrings[3]": {
          initialValue: "htruof",
          logicWave: LogicWaveReverseString,
        },
      },
    },
  },
};
