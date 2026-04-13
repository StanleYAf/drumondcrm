import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { toast } from "sonner";
import { Truck, Plus, Pencil, Trash2, X, Search, Package } from "lucide-react";
import { ListSkeleton } from "@/components/LoadingSkeleton";

interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string | null;
  contato: string | null;
  email: string | null;
  telefone: string | null;
  produto_count?: number;
}

function applyCnpjMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export default function Fornecedores() {
  const { user } = useAuth();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState<Fornecedor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [formNome, setFormNome] = useState("");
  const [formCnpj, setFormCnpj] = useState("");
  const [formContato, setFormContato] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formTelefone, setFormTelefone] = useState("");

  const fetchFornecedores = useCallback(async () => {
    if (!user) return;
    const { data: fornData, error } = await supabase
      .from("fornecedores").select("*").order("nome");
    if (error) { toast.error("Erro ao carregar fornecedores"); return; }

    // Count products per fornecedor
    const { data: prodData } = await supabase
      .from("produtos_estoque").select("fornecedor_id");
    const countMap = new Map<string, number>();
    (prodData || []).forEach(p => {
      if (p.fornecedor_id) countMap.set(p.fornecedor_id, (countMap.get(p.fornecedor_id) || 0) + 1);
    });

    setFornecedores((fornData || []).map(f => ({ ...f, produto_count: countMap.get(f.id) || 0 })));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFornecedores(); }, [fetchFornecedores]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return fornecedores;
    return fornecedores.filter(f =>
      f.nome.toLowerCase().includes(q) ||
      (f.cnpj && f.cnpj.includes(q)) ||
      (f.email && f.email.toLowerCase().includes(q))
    );
  }, [fornecedores, searchQuery]);

  function resetForm() {
    setShowForm(false); setEditItem(null);
    setFormNome(""); setFormCnpj(""); setFormContato(""); setFormEmail(""); setFormTelefone("");
  }

  function openEdit(f: Fornecedor) {
    setEditItem(f); setFormNome(f.nome); setFormCnpj(f.cnpj || "");
    setFormContato(f.contato || ""); setFormEmail(f.email || ""); setFormTelefone(f.telefone || "");
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !formNome.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    const payload = {
      user_id: user.id, nome: formNome.trim(),
      cnpj: formCnpj.trim() || null, contato: formContato.trim() || null,
      email: formEmail.trim() || null, telefone: formTelefone.trim() || null,
    };
    let error;
    if (editItem) { ({ error } = await supabase.from("fornecedores").update(payload).eq("id", editItem.id)); }
    else { ({ error } = await supabase.from("fornecedores").insert(payload)); }
    if (error) { toast.error("Erro ao salvar fornecedor"); setSaving(false); return; }
    toast.success(editItem ? "Fornecedor atualizado" : "Fornecedor cadastrado");
    resetForm(); setSaving(false); fetchFornecedores();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("fornecedores").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir. Verifique se há produtos vinculados."); return; }
    toast.success("Fornecedor excluído");
    fetchFornecedores();
  }

  if (loading) return <ListSkeleton />;

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Fornecedores</h1>
        <span className="text-sm text-muted-foreground">{fornecedores.length} cadastrados</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="ios-input w-full pl-10" placeholder="Buscar fornecedor..." />
      </div>

      <div>
        <p className="ios-section-title">FORNECEDORES ({filtered.length})</p>
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum fornecedor cadastrado</p>
          </div>
        ) : (
          <div className="ios-list-group">
            {filtered.map(f => (
              <div key={f.id} className="ios-list-item">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{f.nome}</span>
                    {f.produto_count != null && f.produto_count > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground flex items-center gap-0.5">
                        <Package className="h-2.5 w-2.5" />{f.produto_count}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {f.cnpj && <span className="text-[11px] text-muted-foreground">{f.cnpj}</span>}
                    {f.contato && <span className="text-[11px] text-muted-foreground">• {f.contato}</span>}
                    {f.telefone && <span className="text-[11px] text-muted-foreground">• {f.telefone}</span>}
                    {f.email && <span className="text-[11px] text-muted-foreground">• {f.email}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg hover:bg-muted">
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDelete(f.id)} className="p-1.5 rounded-lg hover:bg-muted">
                    <Trash2 className="h-3.5 w-3.5" style={{ color: '#FF453A' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-md mx-4 mb-4 md:mb-0">
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">{editItem ? "Editar Fornecedor" : "Novo Fornecedor"}</h3>
                <button onClick={resetForm}><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
              <form onSubmit={handleSave} className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Nome *</label>
                  <input value={formNome} onChange={e => setFormNome(e.target.value)} className="ios-input w-full" placeholder="Razão social" required />
                </div>
                <div>
                  <label className="text-[11px] font-medium block mb-1 text-muted-foreground">CNPJ</label>
                  <input value={formCnpj} onChange={e => setFormCnpj(applyCnpjMask(e.target.value))}
                    className="ios-input w-full" placeholder="00.000.000/0000-00" inputMode="numeric" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Contato</label>
                    <input value={formContato} onChange={e => setFormContato(e.target.value)} className="ios-input w-full" placeholder="Nome do contato" />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Telefone</label>
                    <input value={formTelefone} onChange={e => setFormTelefone(e.target.value)} className="ios-input w-full" placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-medium block mb-1 text-muted-foreground">Email</label>
                  <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="ios-input w-full" placeholder="email@empresa.com" />
                </div>
                <button type="submit" disabled={saving}
                  className="w-full h-12 rounded-xl text-base font-semibold text-foreground bg-primary disabled:opacity-50">
                  {saving ? "Salvando..." : editItem ? "Salvar Alterações" : "Cadastrar"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button onClick={() => { resetForm(); setShowForm(true); }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-40 bg-primary text-foreground"
        style={{ boxShadow: '0 4px 20px rgba(10,132,255,0.4)' }}>
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
