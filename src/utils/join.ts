import type { SignalMap, MultiJoin, PUseJoin, SingleJoin } from "@/types.js";

export function joinIsArray<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin> | PUseJoin<T, MultiJoin>,
): options is PUseJoin<T, MultiJoin> {
  return (
    Array.isArray(options.join) ||
    (typeof options.join === "object" && "start" in options.join)
  );
}

export function getJoin<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin>,
): string {
  if (typeof options.join === "string") {
    return options.join;
  }

  let offset = 0;

  if (typeof options.offset === "number") {
    offset = options.offset;
  }
  if (typeof options.offset === "object") {
    offset = options.offset[options.type] ?? 0;
  }

  const joinWithOffset = options.join + offset;

  return joinWithOffset.toString();
}

export function getJoins<T extends keyof SignalMap>(
  options: PUseJoin<T, MultiJoin>,
): string[] {
  const { join } = options;
  let offset = 0;

  if (typeof options.offset === "number") {
    offset = options.offset;
  }
  if (typeof options.offset === "object") {
    offset = options.offset[options.type] ?? 0;
  }

  if (Array.isArray(join)) {
    return join.map((j) => {
      if (typeof j === "string") return j;
      return (j + offset).toString();
    });
  } else {
    const joins: string[] = [];
    for (let i = join.start; i <= join.end; i++) {
      joins.push((i + offset).toString());
    }
    return joins;
  }
}
