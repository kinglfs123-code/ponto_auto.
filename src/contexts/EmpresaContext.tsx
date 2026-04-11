import { createContext, useContext, useState, type ReactNode } from "react";
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
  return (
    <EmpresaContext.Provider value={{ empresa, setEmpresa }}>
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  return useContext(EmpresaContext);
}
