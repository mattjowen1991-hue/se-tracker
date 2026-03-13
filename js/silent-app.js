// Silent App Implementations Tab

const DEFAULT_CHECKLISTS = {
  'Pre-Deployment': [
    { id: 'pd1',  text: 'Confirm Silent App plan is active (Enterprise or Team + add-on)' },
    { id: 'pd2',  text: 'Confirm OS(es) in scope (Windows / macOS / Linux)' },
    { id: 'pd3',  text: 'Confirm deployment method (MDM / Individual / Script)' },
    { id: 'pd4',  text: 'Confirm MDM tool if applicable (Intune, Jamf, etc.)' },
    { id: 'pd5',  text: 'Confirm number of devices in scope' },
    { id: 'pd6',  text: 'Create automatic tracking policy in Hubstaff' },
    { id: 'pd7',  text: '"Automatically add new members to this policy" toggled ON' },
    { id: 'pd8',  text: 'Set as default auto-add policy for the organisation' },
    { id: 'pd9',  text: 'Distribute .mobileconfig to devices (macOS + MDM only)' },
    { id: 'pd10', text: 'Confirm customer has admin access to their MDM tool' },
    { id: 'pd11', text: 'Agree on pilot group (1-2 machines) before full rollout' },
  ],
  'Deployment': [
    { id: 'dp1', text: 'Download correct installer for OS (.pkg / .msi / .sh)' },
    { id: 'dp2', text: 'Deploy to pilot group (1-2 machines)' },
    { id: 'dp3', text: 'Confirm members auto-provisioned in Hubstaff after pilot' },
    { id: 'dp4', text: 'Expand to larger pilot group (3-4 machines)' },
    { id: 'dp5', text: 'Full rollout to all target devices' },
    { id: 'dp6', text: 'Merge any duplicate members if needed' },
  ],
  'Validation': [
    { id: 'vl1', text: 'Time tracking data appearing in dashboard (within 10-15 mins)' },
    { id: 'vl2', text: 'Correct members created (names and OS usernames match)' },
    { id: 'vl3', text: 'Automatic tracking policy applying correctly to new members' },
    { id: 'vl4', text: 'Screenshots / app / URL tracking working (if permissions granted)' },
    { id: 'vl5', text: 'All devices visible on the Computers page in Hubstaff' },
    { id: 'vl6', text: 'Force restart on any devices not reporting (sign out/in or reboot)' },
  ],
  'Stability': [
    { id: 'st1', text: 'Customer confirmed all devices reporting consistently' },
    { id: 'st2', text: 'No duplicate member issues outstanding' },
    { id: 'st3', text: 'CSAT score collected from customer' },
    { id: 'st4', text: 'Implementation notes documented and closed' },
  ]
};

let _viewMode = 'kanban';
let _viewingImpl = null;

// ── Main render ───────────────────────────────────────────────────────────────

