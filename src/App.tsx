import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <DataProvider>
                        <Layout>
                          <ErrorBoundary fallbackTitle="Erro ao carregar a página">
                            <Routes>
                              <Route path="/" element={<RoleGuard allowed={["dash", "admin"]}><Index /></RoleGuard>} />
                              <Route path="/lancamentos" element={<RoleGuard allowed={["dash", "admin"]}><Lancamentos /></RoleGuard>} />
                              <Route path="/indicadores" element={<RoleGuard allowed={["dash", "admin"]}><Indicadores /></RoleGuard>} />
                              <Route path="/pos-venda" element={<RoleGuard allowed={["dash", "admin"]}><PosVenda /></RoleGuard>} />
                              <Route path="/configuracoes" element={<Configuracoes />} />
                              <Route path="/relatorios" element={<RoleGuard allowed={["dash", "admin"]}><Relatorios /></RoleGuard>} />
                              <Route path="/estoque" element={<RoleGuard allowed={["estoque", "admin"]}><Estoque /></RoleGuard>} />
                              <Route path="/fornecedores" element={<RoleGuard allowed={["estoque", "admin"]}><Fornecedores /></RoleGuard>} />
                              <Route path="/vendas" element={<RoleGuard allowed={["dash", "admin"]}><Vendas /></RoleGuard>} />
                              <Route path="/manutencao" element={<RoleGuard allowed={["manutencao", "admin"]}><ManutencaoGeral /></RoleGuard>} />
                              <Route path="/manutencao/upload" element={<RoleGuard allowed={["manutencao", "admin"]}><ManutencaoUpload /></RoleGuard>} />
                              <Route path="/manutencao/clientes" element={<RoleGuard allowed={["admin"]}><ManutencaoClientes /></RoleGuard>} />
                              <Route path="/manutencao/os" element={<RoleGuard allowed={["manutencao", "admin"]}><ManutencaoOS /></RoleGuard>} />
                              <Route path="/manutencao/boletim" element={<RoleGuard allowed={["manutencao", "admin"]}><ManutencaoBoletim /></RoleGuard>} />
                              <Route path="/manutencao/sync-logs" element={<RoleGuard allowed={["admin"]}><SyncLogs /></RoleGuard>} />
                              <Route path="/manutencao/cliente/:clienteId" element={<RoleGuard allowed={["manutencao", "admin"]}><Manutencao /></RoleGuard>} />
                              <Route path="/financeiro" element={<RoleGuard allowed={["admin"]}><Financeiro /></RoleGuard>} />
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
);

export default App;
