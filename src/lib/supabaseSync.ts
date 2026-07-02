import { supabase } from "@/integrations/supabase/client";
import type { AppData, Lancamento, IndicadorSemanal, PosVenda, MetaHistorica, Categoria } from "./types";
import { INITIAL_DATA } from "./initialData";

const CATEGORIA_MAP: Record<string, keyof AppData["lancamentos"]> = {
  produto: "produtos",
  servico: "servicos",
  contrato: "contratos",
  acessorio: "acessorios",
};

export async function loadFromSupabase(userId: string): Promise<AppData> {
  const [lancRes, indRes, pvRes, notasRes, metasRes, vendRes] = await Promise.all([
    supabase.from("lancamentos").select("*"),
    supabase.from("indicadores_semanais").select("*"),
    supabase.from("pos_venda").select("*"),
    supabase.from("notas_contato").select("*"),
    supabase.from("metas_historicas").select("*"),
    supabase.from("vendedores").select("*"),
  ]);

  // Build lancamentos by category
  const lancamentos: AppData["lancamentos"] = { produtos: [], servicos: [], contratos: [], acessorios: [] };
  for (const row of lancRes.data ?? []) {
    const key = CATEGORIA_MAP[row.categoria];
    if (key) {
      lancamentos[key].push({
        id: row.id,
        cliente: row.cliente,
        valor: Number(row.valor),
        custos: Number((row as any).custos ?? 0),
        data: row.data,
        produto: row.produto ?? undefined,
        servico: row.servico ?? undefined,
        item: row.item ?? undefined,
        vendedor: row.vendedor ?? undefined,
        tipo: (row as any).tipo ?? undefined,
        paid: Boolean((row as any).paid ?? false),
        paid_at: (row as any).paid_at ?? null,
        paid_by: (row as any).paid_by ?? null,
      });
    }
  }

  // Build indicadores
  const indicadores_semanais: IndicadorSemanal[] = (indRes.data ?? []).map((r) => ({
    id: r.id,
    data: r.data,
    semana: r.semana,
    mes: r.mes,
    vendedor: r.vendedor,
    captacoes: r.captacoes,
    orcamentos: r.orcamentos,
    visitas: r.visitas,
    ano: r.ano,
  }));

  // Build notas map
  const notasMap: Record<string, { id: string; texto: string; timestamp: string }[]> = {};
  for (const n of notasRes.data ?? []) {
    if (!notasMap[n.pos_venda_id]) notasMap[n.pos_venda_id] = [];
    notasMap[n.pos_venda_id].push({ id: n.id, texto: n.texto, timestamp: n.created_at });
  }

  // Build pos_venda
  const pos_venda: PosVenda[] = (pvRes.data ?? []).map((r) => ({
    id: r.id,
    data: r.data,
    cliente: r.cliente,
    vendedor: r.vendedor,
    status: r.status,
    notas: notasMap[r.id] ?? [],
    status_changed_at: r.status_changed_at ?? undefined,
  }));

  // Build metas historicas
  const historico_metas: MetaHistorica[] = (metasRes.data ?? []).map((r) => ({
    id: r.id,
    mes: r.mes,
    ano: r.ano,
    metas: {
      produto: Number(r.meta_produto),
      servico: Number(r.meta_servico),
      contrato: Number(r.meta_contrato),
      acessorio: Number(r.meta_acessorio),
    },
    meta_semanal: {
      captacoes: r.meta_captacoes,
      orcamentos: r.meta_orcamentos,
      visitas: r.meta_visitas,
    },
  }));

  const vendedores = [...new Set((vendRes.data ?? []).filter((v: any) => v.ativo !== false).map((v) => v.nome))];

  // Use defaults for current metas (from historico or INITIAL_DATA)
  const now = new Date();
  const currentMeta = historico_metas.find(
    (h) => h.mes === now.getMonth() + 1 && h.ano === now.getFullYear()
  );

  // Shared data - no seeding needed since all users see all data

  return {
    metas: currentMeta?.metas ?? { ...INITIAL_DATA.metas },
    meta_semanal: currentMeta?.meta_semanal ?? { ...INITIAL_DATA.meta_semanal },
    lancamentos,
    indicadores_semanais,
    pos_venda,
    vendedores,
    historico_metas,
  };
}

