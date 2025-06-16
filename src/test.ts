import { JoinMap, JoinParams } from "@/types.js";

const J = {
  Audio: {
    Control: {
      Level: { join: 1, type: "number", effects: { debounce: 5 } },
      Mute: { join: 1, type: "boolean", effects: { resetAfterMs: 100 } },
    },
    Management: {
      InUse: { join: 2, type: "number" },
      Asdf: [
        { join: 4, type: "number" },
        { join: 5, type: "number" },
        { join: 6, type: "number" },
      ],
    },
  },
  ManyStrings: { type: "string", join: { start: 1, end: 4 } },
} as const satisfies JoinMap;

const joinParams: JoinParams<typeof J> = {
  MockControlSystem: {
    JoinMap: J,
    logicWaves: {
      boolean: {
        "": {
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
            pub("number", "Audio.Management.InUse", 0);

            return v;
          },
          initialValue: 1,
        },
      },
    },
  },
};
