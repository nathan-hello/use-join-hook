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

`power` and `pubPower` connect directly to `fb1` and `press1`, respectively, in the Touchpanel symbol in SIMPL.
Feedback on the left, mutation on the right.

There is a full example in the `examples/vite` directory.

>[!TIP]
>Use `pubState` instead of `setState` when naming the function variable from `useJoin`. This helps you keep track of what is going to a Crestron Processor and what is local React state.


You can also subscribe to multiple joins over one hook call, giving you an array of `boolean | number | string`'s. See the type definition for details.

This is all you need to get started. This hook uses `@pepperdash/ch5-crcomlib-lite` which is a fork of the official CrComLib
that has a fixed package.json. This means that there isn't any extra code or patches you need to talk to the Control Processor.

Please submit an issue if you have any questions! 

# Parameters

useJoin takes in an object of type `PUseJoin`

```ts
{
  /**
   * `"boolean" | "number" | "string"`. The CrComLib.publishEvent function
   * allows for many more options than this but here it's constrained so it's easier to grep.
   */
  type: "boolean" | "number" | "string";
  /**
   * Subscribe to a specific join: `number | string`
   *
   * Subscribe to multiple joins: `(number | string)[]`
   * - `[10, 12, "Room.PowerOn"]` will be an array with length 3 of whatever type specified in `type`.
   * - The returned array will coorespond with the order of the joins.
   * - If you publish over this array, for example `pubRoomPower([false, true, true])`, it will also be in order.
   * - Publish `undefined` in place of any other value to not update that value.
   *   - If you wanted to update join 10 and 12, but not Room.PowerOn, you would use
   *     `pubRoomPower([false, true, undefined])`
   *
   * Subscribe to multiple joins (shortcut): `{start: number; end: number}`
   * - `{start: 10, end: 17}` is completely equivalent to `[10, 11, 12, 13, 14, 15, 16, 17]`.
   */
  join: number | string | (number | string)[] | {start: number; end: number};
  /**
   * Offset is a tool for composition. Its value is added to join numbers (not strings).
   * If of type `number`, then the offset will apply to all join types equally.
   *
   * `{type: "string", join: 5, offset: 50}`, the real join number subscribed to will be `55`.
   * `{type: "boolean", join: {start: 10, end: 15}, offset: {boolean: 12}}` will result in the
   * array being `[22, 23, 24, 25, 26, 27]`
   *
   */
  offset?: number | { boolean?: number; number?: number; string?: number };
  /**
   * Used for logging and your own documentation.
   */
  key?: string;
  /**
   * Unused param. Still useful for your own documentation.
   */
  dir?: "input" | "output" | "bidirectional";
  /**
   * Effects is an object which affects how the publish function works.
   */
  effects?: {
    /**
     * A number of milliseconds that the function will wait before publishing a new value.
     * For example, if you want to constrain a touch-settable volume slider to only publish once
     * every `10`ms.
     */
    debounce?: number;
    /**
     * A number of milliseconds after which the falsey value of the relevant type will be published.
     * Boolean types will send `false`, number types will send `0`, and string types will send an empty string.
     */
    resetAfterMs?: number;
  };
  /**
   * Overwrites GlobalParams.logger. Set this if you have logging enabled/disabled globally
   * but you want to change that for just this join.
   * This does not support passing LogFunction like GlobalParams.logger does.
   */
  log?: boolean;
}
```

Quick note on MultiJoins:
> You are able to send `undefined` in the array `pubState` expects because sometimes you want to update one join, but not others. And maybe you don't want to re-send the same variable that you sent last time, as most of the time joins are not idempotenet. If you find this strange, it's definitely a different way to think about talking to the processor. MultiJoins are mostly for reading from many joins in an array, like an series of volumes or something from your configuration file.

### JoinMap

Use JoinMap to consolodate all of your useJoin arguments into one central location.

```ts
import type { JoinMap } from "use-join";
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
  Camera: CameraControlJoins(100),
} as const satisfies JoinMap;
```

This means that instead of having a bunch of join numbers across your application, you have a single source
of truth. And, if you utilize the `offset` attribute, you can compose your JoinMap with functions.