function renderSilentApp(implementations) {
  if (_viewingImpl) {
    const impl = implementations.find(i => i.id === _viewingImpl);
    if (impl) { renderImplDetail(impl, implementations); return; }
    _viewingImpl = null;
  }

  const total   = implementations.length;
  const byStage = {};
  STAGES.forEach(s => byStage[s] = implementations.filter(i => i.stage === s));
  const stable = byStage['Stability'] ? byStage['Stability'].length : 0;
  const atRisk = implementations.filter(i => i.rag === 'Red').length;
  const amber  = implementations.filter(i => i.rag === 'Amber').length;

  document.getElementById('silent-app-content').innerHTML =
    '<div class="sa-header">' +
      '<div class="sa-stats">' +
        '<div class="sa-stat"><span class="sa-stat-num">' + total  + '</span><span class="sa-stat-label">Total</span></div>' +
        '<div class="sa-stat"><span class="sa-stat-num">' + stable + '</span><span class="sa-stat-label">Stable</span></div>' +
        '<div class="sa-stat amber"><span class="sa-stat-num">' + amber  + '</span><span class="sa-stat-label">Amber</span></div>' +
        '<div class="sa-stat red"><span class="sa-stat-num">'   + atRisk + '</span><span class="sa-stat-label">At Risk</span></div>' +
      '</div>' +
      '<div class="sa-toolbar">' +
        '<div class="view-toggle">' +
          '<button class="view-btn ' + (_viewMode==='kanban'?'active':'') + '" onclick="setViewMode(\'kanban\')">&#9646; Kanban</button>' +
          '<button class="view-btn ' + (_viewMode==='table' ?'active':'') + '" onclick="setViewMode(\'table\')">&#9776; Table</button>' +
        '</div>' +
        '<button class="btn-primary" onclick="showAddImplModal()">+ Add Implementation</button>' +
      '</div>' +
    '</div>' +
    (total === 0
      ? '<div class="empty-state">No implementations tracked yet. Add your first one above.</div>'
      : _viewMode === 'kanban' ? renderKanban(byStage) : renderTable(implementations)) +
    renderImplModal(null);
}

// ── Modal HTML ────────────────────────────────────────────────────────────────

