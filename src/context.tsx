import { createContext, useContext } from "react";
import type { JoinParams, PUseJoin } from "@/types.js";
import { CrComLib } from "@pepperdash/ch5-crcomlib-lite";
import { MockCrComLib } from "@/mock/store.js";

export const JoinParamsContext = createContext<JoinParams | null>(
  null,
);

JoinParamsContext.displayName = "JoinParamsContext";

export const useJoinParamsContext = () => useContext(JoinParamsContext);

export function JoinParamsProvider({ params, children }: { params: JoinParams; children: React.ReactNode; }) {

  if (params.forceDebug || (!CrComLib.isCrestronTouchscreen() && !CrComLib.isIosDevice())) {
    if (params.MockControlSystem) {
      const alls = collectPUseJoins(params.MockControlSystem.JoinMap);
      alls.forEach(a => {
        const joins = getJoin(a);
        joins.forEach(j => {
          MockCrComLib.registerMock(
            a.type,
            j,
            (params.MockControlSystem?.logicWaves as any)?.[a.type]?.[j]?.logicWave,
            (params.MockControlSystem?.logicWaves as any)?.[a.type]?.[j]?.initialValue);
        }
        );
      });
    }
  }
  return (
    <JoinParamsContext.Provider value={params}>
      {children}
    </JoinParamsContext.Provider>
  );
}


function collectPUseJoins(joinMap: unknown): PUseJoin[] {
  const result: PUseJoin[] = [];

  function recurse(node: unknown) {
    if (Array.isArray(node)) {
      node.forEach(recurse);
    } else if (node && typeof node === "object") {
      // Heuristic: looks like a PUseJoin if it has a "type" and "join"
      if (
        "type" in node &&
        "join" in node &&
        (node.type === "boolean" ||
          node.type === "number" ||
          node.type === "string")
      ) {
        result.push(node as PUseJoin);
      } else {
        // Recurse into object properties
        Object.values(node).forEach(recurse);
      }
    }
  }

  recurse(joinMap);
  return result;
}

function getJoin(options: PUseJoin): string[] {

  let arr: string[] = [];

  let offset = 0;

  if (typeof options.offset === "number") {
    offset = options.offset;
  }
  if (typeof options.offset === "object") {
    offset = options.offset?.[options.type] ?? 0;
  }

  if (typeof options.join === "number") {
    return [(options.join + offset).toString()];
  }
  if (typeof options.join === "string") {
    return [options.join.toString()];
  }

  if ("start" in options.join) {
    const len = options.join.end - options.join.start + 1;
    arr = Array.from({ length: len }, (_, i) =>
      // @ts-ignore-next-line
      (options.join.start + i + offset).toString(),
    );
  } else {
    arr = options.join.map((j) => {
      if (typeof j === "string") {
        return j;
      }
      const withOffset = j + offset;
      return withOffset.toString();
    });
  }

  return arr;
}