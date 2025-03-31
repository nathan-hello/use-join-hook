// This file is exported for internal use only.
// To use useJoinArray, pass in an array or {start: number; end: number} to options.join

import { useState, useEffect } from "react";
import { CrComLibInterface, MockCrComLib } from "@/mock.js";
import { CrComLib as RealCrComLib } from "@pepperdash/ch5-crcomlib-lite";
import { MultiJoin, PUseJoin, RUseJoinMulti, SignalMap } from "@/hook.js";
import { useMocks } from "@/context.js";
import { pubWithTimeoutMulti, useDebounceMulti } from "@/effects.js";
import { LogOptions } from "./hook.js";

// This file is exported for internal use only.
// To use useJoinArray, pass in an array to options.join in useJoin
export function useJoinMulti<T extends keyof SignalMap>(
  options: PUseJoin<T, MultiJoin>,
): RUseJoinMulti<T> {
  const [joins, initialState] = getJoin(options);
  const [state, setState] = useState<SignalMap[T][]>(initialState);

  const CrComLib =
    RealCrComLib.isCrestronTouchscreen() || RealCrComLib.isIosDevice()
      ? (RealCrComLib as CrComLibInterface)
      : (new MockCrComLib(useMocks()) as CrComLibInterface);

  useEffect(() => {
    const ids = joins.map((join, index) => {
      const id = CrComLib.subscribeState(
        options.type,
        join.toString(),
        function cb(value) {
          triggerLog({ options, join, value, index, direction: "recieved" });
          setState((prev) => {
            const old = [...prev];
            old[index] = value;
            return old;
          });
        },
      );
      return { id, join: join.toString(), idx: index };
    });

    return () => {
      ids.forEach(({ id, join }) => {
        CrComLib.unsubscribeState(options.type, join, id);
      });
    };
  }, [options.join]);

  let pubState = (
    values: SignalMap[T][],
    single?: { index: number; value: SignalMap[T] },
  ) => {
    if (values.length !== joins.length && !single) {
      console.error("Published values length does not match join length");
    }

    if (single) {
      if (joins[single.index]) {
        CrComLib.publishEvent(options.type, joins[single.index]!, single.value);
      } else {
        console.error(`joins[${single.index}] does not exist. joins: ${joins}`);
      }
      return;
    }

    values.forEach((value, index) => {
      const joinStr = joins[index]!.toString();
      CrComLib.publishEvent(options.type, joinStr, value);
      triggerLog({ options, join: joinStr, value, index, direction: "sent" });
    });
  };

  if (options?.effects?.resetAfterMs) {
    const realPublish = pubState;
    pubState = pubWithTimeoutMulti(options, realPublish);
  }

  const realPublish = pubState;
  pubState = useDebounceMulti(options, realPublish);

  return [state, pubState];
}

function triggerLog<T extends keyof SignalMap>(
  params: LogOptions<T, MultiJoin>,
) {
  const { direction, index, join, options, value } = params;
  if (options.log === false) return;

  if (typeof options.log === "function") {
    const ret = options.log(params);
    if (ret === undefined) {
      return;
    }
    console.log(ret);
    return;
  }

  console.log(
    `${options.type} ${options.key ? `key ${options.key}[${index}] ` : ""}join ${join} ${direction} value: ${value}`,
  );
}

function getJoin<T extends keyof SignalMap>(
  options: PUseJoin<T, MultiJoin>,
): [string[], SignalMap[T][]] {
  let join = options.join;

  let arr: string[] = [];
  let ini: SignalMap[T][] = [];

  if ("start" in join) {
    // e.g. {start: 3, end: 8} evals to [3, 4, 5, 6, 7, 8]
    const len = join.end - join.start + 1;
    arr = Array.from({ length: len }, (_, i) => {
      const n = join.start + i;
      return n.toString();
    });
    ini = new Array(arr.length).fill(
      { boolean: false, number: 0, string: "" }[options.type],
    );
    return [arr, ini];
  }

  if (join.length === 0) {
    throw Error(
      `useJoin "join" param was given an array of zero length: ${JSON.stringify(options)}`,
    );
  }

  arr = join.map((j) => j.toString());
  ini = new Array(arr.length).fill(
    { boolean: false, number: 0, string: "" }[options.type],
  );

  return [arr, ini];
}