function renderImplModal(impl) {
  const os = impl && Array.isArray(impl.os) ? impl.os : [];
  return '<div id="impl-modal" class="modal hidden">' +
    '<div class="modal-box modal-wide">' +
      '<h3 id="impl-modal-title">' + (impl ? 'Edit' : 'Add') + ' Implementation</h3>' +
      '<div class="modal-grid">' +
        '<input id="impl-org" placeholder="Organisation name" class="input-field" style="grid-column:1/-1" value="' + (impl ? impl.org || '' : '') + '" />' +
        '<input id="impl-contact-name" placeholder="Contact name" class="input-field" value="' + (impl ? impl.contact_name || '' : '') + '" />' +
        '<input id="impl-contact-email" placeholder="Contact email" class="input-field" value="' + (impl ? impl.contact_email || '' : '') + '" />' +
        '<input id="impl-org-size" placeholder="Number of devices" type="number" class="input-field" value="' + (impl ? impl.org_size || '' : '') + '" />' +
        '<input id="impl-mdm" placeholder="MDM tool (e.g. Intune, Jamf, None)" class="input-field" value="' + (impl ? impl.mdm_type || '' : '') + '" />' +
        '<div style="grid-column:1/-1"><label class="field-label">Operating Systems</label>' +
          '<div class="os-checkboxes">' +
            ['Windows','macOS','Linux'].map(function(o) {
              return '<label class="os-check"><input type="checkbox" class="impl-os-cb" value="' + o + '" ' + (os.includes(o)?'checked':'') + '/> ' + o + '</label>';
            }).join('') +
          '</div></div>' +
        '<select id="impl-deploy-method" class="input-field">' +
          '<option value="">Deployment method...</option>' +
          ['Individual Install','MDM / Group Deploy','Script / Terminal','Mixed'].map(function(m) {
            return '<option' + (impl && impl.deployment_method===m?' selected':'') + '>' + m + '</option>';
          }).join('') +
        '</select>' +
        '<select id="impl-stage" class="input-field">' +
          STAGES.map(function(s) { return '<option' + (impl && impl.stage===s?' selected':'') + '>' + s + '</option>'; }).join('') +
        '</select>' +
        '<select id="impl-rag" class="input-field">' +
          '<option value="Green"' + (impl && impl.rag==='Green'?' selected':'') + '>Green - On Track</option>' +
          '<option value="Amber"' + (impl && impl.rag==='Amber'?' selected':'') + '>Amber - Needs Attention</option>' +
          '<option value="Red"'   + (impl && impl.rag==='Red'  ?' selected':'') + '>Red - At Risk</option>' +
        '</select>' +
        '<input id="impl-csat" placeholder="CSAT score (1-10, optional)" type="number" min="1" max="10" class="input-field" value="' + (impl ? impl.csat || '' : '') + '" />' +
        '<input id="impl-hubspot-url" placeholder="HubSpot URL (optional)" class="input-field" value="' + (impl ? impl.hubspot_url || '' : '') + '" />' +
        '<input id="impl-slack-url" placeholder="Slack URL (optional)" class="input-field" value="' + (impl ? impl.slack_url || '' : '') + '" />' +
        '<textarea id="impl-notes" placeholder="Notes" class="input-field" rows="3" style="grid-column:1/-1">' + (impl ? impl.notes || '' : '') + '</textarea>' +
      '</div>' +
      '<input type="hidden" id="impl-edit-id" value="' + (impl ? impl.id : '') + '" />' +
      '<div class="modal-actions">' +
        '<button class="btn-secondary" onclick="closeImplModal()">Cancel</button>' +
        '<button class="btn-primary" onclick="saveImpl()">Save</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

// ── Kanban ────────────────────────────────────────────────────────────────────

function renderKanban(byStage) {
  return '<div class="kanban-board">' +
    STAGES.map(function(stage) {
      var cards = byStage[stage] || [];
      return '<div class="kanban-col" data-stage="' + stage + '"' +
        ' ondragover="kanbanDragOver(event)" ondrop="kanbanDrop(event,\'' + stage + '\')" ondragleave="kanbanDragLeave(event)">' +
        '<div class="kanban-col-header">' +
          '<span class="kanban-col-title">' + stage + '</span>' +
          '<span class="kanban-col-count">' + cards.length + '</span>' +
        '</div>' +
        '<div class="kanban-cards">' +
          (cards.length === 0
            ? '<div class="kanban-empty kanban-drop-hint">None</div>'
            : cards.map(renderKanbanCard).join('')) +
        '</div>' +
      '</div>';
    }).join('') +
  '</div>';
}

function renderKanbanCard(impl) {
  var checklist  = impl.checklist || {};
  var stageItems = DEFAULT_CHECKLISTS[impl.stage] || [];
  var completed  = stageItems.filter(function(item) { return checklist[item.id]; }).length;
  var total      = stageItems.length;
  var pct        = total > 0 ? Math.round((completed / total) * 100) : 0;
  var ragColour  = { Green: 'var(--green)', Amber: 'var(--amber)', Red: 'var(--red)' }[impl.rag] || 'var(--muted)';
  var os         = Array.isArray(impl.os) ? impl.os.join(', ') : (impl.os || '');
  var fillColour = pct === 100 ? 'var(--green)' : 'var(--blue)';

  return '<div class="kanban-card" draggable="true"' +
    ' ondragstart="kanbanDragStart(event,\'' + impl.id + '\')" ondragend="kanbanDragEnd(event)"' +
    ' onclick="openImplDetail(\'' + impl.id + '\')">' +
    '<div class="kanban-card-top">' +
      '<div class="kanban-card-org">' + impl.org + '</div>' +
      '<div class="rag-dot" style="background:' + ragColour + '" title="' + impl.rag + '"></div>' +
    '</div>' +
    '<div class="kanban-card-meta">' + (impl.contact_name || '') + (impl.org_size ? ' &nbsp;·&nbsp; ' + impl.org_size + ' devices' : '') + '</div>' +
    (os ? '<div class="kanban-card-meta">' + os + (impl.mdm_type ? ' &nbsp;·&nbsp; ' + impl.mdm_type : '') + '</div>' : '') +
    '<div class="checklist-progress">' +
      '<div class="progress-bar-track">' +
        '<div class="progress-bar-fill" style="width:' + pct + '%;background:' + fillColour + '"></div>' +
      '</div>' +
      '<span class="progress-label">' + completed + '/' + total + '</span>' +
    '</div>' +
  '</div>';
}


// ── Drag and drop ─────────────────────────────────────────────────────────────

var _draggingId = null;

function kanbanDragStart(event, id) {
  _draggingId = id;
  event.dataTransfer.effectAllowed = 'move';
  setTimeout(function() { event.target.classList.add('dragging'); }, 0);
}

function kanbanDragEnd(event) {
  event.target.classList.remove('dragging');
  document.querySelectorAll('.kanban-col').forEach(function(col) { col.classList.remove('drag-over'); });
}

function kanbanDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('.kanban-col').forEach(function(c) { c.classList.remove('drag-over'); });
  event.currentTarget.classList.add('drag-over');
}

function kanbanDragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    event.currentTarget.classList.remove('drag-over');
  }
}

async function kanbanDrop(event, newStage) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  if (!_draggingId) return;
  var impl = window._implementations.find(function(i) { return i.id === _draggingId; });
  _draggingId = null;
  if (!impl || impl.stage === newStage) return;
  var stageEnteredAt = Object.assign({}, impl.stage_entered_at || {});
  stageEnteredAt[newStage] = new Date().toISOString().slice(0,10);
  var activity = (Array.isArray(impl.activity) ? impl.activity : []).concat([{
    stage: newStage,
    date: new Date().toISOString().slice(0,10),
    note: 'Moved from ' + impl.stage + ' to ' + newStage
  }]);
  try {
    await updateImplementation(impl.id, { stage: newStage, stage_entered_at: stageEnteredAt, activity: activity });
    await reloadAll();
    showToast(impl.org + ' moved to ' + newStage, 'success');
  } catch(e) {
    showToast('Move failed', 'error');
  }
}

// ── Table ─────────────────────────────────────────────────────────────────────

function renderTable(implementations) {
  return '<table class="data-table">' +
    '<thead><tr>' +
      '<th>Organisation</th><th>Contact</th><th>Devices</th><th>OS</th>' +
      '<th>MDM</th><th>Stage</th><th>RAG</th><th>Progress</th><th></th>' +
    '</tr></thead>' +
    '<tbody>' +
    implementations.map(function(impl) {
      var checklist  = impl.checklist || {};
      var stageItems = DEFAULT_CHECKLISTS[impl.stage] || [];
      var completed  = stageItems.filter(function(item) { return checklist[item.id]; }).length;
      var total      = stageItems.length;
      var pct        = total > 0 ? Math.round((completed / total) * 100) : 0;
      var ragColour  = { Green: 'var(--green)', Amber: 'var(--amber)', Red: 'var(--red)' }[impl.rag] || 'var(--muted)';
      var os         = Array.isArray(impl.os) ? impl.os.join(', ') : (impl.os || '');
      var fillColour = pct === 100 ? 'var(--green)' : 'var(--blue)';
      return '<tr class="clickable-row" onclick="openImplDetail(\'' + impl.id + '\')">' +
        '<td><strong>' + impl.org + '</strong></td>' +
        '<td>' + (impl.contact_name || '&mdash;') + '</td>' +
        '<td>' + (impl.org_size || '&mdash;') + '</td>' +
        '<td>' + (os || '&mdash;') + '</td>' +
        '<td>' + (impl.mdm_type || '&mdash;') + '</td>' +
        '<td><span class="tag">' + impl.stage + '</span></td>' +
        '<td><span style="color:' + ragColour + ';font-weight:600">' + impl.rag + '</span></td>' +
        '<td><div style="display:flex;align-items:center;gap:6px">' +
          '<div class="progress-bar-track" style="width:80px"><div class="progress-bar-fill" style="width:' + pct + '%;background:' + fillColour + '"></div></div>' +
          '<span class="progress-label">' + pct + '%</span>' +
        '</div></td>' +
        '<td onclick="event.stopPropagation()">' +
          '<button class="icon-btn" onclick="editImpl(\'' + impl.id + '\')">&#9998;</button>' +
          '<button class="icon-btn" onclick="removeImpl(\'' + impl.id + '\')">&#128465;</button>' +
        '</td>' +
      '</tr>';
    }).join('') +
    '</tbody></table>';
}

