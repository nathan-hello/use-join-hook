import { createContext, useContext, useMemo } from "react";
import type { JoinMap, JoinParams, PUseJoin, SignalMap } from "@/types.js";
import { CrComLib } from "@pepperdash/ch5-crcomlib-lite";
import { createMockCrComLib, _MockCrComLib } from "@/mock/store.js";
import { JoinMapKeysToStringUnion } from "@/mock/types.js";

type JoinParamsContextValue = {
  logger?: boolean | ((args: any) => string | void);
  flags?: {
    EXPERIMENTAL_CrComLibMini?: boolean;
  };
  MockControlSystem?: {
    JoinMap: JoinMap;
    logicWaves: any;
  };
  MockCrComLib?: _MockCrComLib<any>;
};

export const JoinParamsContext = createContext<JoinParamsContextValue | null>(
  null,
);

JoinParamsContext.displayName = "JoinParamsContext";

export const useJoinParamsContext = () => useContext(JoinParamsContext);

export function JoinParamsProvider<J extends JoinMap>({ params, children }: { params: JoinParams<J>; children: React.ReactNode; }) {
  const mockCrComLib = useMemo(() => {
    if (!(CrComLib.isCrestronTouchscreen() || CrComLib.isIosDevice()) && params.MockControlSystem) {
      const instance = createMockCrComLib(params.MockControlSystem.JoinMap);

      // Register all joins from the JoinMap
      function registerJoins(obj: unknown, prefix: string = '') {
        if (!obj || typeof obj !== 'object') return;

        if (Array.isArray(obj)) {
          obj.forEach((item, index) => {
            if (item && typeof item === 'object' && 'type' in item && 'join' in item) {
              const join = item;
              const key = prefix ? `${prefix}.${index}` : `${index}`;
              instance.registerMock(
                join.type,
                key as JoinMapKeysToStringUnion<J, typeof join.type>,
                (params.MockControlSystem?.logicWaves as any)?.[join.type]?.[key]?.logicWave,
                (params.MockControlSystem?.logicWaves as any)?.[join.type]?.[key]?.initialValue
              );
            }
          });
        } else {
          Object.entries(obj).forEach(([key, value]) => {
            if (value && typeof value === 'object' && 'type' in value && 'join' in value) {
              const join = value as PUseJoin;
              const fullKey = prefix ? `${prefix}.${key}` : key;
              instance.registerMock(
                join.type,
                fullKey as JoinMapKeysToStringUnion<J, typeof join.type>,
                (params.MockControlSystem?.logicWaves as any)?.[join.type]?.[fullKey]?.logicWave,
                (params.MockControlSystem?.logicWaves as any)?.[join.type]?.[fullKey]?.initialValue
              );
            } else if (value && typeof value === 'object') {
              registerJoins(value, prefix ? `${prefix}.${key}` : key);
            }
          });
        }
      }

      registerJoins(params.MockControlSystem.JoinMap);

      // Replace the global MockCrComLib with our type-safe instance
      (window as any).MockCrComLib = instance;
      return instance;
    }
    return undefined;
  }, [params.MockControlSystem]);

  const contextValue = useMemo(() => ({
    ...params,
    MockCrComLib: mockCrComLib
  }), [params, mockCrComLib]);

  return (
    <JoinParamsContext.Provider value={contextValue}>
      {children}
    </JoinParamsContext.Provider>
  );
}