export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<Row, Insert, Update, Relationships extends Relationship[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

export type Database = {
  public: {
    Tables: {
      pessoas: Table<
        { id: string; nome: string; endereco: string; telefone: string; observacoes: string; created_at: string },
        { id?: string; nome: string; endereco?: string; telefone?: string; observacoes?: string; created_at?: string },
        { id?: string; nome?: string; endereco?: string; telefone?: string; observacoes?: string; created_at?: string }
      >;
      voluntarios: Table<
        { id: string; nome: string; telefone: string; disponibilidade: string; eh_lider: boolean; codigo: string; casa_oracao: string; pode_controlar_alimentos: boolean; possui_carro: boolean; created_at: string },
        { id?: string; nome: string; telefone?: string; disponibilidade?: string; eh_lider?: boolean; codigo: string; casa_oracao: string; pode_controlar_alimentos?: boolean; possui_carro?: boolean; created_at?: string },
        { id?: string; nome?: string; telefone?: string; disponibilidade?: string; eh_lider?: boolean; codigo?: string; casa_oracao?: string; pode_controlar_alimentos?: boolean; possui_carro?: boolean; created_at?: string }
      >;
      alimentos: Table<
        { id: string; nome: string; quantidade: number; unidade: string; data_entrada: string; casa_oracao: string; inserido_por: string | null; inserido_por_voluntario: string | null; created_at: string },
        { id?: string; nome: string; quantidade?: number; unidade?: string; data_entrada?: string; casa_oracao?: string; inserido_por?: string | null; inserido_por_voluntario?: string | null; created_at?: string },
        { id?: string; nome?: string; quantidade?: number; unidade?: string; data_entrada?: string; casa_oracao?: string; inserido_por?: string | null; inserido_por_voluntario?: string | null; created_at?: string }
      >;
      grupos: Table<
        { id: string; nome: string; lider_id: string | null; created_at: string },
        { id?: string; nome: string; lider_id?: string | null; created_at?: string },
        { id?: string; nome?: string; lider_id?: string | null; created_at?: string }
      >;
      grupo_voluntarios: Table<
        { id: string; grupo_id: string; voluntario_id: string },
        { id?: string; grupo_id: string; voluntario_id: string },
        { id?: string; grupo_id?: string; voluntario_id?: string }
      >;
      visitas: Table<
        {
          id: string;
          grupo_id: string;
          pessoa_id: string;
          cesta_itens: string[];
          realizada: boolean;
          nao_realizada: boolean;
          data_visita: string | null;
          observacoes: string;
          pedido_oracao: string;
          motivo_nao_realizada: string;
          cesta_entregue: boolean;
          created_at: string;
        },
        {
          id?: string;
          grupo_id: string;
          pessoa_id: string;
          cesta_itens?: string[];
          realizada?: boolean;
          nao_realizada?: boolean;
          data_visita?: string | null;
          observacoes?: string;
          pedido_oracao?: string;
          motivo_nao_realizada?: string;
          cesta_entregue?: boolean;
          created_at?: string;
        },
        {
          id?: string;
          grupo_id?: string;
          pessoa_id?: string;
          cesta_itens?: string[];
          realizada?: boolean;
          nao_realizada?: boolean;
          data_visita?: string | null;
          observacoes?: string;
          pedido_oracao?: string;
          motivo_nao_realizada?: string;
          cesta_entregue: boolean;
          created_at?: string;
        }
      >;
      visita_cesta_itens: Table<
        { visita_id: string; alimento_id: string; quantidade: number; created_at: string },
        { visita_id: string; alimento_id: string; quantidade?: number; created_at?: string },
        { visita_id?: string; alimento_id?: string; quantidade?: number; created_at?: string }
      >;
      perfis: Table<
        { id: string; nome: string; telefone: string | null; perfil: "admin" | "voluntario_responsavel"; ativo: boolean; criado_em: string },
        { id: string; nome: string; telefone?: string | null; perfil?: "admin" | "voluntario_responsavel"; ativo?: boolean; criado_em?: string },
        { nome?: string; telefone?: string | null }
      >;
      registros_visitas: Table< 
        {
          id: string;
          visita_id: string;
          realizada_em: string;
          relato: string | null;
          pedido_oracao: string | null;
          registrado_por: string | null;
          registrado_por_voluntario: string | null;
          nao_realizada: boolean;
        },
        {
          id?: string;
          visita_id: string;
          realizada_em?: string;
          relato?: string | null;
          pedido_oracao?: string | null;
          registrado_por?: string | null;
          registrado_por_voluntario?: string | null;
          nao_realizada?: boolean;
        },
        {
          relato?: string | null;
          pedido_oracao?: string | null;
          nao_realizada?: boolean;
        }
      >;
      pessoas_pendentes: Table<
        { id: string; nome: string; telefone: string; endereco: string; observacoes: string; status: string; created_at: string },
        { id?: string; nome: string; telefone?: string; endereco: string; observacoes?: string; status?: string; created_at?: string },
        { nome?: string; telefone?: string; endereco?: string; observacoes?: string; status?: string }
      >;
      voluntarios_pendentes: Table<
        { id: string; nome: string; telefone: string; disponibilidade: string; casa_oracao: string; possui_carro: boolean; status: string; created_at: string },
        { id?: string; nome: string; telefone?: string; disponibilidade?: string; casa_oracao: string; possui_carro?: boolean; status?: string; created_at?: string },
        { nome?: string; telefone?: string; disponibilidade?: string; casa_oracao?: string; possui_carro?: boolean; status?: string }
      >;
      voluntario_sessoes: Table<
        { id: string; voluntario_id: string; token_hash: string; expires_at: string; created_at: string; last_used_at: string },
        { id?: string; voluntario_id: string; token_hash: string; expires_at: string; created_at?: string; last_used_at?: string },
        { expires_at?: string; last_used_at?: string }
      >;
      presencas: Table<
        { id: string; voluntario_id: string; data: string; presente: boolean; created_at: string; updated_at: string },
        { id?: string; voluntario_id: string; data: string; presente?: boolean; created_at?: string; updated_at?: string },
        { id?: string; voluntario_id?: string; data?: string; presente?: boolean; created_at?: string; updated_at?: string }
      >;
      configuracoes_financeiras: {
        Row: {
          id: boolean;
          saldo_mercado_pago: number;
          atualizado_em: string;
          atualizado_por: string | null;
        };
        Insert: { id?: boolean; saldo_mercado_pago?: number; atualizado_em?: string; atualizado_por?: string | null };
        Update: { id?: boolean; saldo_mercado_pago?: number; atualizado_em?: string; atualizado_por?: string | null };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      salvar_grupo: {
        Args: { p_id: string; p_nome: string; p_lider_id: string | null; p_voluntario_ids: string[] };
        Returns: Database["public"]["Tables"]["grupos"]["Row"];
      };
      aprovar_pessoa_pendente: {
        Args: { p_id: string };
        Returns: Database["public"]["Tables"]["pessoas"]["Row"];
      };
      aprovar_voluntario_pendente: {
        Args: { p_id: string; p_codigo: string };
        Returns: Database["public"]["Tables"]["voluntarios"]["Row"];
      };
      definir_item_cesta: {
        Args: { p_visita_id: string; p_alimento_id: string; p_quantidade: number };
        Returns: undefined;
      };
      finalizar_visita: {
        Args: { p_visita_id: string; p_data_visita: string | null; p_observacoes: string; p_pedido_oracao: string; p_cesta_entregue: boolean };
        Returns: Database["public"]["Tables"]["visitas"]["Row"];
      };
      marcar_visita_nao_realizada: {
        Args: { p_visita_id: string; p_motivo: string };
        Returns: Database["public"]["Tables"]["visitas"]["Row"];
      };
      reabrir_visita: {
        Args: { p_visita_id: string };
        Returns: Database["public"]["Tables"]["visitas"]["Row"];
      };
      voluntario_login: {
        Args: { p_codigo: string };
        Returns: { token: string; expires_at: string }[];
      };
      voluntario_area: { Args: { p_token: string }; Returns: Json };
      voluntario_finalizar_visita: {
        Args: { p_token: string; p_visita_id: string; p_data_visita: string | null; p_observacoes: string; p_pedido_oracao: string; p_cesta_entregue: boolean };
        Returns: Json;
      };
      voluntario_marcar_visita_nao_realizada: {
        Args: { p_token: string; p_visita_id: string; p_motivo: string };
        Returns: Json;
      };
      voluntario_logout: { Args: { p_token: string }; Returns: undefined };
      voluntario_alimentos_info: { Args: { p_token: string }; Returns: Json };
      voluntario_criar_alimento: {
        Args: { p_token: string; p_nome: string; p_quantidade: number; p_unidade: string; p_casa_oracao: string };
        Returns: Json;
      };
      definir_saldo_mercado_pago: {
        Args: { p_valor: number };
        Returns: Database["public"]["Tables"]["configuracoes_financeiras"]["Row"];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];