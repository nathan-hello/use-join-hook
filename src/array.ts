// This file is exported for internal use only.
// To use useJoinArray, pass in an array to options.join

import { useState, useEffect, useRef } from "react";
import { CrComLibInterface, MockCrComLib } from "@/mock.js";
import { CrComLib as RealCrComLib } from "@pepperdash/ch5-crcomlib-lite";
import { PUseJoin, SignalMap } from "@/hook.js";
import { useMocks } from "@/context.js";
import type { LogOptions } from "./hook.js";
import { leftPad, rightPad } from "@/util.js";

export type isMultiJoin<T> = T extends MultiJoinObject
  ? true
  : T extends Array<any>
    ? true
    : false;
export type MultiJoin = number[] | string[] | MultiJoinObject;
type MultiJoinObject = { start: number; end: number };

// This file is exported for internal use only.
// To use useJoinArray, pass in an array to options.join in useJoin
export function useJoinArray<T extends keyof SignalMap>(
  options: PUseJoin<T, MultiJoin>,
): RUseJoinArray<T> {
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
          triggerLog({ options, join, index, direction: "recieved", value });
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

  const pubState = (values: SignalMap[T][]) => {
    if (values.length !== joins.length) {
      console.error("Published values length does not match join length");
    }

    values.forEach((value, index) => {
      const joinStr = joins[index]!.toString();
      CrComLib.publishEvent(options.type, joinStr, value);
      triggerLog({ options, join: joinStr, index, direction: "sent", value });
    });
  };

  return [state, pubState];
}

function triggerLog<T extends keyof SignalMap>(
  params: LogOptions<T, MultiJoin>,
) {
  const { direction, index, join, options, value } = params;
  if (!options.log) return;

  let str = "";
  if (typeof options.log === "function") {
    const ret = options.log(params);
    if (ret === undefined) return;
    str = ret;
  } else if (options.log === true) {
    const t = rightPad(options.type, "boolean".length, " ");
    const j = leftPad(join, 3, "0");
    const d = leftPad(direction, "received".length, " ");
    const v = rightPad(value.toString(), "false".length, " ");
    const k = options.key ? `${options.key}[${index}]` : "";

    str = `${t}:${j} ${d} value: ${v} ${k}`;
  }

  console.log(str);
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

export type RUseJoinArray<T extends keyof SignalMap> = [
  SignalMap[T][],
  (v: SignalMap[T][]) => void,
];
