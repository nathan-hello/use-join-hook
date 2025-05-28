import { JoinMap, PUseJoin } from "use-join";
// prettier-ignore
export const J = {
  Audio: {
    Control: {
      Up: { join: 5, type: "boolean", effects: {resetAfterMs: 100}, },
      Down: { join: 6, type: "boolean", effects: {resetAfterMs: 100}},
      Level: { join: 1, type: "number", effects: { debounce: 5 }, }, 
      Mute: { join: 7, type: "boolean", effects: { resetAfterMs: 100 }},
    },
    Management: {
      InUse: { join: 2, type: "number"},
    }, 
  },
} as const satisfies JoinMap;
