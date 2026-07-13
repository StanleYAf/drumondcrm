import { useState, useRef, useEffect, useCallback } from "react";
import { useAppData } from "@/lib/dataContext";
import { useAuth } from "@/lib/authContext";
import { useTheme, accentMap, type AccentColor, type ThemeMode } from "@/lib/themeContext";
import { CATEGORIA_LABELS, type Categoria, type AppData } from "@/lib/types";
import { applyCurrencyMask, parseCurrencyMask, numberToCurrencyMask } from "@/lib/currencyMask";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Plus, Download, Upload, AlertTriangle, Sun, Moon, Check, User, Shield, Users, Search, Clock, CheckCircle, XCircle, Briefcase, Stethoscope, Boxes, DollarSign, Landmark } from "lucide-react";
import { ConfigSkeleton } from "@/components/LoadingSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { PushNotificationsCard } from "@/components/PushNotificationsCard";
import { toast } from "sonner";
import { PERM_GROUPS } from "@/lib/permissions";
import type { PermGroupKey } from "@/lib/permissions";

const GROUP_ICONS: Record<PermGroupKey, any> = {
  comercial: Briefcase,
  engenharia: Stethoscope,
  estoque: Boxes,
  financeiro: DollarSign,
  administrativo: Landmark,
};

const SPECIAL_CARGOS = [
  { value: "admin", label: "Admin", desc: "Acesso completo a todos os módulos" },
  { value: "Controlador", label: "Controlador", desc: "Estoque com aprovação de saídas" },
];

function cargoLabel(c: string): string {
  const sp = SPECIAL_CARGOS.find(s => s.value === c);
  if (sp) return sp.label;
  for (const g of PERM_GROUPS) {
    const item = g.items.find(i => i.code === c);
    if (item) return `${g.title}: ${item.label}`;
  }
  // legacy labels
  if (c === "dash") return "Comercial (todos)";
  if (c === "manutencao") return "Engenharia (todos)";
  if (c === "estoque") return "Estoque";
  return c;
}

interface ProfileRow {
  id: string;
  user_id: string;
  display_name: string | null;
  cargo: string | null;
  aprovado: boolean;
  created_at: string;
}

