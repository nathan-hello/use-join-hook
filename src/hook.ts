import { useState, useEffect, useRef } from "react";
import { MockCrComLib } from "@/mock.js";
import { CrComLib as RealCrComLib } from "@pepperdash/ch5-crcomlib-lite";
import {
  MultiJoin,
  isMultiJoin,
  RUseJoinArray,
  useJoinArray,
} from "@/multi.js";
import { useMocks } from "@/context.js";
import { useDebounce, pubWithTimeout } from "@/effects.js";

// Remove the K generic from type predicate
function joinIsArray<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin> | PUseJoin<T, MultiJoin>,
): options is PUseJoin<T, MultiJoin> {
  return (
    Array.isArray(options.join) ||
    (typeof options.join === "object" && "start" in options.join)
  );
}

// Modify function signatures to be more specific
export function useJoin<T extends keyof SignalMap>(
  options: PUseJoin<T, MultiJoin>,
): RUseJoinArray<T>;
export function useJoin<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin>,
): RUseJoin<T>;
export function useJoin<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin> | PUseJoin<T, MultiJoin>,
): RUseJoin<T> | RUseJoinArray<T> {
  if (joinIsArray(options)) {
    return useJoinArray(options);
  }

  const join = getJoin(options);

  const [state, setState] = useState<SignalMap[T]>(
    { boolean: false, number: 0, string: "" }[options.type],
  );

  const CrComLib =
    RealCrComLib.isCrestronTouchscreen() || RealCrComLib.isIosDevice()
      ? RealCrComLib
      : // Technically this violates React Rule "Only call Hooks at the top level",
        // but in our case, this call never changes during runtime. Either the device is Crestron and will
        // always use RealCrComLib or is not and will always have useMocks() as a part of this hook.
        new MockCrComLib(useMocks());

  useEffect(() => {
    const id = CrComLib.subscribeState(options.type, join, setState as any);
    return () => {
      CrComLib.unsubscribeState(options.type, join, id);
    };
  }, []);

  let pubState = (v: SignalMap[T]) => {
    CrComLib.publishEvent(options.type, join, v);
    triggerLog(options, join, v);
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
  options: PUseJoin<T>,
  join: string,
  value: SignalMap[T],
) {
  // Only disable log if `false` has been specified.
  if (options.log === false) {
    return;
  }
  let str = "";

  if (typeof options.log === "function") {
    const ret = options.log(join, value, options.key);
    if (ret === undefined) {
      return;
    } else {
      str += ret;
    }
  }

  if (options.log === true) {
    if (options.key !== undefined) {
      str += `key ${options.key} `;
    }
    str += `join ${join} sent value: ${value}`;
  }

  console.log(str);
}

function getJoin<T extends keyof SignalMap>(options: PUseJoin<T>): string {
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

type SingleJoin = number | string;

export type SignalMap = { boolean: boolean; number: number; string: string };

export type PUseJoin<T extends keyof SignalMap, K = SingleJoin> = {
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
} & (isMultiJoin<K> extends true
  ? {
      /**
       * If `log` is undefined, it is defaulted to true. To disable logs for a join, pass in `false`.
       * If `log` is true, then it will console.log() a default string such as `key <key> join <join> sent value <value>`.
       * If `log` is a function, then that function will be supplied with four values: join, value, isMock, and key (if key is defined).
       */
      log?:
        | boolean
        | ((
            join: string,
            value: SignalMap[T],
            index: number,
            key?: string,
          ) => string | void);
    }
  : {
      /**
       * If `log` is undefined, it is defaulted to true. To disable logs for a join, pass in `false`.
       * If `log` is true, then it will console.log() a default string such as `key <key> join <join> sent value <value>`.
       * If `log` is a function, then that function will be supplied with four values: join, value, isMock, and key (if key is defined).
       */
      log?:
        | boolean
        | ((join: string, value: SignalMap[T], key?: string) => string | void);
    });
export type RUseJoin<T extends keyof SignalMap> = [
  SignalMap[T],
  (v: SignalMap[T]) => void,
];
