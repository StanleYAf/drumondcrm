import { Fragment, useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard, BookOpen, BarChart2, ShoppingCart, Headphones, FileText, Settings,
  Boxes, LogOut, Briefcase, Building2, ClipboardList, DollarSign, RefreshCw, KanbanSquare,
  Stethoscope, Plus, Landmark, FileSignature, FileBadge, CalendarClock,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import type { PermCode } from "@/lib/permissions";
import { NotificationsBell } from "@/components/NotificationsBell";
import { OneSignalInit } from "@/components/OneSignalInit";


type SubItem = { title: string; url: string; icon: any; perm?: PermCode | string; adminOnly?: boolean };
type Group = {
  key: string;
  title: string;
  icon: any;
  subs: SubItem[];
};

type ModuleDef = Group & { color?: string };

const groups: ModuleDef[] = [
  {
    key: "administrativo",
    title: "Administrativo",
    icon: Landmark,
    subs: [
      { title: "Contratos", url: "/administrativo/contratos", icon: FileSignature, perm: "adm_contratos" },
    ],
  },
  {
    key: "comercial",
    title: "Comercial",
    icon: Briefcase,
    subs: [
      { title: "Dashboard", url: "/comercial", icon: LayoutDashboard, perm: "com_dashboard" },
      { title: "Demandas", url: "/demandas/comercial", icon: KanbanSquare, perm: "com_demandas" },
      { title: "Indicadores", url: "/indicadores", icon: BarChart2, perm: "com_indicadores" },
      { title: "Lançamentos", url: "/lancamentos", icon: BookOpen, perm: "com_lancamentos" },
      { title: "Pós-venda", url: "/pos-venda", icon: Headphones, perm: "com_posvenda" },
      { title: "Relatórios", url: "/relatorios", icon: FileText, perm: "com_relatorios" },
      { title: "Vendas", url: "/vendas", icon: ShoppingCart, perm: "com_vendas" },
    ],
  },
  {
    key: "engenharia",
    title: "Engenharia",
    icon: Stethoscope,
    subs: [
      { title: "ART", url: "/administrativo/art", icon: FileBadge, perm: "adm_art" },
      { title: "Boletim", url: "/manutencao/boletim", icon: FileText, perm: "eng_boletim" },
      { title: "Clientes", url: "/manutencao/clientes", icon: Building2, perm: "eng_clientes" },
      { title: "Cronograma", url: "/manutencao/cronograma", icon: CalendarClock, perm: "eng_cronograma" },
      { title: "Dash Engenharia", url: "/manutencao", icon: LayoutDashboard, perm: "eng_dashboard" },
      { title: "Demandas", url: "/demandas/engenharia", icon: KanbanSquare, perm: "eng_demandas" },
      { title: "Indicadores", url: "/manutencao/os", icon: ClipboardList, perm: "eng_os" },
      { title: "Logs de Sincronização", url: "/manutencao/sync-logs", icon: RefreshCw, perm: "eng_synclogs" },
    ],
  },
  {
    key: "estoque",
    title: "Estoque",
    icon: Boxes,
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
      { title: "Demandas", url: "/demandas/financeiro", icon: KanbanSquare, perm: "fin_demandas" },
    ],
  },
];

const comercialRoutes = ["/comercial", "/lancamentos", "/indicadores", "/vendas", "/pos-venda", "/relatorios"];

const ROUTE_TITLES: Record<string, { title: string; module: string }> = {
  "/comercial": { title: "Dashboard Comercial", module: "Comercial" },
  "/lancamentos": { title: "Lançamentos", module: "Comercial" },
  "/indicadores": { title: "Indicadores", module: "Comercial" },
  "/vendas": { title: "Vendas", module: "Comercial" },
  "/pos-venda": { title: "Pós-venda", module: "Comercial" },
  "/relatorios": { title: "Relatórios", module: "Comercial" },
  "/demandas/comercial": { title: "Demandas", module: "Comercial" },
  "/manutencao": { title: "Dashboard Engenharia", module: "Engenharia" },
  "/manutencao/clientes": { title: "Clientes", module: "Engenharia" },
  "/manutencao/os": { title: "Ordens de Serviço", module: "Engenharia" },
  "/manutencao/boletim": { title: "Boletim", module: "Engenharia" },
  "/manutencao/sync-logs": { title: "Logs de Sincronização", module: "Engenharia" },
  "/demandas/engenharia": { title: "Demandas", module: "Engenharia" },
  "/estoque": { title: "Estoque", module: "Estoque" },
  "/financeiro": { title: "Dashboard Financeiro", module: "Financeiro" },
  "/demandas/financeiro": { title: "Demandas", module: "Financeiro" },
  "/administrativo/contratos": { title: "Contratos", module: "Administrativo" },
  "/administrativo/art": { title: "Controle de ART", module: "Engenharia" },
  "/configuracoes": { title: "Configurações", module: "Sistema" },
};

