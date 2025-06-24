// This file is exported for internal use only.
// To use useJoinArray, pass in `(number | string)[] | {start: number; end: number}` to options.join

import { useState, useEffect, useRef, useMemo } from "react";
import {
  _MockCrComLib,
  CrComLibInterface,
  MockCrComLib,
} from "@/mock/store.js";
import { CrComLib as RealCrComLib } from "@pepperdash/ch5-crcomlib-lite";
import { MultiJoin, PUseJoin, SignalMap, RUseJoin } from "@/types.js";
import { pubDebounceMulti, pubWithTimeoutMulti } from "@/hook/effects.js";
import { logger } from "@/utils/log.js";
import { useJoinParamsContext } from "@/context.js";
import { registerJoin, unregisterJoin } from "@/utils/debug.js";

// This file is exported for internal use only.
// To use useJoinArray, pass in a MultiJoin to options.join in useJoin
export function useJoinMulti<T extends keyof SignalMap>(
  options: PUseJoin<T, MultiJoin>,
): RUseJoin<T, MultiJoin> {
  const globalParams = useJoinParamsContext();

  const CrComLib: CrComLibInterface = useMemo(
    () =>
      globalParams?.forceMock ||
      (!RealCrComLib.isCrestronTouchscreen() && !RealCrComLib.isIosDevice())
        ? MockCrComLib
        : (RealCrComLib as CrComLibInterface),
    [globalParams?.forceMock],
  );

  const defaultValue = { boolean: false, number: 0, string: "" }[options.type];

  const joins = getJoin(options);
  const [state, setState] = useState<SignalMap[T][]>(
    Array.from({ length: joins.length }, () => defaultValue),
  );

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const ids = joins.map((join, index) => {
      const id = CrComLib.subscribeState(
        options.type,
        join.toString(),
        function cb(value) {
          logger(
            { options, join, value, index, direction: "recieved" },
            globalParams?.logger,
          );
          setState((prev) => {
            const old = [...prev];
            old[index] = value;
            return old;
          });
        },
      );

      const initialValue = CrComLib.getState(options.type, join);
      if (initialValue !== null) {
        setState((prev) => {
          const copy = [...prev];
          copy[index] = initialValue;
          return copy;
        });
      }

      registerJoin(
        options.type,
        join,
        options,
        () => state[index]!,
        (v) =>
          pubState((prev) => {
            const copy = [...prev];
            copy[index] = v;
            return copy;
          }),
      );

      return { id, join: join.toString(), idx: index };
    });

    return () => {
      ids.forEach(({ id, join }) => {
        CrComLib.unsubscribeState(options.type, join, id);
        unregisterJoin(options.type, join);
      });
    };
  }, [options.join]);

  const pubState = useMemo(() => {
    let pub: React.Dispatch<
      React.SetStateAction<(SignalMap[T] | undefined)[]>
    > = (v) => {
      const nextValue = typeof v === "function" ? v(state) : v;
      if (nextValue.length !== joins.length) {
        console.error(`
useJoin pubState error: 
given array was of a different length than originally set.
length of value given: ${nextValue.length}
length of original join array: ${joins.length}
given value: ${JSON.stringify(nextValue)}
joins array: ${JSON.stringify(joins)}
`);
        return;
      }

      nextValue.forEach((value, index) => {
        if (value === undefined) {
          return;
        }
        const joinStr = joins[index]!.toString();
        logger(
          { options, join: joinStr, value, index, direction: "sent" },
          globalParams?.logger,
        );

        CrComLib.publishEvent(options.type, joinStr, value);
      });
    };

    if (options?.effects?.resetAfterMs) {
      const realPublish = pub;
      pub = pubWithTimeoutMulti(options, realPublish);
    }

    if (options.effects?.debounce) {
      const realPublish = pub;
      pub = pubDebounceMulti(options, realPublish, timeoutRef);
    }

    return pub;
  }, [options, joins, state, CrComLib, globalParams?.logger]);

  return [state, pubState];
}

function getJoin<T extends keyof SignalMap>(
  options: PUseJoin<T, MultiJoin>,
): string[] {
  let joins: string[] = [];

  let offset = 0;

  if (typeof options.offset === "number") {
    offset = options.offset;
  }
  if (typeof options.offset === "object") {
    offset = options.offset[options.type] ?? 0;
  }

  if (Array.isArray(options.join)) {
    joins = options.join.map((j) => {
      if (typeof j === "string") {
        return j;
      }
      if (typeof j === "number") {
        return (j + offset).toString();
      }
      throw new Error("useJoinMulti: join type was not a string or number");
    });
    return joins;
  }

  const joinRange = options.join;
  joins = Array.from({ length: joinRange.end - joinRange.start + 1 }, (_, i) =>
    (joinRange.start + i + offset).toString(),
  );

  return joins;
}
