// Calls tab — log and view calls joined

let _viewingCall = null; // id of call open in detail view

function renderCalls(calls) {
  const container = document.getElementById('calls-content');
  if (!container) return;

  if (_viewingCall) {
    const call = calls.find(c => c.id === _viewingCall);
    if (!call) _viewingCall = null;
    else { renderCallDetail(call); return; }
  }

  const total     = calls.length;
  const thisWeek  = calls.filter(c => isThisWeek(c.date)).length;
  const orgs      = [...new Set(calls.map(c => c.org).filter(Boolean))].length;

  container.innerHTML = `
    <div class="tab-kpi-bar">
      <div class="kpi-card"><div class="kpi-val">${total}</div><div class="kpi-label">Total Calls</div></div>
      <div class="kpi-card"><div class="kpi-val">${thisWeek}</div><div class="kpi-label">This Week</div></div>
      <div class="kpi-card"><div class="kpi-val">${orgs}</div><div class="kpi-label">Orgs Covered</div></div>
    </div>

    <div class="section-title" style="margin-top:24px">Log a Call</div>
    <div class="form-card">
      <div class="form-grid">
        <div class="form-group">
          <label>Date <span class="required">*</span></label>
          <input id="call-date" type="date" class="input-field" value="${todayStr()}" />
        </div>
        <div class="form-group">
          <label>Org / Company Name</label>
          <input id="call-org" type="text" class="input-field" placeholder="e.g. Acme Corp" autocomplete="off" />
        </div>
      </div>
      <div class="form-group" style="margin-top:12px">
        <label>Notes / Outcome</label>
        <textarea id="call-notes" class="input-field" rows="3" placeholder="What was discussed, what was the outcome?"></textarea>
      </div>
      <div class="form-grid" style="margin-top:12px">
        <div class="form-group">
          <label>Related Escalation <span class="target-hint">(optional)</span></label>
          <select id="call-esc-id" class="input-field">
            <option value="">— None —</option>
            ${(window._escalations || []).map(e => `<option value="${e.id}">${e.org} · ${e.type} · ${e.date || '—'}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Related Implementation <span class="target-hint">(optional)</span></label>
          <select id="call-impl-id" class="input-field">
            <option value="">— None —</option>
            ${(window._implementations || []).map(i => `<option value="${i.id}">${i.org} · ${i.stage}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="margin-top:16px">
        <button class="btn-primary" onclick="saveCall()">+ Log Call</button>
      </div>
    </div>

    <div class="section-title" style="margin-top:32px">All Calls</div>
    <table class="data-table">
      <thead><tr>
        <th>Date</th><th>Org</th><th>Notes</th><th>Related Esc</th><th>Related Impl</th><th></th>
      </tr></thead>
      <tbody>
        ${calls.length === 0
          ? '<tr><td colspan="6" class="empty-cell">No calls logged yet.</td></tr>'
          : calls.map(c => {
              const esc  = c.related_escalation_id ? (window._escalations  || []).find(e => e.id === c.related_escalation_id) : null;
              const impl = c.related_impl_id       ? (window._implementations || []).find(i => i.id === c.related_impl_id)       : null;
              return `<tr class="clickable-row" onclick="openCallDetail('${c.id}')">
                <td>${c.date || '—'}</td>
                <td>${c.org || '—'}</td>
                <td class="notes-cell">${c.notes ? c.notes.substring(0, 80) + (c.notes.length > 80 ? '…' : '') : '—'}</td>
                <td>${esc  ? `<span class="tag">${esc.org} · ${esc.type}</span>`   : '—'}</td>
                <td>${impl ? `<span class="tag tag-blue">${impl.org} · ${impl.stage}</span>` : '—'}</td>
                <td><button class="btn-danger-sm" onclick="event.stopPropagation();deleteCallRecord('${c.id}')">Delete</button></td>
              </tr>`;
            }).join('')}
      </tbody>
    </table>
  `;
}

function renderCallDetail(call) {
  const container = document.getElementById('calls-content');
  const esc  = call.related_escalation_id ? (window._escalations     || []).find(e => e.id === call.related_escalation_id) : null;
  const impl = call.related_impl_id       ? (window._implementations || []).find(i => i.id === call.related_impl_id)       : null;

  container.innerHTML = `
    <button class="btn-secondary" style="margin-bottom:16px" onclick="_viewingCall=null;renderTab('calls')">← Back to Calls</button>

    <div class="detail-card">
      <div class="detail-header">
        <div>
          <div class="detail-title">${call.org || 'Unnamed Call'}</div>
          <div class="detail-meta">${call.date || '—'}</div>
        </div>
        <button class="btn-danger-sm" onclick="deleteCallRecord('${call.id}')">Delete</button>
      </div>

      ${call.notes ? `<div class="detail-notes">${call.notes}</div>` : ''}

      <div class="detail-links" style="margin-top:16px">
        ${esc  ? `<div class="detail-related">🔗 Related escalation: <span class="related-link" onclick="switchTab('escalations')">${esc.org} · ${esc.type} · ${esc.date || '—'} →</span></div>`   : ''}
        ${impl ? `<div class="detail-related">🔗 Related implementation: <span class="related-link" onclick="switchTab('silent-app')">${impl.org} · ${impl.stage} →</span></div>` : ''}
      </div>
    </div>
  `;
}

function openCallDetail(id) {
  _viewingCall = id;
  renderTab('calls');
}

async function saveCall() {
  const date  = document.getElementById('call-date').value.trim();
  const org   = document.getElementById('call-org').value.trim();
  const notes = document.getElementById('call-notes').value.trim();
  const escId  = document.getElementById('call-esc-id').value  || null;
  const implId = document.getElementById('call-impl-id').value || null;

  if (!date) { showToast('Date is required', 'error'); return; }

  const data = {
    date,
    org:                    org   || null,
    notes:                  notes || null,
    related_escalation_id:  escId,
    related_impl_id:        implId,
  };

  showToast('Saving…', 'info');
  try {
    await addCall(data);

    // If linked to an escalation, append a timeline entry
    if (escId) {
      const esc = (window._escalations || []).find(e => e.id === escId);
      if (esc) {
        const timeline = Array.isArray(esc.timeline) ? [...esc.timeline] : [];
        timeline.push({
          status: esc.outcome || 'Pending',
          date:   date,
          note:   `📞 Call joined with ${org || 'customer'} — ${notes || 'no notes'}`
        });
        await updateEscalation(escId, { timeline });
      }
    }

    // If linked to an implementation, append an activity log entry
    if (implId) {
      const impl = (window._implementations || []).find(i => i.id === implId);
      if (impl) {
        const log = Array.isArray(impl.activity) ? [...impl.activity] : [];
        log.push({
          date:  date,
          note:  `📞 Call joined with ${org || 'customer'} — ${notes || 'no notes'}`,
          slack: null,
          hs:    null
        });
        await updateImplementation(implId, { activity: log });
      }
    }

    await reloadAll();
    showToast('Call logged!', 'success');
  } catch (e) {
    showToast('Save failed', 'error');
  }
}

async function deleteCallRecord(id) {
  if (!confirm('Delete this call?')) return;
  try {
    // Find the call before deleting so we can clean up linked records
    const call = (window._calls || []).find(c => c.id === id);

    await deleteCall(id);

    // Remove the matching timeline entry from the linked escalation
    if (call && call.related_escalation_id) {
      const esc = (window._escalations || []).find(e => e.id === call.related_escalation_id);
      if (esc && Array.isArray(esc.timeline)) {
        const marker = `📞 Call joined with ${call.org || 'customer'}`;
        const cleaned = esc.timeline.filter(t => !t.note || !t.note.startsWith(marker));
        if (cleaned.length !== esc.timeline.length) {
          await updateEscalation(call.related_escalation_id, { timeline: cleaned });
        }
      }
    }

    // Remove the matching activity entry from the linked implementation
    if (call && call.related_impl_id) {
      const impl = (window._implementations || []).find(i => i.id === call.related_impl_id);
      if (impl && Array.isArray(impl.activity)) {
        const marker = `📞 Call joined with ${call.org || 'customer'}`;
        const cleaned = impl.activity.filter(a => !a.note || !a.note.startsWith(marker));
        if (cleaned.length !== impl.activity.length) {
          await updateImplementation(call.related_impl_id, { activity: cleaned });
        }
      }
    }

    _viewingCall = null;
    await reloadAll();
    showToast('Call deleted', 'success');
  } catch (e) {
    showToast('Delete failed', 'error');
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function isThisWeek(dateStr) {
  if (!dateStr) return false;
  const d    = new Date(dateStr);
  const now  = new Date();
  const mon  = new Date(now);
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  mon.setHours(0, 0, 0, 0);
  const sun  = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return d >= mon && d <= sun;
}
