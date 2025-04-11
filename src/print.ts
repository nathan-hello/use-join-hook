import { JoinMap, PUseJoin, SignalMap } from "@/hook.js";

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

export function JoinMapToStringByType(J: JoinMap): string {
  const groups: Record<keyof SignalMap, PUseJoin<keyof SignalMap, any>[]> = {
    boolean: [],
    number: [],
    string: [],
  };

  function collectEntries(obj: JoinMap, path: string[] = []) {
    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = [...path, key];

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if ("type" in item) {
            // @ts-expect-error
            groups[item.type].push({
              ...item,
              key: currentPath.join("."),
            });
          }
        });
      } else if (value && typeof value === "object") {
        if ("type" in value) {
          // @ts-expect-error
          groups[value.type].push({
            ...value,
            key: currentPath.join("."),
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
