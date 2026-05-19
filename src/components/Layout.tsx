import { Fragment, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, BookOpen, BarChart2, ShoppingCart, Headphones, FileText, Settings, Sun, Moon, Package, Boxes, LogOut, PanelLeftClose, PanelLeft, Wrench, Briefcase, Building2, ChevronDown, ClipboardList, DollarSign } from "lucide-react";
import { useTheme } from "@/lib/themeContext";
import { useAuth } from "@/lib/authContext";

type SubItem = { title: string; url: string; icon: any; adminOnly?: boolean };
type Group = {
  key: string;
  title: string;
  icon: any;
  permission: "dash" | "estoque" | "manutencao" | "admin";
  subs: SubItem[];
};

const groups: Group[] = [
  {
    key: "engenharia",
    title: "Engenharia",
    icon: Wrench,
    permission: "manutencao",
    subs: [
      { title: "Dashboard Geral", url: "/manutencao", icon: LayoutDashboard },
      { title: "Clientes", url: "/manutencao/clientes", icon: Building2, adminOnly: true },
      { title: "Ordens de Serviço", url: "/manutencao/os", icon: ClipboardList },
    ],
  },
  {
    key: "comercial",
    title: "Comercial",
    icon: Briefcase,
    permission: "dash",
    subs: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Lançamentos", url: "/lancamentos", icon: BookOpen },
      { title: "Indicadores", url: "/indicadores", icon: BarChart2 },
      { title: "Vendas", url: "/vendas", icon: ShoppingCart },
      { title: "Pós-venda", url: "/pos-venda", icon: Headphones },
      { title: "Relatórios", url: "/relatorios", icon: FileText },
    ],
  },
  {
    key: "estoque",
    title: "Estoque",
    icon: Package,
    permission: "estoque",
    subs: [
      { title: "Estoque", url: "/estoque", icon: Boxes },
      { title: "Relatórios", url: "/estoque/relatorios", icon: FileText },
    ],
  },
  {
    key: "financeiro",
    title: "Financeiro",
    icon: DollarSign,
    permission: "admin",
    subs: [
      { title: "Dashboard", url: "/financeiro", icon: LayoutDashboard },
    ],
  },
];

const comercialRoutes = ["/", "/lancamentos", "/indicadores", "/vendas", "/pos-venda", "/relatorios"];

function isGroupActive(group: Group, pathname: string): boolean {
  if (group.key === "comercial") {
    return comercialRoutes.some(r => r === "/" ? pathname === "/" : pathname.startsWith(r));
  }
  if (group.key === "engenharia") return pathname.startsWith("/manutencao");
  if (group.key === "estoque") return pathname.startsWith("/estoque");
  if (group.key === "financeiro") return pathname.startsWith("/financeiro");
  return false;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { mode, toggleMode } = useTheme();
  const { signOut, user, hasCargo } = useAuth();
  const isDark = mode === "dark";
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = hasCargo("admin");

  const canSee = (g: Group) => {
    if (isAdmin) return true;
    if (g.permission === "admin") return false;
    if (g.permission === "dash") return hasCargo("dash");
    if (g.permission === "estoque") return hasCargo("estoque") || hasCargo("Controlador");
    if (g.permission === "manutencao") return hasCargo("manutencao");
    return false;
  };

  const visibleGroups = groups.filter(canSee);

  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    visibleGroups.forEach(g => { init[g.key] = isGroupActive(g, location.pathname); });
    return init;
  });

  useEffect(() => {
    setOpenMap(prev => {
      const next = { ...prev };
      visibleGroups.forEach(g => {
        if (isGroupActive(g, location.pathname)) next[g.key] = true;
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Mobile flat list for bottom bar
  const mobileItems = visibleGroups.flatMap(g => g.subs.filter(s => !s.adminOnly || isAdmin)).slice(0, 5);

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
            <button onClick={toggleMode}
              className="relative w-10 h-[22px] rounded-full transition-colors duration-300"
              style={{ background: isDark ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--muted))' }}
              title={isDark ? "Modo claro" : "Modo escuro"}>
              <span className="absolute top-[2px] transition-all duration-300 flex items-center justify-center w-[18px] h-[18px] rounded-full bg-white shadow-sm"
                style={{ left: isDark ? '20px' : '2px' }}>
                {isDark ? <Sun className="h-3 w-3 text-amber-500" /> : <Moon className="h-3 w-3 text-slate-500" />}
              </span>
            </button>
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
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {visibleGroups.map((g) => {
            const visibleSubs = g.subs.filter(s => !s.adminOnly || isAdmin);
            const active = isGroupActive(g, location.pathname);
            const isOpen = !!openMap[g.key];
            const showSubs = !collapsed && isOpen;
            return (
              <Fragment key={g.key}>
                <button
                  onClick={() => setOpenMap(m => ({ ...m, [g.key]: !m[g.key] }))}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${collapsed ? 'justify-center' : ''} ${
                    active ? 'text-foreground font-medium bg-secondary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                  title={collapsed ? g.title : undefined}
                >
                  <g.icon className={`h-5 w-5 flex-shrink-0 ${active ? 'text-primary' : ''}`} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{g.title}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>
                {showSubs && (
                  <div className="ml-5 mt-1 mb-1 space-y-0.5 border-l border-border/70 pl-3">
                    {visibleSubs.map((subItem) => {
                      const isSubActive = subItem.url === '/'
                        ? location.pathname === '/'
                        : location.pathname === subItem.url;
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

          {/* Configurações - sempre visível */}
          <NavLink
            to="/configuracoes"
            end
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${collapsed ? 'justify-center' : ''} text-muted-foreground hover:text-foreground hover:bg-secondary/50`}
            activeClassName="bg-secondary text-foreground font-medium"
            title={collapsed ? "Configurações" : undefined}
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Configurações</span>}
          </NavLink>
        </nav>
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
          {mobileItems.map((item) => {
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