// ── Detail View ───────────────────────────────────────────────────────────────

function openImplDetail(id) {
  _viewingImpl = id;
  renderSilentApp(window._implementations);
}

function closeImplDetail() {
  _viewingImpl = null;
  renderSilentApp(window._implementations);
}

function renderImplDetail(impl, allImpls) {
  var checklist      = impl.checklist || {};
  var activity       = Array.isArray(impl.activity) ? impl.activity : [];
  var os             = Array.isArray(impl.os) ? impl.os : (impl.os ? [impl.os] : []);
  var ragColour      = { Green: 'var(--green)', Amber: 'var(--amber)', Red: 'var(--red)' }[impl.rag] || 'var(--muted)';
  var ragEmoji       = impl.rag === 'Green' ? '🟢' : impl.rag === 'Amber' ? '🟡' : '🔴';
  var linkedIds      = Array.isArray(impl.linked_escalation_ids) ? impl.linked_escalation_ids : [];
  var linkedEscs     = (window._escalations || []).filter(function(e) { return linkedIds.includes(e.id); });
  var stageEnteredAt = impl.stage_entered_at || {};
  var stageIdx       = STAGES.indexOf(impl.stage);

  // Pipeline
  var pipelineHtml = '<div class="stage-pipeline">';
  STAGES.forEach(function(s, i) {
    var isDone   = i < stageIdx;
    var isActive = i === stageIdx;
    var cls      = 'pipeline-step' + (isDone?' done':'') + (isActive?' active':'');
    pipelineHtml +=
      '<div class="' + cls + '">' +
        '<div class="pipeline-dot"></div>' +
        '<div class="pipeline-label">' + s + '</div>' +
        (stageEnteredAt[s] ? '<div class="pipeline-date">' + stageEnteredAt[s] + '</div>' : '') +
      '</div>' +
      (i < STAGES.length-1 ? '<div class="pipeline-line' + (isDone?' done':'') + '"></div>' : '');
  });
  pipelineHtml += '</div>';

  // Checklists
  var checklistsHtml = STAGES.map(function(stage) {
    var items     = DEFAULT_CHECKLISTS[stage] || [];
    var completed = items.filter(function(item) { return checklist[item.id]; }).length;
    var isCurrent = impl.stage === stage;
    return '<div class="checklist-card' + (isCurrent?' checklist-active':'') + '">' +
      '<div class="checklist-header">' +
        '<span class="checklist-stage-title">' + stage + '</span>' +
        '<span class="checklist-count' + (completed===items.length?' complete':'') + '">' + completed + '/' + items.length + '</span>' +
      '</div>' +
      '<div class="checklist-items">' +
        items.map(function(item) {
          var done = checklist[item.id];
          return '<label class="checklist-item">' +
            '<input type="checkbox" ' + (done?'checked':'') + ' onchange="toggleChecklistItem(\'' + impl.id + '\',\'' + item.id + '\',this.checked)" />' +
            '<span class="' + (done?'checked-text':'') + '">' + item.text + '</span>' +
          '</label>';
        }).join('') +
      '</div>' +
    '</div>';
  }).join('');

  // Linked escalations
  var linkedHtml = '<div class="checklist-card">' +
    '<div class="checklist-header"><span class="checklist-stage-title">Linked Escalations</span><span class="checklist-count">' + linkedEscs.length + '</span></div>' +
    (linkedEscs.length === 0
      ? '<div class="checklist-empty">No escalations linked yet</div>'
      : linkedEscs.map(function(e) {
          return '<div class="linked-esc" onclick="(function(){_viewingImpl=null;switchTab(\'escalations\');setTimeout(function(){openEscalationDetail(\'' + e.id + '\')},200)})()">' +
            e.org + ' &nbsp;·&nbsp; <span class="tag" style="font-size:0.75rem">' + e.type + '</span> &nbsp;·&nbsp; ' + (e.date||'&mdash;') +
            '<span style="float:right;color:var(--muted);font-size:0.75rem">' + e.outcome + '</span>' +
          '</div>';
        }).join('')) +
  '</div>';

  // Activity timeline
  var timelineHtml = activity.length === 0
    ? '<div class="checklist-empty">No activity logged yet</div>'
    : [...activity].reverse().map(function(entry) {
        var rc = { Green: 'var(--green)', Amber: 'var(--amber)', Red: 'var(--red)' }[entry.rag] || '';
        return '<div class="activity-entry">' +
          '<div class="activity-entry-top">' +
            '<span class="activity-stage-tag">' + (entry.stage||'Note') + '</span>' +
            (entry.rag ? '<span style="color:' + rc + ';font-size:0.75rem;font-weight:600">' + entry.rag + '</span>' : '') +
            '<span class="timeline-date">' + (entry.date||'') + '</span>' +
          '</div>' +
          '<div class="activity-note">' + entry.note + '</div>' +
          '<div class="activity-links">' +
            (entry.url ? '<a href="' + entry.url + '" target="_blank" class="activity-link">🔗 Link</a>' : '') +
          '</div>' +
        '</div>';
      }).join('');

  document.getElementById('silent-app-content').innerHTML =
    '<div class="detail-back" onclick="closeImplDetail()">&#8592; Back to implementations</div>' +
    '<div class="detail-wrap">' +

      // Left column
      '<div class="detail-main">' +
        '<div class="detail-card">' +
          '<div class="detail-card-header">' +
            '<div>' +
              '<div class="detail-org">' + impl.org + '</div>' +
              '<div class="detail-meta">' + (impl.contact_name||'') + (impl.contact_email?' &nbsp;·&nbsp; <a href="mailto:'+impl.contact_email+'" style="color:var(--blue)">'+impl.contact_email+'</a>':'') + '</div>' +
              '<div class="detail-meta" style="margin-top:4px">' +
                (impl.org_size ? impl.org_size + ' devices' : '') +
                (os.length ? ' &nbsp;·&nbsp; ' + os.join(', ') : '') +
                (impl.deployment_method ? ' &nbsp;·&nbsp; ' + impl.deployment_method : '') +
                (impl.mdm_type ? ' &nbsp;·&nbsp; MDM: ' + impl.mdm_type : '') +
              '</div>' +
              ((impl.hubspot_url || impl.slack_url) ? '<div class="detail-meta" style="margin-top:6px">' +
                (impl.hubspot_url ? '<a href="' + impl.hubspot_url + '" target="_blank" class="activity-link">🔗 HubSpot</a>' : '') +
                (impl.hubspot_url && impl.slack_url ? ' &nbsp;' : '') +
                (impl.slack_url ? '<a href="' + impl.slack_url + '" target="_blank" class="activity-link">💬 Slack</a>' : '') +
              '</div>' : '') +
            '</div>' +
            '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">' +
              '<span class="rag-badge-lg" style="background:' + ragColour + '22;color:' + ragColour + ';border:1px solid ' + ragColour + '66">' + ragEmoji + ' ' + impl.rag + '</span>' +
              (impl.csat ? '<span class="csat-badge">CSAT ' + impl.csat + '/10</span>' : '') +
              '<button class="btn-secondary btn-sm" onclick="editImpl(\'' + impl.id + '\')">Edit</button>' +
            '</div>' +
          '</div>' +
          pipelineHtml +
          (impl.notes ? '<div class="detail-notes">' + impl.notes + '</div>' : '') +
        '</div>' +
        checklistsHtml +
        linkedHtml +
      '</div>' +

      // Right column — activity log
      '<div class="detail-sidebar">' +
        '<div class="activity-card">' +
          '<div class="activity-header">Activity Log</div>' +
          '<div class="activity-form">' +
            '<select id="act-stage" class="input-field input-sm">' +
              STAGES.map(function(s){ return '<option value="'+s+'"'+(impl.stage===s?' selected':'')+'>'+s+'</option>'; }).join('') +
              '<option value="Note">Note only</option>' +
            '</select>' +
            '<select id="act-rag" class="input-field input-sm">' +
              '<option value="">RAG unchanged</option>' +
              '<option value="Green">Green</option>' +
              '<option value="Amber">Amber</option>' +
              '<option value="Red">Red</option>' +
            '</select>' +
            '<textarea id="act-note" placeholder="What happened? What\'s next?" class="input-field" rows="3"></textarea>' +
            '<input id="act-url" placeholder="URL (optional — Slack, HubSpot, doc, etc.)" class="input-field input-sm" />' +
            '<button class="btn-primary btn-sm" style="width:100%" onclick="addActivityEntry(\'' + impl.id + '\')">Add Entry</button>' +
          '</div>' +
          '<div class="activity-timeline">' + timelineHtml + '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    renderImplModal(impl);
}

