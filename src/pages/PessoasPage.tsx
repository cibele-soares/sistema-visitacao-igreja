import { useEffect, useState } from "react";
import { Check, MapPin, Pencil, Phone, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { type Pessoa, useAppData } from "@/context/AppData";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { errorMessage } from "@/lib/error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type SolicitacaoPessoa = Tables<"pessoas_pendentes">;

type PessoaForm = Omit<Pessoa, "id">;
const emptyForm: PessoaForm = { nome: "", telefone: "", endereco: "", observacoes: "" };

export default function PessoasPage() {
  const { pessoas, criarPessoa, atualizarPessoa, excluirPessoa, refresh } = useAppData();
  const [form, setForm] = useState<PessoaForm>(emptyForm);
  const [editing, setEditing] = useState<Pessoa | null>(null);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoPessoa[]>([]);
  const [loadingSol, setLoadingSol] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPending = async () => {
    setLoadingSol(true);
    const { data, error } = await supabase.from("pessoas_pendentes").select("*").order("created_at", { ascending: false });
    setLoadingSol(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSolicitacoes(data ?? []);
  };

  useEffect(() => { void loadPending(); }, []);

  const setField = (field: keyof PessoaForm, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const handleAdd = async () => {
    if (!form.nome.trim() || !form.endereco.trim()) {
      toast.error("Nome, telefone, endereço e situação/necessidade são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      await criarPessoa(form);
      setForm(emptyForm);
      toast.success("Pessoa cadastrada.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const approve = async (id: string, nome: string) => {
    const { error } = await supabase.rpc("aprovar_pessoa_pendente", { p_id: id });
    if (error) {
      toast.error(error.message);
      return;
    }
    setSolicitacoes((current) => current.filter((item) => item.id !== id));
    await refresh();
    toast.success(`Cadastro de ${nome} aprovado.`);
  };

  const reject = async (id: string) => {
    const { error } = await supabase.from("pessoas_pendentes").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSolicitacoes((current) => current.filter((item) => item.id !== id));
    toast.info("Solicitação removida.");
  };

  const remove = async (id: string) => {
    try {
      await excluirPessoa(id);
      toast.success("Pessoa removida e visitas relacionadas excluídas.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const saveEdit = async () => {
    if (!editing?.nome.trim() || !editing.endereco.trim()) {
      toast.error("Nome e endereço são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      await atualizarPessoa(editing.id, editing);
      setEditing(null);
      toast.success("Cadastro atualizado.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div><h1 className="text-2xl font-serif font-bold">Irmandade que será visitada</h1><p className="text-muted-foreground text-sm mt-1">Gerencie cadastros e solicitações recebidas pelo site.</p></div>
      <Tabs defaultValue="lista">
        <TabsList><TabsTrigger value="lista">Lista geral</TabsTrigger><TabsTrigger value="solicitacoes">Solicitações {solicitacoes.length > 0 && <Badge className="ml-2">{solicitacoes.length}</Badge>}</TabsTrigger></TabsList>
        <TabsContent value="lista" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="font-serif text-lg">Novo cadastro</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="nome">Nome completo *</Label><Input value={form.nome} onChange={(event) => setField("nome", event.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="telefone">Telefone / WhatsApp *</Label><Input value={form.telefone} onChange={(event) => setField("telefone", event.target.value)} required/></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="endereco">Endereço *</Label><Input value={form.endereco} onChange={(event) => setField("endereco", event.target.value)} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="observacoes">Situação / Necessidade *</Label><Textarea value={form.observacoes} onChange={(event) => setField("observacoes", event.target.value)} required/></div>
              <div className="sm:col-span-2"><Button disabled={saving} onClick={() => void handleAdd()}><Plus className="mr-2 h-4 w-4" />{saving ? "Salvando…" : "Cadastrar"}</Button></div>
            </CardContent>
          </Card>
          <div className="grid gap-3">
            {pessoas.map((pessoa) => (
              <Card key={pessoa.id}><CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{pessoa.nome}</p><p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{pessoa.endereco}</p>{pessoa.telefone && <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{pessoa.telefone}</p>}</div><div className="flex"><Button variant="ghost" size="icon" onClick={() => setEditing(pessoa)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => void remove(pessoa.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></div>
                {pessoa.observacoes && <p className="text-sm bg-muted rounded p-2">{pessoa.observacoes}</p>}
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="solicitacoes" className="mt-4">
          {loadingSol ? <p className="text-sm text-muted-foreground">Carregando…</p> : solicitacoes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p> : <div className="grid gap-3">{solicitacoes.map((item) => <Card key={item.id}><CardContent className="py-4 space-y-2"><div><p className="font-semibold">{item.nome}</p><p className="text-sm text-muted-foreground">{item.telefone} · {item.endereco}</p><p className="text-sm mt-2">{item.observacoes}</p></div><div className="flex gap-2"><Button size="sm" onClick={() => void approve(item.id, item.nome)}><Check className="mr-1 h-4 w-4" />Aprovar</Button><Button size="sm" variant="outline" onClick={() => void reject(item.id)}><X className="mr-1 h-4 w-4" />Recusar</Button></div></CardContent></Card>)}</div>}
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent><DialogHeader><DialogTitle>Editar pessoa</DialogTitle></DialogHeader>{editing && <div className="space-y-3"><div><Label>Nome</Label><Input value={editing.nome} onChange={(event) => setEditing({ ...editing, nome: event.target.value })} /></div><div><Label>Telefone</Label><Input value={editing.telefone} onChange={(event) => setEditing({ ...editing, telefone: event.target.value })} /></div><div><Label>Endereço</Label><Input value={editing.endereco} onChange={(event) => setEditing({ ...editing, endereco: event.target.value })} /></div><div><Label>Observações</Label><Textarea value={editing.observacoes} onChange={(event) => setEditing({ ...editing, observacoes: event.target.value })} /></div></div>}<DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button><Button disabled={saving} onClick={() => void saveEdit()}>Salvar</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
