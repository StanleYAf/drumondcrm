import { LayoutDashboard, FilePlus, BarChart3, PhoneCall, Settings, LogOut, Package, Kanban, Wrench, Users } from "lucide-react";
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
  { title: "Clientes Manutenção", url: "/manutencao/clientes", icon: Users, group: "admin-only" },
  { title: "Configurações", url: "/configuracoes", icon: Settings, group: "always" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, user, hasCargo } = useAuth();

  const items = allItems.filter(item => {
    if (item.group === "always") return true;
    if (item.group === "admin-only") return hasCargo("admin");
    if (hasCargo("admin")) return true;
    if (hasCargo("dash") && item.group === "dash") return true;
    if ((hasCargo("estoque") || hasCargo("Controlador")) && item.group === "estoque") return true;
    if (hasCargo("manutencao") && item.group === "manutencao") return true;
    return false;
  });

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
                <SidebarMenuItem key={item.title}>
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
