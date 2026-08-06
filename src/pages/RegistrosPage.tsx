import { useEffect, useState } from "react";
import { Check, Heart, Save, XCircle } from "lucide-react";
import { toast } from "sonner";
import { type Visita, useAppData } from "@/context/AppData";
import { errorMessage } from "@/lib/error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Draft {
  dataVisita: string;
  observacoes: string;
  pedidoOracao: string;
  cestaEntregue: "" | "sim" | "nao";
}

function Required() {
  return <span className="text-rose-600"> *</span>;
}

export default function RegistrosPage() {
  const { visitas, pessoas, grupos, atualizarVisita, finalizarVisita, marcarVisitaNaoRealizada, reabrirVisita } = useAppData();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [naoRealizadaModo, setNaoRealizadaModo] = useState<Record<string, boolean>>({});
  const [motivos, setMotivos] = useState<Record<string, string>>({});

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current };
      for (const visita of visitas) {
        if (!next[visita.id]) {
          next[visita.id] = {
            dataVisita: visita.dataVisita,
            observacoes: visita.observacoes,
            pedidoOracao: visita.pedidoOracao,
            cestaEntregue: "",
          };
        }
      }
      return next;
    });
  }, [visitas]);

  const getPessoaNome = (id: string) => pessoas.find((pessoa) => pessoa.id === id)?.nome ?? "—";
  const getGrupoNome = (id: string) => grupos.find((grupo) => grupo.id === id)?.nome ?? "—";
  const getDraft = (visita: Visita): Draft => drafts[visita.id] ?? { dataVisita: visita.dataVisita, observacoes: visita.observacoes, pedidoOracao: visita.pedidoOracao, cestaEntregue: "" };

  const updateDraft = (id: string, field: keyof Draft, value: string) => {
    setDrafts((current) => ({ ...current, [id]: { ...(current[id] ?? { dataVisita: "", observacoes: "", pedidoOracao: "", cestaEntregue: "" }), [field]: value } }));
  };

  const isDraftCompleto = (draft: Draft) =>
    draft.dataVisita.trim() !== "" && draft.observacoes.trim() !== "" && draft.cestaEntregue !== "";
  const saveDraft = async (visita: Visita) => {
    const draft = getDraft(visita);
    setSavingId(visita.id);
    try {
      await atualizarVisita({ ...visita, dataVisita: draft.dataVisita, observacoes: draft.observacoes, pedidoOracao: draft.pedidoOracao, cestaEntregue: draft.cestaEntregue === "sim" });
      toast.success("Registro salvo.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSavingId(null);
    }
  };

  const complete = async (visita: Visita) => {
    const draft = getDraft(visita);
    if (!isDraftCompleto(draft)) {
      toast.error("Preencha data, relato e se a cesta foi entregue antes de concluir.");
      return;
    }
    setSavingId(visita.id);
    try {
      await finalizarVisita(visita.id, draft.dataVisita, draft.observacoes, draft.pedidoOracao, draft.cestaEntregue === "sim");
      toast.success("Visita concluída e registrada.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSavingId(null);
    }
  };

  const registrarNaoRealizada = async (visita: Visita) => {
    const motivo = (motivos[visita.id] ?? "").trim();
    if (!motivo) {
      toast.error("Informe o motivo da visita não realizada.");
      return;
    }
    setSavingId(visita.id);
    try {
      await marcarVisitaNaoRealizada(visita.id, motivo);
      setMotivos((current) => {
        const next = { ...current };
        delete next[visita.id];
        return next;
      });
      setNaoRealizadaModo((current) => ({ ...current, [visita.id]: false }));
      toast.success("Visita registrada como não realizada.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSavingId(null);
    }
  };

  const desfazer = async (visita: Visita) => {
    setSavingId(visita.id);
    try {
      await reabrirVisita(visita.id);
      setDrafts((current) => {
        const next = { ...current };
        delete next[visita.id];
        return next;
      });
      toast.success("Visita marcada como pendente.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSavingId(null);
    }
  };

  if (visitas.length === 0) {
    return <div className="space-y-6"><h1 className="text-2xl font-serif font-bold">Registro das Visitas</h1><p className="text-muted-foreground">Nenhuma visita agendada ainda.</p></div>;
  }

  const pendentes = visitas.filter((visita) => !visita.realizada && !visita.naoRealizada);
  const naoRealizadas = visitas.filter((visita) => visita.naoRealizada && !visita.realizada);
  const realizadas = visitas.filter((visita) => visita.realizada);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-serif font-bold">Registro das Visitas</h1><p className="text-muted-foreground">Os textos ficam locais até você clicar em salvar ou concluir.</p></div>

      {pendentes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-serif font-semibold">Pendentes ({pendentes.length})</h2>
          {pendentes.map((visita) => {
            const draft = getDraft(visita);
            const modoNaoRealizada = naoRealizadaModo[visita.id] ?? false;
            return (
              <Card key={visita.id}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap"><Badge variant="outline">{getGrupoNome(visita.grupoId)}</Badge><span>→</span><span className="font-medium text-sm">{getPessoaNome(visita.pessoaId)}</span></div>

                  {!modoNaoRealizada ? (
                    <>
                      <div className="space-y-1"><Label className="text-xs">Data da visita<Required /></Label><Input type="date" value={draft.dataVisita} onChange={(event) => updateDraft(visita.id, "dataVisita", event.target.value)} required /></div>
                      <div className="space-y-1"><Label className="text-xs">Relato<Required /></Label><Textarea value={draft.observacoes} onChange={(event) => updateDraft(visita.id, "observacoes", event.target.value)} rows={3} placeholder="Como foi a visita…" required /></div>
                      <div className="space-y-1">
                        <Label className="text-xs">Cesta entregue?<Required /></Label>
                        <Select value={draft.cestaEntregue} onValueChange={(value) => updateDraft(visita.id, "cestaEntregue", value)}>
                          <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sim">Sim</SelectItem>
                            <SelectItem value="nao">Não</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1"><Label className="text-xs flex items-center gap-1 text-rose-600"><Heart className="h-3 w-3" /> Pedido de oração</Label><Textarea value={draft.pedidoOracao} onChange={(event) => updateDraft(visita.id, "pedidoOracao", event.target.value)} rows={2} className="border-rose-200" /></div>
                      {visita.cestaItens.length > 0 && <div className="flex flex-wrap gap-1">{visita.cestaItens.map((item) => <Badge key={item.alimentoId} variant="secondary">{item.quantidade} {item.unidade} {item.nome}</Badge>)}</div>}
                      <div className="flex gap-2 flex-wrap items-center justify-between">
                        <div className="flex gap-2 flex-wrap">
                          <Button variant="outline" size="sm" disabled={savingId === visita.id} onClick={() => void saveDraft(visita)}><Save className="mr-1.5 h-4 w-4" />Salvar rascunho</Button>
                          <Button size="sm" disabled={savingId === visita.id || !isDraftCompleto(draft)} onClick={() => void complete(visita)}><Check className="mr-1.5 h-4 w-4" />Concluir visita</Button>
                        </div>
                        <Button variant="outline" size="sm" className="text-muted-foreground bg-muted/50 hover:bg-muted" onClick={() => setNaoRealizadaModo((current) => ({ ...current, [visita.id]: true }))}>
                          <XCircle className="mr-1.5 h-4 w-4" />A visita não foi realizada
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs text-destructive">Motivo da visita não realizada<Required /></Label>
                        <Textarea
                          value={motivos[visita.id] ?? ""}
                          onChange={(event) => setMotivos((current) => ({ ...current, [visita.id]: event.target.value }))}
                          rows={3}
                          placeholder="Ex.: ninguém estava em casa, endereço não encontrado…"
                          className="border-destructive/40"
                          required
                        />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="destructive" size="sm" disabled={savingId === visita.id || !(motivos[visita.id] ?? "").trim()} onClick={() => void registrarNaoRealizada(visita)}>
                          <XCircle className="mr-1.5 h-4 w-4" />Registrar como não realizada
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setNaoRealizadaModo((current) => ({ ...current, [visita.id]: false }))}>
                          Cancelar
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {naoRealizadas.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-serif font-semibold">Não realizadas ({naoRealizadas.length})</h2>
          {naoRealizadas.map((visita) => (
            <Card key={visita.id} className="border-destructive/30 bg-destructive/5">
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="destructive">✕ Não realizada</Badge>
                  <Badge variant="outline">{getGrupoNome(visita.grupoId)}</Badge>
                  <span>→</span>
                  <span className="font-medium text-sm">{getPessoaNome(visita.pessoaId)}</span>
                  {visita.dataVisita && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(`${visita.dataVisita}T00:00:00`).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
                {visita.motivoNaoRealizada && <p className="text-sm text-muted-foreground">{visita.motivoNaoRealizada}</p>}
                <Button size="sm" variant="outline" disabled={savingId === visita.id} onClick={() => void desfazer(visita)}>
                  Marcar como pendente
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {realizadas.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-serif font-semibold">
            Realizadas ({realizadas.length})
          </h2>

          {realizadas.map((visita) => (
            <Card key={visita.id} className="border-success/30 bg-success/5">
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-success text-success-foreground">
                    ✓ Realizada
                  </Badge>

                  <Badge variant="outline">
                    {getGrupoNome(visita.grupoId)}
                  </Badge>

                  <span>→</span>

                  <span className="font-medium text-sm">
                    {getPessoaNome(visita.pessoaId)}
                  </span>

                  {visita.dataVisita && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(`${visita.dataVisita}T00:00:00`).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>

                <Badge variant={visita.cestaEntregue ? "secondary" : "outline"}>
                  {visita.cestaEntregue ? "Cesta entregue" : "Cesta não entregue"}
                </Badge>

                {visita.observacoes && (
                  <p className="text-sm text-muted-foreground">
                    {visita.observacoes}
                  </p>
                )}

                {visita.pedidoOracao && (
                  <p className="text-xs text-rose-600 bg-rose-50 rounded px-2 py-1.5 flex items-start gap-1.5">
                    <Heart className="h-3 w-3 mt-0.5 shrink-0" />
                    {visita.pedidoOracao}
                  </p>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void desfazer(visita)}
                >
                  Marcar como pendente
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}