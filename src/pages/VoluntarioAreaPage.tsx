import { useEffect, useState } from "react";
import { CheckCircle2, Church, Clock, Crown, Heart, LogOut, Navigation, Package, Phone, Plus, Users, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/error";
import { parseVolunteerArea, parseVolunteerAlimentosInfo, type VolunteerAlimentosInfo, type VolunteerAreaData } from "@/lib/volunteer-area";
import { VOLUNTEER_EXPIRES_KEY, VOLUNTEER_TOKEN_KEY } from "@/lib/volunteer-session";
import { CASAS_ORACAO } from "@/lib/casas-oracao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
type SimNao = "" | "sim" | "nao";
import { Textarea } from "@/components/ui/textarea";

export default function VoluntarioAreaPage() {
  const navigate = useNavigate();
  const [area, setArea] = useState<VolunteerAreaData | null>(null);
  const [alimentosInfo, setAlimentosInfo] = useState<VolunteerAlimentosInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [relatos, setRelatos] = useState<Record<string, string>>({});
  const [oracoes, setOracoes] = useState<Record<string, string>>({});
  const [naoRealizadaModo, setNaoRealizadaModo] = useState<Record<string, boolean>>({});
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [alimentoForm, setAlimentoForm] = useState({ nome: "", quantidade: "", unidade: "kg", casaOracao: "" });
  const [savingAlimento, setSavingAlimento] = useState(false);
  const [cestasEntregues, setCestasEntregues] = useState<Record<string, SimNao>>({});

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
        return;
      } finally {
        if (active) setLoading(false);
      }

      try {
        const { data: alimData, error: alimError } = await supabase.rpc("voluntario_alimentos_info", { p_token: token });
        if (alimError) throw alimError;
        if (active) setAlimentosInfo(parseVolunteerAlimentosInfo(alimData));
      } catch (error) {
        console.error(error);
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

  const isRelatoCompleto = (visitaId: string) =>
    (relatos[visitaId] ?? "").trim() !== "" && (cestasEntregues[visitaId] ?? "") !== "";

  const handleComplete = async (visitaId: string) => {
    const token = sessionStorage.getItem(VOLUNTEER_TOKEN_KEY);
    if (!token) {
      navigate("/acesso", { replace: true });
      return;
    }
    if (!isRelatoCompleto(visitaId)) {
      toast.error("Preencha o relato e informe se a cesta foi entregue antes de concluir.");
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
        p_cesta_entregue: cestasEntregues[visitaId] === "sim",
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

  const handleNaoRealizada = async (visitaId: string) => {
    const token = sessionStorage.getItem(VOLUNTEER_TOKEN_KEY);
    if (!token) {
      navigate("/acesso", { replace: true });
      return;
    }
    const motivo = (motivos[visitaId] ?? "").trim();
    if (!motivo) {
      toast.error("Informe o motivo da visita não realizada.");
      return;
    }

    setSavingId(visitaId);
    try {
      const { data, error } = await supabase.rpc("voluntario_marcar_visita_nao_realizada", {
        p_token: token,
        p_visita_id: visitaId,
        p_motivo: motivo,
      });
      if (error) throw error;
      setArea(parseVolunteerArea(data));
      setNaoRealizadaModo((current) => ({ ...current, [visitaId]: false }));
      toast.success("Visita registrada como não realizada.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSavingId(null);
    }
  };

  const handleAddAlimento = async () => {
    const token = sessionStorage.getItem(VOLUNTEER_TOKEN_KEY);
    if (!token) {
      navigate("/acesso", { replace: true });
      return;
    }
    const value = Number(alimentoForm.quantidade);
    if (!alimentoForm.nome.trim() || !Number.isFinite(value) || value < 0 || !alimentoForm.unidade.trim() || !alimentoForm.casaOracao.trim()) {
      toast.error("Informe nome, quantidade válida, unidade e casa de oração.");
      return;
    }

    setSavingAlimento(true);
    try {
      const { data, error } = await supabase.rpc("voluntario_criar_alimento", {
        p_token: token,
        p_nome: alimentoForm.nome.trim(),
        p_quantidade: value,
        p_unidade: alimentoForm.unidade.trim(),
        p_casa_oracao: alimentoForm.casaOracao.trim(),
      });
      if (error) throw error;
      setAlimentosInfo(parseVolunteerAlimentosInfo(data));
      setAlimentoForm({ nome: "", quantidade: "", unidade: "kg", casaOracao: "" });
      toast.success("Alimento cadastrado.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSavingAlimento(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!area) return null;

  const { voluntario, grupos, voluntarios, pessoas, visitas } = area;
  const pendentes = visitas.filter((visita) => !visita.realizada && !visita.naoRealizada);
  const naoRealizadas = visitas.filter((visita) => visita.naoRealizada && !visita.realizada);
  const realizadas = visitas.filter((visita) => visita.realizada);
  const getPessoa = (id: string) => pessoas.find((pessoa) => pessoa.id === id);
  const getGrupo = (id: string) => grupos.find((grupo) => grupo.id === id);
  const getVolNome = (id: string) => voluntarios.find((item) => item.id === id)?.nome ?? "—";

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-10 h-14 flex items-center justify-between border-b bg-card/95 backdrop-blur px-4 shadow-sm">
        <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg gradient-warm flex items-center justify-center"><Church className="h-4 w-4" style={{ color: "hsl(220 30% 12%)" }} /></div><span className="font-serif text-sm font-semibold">Olá, {voluntario.nome.split(" ")[0]}!</span></div>
        <Button variant="ghost" size="sm" onClick={() => void handleLogout()}><LogOut className="h-4 w-4 mr-1" />Sair</Button>
      </header>

      <main className="px-4 pt-6 max-w-lg mx-auto space-y-8 animate-fade-in">
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-serif font-bold text-primary">{pendentes.length}</p><p className="text-xs text-muted-foreground">Pendentes</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-serif font-bold text-destructive">{naoRealizadas.length}</p><p className="text-xs text-muted-foreground">Não realizadas</p></CardContent></Card>
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

        {alimentosInfo?.podeControlarAlimentos && (
          <section className="space-y-3">
            <h2 className="text-base font-serif font-semibold flex items-center gap-2"><Package className="h-4 w-4 text-primary" />Controle de Alimentos</h2>
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-foreground">Alimento<span className="text-rose-600"> *</span></label>
                  <Input value={alimentoForm.nome} onChange={(event) => setAlimentoForm((current) => ({ ...current, nome: event.target.value }))} placeholder="Ex: Arroz" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-foreground">Quantidade<span className="text-rose-600"> *</span></label>
                    <Input min={0} step="any" type="number" value={alimentoForm.quantidade} onChange={(event) => setAlimentoForm((current) => ({ ...current, quantidade: event.target.value }))} placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-foreground">Unidade<span className="text-rose-600"> *</span></label>
                    <Input value={alimentoForm.unidade} onChange={(event) => setAlimentoForm((current) => ({ ...current, unidade: event.target.value }))} placeholder="kg, un, pct" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-foreground">Casa de Oração<span className="text-rose-600"> *</span></label>
                  <Select value={alimentoForm.casaOracao} onValueChange={(value) => setAlimentoForm((current) => ({ ...current, casaOracao: value }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione a casa de oração" /></SelectTrigger>
                    <SelectContent>
                      {CASAS_ORACAO.map((grupo) => (
                        <SelectGroup key={grupo.cidade}>
                          <SelectLabel>{grupo.cidade}</SelectLabel>
                          {grupo.casas.map((casa) => <SelectItem key={casa} value={casa}>{casa}</SelectItem>)}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" disabled={savingAlimento} onClick={() => void handleAddAlimento()}>
                  <Plus className="mr-2 h-4 w-4" />{savingAlimento ? "Salvando…" : "Adicionar alimento"}
                </Button>
              </CardContent>
            </Card>
            {alimentosInfo.meusAlimentos.length > 0 && (
              <div className="space-y-2">
                {alimentosInfo.meusAlimentos.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="py-3 px-4 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{item.nome}</p>
                        <p className="text-xs text-muted-foreground">{item.casaOracao}</p>
                      </div>
                      <Badge variant="secondary">{item.quantidade} {item.unidade}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-base font-serif font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Visitas pendentes</h2>
          {pendentes.length === 0 ? <Card><CardContent className="p-6 text-center"><CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" /><p className="text-sm text-muted-foreground">Todas as visitas estão concluídas.</p></CardContent></Card> : pendentes.map((visita) => {
            const pessoa = getPessoa(visita.pessoaId);
            const grupo = getGrupo(visita.grupoId);
            const modoNaoRealizada = naoRealizadaModo[visita.id] ?? false;
            return (
              <Card key={visita.id}>
                <CardContent className="p-4 space-y-3">
                  <div><p className="font-semibold text-sm">{pessoa?.nome ?? "—"}</p><Badge variant="outline" className="mt-1">{grupo?.nome ?? "—"}</Badge></div>
                  {pessoa?.endereco && <a href={`https://maps.google.com/?q=${encodeURIComponent(pessoa.endereco)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-primary underline"><Navigation className="h-3 w-3" />{pessoa.endereco}</a>}
                  {pessoa?.telefone && <a href={`tel:${pessoa.telefone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{pessoa.telefone}</a>}
                  {pessoa?.observacoes && <p className="text-xs bg-muted rounded-lg px-3 py-2">{pessoa.observacoes}</p>}
                  {visita.cestaItens.length > 0 && <div className="flex flex-wrap gap-1">{visita.cestaItens.map((item) => <Badge key={item.alimentoId} variant="secondary">{item.quantidade} {item.unidade} {item.nome}</Badge>)}</div>}

                  {!modoNaoRealizada ? (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs text-foreground">Relato da visita<span className="text-rose-600"> *</span></label>
                        <Textarea placeholder="Como foi a visita…" value={relatos[visita.id] ?? ""} onChange={(event) => setRelatos((current) => ({ ...current, [visita.id]: event.target.value }))} required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-foreground">Cesta entregue?<span className="text-rose-600"> *</span></label>
                        <Select value={cestasEntregues[visita.id] ?? ""} onValueChange={(value) => setCestasEntregues((current) => ({ ...current, [visita.id]: value as SimNao }))}>
                          <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sim">Sim</SelectItem>
                            <SelectItem value="nao">Não</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-rose-500 flex items-center gap-1"><Heart className="h-3 w-3" />Pedido de oração</label>
                        <Textarea className="border-rose-200" value={oracoes[visita.id] ?? ""} onChange={(event) => setOracoes((current) => ({ ...current, [visita.id]: event.target.value }))} />
                      </div>
                      <Button className="w-full" disabled={savingId === visita.id || !isRelatoCompleto(visita.id)} onClick={() => void handleComplete(visita.id)}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />{savingId === visita.id ? "Registrando…" : "Marcar como realizada"}
                      </Button>
                      <Button variant="outline" className="w-full text-muted-foreground bg-muted/50 hover:bg-muted" onClick={() => setNaoRealizadaModo((current) => ({ ...current, [visita.id]: true }))}>
                        <XCircle className="mr-2 h-4 w-4" />A visita não foi realizada
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs text-destructive">Motivo da visita não realizada<span className="text-rose-600"> *</span></label>
                        <Textarea
                          className="border-destructive/40"
                          placeholder="Ex.: ninguém estava em casa, endereço não encontrado…"
                          value={motivos[visita.id] ?? ""}
                          onChange={(event) => setMotivos((current) => ({ ...current, [visita.id]: event.target.value }))}
                          required
                        />
                      </div>
                      <Button variant="destructive" className="w-full" disabled={savingId === visita.id || !(motivos[visita.id] ?? "").trim()} onClick={() => void handleNaoRealizada(visita.id)}>
                        <XCircle className="mr-2 h-4 w-4" />{savingId === visita.id ? "Registrando…" : "Registrar como não realizada"}
                      </Button>
                      <Button variant="ghost" className="w-full" onClick={() => setNaoRealizadaModo((current) => ({ ...current, [visita.id]: false }))}>
                        Cancelar
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>

        {naoRealizadas.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-serif font-semibold flex items-center gap-2"><XCircle className="h-4 w-4 text-destructive" />Não realizadas</h2>
            {naoRealizadas.map((visita) => (
              <Card key={visita.id} className="opacity-90">
                <CardContent className="py-3 px-4">
                  <p className="text-sm font-medium">{getPessoa(visita.pessoaId)?.nome ?? "—"}</p>
                  {visita.motivoNaoRealizada && <p className="text-xs text-muted-foreground mt-1">{visita.motivoNaoRealizada}</p>}
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {realizadas.length > 0 && (
          <section className="space-y-3"><h2 className="text-base font-serif font-semibold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" />Realizadas</h2>{realizadas.map((visita) => <Card key={visita.id} className="opacity-75"><CardContent className="py-3 px-4 space-y-1"><p className="text-sm font-medium">{getPessoa(visita.pessoaId)?.nome ?? "—"}</p><Badge variant={visita.cestaEntregue ? "secondary" : "outline"}>{visita.cestaEntregue ? "Cesta entregue" : "Cesta não entregue"}</Badge>{visita.observacoes && <p className="text-xs text-muted-foreground mt-1">{visita.observacoes}</p>}{visita.pedidoOracao && <p className="text-xs text-rose-500 mt-1 flex gap-1"><Heart className="h-3 w-3" />{visita.pedidoOracao}</p>}</CardContent></Card>)}</section>        )}
      </main>
    </div>
  );
}