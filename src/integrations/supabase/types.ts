export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contrato_alertas: {
        Row: {
          contrato_id: string
          created_at: string
          data_evento: string
          data_lembrete: string
          empresa_id: string
          erro_mensagem: string | null
          funcionario_id: string
          google_event_id: string | null
          id: string
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          contrato_id: string
          created_at?: string
          data_evento: string
          data_lembrete: string
          empresa_id: string
          erro_mensagem?: string | null
          funcionario_id: string
          google_event_id?: string | null
          id?: string
          status?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          contrato_id?: string
          created_at?: string
          data_evento?: string
          data_lembrete?: string
          empresa_id?: string
          erro_mensagem?: string | null
          funcionario_id?: string
          google_event_id?: string | null
          id?: string
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrato_alertas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_analise"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_analise: {
        Row: {
          confianca: number | null
          created_at: string
          dados_brutos: Json | null
          data_admissao: string | null
          data_prorrogacao: string | null
          data_proximas_ferias: string | null
          data_vencimento: string | null
          documento_id: string | null
          empresa_id: string
          funcionario_id: string
          id: string
          observacoes: string | null
          tipo_contrato: string | null
          updated_at: string
        }
        Insert: {
          confianca?: number | null
          created_at?: string
          dados_brutos?: Json | null
          data_admissao?: string | null
          data_prorrogacao?: string | null
          data_proximas_ferias?: string | null
          data_vencimento?: string | null
          documento_id?: string | null
          empresa_id: string
          funcionario_id: string
          id?: string
          observacoes?: string | null
          tipo_contrato?: string | null
          updated_at?: string
        }
        Update: {
          confianca?: number | null
          created_at?: string
          dados_brutos?: Json | null
          data_admissao?: string | null
          data_prorrogacao?: string | null
          data_proximas_ferias?: string | null
          data_vencimento?: string | null
          documento_id?: string | null
          empresa_id?: string
          funcionario_id?: string
          id?: string
          observacoes?: string | null
          tipo_contrato?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      correcoes_ia: {
        Row: {
          campo: string
          created_at: string
          dia: number | null
          empresa_id: string
          folha_id: string | null
          id: string
          valor_corrigido: string | null
          valor_ia: string | null
        }
        Insert: {
          campo: string
          created_at?: string
          dia?: number | null
          empresa_id: string
          folha_id?: string | null
          id?: string
          valor_corrigido?: string | null
          valor_ia?: string | null
        }
        Update: {
          campo?: string
          created_at?: string
          dia?: number | null
          empresa_id?: string
          folha_id?: string | null
          id?: string
          valor_corrigido?: string | null
          valor_ia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "correcoes_ia_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correcoes_ia_folha_id_fkey"
            columns: ["folha_id"]
            isOneToOne: false
            referencedRelation: "folhas_ponto"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      empresas: {
        Row: {
          cnpj: string
          created_at: string
          id: string
          jornada_padrao: string
          nome: string
          owner_id: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          id?: string
          jornada_padrao?: string
          nome: string
          owner_id: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          id?: string
          jornada_padrao?: string
          nome?: string
          owner_id?: string
        }
        Relationships: []
      }
      folhas_ponto: {
        Row: {
          created_at: string
          empresa_id: string
          funcionario: string
          funcionario_id: string | null
          id: string
          mes_referencia: string
          status: Database["public"]["Enums"]["folha_status"]
        }
        Insert: {
          created_at?: string
          empresa_id: string
          funcionario: string
          funcionario_id?: string | null
          id?: string
          mes_referencia: string
          status?: Database["public"]["Enums"]["folha_status"]
        }
        Update: {
          created_at?: string
          empresa_id?: string
          funcionario?: string
          funcionario_id?: string | null
          id?: string
          mes_referencia?: string
          status?: Database["public"]["Enums"]["folha_status"]
        }
        Relationships: [
          {
            foreignKeyName: "folhas_ponto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folhas_ponto_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionario_documentos: {
        Row: {
          categoria: string
          created_at: string
          empresa_id: string
          funcionario_id: string
          id: string
          mime_type: string | null
          nome_arquivo: string
          storage_path: string
          tamanho_bytes: number | null
        }
        Insert: {
          categoria: string
          created_at?: string
          empresa_id: string
          funcionario_id: string
          id?: string
          mime_type?: string | null
          nome_arquivo: string
          storage_path: string
          tamanho_bytes?: number | null
        }
        Update: {
          categoria?: string
          created_at?: string
          empresa_id?: string
          funcionario_id?: string
          id?: string
          mime_type?: string | null
          nome_arquivo?: string
          storage_path?: string
          tamanho_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "funcionario_documentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionario_documentos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionario_ferias: {
        Row: {
          created_at: string
          data_fim: string
          data_inicio: string
          dias: number
          empresa_id: string
          funcionario_id: string
          id: string
          observacao: string | null
          status: string
        }
        Insert: {
          created_at?: string
          data_fim: string
          data_inicio: string
          dias: number
          empresa_id: string
          funcionario_id: string
          id?: string
          observacao?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          data_fim?: string
          data_inicio?: string
          dias?: number
          empresa_id?: string
          funcionario_id?: string
          id?: string
          observacao?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcionario_ferias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionario_ferias_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios: {
        Row: {
          cargo: string | null
          cpf: string
          created_at: string
          data_nascimento: string | null
          email: string | null
          empresa_id: string
          horario_entrada: string
          horario_saida: string
          id: string
          intervalo: string
          nome_completo: string
        }
        Insert: {
          cargo?: string | null
          cpf: string
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          empresa_id: string
          horario_entrada?: string
          horario_saida?: string
          id?: string
          intervalo?: string
          nome_completo: string
        }
        Update: {
          cargo?: string | null
          cpf?: string
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          empresa_id?: string
          horario_entrada?: string
          horario_saida?: string
          id?: string
          intervalo?: string
          nome_completo?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      holerites: {
        Row: {
          created_at: string
          empresa_id: string
          enviado: boolean
          enviado_em: string | null
          funcionario_id: string
          id: string
          mes_referencia: string
          pdf_path: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          enviado?: boolean
          enviado_em?: string | null
          funcionario_id: string
          id?: string
          mes_referencia: string
          pdf_path: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          enviado?: boolean
          enviado_em?: string | null
          funcionario_id?: string
          id?: string
          mes_referencia?: string
          pdf_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "holerites_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holerites_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_ponto: {
        Row: {
          atraso_minutos: number
          corrigido_manualmente: boolean
          created_at: string
          dia: number
          folha_id: string
          hora_entrada: string | null
          hora_entrada_extra: string | null
          hora_entrada_tarde: string | null
          hora_saida: string | null
          hora_saida_extra: string | null
          hora_saida_tarde: string | null
          horas_extras: number | null
          horas_normais: number | null
          horas_noturnas: number | null
          id: string
          obs: string | null
          tipo_excecao: string | null
        }
        Insert: {
          atraso_minutos?: number
          corrigido_manualmente?: boolean
          created_at?: string
          dia: number
          folha_id: string
          hora_entrada?: string | null
          hora_entrada_extra?: string | null
          hora_entrada_tarde?: string | null
          hora_saida?: string | null
          hora_saida_extra?: string | null
          hora_saida_tarde?: string | null
          horas_extras?: number | null
          horas_normais?: number | null
          horas_noturnas?: number | null
          id?: string
          obs?: string | null
          tipo_excecao?: string | null
        }
        Update: {
          atraso_minutos?: number
          corrigido_manualmente?: boolean
          created_at?: string
          dia?: number
          folha_id?: string
          hora_entrada?: string | null
          hora_entrada_extra?: string | null
          hora_entrada_tarde?: string | null
          hora_saida?: string | null
          hora_saida_extra?: string | null
          hora_saida_tarde?: string | null
          horas_extras?: number | null
          horas_normais?: number | null
          horas_noturnas?: number | null
          id?: string
          obs?: string | null
          tipo_excecao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_ponto_folha_id_fkey"
            columns: ["folha_id"]
            isOneToOne: false
            referencedRelation: "folhas_ponto"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorios: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          mes_referencia: string
          pdf_path: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          mes_referencia: string
          pdf_path: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          mes_referencia?: string
          pdf_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      user_owns_empresa: { Args: { _empresa_id: string }; Returns: boolean }
      user_owns_folha: { Args: { _folha_id: string }; Returns: boolean }
      user_owns_relatorio: { Args: { _relatorio_id: string }; Returns: boolean }
    }
    Enums: {
      folha_status: "rascunho" | "finalizada"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      folha_status: ["rascunho", "finalizada"],
    },
  },
} as const
