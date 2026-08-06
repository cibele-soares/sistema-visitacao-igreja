import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface Pessoa {
  id: string;
  nome: string;
  endereco: string;
  telefone: string;
  observacoes: string;
}

export interface Voluntario {
  id: string;
  nome: string;
  telefone: string;
  disponibilidade: string;
  ehLider: boolean;
  codigo: string;
  casaOracao: string;
  podeControlarAlimentos: boolean;
  possuiCarro: boolean;
}

export interface Alimento {
  id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  dataEntrada: string;
  casaOracao: string;
  inseridoPorNome: string;
}

export interface Grupo {
  id: string;
  nome: string;
  liderId: string;
  voluntarioIds: string[];
}

export interface CestaItem {
  alimentoId: string;
  nome: string;
  quantidade: number;
  unidade: string;
}

export interface Visita {
  id: string;
  grupoId: string;
  pessoaId: string;
  cestaItens: CestaItem[];
  realizada: boolean;
  naoRealizada: boolean;
  dataVisita: string;
  observacoes: string;
  pedidoOracao: string;
  motivoNaoRealizada: string;
  cestaEntregue: boolean;
}

export type PessoaInput = Omit<Pessoa, "id">;
export type VoluntarioInput = Omit<Voluntario, "id" | "ehLider">;
export type AlimentoInput = Omit<Alimento, "id" | "inseridoPorNome">;

