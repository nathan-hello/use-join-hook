import { createContext, useContext } from "react";
import type { JoinMap, LogFunction, MockLogicWave, MultiJoin, PUseJoin, SignalMap, SingleJoin } from "@/types.js";
import { ExtractJoinsFromJoinMapOfType } from "@/mock/types.js";
import { CrComLib } from "@pepperdash/ch5-crcomlib-lite";
import { MockCrComLib } from "@/mock/store.js";

export type JoinParams<J extends JoinMap = any> = {
  MockControlSystem?: {
    /**
     * Give your JoinMap so the mock control system can keep state between React renders.
     * This is only necessary if you are actually using the Mock Control System and logicWaves.
     */
    JoinMap: J,
    /**
     * A fully featured mock control system.
     * 
     * Compose a series of transformations or mutations that should happen on every publish.
     *
     * For example, if you wanted to invert the incoming boolean on join 1 like a NOT gate in a SIMPL program,
     * you would give the following:
     * ```ts
     * logicWaves: {
     *  boolean: {
     *    "1": {
     *      logicWave: (value, getJoin, publishJoin) {
     *        return !value
     *      }
     *    }
     *  }
     * }
     * ``` 
     * 
     * Each logicWave function is given three parameters:
     *   - The value that was originally published
     *   - A function for getting the current state of a another join 
     *   - A function for publishing a new state to another join 
     */
    logicWaves: {
      [T in keyof SignalMap]?: {
        [key in ExtractJoinsFromJoinMapOfType<J, T>]?: {
          logicWave?: MockLogicWave<T>;
          initialValue?: SignalMap[T];
        };
      };
    };
  };

  /**
   * `true | undefined` uses default logger for every send and recieve over the join number
   * `false` disables logging entirely, except for joins that have specifically set `log: true`
   * 
   * If a function, you will be able to implement your own logging function.
   *  - The return goes into a console.log().
   *  - You can return nothing if you want to handle logging yourself.
   *  - The function is given the following object: 
   * ```ts
   *  {
   *    // original options object of the join
   *    options: PUseJoin; 
   *    // rendered join string for the specific join. only different if options.join is a MultiJoin
   *    join: string;      
   *    // We log on both `send`s to the Control Processor and `recieve`s from the Control Processor
   *    direction: "sent" | "recieved";
   *    // The value sent or recieved. 
   *    value: boolean | number | string;
   *    // If MultiJoin, then the index of the join array. For example, if options.join is `[12, 14]`,
   *    // and the sent/recieved value was over join 14, then index will be `1`.
   *    index?: number;    
   *  }
   * ```
   */
  logger?: boolean | LogFunction;
  flags?: {
    /**
     * Coming soon. 
     */
    EXPERIMENTAL_CrComLibMini: boolean;
  };
};

export const JoinParamsContext = createContext<JoinParams<any> | null>(
  null,
);

JoinParamsContext.displayName = "JoinParamsContext";

export const useJoinParamsContext = () => useContext(JoinParamsContext);

export function JoinParamsProvider<J extends JoinMap>({ params, children }: { params: JoinParams<J>; children: React.ReactNode; }) {
  if (!(CrComLib.isCrestronTouchscreen() || CrComLib.isIosDevice()) && params.MockControlSystem) {

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