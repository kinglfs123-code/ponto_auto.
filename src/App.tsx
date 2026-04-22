import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EmpresaProvider } from "@/contexts/EmpresaContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ConfirmProvider } from "@/hooks/use-confirm";
import AuthGuard from "@/components/AuthGuard";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Empresas from "@/pages/Empresas";
import Ponto from "@/pages/Ponto";
import FolhaDetalhe from "@/pages/FolhaDetalhe";
import Relatorios from "@/pages/Relatorios";
import Funcionarios from "@/pages/Funcionarios";
import FuncionarioDetalhe from "@/pages/FuncionarioDetalhe";

import Holerites from "@/pages/Holerites";
import Unsubscribe from "@/pages/Unsubscribe";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <EmpresaProvider>
            <ConfirmProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<AuthGuard><Dashboard /></AuthGuard>} />
                <Route path="/empresas" element={<AuthGuard><Empresas /></AuthGuard>} />
                <Route path="/ponto" element={<AuthGuard><Ponto /></AuthGuard>} />
                <Route path="/ponto/:folhaId" element={<AuthGuard><FolhaDetalhe /></AuthGuard>} />
                <Route path="/funcionarios" element={<AuthGuard><Funcionarios /></AuthGuard>} />
                <Route path="/funcionarios/:id" element={<AuthGuard><FuncionarioDetalhe /></AuthGuard>} />

                <Route path="/relatorios" element={<AuthGuard><Relatorios /></AuthGuard>} />
                <Route path="/holerites" element={<AuthGuard><Holerites /></AuthGuard>} />
                <Route path="/unsubscribe" element={<Unsubscribe />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ConfirmProvider>
          </EmpresaProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