interface AppDataContextValue {
  pessoas: Pessoa[];
  voluntarios: Voluntario[];
  alimentos: Alimento[];
  grupos: Grupo[];
  visitas: Visita[];
  loading: boolean;
  refresh: () => Promise<void>;
  criarPessoa: (input: PessoaInput) => Promise<Pessoa>;
  atualizarPessoa: (id: string, input: PessoaInput) => Promise<void>;
  excluirPessoa: (id: string) => Promise<void>;
  criarVoluntario: (input: VoluntarioInput) => Promise<Voluntario>;
  atualizarVoluntario: (id: string, input: VoluntarioInput) => Promise<void>;
  excluirVoluntario: (id: string) => Promise<void>;
  criarAlimento: (input: AlimentoInput) => Promise<Alimento>;
  excluirAlimento: (id: string) => Promise<void>;
  salvarGrupo: (grupo: Grupo) => Promise<void>;
  excluirGrupo: (id: string) => Promise<void>;
  criarVisita: (input: Omit<Visita, "id" | "cestaItens" | "realizada" | "naoRealizada" | "motivoNaoRealizada">) => Promise<Visita>;
  atualizarVisita: (visita: Visita) => Promise<void>;
  excluirVisita: (id: string) => Promise<void>;
  definirItemCesta: (visitaId: string, alimentoId: string, quantidade: number) => Promise<void>;
finalizarVisita: (visitaId: string, dataVisita: string, observacoes: string, pedidoOracao: string, cestaEntregue: boolean) => Promise<void>;  marcarVisitaNaoRealizada: (visitaId: string, motivo: string) => Promise<void>;
  reabrirVisita: (visitaId: string) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function messageFromError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String(error.message);
  return "Ocorreu um erro inesperado.";
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin, perfil, loading: authLoading } = useAuth();
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [voluntarios, setVoluntarios] = useState<Voluntario[]>([]);
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [loading, setLoading] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAdminRef = useRef(isAdmin);
  const refreshRequestRef = useRef(0);

  useEffect(() => {
    isAdminRef.current = isAdmin;
    if (!isAdmin) refreshRequestRef.current += 1;
  }, [isAdmin]);

  const refresh = useCallback(async () => {
    const requestId = ++refreshRequestRef.current;
    if (!isAdmin) {
      setPessoas([]);
      setVoluntarios([]);
      setAlimentos([]);
      setGrupos([]);
      setVisitas([]);
      return;
    }

    setLoading(true);
    try {
      const [pessoasRes, voluntariosRes, alimentosRes, gruposRes, grupoVolsRes, visitasRes, cestaRes, perfisRes] = await Promise.all([
        supabase.from("pessoas").select("*").order("nome"),
        supabase.from("voluntarios").select("*").order("nome"),
        supabase.from("alimentos").select("*").order("nome"),
        supabase.from("grupos").select("*").order("nome"),
        supabase.from("grupo_voluntarios").select("*"),
        supabase.from("visitas").select("*").order("created_at", { ascending: false }),
        supabase.from("visita_cesta_itens").select("*"),
        supabase.from("perfis").select("id, nome"),
      ]);

      const firstError = [pessoasRes, voluntariosRes, alimentosRes, gruposRes, grupoVolsRes, visitasRes, cestaRes, perfisRes]
        .map((result) => result.error)
        .find(Boolean);
      if (firstError) throw firstError;

      const nomeById = new Map((perfisRes.data ?? []).map((perfil) => [perfil.id, perfil.nome]));

      const nextPessoas: Pessoa[] = (pessoasRes.data ?? []).map((row) => ({
        id: row.id,
        nome: row.nome,
        endereco: row.endereco,
        telefone: row.telefone,
        observacoes: row.observacoes,
      }));

      const nextVoluntarios: Voluntario[] = (voluntariosRes.data ?? []).map((row) => ({
        id: row.id,
        nome: row.nome,
        telefone: row.telefone,
        disponibilidade: row.disponibilidade,
        ehLider: row.eh_lider,
        codigo: row.codigo,
        casaOracao: row.casa_oracao,
        podeControlarAlimentos: row.pode_controlar_alimentos,
        possuiCarro: row.possui_carro,
      }));

      const voluntarioNomeById = new Map(nextVoluntarios.map((voluntario) => [voluntario.id, voluntario.nome]));

      const nextAlimentos: Alimento[] = (alimentosRes.data ?? []).map((row) => ({
        id: row.id,
        nome: row.nome,
        quantidade: row.quantidade,
        unidade: row.unidade,
        dataEntrada: row.data_entrada,
        casaOracao: row.casa_oracao,
        inseridoPorNome:
          (row.inserido_por && nomeById.get(row.inserido_por)) ||
          (row.inserido_por_voluntario && voluntarioNomeById.get(row.inserido_por_voluntario)) ||
          "—",
      }));

      const memberships = grupoVolsRes.data ?? [];
      const nextGrupos: Grupo[] = (gruposRes.data ?? []).map((row) => ({
        id: row.id,
        nome: row.nome,
        liderId: row.lider_id ?? "",
        voluntarioIds: memberships
          .filter((membership) => membership.grupo_id === row.id)
          .map((membership) => membership.voluntario_id),
      }));

      const alimentosById = new Map(nextAlimentos.map((alimento) => [alimento.id, alimento]));
      const cestaRows = cestaRes.data ?? [];
      const nextVisitas: Visita[] = (visitasRes.data ?? []).map((row) => ({
        id: row.id,
        grupoId: row.grupo_id,
        pessoaId: row.pessoa_id,
        realizada: row.realizada,
        naoRealizada: row.nao_realizada,
        dataVisita: row.data_visita ?? "",
        observacoes: row.observacoes,
        pedidoOracao: row.pedido_oracao,
        motivoNaoRealizada: row.motivo_nao_realizada ?? "",
        cestaEntregue: row.cesta_entregue ?? false,
        cestaItens: cestaRows
          .filter((item) => item.visita_id === row.id)
          .map((item) => {
            const alimento = alimentosById.get(item.alimento_id);
            return {
              alimentoId: item.alimento_id,
              nome: alimento?.nome ?? "Alimento removido",
              quantidade: item.quantidade,
              unidade: alimento?.unidade ?? "",
            };
          }),
      }));

      if (requestId !== refreshRequestRef.current || !isAdminRef.current) return;

      setPessoas(nextPessoas);
      setVoluntarios(nextVoluntarios);
      setAlimentos(nextAlimentos);
      setGrupos(nextGrupos);
      setVisitas(nextVisitas);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      throw new Error(messageFromError(error));
    } finally {
      if (requestId === refreshRequestRef.current) setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (authLoading) return;
    void refresh().catch((error) => console.error(error));
  }, [authLoading, refresh]);

  useEffect(() => {
    if (!isAdmin) return;

    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        void refresh().catch((error) => console.error(error));
      }, 250);
    };

    const tables = [
      "pessoas",
      "voluntarios",
      "alimentos",
      "grupos",
      "grupo_voluntarios",
      "visitas",
      "visita_cesta_itens",
    ] as const;

    let channel = supabase.channel("admin-data-sync");
    for (const table of tables) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        scheduleRefresh,
      );
    }
    channel.subscribe();

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [isAdmin, refresh]);

  const criarPessoa = useCallback(async (input: PessoaInput) => {
    const { data, error } = await supabase.from("pessoas").insert({
      nome: input.nome.trim(),
      endereco: input.endereco.trim(),
      telefone: input.telefone.trim(),
      observacoes: input.observacoes.trim(),
    }).select().single();
    if (error) throw error;
    const pessoa = { id: data.id, ...input, nome: data.nome, endereco: data.endereco, telefone: data.telefone, observacoes: data.observacoes };
    setPessoas((current) => [...current, pessoa].sort((a, b) => a.nome.localeCompare(b.nome)));
    return pessoa;
  }, []);

  const atualizarPessoa = useCallback(async (id: string, input: PessoaInput) => {
    const { error } = await supabase.from("pessoas").update({
      nome: input.nome.trim(), endereco: input.endereco.trim(), telefone: input.telefone.trim(), observacoes: input.observacoes.trim(),
    }).eq("id", id);
    if (error) throw error;
    setPessoas((current) => current.map((pessoa) => pessoa.id === id ? { id, ...input } : pessoa));
  }, []);

  const excluirPessoa = useCallback(async (id: string) => {
    const { error } = await supabase.from("pessoas").delete().eq("id", id);
    if (error) throw error;
    setPessoas((current) => current.filter((pessoa) => pessoa.id !== id));
    setVisitas((current) => current.filter((visita) => visita.pessoaId !== id));
  }, []);

  const criarVoluntario = useCallback(async (input: VoluntarioInput) => {
    const { data, error } = await supabase.from("voluntarios").insert({
      nome: input.nome.trim(),
      telefone: input.telefone.trim(),
      disponibilidade: input.disponibilidade.trim(),
      codigo: input.codigo.toUpperCase(),
      casa_oracao: input.casaOracao.trim(),
      pode_controlar_alimentos: input.podeControlarAlimentos,
      possui_carro: input.possuiCarro,
      eh_lider: false,
    }).select().single();
    if (error) throw error;
    const voluntario: Voluntario = {
      id: data.id, nome: data.nome, telefone: data.telefone, disponibilidade: data.disponibilidade,
      codigo: data.codigo, ehLider: data.eh_lider, casaOracao: data.casa_oracao,
      podeControlarAlimentos: data.pode_controlar_alimentos,
      possuiCarro: data.possui_carro,
    };
    setVoluntarios((current) => [...current, voluntario].sort((a, b) => a.nome.localeCompare(b.nome)));
    return voluntario;
  }, []);

  const atualizarVoluntario = useCallback(async (id: string, input: VoluntarioInput) => {
    const { error } = await supabase.from("voluntarios").update({
      nome: input.nome.trim(),
      telefone: input.telefone.trim(),
      disponibilidade: input.disponibilidade.trim(),
      codigo: input.codigo.toUpperCase(),
      casa_oracao: input.casaOracao.trim(),
      pode_controlar_alimentos: input.podeControlarAlimentos,
      possui_carro: input.possuiCarro,
    }).eq("id", id);
    if (error) throw error;
    setVoluntarios((current) => current.map((voluntario) => voluntario.id === id ? { ...voluntario, ...input, codigo: input.codigo.toUpperCase() } : voluntario));
  }, []);

  const excluirVoluntario = useCallback(async (id: string) => {
    const { error } = await supabase.from("voluntarios").delete().eq("id", id);
    if (error) throw error;
    setVoluntarios((current) => current.filter((voluntario) => voluntario.id !== id));
    setGrupos((current) => current.map((grupo) => ({
      ...grupo,
      liderId: grupo.liderId === id ? "" : grupo.liderId,
      voluntarioIds: grupo.voluntarioIds.filter((voluntarioId) => voluntarioId !== id),
    })));
  }, []);

  const criarAlimento = useCallback(async (input: AlimentoInput) => {
    const { data, error } = await supabase.from("alimentos").insert({
      nome: input.nome.trim(), quantidade: input.quantidade, unidade: input.unidade.trim(), data_entrada: input.dataEntrada, casa_oracao: input.casaOracao.trim(),
    }).select().single();
    if (error) throw error;
    const alimento: Alimento = {
      id: data.id, nome: data.nome, quantidade: data.quantidade, unidade: data.unidade, dataEntrada: data.data_entrada, casaOracao: data.casa_oracao,
      inseridoPorNome: perfil?.nome ?? "—",
    };
    setAlimentos((current) => [...current, alimento].sort((a, b) => a.nome.localeCompare(b.nome)));
    return alimento;
  }, [perfil]);

  const excluirAlimento = useCallback(async (id: string) => {
    const { error } = await supabase.from("alimentos").delete().eq("id", id);
    if (error) throw error;
    setAlimentos((current) => current.filter((alimento) => alimento.id !== id));
  }, []);

  const salvarGrupo = useCallback(async (grupo: Grupo) => {
    const { error } = await supabase.rpc("salvar_grupo", {
      p_id: grupo.id,
      p_nome: grupo.nome,
      p_lider_id: grupo.liderId || null,
      p_voluntario_ids: grupo.voluntarioIds,
    });
    if (error) throw error;
    setGrupos((current) => {
      const exists = current.some((item) => item.id === grupo.id);
      return exists ? current.map((item) => item.id === grupo.id ? grupo : item) : [...current, grupo];
    });
    await refresh();
  }, [refresh]);

  const excluirGrupo = useCallback(async (id: string) => {
    const { error } = await supabase.from("grupos").delete().eq("id", id);
    if (error) throw error;
    setGrupos((current) => current.filter((grupo) => grupo.id !== id));
    setVisitas((current) => current.filter((visita) => visita.grupoId !== id));
  }, []);

  const criarVisita = useCallback(async (input: Omit<Visita, "id" | "cestaItens" | "realizada" | "naoRealizada" | "motivoNaoRealizada" | "cestaEntregue">) => {
    const { data, error } = await supabase.from("visitas").insert({
      grupo_id: input.grupoId,
      pessoa_id: input.pessoaId,
      data_visita: input.dataVisita || null,
      observacoes: input.observacoes,
      pedido_oracao: input.pedidoOracao,
      realizada: false,
    }).select().single();
    if (error) throw error;
    const visita: Visita = {
      id: data.id, grupoId: data.grupo_id, pessoaId: data.pessoa_id, cestaItens: [], realizada: data.realizada,
      naoRealizada: data.nao_realizada, dataVisita: data.data_visita ?? "", observacoes: data.observacoes,
      pedidoOracao: data.pedido_oracao, motivoNaoRealizada: data.motivo_nao_realizada ?? "",
      cestaEntregue: data.cesta_entregue ?? false,
    };
    setVisitas((current) => [visita, ...current]);
    return visita;
  }, []);

  const atualizarVisita = useCallback(async (visita: Visita) => {
  const { error } = await supabase.from("visitas").update({
    grupo_id: visita.grupoId,
    pessoa_id: visita.pessoaId,
    realizada: visita.realizada,
    nao_realizada: visita.naoRealizada,
    data_visita: visita.dataVisita || null,
    observacoes: visita.observacoes,
    pedido_oracao: visita.pedidoOracao,
    motivo_nao_realizada: visita.motivoNaoRealizada,
    cesta_entregue: visita.cestaEntregue,
  }).eq("id", visita.id);
  if (error) throw error;
  setVisitas((current) => current.map((item) => item.id === visita.id ? visita : item));
}, []);

  const excluirVisita = useCallback(async (id: string) => {
    const { error } = await supabase.from("visitas").delete().eq("id", id);
    if (error) throw error;
    setVisitas((current) => current.filter((visita) => visita.id !== id));
  }, []);

  const definirItemCesta = useCallback(async (visitaId: string, alimentoId: string, quantidade: number) => {
    const { error } = await supabase.rpc("definir_item_cesta", {
      p_visita_id: visitaId,
      p_alimento_id: alimentoId,
      p_quantidade: quantidade,
    });
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const finalizarVisita = useCallback(async (visitaId: string, dataVisita: string, observacoes: string, pedidoOracao: string, cestaEntregue: boolean) => {
    const { error } = await supabase.rpc("finalizar_visita", {
      p_visita_id: visitaId,
      p_data_visita: dataVisita || null,
      p_observacoes: observacoes,
      p_pedido_oracao: pedidoOracao,
      p_cesta_entregue: cestaEntregue,
    });
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const marcarVisitaNaoRealizada = useCallback(async (visitaId: string, motivo: string) => {
    const { error } = await supabase.rpc("marcar_visita_nao_realizada", {
      p_visita_id: visitaId,
      p_motivo: motivo,
    });
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const reabrirVisita = useCallback(async (visitaId: string) => {
    const { error } = await supabase.rpc("reabrir_visita", { p_visita_id: visitaId });
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const value = useMemo<AppDataContextValue>(() => ({
    pessoas, voluntarios, alimentos, grupos, visitas, loading, refresh,
    criarPessoa, atualizarPessoa, excluirPessoa,
    criarVoluntario, atualizarVoluntario, excluirVoluntario,
    criarAlimento, excluirAlimento,
    salvarGrupo, excluirGrupo,
    criarVisita, atualizarVisita, excluirVisita,
    definirItemCesta, finalizarVisita, marcarVisitaNaoRealizada, reabrirVisita,
  }), [
    alimentos, atualizarPessoa, atualizarVisita, atualizarVoluntario, criarAlimento, criarPessoa, criarVisita,
    criarVoluntario, definirItemCesta, excluirAlimento, excluirGrupo, excluirPessoa, excluirVisita,
    excluirVoluntario, finalizarVisita, marcarVisitaNaoRealizada, reabrirVisita,
    grupos, loading, pessoas, refresh, salvarGrupo, visitas, voluntarios,
  ]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData deve ser usado dentro de AppDataProvider");
  return context;
}