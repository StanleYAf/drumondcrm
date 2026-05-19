import { LayoutDashboard, BookOpen, BarChart2, ShoppingCart, Headphones, FileText, Settings, LogOut, Package, Boxes, Wrench, Briefcase, Building2, ChevronDown, ClipboardList, DollarSign } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/authContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";

type SubItem = { title: string; url: string; icon: any; adminOnly?: boolean };
type Group = {
  key: string;
  title: string;
  icon: any;
  matchPrefix: string;
  permission: "dash" | "estoque" | "manutencao" | "admin";
  subs: SubItem[];
};

const groups: Group[] = [
  {
    key: "engenharia",
    title: "Engenharia",
    icon: Wrench,
    matchPrefix: "/manutencao",
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
    matchPrefix: "__comercial__",
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
    matchPrefix: "/estoque",
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
    matchPrefix: "/financeiro",
    permission: "admin",
    subs: [
      { title: "Dashboard", url: "/financeiro", icon: LayoutDashboard },
    ],
  },
];

const comercialRoutes = ["/", "/lancamentos", "/indicadores", "/vendas", "/pos-venda", "/relatorios"];

function isGroupActive(group: Group, pathname: string) {
  if (group.key === "comercial") return comercialRoutes.includes(pathname);
  return pathname.startsWith(group.matchPrefix);
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, user, hasCargo } = useAuth();

  const canSee = (g: Group) => {
    if (hasCargo("admin")) return true;
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

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
            {!collapsed && "Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleGroups.map((g) => {
                const visibleSubs = g.subs.filter(s => !s.adminOnly || hasCargo("admin"));
                const isOpen = !!openMap[g.key];
                const active = isGroupActive(g, location.pathname);
                return (
                  <Collapsible
                    key={g.key}
                    open={isOpen}
                    onOpenChange={(o) => setOpenMap(m => ({ ...m, [g.key]: o }))}
                    asChild
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className={`hover:bg-sidebar-accent/50 ${active ? "bg-sidebar-accent text-primary font-medium" : ""}`}
                        >
                          <g.icon className="mr-2 h-4 w-4" />
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-left">{g.title}</span>
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                              />
                            </>
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      {!collapsed && (
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {visibleSubs.map((sub) => (
                              <SidebarMenuSubItem key={sub.url}>
                                <SidebarMenuSubButton asChild>
                                  <NavLink
                                    to={sub.url}
                                    end
                                    className="flex items-center gap-2"
                                    activeClassName="bg-sidebar-accent text-primary font-medium"
                                  >
                                    <sub.icon className="h-3.5 w-3.5" />
                                    <span>{sub.title}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      )}
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/configuracoes"
                    end
                    className="hover:bg-sidebar-accent/50"
                    activeClassName="bg-sidebar-accent text-primary font-medium"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Configurações</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="mt-auto p-3 border-t border-border">
        {!collapsed && user && (
          <p className="text-xs text-muted-foreground truncate mb-2 px-2">{user.email}</p>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </Sidebar>
  );
}
