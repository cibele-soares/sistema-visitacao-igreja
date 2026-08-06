import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Users, HandHeart, ChevronRight, QrCode, MapPin, UserPlus, Home, Copy} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { createPixPayload } from '@/lib/pix';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,} from "@/components/ui/select";

const PIX_KEY  = '9b51e26d-b7d0-49b4-9893-200a792413b0';
const PIX_NAME = 'Igreja Acao de Visitacao';
const PIX_CITY = 'SAO CARLOS';

const steps = [
  { icon: Heart,   title: 'Doações',     desc: 'Recebemos doações de alimentos e montamos cestas básicas para as famílias.' },
  { icon: Users,   title: 'Voluntários', desc: 'Nossos voluntários se organizam em grupos para realizar as visitas.' },
  { icon: MapPin,  title: 'Visitas',     desc: 'Cada grupo visita famílias cadastradas, entregando cestas e oferecendo apoio e oração.' },
];

const CASAS_ORACAO: { cidade: string; casas: string[] }[] = [
  {
    cidade: 'Amparo',
    casas: [
      'Amparo - Centro',
      'Distrito Arcadas',
      'Fazenda Campineiro',
      'Jardim Brasil',
      'Jardim das Aves',
      'Jardim São Dimas',
      'Vale Verde',
    ],
  },
  {
    cidade: 'Monte Alegre do Sul',
    casas: ['Jardim Vitória', 'Mostardas', 'Ponte Alta', 'Três Pontes'],
  },
];

const copyPixKey = async () => {
  await navigator.clipboard.writeText(PIX_KEY);
  toast.success('Chave PIX copiada!');
};

// ── Helpers de telefone ───────────────────────────────────────
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

