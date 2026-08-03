import { useAppData } from "@/context/AppData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, ClipboardCheck, UsersRound, Route, type LucideIcon } from "lucide-react";

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

export default function Dashboard() {
  const { pessoas, voluntarios, grupos, visitas } = useAppData();
  const realizadas = visitas.filter((v) => v.realizada).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-serif font-bold">Bem-vindo ao Sistema de Visitação</h1>
        <p className="text-muted-foreground mt-1">Gerencie visitas, voluntários e cestas da sua igreja.</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Users} label="Pessoas Cadastradas" value={pessoas.length} color="text-primary" />
        <StatCard icon={UserCheck} label="Voluntários" value={voluntarios.length} color="text-accent" />
        {/* <StatCard icon={Apple} label="Itens de Alimento" value={alimentos.length} color="text-success" />*/}
        <StatCard icon={UsersRound} label="Grupos" value={grupos.length} color="text-primary" />
        <StatCard icon={Route} label="Visitas Agendadas" value={visitas.length} color="text-accent" />
        <StatCard icon={ClipboardCheck} label="Visitas Realizadas" value={realizadas} color="text-success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Fluxo de Trabalho</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Cadastre as <strong className="text-foreground">Pessoas</strong> que receberão visitas</li>
            <li>Cadastre os <strong className="text-foreground">Voluntários</strong> que farão as visitas</li>
            {/*<li>Registre a entrada de <strong className="text-foreground">Alimentos</strong></li>*/}
            <li>Monte os <strong className="text-foreground">Grupos</strong> de voluntários</li>
            <li>Escolha os <strong className="text-foreground">Líderes</strong> de cada grupo</li>
            <li>Distribua as <strong className="text-foreground">Visitas</strong> entre os grupos</li>
            {/*<li>Organize as <strong className="text-foreground">Cestas</strong> para cada visita</li>*/}
            <li>Registre as visitas <strong className="text-foreground">realizadas</strong></li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
