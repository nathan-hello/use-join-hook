import type { PUseJoin, SignalMap } from "@/hook.js";

// Internal registry to track active joins and their state
type JoinKey = string; // e.g. "string:2"
type RegistryEntry = {
  options: PUseJoin<any, any>;
  getState: () => any;
};

const joinRegistry = new Map<JoinKey, RegistryEntry>();

export function registerJoin<T extends keyof SignalMap>(
  type: T,
  join: string | number,
  options: PUseJoin<T, any>,
  getState: () => SignalMap[T],
) {
  const key = `${type}:${join}`;
  joinRegistry.set(key, { options, getState });
}

export function unregisterJoin<T extends keyof SignalMap>(
  type: T,
  join: string | number,
) {
  const key = `${type}:${join}`;
  joinRegistry.delete(key);
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
}
