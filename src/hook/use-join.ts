import { useState, useEffect, useMemo, useRef } from "react";
import {
  _MockCrComLib,
  CrComLibInterface,
  MockCrComLib,
} from "@/mock/store.js";
import { CrComLib as RealCrComLib } from "@pepperdash/ch5-crcomlib-lite";
import { useJoinMulti } from "@/hook/use-join-multi.js";
import { pubWithTimeoutSingle, pubDebounceSingle } from "@/hook/effects.js";
import { registerJoin, unregisterJoin } from "@/utils/debug.js";
import type {
  SignalMap,
  MultiJoin,
  PUseJoin,
  RUseJoin,
  SingleJoin,
} from "@/types.js";
import { logger } from "@/utils/log.js";
import { useJoinParamsContext } from "@/context.js";

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
): RUseJoin<T, MultiJoin>;
export function useJoin<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin>,
): RUseJoin<T, SingleJoin>;
export function useJoin<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin> | PUseJoin<T, MultiJoin>,
): RUseJoin<T, SingleJoin | MultiJoin> {
  // Technically this violates the Rules of React because between renders,
  // if the join is a SingleJoin, then a MultiJoin or vice-versa, React will throw an error.
  // But why would you do that??
  if (joinIsArray(options)) {
    return useJoinMulti(options);
  }
  const globalParams = useJoinParamsContext();

  const CrComLib: CrComLibInterface = useMemo(
    () =>
      globalParams?.forceMock ||
      (!RealCrComLib.isCrestronTouchscreen() && !RealCrComLib.isIosDevice())
        ? MockCrComLib
        : (RealCrComLib as CrComLibInterface),
    [globalParams?.forceMock],
  );

  const [join, initialValue] = useMemo(
    () => getJoin(options, CrComLib.getState),
    [options],
  );

  const [state, setState] = useState<SignalMap[T]>(initialValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    registerJoin(options.type, join, options, () => state, pubState);

    const id = CrComLib.subscribeState(
      options.type,
      join,
      function cb(value: SignalMap[T]) {
        logger(
          { options, join, direction: "recieved", value },
          globalParams?.logger,
        );
        setState(value);
      },
    );

    return () => {
      unregisterJoin(options.type, join);
      CrComLib.unsubscribeState(options.type, join, id);
    };
  }, []);

  const pubState = useMemo(() => {
    let pub: React.Dispatch<React.SetStateAction<SignalMap[T]>> = (v) => {
      const nextValue = typeof v === "function" ? v(state) : v;

      logger(
        { options, join, value: nextValue, direction: "sent" },
        globalParams?.logger,
      );
      CrComLib.publishEvent(options.type, join, nextValue);
    };

    if (options?.effects?.resetAfterMs) {
      const realPublish = pub;
      pub = pubWithTimeoutSingle(options, realPublish);
    }

    if (options?.effects?.debounce) {
      const realPublish = pub;
      pub = pubDebounceSingle(options, realPublish, timeoutRef);
    }

    return pub;
  }, [options, state, CrComLib, globalParams?.logger]);

  return [state, pubState];
}

function getJoin<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin>,
  getState: CrComLibInterface["getState"],
): [string, SignalMap[T]] {
  if (typeof options.join === "string") {
    const val = getState(options.type, options.join);
    return [options.join, val];
  }

  let offset = 0;

  if (typeof options.offset === "number") {
    offset = options.offset;
  }
  if (typeof options.offset === "object") {
    offset = options.offset[options.type] ?? 0;
  }

  const joinWithOffset = options.join + offset;

  const val = getState(options.type, joinWithOffset.toString());
  return [joinWithOffset.toString(), val];
}
