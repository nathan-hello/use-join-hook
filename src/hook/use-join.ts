import { useState, useEffect, useMemo } from "react";
import {
  _MockCrComLib,
  CrComLibInterface,
  MockCrComLib,
} from "@/mock/store.js";
import { CrComLib as RealCrComLib } from "@pepperdash/ch5-crcomlib-lite";
import { useJoinMulti } from "@/hook/use-join-multi.js";
import { useDebounceSingle, pubWithTimeoutSingle } from "@/hook/effects.js";
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
  if (joinIsArray(options)) {
    return useJoinMulti(options);
  }

  const join = useMemo(() => getJoin(options), [options]);

  const [state, setState] = useState<SignalMap[T]>(
    { boolean: false, number: 0, string: "" }[options.type],
  );

  const globalParams = useJoinParamsContext();

  const CrComLib: CrComLibInterface = useMemo(
    () =>
      globalParams?.forceDebug ||
      (!RealCrComLib.isCrestronTouchscreen() && !RealCrComLib.isIosDevice())
        ? MockCrComLib
        : (RealCrComLib as CrComLibInterface),
    [globalParams?.forceDebug],
  );

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

    const realPublish = pub;
    pub = useDebounceSingle(options, realPublish);

    return pub;
  }, [options, state, CrComLib, globalParams?.logger]);

  return [state, pubState];
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