// ── Checklist toggle ──────────────────────────────────────────────────────────

async function toggleChecklistItem(implId, itemId, checked) {
  var impl = window._implementations.find(function(i){ return i.id === implId; });
  if (!impl) return;
  var checklist = Object.assign({}, impl.checklist || {});
  checklist[itemId] = checked;
  try {
    await updateImplementation(implId, { checklist: checklist });
    await reloadAll();
    var updated = window._implementations.find(function(i){ return i.id === implId; });
    if (updated) renderImplDetail(updated, window._implementations);
  } catch(e) {
    showToast('Failed to save checklist', 'error');
  }
}

// ── Activity log ──────────────────────────────────────────────────────────────

async function addActivityEntry(implId) {
  var impl = window._implementations.find(function(i){ return i.id === implId; });
  if (!impl) return;

  var stage       = document.getElementById('act-stage').value;
  var rag         = document.getElementById('act-rag').value;
  var note        = document.getElementById('act-note').value.trim();
  var url = document.getElementById('act-url').value.trim();

  if (!note) { showToast('Please add a note', 'error'); return; }

  var entry = { stage: stage, date: new Date().toISOString().slice(0,10), note: note };
  if (rag)         entry.rag         = rag;
  if (url) entry.url = url;

  var activity = (Array.isArray(impl.activity) ? impl.activity : []).concat([entry]);
  var update   = { activity: activity };

  if (stage !== 'Note' && stage !== impl.stage) {
    update.stage = stage;
    var stageEnteredAt = Object.assign({}, impl.stage_entered_at || {});
    stageEnteredAt[stage] = entry.date;
    update.stage_entered_at = stageEnteredAt;
  }
  if (rag && rag !== impl.rag) update.rag = rag;

  showToast('Saving...', 'info');
  try {
    await updateImplementation(implId, update);
    await reloadAll();
    showToast('Entry added!', 'success');
    var updated = window._implementations.find(function(i){ return i.id === implId; });
    if (updated) renderImplDetail(updated, window._implementations);
  } catch(e) {
    showToast('Save failed', 'error');
  }
}

