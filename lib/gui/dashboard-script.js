function dashboardClientScript() {
  return `
(function () {
  const payload = JSON.parse(document.getElementById('metis-export-data').textContent);
  const search = document.getElementById('metis-search');
  const sourceFilter = document.getElementById('metis-filter-source');
  const decisionFilter = document.getElementById('metis-filter-decision');
  const riskFilter = document.getElementById('metis-filter-risk');
  const detail = document.getElementById('metis-detail');
  const exportBtn = document.getElementById('metis-export');
  const copyBtn = document.getElementById('metis-copy');

  function rowText(row) {
    return Object.values(row).join(' ').toLowerCase();
  }

  function applyFilters() {
    const q = (search.value || '').trim().toLowerCase();
    const source = sourceFilter.value;
    const decision = decisionFilter.value;
    const risk = riskFilter.value;
    document.querySelectorAll('[data-row-kind]').forEach((row) => {
      const text = row.dataset.search || '';
      const matchQ = !q || text.includes(q);
      const matchSource = !source || row.dataset.source === source;
      const matchDecision = !decision || row.dataset.decision === decision;
      const matchRisk = !risk || row.dataset.risk === risk;
      row.hidden = !(matchQ && matchSource && matchDecision && matchRisk);
    });
  }

  function showDetail(kind, id) {
    let item = null;
    if (kind === 'evidence') item = payload.evidence.find((row) => row.id === id);
    if (kind === 'candidate') item = payload.candidates.find((row) => row.id === id || row.title === id);
    if (!item) {
      detail.textContent = 'No detail available.';
      return;
    }
    detail.textContent = JSON.stringify(item, null, 2);
    detail.focus();
  }

  document.querySelectorAll('[data-detail-kind]').forEach((button) => {
    button.addEventListener('click', () => showDetail(button.dataset.detailKind, button.dataset.detailId));
  });
  [search, sourceFilter, decisionFilter, riskFilter].forEach((el) => el.addEventListener('input', applyFilters));
  applyFilters();

  function exportBlob() {
    return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  }

  exportBtn.addEventListener('click', () => {
    const url = URL.createObjectURL(exportBlob());
    const link = document.createElement('a');
    link.href = url;
    link.download = 'metis-dashboard-export.json';
    link.click();
    URL.revokeObjectURL(url);
  });

  copyBtn.addEventListener('click', async () => {
    const text = JSON.stringify(payload, null, 2);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = 'Copied';
      } else {
        copyBtn.textContent = 'Use Export JSON';
      }
    } catch (_) {
      copyBtn.textContent = 'Copy unavailable';
    }
    setTimeout(() => { copyBtn.textContent = 'Copy JSON'; }, 1200);
  });
})();
`;
}

module.exports = { dashboardClientScript };
