import type {
  MultiJoin,
  Publisher,
  PUseJoin,
  SignalMap,
  SingleJoin,
} from "@/types.js";

// The SingleJoin and MultiJoin effects are largely the same.
// But the typescript shenanigans to allow for both to exist as one function is a little insane.

export function pubDebounceSingle<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin>,
  pubState: Publisher<T, SingleJoin>,
  timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
): typeof pubState {
  return (v) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      pubState(v);
    }, options?.effects?.debounce);
  };
}

export function pubDebounceMulti<T extends keyof SignalMap>(
  options: PUseJoin<T, MultiJoin>,
  pubState: Publisher<T, MultiJoin>,
  timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
): Publisher<T, MultiJoin> {
  return (v) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      pubState(v);
    }, options?.effects?.debounce);
  };
}

export function pubWithTimeoutSingle<T extends keyof SignalMap>(
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
    const len = getJoinArrayLength(options.join);
    pubState(v);
    setTimeout(() => {
      const resetValues = new Array(len).fill(
        { boolean: false, number: 0, string: "" }[options.type],
      );
      pubState(resetValues);
    }, options.effects?.resetAfterMs);
  };
}

function getJoinArrayLength<T extends keyof SignalMap>(
  join: PUseJoin<T, MultiJoin>["join"],
): number {
  if ("start" in join) {
    return join.end - join.start + 1;
  } else {
    return join.length;
  }
}
