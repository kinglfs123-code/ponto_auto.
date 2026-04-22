import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Empresa } from "@/types";

interface EmpresaContextType {
  empresa: Empresa | null;
  setEmpresa: (empresa: Empresa | null) => void;
}

const EmpresaContext = createContext<EmpresaContextType>({
  empresa: null,
  setEmpresa: () => {},
});

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  // Memoize value so unrelated re-renders don't ripple through every consumer
  const value = useMemo(() => ({ empresa, setEmpresa }), [empresa]);
  return <EmpresaContext.Provider value={value}>{children}</EmpresaContext.Provider>;
}

export function useEmpresa() {
  return useContext(EmpresaContext);
}
