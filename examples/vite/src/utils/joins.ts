import { JoinMap, PUseJoin } from "use-join";
// prettier-ignore
export const J = {
  Audio: {
    Control: {
      Volume: {
        Up: { join: 5, type: "boolean", effects: {resetAfterMs: 100}},
        Down: { join: 6, type: "boolean", effects: {resetAfterMs: 100}},
        Level: { join: 1, type: "number", effects: { debounce: 10 }, }, 
      },
      Mute: { join: 7, type: "boolean", effects: { resetAfterMs: 100 }},
    },
    Management: {
      InUse: { join: 2, type: "number" },
    }, 
  },
  Camera: CameraControlJoins(100)
} as const satisfies JoinMap;

// prettier-ignore
export function CameraControlJoins(offset: PUseJoin<any, any>["offset"]) {
  return {
    Power: {
      On: { offset, join: 1, type: "boolean", dir: "input", effects: { resetAfterMs: 100 } },
      Off: { offset, join: 2, type: "boolean", dir: "input", effects: { resetAfterMs: 100 } },
      State: { offset, join: 3, type: "boolean", dir: "output" },
    },
    Dpad: {
      Up: { offset, join: 4, type: "boolean" },
      Down: { offset, join: 5, type: "boolean" },
      Left: { offset, join: 6, type: "boolean" },
      Right: { offset, join: 7, type: "boolean" },
    },
    Zoom: { In: { offset, join: 8, type: "boolean" }, Out: { offset, join: 9, type: "boolean" }, },
    Focus: {
      In: { offset, join: 10, type: "boolean" },
      Out: { offset, join: 11, type: "boolean" },
      Auto: { offset, join: 12, type: "boolean" },
    },
    Presets: {
      Save: { offset, join: 1, type: "number" },
      Load: { offset, join: 2, type: "number" },
      SaveCommit: { offset, join: 13, type: "boolean", effects: { resetAfterMs: 100 } },
      LoadCommit: { offset, join: 14, type: "boolean", effects: { resetAfterMs: 100 } },
    },
  } as const satisfies JoinMap;
}