async function seedInitialData(userId: string): Promise<void> {
  const d = INITIAL_DATA;

  // Seed vendedores
  await supabase.from("vendedores").insert(d.vendedores.map((nome) => ({ user_id: userId, nome }))).then();

  // Seed lancamentos
  const allLanc: any[] = [];
  for (const [key, arr] of Object.entries(d.lancamentos)) {
    const cat = ({ produtos: "produto", servicos: "servico", contratos: "contrato", acessorios: "acessorio" } as any)[key];
    for (const l of arr) {
      allLanc.push({
        user_id: userId, categoria: cat, cliente: l.cliente, valor: l.valor, data: l.data,
        produto: l.produto ?? null, servico: l.servico ?? null, item: l.item ?? null, vendedor: l.vendedor ?? null,
      });
    }
  }
  if (allLanc.length > 0) await supabase.from("lancamentos").insert(allLanc).then();

  // Seed indicadores
  if (d.indicadores_semanais.length > 0) {
    await supabase.from("indicadores_semanais").insert(
      d.indicadores_semanais.map((i) => ({
        user_id: userId, data: i.data, semana: i.semana, mes: i.mes, ano: i.ano,
        vendedor: i.vendedor, captacoes: i.captacoes, orcamentos: i.orcamentos, visitas: i.visitas,
      }))
    ).then();
  }

  // Seed pos_venda
  if (d.pos_venda.length > 0) {
    await supabase.from("pos_venda").insert(
      d.pos_venda.map((p) => ({
        user_id: userId, data: p.data, cliente: p.cliente, vendedor: p.vendedor,
        status: p.status, status_changed_at: p.status_changed_at ?? null,
      }))
    ).then();
  }
}

// ---- Sync helpers ----

function diffArrays<T extends { id: string }>(
  oldArr: T[],
  newArr: T[]
): { added: T[]; removed: T[]; updated: T[] } {
  const oldMap = new Map(oldArr.map((item) => [item.id, item]));
  const newMap = new Map(newArr.map((item) => [item.id, item]));

  const added = newArr.filter((item) => !oldMap.has(item.id));
  const removed = oldArr.filter((item) => !newMap.has(item.id));
  const updated = newArr.filter((item) => {
    const old = oldMap.get(item.id);
    return old && JSON.stringify(old) !== JSON.stringify(item);
  });

  return { added, removed, updated };
}

function getCategoriaFromKey(key: keyof AppData["lancamentos"]): Categoria {
  const map: Record<string, Categoria> = {
    produtos: "produto",
    servicos: "servico",
    contratos: "contrato",
    acessorios: "acessorio",
  };
  return map[key];
}

