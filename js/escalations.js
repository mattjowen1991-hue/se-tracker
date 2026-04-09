// Deployment Escalations tab — every escalation is linked to a deployment

let _viewingEscalation = null;
let _escSort = { field: 'date', dir: 'desc' };

// ── Helpers ───────────────────────────────────────────────────────────────────

function localEscDate() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function getDeploymentById(id) {
  return (window._implementations || []).find(i => i.id === id) || null;
}

function getDeploymentName(implId) {
  const impl = getDeploymentById(implId);
  return impl ? impl.org : '—';
}

function buildDeploymentOptions(selectedId) {
  const impls = window._implementations || [];
  if (impls.length === 0) {
    return '<option value="">No deployments found — add one first</option>';
  }
  return impls.map(i =>
    `<option value="${i.id}" ${i.id === selectedId ? 'selected' : ''}>[${i.stage}] ${i.org}</option>`
  ).join('');
}

function sortEscIcon(field) {
  if (_escSort.field !== field) return ' <span class="sort-icon">⇅</span>';
  return _escSort.dir === 'asc' ? ' <span class="sort-icon active">▲</span>' : ' <span class="sort-icon active">▼</span>';
}

function toggleEscSort(field) {
  if (_escSort.field === field) {
    _escSort.dir = _escSort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    _escSort = { field: field, dir: 'desc' };
  }
  renderEscalations(window._escalations);
}

