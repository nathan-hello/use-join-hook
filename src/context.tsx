import { createContext, useContext } from "react";
import type { JoinMap, LogFunction, MockLogicWave, SignalMap } from "@/types.js";
import { ExtractJoinsFromJoinMapOfType } from "@/mock/types.js";

export type TGlobalParams<J extends JoinMap = any> = {
  logicWaves?: {
    [T in keyof SignalMap]?: {
      [key in ExtractJoinsFromJoinMapOfType<J, T>]: {
        logicWave?: MockLogicWave<T>;
        initialValue?: SignalMap[T];
      };
    };
  };

  /**
   * If true, console.log a default message for every message sent/recieved.
   * If a function, you will be able to implement your own logging function.
   *  - The return goes into a console.log().
   *  - You can return nothing if you want to handle logging yourself.
   */
  logger?: boolean | LogFunction<any, any>;
  /**
   * Coming soon. 
   */
  flags?: {
    /**
     * Future use. Basically the problem is the in mocking, sending a
     * pubState on a MultiJoin will make every join in it call its logicWave function
     * even if that specific join wasn't the one that was updated.
     */
    disallowPublishingDuplicateValues: boolean;
    EXPERIMENTAL_CrComLibMini: boolean;
  };
};

export const JoinParamsContext = createContext<TGlobalParams<any> | null>(
  null,
);

JoinParamsContext.displayName = "JoinParamsContext";

export const useJoinParamsContext = () => useContext(JoinParamsContext);

export function JoinParamsProvider<J extends JoinMap>({ params, children }: { params: TGlobalParams<J>; children: React.ReactNode; }) {
  return (
    <JoinParamsContext.Provider value={params}>
      {children}
    </JoinParamsContext.Provider>
  );
}