// ── View mode ─────────────────────────────────────────────────────────────────

function setViewMode(mode) {
  _viewMode = mode;
  renderSilentApp(window._implementations);
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function showAddImplModal() {
  document.getElementById('impl-modal-title').textContent = 'Add Implementation';
  document.getElementById('impl-edit-id').value = '';
  ['impl-org','impl-contact-name','impl-contact-email','impl-org-size','impl-mdm','impl-notes','impl-csat','impl-hubspot-url','impl-slack-url'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.value = '';
  });
  document.querySelectorAll('.impl-os-cb').forEach(function(cb){ cb.checked = false; });
  document.getElementById('impl-stage').value = STAGES[0];
  document.getElementById('impl-rag').value = 'Green';
  document.getElementById('impl-deploy-method').value = '';
  document.getElementById('impl-modal').classList.remove('hidden');
}

function closeImplModal() {
  document.getElementById('impl-modal').classList.add('hidden');
}

function editImpl(id) {
  var impl = window._implementations.find(function(i){ return i.id === id; });
  if (!impl) return;
  document.getElementById('impl-modal-title').textContent = 'Edit Implementation';
  document.getElementById('impl-edit-id').value   = id;
  document.getElementById('impl-org').value        = impl.org || '';
  document.getElementById('impl-contact-name').value  = impl.contact_name || '';
  document.getElementById('impl-contact-email').value = impl.contact_email || '';
  document.getElementById('impl-org-size').value   = impl.org_size || '';
  document.getElementById('impl-mdm').value         = impl.mdm_type || '';
  document.getElementById('impl-deploy-method').value = impl.deployment_method || '';
  document.getElementById('impl-stage').value      = impl.stage || STAGES[0];
  document.getElementById('impl-rag').value         = impl.rag || 'Green';
  document.getElementById('impl-csat').value        = impl.csat || '';
  document.getElementById('impl-hubspot-url').value = impl.hubspot_url || '';
  document.getElementById('impl-slack-url').value   = impl.slack_url || '';
  document.getElementById('impl-notes').value       = impl.notes || '';
  var osArr = Array.isArray(impl.os) ? impl.os : [];
  document.querySelectorAll('.impl-os-cb').forEach(function(cb){ cb.checked = osArr.includes(cb.value); });
  document.getElementById('impl-modal').classList.remove('hidden');
}

