import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib/authContext";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DataProvider } from "@/lib/dataContext";
import { ThemeProvider } from "@/lib/themeContext";
import { AuthProvider } from "@/lib/authContext";
import { ProtectedRoute, RoleGuard } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { UndoToast } from "@/components/UndoToast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Lancamentos from "./pages/Lancamentos";
import Comissoes from "./pages/Comissoes";
import Indicadores from "./pages/Indicadores";
import PosVenda from "./pages/PosVenda";
import Configuracoes from "./pages/Configuracoes";
import Relatorios from "./pages/Relatorios";
import Estoque from "./pages/Estoque";
import Fornecedores from "./pages/Fornecedores";
import Vendas from "./pages/Vendas";
import Manutencao from "./pages/Manutencao";
import ManutencaoGeral from "./pages/ManutencaoGeral";
import ManutencaoUpload from "./pages/ManutencaoUpload";
import ManutencaoClientes from "./pages/ManutencaoClientes";
import ManutencaoOS from "./pages/ManutencaoOS";
import ManutencaoBoletim from "./pages/ManutencaoBoletim";
import SyncLogs from "./pages/SyncLogs";
import Financeiro from "./pages/Financeiro";
import Demandas from "./pages/Demandas";
import Contratos from "./pages/administrativo/Contratos";
import ControleART from "./pages/administrativo/ControleART";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import PublicoCliente from "./pages/PublicoCliente";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const MODULE_FALLBACKS = [
  { perm: "eng_dashboard", path: "/manutencao" },
  { perm: "com_dashboard", path: "/comercial" },
  { perm: "fin_dashboard", path: "/financeiro" },
  { perm: "est_estoque", path: "/estoque" },
  { perm: "adm_contratos", path: "/administrativo/contratos" },
];

function SmartRedirect() {
  const { canAccess } = useAuth();
  for (const { perm, path } of MODULE_FALLBACKS) {
    if (canAccess(perm)) {
      return <Navigate to={path} replace />;
    }
  }
  return <Index />;
}

const App = () => (
  <div translate="no" className="notranslate" lang="pt-BR">
  <ErrorBoundary fallbackTitle="Erro crítico na aplicação">
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/publico/cliente/:token" element={<PublicoCliente />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <DataProvider>
                        <Layout>
                          <ErrorBoundary fallbackTitle="Erro ao carregar a página">
                            <Routes>
                              <Route path="/" element={<SmartRedirect />} />
                              <Route path="/comercial" element={<RoleGuard perm="com_dashboard"><Index /></RoleGuard>} />
                              <Route path="/lancamentos" element={<RoleGuard perm="com_lancamentos"><Lancamentos /></RoleGuard>} />
                              <Route path="/comissoes" element={<RoleGuard perm="com_comissoes"><Comissoes /></RoleGuard>} />
                              <Route path="/indicadores" element={<RoleGuard perm="com_indicadores"><Indicadores /></RoleGuard>} />
                              <Route path="/pos-venda" element={<RoleGuard perm="com_posvenda"><PosVenda /></RoleGuard>} />
                              <Route path="/configuracoes" element={<Configuracoes />} />
                              <Route path="/relatorios" element={<RoleGuard perm="com_relatorios"><Relatorios /></RoleGuard>} />
                              <Route path="/estoque" element={<RoleGuard perm="est_estoque"><Estoque /></RoleGuard>} />
                              <Route path="/fornecedores" element={<RoleGuard perm="est_estoque"><Fornecedores /></RoleGuard>} />
                              <Route path="/vendas" element={<RoleGuard perm="com_vendas"><Vendas /></RoleGuard>} />
                              <Route path="/manutencao" element={<RoleGuard perm="eng_dashboard"><ManutencaoGeral /></RoleGuard>} />
                              <Route path="/manutencao/upload" element={<RoleGuard perm="eng_dashboard"><ManutencaoUpload /></RoleGuard>} />
                              <Route path="/manutencao/clientes" element={<RoleGuard perm="eng_clientes"><ManutencaoClientes /></RoleGuard>} />
                              <Route path="/manutencao/os" element={<RoleGuard perm="eng_os"><ManutencaoOS /></RoleGuard>} />
                              <Route path="/manutencao/boletim" element={<RoleGuard perm="eng_boletim"><ManutencaoBoletim /></RoleGuard>} />
                              <Route path="/manutencao/sync-logs" element={<RoleGuard perm="eng_synclogs"><SyncLogs /></RoleGuard>} />
                              <Route path="/manutencao/cliente/:clienteId" element={<RoleGuard perm="eng_dashboard"><Manutencao /></RoleGuard>} />
                              <Route path="/financeiro" element={<RoleGuard perm="fin_dashboard"><Financeiro /></RoleGuard>} />
                              <Route path="/administrativo/contratos" element={<RoleGuard perm="adm_contratos"><Contratos /></RoleGuard>} />
                              <Route path="/administrativo/art" element={<RoleGuard perm="adm_art"><ControleART /></RoleGuard>} />
                              <Route path="/demandas/:setor" element={<Demandas />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </ErrorBoundary>
                        </Layout>
                        <UndoToast />
                      </DataProvider>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  </div>
);

export default App;
