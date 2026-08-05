import {
  Apple, Users, UserCheck, UsersRound, Crown, Route, ClipboardCheck, Home, LogOut, UserCircle, type LucideIcon, Church,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

type SidebarItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

const items: SidebarItem[] = [
  { title: "Início", url: "/dashboard", icon: Home },
  { title: "Pessoas", url: "/pessoas", icon: Users },
  { title: "Voluntários", url: "/voluntarios", icon: UserCheck },

  { title: "Alimentos", url: "/alimentos", icon: Apple },

  { title: "Grupos", url: "/grupos", icon: UsersRound },
  { title: "Líderes", url: "/lideres", icon: Crown },
  { title: "Visitas", url: "/visitas", icon: Route },

  /*{ title: "Cestas", url: "/cestas", icon: Package },*/

  { title: "Registros", url: "/registros", icon: ClipboardCheck },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, perfil } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center gap-3">
          <Church className="w-5 h-5" style={{ color: "rgb(214, 155, 54)" }} />
          {!collapsed && (
            <span className="font-serif font-bold text-sidebar-foreground text-sm leading-tight">
              Visitação<br />da Igreja
            </span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="hover:bg-sidebar-accent/60"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                      >
                        <Icon className="mr-2 h-4 w-4 shrink-0" />

                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {!collapsed && perfil && (
            <div className="px-3 py-2 text-xs text-muted-foreground truncate">
              {perfil.nome}
            </div>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/perfil"
                className="hover:bg-sidebar-accent/60"
                activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
              >
                <UserCircle className="mr-2 h-4 w-4 shrink-0" />
                {!collapsed && <span>Meu Perfil</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="mr-2 h-4 w-4 shrink-0" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}