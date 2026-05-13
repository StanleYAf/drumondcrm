import { Fragment, useState } from "react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, FilePlus, BarChart3, PhoneCall, Settings, FileBarChart, Sun, Moon, Package, LogOut, Kanban, PanelLeftClose, PanelLeft, Wrench, Building2 } from "lucide-react";
import { useTheme } from "@/lib/themeContext";
import { useAuth } from "@/lib/authContext";

const allNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, group: "dash" },
  { title: "Lançamentos", url: "/lancamentos", icon: FilePlus, group: "dash" },
  { title: "Indicadores", url: "/indicadores", icon: BarChart3, group: "dash" },
  { title: "Vendas", url: "/vendas", icon: Kanban, group: "dash" },
  { title: "Pós-venda", url: "/pos-venda", icon: PhoneCall, group: "dash" },
  { title: "Estoque", url: "/estoque", icon: Package, group: "estoque" },
  { title: "Relatórios", url: "/relatorios", icon: FileBarChart, group: "dash" },
  { title: "Manutenção", url: "/manutencao", icon: Wrench, group: "manutencao" },
  { title: "Config", url: "/configuracoes", icon: Settings, group: "always" },
];

const manutencaoSubItems = [
  { title: "Dashboard Geral", url: "/manutencao", icon: LayoutDashboard, adminOnly: false },
  { title: "Clientes", url: "/manutencao/clientes", icon: Building2, adminOnly: true },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { mode, toggleMode } = useTheme();
  const { signOut, user, hasCargo } = useAuth();
  const isDark = mode === "dark";
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = hasCargo("admin");
  const inManutencao = location.pathname.startsWith("/manutencao");
  const visibleManutencaoSubItems = manutencaoSubItems.filter((item) => !item.adminOnly || isAdmin);
  const showManutencaoSubmenu = isAdmin && inManutencao && !collapsed && visibleManutencaoSubItems.length > 0;

  const navItems = allNavItems.filter(item => {
    if (item.group === "always") return true;
    if (isAdmin) return true;
    if (hasCargo("dash") && item.group === "dash") return true;
    if ((hasCargo("estoque") || hasCargo("Controlador")) && item.group === "estoque") return true;
    if (hasCargo("manutencao") && item.group === "manutencao") return true;
    return false;
  });

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-40 border-r border-border bg-sidebar transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'}`}
        style={{ backdropFilter: 'blur(20px)' }}>
        <div className={`p-4 pb-3 flex items-center ${collapsed ? 'flex-col gap-2 px-2' : 'justify-between'}`}>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-semibold text-foreground tracking-tight">Painel Comercial</h1>
              <p className="text-xs mt-0.5 text-muted-foreground">Equipamentos Médicos</p>
            </div>
          )}
          <div className={`flex items-center ${collapsed ? 'flex-col gap-2' : 'gap-2'}`}>
            {/* Dark/Light toggle - pill style */}
            <button onClick={toggleMode}
              className="relative w-10 h-[22px] rounded-full transition-colors duration-300"
              style={{ background: isDark ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--muted))' }}
              title={isDark ? "Modo claro" : "Modo escuro"}>
              <span className="absolute top-[2px] transition-all duration-300 flex items-center justify-center w-[18px] h-[18px] rounded-full bg-white shadow-sm"
                style={{ left: isDark ? '20px' : '2px' }}>
                {isDark ? <Sun className="h-3 w-3 text-amber-500" /> : <Moon className="h-3 w-3 text-slate-500" />}
              </span>
            </button>
            {/* Sidebar collapse toggle - pill style */}
            <button onClick={() => setCollapsed(!collapsed)}
              className="relative w-10 h-[22px] rounded-full transition-colors duration-300"
              style={{ background: collapsed ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--muted))' }}
              title={collapsed ? "Expandir sidebar" : "Recolher sidebar"}>
              <span className="absolute top-[2px] transition-all duration-300 flex items-center justify-center w-[18px] h-[18px] rounded-full bg-white shadow-sm"
                style={{ left: collapsed ? '20px' : '2px' }}>
                {collapsed ? <PanelLeft className="h-3 w-3 text-primary" /> : <PanelLeftClose className="h-3 w-3 text-slate-500" />}
              </span>
            </button>
          </div>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.url === '/' ? location.pathname === '/' : location.pathname.startsWith(item.url);
            return (
              <Fragment key={item.url}>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${collapsed ? 'justify-center' : ''} ${
                    isActive ? 'text-foreground font-medium bg-secondary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                  activeClassName="bg-secondary text-foreground font-medium"
                  title={collapsed ? item.title : undefined}
                >
                  <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
                {item.url === "/manutencao" && showManutencaoSubmenu && (
                  <div className="ml-5 mt-1 space-y-0.5 border-l border-border/70 pl-3">
                    {visibleManutencaoSubItems.map((subItem) => {
                      const isSubActive = location.pathname === subItem.url;
                      return (
                        <NavLink
                          key={subItem.url}
                          to={subItem.url}
                          end
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all ${
                            isSubActive ? 'bg-secondary text-foreground font-medium' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                          }`}
                          activeClassName="bg-secondary text-foreground font-medium"
                        >
                          <subItem.icon className={`h-4 w-4 flex-shrink-0 ${isSubActive ? 'text-primary' : ''}`} />
                          <span>{subItem.title}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </Fragment>
            );
          })}
        </nav>
        {/* Logout */}
        <div className="p-3 border-t border-border">
          {!collapsed && user && (
            <p className="text-[11px] text-muted-foreground truncate mb-2 px-3">{user.email}</p>
          )}
          <button onClick={signOut}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-all ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? "Sair" : undefined}>
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`flex-1 pb-24 md:pb-6 transition-all duration-200 ${collapsed ? 'md:ml-16' : 'md:ml-60'}`}>
        <div className="max-w-4xl mx-auto px-4 py-5 md:px-6 md:py-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 glass-nav safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-1.5">
          {navItems.map((item) => {
            const isActive = item.url === '/' ? location.pathname === '/' : location.pathname.startsWith(item.url);
            return (
              <NavLink
                key={item.url}
                to={item.url}
                end={item.url === "/"}
                className="flex flex-col items-center gap-0.5 py-1 px-2 min-w-[3.5rem]"
                activeClassName=""
              >
                <item.icon
                  className={`h-5 w-5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                />
                <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {item.title}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
