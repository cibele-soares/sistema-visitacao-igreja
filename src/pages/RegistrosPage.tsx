import { useEffect, useState } from "react";
import { Check, Heart, Save } from "lucide-react";
import { toast } from "sonner";
import { type Visita, useAppData } from "@/context/AppData";
import { errorMessage } from "@/lib/error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Draft {
  dataVisita: string;
  observacoes: string;
  pedidoOracao: string;
}

export default function RegistrosPage() {
  const { visitas, pessoas, grupos, atualizarVisita, finalizarVisita } = useAppData();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current };
      for (const visita of visitas) {
        if (!next[visita.id]) {
          next[visita.id] = {
            dataVisita: visita.dataVisita,
            observacoes: visita.observacoes,
            pedidoOracao: visita.pedidoOracao,
          };
        }
      }
      return next;
    });
  }, [visitas]);

  const getPessoaNome = (id: string) => pessoas.find((pessoa) => pessoa.id === id)?.nome ?? "—";
  const getGrupoNome = (id: string) => grupos.find((grupo) => grupo.id === id)?.nome ?? "—";
  const getDraft = (visita: Visita): Draft => drafts[visita.id] ?? { dataVisita: visita.dataVisita, observacoes: visita.observacoes, pedidoOracao: visita.pedidoOracao };

  const updateDraft = (id: string, field: keyof Draft, value: string) => {
    setDrafts((current) => ({ ...current, [id]: { ...(current[id] ?? { dataVisita: "", observacoes: "", pedidoOracao: "" }), [field]: value } }));
  };

  const saveDraft = async (visita: Visita) => {
    const draft = getDraft(visita);
    setSavingId(visita.id);
    try {
      await atualizarVisita({ ...visita, ...draft });
      toast.success("Registro salvo.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSavingId(null);
    }
  };

  const complete = async (visita: Visita) => {
    const draft = getDraft(visita);
    setSavingId(visita.id);
    try {
      await finalizarVisita(visita.id, draft.dataVisita || new Date().toISOString().slice(0, 10), draft.observacoes, draft.pedidoOracao);
      toast.success("Visita concluída e registrada.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSavingId(null);
    }
  };

  const desfazerRealizada = async (visita: Visita) => {
  try {
    await atualizarVisita({
      ...visita,
      realizada: false,
      dataVisita: "",
      observacoes: "",
      pedidoOracao: "",
    });

    setDrafts((current) => {
      const next = { ...current };
      delete next[visita.id];
      return next;
    });

    toast.success("Visita marcada como pendente.");
  } catch (error) {
    toast.error(errorMessage(error));
  }
};

  if (visitas.length === 0) {
    return <div className="space-y-6"><h1 className="text-2xl font-serif font-bold">Registro das Visitas</h1><p className="text-muted-foreground">Nenhuma visita agendada ainda.</p></div>;
  }

  const pendentes = visitas.filter((visita) => !visita.realizada);
  const realizadas = visitas.filter((visita) => visita.realizada);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-serif font-bold">Registro das Visitas</h1><p className="text-muted-foreground">Os textos ficam locais até você clicar em salvar ou concluir.</p></div>

      {pendentes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-serif font-semibold">Pendentes ({pendentes.length})</h2>
          {pendentes.map((visita) => {
            const draft = getDraft(visita);
            return (
              <Card key={visita.id}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap"><Badge variant="outline">{getGrupoNome(visita.grupoId)}</Badge><span>→</span><span className="font-medium text-sm">{getPessoaNome(visita.pessoaId)}</span></div>
                  <div className="space-y-1"><Label className="text-xs">Data da visita</Label><Input type="date" value={draft.dataVisita} onChange={(event) => updateDraft(visita.id, "dataVisita", event.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Relato</Label><Textarea value={draft.observacoes} onChange={(event) => updateDraft(visita.id, "observacoes", event.target.value)} rows={3} placeholder="Como foi a visita…" /></div>
                  <div className="space-y-1"><Label className="text-xs flex items-center gap-1 text-rose-600"><Heart className="h-3 w-3" /> Pedido de oração</Label><Textarea value={draft.pedidoOracao} onChange={(event) => updateDraft(visita.id, "pedidoOracao", event.target.value)} rows={2} className="border-rose-200" /></div>
                  {visita.cestaItens.length > 0 && <div className="flex flex-wrap gap-1">{visita.cestaItens.map((item) => <Badge key={item.alimentoId} variant="secondary">{item.quantidade} {item.unidade} {item.nome}</Badge>)}</div>}
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" disabled={savingId === visita.id} onClick={() => void saveDraft(visita)}><Save className="mr-1.5 h-4 w-4" />Salvar rascunho</Button>
                    <Button size="sm" disabled={savingId === visita.id} onClick={() => void complete(visita)}><Check className="mr-1.5 h-4 w-4" />Concluir visita</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
                  onClick={() => void desfazerRealizada(visita)}
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