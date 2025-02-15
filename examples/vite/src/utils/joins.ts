import { PUseJoin,  } from "use-join";
// prettier-ignore
export const J = {
  Audio: {
    Control: {
      Volume: { Up: { join: 5, type: "boolean", dir: "output", key: "volume-up", log: true, },
        Down: { join: 6, type: "boolean", dir: "output", key: "volume-down", log: true, },
        Level: { join: 1, type: "number", dir: "output", key: "volume-level", log: true, effects: { debounce: 10 }, } as PUseJoin<"number">,
      },
      Mute: { join: 7, type: "boolean", dir: "input", key: "volume-mute", log: true, effects: { resetAfterMs: 100 }},
      GlobalMute: { join: 7, type: "boolean", dir: "input", key: "volume-mute", log: true, effects: { resetAfterMs: 100 }},
    },
    Management: {
      InUse: { join: 2, type: "number", dir: "input", key: "volume-mgmt-in-use", log: true, },
    }, 
}} as const;

export const JMocks = {

}
