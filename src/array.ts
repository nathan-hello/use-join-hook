// This file is exported for internal use only.
// To use useJoinArray, pass in an array to options.join

import { useState, useEffect, useRef } from "react";
import { CrComLibInterface, MockCrComLib, useMocks } from "@/mock.js";
import { CrComLib as RealCrComLib } from "@pepperdash/ch5-crcomlib-lite";
import { SignalMap } from "@/hook.js";

// This file is exported for internal use only.
// To use useJoinArray, pass in an array to options.join in useJoin
export function useJoinArray<T extends keyof SignalMapArray>(
  options: PUseJoinArray<T>,
): RUseJoinArray<T> {
  const join = getJoin(options);
  const [state, setState] = useState<SignalMapArray[T]>(
    new Array(options.join.length).fill(
      { boolean: false, number: 0, string: "" }[options.type],
    ),
  );

  const CrComLib =
    RealCrComLib.isCrestronTouchscreen() || RealCrComLib.isIosDevice()
      ? (RealCrComLib as CrComLibInterface)
      : (new MockCrComLib(useMocks()) as CrComLibInterface);

  useEffect(() => {
    const ids = join.map((join, idx) => {
      const id = CrComLib.subscribeState(
        options.type,
        join.toString(),
        (value: SignalMap[T]) => {
          setState((prev) => {
            const old = [...prev];
            old[idx] = value;
            return old as SignalMapArray[T];
          });
        },
      );
      return { id, join: join.toString(), idx };
    });

    return () => {
      ids.forEach(({ id, join }) => {
        CrComLib.unsubscribeState(options.type, join, id);
      });
    };
  }, [options.join]);

  const pubState = (values: SignalMapArray[T]) => {
    if (values.length !== options.join.length) {
      console.error("Published values length does not match join length");
      return;
    }

    values.forEach((value, idx) => {
      const joinStr = options.join[idx]!.toString();
      CrComLib.publishEvent(options.type, joinStr, value as SignalMap[T]);
      triggerLog(options, joinStr, value as SignalMap[T]);
    });
  };

  return [state, pubState];
}

function triggerLog<T extends keyof SignalMapArray>(
  options: PUseJoinArray<T>,
  join: string,
  value: SignalMap[T],
) {
  if (!options.log) return;

  let str = "";
  if (typeof options.log === "function") {
    const ret = options.log(join, value, options.key);
    if (ret === undefined) return;
    str = ret;
  } else if (options.log === true) {
    str = `${options.key ? `key ${options.key} ` : ""}join ${join} sent value: ${value}`;
  }

  console.log(str);
}

function getJoin<T extends keyof SignalMapArray>(
  options: PUseJoinArray<T>,
): string[] {
  let join = options.join;

  if (join.length === 0) {
    console.error(
      `useJoin "join" param was given an array of zero length: ${JSON.stringify(options)}`,
    );
    return [];
  }
  if (typeof join[0] === "number") {
    return join.map((j) => j.toString());
  }

  return join as string[];
}

export type SignalMapArray = {
  boolean: boolean[];
  number: number[];
  string: string[];
};

export type PUseJoinArray<T extends keyof SignalMapArray> = {
  /**
   * Join number / string over which the Crestron system is going to subscribe/publish.
   * If join is an array, all of them will be subscribed/published to.
   * The pubState function will take in the same length array and publish in order.
   */
  join: number[] | string[];
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
   * If `log` is true, then it will console.log() a default string such as `key <key> join <join> sent value <value>`.
   * If `log` is a function, then that function will be supplied with four values: join, value, isMock, and key (if key is defined).
   */
  log?:
    | boolean
    | ((join: string, value: SignalMap[T], key?: string) => string | void);
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
};

export type RUseJoinArray<T extends keyof SignalMapArray> = [
  SignalMapArray[T],
  (v: SignalMapArray[T]) => void,
];
