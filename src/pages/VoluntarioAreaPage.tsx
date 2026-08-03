import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Crown, Heart, LogOut, Navigation, Phone, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/error";
import { parseVolunteerArea, type VolunteerAreaData } from "@/lib/volunteer-area";
import { VOLUNTEER_EXPIRES_KEY, VOLUNTEER_TOKEN_KEY } from "@/lib/volunteer-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function VoluntarioAreaPage() {
  const navigate = useNavigate();
  const [area, setArea] = useState<VolunteerAreaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [relatos, setRelatos] = useState<Record<string, string>>({});
  const [oracoes, setOracoes] = useState<Record<string, string>>({});

  const clearSession = () => {
    sessionStorage.removeItem(VOLUNTEER_TOKEN_KEY);
    sessionStorage.removeItem(VOLUNTEER_EXPIRES_KEY);
  };

  useEffect(() => {
    const token = sessionStorage.getItem(VOLUNTEER_TOKEN_KEY);
    const expires = sessionStorage.getItem(VOLUNTEER_EXPIRES_KEY);
    if (!token || !expires || new Date(expires).getTime() <= Date.now()) {
      clearSession();
      navigate("/acesso", { replace: true });
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const { data, error } = await supabase.rpc("voluntario_area", { p_token: token });
        if (error) throw error;
        if (active) setArea(parseVolunteerArea(data));
      } catch (error) {
        if (!active) return;
        clearSession();
        toast.error(errorMessage(error, "Sua sessão expirou."));
        navigate("/acesso", { replace: true });
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => { active = false; };
  }, [navigate]);

  const handleLogout = async () => {
    const token = sessionStorage.getItem(VOLUNTEER_TOKEN_KEY);
    if (token) await supabase.rpc("voluntario_logout", { p_token: token });
    clearSession();
    navigate("/acesso", { replace: true });
  };

  const handleComplete = async (visitaId: string) => {
    const token = sessionStorage.getItem(VOLUNTEER_TOKEN_KEY);
    if (!token) {
      navigate("/acesso", { replace: true });
      return;
    }

    setSavingId(visitaId);
    try {
      const { data, error } = await supabase.rpc("voluntario_finalizar_visita", {
        p_token: token,
        p_visita_id: visitaId,
        p_data_visita: new Date().toISOString().slice(0, 10),
        p_observacoes: relatos[visitaId] ?? "",
        p_pedido_oracao: oracoes[visitaId] ?? "",
      });
      if (error) throw error;
      setArea(parseVolunteerArea(data));
      toast.success("Visita registrada com sucesso.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!area) return null;

  const { voluntario, grupos, voluntarios, pessoas, visitas } = area;
  const pendentes = visitas.filter((visita) => !visita.realizada);
  const realizadas = visitas.filter((visita) => visita.realizada);
  const getPessoa = (id: string) => pessoas.find((pessoa) => pessoa.id === id);
  const getGrupo = (id: string) => grupos.find((grupo) => grupo.id === id);
  const getVolNome = (id: string) => voluntarios.find((item) => item.id === id)?.nome ?? "—";

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-10 h-14 flex items-center justify-between border-b bg-card/95 backdrop-blur px-4 shadow-sm">
        <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg gradient-warm flex items-center justify-center"><span className="text-sm font-bold">✝</span></div><span className="font-serif text-sm font-semibold">Olá, {voluntario.nome.split(" ")[0]}!</span></div>
        <Button variant="ghost" size="sm" onClick={() => void handleLogout()}><LogOut className="h-4 w-4 mr-1" />Sair</Button>
      </header>

      <main className="px-4 pt-6 max-w-lg mx-auto space-y-8 animate-fade-in">
        <div className="grid grid-cols-2 gap-3">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-serif font-bold text-primary">{pendentes.length}</p><p className="text-xs text-muted-foreground">Pendentes</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-serif font-bold text-success">{realizadas.length}</p><p className="text-xs text-muted-foreground">Realizadas</p></CardContent></Card>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-serif font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Meus grupos</h2>
          {grupos.length === 0 ? <p className="text-sm text-muted-foreground">Você ainda não está em um grupo.</p> : grupos.map((grupo) => (
            <Card key={grupo.id}>
              <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="font-serif text-sm flex items-center gap-2">{grupo.nome}{grupo.liderId === voluntario.id && <Badge className="gap-1"><Crown className="h-3 w-3" />Você é líder</Badge>}</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {grupo.liderId && grupo.liderId !== voluntario.id && <p className="text-xs text-muted-foreground">Líder: {getVolNome(grupo.liderId)}</p>}
                <div className="flex flex-wrap gap-1.5">{grupo.voluntarioIds.filter((id) => id !== voluntario.id).map((id) => <Badge key={id} variant="secondary">{getVolNome(id)}</Badge>)}</div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-serif font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Visitas pendentes</h2>
          {pendentes.length === 0 ? <Card><CardContent className="p-6 text-center"><CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" /><p className="text-sm text-muted-foreground">Todas as visitas estão concluídas.</p></CardContent></Card> : pendentes.map((visita) => {
            const pessoa = getPessoa(visita.pessoaId);
            const grupo = getGrupo(visita.grupoId);
            return (
              <Card key={visita.id}>
                <CardContent className="p-4 space-y-3">
                  <div><p className="font-semibold text-sm">{pessoa?.nome ?? "—"}</p><Badge variant="outline" className="mt-1">{grupo?.nome ?? "—"}</Badge></div>
                  {pessoa?.endereco && <a href={`https://maps.google.com/?q=${encodeURIComponent(pessoa.endereco)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-primary underline"><Navigation className="h-3 w-3" />{pessoa.endereco}</a>}
                  {pessoa?.telefone && <a href={`tel:${pessoa.telefone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{pessoa.telefone}</a>}
                  {pessoa?.observacoes && <p className="text-xs bg-muted rounded-lg px-3 py-2">{pessoa.observacoes}</p>}
                  {visita.cestaItens.length > 0 && <div className="flex flex-wrap gap-1">{visita.cestaItens.map((item) => <Badge key={item.alimentoId} variant="secondary">{item.quantidade} {item.unidade} {item.nome}</Badge>)}</div>}
                  <Textarea placeholder="Relato da visita…" value={relatos[visita.id] ?? ""} onChange={(event) => setRelatos((current) => ({ ...current, [visita.id]: event.target.value }))} />
                  <div className="space-y-1"><label className="text-xs text-rose-500 flex items-center gap-1"><Heart className="h-3 w-3" />Pedido de oração</label><Textarea className="border-rose-200" value={oracoes[visita.id] ?? ""} onChange={(event) => setOracoes((current) => ({ ...current, [visita.id]: event.target.value }))} /></div>
                  <Button className="w-full" disabled={savingId === visita.id} onClick={() => void handleComplete(visita.id)}><CheckCircle2 className="mr-2 h-4 w-4" />{savingId === visita.id ? "Registrando…" : "Marcar como realizada"}</Button>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {realizadas.length > 0 && (
          <section className="space-y-3"><h2 className="text-base font-serif font-semibold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" />Realizadas</h2>{realizadas.map((visita) => <Card key={visita.id} className="opacity-75"><CardContent className="py-3 px-4"><p className="text-sm font-medium">{getPessoa(visita.pessoaId)?.nome ?? "—"}</p>{visita.observacoes && <p className="text-xs text-muted-foreground mt-1">{visita.observacoes}</p>}{visita.pedidoOracao && <p className="text-xs text-rose-500 mt-1 flex gap-1"><Heart className="h-3 w-3" />{visita.pedidoOracao}</p>}</CardContent></Card>)}</section>
        )}
      </main>
    </div>
  );
}
