const { dashboardClientScript } = require('./dashboard-script');

function renderPreviewHtml(viewModel) {
  const css = `
:root { color-scheme: dark; --bg:#0E1116; --panel:#161B22; --line:#243041; --text:#E6EAF0; --muted:#9AA7B8; --primary:#C7A76A; --primary-hi:#D8BC84; --accent:#6FB68A; --danger:#E56F6F; --warn:#E2B860; --font-sans:'Geist','Inter Tight',ui-sans-serif,system-ui,sans-serif; --font-mono:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace; }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--text); font-family: var(--font-sans); }
.layout { display:grid; grid-template-columns: 220px 1fr; min-height:100vh; }
nav { border-right:1px solid var(--line); padding:20px 16px; position:sticky; top:0; height:100vh; }
nav h1 { margin:0 0 4px; font-size:1.05rem; letter-spacing:-0.01em; }
nav p { margin:0 0 16px; color:var(--muted); font-size:0.82rem; line-height:1.4; }
nav a { display:block; color:var(--muted); text-decoration:none; padding:6px 0; font-size:0.88rem; }
nav a:hover { color:var(--primary-hi); }
main { padding:24px 28px 48px; }
.toolbar { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:16px; align-items:center; }
.toolbar input, .toolbar select, .toolbar button { background:var(--bg); color:var(--text); border:1px solid var(--line); border-radius:6px; padding:8px 10px; font-size:0.84rem; }
.toolbar button { cursor:pointer; }
.toolbar button:hover { border-color:var(--primary); }
.toolbar input:focus-visible, .toolbar select:focus-visible, .toolbar button:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
.banner { border:1px solid var(--line); background:var(--panel); border-radius:10px; padding:14px 16px; margin-bottom:20px; border-left:3px solid var(--primary); }
.cards { display:grid; gap:12px; grid-template-columns: repeat(auto-fit,minmax(140px,1fr)); margin-bottom:20px; }
.card { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:14px; }
.card .label { color:var(--muted); font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; }
.card .value { font-size:1.35rem; font-weight:600; margin-top:6px; font-variant-numeric:tabular-nums; }
section { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:16px; margin-bottom:16px; scroll-margin-top:16px; }
section h2 { margin:0 0 12px; font-size:0.92rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--muted); }
.grid-2 { display:grid; gap:16px; }
table { width:100%; border-collapse:collapse; font-size:0.84rem; }
th,td { text-align:left; padding:7px 8px; border-bottom:1px solid var(--line); vertical-align:top; }
th { color:var(--muted); font-weight:500; }
.badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:0.75rem; font-family:var(--font-mono); }
.badge-ok { background:#13241B; color:var(--accent); }
.badge-fail { background:#2A1717; color:var(--danger); }
pre { margin:0; white-space:pre-wrap; word-break:break-word; font-size:0.78rem; font-family:var(--font-mono); background:var(--bg); padding:12px; border-radius:6px; border:1px solid var(--line); max-height:360px; overflow:auto; }
.note { color:var(--muted); font-size:0.85rem; }
.detail-panel { margin-top:12px; }
@media (max-width: 860px) { .layout { grid-template-columns: 1fr; } nav { position:static; height:auto; border-right:none; border-bottom:1px solid var(--line); } }
@media (min-width: 900px) { .grid-2 { grid-template-columns: 1fr 1fr; } }
`;

  const sections = viewModel.dashboard.sections.map((section) =>
    `<a href="#${section.id}">${escapeHtml(section.label)}</a>`,
  ).join('');
  const exportJson = JSON.stringify(viewModel.exportPayload).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(viewModel.dashboard.title)}</title>
<style>${css}</style>
</head>
<body>
<div class="layout">
<nav>
  <h1>${escapeHtml(viewModel.dashboard.title)}</h1>
  <p>${escapeHtml(viewModel.dashboard.subtitle)}</p>
  ${sections}
</nav>
<main>
  <div class="toolbar" id="controls">
    <input id="metis-search" type="search" placeholder="Search evidence or candidates" aria-label="Search dashboard">
    <select id="metis-filter-source" aria-label="Filter by source"><option value="">All sources</option>${sourceOptions(viewModel.evidence)}</select>
    <select id="metis-filter-decision" aria-label="Filter by decision"><option value="">All decisions</option>${decisionOptions(viewModel.candidates)}</select>
    <select id="metis-filter-risk" aria-label="Filter by risk"><option value="">All risks</option>${riskOptions(viewModel.candidates)}</select>
    <button type="button" id="metis-export">Export JSON</button>
    <button type="button" id="metis-copy">Copy JSON</button>
  </div>
  <section id="overview">
    <h2>Overview</h2>
    <div class="cards">
      ${overviewCard('Evidence', viewModel.summary.evidenceCount)}
      ${overviewCard('Candidates', viewModel.summary.candidateCount)}
      ${overviewCard('Audit', viewModel.summary.auditOk ? 'ok' : 'failed', viewModel.summary.auditOk)}
      ${overviewCard('Rollback Records', viewModel.rollbackRecords.length)}
    </div>
    <p class="note">Sources — Claude Code: ${viewModel.summary.claudeCode}, Codex: ${viewModel.summary.codex}, Project: ${viewModel.summary.project}</p>
    <div class="banner"><p class="note">Static read-only dashboard. Export downloads redacted JSON in-browser only; no project writes.</p></div>
  </section>
  <div class="grid-2">
    <section id="evidence">
      <h2>Evidence</h2>
      ${renderEvidenceTable(viewModel.evidence)}
    </section>
    <section id="candidates">
      <h2>Candidates</h2>
      ${renderCandidateTable(viewModel.candidates)}
    </section>
  </div>
  <section id="audit">
    <h2>Safety Audit</h2>
    ${renderAudit(viewModel.audit)}
  </section>
  <section id="diff">
    <h2>Diff Preview</h2>
    <pre>${escapeHtml(viewModel.diff.preview || 'No diff available.')}</pre>
  </section>
  <section id="rollback">
    <h2>Rollback Ledger</h2>
    <p class="note">Ledger is informational. No mutation controls in this preview.</p>
    ${renderRollback(viewModel.rollbackRecords)}
  </section>
  <section id="evolve">
    <h2>Evolve Proposal Summary</h2>
    <p>Generate: <strong>${viewModel.evolvePreview.generateCount}</strong> | Review: <strong>${viewModel.evolvePreview.reviewCount}</strong></p>
    <p class="note">${escapeHtml(viewModel.evolvePreview.note)}</p>
    ${renderProposalSummaries(viewModel.proposalSummaries)}
  </section>
  <section id="detail">
    <h2>Detail</h2>
    <p class="note">Select a row detail button to inspect redacted JSON.</p>
    <pre id="metis-detail" class="detail-panel" tabindex="0">Select a row to view detail.</pre>
  </section>