export async function syncToSupabase(userId: string, oldData: AppData, newData: AppData): Promise<void> {
  const promises: PromiseLike<any>[] = [];

  // Sync lancamentos
  for (const key of Object.keys(CATEGORIA_MAP) as Categoria[]) {
    const arrayKey = CATEGORIA_MAP[key] as keyof AppData["lancamentos"];
    const categoria = key;
    const { added, removed, updated } = diffArrays(oldData.lancamentos[arrayKey], newData.lancamentos[arrayKey]);

    if (removed.length > 0) {
      promises.push(supabase.from("lancamentos").delete().in("id", removed.map((r) => r.id)).then());
    }
    if (added.length > 0) {
      promises.push(supabase.from("lancamentos").insert(
        added.map((l) => ({
          id: l.id, user_id: userId, categoria, cliente: l.cliente, valor: l.valor, custos: l.custos ?? 0, data: l.data,
          produto: l.produto ?? null, servico: l.servico ?? null, item: l.item ?? null, vendedor: l.vendedor ?? null,
          tipo: l.tipo ?? null,
          paid: l.paid ?? false, paid_at: l.paid_at ?? null, paid_by: l.paid_by ?? null,
        }))
      ).then());
    }
    for (const l of updated) {
      promises.push(supabase.from("lancamentos").update({
        cliente: l.cliente, valor: l.valor, custos: l.custos ?? 0, data: l.data,
        produto: l.produto ?? null, servico: l.servico ?? null, item: l.item ?? null, vendedor: l.vendedor ?? null,
        tipo: l.tipo ?? null,
        paid: l.paid ?? false, paid_at: l.paid_at ?? null, paid_by: l.paid_by ?? null,
      }).eq("id", l.id).then());
    }
  }

  // Sync indicadores
  const indDiff = diffArrays(oldData.indicadores_semanais, newData.indicadores_semanais);
  if (indDiff.removed.length > 0) {
    promises.push(supabase.from("indicadores_semanais").delete().in("id", indDiff.removed.map((r) => r.id)).then());
  }
  if (indDiff.added.length > 0) {
    promises.push(supabase.from("indicadores_semanais").insert(
      indDiff.added.map((i) => ({
        id: i.id, user_id: userId, data: i.data, semana: i.semana, mes: i.mes, ano: i.ano,
        vendedor: i.vendedor, captacoes: i.captacoes, orcamentos: i.orcamentos, visitas: i.visitas,
      }))
    ).then());
  }
  for (const i of indDiff.updated) {
    promises.push(supabase.from("indicadores_semanais").update({
      data: i.data, semana: i.semana, mes: i.mes, ano: i.ano,
      vendedor: i.vendedor, captacoes: i.captacoes, orcamentos: i.orcamentos, visitas: i.visitas,
    }).eq("id", i.id).then());
  }

  // Sync pos_venda
  const pvDiff = diffArrays(oldData.pos_venda, newData.pos_venda);
  if (pvDiff.removed.length > 0) {
    promises.push(supabase.from("pos_venda").delete().in("id", pvDiff.removed.map((r) => r.id)).then());
  }
  if (pvDiff.added.length > 0) {
    promises.push(supabase.from("pos_venda").insert(
      pvDiff.added.map((p) => ({
        id: p.id, user_id: userId, data: p.data, cliente: p.cliente, vendedor: p.vendedor,
        status: p.status, status_changed_at: p.status_changed_at ?? null,
      }))
    ).then());
  }
  for (const p of pvDiff.updated) {
    promises.push(supabase.from("pos_venda").update({
      data: p.data, cliente: p.cliente, vendedor: p.vendedor,
      status: p.status, status_changed_at: p.status_changed_at ?? null,
    }).eq("id", p.id).then());
  }

  // Sync notas_contato
  for (const pv of newData.pos_venda) {
    const oldPv = oldData.pos_venda.find((o) => o.id === pv.id);
    const oldNotas = oldPv?.notas ?? [];
    const newNotas = pv.notas ?? [];
    const notasDiff = diffArrays(oldNotas, newNotas);

    if (notasDiff.removed.length > 0) {
      promises.push(supabase.from("notas_contato").delete().in("id", notasDiff.removed.map((n) => n.id)).then());
    }
    if (notasDiff.added.length > 0) {
      promises.push(supabase.from("notas_contato").insert(
        notasDiff.added.map((n) => ({ id: n.id, user_id: userId, pos_venda_id: pv.id, texto: n.texto }))
      ).then());
    }
  }

  // Sync vendedores (only add new ones, don't delete — use ativo toggle instead)
  const oldVendSet = new Set(oldData.vendedores);
  const addedVend = newData.vendedores.filter((v) => !oldVendSet.has(v));

  if (addedVend.length > 0) {
    promises.push(supabase.from("vendedores").insert(addedVend.map((nome) => ({ user_id: userId, nome }))).then());
  }

  // Sync metas_historicas
  const metasDiff = diffArrays(
    oldData.historico_metas.map((m) => ({ ...m, id: m.id || `${m.mes}-${m.ano}` })),
    newData.historico_metas.map((m) => ({ ...m, id: m.id || `${m.mes}-${m.ano}` }))
  );

  if (metasDiff.removed.length > 0) {
    promises.push(supabase.from("metas_historicas").delete().in("id", metasDiff.removed.map((r) => r.id)).then());
  }
  for (const m of [...metasDiff.added, ...metasDiff.updated]) {
    promises.push(supabase.from("metas_historicas").upsert({
      id: m.id, user_id: userId, mes: m.mes, ano: m.ano,
      meta_produto: m.metas.produto, meta_servico: m.metas.servico,
      meta_contrato: m.metas.contrato, meta_acessorio: m.metas.acessorio,
      meta_captacoes: m.meta_semanal.captacoes, meta_orcamentos: m.meta_semanal.orcamentos,
      meta_visitas: m.meta_semanal.visitas,
    }, { onConflict: "user_id,mes,ano" }).then());
  }

  const results = await Promise.all(promises);
  const errors = results.filter((r: any) => r?.error);
  if (errors.length > 0) {
    console.error("[syncToSupabase] Errors:", errors.map((e: any) => e.error));
    throw new Error("Falha ao sincronizar dados com o servidor");
  }
}
