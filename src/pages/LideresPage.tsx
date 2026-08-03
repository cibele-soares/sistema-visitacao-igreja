import { Crown } from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "@/context/AppData";
import { errorMessage } from "@/lib/error";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LideresPage() {
  const { grupos, voluntarios, salvarGrupo } = useAppData();

  const setLider = async (grupoId: string, liderId: string) => {
    const grupo = grupos.find((item) => item.id === grupoId);
    if (!grupo) return;
    try {
      await salvarGrupo({
        ...grupo,
        liderId,
        voluntarioIds: grupo.voluntarioIds.includes(liderId) ? grupo.voluntarioIds : [...grupo.voluntarioIds, liderId],
      });
      toast.success("Líder atualizado.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const getVolName = (id: string) => voluntarios.find((voluntario) => voluntario.id === id)?.nome ?? "—";

  if (grupos.length === 0) {
    return <div className="space-y-6"><h1 className="text-2xl font-serif font-bold">Escolha dos Líderes</h1><p className="text-muted-foreground">Crie grupos primeiro para definir líderes.</p></div>;
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-serif font-bold">Escolha dos Líderes</h1><p className="text-muted-foreground">Defina o líder de cada grupo de visitação.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        {grupos.map((grupo) => (
          <Card key={grupo.id}>
            <CardHeader><CardTitle className="font-serif text-lg flex items-center gap-2"><Crown className="h-5 w-5 text-accent" />{grupo.nome}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {grupo.voluntarioIds.map((id) => <Badge key={id} variant={id === grupo.liderId ? "default" : "secondary"}>{getVolName(id)}</Badge>)}
              </div>
              <Select value={grupo.liderId || undefined} onValueChange={(value) => void setLider(grupo.id, value)}>
                <SelectTrigger><SelectValue placeholder="Selecionar líder" /></SelectTrigger>
                <SelectContent>{grupo.voluntarioIds.map((id) => <SelectItem key={id} value={id}>{getVolName(id)}</SelectItem>)}</SelectContent>
              </Select>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
