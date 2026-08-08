import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppDataProvider } from "@/context/AppData";
import { AuthProvider } from "@/context/AuthContext";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const PessoasPage = lazy(() => import("./pages/PessoasPage"));
const VoluntariosPage = lazy(() => import("./pages/VoluntariosPage"));
const AlimentosPage = lazy(() => import("./pages/AlimentosPage"));
const GruposPage = lazy(() => import("./pages/GruposPage"));
const LideresPage = lazy(() => import("./pages/LideresPage"));
const VisitasPage = lazy(() => import("./pages/VisitasPage"));
const CestasPage = lazy(() => import("./pages/CestasPage"));
const RegistrosPage = lazy(() => import("./pages/RegistrosPage"));
const DuvidasPage = lazy(() => import("./pages/DuvidasPage"));
const VoluntarioLoginPage = lazy(() => import("./pages/VoluntarioLoginPage"));
const VoluntarioAreaPage = lazy(() => import("./pages/VoluntarioAreaPage"));
const MeuPerfilPage = lazy(() => import("./pages/MeuPerfilPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

function LoadingPage() {
  return <div className="min-h-screen grid place-items-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
}

function AdminPage({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute><AppLayout>{children}</AppLayout></ProtectedRoute>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <AppDataProvider>
            <BrowserRouter>
              <Suspense fallback={<LoadingPage />}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/admin/login" element={<AdminLoginPage />} />
                  <Route path="/dashboard" element={<AdminPage><Dashboard /></AdminPage>} />
                  <Route path="/pessoas" element={<AdminPage><PessoasPage /></AdminPage>} />
                  <Route path="/voluntarios" element={<AdminPage><VoluntariosPage /></AdminPage>} />
                  <Route path="/alimentos" element={<AdminPage><AlimentosPage /></AdminPage>} />
                  <Route path="/grupos" element={<AdminPage><GruposPage /></AdminPage>} />
                  <Route path="/lideres" element={<AdminPage><LideresPage /></AdminPage>} />
                  <Route path="/visitas" element={<AdminPage><VisitasPage /></AdminPage>} />
                  <Route path="/cestas" element={<AdminPage><CestasPage /></AdminPage>} />
                  <Route path="/registros" element={<AdminPage><RegistrosPage /></AdminPage>} />
                  <Route path="/duvidas" element={<AdminPage><DuvidasPage /></AdminPage>} />
                  <Route path="/perfil" element={<AdminPage><MeuPerfilPage /></AdminPage>} />
                  <Route path="/acesso" element={<VoluntarioLoginPage />} />
                  <Route path="/minha-area" element={<VoluntarioAreaPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AppDataProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}