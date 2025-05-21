import { useState, useEffect } from "react";
import { CrComLibInterface, MockCrComLib } from "@/mock/mock.js";
import { CrComLib as RealCrComLib } from "@pepperdash/ch5-crcomlib-lite";
import { useJoinMulti } from "@/hook/use-join-multi.js";
import { useMocks } from "@/context.js";
import { useDebounce, pubWithTimeout } from "@/hook/effects.js";
import { registerJoin, unregisterJoin } from "@/utils/debug.js";
import { leftPad, rightPad } from "@/utils/util.js";
import type {
  SignalMap,
  LogOptions,
  MultiJoin,
  PUseJoin,
  RUseJoin,
  RUseJoinMulti,
  SingleJoin,
} from "@/types.js";

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
    registerJoin(options.type, join, options, () => state);
    const id = CrComLib.subscribeState(
      options.type,
      join,
      function cb(value: SignalMap[T]) {
        triggerLog({ options, join, direction: "recieved", value });
        setState(value);
      },
    );
    return () => {
      unregisterJoin(options.type, join);
      CrComLib.unsubscribeState(options.type, join, id);
    };
  }, []);

  let pubState: React.Dispatch<React.SetStateAction<SignalMap[T]>> = (v) => {
    const nextValue = typeof v === "function" ? v(state) : v;

    CrComLib.publishEvent(options.type, join, nextValue);
    triggerLog({ options, join, value: nextValue, direction: "sent" });
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

  const t = rightPad(options.type, "boolean".length, " ");
  const j = leftPad(join, 3, "0");
  const d = leftPad(direction, "received".length, " ");
  const v = rightPad(value.toString(), "false".length, " ");

  console.log(`${t}:${j} ${d} value: ${v} ${options.key}`);
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
