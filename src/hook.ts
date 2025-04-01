import { useState, useEffect } from "react";
import { CrComLibInterface, MockCrComLib } from "@/mock.js";
import { CrComLib as RealCrComLib } from "@pepperdash/ch5-crcomlib-lite";
import { useJoinMulti } from "@/multi.js";
import { useMocks } from "@/context.js";
import { useDebounce, pubWithTimeout } from "@/effects.js";

function joinIsArray<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin> | PUseJoin<T, MultiJoin>,
): options is PUseJoin<T, MultiJoin> {
  return (
    Array.isArray(options.join) ||
    (typeof options.join === "object" && "start" in options.join)
  );
}

export function useJoin<T extends keyof SignalMap>(
  options: PUseJoin<T, MultiJoin>,
): RUseJoinMulti<T>;
export function useJoin<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin>,
): RUseJoin<T>;
export function useJoin<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin> | PUseJoin<T, MultiJoin>,
): RUseJoin<T> | RUseJoinMulti<T> {
  if (joinIsArray(options)) {
    return useJoinMulti(options);
  }

  const join = getJoin(options);

  const [state, setState] = useState<SignalMap[T]>(
    { boolean: false, number: 0, string: "" }[options.type],
  );

  const CrComLib =
    RealCrComLib.isCrestronTouchscreen() || RealCrComLib.isIosDevice()
      ? (RealCrComLib as CrComLibInterface)
      : // Technically this violates React Rule "Only call Hooks at the top level",
        // but in our case, this call never changes during runtime. Either the device is Crestron and will
        // always use RealCrComLib or is not and will always have useMocks() as a part of this hook.
        // If this changes between renders, React will throw.
        (new MockCrComLib(useMocks()) as CrComLibInterface);

  useEffect(() => {
    const id = CrComLib.subscribeState(
      options.type,
      join,
      function cb(value: SignalMap[T]) {
        triggerLog({ options, join, direction: "recieved", value });
        setState(value);
      },
    );
    return () => {
      CrComLib.unsubscribeState(options.type, join, id);
    };
  }, []);

  let pubState = (v: SignalMap[T]) => {
    CrComLib.publishEvent(options.type, join, v);
    triggerLog({ options, join, value: v, direction: "sent" });
  };

  if (options?.effects?.resetAfterMs) {
    const realPublish = pubState;
    pubState = pubWithTimeout(options, realPublish);
  }

  const realPublish = pubState;
  pubState = useDebounce(options, realPublish);

  return [state, pubState];
}

function triggerLog<T extends keyof SignalMap>(
  params: LogOptions<T, SingleJoin>,
) {
  const { direction, join, options, value } = params;
  // Only disable log if `false` has been specified.
  if (options.log === false) {
    return;
  }

  if (typeof options.log === "function") {
    const ret = options.log(params);
    if (ret === undefined) {
      return;
    }
    console.log(ret);
    return;
  }

  console.log(
    `${options.type} ${options.key ? `key ${options.key}` : ""}join ${join} ${direction} value: ${value}`,
  );
}

function getJoin<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin>,
): string {
  let join = options.join;
  if (typeof join === "string") {
    return join;
  }
  if (options.offset === undefined) {
    return join.toString();
  }

  if (typeof options.offset === "number") {
    join = join + options.offset;
  } else {
    const offset = options.offset[options.type];
    if (offset) {
      join = offset + join;
    }
  }
  return join.toString();
}

export type MultiJoin = number[] | string[] | MultiJoinObject;
/**
 * An object specifiying the start and end join numbers.
 * `{start: 10, end: 15}` will evaluate to [10, 11, 12, 13, 14, 15]
 */
export type MultiJoinObject = { start: number; end: number };
export type SingleJoin = number | string;

export type SignalMap = { boolean: boolean; number: number; string: string };

export type PUseJoin<
  T extends keyof SignalMap,
  K extends SingleJoin | MultiJoin,
> = {
  /**
   * Join number / string over which the Crestron system is going to subscribe/publish.
   */
  join: K;
  /**
   * Offset is used for join numbers such that you can have a default join number
   * and then apply offsets. Suggested practice is to put these in a utils.ts file
   * and have it available to export. An example of this is in examples/joins.ts
   */
  offset?: number | { boolean?: number; number?: number; string?: number };
  /**
   * `"boolean" | "number" | "string"`. The CrComLib.publishEvent function
   * allows for many more options than this but here it's constrained so it's easier to grep.
   */
  type: T;
  /**
   * Used for logging and your own documentation.
   */
  key?: string;
  /**
   * If true, console.log a default message for every message sent/recieved.
   * If a function, you will be able to implement your own logging function.
   *  - The return goes into a console.log().
   *  - You can return nothing if you want to handle logging yourself.
   */
  log?: boolean | LogFunction<T, K>;
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
};

export type LogOptions<
  T extends keyof SignalMap,
  K extends SingleJoin | MultiJoin,
> = {
  options: PUseJoin<T, K>;
  join: string;
  direction: "sent" | "recieved";
  value: SignalMap[T];
} & (K extends MultiJoin ? { index: number } : {});

export type LogFunction<
  T extends keyof SignalMap,
  K extends SingleJoin | MultiJoin,
> = (args: LogOptions<T, K>) => string | void;

export type LogOptionsWithoutGenerics = LogOptions<
  keyof SignalMap,
  SingleJoin | MultiJoin
>;

export type LogFunctionWithoutGenerics = (
  args: LogOptionsWithoutGenerics,
) => string | void;

export type RUseJoin<T extends keyof SignalMap> = [
  SignalMap[T],
  (v: SignalMap[T]) => void,
];

export type RUseJoinMulti<T extends keyof SignalMap> = [
  SignalMap[T][],
  (v: SignalMap[T][]) => void,
];

/**
 * A type helper to make it easier to store all of your joins in one object.
 * Leaf nodes are type checked to be valid params to useJoin.
 * Use this for organizing all of your joins in one place.
 *
 *Example usage:
 *```ts
 * const J: JoinMap = {
 *   Join1: { type: "boolean", join: 1, key: "Asdf" },
 *   Group1: {
 *     Join2: { type: "number", join: 2, key: "Fdsa" },
 *     Group2: {
 *       Join3: { type: "string", join: 3, key: "Zxcv" },
 *     },
 *   },
 * };
 * ```
 */
export type JoinMap = {
  [key: string]:
    | PUseJoin<keyof SignalMap, SingleJoin | MultiJoin>
    | {
        [key: string]:
          | PUseJoin<keyof SignalMap, SingleJoin | MultiJoin>
          | JoinMap;
      };
};