</main>
</div>
<script id="metis-export-data" type="application/json">${exportJson}</script>
<script>${dashboardClientScript()}</script>
</body>
</html>`;
}

function sourceOptions(rows) {
  return [...new Set(rows.map((row) => row.source))].map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
}

function decisionOptions(rows) {
  return [...new Set(rows.map((row) => row.decision))].map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
}

function riskOptions(rows) {
  return [...new Set(rows.map((row) => row.risk))].map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
}

function overviewCard(label, value, ok = true) {
  const badge = label === 'Audit' ? `<span class="badge ${ok ? 'badge-ok' : 'badge-fail'}">${escapeHtml(String(value))}</span>` : escapeHtml(String(value));
  return `<div class="card"><div class="label">${escapeHtml(label)}</div><div class="value">${badge}</div></div>`;
}

function renderEvidenceTable(rows) {
  if (!rows.length) return '<p class="note">No evidence found.</p>';
  const body = rows.map((row) => {
    const search = `${row.id} ${row.source} ${row.kind} ${row.summary}`.toLowerCase();
    return `<tr data-row-kind="evidence" data-search="${escapeHtml(search)}" data-source="${escapeHtml(row.source)}" data-risk="${escapeHtml(row.risk)}" data-decision=""><td>${escapeHtml(row.id)}</td><td>${escapeHtml(row.source)}</td><td>${escapeHtml(row.kind)}</td><td>${escapeHtml(row.summary)}</td><td><button type="button" data-detail-kind="evidence" data-detail-id="${escapeHtml(row.id)}">Detail</button></td></tr>`;
  }).join('');
  return `<table><thead><tr><th>ID</th><th>Source</th><th>Kind</th><th>Summary</th><th></th></tr></thead><tbody>${body}</tbody></table>`;
}

function renderCandidateTable(rows) {
  if (!rows.length) return '<p class="note">No candidates found.</p>';
  const body = rows.map((row) => {
    const search = `${row.title} ${row.decision} ${row.risk}`.toLowerCase();
    return `<tr data-row-kind="candidate" data-search="${escapeHtml(search)}" data-source="candidate" data-decision="${escapeHtml(row.decision)}" data-risk="${escapeHtml(row.risk)}"><td>${escapeHtml(row.title)}</td><td>${escapeHtml(row.decision)}</td><td>${escapeHtml(row.risk)}</td><td>${escapeHtml(row.evidenceIds.join(', '))}</td><td><button type="button" data-detail-kind="candidate" data-detail-id="${escapeHtml(row.title)}">Detail</button></td></tr>`;
  }).join('');
  return `<table><thead><tr><th>Title</th><th>Decision</th><th>Risk</th><th>Evidence</th><th></th></tr></thead><tbody>${body}</tbody></table>`;
}

function renderAudit(audit) {
  if (!audit.issues.length) return '<p class="badge badge-ok">No blocking issues found.</p>';
  const items = audit.issues.map((issue) => `<li>[${escapeHtml(issue.severity)}] ${escapeHtml(issue.message)}</li>`).join('');
  return `<ul>${items}</ul>`;
}

function renderRollback(records) {
  if (!records.length) return '<p class="note">No rollback records in this snapshot.</p>';
  return `<ul>${records.map((id) => `<li><code>${escapeHtml(id)}</code></li>`).join('')}</ul>`;
}

function renderProposalSummaries(rows) {
  if (!rows.length) return '<p class="note">No saved proposals in this snapshot.</p>';
  const body = rows.map((row) => `<tr><td>${escapeHtml(row.id)}</td><td>${escapeHtml(row.status)}</td><td>${row.changeCount}</td><td>${row.auditOk ? 'ok' : 'failed'}</td></tr>`).join('');
  return `<table><thead><tr><th>ID</th><th>Status</th><th>Changes</th><th>Audit</th></tr></thead><tbody>${body}</tbody></table>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

module.exports = { renderPreviewHtml };
