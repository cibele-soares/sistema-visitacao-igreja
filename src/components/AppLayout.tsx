import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAppData } from "@/context/AppData";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAppData();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-card px-4 shrink-0">
            <SidebarTrigger />
            <span className="ml-3 font-serif text-sm font-semibold text-foreground">
              Sistema de Visitação
            </span>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto animate-fade-in">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground gap-3">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Carregando dados…</span>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
