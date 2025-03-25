import { MultiJoin, isMultiJoin } from "@/multi.js";
import { PUseJoin, SignalMap } from "@/hook.js";
import { useRef } from "react";

type SingleEffect<T extends keyof SignalMap> = (value: SignalMap[T]) => void;
type ArrayEffect<T extends keyof SignalMap> = (value: SignalMap[T][]) => void;

export function useDebounce<T extends keyof SignalMap>(
  options: PUseJoin<T>,
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

  return (values: SignalMap[T][]) => {
    values.forEach((value, idx) => {
      if (timeoutRefs.current[idx]) {
        clearTimeout(timeoutRefs.current[idx]!);
      }
      timeoutRefs.current[idx] = setTimeout(() => {
        const newValues = [...values];
        pubState(newValues);
      }, options?.effects?.debounce);
    });
  };
}

export function pubWithTimeout<T extends keyof SignalMap>(
  options: PUseJoin<T>,
  pubState: SingleEffect<T>,
): SingleEffect<T> {
  if (!options?.effects?.resetAfterMs) return pubState;

  return (v: SignalMap[T]) => {
    pubState(v);
    setTimeout(
      () => pubState({ boolean: false, number: 0, string: "" }[options.type]),
      options?.effects?.resetAfterMs,
    );
  };
}

export function pubWithTimeoutMulti<T extends keyof SignalMap>(
  options: PUseJoin<T, MultiJoin>,
  pubState: ArrayEffect<T>,
): ArrayEffect<T> {
  if (!options?.effects?.resetAfterMs) return pubState;

  return (values: SignalMap[T][]) => {
    pubState(values);
    setTimeout(() => {
      const resetValues = new Array(values.length).fill(
        { boolean: false, number: 0, string: "" }[options.type],
      );
      pubState(resetValues);
    }, options?.effects?.resetAfterMs);
  };
}
