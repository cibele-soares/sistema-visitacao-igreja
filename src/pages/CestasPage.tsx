import { useState } from "react";
import { toast } from "sonner";
import { useAppData } from "@/context/AppData";
import { errorMessage } from "@/lib/error";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export default function CestasPage() {
  const { visitas, alimentos, pessoas, grupos, definirItemCesta } = useAppData();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const getPessoaNome = (id: string) => pessoas.find((pessoa) => pessoa.id === id)?.nome ?? "—";
  const getGrupoNome = (id: string) => grupos.find((grupo) => grupo.id === id)?.nome ?? "—";

  const saveItem = async (visitaId: string, alimentoId: string, quantidade: number) => {
    const key = `${visitaId}:${alimentoId}`;
    setBusyKey(key);
    try {
      await definirItemCesta(visitaId, alimentoId, quantidade);
      toast.success(quantidade > 0 ? "Cesta atualizada." : "Item removido da cesta.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyKey(null);
    }
  };

  if (visitas.length === 0) {
    return <div className="space-y-6"><h1 className="text-2xl font-serif font-bold">Organização das Cestas</h1><p className="text-muted-foreground">Crie visitas primeiro para organizar as cestas.</p></div>;
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-serif font-bold">Organização das Cestas</h1><p className="text-muted-foreground">Selecione itens e quantidades. O banco impede reservas acima do estoque.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        {visitas.map((visita) => (
          <Card key={visita.id} className={visita.realizada ? "opacity-70" : ""}>
            <CardHeader>
              <CardTitle className="font-serif text-base">Cesta para {getPessoaNome(visita.pessoaId)}</CardTitle>
              <div className="flex gap-2"><Badge variant="outline">{getGrupoNome(visita.grupoId)}</Badge>{visita.realizada && <Badge>Entregue</Badge>}</div>
            </CardHeader>
            <CardContent>
              {alimentos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum alimento cadastrado.</p> : (
                <div className="space-y-3">
                  {alimentos.map((alimento) => {
                    const item = visita.cestaItens.find((current) => current.alimentoId === alimento.id);
                    const key = `${visita.id}:${alimento.id}`;
                    const draftValue = drafts[key] ?? String(item?.quantidade ?? 1);
                    return (
                      <div key={alimento.id} className="flex items-center gap-3 rounded-md border p-2">
                        <Checkbox
                          checked={Boolean(item)}
                          disabled={visita.realizada || busyKey === key || alimento.quantidade <= 0}
                          onCheckedChange={(checked) => void saveItem(visita.id, alimento.id, checked ? 1 : 0)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{alimento.nome}</p>
                          <p className="text-xs text-muted-foreground">Estoque atual: {alimento.quantidade} {alimento.unidade}</p>
                        </div>
                        {item && (
                          <Input
                            className="w-20"
                            type="number"
                            min={1}
                            step={1}
                            disabled={visita.realizada || busyKey === key}
                            value={draftValue}
                            onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))}
                            onBlur={() => {
                              const quantidade = Math.max(1, Number.parseInt(draftValue, 10) || 1);
                              setDrafts((current) => ({ ...current, [key]: String(quantidade) }));
                              if (quantidade !== item.quantidade) void saveItem(visita.id, alimento.id, quantidade);
                            }}
                            aria-label={`Quantidade de ${alimento.nome}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {visita.cestaItens.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {visita.cestaItens.map((item) => <Badge key={item.alimentoId} variant="secondary">{item.quantidade} {item.unidade} de {item.nome}</Badge>)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
