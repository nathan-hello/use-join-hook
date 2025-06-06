import type { JoinMap, PUseJoin, SignalMap } from "@/types.js";

// This file is not accessible over the NPM package.
// It is simply meant to take in your JoinMap and print it out organized, so you can
// better manage your joins in SIMPL. Copy this file and run it locally using npm or bun.
// Import your JoinMap and call `pretty(joinMap)` and in stdout you will get a better
// formatted version of your joinMap, organized by the structure of your JoinMap, by type,
// and sorted by the join number with its offset.

// Collect returns an array of objects that correspond with the placement within the JoinMap
// I.e. `{Audio: { Control: {...usejoin argument}` will give you a key of "Audio.Control".
// You can customize the printing however you'd like with that.

// You're not able to import this and run from the npm package because doing so would mean
// the npm/deno/bun would import the rest of index.ts, and because this is a React hook
// library, the server runtimes will throw.

// Because this is a .ts file, it's easier to run inline with bun
// Example:
// bun print.ts > joins.json

// Put your JoinMap here!
// import {J} from "./joins.ts"
//
// pretty(J);

function pretty(joinMap: JoinMap) {
  const asArr = collect(joinMap);

  const sortedByType = {
    boolean: asArr.filter((v) => v.value.type === "boolean").sort(sort),
    number: asArr.filter((v) => v.value.type === "number").sort(sort),
    string: asArr.filter((v) => v.value.type === "string").sort(sort),
  } as const;

  function formatArray(arr: typeof asArr) {
    return arr
      .map(
        (b) =>
          `    ${JSON.stringify({
            [b.key]: {
              join: getJoin(b.value),
              effects: b.value.effects,
              dir: b.value.dir,
            },
          })
            .replace(/:/g, ": ")
            .replace(/,/g, ", ")}`,
      )
      .join(",\n");
  }

  const jsonString = `{
  "boolean": [
${formatArray(sortedByType.boolean)}
  ],
  "number": [
${formatArray(sortedByType.number)}
  ],
  "string": [
${formatArray(sortedByType.string)}
  ]
}`;

  console.log(jsonString);
}

type BoxedJoin = { key: string; value: PUseJoin };

function collect(joinMap: unknown): BoxedJoin[] {
  const result: BoxedJoin[] = [];

  function recurse(node: unknown, path: string) {
    if (Array.isArray(node)) {
      node.forEach((item, idx) => {
        recurse(item, `${path}[${idx}]`);
      });
    } else if (node && typeof node === "object") {
      // If node is a PUseJoin with join as a range
      if (
        "type" in node &&
        "join" in node &&
        node.type &&
        ["boolean", "number", "string"].includes(node.type as keyof SignalMap)
      ) {
        const join = node.join;
        if (
          join &&
          typeof join === "object" &&
          "start" in join &&
          "end" in join &&
          typeof join.start === "number" &&
          typeof join.end === "number"
        ) {
          // Expand the range
          let idx = 0;
          for (let j = join.start; j <= join.end; j++) {
            // Create a shallow copy with the join number replaced
            const nodeCopy = { ...node, join: j };
            recurse(nodeCopy, `${path}[${idx}]`);
            idx++;
          }
        } else {
          result.push({ key: path, value: node as PUseJoin });
        }
      } else {
        for (const [k, v] of Object.entries(node)) {
          const nextPath = path ? `${path}.${k}` : k;
          recurse(v, nextPath);
        }
      }
    }
  }

  recurse(joinMap, "");
  return result;
}

function getJoin(options: PUseJoin): string {
  let offset = 0;
  if (
    Array.isArray(options.join) ||
    (typeof options.join === "object" && "start" in options.join)
  ) {
    throw Error("Multijoins aren't supposed to be here!");
  }

  if (typeof options.offset === "number") {
    offset = options.offset;
  }
  if (typeof options.offset === "object") {
    offset = options.offset[options.type] ?? 0;
  }

  if (typeof options.join === "number") {
    return (offset + options.join).toString();
  }
  return options.join;
}

function sort(a: BoxedJoin, b: BoxedJoin): number {
  const x = Number(getJoin(a.value));
  const y = Number(getJoin(b.value));
  const xIsNaN = Number.isNaN(x);
  const yIsNaN = Number.isNaN(y);

  if (xIsNaN && yIsNaN) {
    // Both are NaN, don't move them
    return 0;
  }
  if (xIsNaN) {
    // x is NaN, move a to the top
    return -1;
  }
  if (yIsNaN) {
    // y is NaN, move b to the top
    return 1;
  }
  // Both are numbers, sort numerically
  return x - y;
}