async function saveImpl() {
  var id = document.getElementById('impl-edit-id').value;
  var os = Array.from(document.querySelectorAll('.impl-os-cb:checked')).map(function(cb){ return cb.value; });
  var data = {
    org:               document.getElementById('impl-org').value.trim(),
    contact_name:      document.getElementById('impl-contact-name').value.trim(),
    contact_email:     document.getElementById('impl-contact-email').value.trim(),
    org_size:          parseInt(document.getElementById('impl-org-size').value) || null,
    mdm_type:          document.getElementById('impl-mdm').value.trim(),
    deployment_method: document.getElementById('impl-deploy-method').value,
    stage:             document.getElementById('impl-stage').value,
    rag:               document.getElementById('impl-rag').value,
    csat:              parseInt(document.getElementById('impl-csat').value) || null,
    hubspot_url:       document.getElementById('impl-hubspot-url').value.trim() || null,
    slack_url:         document.getElementById('impl-slack-url').value.trim() || null,
    notes:             document.getElementById('impl-notes').value.trim(),
    os:                os.length ? os : null,
  };
  if (!data.org) { showToast('Organisation name is required', 'error'); return; }
  if (!id) {
    data.stage_entered_at = {};
    data.stage_entered_at[data.stage] = new Date().toISOString().slice(0,10);
    data.checklist = {};
    data.activity  = [];
  }
  showToast('Saving...', 'info');
  try {
    if (id) { await updateImplementation(id, data); } else { await addImplementation(data); }
    closeImplModal();
    await reloadAll();
    showToast('Saved!', 'success');
    if (_viewingImpl) {
      var updated = window._implementations.find(function(i){ return i.id === (_viewingImpl||id); });
      if (updated) renderImplDetail(updated, window._implementations);
    }
  } catch(e) {
    showToast('Save failed', 'error');
  }
}

async function removeImpl(id) {
  if (!confirm('Delete this implementation?')) return;
  try {
    await deleteImplementation(id);
    _viewingImpl = null;
    await reloadAll();
    showToast('Deleted', 'success');
  } catch(e) {
    showToast('Delete failed', 'error');
  }
}
