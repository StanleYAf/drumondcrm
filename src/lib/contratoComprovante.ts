/**
 * Gera um comprovante de cadastro de contrato em PDF (via janela imprimível).
 * NÃO é um contrato jurídico — apenas um comprovante interno.
 */

export interface ComprovanteContrato {
  numero_contrato: string;
  cliente_nome: string;
  cliente_cnpj?: string | null;
  cliente_categoria?: string | null;
  cliente_email?: string | null;
  cliente_responsavel_financeiro?: string | null;
  tipo_label: string;
  status_label: string;
  servico_contratado?: string | null;
  equipamentos_cobertos?: string | null;
  data_faturamento?: string | null;
  data_vencimento?: string | null;
  vigencia_inicio: string;
  vigencia_fim: string;
  valor_contrato?: number | null;
  parcelas?: number | null;
  valor_parcela?: number | null;
  valor_mensal?: number | null;
  valor_anual?: number | null;
  retem_iss?: boolean | null;
  responsavel_comercial?: string | null;
  observacoes?: string | null;
  drive_url?: string | null;
  created_at?: string | null;
  created_by_name?: string | null;
}

function fmtBRL(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

function escape(s: string | null | undefined): string {
  return (s ?? "—")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function row(label: string, value: string | number | null | undefined): string {
  const v = value == null || value === "" ? "—" : value;
  return `<tr><td class="lbl">${escape(label)}</td><td class="val">${escape(String(v))}</td></tr>`;
}

export function abrirComprovantePDF(c: ComprovanteContrato) {
  const agora = new Date();
  const emissao = agora.toLocaleString("pt-BR");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Comprovante de Cadastro de Contrato ${escape(c.numero_contrato)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0F172A; margin: 0; padding: 32px; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1F4E79; padding-bottom: 16px; margin-bottom: 24px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand-mark { width: 44px; height: 44px; display: grid; place-items: center; background: #1F4E79; color: #50B9EC; border-radius: 10px; font-weight: 800; font-size: 18px; letter-spacing: 1px; }
  .brand-text strong { font-size: 18px; color: #0F172A; }
  .brand-text div { font-size: 12px; color: #64748B; }
  .meta { text-align: right; font-size: 12px; color: #64748B; }
  .meta .num { display: inline-block; background: #EAF4FD; color: #1F4E79; padding: 6px 10px; border-radius: 8px; font-weight: 700; font-size: 14px; margin-bottom: 6px; }
  h1 { font-size: 22px; margin: 0 0 6px 0; }
  .subtitle { color: #64748B; font-size: 12px; margin-bottom: 20px; }
  .section { margin-bottom: 22px; }
  .section h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #1F4E79; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; margin: 0 0 10px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { padding: 6px 4px; vertical-align: top; }
  td.lbl { color: #64748B; width: 220px; font-weight: 500; }
  td.val { color: #0F172A; font-weight: 600; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 32px; }
  .observacao { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; font-size: 13px; color: #334155; white-space: pre-wrap; }
  .footer { position: fixed; bottom: 16px; left: 32px; right: 32px; border-top: 1px solid #E2E8F0; padding-top: 8px; font-size: 11px; color: #94A3B8; display: flex; justify-content: space-between; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background: #FEF3C7; color: #B45309; }
  .actions { margin-top: 28px; text-align: center; }
  .actions button { background: #1F4E79; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; cursor: pointer; margin: 0 4px; }
  .actions button.alt { background: #64748B; }
  @media print { .actions { display: none; } .footer { position: fixed; } }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="brand-mark">DSH</div>
      <div class="brand-text">
        <strong>DSH Hub</strong>
        <div>Sistema de gestão integrada</div>
      </div>
    </div>
    <div class="meta">
      <div class="num">${escape(c.numero_contrato)}</div>
      <div>Emitido em ${escape(emissao)}</div>
    </div>
  </div>

  <h1>Comprovante de Cadastro de Contrato</h1>
  <div class="subtitle">
    <span class="badge">Documento interno</span>
    &nbsp;Este documento não substitui o contrato jurídico. Destina-se à conferência, impressão e arquivamento.
  </div>

  <div class="section">
    <h2>Cliente</h2>
    <div class="grid2">
      <table>
        ${row("Cliente", c.cliente_nome)}
        ${row("CNPJ", c.cliente_cnpj)}
        ${row("Categoria", c.cliente_categoria)}
      </table>
      <table>
        ${row("Responsável Financeiro", c.cliente_responsavel_financeiro)}
        ${row("E-mail", c.cliente_email)}
      </table>
    </div>
  </div>

  <div class="section">
    <h2>Contrato</h2>
    <div class="grid2">
      <table>
        ${row("Tipo", c.tipo_label)}
        ${row("Status", c.status_label)}
        ${row("Serviço contratado", c.servico_contratado)}
        ${row("Equipamentos cobertos", c.equipamentos_cobertos)}
        ${row("Responsável comercial", c.responsavel_comercial)}
      </table>
      <table>
        ${row("Data de faturamento", c.data_faturamento || "")}
        ${row("Data de vencimento", c.data_vencimento || "")}
        ${row("Vigência (início)", fmtDate(c.vigencia_inicio))}
        ${row("Vigência (fim)", fmtDate(c.vigencia_fim))}
        ${row("Retém ISS?", c.retem_iss ? "Sim" : "Não")}
      </table>
    </div>
  </div>

  <div class="section">
    <h2>Valores</h2>
    <div class="grid2">
      <table>
        ${row("Valor do contrato", fmtBRL(c.valor_contrato))}
        ${row("Parcelas", c.parcelas)}
        ${row("Valor por parcela", fmtBRL(c.valor_parcela))}
      </table>
      <table>
        ${row("Valor mensal", fmtBRL(c.valor_mensal))}
        ${row("Valor anual", fmtBRL(c.valor_anual))}
      </table>
    </div>
  </div>

  ${c.observacoes ? `<div class="section"><h2>Observações</h2><div class="observacao">${escape(c.observacoes)}</div></div>` : ""}

  <div class="section">
    <h2>Registro</h2>
    <table>
      ${row("Cadastrado por", c.created_by_name)}
      ${row("Data do cadastro", c.created_at ? new Date(c.created_at).toLocaleString("pt-BR") : "—")}
      ${row("Emissão deste comprovante", emissao)}
      ${c.drive_url ? row("Link de arquivos", c.drive_url) : ""}
    </table>
  </div>

  <div class="actions">
    <button onclick="window.print()">Imprimir / Salvar PDF</button>
    <button class="alt" onclick="window.close()">Fechar</button>
  </div>

  <div class="footer">
    <span>DSH Hub — Comprovante interno de cadastro</span>
    <span>${escape(c.numero_contrato)} · ${escape(emissao)}</span>
  </div>
</body>
</html>`;

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) {
    alert("Bloqueio de pop-up impediu abrir o comprovante. Habilite pop-ups para este site.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}