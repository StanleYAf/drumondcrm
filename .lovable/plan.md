
## Escopo

Reformular `src/pages/ManutencaoGeral.tsx` (rota `/manutencao`) — atual "Visão Geral — Manutenção" — transformando-o em **Central de Gestão de Engenharia** com indicadores configuráveis, status inteligente de clientes, acompanhamento de meta mensal e produtividade dos técnicos. Aproveita dados já existentes em `indicadores_manutencao`, `ordens_servico`, `tecnicos_manutencao` e `clientes`.

## Arquitetura — pastas novas

```text
src/features/engenharia/
  config/
    indicadoresConfig.ts        # catálogo padrão (ícone, cor, label, ordem, fórmula)
    statusClienteRegras.ts      # regras centralizadas 🟢🟡🔴
    iconRegistry.ts             # mapa string→Lucide (permite trocar ícone sem recompilar lógica)
  hooks/
    useEngenhariaData.ts        # busca consolidada (clientes, indicadores, OS, técnicos) + filtros
    useDashboardConfig.ts       # lê/grava config personalizada (localStorage hoje, tabela amanhã)
  components/
    IndicadorCard.tsx           # card configurável (icon, valor, título, cor, tooltip, link)
    PainelExecutivo.tsx         # grade de IndicadorCard agregados
    MetaMensalPanel.tsx         # meta de preventivas do mês + barra + dias restantes
    EvolucaoBar.tsx             # barra ASCII-style moderna reutilizável
    ProdutividadeTecnicos.tsx   # tabela/ranking
    PendenciasTecnicoBar.tsx    # barras horizontais de pendências
    ClienteCard.tsx             # card gerencial do cliente com selo de status
    FiltrosGlobais.tsx          # cliente/técnico/mês/ano/tipo/status
```

## 12 pontos — como serão atendidos

1. **Indicadores configuráveis** — `IndicadorCard` recebe `{ id, icon, color, label, value, description, tooltip, href }`. Catálogo default em `indicadoresConfig.ts`; `useDashboardConfig` aplica overrides do usuário (icon/cor/label/ordem/visibilidade) salvos em `localStorage` com chave `eng_dashboard_cfg_v1` — preparado para futura migração a tabela `dashboard_config`.
2. **Status visual do cliente** — `statusClienteRegras.ts` exporta `classificarCliente(metrics) → 'saudavel'|'atencao'|'critico'` com thresholds nomeados. Selo renderizado no `ClienteCard`. Alterar regra = editar um arquivo.
3. **Meta mensal** — `MetaMensalPanel` soma `total_preventivas_abertas + fechadas` do mês selecionado, calcula `%`, dias restantes (`endOfMonth - hoje`) e intensifica destaque quando `pendentes>0 && diasRestantes<=7`.
4. **Barra evolução** — `EvolucaoBar` (gradiente do design system) com `value/target`, animado.
5. **Produtividade técnicos** — usa `tecnicos_manutencao` + agrega `ordens_servico` por `responsavel`/`tipo_servico`/`estado` no período. Ranking ordenado por `concluídas` desc.
6. **Pendências por técnico** — barras horizontais (largura proporcional ao maior), ordenadas desc.
7. **Painel executivo** — totais agregados do mês: OS abertas/concluídas, prev. abertas/concluídas, corr. abertas/concluídas — via `IndicadorCard` (todos com tooltip + `href` para `/manutencao/os?...`).
8. **Cards de cliente** — `ClienteCard` mostra selo de status, responsável, % execução preventivas, OS pendentes, ícone de risco, "Última atualização" (max `created_at` de `ordens_servico` do cliente no mês).
9. **Filtros globais** — `FiltrosGlobais` com estado em URL (`?cliente=&tecnico=&mes=&ano=&tipo=&status=`), seguindo convenção do projeto (memo Core). Todos os componentes consomem via `useEngenhariaData`.
10. **Arquitetura escalável** — toda regra (cores, ícones, classificação, fórmulas) isolada em `config/`. Nenhum literal espalhado.
11. **Visual** — usa tokens semânticos (`bg-card`, `text-foreground`, `border-border`, `text-primary`), `Card`, `Badge`, `Tooltip`, `Progress` do shadcn já no projeto. Animação `animate-in fade-in`. Sem novas cores hardcoded.
12. **Entrega** — relatório final ao usuário com arquivos, componentes, fórmulas, configurações.

## Fórmulas centrais

```text
metaMensal.previsto   = Σ (eng_preventivas_abertas + eng_preventivas_fechadas) [+ pred_*]
metaMensal.executado  = Σ eng_preventivas_fechadas [+ pred_*]
metaMensal.pendente   = previsto - executado
metaMensal.percentual = executado / previsto * 100
classificacaoCliente:
  critico  if corretivasAbertas >= 5  || preventivasPendentes >= 10 || osVencidas >= 3
  atencao  if corretivasAbertas >= 2  || preventivasPendentes >= 3  || osVencidas >= 1
  saudavel caso contrário
produtividadeTecnico.score = concluidas*2 + emAndamento - abertas*0.5
```

## Persistência da configuração

Fase 1 (este plano): `localStorage` por usuário, schema validado com Zod. Hook `useDashboardConfig` expõe `{ config, setIcon, setColor, setLabel, setOrder, reset }`. Fácil portar depois para tabela `dashboard_config(user_id, key, value jsonb)` sem mudar componentes — apenas a implementação do hook.

## Sem mudanças que o usuário não pediu

- Não altero `Manutencao.tsx` (dashboard por cliente), `ManutencaoClientes.tsx`, `ManutencaoOS.tsx`, layout/sidebar, banco, RLS.
- Não toco `clientes`/`ordens_servico`/`tecnicos_manutencao` (schema).
- Sem nova migração nesta fase.

## Arquivos

**Novos** (10): os 10 arquivos listados em "Arquitetura — pastas novas".

**Modificado** (1): `src/pages/ManutencaoGeral.tsx` — passa a orquestrar os novos componentes (mantém o título da página, skeleton e error state existentes).

## Fora de escopo (sugestão futura, não implemento agora)

- Tela "Configurações → Dashboard" com UI para editar ícones/cores. A *estrutura* já fica pronta (hook + registry), mas a *tela* não é construída nesta entrega — abro nota no relatório final.
- Migração `dashboard_config` no banco.

Confirma essa abordagem ou quer ajustar algum ponto (ex.: incluir a tela de Configurações já agora, ou persistir em banco desde o início)?
