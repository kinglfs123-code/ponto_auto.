import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EmpresaProvider } from "@/contexts/EmpresaContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ConfirmProvider } from "@/hooks/use-confirm";
import AuthGuard from "@/components/AuthGuard";
import Login from "@/pages/Login"; // eager: lock screen must load instantly

// Lazy-loaded routes — each becomes its own chunk
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Empresas = lazy(() => import("@/pages/Empresas"));
const Ponto = lazy(() => import("@/pages/Ponto"));
const FolhaDetalhe = lazy(() => import("@/pages/FolhaDetalhe"));
const Relatorios = lazy(() => import("@/pages/Relatorios"));
const Funcionarios = lazy(() => import("@/pages/Funcionarios"));
const FuncionarioDetalhe = lazy(() => import("@/pages/FuncionarioDetalhe"));
const Holerites = lazy(() => import("@/pages/Holerites"));
const Unsubscribe = lazy(() => import("@/pages/Unsubscribe"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const SelecionarEmpresa = lazy(() => import("@/pages/SelecionarEmpresa"));
const SelecionarModulo = lazy(() => import("@/pages/SelecionarModulo"));
const EmpresasModuloCobrancas = lazy(() => import("@/pages/empresas-modulo/Cobrancas"));
const EmpresasModuloClientes = lazy(() => import("@/pages/empresas-modulo/Clientes"));
const CmvHome = lazy(() => import("@/pages/cmv/Home"));
const CmvTabela = lazy(() => import("@/pages/cmv/Tabela"));
const FinanceiroHome = lazy(() => import("@/pages/financeiro/Home"));
const LancamentoRapido = lazy(() => import("@/pages/financeiro/LancamentoRapido"));
const Contas = lazy(() => import("@/pages/financeiro/Contas"));
const Fornecedores = lazy(() => import("@/pages/financeiro/Fornecedores"));
const Codigos = lazy(() => import("@/pages/financeiro/Codigos"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <EmpresaProvider>
            <ConfirmProvider>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/login" element={<Login />} />

                  {/* Pós-login: escolher empresa, depois módulo */}
                  <Route path="/selecionar-empresa" element={<AuthGuard><SelecionarEmpresa /></AuthGuard>} />
                  <Route path="/selecionar-modulo" element={<AuthGuard><SelecionarModulo /></AuthGuard>} />

                  {/* Módulo RH (rotas existentes mantidas) */}
                  <Route path="/" element={<AuthGuard><Dashboard /></AuthGuard>} />
                  <Route path="/empresas" element={<AuthGuard><Empresas /></AuthGuard>} />
                  <Route path="/ponto" element={<AuthGuard><Ponto /></AuthGuard>} />
                  <Route path="/ponto/:folhaId" element={<AuthGuard><FolhaDetalhe /></AuthGuard>} />
                  <Route path="/funcionarios" element={<AuthGuard><Funcionarios /></AuthGuard>} />
                  <Route path="/funcionarios/:id" element={<AuthGuard><FuncionarioDetalhe /></AuthGuard>} />
                  <Route path="/relatorios" element={<AuthGuard><Relatorios /></AuthGuard>} />
                  <Route path="/holerites" element={<AuthGuard><Holerites /></AuthGuard>} />

                  {/* Módulo Financeiro */}
                  <Route path="/financeiro" element={<AuthGuard><FinanceiroHome /></AuthGuard>} />
                  <Route path="/financeiro/lancamento" element={<AuthGuard><LancamentoRapido /></AuthGuard>} />
                  <Route path="/financeiro/contas" element={<AuthGuard><Contas /></AuthGuard>} />
                  <Route path="/financeiro/fornecedores" element={<AuthGuard><Fornecedores /></AuthGuard>} />
                  <Route path="/financeiro/codigos" element={<AuthGuard><Codigos /></AuthGuard>} />

                  {/* Módulo Empresas (cobranças) */}
                  <Route path="/empresas-modulo" element={<AuthGuard><EmpresasModuloCobrancas /></AuthGuard>} />
                  <Route path="/empresas-modulo/clientes" element={<AuthGuard><EmpresasModuloClientes /></AuthGuard>} />

                  {/* Módulo CMV */}
                  <Route path="/cmv" element={<AuthGuard><CmvHome /></AuthGuard>} />
                  <Route path="/cmv/tabela" element={<AuthGuard><CmvTabela /></AuthGuard>} />

                  <Route path="/unsubscribe" element={<Unsubscribe />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ConfirmProvider>
          </EmpresaProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
