// This file is exported for internal use only.
// To use useJoinArray, pass in an array or {start: number; end: number} to options.join

import { useState, useEffect } from "react";
import { CrComLibInterface, MockCrComLib } from "@/mock/mock.js";
import { CrComLib as RealCrComLib } from "@pepperdash/ch5-crcomlib-lite";
import {
  MultiJoin,
  PUseJoin,
  RUseJoinMulti,
  SignalMap,
  LogOptions,
} from "@/types.js";
import { useMocks } from "@/context.js";
import { leftPad, rightPad } from "@/utils/util.js";
import {
  pubWithTimeout,
  pubWithTimeoutMulti,
  useDebounce,
  useDebounceMulti,
} from "@/hook/effects.js";

// This file is exported for internal use only.
// To use useJoinArray, pass in a MultiJoin to options.join in useJoin
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

  let pubState: React.Dispatch<React.SetStateAction<SignalMap[T][]>> = (v) => {
    const nextValue = typeof v === "function" ? v(state) : v;

    nextValue.forEach((value, index) => {
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

  const t = rightPad(options.type, "boolean".length, " ");
  const j = leftPad(join, 3, "0");
  const d = leftPad(direction, "received".length, " ");
  const v = rightPad(value.toString(), "false".length, " ");
  const k = options.key ? `${options.key}[${index}]` : "";

  console.log(`${t}:${j} ${d} value: ${v} ${k}`);
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
