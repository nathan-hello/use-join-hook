// This file is exported for internal use only.
// To use useJoinArray, pass in `(number | string)[] | {start: number; end: number}` to options.join

import { useState, useEffect } from "react";
import {
  _MockCrComLib,
  CrComLibInterface,
  MockCrComLib,
} from "@/mock/store.js";
import { CrComLib as RealCrComLib } from "@pepperdash/ch5-crcomlib-lite";
import {
  MultiJoin,
  PUseJoin,
  SignalMap,
  RUseJoin,
  MockLogicWave,
} from "@/types.js";
import { pubWithTimeoutMulti, useDebounceMulti } from "@/hook/effects.js";
import { logger } from "@/utils/log.js";
import { TGlobalParams, useJoinParamsContext } from "@/context.js";
import { registerJoin, unregisterJoin } from "@/utils/debug.js";

// This file is exported for internal use only.
// To use useJoinArray, pass in a MultiJoin to options.join in useJoin
export function useJoinMulti<T extends keyof SignalMap>(
  options: PUseJoin<T, MultiJoin>,
): RUseJoin<T, MultiJoin> {
  const [joins, initialState] = getJoin(options);
  const [state, setState] = useState<SignalMap[T][]>(initialState);

  const CrComLib =
    RealCrComLib.isCrestronTouchscreen() || RealCrComLib.isIosDevice()
      ? (RealCrComLib as CrComLibInterface)
      : MockCrComLib;

  const globalParams = useJoinParamsContext();

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

      if (CrComLib instanceof _MockCrComLib) {
        // Because TGlobalParams relies on JoinMap to extract all of the joins
        // if there isn't a type we're giving TGlobalParams, it thinks that
        // globalParams.logicWaves[options.type] is always {} even if it does exist.
        // The type kind of collapses because of its autocompletion. This is runtime safe.
        // @ts-ignore-next-line
        const m = globalParams?.logicWaves?.[options.type]?.[join];
        if (m !== undefined) {
          CrComLib.registerMock(
            options.type,
            join,
            m.logicWave,
            m.initialValue,
          );
        }
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

  let pubState: React.Dispatch<React.SetStateAction<SignalMap[T][]>> = (v) => {
    const nextValue = typeof v === "function" ? v(state) : v;

    nextValue.forEach((value, index) => {
      const joinStr = joins[index]?.toString();
      if (!joinStr) {
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
      logger(
        { options, join: joinStr, value, index, direction: "sent" },
        globalParams?.logger,
      );

      CrComLib.publishEvent(options.type, joinStr, value);
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

function getJoin<T extends keyof SignalMap>(
  options: PUseJoin<T, MultiJoin>,
): [string[], SignalMap[T][]] {
  let join = options.join;
  let arr: string[] = [];

  let offset = 0;

  if (typeof options.offset === "number") {
    offset = options.offset;
  }
  if (typeof options.offset === "object") {
    offset = options.offset[options.type] ?? 0;
  }

  if ("start" in join) {
    const len = join.end - join.start + 1;
    arr = Array.from({ length: len }, (_, i) =>
      (join.start + i + offset).toString(),
    );
  } else {
    arr = join.map((j) => {
      if (typeof j === "string") {
        return j;
      }
      const withOffset = j + offset;
      return withOffset.toString();
    });
  }

  const ini: SignalMap[T][] = Array.from(
    { length: arr.length },
    () =>
      ({
        boolean: false,
        number: 0,
        string: "",
      })[options.type],
  );

  return [arr, ini];
}
