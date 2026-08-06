import { useState } from "react";
import { CheckCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "@/context/AppData";
import { errorMessage } from "@/lib/error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function VisitasPage() {
  const { visitas, grupos, pessoas, criarVisita, excluirVisita, finalizarVisita } = useAppData();
  const [grupoId, setGrupoId] = useState("");
  const [pessoaId, setPessoaId] = useState("");
  const [saving, setSaving] = useState(false);

  const pessoasJaDistribuidas = new Set(
    visitas.map((visita) => visita.pessoaId)
  );

  const pessoasDisponiveis = pessoas.filter(
    (pessoa) => !pessoasJaDistribuidas.has(pessoa.id)
  );

  const handleAdd = async () => {
    if (!grupoId || !pessoaId) {
      toast.error("Selecione o grupo e a pessoa.");
      return;
    }
    setSaving(true);
    try {
      await criarVisita({
        grupoId, pessoaId, dataVisita: "", observacoes: "", pedidoOracao: "",
        cestaEntregue: false
      });
      setPessoaId("");
      toast.success("Visita atribuída.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async (id: string) => {
    try {
    await finalizarVisita(id, new Date().toISOString().slice(0, 10), "", "", false);
      toast.success("Visita marcada como realizada.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await excluirVisita(id);
      toast.success("Visita removida.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const getGrupoNome = (id: string) => grupos.find((grupo) => grupo.id === id)?.nome ?? "—";
  const getPessoa = (id: string) => pessoas.find((pessoa) => pessoa.id === id);

  return (
    <div className="space-y-6 pb-12">
      <div><h1 className="text-2xl font-serif font-bold">Distribuição das Visitas</h1><p className="text-muted-foreground">Defina qual grupo visitará cada pessoa.</p></div>
      <Card>
        <CardHeader><CardTitle className="font-serif text-lg">Nova Atribuição</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Grupo *</Label><Select value={grupoId} onValueChange={setGrupoId}><SelectTrigger><SelectValue placeholder="Selecionar grupo" /></SelectTrigger><SelectContent>{grupos.map((grupo) => <SelectItem key={grupo.id} value={grupo.id}>{grupo.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Pessoa *</Label><Select value={pessoaId} onValueChange={setPessoaId}><SelectTrigger><SelectValue placeholder="Selecionar pessoa" /></SelectTrigger><SelectContent>{pessoasDisponiveis.map((pessoa) => (<SelectItem key={pessoa.id} value={pessoa.id}>{pessoa.nome}</SelectItem>))}</SelectContent></Select></div>
          <div className="sm:col-span-2"><Button onClick={() => void handleAdd()} disabled={saving}><Plus className="mr-2 h-4 w-4" />{saving ? "Atribuindo…" : "Atribuir Visita"}</Button></div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {visitas.map((visita) => {
          const pessoa = getPessoa(visita.pessoaId);
          return (
            <Card key={visita.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-xs text-muted-foreground font-semibold">{getGrupoNome(visita.grupoId)}</p><p className="font-bold">{pessoa?.nome ?? "—"}</p><p className="text-sm text-muted-foreground">{pessoa?.endereco}</p></div>
                    <Badge variant={visita.realizada ? "default" : visita.naoRealizada ? "destructive" : "outline"}>
                      {visita.realizada ? "Realizada" : visita.naoRealizada ? "Não realizada" : "Pendente"}
                    </Badge>                
                  </div>
                <div className="flex gap-2 flex-wrap">
                  {!visita.realizada && <Button size="sm" onClick={() => void handleFinish(visita.id)}><CheckCircle className="mr-1.5 h-4 w-4" />Concluir</Button>}
                  <Button size="sm" variant="outline" onClick={() => void handleRemove(visita.id)}><Trash2 className="mr-1.5 h-4 w-4" />Remover</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
