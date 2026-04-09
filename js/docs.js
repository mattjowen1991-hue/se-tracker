// Docs tab — permanent doc records with revision history

let _viewingDoc = null;
let _docCategoryFilter = 'All';

// ── Helpers ───────────────────────────────────────────────────────────────────

function localDocDate() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

const DOC_CATEGORIES = [
  'Silent App',
  'Escalation Process',
  'Onboarding',
  'Internal Reference',
  'Customer-Facing',
  'Other'
];

// ── Main render ───────────────────────────────────────────────────────────────

function renderDocs(docs) {
  if (_viewingDoc) {
    const doc = docs.find(d => d.id === _viewingDoc);
    if (doc) { renderDocDetail(doc); return; }
    _viewingDoc = null;
  }

  const filtered = _docCategoryFilter === 'All' ? docs : docs.filter(d => d.category === _docCategoryFilter);
  const usedCategories = [...new Set(docs.map(d => d.category).filter(Boolean))];
  const staleThreshold = 90;
  const now = new Date();

  document.getElementById('docs-content').innerHTML = `
    <div class="toolbar">
      <div class="kpi-row">
        <div class="kpi-small"><span class="kpi-num">${docs.length}</span> Documents</div>
        <div class="kpi-small"><span class="kpi-num">${docs.reduce((n, d) => n + (Array.isArray(d.revisions) ? d.revisions.length : 0), 0)}</span> Total Revisions</div>
      </div>
      <button class="btn-primary" onclick="showAddDocModal()">+ Add Document</button>
    </div>

    ${usedCategories.length > 0 ? `
    <div class="doc-filters">
      <button class="doc-filter-btn ${_docCategoryFilter === 'All' ? 'active' : ''}" onclick="filterDocsByCategory('All')">All (${docs.length})</button>
      ${usedCategories.map(c => {
        const count = docs.filter(d => d.category === c).length;
        return `<button class="doc-filter-btn ${_docCategoryFilter === c ? 'active' : ''}" onclick="filterDocsByCategory('${c}')">${c} (${count})</button>`;
      }).join('')}
    </div>` : ''}

    ${filtered.length === 0
      ? `<div class="empty-state">
           <p>${_docCategoryFilter !== 'All' ? 'No documents in this category.' : 'No documents tracked yet. Add your first one to start building a revision history.'}</p>
         </div>`
      : `<div class="docs-grid">
          ${filtered.map(d => {
            const revisions = Array.isArray(d.revisions) ? d.revisions : [];
            const latest = revisions.length > 0 ? revisions[revisions.length - 1] : null;
            const lastDate = latest ? new Date(latest.date) : null;
            const daysSince = lastDate ? Math.floor((now - lastDate) / (1000*60*60*24)) : null;
            const isStale = daysSince !== null && daysSince >= staleThreshold;
            const hasNoRevisions = revisions.length === 0;
            return `
              <div class="doc-card ${isStale ? 'doc-stale' : ''}" onclick="openDocDetail('${d.id}')">
                <div class="doc-card-header">
                  <div class="doc-card-title">${d.title}</div>
                  ${d.category ? `<span class="doc-category-badge">${d.category}</span>` : ''}
                </div>
                ${d.url ? `<a href="${d.url}" target="_blank" class="doc-url-link" onclick="event.stopPropagation()">↗ Open document</a>` : '<span class="muted" style="font-size:0.8rem">No URL set</span>'}
                <div class="doc-card-meta">
                  <span>${revisions.length} revision${revisions.length !== 1 ? 's' : ''}</span>
                  ${latest ? `<span>Last updated ${latest.date || '—'}</span>` : '<span class="muted">No revisions yet</span>'}
                </div>
                ${isStale ? `<div class="doc-stale-badge">${daysSince}d since last update — may need review</div>` : ''}
                ${hasNoRevisions ? `<div class="doc-stale-badge">No revisions logged yet</div>` : ''}
                ${d.notes ? `<div class="doc-card-notes">${d.notes}</div>` : ''}
              </div>`;
          }).join('')}
        </div>`}

  `;
}

// ── Category filter ──────────────────────────────────────────────────────────

function filterDocsByCategory(category) {
  _docCategoryFilter = category;
  renderDocs(window._docs);
}

// ── Add / Edit modal ──────────────────────────────────────────────────────────

