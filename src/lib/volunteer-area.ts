import type { CestaItem, Grupo, Pessoa, Visita } from "@/context/AppData";

export interface VolunteerIdentity {
  id: string;
  nome: string;
  telefone: string;
  disponibilidade: string;
  ehLider: boolean;
}

export interface VolunteerAlimento {
  id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  casaOracao: string;
  dataEntrada: string;
}

export interface VolunteerAlimentosInfo {
  podeControlarAlimentos: boolean;
  meusAlimentos: VolunteerAlimento[];
}

export interface VolunteerName {
  id: string;
  nome: string;
}

export interface VolunteerAreaData {
  voluntario: VolunteerIdentity;
  grupos: Grupo[];
  voluntarios: VolunteerName[];
  pessoas: Pessoa[];
  visitas: Visita[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseVolunteerArea(value: unknown): VolunteerAreaData {
  if (!isRecord(value) || !isRecord(value.voluntario) || !Array.isArray(value.grupos) || !Array.isArray(value.voluntarios) || !Array.isArray(value.pessoas) || !Array.isArray(value.visitas)) {
    throw new Error("Resposta inválida do servidor.");
  }

  return {
    voluntario: value.voluntario as unknown as VolunteerIdentity,
    grupos: value.grupos as unknown as Grupo[],
    voluntarios: value.voluntarios as unknown as VolunteerName[],
    pessoas: value.pessoas as unknown as Pessoa[],
    visitas: (value.visitas as unknown as Array<Omit<Visita, "cestaItens"> & { cestaItens?: CestaItem[] }>).map((visita) => ({
      ...visita,
      cestaItens: visita.cestaItens ?? [],
      naoRealizada: visita.naoRealizada ?? false,
      dataVisita: visita.dataVisita ?? "",
      observacoes: visita.observacoes ?? "",
      pedidoOracao: visita.pedidoOracao ?? "",
      motivoNaoRealizada: visita.motivoNaoRealizada ?? "",
      cestaEntregue: visita.cestaEntregue ?? false,
    })),
  };
}

export function parseVolunteerAlimentosInfo(value: unknown): VolunteerAlimentosInfo {
  if (!isRecord(value) || typeof value.podeControlarAlimentos !== "boolean" || !Array.isArray(value.meusAlimentos)) {
    throw new Error("Resposta inválida do servidor.");
  }

  return {
    podeControlarAlimentos: value.podeControlarAlimentos,
    meusAlimentos: value.meusAlimentos as unknown as VolunteerAlimento[],
  };
}