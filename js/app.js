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

  switch (tab) {
    case 'deployments':
      renderSilentApp(window._implementations);
      break;
    case 'se-escalations':
      renderSeEscalations(window._seEscalations);
      break;
    case 'deployment-escalations':
      renderEscalations(window._escalations);
      break;
    case 'docs':
      renderDocs(window._docs);
      break;
  }
}

function switchTab(tab) {
  renderTab(tab);
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
