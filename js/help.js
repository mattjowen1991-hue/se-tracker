// Help guide — modal content and navigation

const HELP_CONTENT = {

  'deployments': {
    title: 'Deployments',
    sections: [
      {
        heading: 'What is the Deployments tab?',
        body: `This is your command centre for every Silent App implementation you own. Each customer org gets a record that tracks its full journey from pre-deployment through to stability — including checklists, an activity log, and any linked escalations.`
      },
      {
        heading: 'The four stages',
        table: {
          headers: ['Stage', 'What it means'],
          rows: [
            ['Pre-Deployment', 'Discovery and prep. Confirming plan, OS, deployment method, MDM tool, device count, and creating the tracking policy in Hubstaff.'],
            ['Deployment', 'Active rollout. Pilot install on 1–2 machines, then 3–4, then full fleet. Watch for auto-provisioning and duplicate members.'],
            ['Validation', 'Confirming everything works — tracking data appearing, correct members created, screenshots and permissions working, all devices on the Computers page.'],
            ['Stability', 'Customer confirmed everything is running consistently. Implementation is closed.'],
          ]
        }
      },
      {
        heading: 'RAG status',
        table: {
          headers: ['Status', 'Meaning'],
          rows: [
            ['🟢 Green', 'On track, no blockers.'],
            ['🟡 Amber', 'Needs attention — something is slowing progress or needs follow-up.'],
            ['🔴 Red', 'At risk — deployment is stalled, customer is frustrated, or there is a technical blocker.'],
          ]
        }
      },
      {
        heading: 'Kanban board',
        body: `Each card represents one customer org. The progress bar shows how many checklist items are complete for the current stage. Drag cards between columns to move an org to a new stage — this saves automatically and logs an activity entry.`
      },
      {
        heading: 'Detail view',
        body: `Click any card or table row to open the full detail view. Here you can tick off checklist items (each saves immediately), add activity log entries to record what happened and what's next, change stage or RAG status, and see any deployment escalations linked to this org.`
      },
      {
        heading: 'Logging a deployment escalation from here',
        body: `In the detail view, the Deployment Escalations panel has a "+ Log Escalation" button. This jumps to the Deployment Escalations tab with the deployment pre-selected — no need to find it manually.`
      }
    ]
  },

  'se-escalations': {
    title: 'SE Escalations',
    sections: [
      {
        heading: 'What is the SE Escalations tab?',
        body: `This tracks inbound org-level Silent App issues that are routed to you from the wider support team — cases like Alutal where you're involved as the SE but it's not a deployment you own. Each record is standalone and independent of the Deployments tab.`
      },
      {
        heading: 'Fields explained',
        table: {
          headers: ['Field', 'Notes'],
          rows: [
            ['Org name', 'The customer organisation the issue relates to.'],
            ['Date logged', 'When the escalation was first raised with you.'],
            ['Priority', 'Normal / High / Urgent — set based on customer impact and MRR.'],
            ['Stage', 'Open → Pending → Blocked → Resolved. See below.'],
            ['MRR', 'Monthly recurring revenue of the org. Useful for prioritisation context.'],
            ['HubSpot ticket URL', 'Link to the internal support ticket.'],
            ['Slack thread URL', 'Link to the relevant Slack escalation thread.'],
            ['Notes', 'Brief summary of the issue and current status.'],
          ]
        }
      },
      {
        heading: 'Stages',
        table: {
          headers: ['Stage', 'Meaning'],
          rows: [
            ['Open', 'Actively being worked on.'],
            ['Pending', 'Waiting on something — customer response, engineering, or more logs.'],
            ['Blocked', 'Cannot progress without external action. Needs visibility.'],
            ['Resolved', 'Issue closed. Moves to the Resolved tab.'],
          ]
        }
      },
      {
        heading: 'Active vs Resolved',
        body: `The Active view shows Open, Pending, and Blocked escalations. The Resolved view shows closed ones. Use the toggle at the top to switch. A resolved escalation can be moved back to Open at any time from its detail view — just click the Open button in the "Move to" section.`
      },
      {
        heading: 'Detail view',
        body: `Click any row to open the detail view. From here you can edit all fields, move the escalation between stages with a single click, and see the HubSpot and Slack links clearly. The stage buttons show every stage except the current one — clicking any of them moves the record immediately.`
      }
    ]
  },

  'deployment-escalations': {
    title: 'Deployment Escalations',
    sections: [
      {
        heading: 'What is the Deployment Escalations tab?',
        body: `This tracks technical issues that arise during one of your active deployments — things that need investigation, a write-up for engineering, or formal tracking beyond the activity log. Every escalation here must be linked to a deployment you own.`
      },
      {
        heading: 'Logging an escalation',
        body: `Click "+ Log Escalation" and select the deployment from the dropdown. You must pick a deployment — if none exist yet, you'll be prompted to create one first. Fill in the type, outcome, days to resolve, and any notes.`
      },
      {
        heading: 'Escalation types',
        table: {
          headers: ['Type', 'When to use it'],
          rows: [
            ['Silent App', 'App not tracking, not installing, not auto-provisioning members.'],
            ['MDM/RDS', 'Issues related to Intune, Jamf, or remote deployment tooling.'],
            ['Network', 'Firewall, proxy, or connectivity issues blocking the app.'],
            ['API', 'SCIM provisioning failures or API-related member sync issues.'],
            ['Billing', 'Plan or seat issues affecting the deployment.'],
            ['Other', 'Anything that doesn\'t fit the above — add a description.'],
          ]
        }
      },
      {
        heading: 'Outcomes',
        table: {
          headers: ['Outcome', 'Meaning'],
          rows: [
            ['Resolved by SE', 'You diagnosed and fixed it without engineering involvement.'],
            ['Escalated to Engineering', 'Passed to engineering with a full diagnostic write-up.'],
            ['Pending', 'Still open — under investigation or waiting on the customer.'],
          ]
        }
      },
      {
        heading: 'Timeline',
        body: `Click any row to open the escalation detail view. The timeline is your case history — add an entry every time something significant happens: what you investigated, what you found, what was sent to engineering, and what the outcome was. Each entry can update the outcome and attach Slack or HubSpot URLs. Entries are shown newest first.`
      },
      {
        heading: 'Linked deployment',
        body: `The detail view shows a card linking back to the deployment this escalation belongs to. Click "View deployment →" to jump straight to that deployment record without losing your place.`
      }
    ]
  },

  'docs': {
    title: 'Documentation',
    sections: [
      {
        heading: 'What is the Documentation tab?',
        body: `This tracks every document you create or maintain in your SE role. Each entry is a permanent record for a single document — rather than logging a new entry every time you update it, you build up a revision history on the same record. This means you always have one place to find each doc, with a full audit trail of every version.`
      },
      {
        heading: 'Adding a document',
        body: `Click "+ Add Document" and fill in the title, URL (optional — can be added later), category, and any notes about what the document is or who it's for. The document record is permanent — you won't delete and recreate it each time you update the doc.`
      },
      {
        heading: 'Categories',
        table: {
          headers: ['Category', 'Examples'],
          rows: [
            ['Silent App', 'Deployment guides, checklist docs, troubleshooting references.'],
            ['Escalation Process', 'How to escalate, write-up templates, engineering handoff guides.'],
            ['Onboarding', 'New customer onboarding resources, setup walkthroughs.'],
            ['Internal Reference', 'SE toolkit, rules of engagement, internal process docs.'],
            ['Customer-Facing', 'Help articles, external guides sent to customers.'],
            ['Other', 'Anything that doesn\'t fit the above.'],
          ]
        }
      },
      {
        heading: 'Logging a revision',
        body: `Each time you publish or update a document, open its detail view and click "+ Log Revision". Add the date, an optional version label (e.g. v1.2 or "April update"), a summary of what changed, any extra notes, and optionally a URL if the link changed. The revision history is shown newest first, giving you a clear audit trail.`
      },
      {
        heading: 'Updating the URL',
        body: `If you add a URL in a revision entry, it will automatically update the document's main URL too. This keeps the card on the main view always pointing to the latest version.`
      }
    ]
  }

};

let _currentHelpSection = 'deployments';

function openHelp() {
  document.getElementById('help-overlay').classList.remove('hidden');
  showHelpSection(_currentHelpSection);
}

function closeHelp() {
  document.getElementById('help-overlay').classList.add('hidden');
}

function showHelpSection(section) {
  _currentHelpSection = section;

  // Update nav buttons
  document.querySelectorAll('.help-nav-btn').forEach(btn => {
    const isActive = btn.getAttribute('onclick').includes(`'${section}'`);
    btn.classList.toggle('active', isActive);
  });

  const content = HELP_CONTENT[section];
  if (!content) return;

  const body = document.getElementById('help-body');
  body.innerHTML = `
    <h2 class="help-body-title">${content.title}</h2>
    ${content.sections.map(s => `
      <div class="help-section">
        <h3>${s.heading}</h3>
        ${s.body ? `<p>${s.body}</p>` : ''}
        ${s.table ? `
          <div class="help-table-wrap">
            <table class="help-table">
              <thead><tr>${s.table.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
              <tbody>
                ${s.table.rows.map(row => `
                  <tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      </div>
    `).join('')}
  `;
}

// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeHelp();
});
