import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AuthGuard from "@/components/AuthGuard";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Empresas from "@/pages/Empresas";
import Ponto from "@/pages/Ponto";
import FolhaDetalhe from "@/pages/FolhaDetalhe";
import Relatorios from "@/pages/Relatorios";
import Funcionarios from "@/pages/Funcionarios";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AuthGuard><Dashboard /></AuthGuard>} />
          <Route path="/empresas" element={<AuthGuard><Empresas /></AuthGuard>} />
          <Route path="/ponto" element={<AuthGuard><Ponto /></AuthGuard>} />
          <Route path="/ponto/:folhaId" element={<AuthGuard><FolhaDetalhe /></AuthGuard>} />
          <Route path="/funcionarios" element={<AuthGuard><Funcionarios /></AuthGuard>} />
          <Route path="/relatorios" element={<AuthGuard><Relatorios /></AuthGuard>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