function buildDocModalHtml(doc) {
  const d = doc || {};
  return `
    <div id="doc-modal" class="modal hidden">
      <div class="modal-box">
        <h3>${doc ? 'Edit Document' : 'Add Document'}</h3>
        <input id="doc-editing-id" type="hidden" value="${d.id || ''}" />
        <label class="field-label">Title <span class="field-required">*</span></label>
        <input id="doc-title" placeholder="e.g. Silent App Deployment Guide" class="input-field" value="${d.title || ''}" />
        <label class="field-label">URL <span class="field-hint">(optional — can be added later)</span></label>
        <input id="doc-url" placeholder="https://..." class="input-field" value="${d.url || ''}" />
        <label class="field-label">Category</label>
        <select id="doc-category" class="input-field">
          <option value="">— Select category —</option>
          ${DOC_CATEGORIES.map(c => `<option ${d.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
        <label class="field-label">Notes <span class="field-hint">(optional)</span></label>
        <textarea id="doc-notes" placeholder="What is this document? Who is it for?" class="input-field" rows="3">${d.notes || ''}</textarea>
        <div class="modal-actions">
          <button class="btn-secondary" onclick="closeDocModal()">Cancel</button>
          <button class="btn-primary" onclick="saveDoc()">Save</button>
        </div>
      </div>
    </div>`;
}

function injectDocModal(html) {
  const existing = document.getElementById('doc-modal');
  if (existing) existing.remove();
  document.getElementById('docs-content').insertAdjacentHTML('beforeend', html);
  document.getElementById('doc-modal').addEventListener('click', function(e) {
    if (e.target === this) closeDocModal();
  });
  document.getElementById('doc-modal').classList.remove('hidden');
}

function showAddDocModal() {
  injectDocModal(buildDocModalHtml(null));
}

function showEditDocModal(docOrId) {
  const doc = typeof docOrId === 'string'
    ? window._docs.find(d => d.id === docOrId)
    : docOrId;
  if (!doc) return;
  injectDocModal(buildDocModalHtml(doc));
}

function closeDocModal() {
  const m = document.getElementById('doc-modal');
  if (m) m.classList.add('hidden');
}

async function saveDoc() {
  const editingId = document.getElementById('doc-editing-id').value;
  const title = document.getElementById('doc-title').value.trim();
  if (!title) { showToast('Title is required', 'error'); return; }

  const data = {
    title,
    url:      document.getElementById('doc-url').value.trim() || null,
    category: document.getElementById('doc-category').value || null,
    notes:    document.getElementById('doc-notes').value.trim() || null,
  };

  try {
    if (editingId) {
      await updateDoc(editingId, data);
      showToast('Document updated', 'success');
    } else {
      await addDoc(data);
      showToast('Document added', 'success');
    }
    closeDocModal();
    await reloadAll();
  } catch(e) {
    showToast('Save failed: ' + e.message, 'error');
  }
}

async function removeDoc(id) {
  if (!confirm('Delete this document and all its revision history? This cannot be undone.')) return;
  try {
    await deleteDoc(id);
    _viewingDoc = null;
    showToast('Document deleted', 'success');
    await reloadAll();
  } catch(e) {
    showToast('Delete failed: ' + e.message, 'error');
  }
}

// ── Detail view ───────────────────────────────────────────────────────────────

function openDocDetail(id) {
  _viewingDoc = id;
  renderDocs(window._docs);
}

function renderDocDetail(doc) {
  const revisions = Array.isArray(doc.revisions) ? doc.revisions : [];

  document.getElementById('docs-content').innerHTML = `
    <div class="detail-header">
      <button class="btn-back" onclick="backToDocList()">← Back to documents</button>
      <div class="detail-header-actions">
        <button class="btn-secondary" onclick="showEditDocModal('${doc.id}')">Edit</button>
        <button class="btn-danger" onclick="removeDoc('${doc.id}')">Delete</button>
      </div>
    </div>

    <div class="detail-main">

      <div class="detail-title-row">
        <h2 class="detail-title">${doc.title}</h2>
        ${doc.category ? `<span class="doc-category-badge">${doc.category}</span>` : ''}
      </div>

      <div class="detail-meta-grid">
        <div class="meta-item">
          <span class="meta-label">Document URL</span>
          ${doc.url
            ? `<a href="${doc.url}" target="_blank" class="detail-link">Open document ↗</a>`
            : '<span class="muted">Not set</span>'}
        </div>
        <div class="meta-item">
          <span class="meta-label">Total revisions</span>
          <span>${revisions.length}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Last updated</span>
          <span>${revisions.length > 0 ? revisions[revisions.length - 1].date || '—' : 'Never'}</span>
        </div>
      </div>

      ${doc.notes ? `
        <div class="detail-notes">
          <div class="detail-notes-label">About this document</div>
          <p>${doc.notes}</p>
        </div>` : ''}

      <div class="timeline-section">
        <div class="timeline-header">
          <h3>Revision History</h3>
          <button class="btn-secondary btn-sm" onclick="showAddRevisionModal('${doc.id}')">+ Log Revision</button>
        </div>

        <div id="revision-list">
          ${revisions.length === 0
            ? '<p class="empty-msg">No revisions logged yet. Add one each time you publish or update this document.</p>'
            : [...revisions].reverse().map((rev, i) => `
              <div class="timeline-entry">
                <div class="timeline-entry-header">
                  <span class="timeline-date">${rev.date || '—'}</span>
                  ${rev.version ? `<span class="doc-version-badge">${rev.version}</span>` : ''}
                  <button class="icon-btn" style="margin-left:auto" onclick="deleteRevision('${doc.id}', ${revisions.length - 1 - i})">🗑</button>
                </div>
                <p class="timeline-note">${rev.summary}</p>
                ${rev.notes ? `<p class="revision-notes">${rev.notes}</p>` : ''}
                ${rev.url ? `<div class="timeline-links"><a href="${rev.url}" target="_blank" class="timeline-link">↗ View this version</a></div>` : ''}
              </div>`).join('')}
        </div>
      </div>

    </div>

    <div id="revision-modal" class="modal hidden">
      <div class="modal-box">
        <h3>Log Revision</h3>

        <label class="field-label">Date</label>
        <input id="rev-date" type="date" class="input-field" value="${localDocDate()}" />

        <label class="field-label">Version / label <span class="field-hint">(optional — e.g. v1.2, April update)</span></label>
        <input id="rev-version" placeholder="e.g. v1.2" class="input-field" />

        <label class="field-label">What changed? <span class="field-required">*</span></label>
        <textarea id="rev-summary" placeholder="Brief summary of what was added, changed, or fixed…" class="input-field" rows="3"></textarea>

        <label class="field-label">Additional notes <span class="field-hint">(optional)</span></label>
        <textarea id="rev-notes" placeholder="Any extra context, reasons for the change, feedback received…" class="input-field" rows="2"></textarea>

        <label class="field-label">URL for this version <span class="field-hint">(optional — if the link changed)</span></label>
        <input id="rev-url" placeholder="https://..." class="input-field" />

        <div class="modal-actions">
          <button class="btn-secondary" onclick="closeRevisionModal()">Cancel</button>
          <button class="btn-primary" onclick="saveRevision('${doc.id}')">Log Revision</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('revision-modal').addEventListener('click', function(e) {
    if (e.target === this) closeRevisionModal();
  });
}

function backToDocList() {
  _viewingDoc = null;
  renderDocs(window._docs);
}

// ── Revision modal ────────────────────────────────────────────────────────────

function showAddRevisionModal(docId) {
  document.getElementById('rev-date').value = localDocDate();
  document.getElementById('rev-version').value = '';
  document.getElementById('rev-summary').value = '';
  document.getElementById('rev-notes').value = '';
  document.getElementById('rev-url').value = '';
  document.getElementById('revision-modal').classList.remove('hidden');
}

function closeRevisionModal() {
  document.getElementById('revision-modal').classList.add('hidden');
}

async function saveRevision(docId) {
  const summary = document.getElementById('rev-summary').value.trim();
  if (!summary) { showToast('Please describe what changed', 'error'); return; }

  const doc = window._docs.find(d => d.id === docId);
  if (!doc) return;

  const revision = {
    date:    document.getElementById('rev-date').value,
    version: document.getElementById('rev-version').value.trim() || null,
    summary,
    notes:   document.getElementById('rev-notes').value.trim() || null,
    url:     document.getElementById('rev-url').value.trim() || null,
  };

  // Also update the doc's URL if a new one was provided
  const revisions = Array.isArray(doc.revisions) ? [...doc.revisions, revision] : [revision];
  const updates = { revisions };
  if (revision.url) updates.url = revision.url;

  try {
    await updateDoc(docId, updates);
    closeRevisionModal();
    showToast('Revision logged', 'success');
    await reloadAll();
    _viewingDoc = docId;
    renderDocs(window._docs);
  } catch(e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function deleteRevision(docId, index) {
  if (!confirm('Delete this revision entry?')) return;
  const doc = window._docs.find(d => d.id === docId);
  if (!doc) return;
  const revisions = [...(doc.revisions || [])];
  revisions.splice(index, 1);
  try {
    await updateDoc(docId, { revisions });
    showToast('Revision deleted', 'success');
    await reloadAll();
    _viewingDoc = docId;
    renderDocs(window._docs);
  } catch(e) {
    showToast('Failed: ' + e.message, 'error');
  }
}
