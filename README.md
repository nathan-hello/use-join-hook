# use-join-hook

A typesafe React hook for interacting with Crestron processors.

### Install

```bash
npm install use-join
```
```bash
bun install use-join
```

Example:

```tsx

function RoomPower() {
  const [power, pubPower] = useJoin({join: 1, type: "boolean", effects: {resetAfterMs: 50}});
  return (
    <button onClick={() => pubPower(true)}>{power ? "On" : "Off"}</button>
  )
}
```

This will send a true digital signal over join 1 for 50ms, then send a false digital signal.
In your Simpl Windows, you use the true to send your command, and the component is subscribed to the feedback.

It's a proper `useState` call, so when your Crestron Processor updates the digital value on join 1,
it will send it down to the touchpanel. 

Full example in the `examples/` directory coming soon.

[!TIP]
Use `pubState` instead of `setState` when naming the function variable from `useJoin`. This helps you keep track of what is going to a Crestron Processor and what is local React state.


# Parameters

useJoin takes in a parameter of type `PUseJoin<any, any>`

```ts
{
  /**
   * `"boolean" | "number" | "string"`. The CrComLib.publishEvent function
   * allows for many more options than this but here it's constrained so it's easier to grep.
   */
  type: "boolean" | "number" | "string";
  /**
   * If you want to subscribe and publish over a single join, give:
   * number | string
   *  - A join number or, in the case of Contracts and Reserved Joins, a string.
   *
   * If using multiple joins that are not in order, give:
   * (number | string)[]
   * - E.g. [10, 12, "Room.PowerOn"] will be an array with length 3 of whatever type specified in `type`.
   * - The returned array will coorespond with the order of the joins.
   * - If you publish over this array, for example `pubRoomPower([false, false, true])`, it will also be in order.
   *
   * If using a series of join numbers and they are in order, give:
   * {start: number; end: number}
   * - E.g. `{start: 10, end: 17}` is completely equivalent to `[10, 11, 12, 13, 14, 15, 16, 17]`.
   */
  join: number | string | (number | string)[] | {start: number; end: number};
  /**
   * Offset is a tool for composition. Its value is added to join numbers (not strings).
   * If of type `number`, then the offset will apply to all joins equally.
   */
  offset?: number | { boolean?: number; number?: number; string?: number };
  /**
   * If true, console.log a default message for every message sent/recieved.
   * If a function, you will be able to implement your own logging function.
   *  - The return goes into a console.log().
   *  - You can return nothing if you want to handle logging yourself.
   */
  log?: boolean | LogFunction<T, K>;
  /**
   * Used for logging and your own documentation.
   */
  key?: string;
  /**
   * Unused param. Still useful for your own documentation.
   * In the future, we could optimize the hook based on this param.
   */
  dir?: "input" | "output" | "bidirectional";
  /**
   * Effects is an object which affects how the publish function works.
   */
  effects?: {
    /**
     * A number of milliseconds that the function will wait before publishing a new value.
     * For example, if you want to constrain a touch-settable volume slider 
     * to only publish once every `10`ms.
     */
    debounce?: number;
    /**
     * A number of milliseconds after which the falsey value of the relevant type 
     * will be published. Boolean types will send `false`, number types will send `0`, 
     * and string types will send an empty string.
     */
    resetAfterMs?: number;
  };
};
```


### JoinMap

Another benefit of having the params to `useJoin` be an object is that we can type them in a greater object.

This is useful for having one central location in your project that has all of the join numbers necessary to talk 
to Crestron. This example is from `examples/vite/src/utils/join.ts`.

```ts
import { JoinMap } from "use-join";
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
  Camera: CameraControlJoins(100);
} as const satisfies JoinMap;
```

This means that instead of having a bunch of join numbers across your application, you have a single source
of truth. And, if you utilize the `offset` attribute, you can make functions that returns a JoinMap with an offset, like so:

```ts
import { JoinMap, PUseJoin } from "use-join";
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
```

#### Note: Type Inference
The type above is slightly edited for brevity. The real types are a bit more complicated than what
is merrited on a readme. When you pass in `{type: "number"}`, that tells `useJoin` to subscribe and
publish over analog join(s), and that the return will similarly be with numbers instead of strings or booleans.

This hook has nothing to do with webXPanel support, PWA support, or contracts (other
than the fact you can supply any string as the `join` value). For these things you may want to follow
[jphillipsCrestron/ch5-react-ts-template](https://github.com/jphillipsCrestron/ch5-react-ts-template).
