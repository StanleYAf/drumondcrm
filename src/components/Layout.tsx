import { Fragment, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, BookOpen, BarChart2, ShoppingCart, Headphones, FileText, Settings, Package, Boxes, LogOut, PanelLeftClose, PanelLeft, Wrench, Briefcase, Building2, ChevronDown, ClipboardList, DollarSign, RefreshCw, KanbanSquare } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import type { PermCode } from "@/lib/permissions";

type SubItem = { title: string; url: string; icon: any; perm?: PermCode | string; adminOnly?: boolean };
type Group = {
  key: string;
  title: string;
  icon: any;
  subs: SubItem[];
};

const groups: Group[] = [
  {
    key: "engenharia",
    title: "Engenharia",
    icon: Wrench,
    subs: [
      { title: "Dash Engenharia", url: "/manutencao", icon: LayoutDashboard, perm: "eng_dashboard" },
      { title: "Clientes", url: "/manutencao/clientes", icon: Building2, perm: "eng_clientes" },
      { title: "Indicadores", url: "/manutencao/os", icon: ClipboardList, perm: "eng_os" },
      { title: "Boletim", url: "/manutencao/boletim", icon: FileText, perm: "eng_boletim" },
      { title: "Demandas", url: "/demandas/engenharia", icon: KanbanSquare, perm: "eng_dashboard" },
      { title: "Logs de Sincronização", url: "/manutencao/sync-logs", icon: RefreshCw, perm: "eng_synclogs" },
    ],
  },
  {
    key: "comercial",
    title: "Comercial",
    icon: Briefcase,
    subs: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard, perm: "com_dashboard" },
      { title: "Lançamentos", url: "/lancamentos", icon: BookOpen, perm: "com_lancamentos" },
      { title: "Indicadores", url: "/indicadores", icon: BarChart2, perm: "com_indicadores" },
      { title: "Vendas", url: "/vendas", icon: ShoppingCart, perm: "com_vendas" },
      { title: "Pós-venda", url: "/pos-venda", icon: Headphones, perm: "com_posvenda" },
      { title: "Relatórios", url: "/relatorios", icon: FileText, perm: "com_relatorios" },
      { title: "Demandas", url: "/demandas/comercial", icon: KanbanSquare, perm: "com_dashboard" },
    ],
  },
  {
    key: "estoque",
    title: "Estoque",
    icon: Package,
    subs: [
      { title: "Estoque", url: "/estoque", icon: Boxes, perm: "est_estoque" },
    ],
  },
  {
    key: "financeiro",
    title: "Financeiro",
    icon: DollarSign,
    subs: [
      { title: "Dashboard", url: "/financeiro", icon: LayoutDashboard, perm: "fin_dashboard" },
      { title: "Demandas", url: "/demandas/financeiro", icon: KanbanSquare, perm: "fin_dashboard" },
    ],
  },
];

const comercialRoutes = ["/", "/lancamentos", "/indicadores", "/vendas", "/pos-venda", "/relatorios"];

function isGroupActive(group: Group, pathname: string): boolean {
  if (group.key === "comercial") {
    if (pathname === "/demandas/comercial") return true;
    return comercialRoutes.some(r => r === "/" ? pathname === "/" : pathname.startsWith(r));
  }
  if (group.key === "engenharia") return pathname.startsWith("/manutencao") || pathname === "/demandas/engenharia";
  if (group.key === "estoque") return pathname.startsWith("/estoque");
  if (group.key === "financeiro") return pathname.startsWith("/financeiro") || pathname === "/demandas/financeiro";
  return false;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { signOut, user, hasCargo, canAccess } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = hasCargo("admin");

  const canSeeSub = (s: SubItem) => {
    if (isAdmin) return true;
    if (s.adminOnly) return false;
    if (!s.perm) return true;
    return canAccess(s.perm);
  };

  const visibleGroups = groups
    .map(g => ({ ...g, subs: g.subs.filter(canSeeSub) }))
    .filter(g => g.subs.length > 0);

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
  const mobileItems = visibleGroups.flatMap(g => g.subs).slice(0, 5);

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-40 border-r border-sidebar-border bg-sidebar transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'}`}>
        <div className={`px-5 pt-5 pb-4 flex items-center ${collapsed ? 'flex-col gap-2 px-2' : 'justify-between'}`}>
          {!collapsed && (
            <div>
              <h1 className="text-base font-bold text-foreground tracking-tight">Painel Comercial</h1>
              <p className="text-xs mt-0.5 text-muted-foreground">Equipamentos Médicos</p>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition"
            title={collapsed ? "Expandir sidebar" : "Recolher sidebar"}>
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {visibleGroups.map((g) => {
            const visibleSubs = g.subs;
            const active = isGroupActive(g, location.pathname);
            const isOpen = !!openMap[g.key];
            const showSubs = !collapsed && isOpen;
            return (
              <Fragment key={g.key}>
                {collapsed ? (
                  <button
                    onClick={() => setOpenMap(m => ({ ...m, [g.key]: !m[g.key] }))}
                    className={`w-full flex items-center justify-center px-3 py-2 rounded-md text-sm transition-colors ${
                      active ? 'bg-accent text-accent-foreground' : 'text-sidebar-foreground hover:bg-secondary'
                    }`}
                    title={g.title}
                  >
                    <g.icon className={`h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  </button>
                ) : (
                  <div className="pt-3">
                    <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                      {g.title}
                    </p>
                    <div className="space-y-0.5">
                      {visibleSubs.map((subItem) => {
                        const isSubActive = subItem.url === '/'
                          ? location.pathname === '/'
                          : location.pathname === subItem.url;
                        return (
                          <NavLink
                            key={subItem.url}
                            to={subItem.url}
                            end
                            className={`relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors ${
                              isSubActive
                                ? 'bg-accent text-accent-foreground font-medium shadow-[inset_3px_0_0_hsl(var(--primary))]'
                                : 'text-sidebar-foreground hover:bg-secondary'
                            }`}
                            activeClassName=""
                          >
                            <subItem.icon className={`h-4 w-4 flex-shrink-0 ${isSubActive ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span>{subItem.title}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                    <div className="mx-3 mt-3 border-b border-sidebar-border" />
                  </div>
                )}
              </Fragment>
            );
          })}

          {/* Configurações - sempre visível */}
          <NavLink
            to="/configuracoes"
            end
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${collapsed ? 'justify-center' : ''} text-sidebar-foreground hover:bg-secondary`}
            activeClassName="bg-accent text-accent-foreground font-medium shadow-[inset_3px_0_0_hsl(var(--primary))]"
            title={collapsed ? "Configurações" : undefined}
          >
            <Settings className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            {!collapsed && <span>Configurações</span>}
          </NavLink>
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          {!collapsed && user && (
            <div className="flex items-center gap-2 px-2 py-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-semibold">
                {(user.email || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">{user.email}</p>
                <p className="text-[10px] text-muted-foreground">Usuário</p>
              </div>
            </div>
          )}
          <button onClick={signOut}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-destructive hover:bg-[#FEF2F2] transition ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? "Sair" : undefined}>
            <LogOut className="h-4 w-4 flex-shrink-0" />
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
