import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/error";
import { VOLUNTEER_EXPIRES_KEY, VOLUNTEER_TOKEN_KEY } from "@/lib/volunteer-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function VoluntarioLoginPage() {
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (codigo.trim().length < 6) {
      toast.error("Digite o código completo.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("voluntario_login", { p_codigo: codigo.trim().toUpperCase() });
      if (error) throw error;
      const session = data?.[0];
      if (!session) throw new Error("Não foi possível iniciar a sessão.");
      sessionStorage.setItem(VOLUNTEER_TOKEN_KEY, session.token);
      sessionStorage.setItem(VOLUNTEER_EXPIRES_KEY, session.expires_at);
      navigate("/minha-area", { replace: true });
    } catch (error) {
      toast.error(errorMessage(error, "Código inválido."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Button variant="ghost" className="mb-6 text-muted-foreground" onClick={() => navigate("/")}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao início</Button>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="w-14 h-14 rounded-xl gradient-warm flex items-center justify-center mx-auto mb-3"><span className="text-xl font-bold" style={{ color: "hsl(220 30% 12%)" }}>✝</span></div>
          <CardTitle className="font-serif text-xl">Área do Voluntário</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Insira seu código de acesso para ver somente seus grupos e visitas.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="volunteer-code">Código de acesso</Label>
            <Input id="volunteer-code" value={codigo} onChange={(event) => setCodigo(event.target.value.toUpperCase())} placeholder="Ex: A1B2C3D4E5" className="text-center font-mono text-lg tracking-widest" maxLength={12} autoComplete="one-time-code" onKeyDown={(event) => event.key === "Enter" && void handleLogin()} />
          </div>
          <Button className="w-full" disabled={loading} onClick={() => void handleLogin()}>{loading ? "Entrando…" : "Entrar"}</Button>
          <p className="text-xs text-center text-muted-foreground">Não tem um código? Solicite ao responsável do seu grupo.</p>
        </CardContent>
      </Card>
    </div>
  );
}

