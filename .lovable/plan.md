## Demandas — Kanban por setor

Nova aba "Demandas" disponível em **Engenharia**, **Comercial** e **Financeiro** (Estoque fica de fora). Cada setor tem seu próprio quadro Kanban com 3 colunas: **Pendentes → Execução → Feitas**.

### Funcionalidades
- Criar/editar/excluir demanda (título, descrição, setor, responsável, data de criação automática, data de entrega).
- Arrastar entre colunas (mesma lib `@dnd-kit` já usada em Vendas).
- Badge de atraso quando `data_entrega < hoje` e status ≠ Feitas.
- Filtro por colaborador no topo do quadro.
- Contador por coluna.

### Permissões
- Colaborador comum: vê e filtra **apenas** suas próprias demandas (filtro de colaborador fixo no próprio usuário).
- **Admin** (cargo contém `admin`) e **Stanley**: veem todas as demandas e podem filtrar por qualquer colaborador.
- Identificação do Stanley: pelo `display_name` exato `Stanley` no `profiles` (sem hardcode de UUID; ajustável depois se quiser).
- Qualquer colaborador pode criar demandas para si mesmo; admin/Stanley podem atribuir a qualquer um.

### Navegação
- Sidebar: adicionar item "Demandas" em cada grupo (Engenharia, Comercial, Financeiro), apontando para `/demandas?setor=engenharia|comercial|financeiro`.
- Página única `Demandas.tsx` lê o setor da query string.

### Detalhes técnicos

**Banco** (migration):
- Tabela `public.demandas`: `id`, `setor` (enum: `engenharia`, `comercial`, `financeiro`), `titulo`, `descricao`, `status` (enum: `pendente`, `execucao`, `feita`), `responsavel_id` (uuid → auth.users), `criado_por` (uuid), `data_entrega` (date, nullable), `created_at`, `updated_at`.
- GRANTs para `authenticated` e `service_role`; RLS habilitada.
- Função `public.pode_ver_todas_demandas(_user uuid)` (SECURITY DEFINER) → true se `is_admin(_user)` OU `display_name = 'Stanley'`.
- Policies:
  - SELECT: `responsavel_id = auth.uid()` OR `pode_ver_todas_demandas(auth.uid())`.
  - INSERT: `criado_por = auth.uid()` AND (`responsavel_id = auth.uid()` OR `pode_ver_todas_demandas(auth.uid())`).
  - UPDATE/DELETE: dono da demanda OR `pode_ver_todas_demandas`.
- Trigger `update_updated_at_column` para `updated_at`.
- Realtime ligado para sincronização entre abas.

**Frontend**:
- Nova página `src/pages/Demandas.tsx` (Kanban com `@dnd-kit`, similar a `Vendas.tsx`).
- Hook reaproveitando `useAuth()` para verificar admin/Stanley e travar filtro.
- Rota `/demandas` em `App.tsx` (sem `RoleGuard` específico — qualquer usuário aprovado).
- Atualizar `src/components/Layout.tsx` adicionando o subitem "Demandas" nos três grupos.

Sem alterações em Estoque.
