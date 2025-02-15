import { createContext, useContext } from "react";
import { type TMock } from "./mock.js";

export const MocksContext = createContext<TMock<any, any>[]>([]);

export function MocksProvider({
  mocks,
  children,
}: { mocks: TMock<any, any>[]; children: React.ReactNode; }) {
  return (
    <MocksContext.Provider value={mocks}>{children}</MocksContext.Provider>
  );
};

export const useMocks = () => useContext(MocksContext);

