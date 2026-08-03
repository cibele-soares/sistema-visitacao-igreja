import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { type Grupo, useAppData } from "@/context/AppData";
import { errorMessage } from "@/lib/error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function GruposPage() {
  const { grupos, voluntarios, salvarGrupo, excluirGrupo } = useAppData();
  const [nome, setNome] = useState("");
  const [selectedVols, setSelectedVols] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleVol = (id: string) => {
    setSelectedVols((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };

  const handleAdd = async () => {
    if (nome.trim().length < 2) {
      toast.error("Informe um nome válido para o grupo.");
      return;
    }
    const grupo: Grupo = { id: crypto.randomUUID(), nome: nome.trim(), liderId: "", voluntarioIds: selectedVols };
    setSaving(true);
    try {
      await salvarGrupo(grupo);
      setNome("");
      setSelectedVols([]);
      toast.success("Grupo criado.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await excluirGrupo(id);
      toast.success("Grupo removido.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const getVolName = (id: string) => voluntarios.find((voluntario) => voluntario.id === id)?.nome ?? "—";

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-serif font-bold">Montagem dos Grupos</h1><p className="text-muted-foreground">Organize os voluntários em grupos de visitação.</p></div>
      <Card>
        <CardHeader><CardTitle className="font-serif text-lg">Novo Grupo</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label>Nome do Grupo *</Label><Input value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Ex: Grupo 1" /></div>
          {voluntarios.length > 0 && (
            <div className="space-y-2">
              <Label>Voluntários</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {voluntarios.map((voluntario) => (
                  <label key={voluntario.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={selectedVols.includes(voluntario.id)} onCheckedChange={() => toggleVol(voluntario.id)} />
                    {voluntario.nome}
                  </label>
                ))}
              </div>
            </div>
          )}
          <Button onClick={() => void handleAdd()} disabled={saving}><Plus className="mr-2 h-4 w-4" />{saving ? "Criando…" : "Criar Grupo"}</Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {grupos.map((grupo) => (
          <Card key={grupo.id}>
            <CardHeader className="flex flex-row items-start justify-between"><CardTitle className="font-serif text-lg">{grupo.nome}</CardTitle><Button variant="ghost" size="icon" onClick={() => void handleRemove(grupo.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {grupo.voluntarioIds.length === 0 && <span className="text-sm text-muted-foreground">Sem voluntários</span>}
                {grupo.voluntarioIds.map((id) => <Badge key={id} variant="secondary">{getVolName(id)}</Badge>)}
              </div>
              {grupo.liderId && <p className="mt-2 text-sm text-accent font-semibold">Líder: {getVolName(grupo.liderId)}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
