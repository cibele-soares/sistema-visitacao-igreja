import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Crown, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { type Voluntario, useAppData } from "@/context/AppData";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { generateAccessCode } from "@/lib/access-code";
import { errorMessage } from "@/lib/error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { CASAS_ORACAO } from "@/lib/casas-oracao";

type Solicitacao = Tables<"voluntarios_pendentes">;

type Form = { nome: string; telefone: string; disponibilidade: string; casaOracao: string; podeControlarAlimentos: boolean; possuiCarro: boolean };
const emptyForm: Form = { nome: "", telefone: "", disponibilidade: "", casaOracao: "", podeControlarAlimentos: false, possuiCarro: false };

const DATAS_EVENTO = [
  { valor: "2026-09-26", label: "26/09" },
  { valor: "2026-09-27", label: "27/09" },
];

function CasaOracaoSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
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
  );
}

function formatarTelefone(valor: string): string {
  const nums = valor.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 2)  return nums.length ? `(${nums}` : "";
  if (nums.length <= 7)  return `(${nums.slice(0,2)}) ${nums.slice(2)}`;
  if (nums.length <= 10) return `(${nums.slice(0,2)}) ${nums.slice(2,6)}-${nums.slice(6)}`;
  return `(${nums.slice(0,2)}) ${nums.slice(2,7)}-${nums.slice(7)}`;
}

function telefoneValido(tel: string): boolean {
  return /^\(\d{2}\) \d{4,5}-\d{4}$/.test(tel);
}