function pageInfo(pathname: string) {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  const match = Object.keys(ROUTE_TITLES).find((p) => p !== "/" && pathname.startsWith(p));
  return match ? ROUTE_TITLES[match] : { title: "DSH Hub", module: "Sistema" };
}

function isGroupActive(group: Group, pathname: string): boolean {
  if (group.key === "comercial") {
    if (pathname === "/demandas/comercial") return true;
    return comercialRoutes.some(r => pathname.startsWith(r));
  }
  if (group.key === "engenharia") return pathname.startsWith("/manutencao") || pathname === "/demandas/engenharia" || pathname.startsWith("/administrativo/art");
  if (group.key === "estoque") return pathname.startsWith("/estoque");
  if (group.key === "financeiro") return pathname.startsWith("/financeiro") || pathname === "/demandas/financeiro";
  if (group.key === "administrativo") return pathname.startsWith("/administrativo") && !pathname.startsWith("/administrativo/art");
  return false;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, hasCargo, canAccess } = useAuth();
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

  const activeFromRoute = visibleGroups.find((g) => isGroupActive(g, location.pathname))?.key
    ?? visibleGroups[0]?.key
    ?? "engenharia";
  const [activeModule, setActiveModule] = useState<string>(activeFromRoute);

  useEffect(() => {
    const fromRoute = visibleGroups.find((g) => isGroupActive(g, location.pathname))?.key;
    if (fromRoute) setActiveModule(fromRoute);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const currentGroup = visibleGroups.find((g) => g.key === activeModule) ?? visibleGroups[0];
  const info = pageInfo(location.pathname);

  // Mobile flat list for bottom bar
  const mobileItems = visibleGroups.flatMap(g => g.subs).slice(0, 5);

  return (
    <div className="min-h-screen w-full bg-[#F4F8FB]">
      {/* ===== Top Header ===== */}
      <header
        className="hidden md:flex fixed top-0 inset-x-0 h-20 z-50 items-center justify-between px-6 text-white overflow-hidden"
        style={{ background: "linear-gradient(90deg, #1F4E79 0%, #25598C 100%)" }}
      >
        {/* ECG decoration */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1600 80"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M0 40 L200 40 L230 20 L260 60 L290 10 L320 70 L350 40 L800 40 L830 25 L860 55 L890 15 L920 65 L950 40 L1600 40"
            stroke="white"
            strokeOpacity="0.12"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>

        <div className="relative flex items-center gap-3 min-w-0">
          <Link to="/manutencao" className="flex items-center gap-3">
            <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M19 33C19 33 5 23.5 5 13.5C5 9.36 8.36 6 12.5 6C15.1 6 17.4 7.3 19 9.3C20.6 7.3 22.9 6 25.5 6C29.64 6 33 9.36 33 13.5C33 23.5 19 33 19 33Z"
                stroke="#50B9EC"
                strokeWidth="1.8"
                fill="none"
              />
              <path
                d="M9 17h4l2-4 3 8 2-5 2 3h7"
                stroke="#50B9EC"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <div className="leading-tight" translate="no">
              <div className="text-xl font-bold tracking-tight">
                <span className="text-white">DSH</span>
                <span style={{ color: "#50B9EC" }}>Hub</span>
              </div>
              <div className="text-[11px] text-white/70">Sistema de gestão integrada</div>
            </div>
          </Link>
        </div>

        <div translate="no" className="notranslate relative hidden lg:flex flex-col items-center text-center min-w-0 px-4">
          <div className="text-[18px] font-bold truncate">{info.title}</div>
          <div className="text-[12px]" style={{ color: "#BCD7EC" }}>
            {info.module} <span className="opacity-50 mx-1">/</span> {info.title}
          </div>
        </div>

        <div className="relative flex items-center gap-3">
          <OneSignalInit />
          <NotificationsBell />
          <button
            onClick={signOut}
            className="h-9 w-9 grid place-items-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <div
            className="h-10 w-10 rounded-full grid place-items-center text-white text-sm font-semibold border-2"
            style={{ background: "#25598C", borderColor: "#50B9EC" }}
            title={user?.email || ""}
          >
            {(user?.email || "?").charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* ===== Icon Sidebar (modules) ===== */}
      <aside className="hidden md:flex fixed top-20 bottom-0 left-0 w-[108px] z-40 flex-col items-stretch py-3 gap-1 bg-white border-r border-[#E2E8F0]">
        {visibleGroups.map((g) => {
          const active = g.key === activeModule;
          return (
            <button
              key={g.key}
              onClick={() => {
                setActiveModule(g.key);
                // jump to first sub for fast navigation
                const first = g.subs[0];
                if (first) navigate(first.url);
              }}
              className="relative flex flex-col items-center justify-center gap-1 py-3 mx-1.5 rounded-[10px] transition-colors"
              style={{
                background: active ? "#EAF4FD" : "transparent",
                color: active ? "#25598C" : "#94A3B8",
                boxShadow: active ? "inset 3px 0 0 #50B9EC" : undefined,
              }}
              title={g.title}
              translate="no"
            >
              <g.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{g.title}</span>
            </button>
          );
        })}

        <div className="flex-1" />

        <NavLink
          to="/configuracoes"
          end
          className="flex flex-col items-center justify-center gap-1 py-3 mx-2 rounded-[10px] text-[#94A3B8] hover:text-[#25598C] hover:bg-[#EAF4FD] transition-colors"
          activeClassName="!bg-[#EAF4FD] !text-[#25598C]"
          translate="no"
        >
          <Settings className="h-5 w-5" />
          <span className="text-[10px] font-medium">Config</span>
        </NavLink>
      </aside>

      {/* ===== Secondary Sidebar (subitems) ===== */}
      {currentGroup && (
        <aside className="hidden md:flex fixed top-20 bottom-0 left-[108px] w-[232px] z-30 flex-col bg-white border-r border-[#E2E8F0]">
          <div className="px-4 pt-5 pb-3" translate="no">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-[#94A3B8]">
              Módulo
            </div>
            <div className="text-[14px] font-semibold text-[#0F172A]">{currentGroup.title}</div>
          </div>
          <nav translate="no" className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
            {[...currentGroup.subs].sort((a, b) => a.title.localeCompare(b.title, "pt-BR")).map((subItem) => {
              const isSubActive = subItem.url === "/"
                ? location.pathname === "/"
                : location.pathname === subItem.url;
              return (
                <NavLink
                  key={subItem.url}
                  to={subItem.url}
                  end
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-[13px] transition-colors text-[#475569] hover:bg-[#F1F5F9]"
                  activeClassName="!bg-[#EAF4FD] !text-[#25598C] font-semibold"
                >
                  <subItem.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{subItem.title}</span>
                </NavLink>
              );
            })}

            <div className="my-3 border-t border-[#E2E8F0]" />

            <NavLink
              to="/configuracoes"
              end
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-[13px] transition-colors text-[#475569] hover:bg-[#F1F5F9]"
              activeClassName="!bg-[#EAF4FD] !text-[#25598C] font-semibold"
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span>Configurações</span>
            </NavLink>
          </nav>

          {user && (
            <div className="px-3 py-3 border-t border-[#E2E8F0]">
              <p className="text-[11px] font-medium text-[#0F172A] truncate">{user.email}</p>
              <p className="text-[10px] text-[#64748B]">Usuário</p>
            </div>
          )}
        </aside>
      )}

      {/* ===== Main content ===== */}
      <main className="pb-24 md:pb-6 md:pl-[340px] md:pt-20">
        <div className="max-w-[1400px] mx-auto px-4 py-5 md:px-6 md:py-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav translate="no" className="md:hidden fixed bottom-0 inset-x-0 z-50 glass-nav safe-area-bottom">
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
