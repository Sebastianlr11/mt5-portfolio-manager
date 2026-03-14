import { Trade, PortfolioStats } from './types';

export const generateConsolidatedReport = (trades: Trade[], stats: PortfolioStats) => {
    // Compute running portfolio balance for the exported table
    let runningBalance = 0;
    const rows = trades
        .filter(t => t.type !== 'balance')
        .map(t => {
            const net = t.profit + t.commission + t.swap;
            runningBalance += net;
            return { ...t, portfolioBalance: runningBalance };
        });

    const date = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>MT5 Portfolio Fuser — Informe Consolidado</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#0b0e14;color:#c8d4e8;font-size:13px}
    .page{max-width:1400px;margin:0 auto;padding:30px 24px}
    header{border-bottom:1px solid #252e3f;padding-bottom:20px;margin-bottom:28px;display:flex;align-items:flex-start;justify-content:space-between}
    .logo{display:flex;align-items:center;gap:12px}
    .logo-icon{width:42px;height:42px;background:rgba(0,200,150,.12);border:1px solid rgba(0,200,150,.25);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px}
    h1{font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px}
    h1 span{color:#00c896}
    .subtitle{font-size:11px;color:#8899b0;font-weight:600;text-transform:uppercase;letter-spacing:.1em;margin-top:3px}
    .meta{text-align:right;font-size:11px;color:#8899b0}
    h2{font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#8899b0;margin:24px 0 12px;display:flex;align-items:center;gap:8px}
    h2::before{content:'';display:inline-block;width:4px;height:14px;background:#00c896;border-radius:2px}
    .table-wrap{overflow-x:auto;border-radius:14px;border:1px solid #252e3f}
    table{width:100%;border-collapse:collapse;font-size:12px}
    thead tr{background:#131820}
    th{padding:11px 14px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:#8899b0;border-bottom:1px solid #252e3f;white-space:nowrap}
    td{padding:9px 14px;border-bottom:1px solid #1a2233;white-space:nowrap}
    tr:last-child td{border-bottom:none}
    tr:nth-child(even) td{background:rgba(255,255,255,.015)}
    .pos{color:#00c896;font-weight:700}
    .neg{color:#f05050;font-weight:700}
    .muted{color:#8899b0}
    .magic-badge{display:inline-block;padding:1px 7px;background:rgba(78,158,255,.12);border:1px solid rgba(78,158,255,.25);color:#4e9eff;border-radius:20px;font-size:10px;font-weight:800}
    footer{margin-top:32px;padding-top:16px;border-top:1px solid #252e3f;text-align:center;font-size:10px;color:#8899b0}
  </style>
</head>
<body>
<div class="page">
  <header>
    <div class="logo">
      <div class="logo-icon">⚡</div>
      <div>
        <h1>MT5 Portfolio <span>FUSER</span></h1>
        <div class="subtitle">Informe Consolidado</div>
      </div>
    </div>
    <div class="meta">
      <div>Generado: ${date}</div>
      <div style="margin-top:4px">${stats.botStats.length} sistemas · ${stats.totalTrades} operaciones</div>
    </div>
  </header>

  ${stats.botStats.length > 0 ? `
  <h2>Rendimiento por Bot</h2>
  <div class="table-wrap" style="margin-bottom:24px">
    <table>
      <thead><tr>
        <th>Bot</th><th>Magic</th><th>Trades</th><th>Win Rate</th><th>Comisión</th><th>Swap</th><th>Profit Neto</th>
      </tr></thead>
      <tbody>
        ${stats.botStats.map(b => `
        <tr>
          <td style="color:#fff;font-weight:600;max-width:280px;overflow:hidden;text-overflow:ellipsis">${b.botName}</td>
          <td>${b.magic ? `<span class="magic-badge">#${b.magic}</span>` : '<span class="muted">—</span>'}</td>
          <td class="muted">${b.trades}</td>
          <td class="${b.winRate >= 50 ? 'pos' : 'neg'}">${b.winRate.toFixed(1)}%</td>
          <td class="muted">${b.commission.toFixed(2)}</td>
          <td class="muted">${b.swap.toFixed(2)}</td>
          <td class="${b.profit >= 0 ? 'pos' : 'neg'}">${b.profit >= 0 ? '+' : ''}$${b.profit.toFixed(2)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}

  <h2>Historial de Operaciones</h2>
  <div class="table-wrap">
    <table>
      <thead><tr>
        <th>#</th><th>Fecha/Hora</th><th>Bot</th><th>Magic</th>
        <th>Símbolo</th><th>Tipo</th><th>Volumen</th><th>Precio</th>
        <th>Comisión</th><th>Swap</th><th>Profit</th><th>Neto</th><th>Balance</th>
      </tr></thead>
      <tbody>
        ${rows.map((t, i) => {
            const net = t.profit + t.commission + t.swap;
            return `<tr>
              <td class="muted">${i + 1}</td>
              <td class="muted">${t.time.toLocaleString('es-ES')}</td>
              <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;color:#c8d4e8">${t.botName}</td>
              <td>${t.magic ? `<span class="magic-badge">#${t.magic}</span>` : '<span class="muted">—</span>'}</td>
              <td>${t.symbol || '<span class="muted">—</span>'}</td>
              <td style="text-transform:capitalize">${t.type}</td>
              <td class="muted">${t.volume > 0 ? t.volume : '—'}</td>
              <td class="muted">${t.price > 0 ? t.price.toFixed(t.price > 100 ? 0 : 5) : '—'}</td>
              <td class="muted">${t.commission !== 0 ? t.commission.toFixed(2) : '—'}</td>
              <td class="muted">${t.swap !== 0 ? t.swap.toFixed(2) : '—'}</td>
              <td class="${t.profit >= 0 ? 'pos' : 'neg'}">${t.profit.toFixed(2)}</td>
              <td class="${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${net.toFixed(2)}</td>
              <td class="${t.portfolioBalance >= 0 ? 'pos' : 'neg'}">${t.portfolioBalance.toFixed(2)}</td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>

  <footer>Generado por MT5 Portfolio FUSER &mdash; ${date}</footer>
</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Portfolio_Consolidado_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
