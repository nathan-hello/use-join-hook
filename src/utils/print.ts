import type {
  JoinMap,
  MultiJoin,
  PUseJoin,
  SignalMap,
  SingleJoin,
} from "@/types.js";

export function JoinMapToString(J: JoinMap, indent = 0): string {
  const spaces = "  ".repeat(indent);

  // Convert object to entries for processing
  const entries = Object.entries(J);

  // Start building the string
  let result = "{\n";

  for (let i = 0; i < entries.length; i++) {
    // @ts-expect-error
    const [key, value] = entries[i];
    const isLast = i === entries.length - 1;

    result += `${spaces}  "${key}": `;

    if (Array.isArray(value)) {
      result += "[\n";
      value.forEach((item, idx) => {
        result += `${spaces}    ${JSON.stringify(item)}${idx < value.length - 1 ? "," : ""}\n`;
      });
      result += `${spaces}  ]${isLast ? "" : ","}\n`;
    }
    // If it has a 'type' property, it's a PUseJoin object
    else if (value && typeof value === "object" && "type" in value) {
      result += `${JSON.stringify(value)}${isLast ? "" : ","}\n`;
    }
    // Otherwise it's a nested object
    else if (value && typeof value === "object") {
      result += `${JoinMapToString(value as JoinMap, indent + 1)}${isLast ? "" : ","}\n`;
    }
  }

  result += `${spaces}}`;
  return result;
}

function JoinMapEntryToString<T extends keyof SignalMap>(
  item: PUseJoin<T, SingleJoin | MultiJoin>,
): Array<PUseJoin<T, string>> {
  const baseOutput: Omit<PUseJoin<T, string>, "join"> = {
    type: item.type,
    ...(item.key && { key: item.key }),
    ...(item.dir && { dir: item.dir }),
    ...(item.effects && { effects: item.effects }),
  };

  // Calculate type-specific offset
  const offset =
    typeof item.offset === "number"
      ? item.offset
      : (item.offset?.[item.type] ?? 0);

  // Handle different join types
  if (typeof item.join === "string") {
    return [{ ...baseOutput, join: item.join }];
  }

  if (typeof item.join === "number") {
    return [{ ...baseOutput, join: (item.join + offset).toString() }];
  }

  if (Array.isArray(item.join)) {
    return item.join.map((j) => ({
      ...baseOutput,
      join: (typeof j === "number" ? j + offset : j).toString(),
    }));
  }

  // Handle MultiJoinObject (range)
  const { start, end } = item.join;
  return Array.from({ length: end - start + 1 }, (_, i) => ({
    ...baseOutput,
    join: (start + i + offset).toString(),
  }));
}

function isPUseJoin(
  value: any,
): value is PUseJoin<keyof SignalMap, SingleJoin | MultiJoin> {
  return (
    value &&
    typeof value === "object" &&
    "type" in value &&
    "join" in value &&
    typeof value.type === "string"
  );
}

export function JoinMapToStringByType(J: JoinMap): string {
  const groups: Record<
    keyof SignalMap,
    Array<Omit<PUseJoin<keyof SignalMap, string>, "type">>
  > = {
    boolean: [],
    number: [],
    string: [],
  };

  function collectEntries(obj: JoinMap, path: string[] = []) {
    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = [...path, key];

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (isPUseJoin(item)) {
            const entries = JoinMapEntryToString(item);
            entries.forEach((entry) => {
              const { type, ...withoutType } = entry;
              groups[entry.type].push({
                ...withoutType,
                key: currentPath.join("."),
              });
            });
          }
        });
      } else if (value && typeof value === "object") {
        if (isPUseJoin(value)) {
          const entries = JoinMapEntryToString(value);
          entries.forEach((entry) => {
            const { type, ...withoutType } = entry;
            groups[entry.type].push({
              ...withoutType,
              key: currentPath.join("."),
            });
          });
        } else {
          collectEntries(value as JoinMap, currentPath);
        }
      }
    });
  }

  collectEntries(J);

  let result = "{\n";

  Object.entries(groups).forEach(([type, entries], typeIndex) => {
    if (entries.length > 0) {
      result += `  "${type}": [\n`;
      entries.forEach((entry, i) => {
        result += `    ${JSON.stringify(entry)}${i < entries.length - 1 ? "," : ""}\n`;
      });
      result += `  ]${typeIndex < 2 ? "," : ""}\n`;
    }
  });

  result += "}";
  return result;
}
