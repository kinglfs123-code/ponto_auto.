import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Empresa } from "@/types";

interface EmpresaContextType {
  empresa: Empresa | null;
  setEmpresa: (empresa: Empresa | null) => void;
  hydrating: boolean;
}

const STORAGE_KEY = "empresa_atual_id";

const EmpresaContext = createContext<EmpresaContextType>({
  empresa: null,
  setEmpresa: () => {},
  hydrating: true,
});

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const [empresa, setEmpresaState] = useState<Empresa | null>(null);
  const [hydrating, setHydrating] = useState(true);

  // Hydrate from localStorage on mount (waits for auth user)
  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      const id = localStorage.getItem(STORAGE_KEY);
      if (!id) {
        setHydrating(false);
        return;
      }
      const { data } = await supabase
        .from("empresas")
        .select("id, cnpj, nome, jornada_padrao")
        .eq("id", id)
        .maybeSingle();
      if (!cancelled) {
        if (data) setEmpresaState(data as Empresa);
        else localStorage.removeItem(STORAGE_KEY);
        setHydrating(false);
      }
    };

    // Wait for an auth session before hydrating
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setHydrating(false);
        return;
      }
      hydrate();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) {
        setEmpresaState(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const setEmpresa = (emp: Empresa | null) => {
    setEmpresaState(emp);
    if (emp) localStorage.setItem(STORAGE_KEY, emp.id);
    else localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(() => ({ empresa, setEmpresa, hydrating }), [empresa, hydrating]);
  return <EmpresaContext.Provider value={value}>{children}</EmpresaContext.Provider>;
}

export function useEmpresa() {
  return useContext(EmpresaContext);
}
