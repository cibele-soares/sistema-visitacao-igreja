import { useAppData } from "@/context/AppData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, ClipboardCheck, UsersRound, Route, Gift, Wallet, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const StatCard = ({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: number; color: string }) => (
  <Card className="hover:shadow-warm transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      <Icon className={`h-5 w-5 ${color}`} />
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-serif font-bold">{value}</div>
    </CardContent>
  </Card>
);

const SaldoMercadoPagoCard = () => {
  const [saldo, setSaldo] = useState<number | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);
  const [editando, setEditando] = useState(false);
  const [valorInput, setValorInput] = useState("");
  const [salvando, setSalvando] = useState(false);

  const buscar = async () => {
    const { data } = await supabase
      .from("configuracoes_financeiras")
      .select("saldo_mercado_pago, atualizado_em")
      .eq("id", true)
      .single();
    if (data) {
      setSaldo(Number(data.saldo_mercado_pago));
      setAtualizadoEm(new Date(data.atualizado_em));
    }
  };

  useEffect(() => { buscar(); }, []);

  const salvar = async () => {
    const valor = Number(valorInput.replace(",", "."));
    if (Number.isNaN(valor) || valor < 0) {
      toast.error("Digite um valor válido.");
      return;
    }
    setSalvando(true);
    const { error } = await supabase.rpc("definir_saldo_mercado_pago", { p_valor: valor });
    setSalvando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditando(false);
    buscar();
  };

  return (
    <Card className="hover:shadow-warm transition-shadow min-w-[220px]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Mercado Pago</CardTitle>
        <Wallet className="h-5 w-5 text-accent" />
      </CardHeader>
      <CardContent>
        {editando ? (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              autoFocus
              type="text"
              inputMode="decimal"
              value={valorInput}
              onChange={(e) => setValorInput(e.target.value)}
              placeholder="0,00"
              className="w-24 border rounded px-2 py-1 text-lg font-serif bg-background"
            />
            <Button size="sm" onClick={salvar} disabled={salvando}>Salvar</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditando(false)}>Cancelar</Button>
          </div>
        ) : (
          <button
            type="button"
            className="text-left w-full"
            onClick={() => {
              setValorInput(saldo !== null ? saldo.toString().replace(".", ",") : "");
              setEditando(true);
            }}
          >
            <div className="text-3xl font-serif font-bold">
              {saldo === null ? "—" : saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
            {atualizadoEm && (
              <p className="text-xs text-muted-foreground mt-1">
                Atualizado em {atualizadoEm.toLocaleDateString("pt-BR")} · toque para editar
              </p>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
};

export default function Dashboard() {
  const { pessoas, voluntarios, grupos, visitas } = useAppData();
  const realizadas = visitas.filter((v) => v.realizada).length;
  const cestasEntregues = visitas.filter((v) => v.cestaEntregue).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold">Bem-vindo ao Sistema de Visitação</h1>
          <p className="text-muted-foreground mt-1">Gerencie visitas, voluntários e cestas da sua igreja.</p>
        </div>
        <SaldoMercadoPagoCard />
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Users} label="Pessoas Cadastradas" value={pessoas.length} color="text-primary" />
        <StatCard icon={UserCheck} label="Voluntários" value={voluntarios.length} color="text-accent" />
        {/* <StatCard icon={Apple} label="Itens de Alimento" value={alimentos.length} color="text-success" />*/}
        <StatCard icon={UsersRound} label="Grupos" value={grupos.length} color="text-primary" />
        <StatCard icon={Route} label="Visitas Agendadas" value={visitas.length} color="text-accent" />
        <StatCard icon={ClipboardCheck} label="Visitas Realizadas" value={realizadas} color="text-success" />
        <StatCard icon={Gift} label="Cestas Entregues" value={cestasEntregues} color="text-success" />
      </div>
    </div>
  );
}
