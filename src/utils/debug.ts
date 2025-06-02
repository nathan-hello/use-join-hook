import type { PUseJoin, SignalMap } from "@/types.js";

// Internal registry to track active joins and their state
type JoinKey = string; // e.g. "string:2"
type RegistryEntry<T extends keyof SignalMap> = {
  options: PUseJoin;
  getState: () => any;
  setState: (v: SignalMap[T]) => void;
};

const joinRegistry = new Map<JoinKey, RegistryEntry<any>>();

export function registerJoin<T extends keyof SignalMap>(
  type: T,
  join: string | number,
  options: PUseJoin<T, any>,
  getState: () => SignalMap[T],
  setState: (v: SignalMap[T]) => void,
) {
  const key = `${type}:${join}`;
  joinRegistry.set(key, { options, getState, setState });
}

export function unregisterJoin<T extends keyof SignalMap>(
  type: T,
  join: string | number,
) {
  const key = `${type}:${join}`;
  joinRegistry.delete(key);
}

function setJoinDebug<T extends keyof SignalMap>(
  type: T,
  join: string | number,
  value: SignalMap[T],
) {
  const key = `${type}:${join}`;
  const entry = joinRegistry.get(key);
  if (!entry) {
    console.error(`No join registered for type "${type}" and join "${join}".`);
    return;
  }
  entry.setState(value);
  return { options: entry.options, value: entry.getState() };
}

/**
 * Call this in the browser console: getJoin(type, join)
 * Example: getJoin("string", 2)
 */
function getJoinDebug(type: keyof SignalMap, join: string | number) {
  const key = `${type}:${join}`;
  const entry = joinRegistry.get(key);
  if (!entry) {
    console.error(`No join registered for type "${type}" and join "${join}".`);
    return;
  }
  console.log("PUseJoin:", entry.options);
  console.log("Current state value:", entry.getState());
  return { options: entry.options, value: entry.getState() };
}

// Expose to window for debugging
if (typeof window !== "undefined") {
  (window as any).getJoin = getJoinDebug;
  (window as any).setJoin = setJoinDebug;
}