```ts
import { JoinMap, PUseJoin } from "use-join";
// prettier-ignore
export function CameraControlJoins(offset: PUseJoin["offset"]) {
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

Across different projects, you can know that all of the joins are in a certain order, if not in the exact same place in the touchpanel symbol.


### Printing For Use In SIMPL

There is a helper file `utils/print.ts` which takes in a `JoinMap` and outputs a structured
JSON output for better visibility. When you use JoinMap, often times the semantic nature of your
joins (which is how you should organize them) is chaotic when you're trying to dump it into the
touchpanel symbol.

Take `print.ts`, import your JoinMap, call `pretty(J)` and run it using `npm print.ts` or `bun print.ts`. 

This will give you a structured JSON output for better visibility. The above JoinMap example looks like this:
```json
{
  "boolean": [
    {"Audio.Control.Volume.Up": {"join": "5", "effects": {"resetAfterMs": 100}}},
    {"Audio.Control.Volume.Down": {"join": "6", "effects": {"resetAfterMs": 100}}},
    {"Audio.Control.Mute": {"join": "7", "effects": {"resetAfterMs": 100}}},
    {"Camera.Power.On": {"join": "101", "effects": {"resetAfterMs": 100}, "dir": "input"}},
    {"Camera.Power.Off": {"join": "102", "effects": {"resetAfterMs": 100}, "dir": "input"}},
    {"Camera.Power.State": {"join": "103", "dir": "output"}},
    {"Camera.Dpad.Up": {"join": "104"}},
    {"Camera.Dpad.Down": {"join": "105"}},
    {"Camera.Dpad.Left": {"join": "106"}},
    {"Camera.Dpad.Right": {"join": "107"}},
    {"Camera.Zoom.In": {"join": "108"}},
    {"Camera.Zoom.Out": {"join": "109"}},
    {"Camera.Focus.In": {"join": "110"}},
    {"Camera.Focus.Out": {"join": "111"}},
    {"Camera.Focus.Auto": {"join": "112"}},
    {"Camera.Presets.SaveCommit": {"join": "113", "effects": {"resetAfterMs": 100}}},
    {"Camera.Presets.LoadCommit": {"join": "114", "effects": {"resetAfterMs": 100}}}
  ],
  "number": [
    {"Audio.Control.Volume.Level": {"join": "1", "effects": {"debounce": 10}}},
    {"Audio.Management.InUse": {"join": "2"}},
    {"Camera.Presets.Save": {"join": "101"}},
    {"Camera.Presets.Load": {"join": "102"}}
  ],
  "string": [

  ]
}
```

### Advanced Logging

By default, each send to and receive from a join is put into a `console.log` with a sprinkle of formatting.
If you want to disable this feature entirely, use the context provided for global parameters.

```ts
import { JoinParamsProvider } from 'use-join';

const joinParams: JoinParams = {
  logger: false,
}

React.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <JoinParamsProvider params={joinParams}>
      <App />
    </JoinParamsProvider>
  </StrictMode>,
);
```

Any joins with `{log: true}` will overwrite this setting.

You can also give a function to `joinParams.logger` that will be called whenever useJoin sends to or receives from the Control Processor.
This custom function is given an object, as described in the `JoinParams["logger"]` type.

If you return a string, it will be put into a `console.log`. If you return nothing, we presume you want to handle your own logging.

```ts
const joinParams: JoinParams = {
  logger: ({options, join, direction, value, index}) => myFavoriteTelemetryService({options, join, direction, value, index})
}
```

### Mock Control System

`JoinParams` can take in a mock control system. This is only live when in dev mode, as defined as `!(CrComLib.isCrestronTouchscreen() || CrComLib.isIosDevice())`. If this is not a good enough check, please put in an issue.

 This is extremely useful if there is some join that is necessary to get your UI going in production. Now you can simulate this in dev.

You can see an example of this in `examples/vite/utils/joins.ts`. Notice when we define `JoinParams` we give `<typeof J>`
as a type argument. This is so the `MockControlSystem` argument can know what joins exist in your control system.

Each `logicWave` function get the value that was published by the hook, a function for getting the current state of another join,
and a function which can publish to another join. It's missing a couple features (like storing arbitary state that wasn't previously defined as a join), but it's enough to get your UI up and running.

You also have the ability to set the value that the join will be on first React render. Because these are passed in above your `<App/>`
through the `<JoinParamsProvider>`, the values will persist when the component unmounts.

### Debugging

You can call `window.getJoin("boolean", 1)` to get the current state of boolean join 1, as your touchpanel sees it.


### Unsupported

There isn't any way to publish an object over `useJoin`. This hook was made solely with SIMPL Windows and a plain-jane React frontend in mind. If publishing and subscribing to objects is a requirement to you, please put in an issue. 
