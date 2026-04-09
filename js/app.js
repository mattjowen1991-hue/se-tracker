// ── Scroll lock for modals ────────────────────────────────────────────────────
// Called automatically by the MutationObserver below
const _modalObserver = new MutationObserver(() => {
  const anyOpen = !!document.querySelector('.modal:not(.hidden), .help-overlay:not(.hidden)');
  document.body.classList.toggle('modal-open', anyOpen);
});
document.addEventListener('DOMContentLoaded', () => {
  _modalObserver.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
});

// Main app — tab routing and data loading

let currentTab = 'deployments';
let _searchQuery = '';

window._implementations    = [];
window._escalations        = [];
window._seEscalations      = [];
window._docs               = [];

async function reloadAll() {
  try {
    const [impl, esc, seEsc, docs] = await Promise.all([
      getImplementations(),
      getEscalations(),
      getSeEscalations(),
      getDocs()
    ]);
    window._implementations = impl   || [];
    window._escalations     = esc    || [];
    window._seEscalations   = seEsc  || [];
    window._docs            = docs   || [];
    renderTab(currentTab);
  } catch (e) {
    showToast('Failed to load data: ' + e.message, 'error');
  }
}

function renderTab(tab) {
  currentTab = tab;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  document.querySelectorAll('.tab-content').forEach(el => {
    el.classList.toggle('hidden', el.id !== `${tab}-tab`);
  });

  var q = _searchQuery.toLowerCase().trim();

  switch (tab) {
    case 'deployments':
      var implData = q ? window._implementations.filter(function(i) {
        return (i.org || '').toLowerCase().includes(q) || (i.contact_name || '').toLowerCase().includes(q) || (i.notes || '').toLowerCase().includes(q);
      }) : window._implementations;
      renderSilentApp(implData);
      break;
    case 'se-escalations':
      var seData = q ? window._seEscalations.filter(function(e) {
        return (e.org || '').toLowerCase().includes(q) || (e.notes || '').toLowerCase().includes(q);
      }) : window._seEscalations;
      renderSeEscalations(seData);
      break;
    case 'deployment-escalations':
      var escData = q ? window._escalations.filter(function(e) {
        return (e.org || '').toLowerCase().includes(q) || (e.notes || '').toLowerCase().includes(q) || (e.type || '').toLowerCase().includes(q);
      }) : window._escalations;
      renderEscalations(escData);
      break;
    case 'docs':
      var docData = q ? window._docs.filter(function(d) {
        return (d.title || '').toLowerCase().includes(q) || (d.category || '').toLowerCase().includes(q) || (d.notes || '').toLowerCase().includes(q);
      }) : window._docs;
      renderDocs(docData);
      break;
  }
}

function switchTab(tab) {
  renderTab(tab);
}

function handleSearch(value) {
  _searchQuery = value;
  var clearBtn = document.getElementById('search-clear-btn');
  if (clearBtn) clearBtn.classList.toggle('hidden', !value);
  renderTab(currentTab);
}

function clearSearch() {
  _searchQuery = '';
  var el = document.getElementById('global-search');
  if (el) el.value = '';
  renderTab(currentTab);
}

function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => renderTab(btn.dataset.tab));
  });
  await reloadAll();
});
