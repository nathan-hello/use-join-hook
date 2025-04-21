import {
  MultiJoin,
  PUseJoin,
  RUseJoin,
  RUseJoinMulti,
  SignalMap,
  SingleJoin,
} from "@/hook.js";
import { useRef } from "react";

type SingleEffect<T extends keyof SignalMap> = RUseJoin<T>[1];
type ArrayEffect<T extends keyof SignalMap> = RUseJoinMulti<T>[1];

export function useDebounce<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin>,
  pubState: SingleEffect<T>,
): SingleEffect<T> {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!options?.effects?.debounce) return pubState;

  return (v: SignalMap[T]) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      pubState(v);
    }, options?.effects?.debounce);
  };
}

export function useDebounceMulti<T extends keyof SignalMap>(
  options: PUseJoin<T, MultiJoin>,
  pubState: ArrayEffect<T>,
): ArrayEffect<T> {
  const length =
    "start" in options.join
      ? options.join.end - options.join.start + 1
      : options.join.length;

  const timeoutRefs = useRef<(ReturnType<typeof setTimeout> | null)[]>(
    new Array(length).fill(null),
  );

  if (!options?.effects?.debounce) return pubState;

  return (v: SignalMap[T][] | { index: number; value: SignalMap[T] }) => {
    if (Array.isArray(v)) {
      v.forEach((value, idx) => {
        if (timeoutRefs.current[idx]) {
          clearTimeout(timeoutRefs.current[idx]!);
        }
        timeoutRefs.current[idx] = setTimeout(() => {
          pubState([...v]);
        }, options?.effects?.debounce);
      });
    } else {
      if (timeoutRefs.current[v.index]) {
        clearTimeout(timeoutRefs.current[v.index]!);
      }
      timeoutRefs.current[v.index] = setTimeout(() => {
        pubState(v);
      }, options?.effects?.debounce);
    }
  };
}

export function pubWithTimeout<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin>,
  pubState: SingleEffect<T>,
): SingleEffect<T> {
  if (!options?.effects?.resetAfterMs) return pubState;

  return (v: SignalMap[T]) => {
    pubState(v);
    setTimeout(
      () => pubState({ boolean: false, number: 0, string: "" }[options.type]),
      options.effects?.resetAfterMs,
    );
  };
}

export function pubWithTimeoutMulti<T extends keyof SignalMap>(
  options: PUseJoin<T, MultiJoin>,
  pubState: ArrayEffect<T>,
): ArrayEffect<T> {
  if (!options?.effects?.resetAfterMs) return pubState;

  return (v: SignalMap[T][] | { index: number; value: SignalMap[T] }) => {
    if (Array.isArray(v)) {
      pubState(v);
      setTimeout(() => {
        const resetValues = new Array(v.length).fill(
          { boolean: false, number: 0, string: "" }[options.type],
        );
        pubState(resetValues);
      }, options.effects?.resetAfterMs);
    } else {
      pubState(v);
      setTimeout(() => {
        const reset = { boolean: false, number: 0, string: "" }[options.type];
        pubState({ index: v.index, value: reset });
      }, options.effects?.resetAfterMs);
    }
  };
}
