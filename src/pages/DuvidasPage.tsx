import { useEffect, useState } from "react";
import { Check, MessageCircleQuestion, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Duvida = Tables<"duvidas">;

export default function DuvidasPage() {
  const [duvidas, setDuvidas] = useState<Duvida[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("duvidas").select("*").order("created_at", { ascending: false });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setDuvidas(data ?? []);
  };
  useEffect(() => { void load(); }, []);

  const pendentes = duvidas.filter((item) => item.status !== "respondida");
  const respondidas = duvidas.filter((item) => item.status === "respondida");

  const marcarRespondida = async (id: string) => {
    const { error } = await supabase.from("duvidas").update({ status: "respondida" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setDuvidas((current) => current.map((item) => item.id === id ? { ...item, status: "respondida" } : item));
    toast.success("Marcada como respondida.");
  };

  const reabrir = async (id: string) => {
    const { error } = await supabase.from("duvidas").update({ status: "pendente" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setDuvidas((current) => current.map((item) => item.id === id ? { ...item, status: "pendente" } : item));
    toast.success("Reaberta como pendente.");
  };

  const whatsappLink = (telefone: string) => `https://wa.me/55${telefone.replace(/\D/g, "")}`;

  const DuvidaCard = ({ item, resolvida }: { item: Duvida; resolvida: boolean }) => (
    <Card key={item.id}>
      <CardContent className="py-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold">{item.nome.trim() || "Sem nome"}</p>
          {resolvida && <Badge variant="secondary">Respondida</Badge>}
        </div>
        <p className="text-sm">{item.mensagem}</p>
        <a href={whatsappLink(item.telefone)} target="_blank" rel="noreferrer" className="text-sm text-primary underline underline-offset-2">
          {item.telefone}
        </a>
        <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("pt-BR")}</p>
        <div className="flex gap-2 pt-1">
          {resolvida ? (
            <Button size="sm" variant="outline" onClick={() => void reabrir(item.id)}><RotateCcw className="mr-1 h-4 w-4" />Reabrir</Button>
          ) : (
            <Button size="sm" onClick={() => void marcarRespondida(item.id)}><Check className="mr-1 h-4 w-4" />Marcar como respondida</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-serif font-bold">Dúvidas</h1>
        <p className="text-sm text-muted-foreground">Mensagens enviadas pelo formulário de dúvidas da landing page.</p>
      </div>

      <Tabs defaultValue="pendentes">
        <TabsList>
          <TabsTrigger value="pendentes">
            Pendentes {pendentes.length > 0 && <Badge className="ml-2">{pendentes.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="respondidas">Respondidas</TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes" className="mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : pendentes.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <MessageCircleQuestion className="h-4 w-4" />Nenhuma dúvida pendente.
            </p>
          ) : (
            <div className="grid gap-3">{pendentes.map((item) => <DuvidaCard key={item.id} item={item} resolvida={false} />)}</div>
          )}
        </TabsContent>

        <TabsContent value="respondidas" className="mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : respondidas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma dúvida respondida ainda.</p>
          ) : (
            <div className="grid gap-3">{respondidas.map((item) => <DuvidaCard key={item.id} item={item} resolvida />)}</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}