function UserRow({ u, user, savingUserId, permQuery, onApprove, onRevoke, onReject, onToggleCargo }: {
  u: ProfileRow; user: any; savingUserId: string | null;
  permQuery: string;
  onApprove: (id: string) => void; onRevoke: (id: string) => void; onReject: (id: string) => void;
  onToggleCargo: (id: string, cargo: string) => void;
}) {
  const userCargos = u.cargo ? u.cargo.split(",").map(c => c.trim()) : [];
  const isUserAdmin = userCargos.includes("admin");
  const q = permQuery.trim().toLowerCase();
  const filteredGroups = PERM_GROUPS.map(g => ({
    ...g,
    items: q
      ? g.items.filter(i =>
          i.label.toLowerCase().includes(q) ||
          i.desc.toLowerCase().includes(q) ||
          i.code.toLowerCase().includes(q) ||
          g.title.toLowerCase().includes(q))
      : g.items,
  })).filter(g => g.items.length > 0);
  const totalPerms = PERM_GROUPS.reduce((acc, g) => acc + g.items.length, 0);
  const activePerms = isUserAdmin
    ? totalPerms
    : PERM_GROUPS.reduce((acc, g) => acc + g.items.filter(i => userCargos.includes(i.code)).length, 0);
  return (
    <div className="p-4 border-b border-border/30 last:border-0 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${u.aprovado ? 'bg-primary/15' : 'bg-warning/15'}`}>
            {u.aprovado ? <Users className="h-4 w-4 text-primary" /> : <Clock className="h-4 w-4 text-warning" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {u.display_name || "Sem nome"}
              {u.user_id === user?.id && (
                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">Você</span>
              )}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Desde {new Date(u.created_at).toLocaleDateString("pt-BR")}
              {u.aprovado && (
                <span className="ml-1.5">· {activePerms}/{totalPerms} permissões{isUserAdmin ? " (admin)" : ""}</span>
              )}
            </p>
          </div>
        </div>
        {u.aprovado ? (
          <button onClick={() => onRevoke(u.user_id)} disabled={savingUserId === u.user_id || u.user_id === user?.id}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-destructive/10 text-destructive disabled:opacity-30 transition">
            Revogar
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => onReject(u.user_id)} disabled={savingUserId === u.user_id}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-destructive/10 text-destructive disabled:opacity-50 transition">
              <XCircle className="h-3.5 w-3.5" /> Negar
            </button>
            <button onClick={() => onApprove(u.user_id)} disabled={savingUserId === u.user_id}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 disabled:opacity-50 transition">
              <CheckCircle className="h-3.5 w-3.5" /> Aprovar
            </button>
          </div>
        )}
      </div>
      {u.aprovado && (
        <div className="space-y-3">
          {/* Cargos especiais */}
          <div className="flex flex-wrap gap-2">
            {SPECIAL_CARGOS.map(c => {
              const isSelected = userCargos.includes(c.value);
              return (
                <button key={c.value} onClick={() => onToggleCargo(u.user_id, c.value)}
                  disabled={savingUserId === u.user_id}
                  title={c.desc}
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition disabled:opacity-50"
                  style={{
                    background: isSelected ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--muted))',
                    border: isSelected ? '1px solid hsl(var(--primary) / 0.4)' : '1px solid hsl(var(--border))',
                    color: isSelected ? 'hsl(var(--primary))' : undefined,
                  }}>
                  {c.label}
                </button>
              );
            })}
          </div>
          {/* Permissões por módulo */}
          {isUserAdmin && (
            <p className="text-[11px] text-muted-foreground italic px-1">
              Admin tem acesso a todos os módulos. Desmarque "Admin" para personalizar as permissões abaixo.
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredGroups.map(g => {
              const Icon = GROUP_ICONS[g.key];
              const groupTotal = PERM_GROUPS.find(x => x.key === g.key)!.items.length;
              const groupActive = isUserAdmin
                ? groupTotal
                : PERM_GROUPS.find(x => x.key === g.key)!.items.filter(i => userCargos.includes(i.code)).length;
              return (
              <div key={g.key} className="rounded-xl border border-border/40 p-3 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{groupActive}/{groupTotal}</span>
                </div>
                <div className="space-y-1.5">
                  {g.items.map(item => {
                    const isSelected = isUserAdmin || userCargos.includes(item.code);
                    const disabled = savingUserId === u.user_id || isUserAdmin;
                    return (
                      <label key={item.code}
                        className={`flex items-center gap-2 text-[12px] text-foreground px-1.5 py-1 rounded-md transition ${disabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer hover:bg-background/60"}`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={disabled}
                          onChange={() => onToggleCargo(u.user_id, item.code)}
                          className="h-3.5 w-3.5 rounded border-border accent-primary"
                        />
                        <span className={isSelected ? "font-medium" : ""} title={item.desc}>{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              );
            })}
            {filteredGroups.length === 0 && (
              <p className="col-span-full text-[12px] text-muted-foreground italic text-center py-2">
                Nenhuma permissão corresponde à busca.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Configuracoes() {
  const { data, setData, loading, error, undoDelete } = useAppData();
  const { user, refreshProfile, cargo: currentCargo, displayName: currentDisplayName, hasCargo } = useAuth();
  const { mode, accent, setMode, setAccent, toggleMode } = useTheme();
  const [novoVendedor, setNovoVendedor] = useState("");
  const [vendedoresStatus, setVendedoresStatus] = useState<{nome: string; ativo: boolean}[]>([]);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImport, setPendingImport] = useState<AppData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile state
  const [profileName, setProfileName] = useState("");
  const [profileCargo, setProfileCargo] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

  // Admin: user management
  const [allUsers, setAllUsers] = useState<ProfileRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [permSearch, setPermSearch] = useState("");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const isAdmin = hasCargo("admin");
  const normalizedName = (currentDisplayName || "").trim().toLowerCase();
  const canManageUsers =
    isAdmin ||
    normalizedName === "stanley" ||
    normalizedName === "jessica drumond" ||
    normalizedName === "andré souza" ||
    normalizedName === "andre souza";

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, cargo").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfileName(data.display_name || "");
          setProfileCargo(data.cargo || "");
        }
        setProfileLoading(false);
      });
  }, [user]);

  const fetchAllUsers = useCallback(async () => {
    if (!canManageUsers) return;
    setUsersLoading(true);
    const { data, error } = await supabase.from("profiles").select("id, user_id, display_name, cargo, aprovado, created_at").order("created_at", { ascending: true });
    if (!error && data) setAllUsers(data as ProfileRow[]);
    setUsersLoading(false);
  }, [canManageUsers]);

  useEffect(() => { fetchAllUsers(); }, [fetchAllUsers]);

  // Load vendedores with ativo status
  useEffect(() => {
    if (!user || !isAdmin) return;
    supabase.from("vendedores").select("nome, ativo").order("nome")
      .then(({ data: vData }) => {
        if (vData) {
          const unique = new Map<string, boolean>();
          vData.forEach(v => {
            const existing = unique.get(v.nome);
            if (existing === undefined || v.ativo) unique.set(v.nome, v.ativo ?? true);
          });
          setVendedoresStatus(Array.from(unique.entries()).map(([nome, ativo]) => ({ nome, ativo })));
        }
      });
  }, [user, isAdmin]);

  async function toggleUserCargo(profileUserId: string, role: string) {
    setSavingUserId(profileUserId);
    const currentUser = allUsers.find(u => u.user_id === profileUserId);
    const currentCargos = currentUser?.cargo ? currentUser.cargo.split(",").map(c => c.trim()) : [];
    let newCargos: string[];
    if (currentCargos.includes(role)) {
      newCargos = currentCargos.filter(c => c !== role);
    } else {
      newCargos = [...currentCargos, role];
    }
    const newCargo = newCargos.length > 0 ? newCargos.join(",") : null;
    const { error } = await supabase.from("profiles").update({ cargo: newCargo }).eq("user_id", profileUserId);
    if (error) {
      toast.error("Erro ao atualizar cargo");
    } else {
      setAllUsers(prev => prev.map(u => u.user_id === profileUserId ? { ...u, cargo: newCargo } : u));
      if (profileUserId === user?.id) {
        setProfileCargo(newCargo || "");
        await refreshProfile();
      }
      toast.success("Cargo atualizado");
    }
    setSavingUserId(null);
  }

  async function approveUser(profileUserId: string) {
    setSavingUserId(profileUserId);
    const { error } = await supabase.from("profiles").update({ aprovado: true }).eq("user_id", profileUserId);
    if (error) {
      toast.error("Erro ao aprovar usuário");
    } else {
      setAllUsers(prev => prev.map(u => u.user_id === profileUserId ? { ...u, aprovado: true } : u));
      toast.success("Usuário aprovado");
    }
    setSavingUserId(null);
  }

  async function revokeUser(profileUserId: string) {
    if (profileUserId === user?.id) {
      toast.error("Você não pode revogar seu próprio acesso");
      return;
    }
    setSavingUserId(profileUserId);
    const { error } = await supabase.from("profiles").update({ aprovado: false }).eq("user_id", profileUserId);
    if (error) {
      toast.error("Erro ao revogar acesso");
    } else {
      setAllUsers(prev => prev.map(u => u.user_id === profileUserId ? { ...u, aprovado: false } : u));
      toast.success("Acesso revogado");
    }
    setSavingUserId(null);
  }

  async function rejectUser(profileUserId: string) {
    if (profileUserId === user?.id) return;
    setSavingUserId(profileUserId);
    try {
      const res = await supabase.functions.invoke("delete-user", {
        body: { target_user_id: profileUserId },
      });
      if (res.error) {
        toast.error("Erro ao negar conta");
      } else {
        setAllUsers(prev => prev.filter(u => u.user_id !== profileUserId));
        toast.success("Solicitação negada e conta removida");
      }
    } catch {
      toast.error("Erro ao negar conta");
    }
    setSavingUserId(null);
  }

  async function saveProfile() {
    if (!user) return;
    setProfileSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: profileName.trim() || null,
      cargo: profileCargo || null,
    }).eq("user_id", user.id);
    if (error) {
      toast.error("Erro ao salvar perfil");
      setProfileSaving(false);
      return;
    }
    await refreshProfile();
    setProfileSaving(false);
    toast.success("Perfil atualizado");
  }

  async function updateMeta(cat: Categoria, masked: string) {
    const numVal = parseCurrencyMask(masked);
    await setData((prev) => {
      const newMetas = { ...prev.metas, [cat]: numVal };
      const updatedHistorico = upsertHistoricoMetas(prev, currentMonth, currentYear, newMetas, prev.meta_semanal);
      return { ...prev, metas: newMetas, historico_metas: updatedHistorico };
    });
  }

  async function updateMetaSemanal(field: string, value: string) {
    const numVal = parseInt(value) || 0;
    await setData((prev) => {
      const newMetaSemanal = { ...prev.meta_semanal, [field]: numVal };
      const updatedHistorico = upsertHistoricoMetas(prev, currentMonth, currentYear, prev.metas, newMetaSemanal);
      return { ...prev, meta_semanal: newMetaSemanal, historico_metas: updatedHistorico };
    });
  }

  function upsertHistoricoMetas(prev: AppData, mes: number, ano: number, metas: AppData["metas"], meta_semanal: AppData["meta_semanal"]) {
    const existing = prev.historico_metas.findIndex(h => h.mes === mes && h.ano === ano);
    const entry = { id: `meta-${mes}-${ano}`, mes, ano, metas: { ...metas }, meta_semanal: { ...meta_semanal } };
    if (existing >= 0) {
      return prev.historico_metas.map((h, i) => i === existing ? entry : h);
    }
    return [...prev.historico_metas, entry];
  }

  async function addVendedor() {
    if (!novoVendedor.trim()) return;
    const nome = novoVendedor.trim();
    const saved = await setData((prev) => ({ ...prev, vendedores: [...prev.vendedores, nome] }));
    if (!saved) return;
    setVendedoresStatus(prev => [...prev, { nome, ativo: true }]);
    setNovoVendedor("");
    toast.success("Vendedor adicionado");
  }

  async function toggleVendedor(name: string, ativo: boolean) {
    if (!user) return;
    const previousStatus = vendedoresStatus;
    const saved = await setData((prev) => ({
      ...prev,
      vendedores: ativo
        ? Array.from(new Set([...prev.vendedores, name]))
        : prev.vendedores.filter((v) => v !== name),
    }));
    if (!saved) {
      setVendedoresStatus(previousStatus);
      toast.error("Erro ao atualizar vendedor");
      return;
    }
    setVendedoresStatus(prev => prev.map(v => v.nome === name ? { ...v, ativo } : v));
    toast.success(ativo ? "Vendedor ativado" : "Vendedor desativado");
  }

  function handleExport() {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comercial_data_backup_${now.toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Dados exportados com sucesso");
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const importData: AppData = Array.isArray(parsed) ? parsed[0] : parsed;
        if (!importData.metas || !importData.lancamentos) {
          toast.error("Arquivo inválido: estrutura não reconhecida");
          return;
        }
        if (!importData.historico_metas) importData.historico_metas = [];
        setPendingImport(importData);
        setShowImportConfirm(true);
      } catch {
        toast.error("Erro ao ler o arquivo JSON");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function confirmImport() {
    if (!pendingImport) return;
    const saved = await setData(() => pendingImport);
    if (!saved) return;
    setShowImportConfirm(false);
    setPendingImport(null);
    toast.success("Dados importados com sucesso");
  }

  if (loading) return <ConfigSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6 pb-24">
      <h1 className="text-2xl font-bold text-foreground">Configurações</h1>

      {/* Perfil do Usuário */}
      <div>
        <p className="ios-section-title">PERFIL DO USUÁRIO</p>
        <div className="ios-list-group">
          <div className="ios-list-item">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">Nome</span>
            </div>
            <input
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              placeholder="Seu nome"
              className="text-right text-sm font-medium text-primary bg-transparent outline-none w-40"
            />
          </div>
          <div className="ios-list-item">
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">Cargo</span>
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {profileCargo ? profileCargo.split(",").map(c => cargoLabel(c.trim())).join(", ") : "Não definido"}
            </span>
          </div>
          <div className="p-3">
            <button onClick={saveProfile} disabled={profileSaving || profileLoading}
              className="w-full h-10 rounded-xl text-sm font-semibold text-primary-foreground bg-primary disabled:opacity-50">
              {profileSaving ? "Salvando..." : "Salvar Perfil"}
            </button>
          </div>
        </div>
      </div>

      {/* Admin: Gerenciamento de Usuários */}
      {canManageUsers && (
        <div>
          <p className="ios-section-title">GERENCIAMENTO DE USUÁRIOS</p>
          <div className="ios-list-group">
            {/* Search */}
            <div className="ios-list-item gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Buscar por nome ou email"
                className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder-muted-foreground"
              />
            </div>

            {usersLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Carregando usuários...</div>
            ) : (
              <>
                {/* Pending users first */}
                {(() => {
                  const filtered = allUsers.filter(u => {
                    if (!userSearch.trim()) return true;
                    const q = userSearch.toLowerCase();
                    return (u.display_name || "").toLowerCase().includes(q) || u.user_id.toLowerCase().includes(q);
                  });
                  const pending = filtered.filter(u => !u.aprovado);
                  const approved = filtered.filter(u => u.aprovado);

                  return (
                    <>
                      {pending.length > 0 && (
                        <div className="px-4 pt-3 pb-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-warning">
                            Pendentes ({pending.length})
                          </p>
                        </div>
                      )}
                      {pending.map(u => (
                        <UserRow key={u.id} u={u} user={user} savingUserId={savingUserId}
                          onApprove={approveUser} onRevoke={revokeUser} onReject={rejectUser} onToggleCargo={toggleUserCargo} />
                      ))}
                      {approved.length > 0 && (
                        <div className="px-4 pt-3 pb-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Aprovados ({approved.length})
                          </p>
                        </div>
                      )}
                      {approved.map(u => (
                        <UserRow key={u.id} u={u} user={user} savingUserId={savingUserId}
                          onApprove={approveUser} onRevoke={revokeUser} onReject={rejectUser} onToggleCargo={toggleUserCargo} />
                      ))}
                    </>
                  );
                })()}
              </>
            )}

            <div className="p-3 text-center">
              <p className="text-[11px] text-muted-foreground">{allUsers.length} usuário(s) cadastrado(s)</p>
            </div>
          </div>
        </div>
      )}

      {/* Aparência */}
      <div>
        <p className="ios-section-title">APARÊNCIA</p>
        <div className="ios-list-group">
          <div className="ios-list-item">
            <span className="text-sm text-foreground">Cor de acento</span>
            <div className="flex gap-2">
              {(Object.keys(accentMap) as AccentColor[]).map((color) => (
                <button key={color} onClick={() => setAccent(color)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{ background: accentMap[color].hex }}>
                  {accent === color && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <PushNotificationsCard />

      {/* Metas Mensais - Admin only */}
      {isAdmin && (
      <div>
        <p className="ios-section-title">METAS MENSAIS (R$)</p>
        <div className="ios-list-group">
          {(["produto", "servico", "contrato", "acessorio"] as Categoria[]).map((cat) => (
            <div key={cat} className="ios-list-item">
              <span className="text-sm text-foreground">{CATEGORIA_LABELS[cat]}</span>
              <input inputMode="numeric" value={numberToCurrencyMask(data.metas[cat])}
                onChange={(e) => updateMeta(cat, e.target.value)}
                className="text-right text-sm font-medium text-primary bg-transparent outline-none w-36" />
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Metas Semanais - Admin only */}
      {isAdmin && (
      <div>
        <p className="ios-section-title">METAS SEMANAIS</p>
        <div className="ios-list-group">
          {[
            { key: "captacoes", label: "Captações" },
            { key: "orcamentos", label: "Orçamentos" },
            { key: "visitas", label: "Visitas" },
          ].map(({ key, label }) => (
            <div key={key} className="ios-list-item">
              <span className="text-sm text-foreground">{label}</span>
              <input type="number"
                value={data.meta_semanal[key as keyof typeof data.meta_semanal]}
                onChange={(e) => updateMetaSemanal(key, e.target.value)}
                className="text-right text-sm font-medium text-primary bg-transparent outline-none w-20" />
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Vendedores - Admin only */}
      {isAdmin && (
      <div>
        <p className="ios-section-title">VENDEDORES</p>
        <div className="ios-list-group">
          {vendedoresStatus.map((v) => (
            <div key={v.nome} className="ios-list-item">
              <div className="flex items-center gap-2">
                <span className={`text-sm ${v.ativo ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{v.nome}</span>
                {!v.ativo && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Inativo</span>}
              </div>
              <button onClick={() => toggleVendedor(v.nome, !v.ativo)}
                className={`relative w-10 h-6 rounded-full transition-colors ${v.ativo ? 'bg-primary' : 'bg-muted'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${v.ativo ? 'translate-x-4' : ''}`} />
              </button>
            </div>
          ))}
          <div className="ios-list-item gap-2">
            <input value={novoVendedor} onChange={(e) => setNovoVendedor(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addVendedor()}
              placeholder="Novo vendedor" className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder-muted-foreground" />
            <button onClick={addVendedor} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary/15 text-primary">
              <Plus className="h-3.5 w-3.5" />Adicionar
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Dados */}
      <div>
        <p className="ios-section-title">DADOS</p>
        <div className="ios-list-group">
          <button onClick={handleExport} className="ios-list-item w-full text-left">
            <div className="flex items-center gap-3">
              <Download className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">Exportar Dados (JSON)</span>
            </div>
          </button>
          <button onClick={handleImportClick} className="ios-list-item w-full text-left">
            <div className="flex items-center gap-3">
              <Upload className="h-4 w-4 text-success" />
              <span className="text-sm text-foreground">Importar Dados (JSON)</span>
            </div>
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
      </div>

      {/* Import Confirm Modal */}
      {showImportConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-4 text-center glass-card">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto bg-destructive/15">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Substituir dados?</h3>
            <p className="text-sm text-muted-foreground">
              Todos os dados atuais serão substituídos pelos dados do arquivo importado. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setShowImportConfirm(false); setPendingImport(null); }}
                className="flex-1 py-3 rounded-xl text-sm font-medium bg-secondary text-muted-foreground">
                Cancelar
              </button>
              <button onClick={confirmImport}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-destructive">
                Substituir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Save Note */}
      <div className="fixed bottom-20 md:bottom-0 left-0 right-0 md:left-60 p-4 z-30 glass-nav">
        <p className="text-center text-xs text-muted-foreground">As alterações são salvas automaticamente</p>
      </div>
    </div>
  );
}
