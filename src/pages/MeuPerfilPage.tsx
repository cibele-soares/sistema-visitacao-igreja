import { useEffect, useState } from "react";
import { Lock, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function MeuPerfilPage() {
  const { perfil, user, refreshPerfil } = useAuth();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [savingSenha, setSavingSenha] = useState(false);

  useEffect(() => {
    setNome(perfil?.nome ?? "");
    setTelefone(perfil?.telefone ?? "");
  }, [perfil]);

  const salvarPerfil = async () => {
    if (!user || !nome.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }

    setSavingPerfil(true);
    const { error } = await supabase
      .from("perfis")
      .update({ nome: nome.trim(), telefone: telefone.trim() || null })
      .eq("id", user.id);
    setSavingPerfil(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshPerfil();
    toast.success("Perfil atualizado.");
  };

  const trocarSenha = async () => {
    if (novaSenha.length < 8) {
      toast.error("A nova senha deve ter ao menos 8 caracteres.");
      return;
    }
    if (novaSenha !== confirmSenha) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setSavingSenha(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setSavingSenha(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    setNovaSenha("");
    setConfirmSenha("");
    toast.success("Senha alterada com sucesso.");
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-serif font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground text-sm mt-1">{user?.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg flex items-center gap-2"><User className="h-5 w-5" /> Dados pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label>Nome</Label><Input value={nome} onChange={(event) => setNome(event.target.value)} /></div>
          <div className="space-y-1.5"><Label>Telefone</Label><Input value={telefone} onChange={(event) => setTelefone(event.target.value)} placeholder="(00) 00000-0000" /></div>
          <Button onClick={() => void salvarPerfil()} disabled={savingPerfil}>{savingPerfil ? "Salvando…" : "Salvar dados"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg flex items-center gap-2"><Lock className="h-5 w-5" /> Alterar senha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label>Nova senha</Label><Input type="password" autoComplete="new-password" value={novaSenha} onChange={(event) => setNovaSenha(event.target.value)} placeholder="Mínimo 8 caracteres" /></div>
          <div className="space-y-1.5"><Label>Confirmar nova senha</Label><Input type="password" autoComplete="new-password" value={confirmSenha} onChange={(event) => setConfirmSenha(event.target.value)} placeholder="Repita a senha" /></div>
          <Button onClick={() => void trocarSenha()} disabled={savingSenha} variant="outline">{savingSenha ? "Alterando…" : "Alterar senha"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
