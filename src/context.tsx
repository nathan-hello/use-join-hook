import { createContext, useContext } from "react";
import { type TMock } from "@/mock/mock.js";
import type { SignalMap } from "@/types.js";

export const MocksContext = createContext<TMock<keyof SignalMap, keyof SignalMap>[]>([]);

export function MocksProvider({
  mocks,
  children,
}: { mocks: TMock<keyof SignalMap, keyof SignalMap>[]; children: React.ReactNode; }) {
  return (
    <MocksContext.Provider value={mocks}>{children}</MocksContext.Provider>
  );
};

export const useMocks = () => useContext(MocksContext);