function sortEscData(data) {
  var f = _escSort.field;
  var dir = _escSort.dir === 'asc' ? 1 : -1;
  return data.slice().sort(function(a, b) {
    var va, vb;
    if (f === 'days_to_resolve') { va = a.days_to_resolve || 9999; vb = b.days_to_resolve || 9999; }
    else if (f === 'deployment') { va = getDeploymentName(a.implementation_id).toLowerCase(); vb = getDeploymentName(b.implementation_id).toLowerCase(); }
    else { va = (a[f] || '').toString().toLowerCase(); vb = (b[f] || '').toString().toLowerCase(); }
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
}

// ── Main render ───────────────────────────────────────────────────────────────

function renderEscalations(escalations) {
  if (_viewingEscalation) {
    const esc = escalations.find(e => e.id === _viewingEscalation);
    if (esc) { renderEscalationDetail(esc); return; }
    _viewingEscalation = null;
  }

  const total    = escalations.length;
  const resolved = escalations.filter(e => e.outcome === 'Resolved by SE').length;
  const toEng    = escalations.filter(e => e.outcome === 'Escalated to Engineering').length;
  const pending  = escalations.filter(e => e.outcome === 'Pending').length;

  document.getElementById('escalations-content').innerHTML = `
    <div class="toolbar">
      <div class="kpi-row">
        <div class="kpi-small"><span class="kpi-num">${total}</span> Total</div>
        <div class="kpi-small"><span class="kpi-num green">${resolved}</span> Resolved by SE</div>
        <div class="kpi-small"><span class="kpi-num amber">${toEng}</span> To Engineering</div>
        <div class="kpi-small"><span class="kpi-num red">${pending}</span> Pending</div>
      </div>
      <button class="btn-primary" onclick="showAddEscModal()">+ Log Escalation</button>
    </div>

    ${escalations.length === 0 && (window._implementations || []).length === 0 ? `
      <div class="empty-state">
        <p>You need at least one deployment before logging a deployment escalation.</p>
        <button class="btn-secondary" onclick="switchTab('deployments')">Go to Deployments →</button>
      </div>` : `
    <table class="data-table">
      <thead><tr>
        <th class="sortable-th" onclick="toggleEscSort('date')">Date${sortEscIcon('date')}</th>
        <th class="sortable-th" onclick="toggleEscSort('deployment')">Deployment${sortEscIcon('deployment')}</th>
        <th class="sortable-th" onclick="toggleEscSort('type')">Type${sortEscIcon('type')}</th>
        <th class="sortable-th" onclick="toggleEscSort('outcome')">Outcome${sortEscIcon('outcome')}</th>
        <th class="sortable-th" onclick="toggleEscSort('days_to_resolve')">Days${sortEscIcon('days_to_resolve')}</th>
        <th>Notes</th>
        <th></th>
      </tr></thead>
      <tbody>
        ${escalations.length === 0
          ? '<tr><td colspan="7" class="empty-cell">No deployment escalations logged yet.</td></tr>'
          : sortEscData(escalations).map(e => `
            <tr class="clickable-row" onclick="openEscalationDetail('${e.id}')">
              <td>${e.date || '—'}</td>
              <td><strong>${getDeploymentName(e.implementation_id)}</strong></td>
              <td><span class="tag">${e.type}${e.other_desc ? ': ' + e.other_desc : ''}</span></td>
              <td><span class="outcome ${e.outcome.toLowerCase().replace(/ /g, '-')}">${e.outcome}</span></td>
              <td>${e.days_to_resolve != null ? e.days_to_resolve
                : (e.outcome === 'Pending' && e.date
                  ? '<span style="color:var(--amber)">' + Math.floor((new Date() - new Date(e.date)) / (86400000)) + 'd</span>'
                  : '—')}</td>
              <td class="notes-cell">${e.notes || '—'}</td>
              <td><button class="icon-btn" onclick="event.stopPropagation();removeEscalation('${e.id}')">🗑</button></td>
            </tr>`).join('')}
      </tbody>
    </table>`}

  `;
}

// ── Add / Edit modal ──────────────────────────────────────────────────────────

function buildEscModalHtml(esc, prefilledImplId) {
  const e = esc || {};
  const implId = e.implementation_id || prefilledImplId || '';
  return `
    <div id="esc-modal" class="modal hidden">
      <div class="modal-box">
        <h3>${esc ? 'Edit Deployment Escalation' : 'Log Deployment Escalation'}</h3>
        <input id="esc-editing-id" type="hidden" value="${e.id || ''}" />
        <label class="field-label">Deployment <span class="field-required">*</span></label>
        <select id="esc-impl" class="input-field">${buildDeploymentOptions(implId)}</select>
        <label class="field-label">Date</label>
        <input id="esc-date" type="date" class="input-field" value="${e.date || localEscDate()}" />
        <label class="field-label">Type</label>
        <select id="esc-type" class="input-field" onchange="toggleEscOtherField()">
          ${ESCALATION_TYPES.map(t => `<option ${e.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
        <input id="esc-other-desc" placeholder="Describe the issue type…" class="input-field ${e.type === 'Other' ? '' : 'hidden'}" value="${e.other_desc || ''}" />
        <label class="field-label">Outcome</label>
        <select id="esc-outcome" class="input-field">
          ${ESCALATION_OUTCOMES.map(o => `<option ${(e.outcome || 'Pending') === o ? 'selected' : ''}>${o}</option>`).join('')}
        </select>
        <label class="field-label">Days to resolve <span class="field-hint">(leave blank if ongoing)</span></label>
        <input id="esc-days" type="number" min="0" placeholder="e.g. 3" class="input-field" value="${e.days_to_resolve ?? ''}" />
        <label class="field-label">Notes</label>
        <textarea id="esc-notes" placeholder="Brief summary of the issue and what was done…" class="input-field" rows="4">${e.notes || ''}</textarea>
        <div class="modal-actions">
          <button class="btn-secondary" onclick="closeEscModal()">Cancel</button>
          <button class="btn-primary" onclick="saveEscalation()">Save</button>
        </div>
      </div>
    </div>`;
}

function injectEscModal(html) {
  const existing = document.getElementById('esc-modal');
  if (existing) existing.remove();
  document.getElementById('escalations-content').insertAdjacentHTML('beforeend', html);
  document.getElementById('esc-modal').addEventListener('click', function(e) {
    if (e.target === this) closeEscModal();
  });
  document.getElementById('esc-modal').classList.remove('hidden');
}

function showAddEscModal(prefilledImplId) {
  injectEscModal(buildEscModalHtml(null, prefilledImplId));
}

function showEditEscModal(escOrId) {
  const esc = typeof escOrId === 'string'
    ? window._escalations.find(e => e.id === escOrId)
    : escOrId;
  if (!esc) return;
  injectEscModal(buildEscModalHtml(esc, null));
}

function closeEscModal() {
  const m = document.getElementById('esc-modal');
  if (m) m.classList.add('hidden');
}

function toggleEscOtherField() {
  const isOther = document.getElementById('esc-type').value === 'Other';
  document.getElementById('esc-other-desc').classList.toggle('hidden', !isOther);
}

async function saveEscalation() {
  const editingId    = document.getElementById('esc-editing-id').value;
  const implId       = document.getElementById('esc-impl').value;

  if (!implId) {
    showToast('Please select a deployment', 'error');
    return;
  }

  const type = document.getElementById('esc-type').value;
  const impl = getDeploymentById(implId);

  const data = {
    implementation_id: implId,
    org:               impl ? impl.org : null,
    date:              document.getElementById('esc-date').value,
    type,
    other_desc:        type === 'Other' ? document.getElementById('esc-other-desc').value.trim() : null,
    outcome:           document.getElementById('esc-outcome').value,
    days_to_resolve:   document.getElementById('esc-days').value ? parseInt(document.getElementById('esc-days').value) : null,
    notes:             document.getElementById('esc-notes').value.trim() || null,
  };

  try {
    if (editingId) {
      await updateEscalation(editingId, data);
      showToast('Escalation updated', 'success');
    } else {
      await addEscalation(data);
      showToast('Escalation logged', 'success');
    }
    closeEscModal();
    await reloadAll();
  } catch(e) {
    showToast('Save failed: ' + e.message, 'error');
  }
}

async function removeEscalation(id) {
  if (!confirm('Delete this escalation? This cannot be undone.')) return;
  try {
    await deleteEscalation(id);
    if (_viewingEscalation === id) _viewingEscalation = null;
    showToast('Escalation deleted', 'success');
    await reloadAll();
  } catch(e) {
    showToast('Delete failed: ' + e.message, 'error');
  }
}

// ── Detail view ───────────────────────────────────────────────────────────────

function openEscalationDetail(id) {
  _viewingEscalation = id;
  renderEscalations(window._escalations);
}

function renderEscalationDetail(esc) {
  const impl     = getDeploymentById(esc.implementation_id);
  const timeline = Array.isArray(esc.timeline) ? esc.timeline : [];

  document.getElementById('escalations-content').innerHTML = `
    <div class="detail-header">
      <button class="btn-back" onclick="backToEscList()">← Back to deployment escalations</button>
      <div class="detail-header-actions">
        <button class="btn-secondary" onclick="showEditEscModal('${esc.id}')">Edit</button>
        <button class="btn-danger" onclick="removeEscalation('${esc.id}')">Delete</button>
      </div>
    </div>

    <div class="detail-main">

      <div class="detail-title-row">
        <h2 class="detail-title">${impl ? impl.org : esc.org || 'Unknown deployment'}</h2>
        <span class="tag">${esc.type}${esc.other_desc ? ': ' + esc.other_desc : ''}</span>
        <span class="outcome ${esc.outcome.toLowerCase().replace(/ /g, '-')}">${esc.outcome}</span>
      </div>

      <div class="detail-meta-grid">
        <div class="meta-item">
          <span class="meta-label">Date</span>
          <span>${esc.date || '—'}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Days to resolve</span>
          <span>${esc.days_to_resolve != null ? esc.days_to_resolve
            : (esc.outcome === 'Pending' && esc.date
              ? '<span style="color:var(--amber)">' + Math.floor((new Date() - new Date(esc.date)) / (1000*60*60*24)) + 'd open</span>'
              : 'Ongoing')}</span>
        </div>
        ${impl ? `
        <div class="meta-item">
          <span class="meta-label">Deployment stage</span>
          <span class="stage-badge">${impl.stage}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">RAG</span>
          <span class="rag-dot rag-${impl.rag ? impl.rag.toLowerCase() : 'green'}"></span>
          <span>${impl.rag || '—'}</span>
        </div>` : ''}
      </div>

      ${esc.notes ? `
        <div class="detail-notes">
          <div class="detail-notes-label">Notes</div>
          <p>${esc.notes}</p>
        </div>` : ''}

      ${impl ? `
        <div class="linked-impl-card">
          <div class="linked-impl-label">🔗 Linked Deployment</div>
          <div class="linked-impl-name">${impl.org}</div>
          <div class="linked-impl-meta">Stage: ${impl.stage} · RAG: ${impl.rag || '—'}</div>
          <button class="btn-link" onclick="goToDeployment('${impl.id}')">View deployment →</button>
        </div>` : ''}

      <div class="stage-actions">
        <div class="stage-actions-label">Change outcome</div>
        <div class="stage-action-btns">
          ${ESCALATION_OUTCOMES.filter(o => o !== esc.outcome).map(o =>
            `<button class="stage-move-btn ${o === 'Resolved by SE' ? 'stage-resolved' : o === 'Pending' ? 'stage-pending' : 'stage-blocked'}"
              onclick="quickChangeOutcome('${esc.id}', '${o}')">${o}</button>`
          ).join('')}
        </div>
      </div>

      <div class="timeline-section">
        <div class="timeline-header">
          <h3>Case Timeline</h3>
          <button class="btn-secondary btn-sm" onclick="showAddTimelineEntry('${esc.id}')">+ Add entry</button>
        </div>
        <div id="timeline-list">
          ${timeline.length === 0
            ? '<p class="empty-msg">No timeline entries yet. Add one to start building the case history.</p>'
            : [...timeline].reverse().map((entry, i) => `
              <div class="timeline-entry">
                <div class="timeline-entry-header">
                  <span class="timeline-date">${entry.date || '—'}</span>
                  ${entry.outcome_change
                    ? `<span class="outcome ${entry.outcome_change.toLowerCase().replace(/ /g, '-')}">${entry.outcome_change}</span>`
                    : ''}
                  <button class="icon-btn" style="margin-left:auto" onclick="deleteTimelineEntry('${esc.id}', ${timeline.length - 1 - i})">🗑</button>
                </div>
                <p class="timeline-note">${entry.note}</p>
                <div class="timeline-links">
                  ${entry.slack_url   ? `<a href="${entry.slack_url}"   target="_blank" class="timeline-link">📎 Slack thread</a>` : ''}
                  ${entry.hubspot_url ? `<a href="${entry.hubspot_url}" target="_blank" class="timeline-link">🔗 HubSpot</a>` : ''}
                </div>
              </div>`).join('')}
        </div>
      </div>

    </div>

    <div id="timeline-modal" class="modal hidden">
      <div class="modal-box">
        <h3>Add Timeline Entry</h3>

        <label class="field-label">Date</label>
        <input id="tl-date" type="date" class="input-field" value="${localEscDate()}" />

        <label class="field-label">What happened / what was done?</label>
        <textarea id="tl-note" placeholder="Describe what was investigated, found, sent to engineering, or resolved…" class="input-field" rows="4"></textarea>

        <label class="field-label">Update outcome <span class="field-hint">(optional — leave blank to keep current)</span></label>
        <select id="tl-outcome" class="input-field">
          <option value="">— No change —</option>
          ${ESCALATION_OUTCOMES.map(o => `<option>${o}</option>`).join('')}
        </select>

        <label class="field-label">Slack thread URL <span class="field-hint">(optional)</span></label>
        <input id="tl-slack" placeholder="https://hubstaff.slack.com/..." class="input-field" />

        <label class="field-label">HubSpot URL <span class="field-hint">(optional)</span></label>
        <input id="tl-hubspot" placeholder="https://app.hubspot.com/..." class="input-field" />

        <div class="modal-actions">
          <button class="btn-secondary" onclick="closeTimelineModal()">Cancel</button>
          <button class="btn-primary" onclick="saveTimelineEntry('${esc.id}')">Add Entry</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('timeline-modal').addEventListener('click', function(e) {
    if (e.target === this) closeTimelineModal();
  });
}

function backToEscList() {
  _viewingEscalation = null;
  renderEscalations(window._escalations);
}

function goToDeployment(implId) {
  _returnToEscalation = { id: _viewingEscalation, tab: 'deployment-escalations' };
  _viewingImpl = implId;
  switchTab('deployments');
}

// ── Timeline ──────────────────────────────────────────────────────────────────

function showAddTimelineEntry() {
  document.getElementById('tl-date').value = localEscDate();
  document.getElementById('tl-note').value = '';
  document.getElementById('tl-outcome').value = '';
  document.getElementById('tl-slack').value = '';
  document.getElementById('tl-hubspot').value = '';
  document.getElementById('timeline-modal').classList.remove('hidden');
}

function closeTimelineModal() {
  document.getElementById('timeline-modal').classList.add('hidden');
}

async function saveTimelineEntry(escId) {
  const note = document.getElementById('tl-note').value.trim();
  if (!note) { showToast('Please add a note', 'error'); return; }

  const esc = window._escalations.find(e => e.id === escId);
  if (!esc) return;

  const entry = {
    date:           document.getElementById('tl-date').value,
    note,
    outcome_change: document.getElementById('tl-outcome').value || null,
    slack_url:      document.getElementById('tl-slack').value.trim() || null,
    hubspot_url:    document.getElementById('tl-hubspot').value.trim() || null,
  };

  const timeline = Array.isArray(esc.timeline) ? [...esc.timeline, entry] : [entry];
  const updates  = { timeline };
  if (entry.outcome_change) {
    updates.outcome = entry.outcome_change;
    // Auto-calculate days_to_resolve when closing, if not already set
    if (entry.outcome_change !== 'Pending' && esc.date && esc.days_to_resolve == null) {
      updates.days_to_resolve = Math.floor((new Date() - new Date(esc.date)) / (1000*60*60*24));
    }
  }

  try {
    await updateEscalation(escId, updates);
    closeTimelineModal();
    showToast('Timeline entry added', 'success');
    await reloadAll();
    _viewingEscalation = escId;
    renderEscalations(window._escalations); // re-renders detail view with updated outcome
  } catch(e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function deleteTimelineEntry(escId, index) {
  if (!confirm('Delete this timeline entry?')) return;
  const esc = window._escalations.find(e => e.id === escId);
  if (!esc) return;
  const timeline = [...(esc.timeline || [])];
  timeline.splice(index, 1);
  try {
    await updateEscalation(escId, { timeline });
    showToast('Entry deleted', 'success');
    await reloadAll();
    _viewingEscalation = escId;
    renderEscalations(window._escalations);
  } catch(e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

// ── Quick outcome change ─────────────────────────────────────────────────────

async function quickChangeOutcome(escId, newOutcome) {
  try {
    const esc = window._escalations.find(e => e.id === escId);
    const updates = { outcome: newOutcome };
    // Auto-calculate days_to_resolve when closing, if not already set
    if (newOutcome !== 'Pending' && esc && esc.date && esc.days_to_resolve == null) {
      updates.days_to_resolve = Math.floor((new Date() - new Date(esc.date)) / (1000*60*60*24));
    }
    await updateEscalation(escId, updates);
    showToast('Outcome updated to ' + newOutcome, 'success');
    await reloadAll();
    _viewingEscalation = escId;
    renderEscalations(window._escalations);
  } catch(e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

// ── Cross-tab helper ──────────────────────────────────────────────────────────

function logEscForDeployment(implId) {
  switchTab('deployment-escalations');
  setTimeout(() => showAddEscModal(implId), 150);
}
