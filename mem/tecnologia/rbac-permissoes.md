---
name: RBAC Permissões
description: Permissões granulares por dashboard (módulo/sub-item), armazenadas como CSV em profiles.cargo
type: feature
---
Sistema de permissões granular por sub-item de cada módulo.

- Armazenamento: campo `profiles.cargo` (CSV), backward-compatível com cargos legados (`dash`, `manutencao`, `estoque`, `Controlador`, `admin`).
- Mapa em `src/lib/permissions.ts` (PERM_GROUPS). Grupos: comercial, engenharia, estoque, financeiro.
- Códigos: `com_dashboard`, `com_lancamentos`, `com_indicadores`, `com_vendas`, `com_posvenda`, `com_relatorios`, `eng_dashboard`, `eng_clientes`, `eng_os`, `eng_boletim`, `eng_synclogs`, `est_estoque`, `fin_dashboard`.
- Aliases legados: `dash` = todos com_*, `manutencao` = eng_dashboard/os/boletim, `estoque`/`Controlador` = est_estoque, `admin` = todos.
- `RoleGuard` aceita prop `perm` (string|string[]) além de `allowed` (legado).
- `useAuth().canAccess(perm)` / `canAccessAny(perms)` para checks programáticos.
- Sidebar (Layout.tsx) filtra sub-itens por `perm` de cada item; grupos vazios são ocultos.
- Configurações: admin gerencia via checkboxes agrupados por módulo + chips para Admin/Controlador.