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
      clientes: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          responsavel: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          responsavel?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          responsavel?: string | null
        }
        Relationships: []
      }
      demandas: {
        Row: {
          created_at: string
          criado_por: string
          data_entrega: string | null
          descricao: string | null
          id: string
          responsavel_id: string
          setor: Database["public"]["Enums"]["demanda_setor"]
          status: Database["public"]["Enums"]["demanda_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por: string
          data_entrega?: string | null
          descricao?: string | null
          id?: string
          responsavel_id: string
          setor: Database["public"]["Enums"]["demanda_setor"]
          status?: Database["public"]["Enums"]["demanda_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string
          data_entrega?: string | null
          descricao?: string | null
          id?: string
          responsavel_id?: string
          setor?: Database["public"]["Enums"]["demanda_setor"]
          status?: Database["public"]["Enums"]["demanda_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      financeiro: {
        Row: {
          ano: number
          contratos: number | null
          created_at: string | null
          custo_produtos: number
          custos_gerais: number
          empresa: Database["public"]["Enums"]["financeiro_empresa"]
          geral: number | null
          id: string
          mes: string
          meta_contratos: number | null
          meta_geral: number | null
          meta_servicos: number | null
          meta_vendas: number | null
          servicos_avulsos: number | null
          vendas: number | null
        }
        Insert: {
          ano: number
          contratos?: number | null
          created_at?: string | null
          custo_produtos?: number
          custos_gerais?: number
          empresa?: Database["public"]["Enums"]["financeiro_empresa"]
          geral?: number | null
          id?: string
          mes: string
          meta_contratos?: number | null
          meta_geral?: number | null
          meta_servicos?: number | null
          meta_vendas?: number | null
          servicos_avulsos?: number | null
          vendas?: number | null
        }
        Update: {
          ano?: number
          contratos?: number | null
          created_at?: string | null
          custo_produtos?: number
          custos_gerais?: number
          empresa?: Database["public"]["Enums"]["financeiro_empresa"]
          geral?: number | null
          id?: string
          mes?: string
          meta_contratos?: number | null
          meta_geral?: number | null
          meta_servicos?: number | null
          meta_vendas?: number | null
          servicos_avulsos?: number | null
          vendas?: number | null
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          cnpj: string | null
          contato: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      indicadores_manutencao: {
        Row: {
          ano: number
          cliente_id: string | null
          created_at: string | null
          eng_corretivas_abertas: number | null
          eng_corretivas_atendidas_prazo: number | null
          eng_corretivas_fechadas: number | null
          eng_os_emergentes: number | null
          eng_os_pouco_urgentes: number | null
          eng_os_urgentes: number | null
          eng_pct_corretivas_atendidas_prazo: number | null
          eng_pct_corretivas_fechadas: number | null
          eng_pct_emergentes: number | null
          eng_pct_poucourgentes: number | null
          eng_pct_preventivas_fechadas: number | null
          eng_pct_sla_fechamento_emergente: number | null
          eng_pct_sla_fechamento_poucourgente: number | null
          eng_pct_sla_fechamento_urgente: number | null
          eng_pct_sla_triagem_emergente: number | null
          eng_pct_sla_triagem_poucourgente: number | null
          eng_pct_sla_triagem_urgente: number | null
          eng_pct_urgentes: number | null
          eng_preventivas_abertas: number | null
          eng_preventivas_fechadas: number | null
          id: string
          mes: string
          pred_ar_cg_gz_abertas: number | null
          pred_ar_cg_gz_fechadas: number | null
          pred_ar_sc_gd_abertas: number | null
          pred_ar_sc_gd_fechadas: number | null
          pred_corretivas_abertas: number | null
          pred_corretivas_fechadas: number | null
          pred_demais_abertas: number | null
          pred_demais_fechadas: number | null
          pred_os_emergentes: number | null
          pred_os_pouco_urgentes: number | null
          pred_os_urgentes: number | null
          pred_pct_corretivas_fechadas: number | null
          pred_pct_preventivas_fechadas: number | null
          pred_pct_sla_fechamento_emergente: number | null
          pred_pct_sla_fechamento_poucourgente: number | null
          pred_pct_sla_fechamento_urgente: number | null
          pred_pct_sla_triagem_emergente: number | null
          pred_pct_sla_triagem_poucourgente: number | null
          pred_pct_sla_triagem_urgente: number | null
          pred_preventivas_abertas: number | null
          pred_preventivas_fechadas: number | null
          total_corretivas_abertas: number | null
          total_corretivas_fechadas: number | null
          total_preventivas_abertas: number | null
          total_preventivas_fechadas: number | null
        }
        Insert: {
          ano: number
          cliente_id?: string | null
          created_at?: string | null
          eng_corretivas_abertas?: number | null
          eng_corretivas_atendidas_prazo?: number | null
          eng_corretivas_fechadas?: number | null
          eng_os_emergentes?: number | null
          eng_os_pouco_urgentes?: number | null
          eng_os_urgentes?: number | null
          eng_pct_corretivas_atendidas_prazo?: number | null
          eng_pct_corretivas_fechadas?: number | null
          eng_pct_emergentes?: number | null
          eng_pct_poucourgentes?: number | null
          eng_pct_preventivas_fechadas?: number | null
          eng_pct_sla_fechamento_emergente?: number | null
          eng_pct_sla_fechamento_poucourgente?: number | null
          eng_pct_sla_fechamento_urgente?: number | null
          eng_pct_sla_triagem_emergente?: number | null
          eng_pct_sla_triagem_poucourgente?: number | null
          eng_pct_sla_triagem_urgente?: number | null
          eng_pct_urgentes?: number | null
          eng_preventivas_abertas?: number | null
          eng_preventivas_fechadas?: number | null
          id?: string
          mes: string
          pred_ar_cg_gz_abertas?: number | null
          pred_ar_cg_gz_fechadas?: number | null
          pred_ar_sc_gd_abertas?: number | null
          pred_ar_sc_gd_fechadas?: number | null
          pred_corretivas_abertas?: number | null
          pred_corretivas_fechadas?: number | null
          pred_demais_abertas?: number | null
          pred_demais_fechadas?: number | null
          pred_os_emergentes?: number | null
          pred_os_pouco_urgentes?: number | null
          pred_os_urgentes?: number | null
          pred_pct_corretivas_fechadas?: number | null
          pred_pct_preventivas_fechadas?: number | null
          pred_pct_sla_fechamento_emergente?: number | null
          pred_pct_sla_fechamento_poucourgente?: number | null
          pred_pct_sla_fechamento_urgente?: number | null
          pred_pct_sla_triagem_emergente?: number | null
          pred_pct_sla_triagem_poucourgente?: number | null
          pred_pct_sla_triagem_urgente?: number | null
          pred_preventivas_abertas?: number | null
          pred_preventivas_fechadas?: number | null
          total_corretivas_abertas?: number | null
          total_corretivas_fechadas?: number | null
          total_preventivas_abertas?: number | null
          total_preventivas_fechadas?: number | null
        }
        Update: {
          ano?: number
          cliente_id?: string | null
          created_at?: string | null
          eng_corretivas_abertas?: number | null
          eng_corretivas_atendidas_prazo?: number | null
          eng_corretivas_fechadas?: number | null
          eng_os_emergentes?: number | null
          eng_os_pouco_urgentes?: number | null
          eng_os_urgentes?: number | null
          eng_pct_corretivas_atendidas_prazo?: number | null
          eng_pct_corretivas_fechadas?: number | null
          eng_pct_emergentes?: number | null
          eng_pct_poucourgentes?: number | null
          eng_pct_preventivas_fechadas?: number | null
          eng_pct_sla_fechamento_emergente?: number | null
          eng_pct_sla_fechamento_poucourgente?: number | null
          eng_pct_sla_fechamento_urgente?: number | null
          eng_pct_sla_triagem_emergente?: number | null
          eng_pct_sla_triagem_poucourgente?: number | null
          eng_pct_sla_triagem_urgente?: number | null
          eng_pct_urgentes?: number | null
          eng_preventivas_abertas?: number | null
          eng_preventivas_fechadas?: number | null
          id?: string
          mes?: string
          pred_ar_cg_gz_abertas?: number | null
          pred_ar_cg_gz_fechadas?: number | null
          pred_ar_sc_gd_abertas?: number | null
          pred_ar_sc_gd_fechadas?: number | null
          pred_corretivas_abertas?: number | null
          pred_corretivas_fechadas?: number | null
          pred_demais_abertas?: number | null
          pred_demais_fechadas?: number | null
          pred_os_emergentes?: number | null
          pred_os_pouco_urgentes?: number | null
          pred_os_urgentes?: number | null
          pred_pct_corretivas_fechadas?: number | null
          pred_pct_preventivas_fechadas?: number | null
          pred_pct_sla_fechamento_emergente?: number | null
          pred_pct_sla_fechamento_poucourgente?: number | null
          pred_pct_sla_fechamento_urgente?: number | null
          pred_pct_sla_triagem_emergente?: number | null
          pred_pct_sla_triagem_poucourgente?: number | null
          pred_pct_sla_triagem_urgente?: number | null
          pred_preventivas_abertas?: number | null
          pred_preventivas_fechadas?: number | null
          total_corretivas_abertas?: number | null
          total_corretivas_fechadas?: number | null
          total_preventivas_abertas?: number | null
          total_preventivas_fechadas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "indicadores_manutencao_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      indicadores_semanais: {
        Row: {
          ano: number
          captacoes: number
          created_at: string
          data: string
          id: string
          mes: string
          orcamentos: number
          semana: number
          updated_at: string
          user_id: string
          vendedor: string
          visitas: number
        }
        Insert: {
          ano: number
          captacoes?: number
          created_at?: string
          data: string
          id?: string
          mes: string
          orcamentos?: number
          semana: number
          updated_at?: string
          user_id: string
          vendedor: string
          visitas?: number
        }
        Update: {
          ano?: number
          captacoes?: number
          created_at?: string
          data?: string
          id?: string
          mes?: string
          orcamentos?: number
          semana?: number
          updated_at?: string
          user_id?: string
          vendedor?: string
          visitas?: number
        }
        Relationships: []
      }
      lancamento_anexos: {
        Row: {
          created_at: string
          id: string
          lancamento_id: string
          nome: string
          path: string
          tamanho: number | null
          tipo: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lancamento_id: string
          nome: string
          path: string
          tamanho?: number | null
          tipo?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lancamento_id?: string
          nome?: string
          path?: string
          tamanho?: number | null
          tipo?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lancamento_anexos_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamento_itens: {
        Row: {
          created_at: string
          id: string
          identificacao: string | null
          lancamento_id: string
          marca: string | null
          modelo: string | null
          observacao: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          identificacao?: string | null
          lancamento_id: string
          marca?: string | null
          modelo?: string | null
          observacao?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          identificacao?: string | null
          lancamento_id?: string
          marca?: string | null
          modelo?: string | null
          observacao?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lancamento_itens_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_lancamento"]
          cliente: string
          created_at: string
          custos: number
          data: string
          id: string
          item: string | null
          produto: string | null
          servico: string | null
          tipo: string | null
          updated_at: string
          user_id: string
          valor: number
          vendedor: string | null
        }
        Insert: {
          categoria: Database["public"]["Enums"]["categoria_lancamento"]
          cliente: string
          created_at?: string
          custos?: number
          data: string
          id?: string
          item?: string | null
          produto?: string | null
          servico?: string | null
          tipo?: string | null
          updated_at?: string
          user_id: string
          valor: number
          vendedor?: string | null
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_lancamento"]
          cliente?: string
          created_at?: string
          custos?: number
          data?: string
          id?: string
          item?: string | null
          produto?: string | null
          servico?: string | null
          tipo?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
          vendedor?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          empresa: string | null
          etapa: Database["public"]["Enums"]["etapa_lead"]
          id: string
          nome_cliente: string
          observacoes: string | null
          origem: Database["public"]["Enums"]["origem_lead"]
          responsavel: string | null
          telefone: string
          tipo: Database["public"]["Enums"]["tipo_lead"] | null
          updated_at: string
          user_id: string
          valor_estimado: number | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          empresa?: string | null
          etapa?: Database["public"]["Enums"]["etapa_lead"]
          id?: string
          nome_cliente: string
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["origem_lead"]
          responsavel?: string | null
          telefone: string
          tipo?: Database["public"]["Enums"]["tipo_lead"] | null
          updated_at?: string
          user_id: string
          valor_estimado?: number | null
        }
        Update: {
          created_at?: string
          email?: string | null
          empresa?: string | null
          etapa?: Database["public"]["Enums"]["etapa_lead"]
          id?: string
          nome_cliente?: string
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["origem_lead"]
          responsavel?: string | null
          telefone?: string
          tipo?: Database["public"]["Enums"]["tipo_lead"] | null
          updated_at?: string
          user_id?: string
          valor_estimado?: number | null
        }
        Relationships: []
      }
      metas_historicas: {
        Row: {
          ano: number
          created_at: string
          id: string
          mes: number
          meta_acessorio: number
          meta_captacoes: number
          meta_contrato: number
          meta_orcamentos: number
          meta_produto: number
          meta_servico: number
          meta_visitas: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ano: number
          created_at?: string
          id?: string
          mes: number
          meta_acessorio?: number
          meta_captacoes?: number
          meta_contrato?: number
          meta_orcamentos?: number
          meta_produto?: number
          meta_servico?: number
          meta_visitas?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ano?: number
          created_at?: string
          id?: string
          mes?: number
          meta_acessorio?: number
          meta_captacoes?: number
          meta_contrato?: number
          meta_orcamentos?: number
          meta_produto?: number
          meta_servico?: number
          meta_visitas?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      movimentacoes_estoque: {
        Row: {
          cliente: string | null
          created_at: string
          documento_ref: string | null
          id: string
          motivo: string | null
          observacao: string | null
          produto_id: string
          quantidade: number
          tipo: string
          user_id: string
          vendedor_id: string | null
        }
        Insert: {
          cliente?: string | null
          created_at?: string
          documento_ref?: string | null
          id?: string
          motivo?: string | null
          observacao?: string | null
          produto_id: string
          quantidade: number
          tipo: string
          user_id: string
          vendedor_id?: string | null
        }
        Update: {
          cliente?: string | null
          created_at?: string
          documento_ref?: string | null
          id?: string
          motivo?: string | null
          observacao?: string | null
          produto_id?: string
          quantidade?: number
          tipo?: string
          user_id?: string
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_estoque_2: {
        Row: {
          cliente: string | null
          created_at: string
          documento_ref: string | null
          id: string
          motivo: string | null
          observacao: string | null
          produto_id: string
          quantidade: number
          tipo: string
          user_id: string
          vendedor_id: string | null
        }
        Insert: {
          cliente?: string | null
          created_at?: string
          documento_ref?: string | null
          id?: string
          motivo?: string | null
          observacao?: string | null
          produto_id: string
          quantidade: number
          tipo: string
          user_id: string
          vendedor_id?: string | null
        }
        Update: {
          cliente?: string | null
          created_at?: string
          documento_ref?: string | null
          id?: string
          motivo?: string | null
          observacao?: string | null
          produto_id?: string
          quantidade?: number
          tipo?: string
          user_id?: string
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_2_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_estoque_2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_2_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_contato: {
        Row: {
          created_at: string
          id: string
          pos_venda_id: string
          texto: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pos_venda_id: string
          texto: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pos_venda_id?: string
          texto?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notas_contato_pos_venda_id_fkey"
            columns: ["pos_venda_id"]
            isOneToOne: false
            referencedRelation: "pos_venda"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_servico: {
        Row: {
          ano: number | null
          atendimento: string | null
          cliente_id: string | null
          created_at: string
          data_conclusao: string | null
          data_criacao: string | null
          estado: string | null
          estado_tempo_atendimento: string | null
          estado_tempo_fechamento: string | null
          fabricante: string | null
          id: string
          localizacao: string | null
          mes: string | null
          modelo: string | null
          numero: string | null
          numero_serie: string | null
          plano: string | null
          prioridade: string | null
          problema_relatado: string | null
          quadro_trabalho: string | null
          responsavel: string | null
          solicitante: string | null
          tag: string | null
          tipo_equipamento: string | null
          tipo_servico: string | null
        }
        Insert: {
          ano?: number | null
          atendimento?: string | null
          cliente_id?: string | null
          created_at?: string
          data_conclusao?: string | null
          data_criacao?: string | null
          estado?: string | null
          estado_tempo_atendimento?: string | null
          estado_tempo_fechamento?: string | null
          fabricante?: string | null
          id?: string
          localizacao?: string | null
          mes?: string | null
          modelo?: string | null
          numero?: string | null
          numero_serie?: string | null
          plano?: string | null
          prioridade?: string | null
          problema_relatado?: string | null
          quadro_trabalho?: string | null
          responsavel?: string | null
          solicitante?: string | null
          tag?: string | null
          tipo_equipamento?: string | null
          tipo_servico?: string | null
        }
        Update: {
          ano?: number | null
          atendimento?: string | null
          cliente_id?: string | null
          created_at?: string
          data_conclusao?: string | null
          data_criacao?: string | null
          estado?: string | null
          estado_tempo_atendimento?: string | null
          estado_tempo_fechamento?: string | null
          fabricante?: string | null
          id?: string
          localizacao?: string | null
          mes?: string | null
          modelo?: string | null
          numero?: string | null
          numero_serie?: string | null
          plano?: string | null
          prioridade?: string | null
          problema_relatado?: string | null
          quadro_trabalho?: string | null
          responsavel?: string | null
          solicitante?: string | null
          tag?: string | null
          tipo_equipamento?: string | null
          tipo_servico?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      pendentes_estoque: {
        Row: {
          created_at: string
          id: string
          produto_id: string
          quantidade: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          produto_id: string
          quantidade?: number
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          produto_id?: string
          quantidade?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pendentes_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_estoque"
            referencedColumns: ["id"]
          },
        ]
      }
      pendentes_estoque_2: {
        Row: {
          created_at: string
          id: string
          produto_id: string
          quantidade: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          produto_id: string
          quantidade?: number
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          produto_id?: string
          quantidade?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pendentes_estoque_2_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_estoque_2"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_venda: {
        Row: {
          cliente: string
          created_at: string
          data: string
          id: string
          status: Database["public"]["Enums"]["status_pos_venda"]
          status_changed_at: string | null
          updated_at: string
          user_id: string
          vendedor: string
        }
        Insert: {
          cliente: string
          created_at?: string
          data: string
          id?: string
          status?: Database["public"]["Enums"]["status_pos_venda"]
          status_changed_at?: string | null
          updated_at?: string
          user_id: string
          vendedor: string
        }
        Update: {
          cliente?: string
          created_at?: string
          data?: string
          id?: string
          status?: Database["public"]["Enums"]["status_pos_venda"]
          status_changed_at?: string | null
          updated_at?: string
          user_id?: string
          vendedor?: string
        }
        Relationships: []
      }
      produtos_estoque: {
        Row: {
          ativo: boolean
          categoria: string | null
          codigo_barras: string | null
          created_at: string
          estoque_atual: number
          estoque_minimo: number
          fabricante: string | null
          fornecedor_id: string | null
          foto_url: string | null
          id: string
          local_estoque: string | null
          lote: string | null
          nome: string
          nome_comercial: string | null
          numero_serie: string | null
          preco_custo: number | null
          preco_venda: number | null
          registro_anvisa: string | null
          unidade: string
          updated_at: string
          user_id: string
          validade: string | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          codigo_barras?: string | null
          created_at?: string
          estoque_atual?: number
          estoque_minimo?: number
          fabricante?: string | null
          fornecedor_id?: string | null
          foto_url?: string | null
          id?: string
          local_estoque?: string | null
          lote?: string | null
          nome: string
          nome_comercial?: string | null
          numero_serie?: string | null
          preco_custo?: number | null
          preco_venda?: number | null
          registro_anvisa?: string | null
          unidade?: string
          updated_at?: string
          user_id: string
          validade?: string | null
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          codigo_barras?: string | null
          created_at?: string
          estoque_atual?: number
          estoque_minimo?: number
          fabricante?: string | null
          fornecedor_id?: string | null
          foto_url?: string | null
          id?: string
          local_estoque?: string | null
          lote?: string | null
          nome?: string
          nome_comercial?: string | null
          numero_serie?: string | null
          preco_custo?: number | null
          preco_venda?: number | null
          registro_anvisa?: string | null
          unidade?: string
          updated_at?: string
          user_id?: string
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_estoque_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_estoque_2: {
        Row: {
          ativo: boolean
          categoria: string | null
          codigo_barras: string | null
          created_at: string
          estoque_atual: number
          estoque_minimo: number
          fabricante: string | null
          fornecedor_id: string | null
          foto_url: string | null
          id: string
          local_estoque: string | null
          lote: string | null
          nome: string
          nome_comercial: string | null
          numero_serie: string | null
          preco_custo: number | null
          preco_venda: number | null
          registro_anvisa: string | null
          unidade: string
          updated_at: string
          user_id: string
          validade: string | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          codigo_barras?: string | null
          created_at?: string
          estoque_atual?: number
          estoque_minimo?: number
          fabricante?: string | null
          fornecedor_id?: string | null
          foto_url?: string | null
          id?: string
          local_estoque?: string | null
          lote?: string | null
          nome: string
          nome_comercial?: string | null
          numero_serie?: string | null
          preco_custo?: number | null
          preco_venda?: number | null
          registro_anvisa?: string | null
          unidade?: string
          updated_at?: string
          user_id: string
          validade?: string | null
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          codigo_barras?: string | null
          created_at?: string
          estoque_atual?: number
          estoque_minimo?: number
          fabricante?: string | null
          fornecedor_id?: string | null
          foto_url?: string | null
          id?: string
          local_estoque?: string | null
          lote?: string | null
          nome?: string
          nome_comercial?: string | null
          numero_serie?: string | null
          preco_custo?: number | null
          preco_venda?: number | null
          registro_anvisa?: string | null
          unidade?: string
          updated_at?: string
          user_id?: string
          validade?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aprovado: boolean
          avatar_url: string | null
          cargo: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aprovado?: boolean
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aprovado?: boolean
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          ano: number | null
          cliente_id: string | null
          created_at: string
          id: string
          mensagem: string | null
          mes: string | null
          status: string
          total_indicadores: number
          total_os: number
          total_tecnicos: number
        }
        Insert: {
          ano?: number | null
          cliente_id?: string | null
          created_at?: string
          id?: string
          mensagem?: string | null
          mes?: string | null
          status?: string
          total_indicadores?: number
          total_os?: number
          total_tecnicos?: number
        }
        Update: {
          ano?: number | null
          cliente_id?: string | null
          created_at?: string
          id?: string
          mensagem?: string | null
          mes?: string | null
          status?: string
          total_indicadores?: number
          total_os?: number
          total_tecnicos?: number
        }
        Relationships: []
      }
      tecnicos_manutencao: {
        Row: {
          ano: number
          atendidas_no_prazo: number | null
          cliente_id: string | null
          corretivas: number | null
          created_at: string | null
          fechadas_no_prazo: number | null
          id: string
          mes: string
          nome: string
          percentual_atendimento: number | null
          percentual_fechamento: number | null
          preventivas: number | null
          setor: string
          total_os: number | null
        }
        Insert: {
          ano: number
          atendidas_no_prazo?: number | null
          cliente_id?: string | null
          corretivas?: number | null
          created_at?: string | null
          fechadas_no_prazo?: number | null
          id?: string
          mes: string
          nome: string
          percentual_atendimento?: number | null
          percentual_fechamento?: number | null
          preventivas?: number | null
          setor: string
          total_os?: number | null
        }
        Update: {
          ano?: number
          atendidas_no_prazo?: number | null
          cliente_id?: string | null
          corretivas?: number | null
          created_at?: string | null
          fechadas_no_prazo?: number | null
          id?: string
          mes?: string
          nome?: string
          percentual_atendimento?: number | null
          percentual_fechamento?: number | null
          preventivas?: number | null
          setor?: string
          total_os?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tecnicos_manutencao_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      vendedores: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_controlador: { Args: { _user_id: string }; Returns: boolean }
      pode_gerenciar_usuarios: { Args: { _user_id: string }; Returns: boolean }
      pode_ver_todas_demandas: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      categoria_lancamento: "produto" | "servico" | "contrato" | "acessorio"
      demanda_setor: "engenharia" | "comercial" | "financeiro"
      demanda_status: "pendente" | "execucao" | "feita"
      etapa_lead:
        | "novo_lead"
        | "primeiro_contato"
        | "em_qualificacao"
        | "convertido"
        | "perdido"
      financeiro_empresa: "dsh" | "dmedical"
      origem_lead:
        | "Instagram"
        | "Facebook"
        | "Indicação"
        | "Site"
        | "Google"
        | "WhatsApp"
        | "Outro"
      status_pos_venda: "Aguardando retorno" | "Contatado" | "Convertido"
      tipo_lead: "Clínica" | "Hospital" | "Veterinário" | "Consultório"
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
      categoria_lancamento: ["produto", "servico", "contrato", "acessorio"],
      demanda_setor: ["engenharia", "comercial", "financeiro"],
      demanda_status: ["pendente", "execucao", "feita"],
      etapa_lead: [
        "novo_lead",
        "primeiro_contato",
        "em_qualificacao",
        "convertido",
        "perdido",
      ],
      financeiro_empresa: ["dsh", "dmedical"],
      origem_lead: [
        "Instagram",
        "Facebook",
        "Indicação",
        "Site",
        "Google",
        "WhatsApp",
        "Outro",
      ],
      status_pos_venda: ["Aguardando retorno", "Contatado", "Convertido"],
      tipo_lead: ["Clínica", "Hospital", "Veterinário", "Consultório"],
    },
  },
} as const