// ── Formulário: quero ser voluntário ─────────────────────────
function VoluntarioForm() {
  const [nome, setNome]                   = useState('');
  const [telefone, setTelefone]           = useState('');
  const [disponibilidade, setDisponibilidade] = useState('');
  const [casaOracao, setCasaOracao]       = useState('');
  const [possuiCarro, setPossuiCarro]     = useState(false);
  const [enviado, setEnviado]             = useState(false);
  const [loading, setLoading]             = useState(false);

  const handleEnviar = async () => {
    if (!nome.trim())          { toast.error('Informe seu nome.');            return; }
    if (!telefoneValido(telefone)) { toast.error('Telefone inválido. Use (XX) XXXXX-XXXX.'); return; }
    if (!disponibilidade.trim()) { toast.error('Informe sua disponibilidade.'); return; }
    if (!casaOracao.trim())    { toast.error('Selecione a casa de oração.');   return; }

    setLoading(true);
    const { error } = await supabase
      .from('voluntarios_pendentes')
      .insert({ nome: nome.trim(), telefone, disponibilidade: disponibilidade.trim(), casa_oracao: casaOracao, possui_carro: possuiCarro });
    setLoading(false);
    if (error) { toast.error('Erro ao enviar. Tente novamente.'); return; }
    setEnviado(true);
  };

  const enviarOutraSolicitacao = () => {
    setNome('');
    setTelefone('');
    setDisponibilidade('');
    setCasaOracao('');
    setPossuiCarro(false);
    setEnviado(false);
  };

  if (enviado) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-8 text-center space-y-4">
          <div className="text-3xl">🙏</div>

          <p className="font-serif font-semibold">
            Solicitação enviada!
          </p>

          <p className="text-sm text-muted-foreground">
            Nossa equipe vai analisar e entrar em contato em breve.
          </p>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={enviarOutraSolicitacao}
          >
            Enviar outra solicitação
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-1.5">
          <Label>Nome completo *</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
        </div>
        <div className="space-y-1.5">
          <Label>Telefone / WhatsApp *</Label>
          <Input
            value={telefone}
            onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
            placeholder="(00) 00000-0000"
            maxLength={15}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Disponibilidade *</Label>
          <Input value={disponibilidade} onChange={(e) => setDisponibilidade(e.target.value)} placeholder="Ex: fins de semana, sábados…" />
        </div>
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
        <div className="flex items-center gap-2">
          <Checkbox id="voluntario-possui-carro" checked={possuiCarro} onCheckedChange={(checked) => setPossuiCarro(checked === true)} />
          <Label htmlFor="voluntario-possui-carro" className="cursor-pointer font-normal">Possuo carro</Label>
        </div>
        <Button className="w-full" onClick={handleEnviar} disabled={loading}>
          {loading ? 'Enviando…' : <><UserPlus className="mr-2 h-4 w-4" />Enviar solicitação</>}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Formulário: indicar pessoa para receber visita ────────────
function IndicarPessoaForm(): React.JSX.Element {
  const [nome, setNome]               = useState('');
  const [telefone, setTelefone]       = useState('');
  const [endereco, setEndereco]       = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [enviado, setEnviado]         = useState(false);
  const [loading, setLoading]         = useState(false);

  const handleEnviar = async () => {
    if (!nome.trim())              { toast.error('Informe o nome da pessoa.');    return; }
    if (!telefoneValido(telefone)) { toast.error('Telefone inválido. Use (XX) XXXXX-XXXX.'); return; }
    if (!endereco.trim())          { toast.error('Informe o endereço.');          return; }
    if (!observacoes.trim())       { toast.error('Descreva a situação da pessoa.'); return; }

    setLoading(true);
    const { error } = await supabase
      .from('pessoas_pendentes')
      .insert([
        { 
          nome: nome.trim(), 
          telefone: telefone, 
          endereco: endereco.trim(), 
          observacoes: observacoes.trim() 
        }
      ]);
    
    setLoading(false);

    if (error) { 
      toast.error('Erro ao enviar. Tente novamente.'); 
      return; 
    }
    
    setEnviado(true);
  };

  const indicarOutraPessoa = () => {
    setNome('');
    setTelefone('');
    setEndereco('');
    setObservacoes('');
    setEnviado(false);
  };

  if (enviado) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-8 text-center space-y-4">
          <div className="text-3xl">🙏</div>

          <p className="font-serif font-semibold">
            Indicação enviada!
          </p>

          <p className="text-sm text-muted-foreground">
            Nossa equipe vai entrar em contato e verificar a situação antes da visita.
          </p>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={indicarOutraPessoa}
          >
            Indicar outra pessoa
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-1.5">
          <Label>Nome completo *</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da pessoa" />
        </div>
        <div className="space-y-1.5">
          <Label>Telefone / WhatsApp *</Label>
          <Input
            value={telefone}
            onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
            placeholder="(00) 00000-0000"
            maxLength={15}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Endereço *</Label>
          <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro" />
        </div>
        <div className="space-y-1.5">
          <Label>Situação / Necessidade *</Label>
          <Textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Descreva brevemente a situação e por que essa pessoa precisa de uma visita…"
            rows={3}
          />
        </div>
        <Button className="w-full" onClick={handleEnviar} disabled={loading}>
          {loading ? 'Enviando…' : 'Enviar indicação'}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          As indicações passam por uma verificação antes de serem aprovadas.
        </p>
      </CardContent>
    </Card>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [showPix, setShowPix] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    if (!showPix || qrUrl) return;
    void QRCode.toDataURL(createPixPayload(PIX_KEY, PIX_NAME, PIX_CITY), { width: 240, margin: 2 }).then(setQrUrl).catch(() => {
      toast.error('Não foi possível gerar o QR Code. Use a chave PIX exibida abaixo.');
    });
  }, [qrUrl, showPix]);

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* HERO */}
      <header className="relative bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-950 pointer-events-none" />
        <div className="relative max-w-lg mx-auto px-6 py-14 md:py-24 text-center space-y-5 z-10">
          <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center mx-auto shadow-lg">
            <HandHeart className="w-8 h-8 text-slate-900" />
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-white leading-tight">
            Ação de Visitação<br />da Igreja
          </h1>
          <p className="text-slate-300 text-base leading-relaxed max-w-sm mx-auto">
            Levamos alimento, carinho e a palavra de Deus para famílias que precisam.
            Junte-se a nós nessa missão!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              size="lg"
              className="font-semibold shadow-lg bg-amber-500 hover:bg-amber-600 text-slate-900"
              onClick={() => { setShowPix(true); setTimeout(() => document.getElementById('pix')?.scrollIntoView({ behavior: 'smooth' }), 80); }}
            >
              <Heart className="mr-2 h-4 w-4" /> Quero contribuir
            </Button>
            <Button
              size="lg" variant="outline"
              className="border-white/40 text-white hover:bg-white/10 bg-transparent"
              onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Como funciona
            </Button>
          </div>
        </div>
      </header>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="max-w-lg mx-auto px-6 py-12 space-y-6">
        <h2 className="text-xl font-serif font-bold text-center">Como funciona?</h2>
        <div className="space-y-4">
          {steps.map((item, i) => (
            <Card key={item.title} className="hover:shadow-warm transition-shadow">
              <CardContent className="flex items-start gap-4 py-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-serif font-semibold text-sm">{i + 1}. {item.title}</h3>
                  <p className="text-muted-foreground text-sm mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* PIX */}
      <section id="pix" className="bg-card border-y border-border">
        <div className="max-w-lg mx-auto px-6 py-12 space-y-6 text-center">
          <h2 className="text-xl font-serif font-bold">Contribua com PIX</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Escaneie o QR Code com o app do seu banco. Toda contribuição faz a diferença! 🙏
          </p>
          {!showPix ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-48 h-48 mx-auto bg-muted rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-border gap-2">
                <QrCode className="h-12 w-12 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">QR Code PIX</p>
              </div>
              <Button onClick={() => setShowPix(true)}>
                <Heart className="mr-2 h-4 w-4" /> Mostrar QR Code
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 animate-fade-in">
              <div className="border-4 border-primary rounded-2xl overflow-hidden shadow-lg">
                {qrUrl ? <img src={qrUrl} alt="QR Code Pix" className="w-48 h-48 block" /> : <div className="w-48 h-48 grid place-items-center text-sm text-muted-foreground">Gerando QR Code…</div>}
              </div>
              <div>
                <p className="text-sm font-semibold">{PIX_NAME}</p>
                <button
                  type="button"
                  onClick={() => void copyPixKey()}
                  className="text-xs text-muted-foreground font-mono mt-1 bg-muted px-3 py-1 rounded-full inline-flex items-center gap-2 hover:bg-muted/80 transition-colors"
                >
                  {PIX_KEY}
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* INDICAR PESSOA */}
      <section id="indicar" className="max-w-lg mx-auto px-6 py-12 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center mx-auto">
            <Home className="h-6 w-6 text-rose-600" />
          </div>
          <h2 className="text-xl font-serif font-bold">Indicar uma família</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Conhece alguém que precisa de uma visita e apoio? Indique aqui.
            Nossa equipe irá verificar e entrar em contato.
          </p>
        </div>
        <IndicarPessoaForm />
      </section>

      {/* SEJA VOLUNTÁRIO */}
      <section id="voluntario" className="bg-card border-y border-border">
        <div className="max-w-lg mx-auto px-6 py-12 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-serif font-bold">Quero ser voluntário</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Preencha seus dados e nossa equipe entrará em contato para incluí-lo em um grupo.
            </p>
          </div>
          <VoluntarioForm />
        </div>
      </section>

      {/* ACESSO */}
      <section className="max-w-lg mx-auto px-6 py-12 pb-16 space-y-4">
        <h2 className="text-xl font-serif font-bold text-center">Acessar o Sistema</h2>
        <p className="text-sm text-muted-foreground text-center">
          Área restrita para voluntários e responsáveis cadastrados.
        </p>
        <div className="space-y-3 pt-2">
          <Button className="w-full h-12 text-base" onClick={() => navigate('/acesso')}>
            <Users className="mr-2 h-5 w-5" />
            Sou Voluntário
            <ChevronRight className="ml-auto h-5 w-5" />
          </Button>
          <Button variant="outline" className="w-full h-12 text-base" onClick={() => navigate('/admin/login')}>
            Área do Responsável
            <ChevronRight className="ml-auto h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <p>✝ Feito com ❤️ para a obra de Deus</p>
      </footer>
    </div>
  );
};