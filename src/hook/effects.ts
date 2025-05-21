import type {
  MultiJoin,
  Publisher,
  PUseJoin,
  SignalMap,
  SingleJoin,
} from "@/types.js";
import { useRef } from "react";

export function useDebounce<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin>,
  pubState: Publisher<T, SingleJoin>,
): typeof pubState {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!options?.effects?.debounce) return pubState;

  return (v) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      pubState(v);
    }, options?.effects?.debounce);
  };
}

export function useDebounceMulti<T extends keyof SignalMap>(
  options: PUseJoin<T, MultiJoin>,
  pubState: Publisher<T, MultiJoin>,
): Publisher<T, MultiJoin> {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!options?.effects?.debounce) return pubState;

  return (v) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      pubState(v);
    }, options?.effects?.debounce);
  };
}

export function pubWithTimeout<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin>,
  pubState: Publisher<T, SingleJoin>,
): Publisher<T, SingleJoin> {
  if (!options?.effects?.resetAfterMs) return pubState;

  return (v) => {
    pubState(v);
    setTimeout(
      () => pubState({ boolean: false, number: 0, string: "" }[options.type]),
      options.effects?.resetAfterMs,
    );
  };
}

export function pubWithTimeoutMulti<T extends keyof SignalMap>(
  options: PUseJoin<T, MultiJoin>,
  pubState: Publisher<T, MultiJoin>,
): Publisher<T, MultiJoin> {
  if (!options?.effects?.resetAfterMs) return pubState;

  return (v) => {
    pubState(v);
    setTimeout(() => {
      const resetValues = new Array(v.length).fill(
        { boolean: false, number: 0, string: "" }[options.type],
      );
      pubState(resetValues);
    }, options.effects?.resetAfterMs);
  };
}
