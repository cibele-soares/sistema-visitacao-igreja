import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "@/context/AppData";
import { errorMessage } from "@/lib/error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,} from "@/components/ui/select";

export default function AlimentosPage() {
  const { alimentos, criarAlimento, excluirAlimento } = useAppData();
  const [nome, setNome] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [unidade, setUnidade] = useState("kg");
  const [saving, setSaving] = useState(false);
  const [casaOracao, setCasaOracao] = useState("");
  const CASAS_ORACAO: { cidade: string; casas: string[] }[] = [
  {
    cidade: "Amparo",
    casas: [
      "Amparo - Centro",
      "Distrito Arcadas",
      "Fazenda Campineiro",
      "Jardim Brasil",
      "Jardim das Aves",
      "Jardim São Dimas",
      "Vale Verde",
    ],
  },
  {
    cidade: "Monte Alegre do Sul",
    casas: ["Jardim Vitória", "Mostardas", "Ponte Alta", "Três Pontes"],
  },
];

  const handleAdd = async () => {
    const value = Number(quantidade);
    if (!nome.trim() || !Number.isFinite(value) || value < 0 || !unidade.trim() || !casaOracao.trim()) {
      toast.error("Informe nome, quantidade válida, unidade e casa de oração.");
      return;
    }

    setSaving(true);
    try {
      await criarAlimento({
        nome: nome.trim(),
        quantidade: value,
        unidade: unidade.trim(),
        dataEntrada: new Date().toISOString().slice(0, 10),
        casaOracao: casaOracao.trim(),
      });
      setNome("");
      setQuantidade("");
      setCasaOracao("");
      toast.success("Alimento adicionado.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await excluirAlimento(id);
      toast.success("Alimento removido.");
    } catch (error) {
      toast.error(errorMessage(error, "Este alimento pode estar associado a uma cesta."));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold">Controle de Alimentos</h1>
        <p className="text-muted-foreground">Registre o estoque disponível para as cestas.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-serif text-lg">Novo Alimento</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-1.5"><Label>Alimento *</Label><Input value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Ex: Arroz" /></div>
          <div className="space-y-1.5"><Label>Quantidade *</Label><Input min={0} step="any" type="number" value={quantidade} onChange={(event) => setQuantidade(event.target.value)} placeholder="0" /></div>
          <div className="space-y-1.5"><Label>Unidade *</Label><Input value={unidade} onChange={(event) => setUnidade(event.target.value)} placeholder="kg, un, pct" /></div>
          <div className="space-y-1.5">
            <Label>Casa de Oração *</Label>
            <Select value={casaOracao} onValueChange={setCasaOracao}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a casa de oração" />
              </SelectTrigger>
              <SelectContent>
                {CASAS_ORACAO.map((grupo) => (
                  <SelectGroup key={grupo.cidade}>
                    <SelectLabel>{grupo.cidade}</SelectLabel>
                    {grupo.casas.map((casa) => (
                      <SelectItem key={casa} value={casa}>
                        {casa}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-4"><Button onClick={() => void handleAdd()} disabled={saving}><Plus className="mr-2 h-4 w-4" />{saving ? "Adicionando…" : "Adicionar"}</Button></div>
        </CardContent>
      </Card>

      {alimentos.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
            <TableHeader><TableRow><TableHead>Alimento</TableHead><TableHead>Qtd.</TableHead><TableHead className="hidden sm:table-cell">Unidade</TableHead><TableHead className="hidden sm:table-cell">Casa de Oração</TableHead><TableHead className="hidden sm:table-cell">Entrada</TableHead><TableHead className="hidden sm:table-cell">Cadastrado por</TableHead><TableHead className="w-12" /></TableRow></TableHeader>              <TableBody>
                {alimentos.map((alimento) => (
                  <TableRow key={alimento.id}>
                    <TableCell className="font-medium">{alimento.nome}</TableCell>
                    <TableCell>{alimento.quantidade}</TableCell>
                    <TableCell className="hidden sm:table-cell">{alimento.unidade}</TableCell>
                    <TableCell className="hidden sm:table-cell">{alimento.casaOracao}</TableCell>
                    <TableCell className="hidden sm:table-cell">{new Date(`${alimento.dataEntrada}T00:00:00`).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{alimento.inseridoPorNome}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => void handleRemove(alimento.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