function PresencaTab() {
  const { voluntarios } = useAppData();
  const [data, setData] = useState(DATAS_EVENTO[0].valor);
  const [presencas, setPresencas] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadPresencas = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await supabase.from("presencas").select("*").eq("data", data);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    const map: Record<string, boolean> = {};
    for (const row of rows ?? []) map[row.voluntario_id] = row.presente;
    setPresencas(map);
  }, [data]);

  useEffect(() => { void loadPresencas(); }, [loadPresencas]);

  const toggle = async (voluntarioId: string, checked: boolean) => {
    setSavingId(voluntarioId);
    const previous = presencas[voluntarioId];
    setPresencas((current) => ({ ...current, [voluntarioId]: checked }));
    const { error } = await supabase
      .from("presencas")
      .upsert({ voluntario_id: voluntarioId, data, presente: checked }, { onConflict: "voluntario_id,data" });
    setSavingId(null);
    if (error) {
      toast.error("Erro ao salvar presença.");
      setPresencas((current) => ({ ...current, [voluntarioId]: previous ?? false }));
    }
  };

  const porCasa = CASAS_ORACAO.map((grupo) => ({
    cidade: grupo.cidade,
    casas: grupo.casas
      .map((casa) => ({ nome: casa, voluntarios: voluntarios.filter((v) => v.casaOracao === casa) }))
      .filter((c) => c.voluntarios.length > 0),
  })).filter((g) => g.casas.length > 0);

  const totalPresentes = Object.values(presencas).filter(Boolean).length;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Label>Data</Label>
        <div className="flex gap-2">
          {DATAS_EVENTO.map((opcao) => (
            <Button key={opcao.valor} size="sm" variant={data === opcao.valor ? "default" : "outline"} onClick={() => setData(opcao.valor)}>
              {opcao.label}
            </Button>
          ))}
        </div>
        <Badge variant="outline" className="ml-auto">Presentes: {totalPresentes}/{voluntarios.length}</Badge>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : porCasa.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum voluntário com casa de oração definida.</p>
      ) : (
        porCasa.map((grupo) => (
          <div key={grupo.cidade} className="space-y-3">
            <h3 className="text-sm font-serif font-semibold text-muted-foreground">{grupo.cidade}</h3>
            {grupo.casas.map((casa) => (
              <Card key={casa.nome}>
                <CardHeader className="py-3"><CardTitle className="text-sm font-medium">{casa.nome}</CardTitle></CardHeader>
                <CardContent className="space-y-2 pb-4">
                  {casa.voluntarios.map((voluntario) => (
                    <label key={voluntario.id} className="flex items-center gap-3 py-1.5 cursor-pointer">
                      <Checkbox
                        checked={Boolean(presencas[voluntario.id])}
                        disabled={savingId === voluntario.id}
                        onCheckedChange={(checked) => void toggle(voluntario.id, checked === true)}
                      />
                      <span className="text-sm">{voluntario.nome}</span>
                    </label>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

export default function VoluntariosPage() {
  const { voluntarios, criarVoluntario, atualizarVoluntario, excluirVoluntario, refresh } = useAppData();
  const [form, setForm] = useState<Form>(emptyForm);
  const [editing, setEditing] = useState<Voluntario | null>(null);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loadingSol, setLoadingSol] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPending = async () => {
    setLoadingSol(true);
    const { data, error } = await supabase.from("voluntarios_pendentes").select("*").order("created_at", { ascending: false });
    setLoadingSol(false);
    if (error) { toast.error(error.message); return; }
    setSolicitacoes(data ?? []);
  };
  useEffect(() => { void loadPending(); }, []);

  const add = async () => {
  if (!form.nome.trim() || !telefoneValido(form.telefone) || !form.disponibilidade.trim() || !form.casaOracao.trim()) {
    toast.error("Preencha nome, telefone válido, disponibilidade e casa de oração.");
    return;
  }
  setSaving(true);
  try {
    const created = await criarVoluntario({ ...form, codigo: generateAccessCode() });
    setForm(emptyForm);
    toast.success(`Voluntário criado. Código: ${created.codigo}`);
  } catch (error) { toast.error(errorMessage(error)); } finally { setSaving(false); }
  };

  const approve = async (item: Solicitacao) => {
    const codigo = generateAccessCode();
    const { error } = await supabase.rpc("aprovar_voluntario_pendente", { p_id: item.id, p_codigo: codigo });
    if (error) { toast.error(error.message); return; }
    setSolicitacoes((current) => current.filter((value) => value.id !== item.id));
    await refresh();
    toast.success(`${item.nome} aprovado. Código: ${codigo}`);
  };

  const reject = async (id: string) => {
    const { error } = await supabase.from("voluntarios_pendentes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setSolicitacoes((current) => current.filter((item) => item.id !== id));
    toast.info("Solicitação removida.");
  };

  const remove = async (id: string) => {
    try { await excluirVoluntario(id); toast.success("Voluntário removido."); } catch (error) { toast.error(errorMessage(error)); }
  };

  const saveEdit = async () => {
  if (!editing?.nome.trim() || !telefoneValido(editing.telefone) || !editing.disponibilidade.trim() || !editing.casaOracao.trim()) {
    toast.error("Preencha nome, telefone válido, disponibilidade e casa de oração.");
    return;
  }
  setSaving(true);
  try {
    await atualizarVoluntario(editing.id, { nome: editing.nome, telefone: editing.telefone, disponibilidade: editing.disponibilidade, codigo: editing.codigo, casaOracao: editing.casaOracao, podeControlarAlimentos: editing.podeControlarAlimentos, possuiCarro: editing.possuiCarro });
    setEditing(null);
    toast.success("Voluntário atualizado.");
  } catch (error) { toast.error(errorMessage(error)); } finally { setSaving(false); }
  };

  const copyCode = async (codigo: string) => {
    await navigator.clipboard.writeText(codigo);
    toast.success("Código copiado.");
  };

  return (
    <div className="space-y-6 pb-12">
      <div><h1 className="text-2xl font-serif font-bold">Voluntários</h1><p className="text-sm text-muted-foreground">Novos códigos têm 10 caracteres e são gerados com aleatoriedade criptográfica.</p></div>
      <Tabs defaultValue="lista">
        <TabsList>
          <TabsTrigger value="lista">Lista geral</TabsTrigger>
          <TabsTrigger value="solicitacoes">Solicitações {solicitacoes.length > 0 && <Badge className="ml-2">{solicitacoes.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="presenca">Presença</TabsTrigger>
        </TabsList>
        <TabsContent value="lista" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="font-serif text-lg">Novo voluntário</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-4">
              <div><Label>Nome *</Label><Input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} placeholder="Nome do voluntário" /></div>
              <div>
                <Label>Telefone *</Label>
                <Input
                  value={form.telefone}
                  onChange={(event) => setForm({ ...form, telefone: formatarTelefone(event.target.value) })}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
              <div><Label>Disponibilidade *</Label><Input value={form.disponibilidade} onChange={(event) => setForm({ ...form, disponibilidade: event.target.value })} placeholder="Ex: fins de semana, sábados…" /></div>
              <div><Label>Casa de Oração *</Label><CasaOracaoSelect value={form.casaOracao} onChange={(value) => setForm({ ...form, casaOracao: value })} /></div>
              <div className="sm:col-span-4 flex items-center gap-2">
                <Checkbox id="pode-controlar-alimentos" checked={form.podeControlarAlimentos} onCheckedChange={(checked) => setForm({ ...form, podeControlarAlimentos: checked === true })} />
                <Label htmlFor="pode-controlar-alimentos" className="cursor-pointer font-normal">Pode cadastrar alimentos pela área do voluntário</Label>
              </div>
              <div className="sm:col-span-4 flex items-center gap-2">
                <Checkbox id="possui-carro" checked={form.possuiCarro} onCheckedChange={(checked) => setForm({ ...form, possuiCarro: checked === true })} />
                <Label htmlFor="possui-carro" className="cursor-pointer font-normal">Possui carro</Label>
              </div>
              <div className="sm:col-span-4"><Button disabled={saving} onClick={() => void add()}><Plus className="mr-2 h-4 w-4" />Cadastrar</Button></div>
            </CardContent>
          </Card>
          <div className="grid gap-3">{voluntarios.map((voluntario) => <Card key={voluntario.id}><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><p className="font-semibold">{voluntario.nome}</p>{voluntario.ehLider && <Badge className="gap-1"><Crown className="h-3 w-3" />Líder</Badge>}{voluntario.podeControlarAlimentos && <Badge variant="secondary">Alimentos</Badge>}{voluntario.possuiCarro && <Badge variant="secondary">Carro</Badge>}</div><p className="text-sm text-muted-foreground">{voluntario.telefone || "Sem telefone"} · {voluntario.disponibilidade || "Sem disponibilidade informada"}</p><p className="text-sm text-muted-foreground">{voluntario.casaOracao}</p><button className="mt-2 font-mono text-sm bg-muted px-2 py-1 rounded inline-flex items-center gap-2" onClick={() => void copyCode(voluntario.codigo)}>{voluntario.codigo}<Copy className="h-3 w-3" /></button></div><div className="flex"><Button variant="ghost" size="icon" onClick={() => setEditing(voluntario)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => void remove(voluntario.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></div></CardContent></Card>)}</div>
        </TabsContent>
        <TabsContent value="solicitacoes" className="mt-4">{loadingSol ? <p className="text-sm text-muted-foreground">Carregando…</p> : solicitacoes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma solicitação.</p> : <div className="grid gap-3">{solicitacoes.map((item) => <Card key={item.id}><CardContent className="py-4"><p className="font-semibold">{item.nome}</p><p className="text-sm text-muted-foreground">{item.telefone || "Sem telefone"}</p><p className="text-sm">{item.disponibilidade}</p><p className="text-sm text-muted-foreground">{item.casa_oracao}</p><p className="text-sm text-muted-foreground">{item.possui_carro ? "Possui carro" : "Não possui carro"}</p><div className="flex gap-2 mt-3"><Button size="sm" onClick={() => void approve(item)}><Check className="mr-1 h-4 w-4" />Aprovar</Button><Button size="sm" variant="outline" onClick={() => void reject(item.id)}><X className="mr-1 h-4 w-4" />Recusar</Button></div></CardContent></Card>)}</div>}</TabsContent>
        <TabsContent value="presenca"><PresencaTab /></TabsContent>
      </Tabs>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar voluntário</DialogTitle></DialogHeader>
          {editing && (
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={editing.nome} onChange={(event) => setEditing({ ...editing, nome: event.target.value })} placeholder="Nome do voluntário" /></div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={editing.telefone}
                onChange={(event) => setEditing({ ...editing, telefone: formatarTelefone(event.target.value) })}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>
            <div><Label>Disponibilidade</Label><Input value={editing.disponibilidade} onChange={(event) => setEditing({ ...editing, disponibilidade: event.target.value })} placeholder="Ex: fins de semana, sábados…" /></div>
            <div><Label>Casa de Oração</Label><CasaOracaoSelect value={editing.casaOracao} onChange={(value) => setEditing({ ...editing, casaOracao: value })} /></div>
            <div><Label>Código</Label><Input value={editing.codigo} onChange={(event) => setEditing({ ...editing, codigo: event.target.value.toUpperCase() })} /></div>
            <div className="flex items-center gap-2">
              <Checkbox id="editing-pode-controlar-alimentos" checked={editing.podeControlarAlimentos} onCheckedChange={(checked) => setEditing({ ...editing, podeControlarAlimentos: checked === true })} />
              <Label htmlFor="editing-pode-controlar-alimentos" className="cursor-pointer font-normal">Pode cadastrar alimentos pela área do voluntário</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="editing-possui-carro" checked={editing.possuiCarro} onCheckedChange={(checked) => setEditing({ ...editing, possuiCarro: checked === true })} />
              <Label htmlFor="editing-possui-carro" className="cursor-pointer font-normal">Possui carro</Label>
            </div>
          </div>
)}
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button><Button disabled={saving} onClick={() => void saveEdit()}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}