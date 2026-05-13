import { LayoutDashboard, FilePlus, BarChart3, PhoneCall, Settings, LogOut, Package, Kanban, Wrench, Building2 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/authContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const allItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, group: "dash" },
  { title: "Lançamentos", url: "/lancamentos", icon: FilePlus, group: "dash" },
  { title: "Indicadores", url: "/indicadores", icon: BarChart3, group: "dash" },
  { title: "Vendas", url: "/vendas", icon: Kanban, group: "dash" },
  { title: "Pós-venda", url: "/pos-venda", icon: PhoneCall, group: "dash" },
  { title: "Estoque", url: "/estoque", icon: Package, group: "estoque" },
  { title: "Manutenção", url: "/manutencao", icon: Wrench, group: "manutencao" },
  { title: "Configurações", url: "/configuracoes", icon: Settings, group: "always" },
];

const manutencaoSubItems = [
  { title: "Dashboard", url: "/manutencao", icon: LayoutDashboard, adminOnly: false },
  { title: "Clientes", url: "/manutencao/clientes", icon: Building2, adminOnly: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, user, hasCargo } = useAuth();

  const items = allItems.filter(item => {
    if (item.group === "always") return true;
    if (hasCargo("admin")) return true;
    if (hasCargo("dash") && item.group === "dash") return true;
    if ((hasCargo("estoque") || hasCargo("Controlador")) && item.group === "estoque") return true;
    if (hasCargo("manutencao") && item.group === "manutencao") return true;
    return false;
  });

  const inManutencao = location.pathname.startsWith("/manutencao");
  const visibleSubItems = manutencaoSubItems.filter(s => !s.adminOnly || hasCargo("admin"));

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
            {!collapsed && "Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <div key={item.title}>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="hover:bg-sidebar-accent/50"
                        activeClassName="bg-sidebar-accent text-primary font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {item.url === "/manutencao" && inManutencao && !collapsed && (
                    <div className="ml-4 mt-1 border-l border-sidebar-border/60 pl-2 space-y-1">
                      {visibleSubItems.map((sub) => (
                        <SidebarMenuItem key={sub.url}>
                          <SidebarMenuButton asChild size="sm">
                            <NavLink
                              to={sub.url}
                              end
                              className="hover:bg-sidebar-accent/50 text-sm"
                              activeClassName="bg-sidebar-accent text-primary font-medium"
                            >
                              <sub.icon className="mr-2 h-3.5 w-3.5" />
                              <span>{sub.title}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </div>
                  )}
                </div>
              ))}
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
