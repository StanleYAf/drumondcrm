// Granular permission codes per dashboard/page.
// Stored as CSV in profiles.cargo (backward-compatible with legacy cargos:
// "dash", "estoque", "manutencao", "Controlador", "admin").

export type PermCode =
  | "com_dashboard"
  | "com_lancamentos"
  | "com_indicadores"
  | "com_vendas"
  | "com_posvenda"
  | "com_relatorios"
  | "eng_dashboard"
  | "eng_clientes"
  | "eng_os"
  | "eng_boletim"
  | "eng_synclogs"
  | "est_estoque"
  | "fin_dashboard"
  | "adm_contratos"
  | "adm_art";

export type PermGroupKey = "comercial" | "engenharia" | "estoque" | "financeiro" | "administrativo";

export interface PermItem {
  code: PermCode;
  label: string;
  desc: string;
}

export interface PermGroup {
  key: PermGroupKey;
  title: string;
  items: PermItem[];
}

export const PERM_GROUPS: PermGroup[] = [
  {
    key: "comercial",
    title: "Comercial",
    items: [
      { code: "com_dashboard",   label: "Dashboard",    desc: "Painel principal de vendas" },
      { code: "com_lancamentos", label: "Lançamentos",  desc: "Registro de faturamento" },
      { code: "com_indicadores", label: "Indicadores",  desc: "Metas e desempenho" },
      { code: "com_vendas",      label: "Vendas",       desc: "Pipeline e leads" },
      { code: "com_posvenda",    label: "Pós-venda",    desc: "Contatos pós-venda" },
      { code: "com_relatorios",  label: "Relatórios",   desc: "Exportações e análises" },
    ],
  },
  {
    key: "engenharia",
    title: "Engenharia",
    items: [
      { code: "eng_dashboard", label: "Dashboard",  desc: "Painel de engenharia" },
      { code: "eng_clientes",  label: "Clientes",   desc: "Cadastro de clientes" },
      { code: "eng_os",        label: "OS",         desc: "Ordens de serviço" },
      { code: "eng_boletim",   label: "Boletim",    desc: "Boletim técnico" },
      { code: "eng_synclogs",  label: "Sync Logs",  desc: "Logs de sincronização" },
    ],
  },
  {
    key: "estoque",
    title: "Estoque",
    items: [
      { code: "est_estoque", label: "Estoque", desc: "Gestão de produtos" },
    ],
  },
  {
    key: "financeiro",
    title: "Financeiro",
    items: [
      { code: "fin_dashboard", label: "Dashboard", desc: "Painel financeiro" },
    ],
  },
  {
    key: "administrativo",
    title: "Administrativo",
    items: [
      { code: "adm_contratos", label: "Contratos", desc: "Gestão de contratos" },
      { code: "adm_art", label: "ART", desc: "Controle de vencimento de ART" },
    ],
  },
];

const COMERCIAL_PERMS: PermCode[] = [
  "com_dashboard", "com_lancamentos", "com_indicadores", "com_vendas", "com_posvenda", "com_relatorios",
];
const ENGENHARIA_PERMS: PermCode[] = [
  "eng_dashboard", "eng_os", "eng_boletim",
];
const ALL_PERMS: PermCode[] = PERM_GROUPS.flatMap(g => g.items.map(i => i.code));

// Legacy cargo → granted permissions (kept for backward compatibility).
const LEGACY_MAP: Record<string, PermCode[]> = {
  dash: COMERCIAL_PERMS,
  manutencao: ENGENHARIA_PERMS,
  estoque: ["est_estoque"],
  Controlador: ["est_estoque"],
  admin: ALL_PERMS,
};

export function parseCargos(cargo: string | null | undefined): string[] {
  if (!cargo) return [];
  return cargo.split(",").map(c => c.trim()).filter(Boolean);
}

export function expandPerms(cargo: string | null | undefined): Set<string> {
  const set = new Set<string>();
  const cargos = parseCargos(cargo);
  for (const c of cargos) {
    set.add(c); // keep raw code (admin, Controlador, etc.)
    const mapped = LEGACY_MAP[c];
    if (mapped) mapped.forEach(p => set.add(p));
  }
  return set;
}

export function canAccessPerm(cargo: string | null | undefined, perm: PermCode | string): boolean {
  const set = expandPerms(cargo);
  if (set.has("admin")) return true;
  return set.has(perm);
}

export function hasAnyPerm(cargo: string | null | undefined, perms: (PermCode | string)[]): boolean {
  const set = expandPerms(cargo);
  if (set.has("admin")) return true;
  return perms.some(p => set.has(p));
}

export function isLegacyCargo(code: string): boolean {
  return code === "dash" || code === "manutencao" || code === "estoque";
}
