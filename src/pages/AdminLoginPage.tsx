import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn, session, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  if (!loading && session && isAdmin) return <Navigate to="/dashboard" replace />;

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      toast.error("Preencha e-mail e senha.");
      return;
    }

    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);

    if (error) {
      toast.error(error);
      return;
    }
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Button variant="ghost" className="mb-6 text-muted-foreground" onClick={() => navigate("/")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao início
      </Button>

      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="w-14 h-14 rounded-xl gradient-warm flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" style={{ color: "hsl(220 30% 12%)" }} />
          </div>
          <CardTitle className="font-serif text-xl">Área do Responsável</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Acesso restrito à liderança da igreja.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="admin-email">E-mail</Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@suaigreja.com.br"
              onKeyDown={(event) => event.key === "Enter" && void handleLogin()}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-password">Senha</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              onKeyDown={(event) => event.key === "Enter" && void handleLogin()}
            />
          </div>
          <Button className="w-full" onClick={() => void handleLogin()} disabled={submitting || loading}>
            {submitting ? "Entrando…" : "Entrar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
