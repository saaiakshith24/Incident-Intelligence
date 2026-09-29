const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchSystemStatus() {
  const res = await fetch(`${API_BASE_URL}/api/system/status`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch system status");
  return res.json();
}

// --- WEBSITE AUDIT APIS (Spec 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 41, 50, 51) ---

export async function startWebsiteAudit(url: string, scan_mode: string = "FULL_AUDIT", logs_content?: string, allow_local: boolean = true) {
  const res = await fetch(`${API_BASE_URL}/api/audits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, scan_mode, logs_content, allow_local }),
  });
  if (!res.ok) throw new Error("Failed to start website audit");
  return res.json();
}

export async function fetchAudits() {
  const res = await fetch(`${API_BASE_URL}/api/audits`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch audits");
  return res.json();
}

export async function fetchAuditProgress(audit_id: string) {
  const res = await fetch(`${API_BASE_URL}/api/audits/${audit_id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch audit progress");
  return res.json();
}

export async function fetchAuditResults(audit_id: string) {
  const res = await fetch(`${API_BASE_URL}/api/audits/${audit_id}/results`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch audit results");
  return res.json();
}

export async function ingestLogs(raw_logs: string, source_label: string = "Uploaded Log") {
  const res = await fetch(`${API_BASE_URL}/api/logs/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw_logs, source_label }),
  });
  if (!res.ok) throw new Error("Failed to ingest logs");
  return res.json();
}

export async function fetchErrors() {
  const res = await fetch(`${API_BASE_URL}/api/errors`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch error records");
  return res.json();
}

// --- SERVICES & RUNBOOKS ---

export async function fetchServices() {
  const res = await fetch(`${API_BASE_URL}/api/services`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch services");
  return res.json();
}

export async function fetchService(serviceId: string) {
  const res = await fetch(`${API_BASE_URL}/api/services/${serviceId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch service detail");
  return res.json();
}

export async function fetchRunbooks() {
  const res = await fetch(`${API_BASE_URL}/api/runbooks`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch runbooks");
  return res.json();
}

export async function fetchAuditLogs() {
  const res = await fetch(`${API_BASE_URL}/api/audit-logs`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  return res.json();
}

// --- INCIDENTS WORKSPACE ---

export async function fetchIncidents() {
  const res = await fetch(`${API_BASE_URL}/api/incidents`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch incidents");
  return res.json();
}

export async function fetchIncident(id: string) {
  const res = await fetch(`${API_BASE_URL}/api/incidents/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch incident detail");
  return res.json();
}

export async function injectIncident(scenario_type: string, mode: string = "WITH_MEMORY") {
  const res = await fetch(`${API_BASE_URL}/api/incidents/inject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario_type, mode }),
  });
  if (!res.ok) throw new Error("Failed to inject incident");
  return res.json();
}

export async function investigateIncident(id: string, mode: string = "WITH_MEMORY") {
  const res = await fetch(`${API_BASE_URL}/api/incidents/${id}/investigate?mode=${mode}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to run investigation");
  return res.json();
}

export async function generateRecommendation(id: string, mode: string = "WITH_MEMORY") {
  const res = await fetch(`${API_BASE_URL}/api/incidents/${id}/recommend?mode=${mode}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to generate recommendation");
  return res.json();
}

export async function approveRecommendation(id: string, action_id: string, approved: boolean, reason?: string, corrected_action?: string) {
  const res = await fetch(`${API_BASE_URL}/api/incidents/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action_id, approved, reason, corrected_action }),
  });
  if (!res.ok) throw new Error("Failed to submit approval");
  return res.json();
}

export async function executeAction(id: string, action_id: string) {
  const res = await fetch(`${API_BASE_URL}/api/incidents/${id}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action_id }),
  });
  if (!res.ok) throw new Error("Failed to execute action");
  return res.json();
}

export async function createPostmortem(id: string) {
  const res = await fetch(`${API_BASE_URL}/api/incidents/${id}/postmortem`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to generate postmortem");
  return res.json();
}

export async function sendChatMessage(incident_id: string, message: string) {
  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ incident_id, message }),
  });
  if (!res.ok) throw new Error("Failed to send chat message");
  return res.json();
}

// --- MEMORY & EVALUATION ---

export async function searchMemories(query: string = "", incident_type?: string) {
  const url = `${API_BASE_URL}/api/memory/search?query=${encodeURIComponent(query)}${incident_type ? `&incident_type=${incident_type}` : ''}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to search memories");
  return res.json();
}

export async function retainMemory(payload: any) {
  const res = await fetch(`${API_BASE_URL}/api/memory/retain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to retain memory");
  return res.json();
}

export async function fetchEvaluation() {
  const res = await fetch(`${API_BASE_URL}/api/evaluation`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch evaluation metrics");
  return res.json();
}

export async function runAblation(scenario_type: string = "INCIDENT_1_DB_EXHAUSTION") {
  const res = await fetch(`${API_BASE_URL}/api/evaluation/ablation?scenario_type=${scenario_type}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to run ablation benchmark");
  return res.json();
}

export async function resetDemo() {
  const res = await fetch(`${API_BASE_URL}/api/demo/reset`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to reset demo state");
  return res.json();
}

export async function compareAudits(base_id: string, target_id: string) {
  const res = await fetch(`${API_BASE_URL}/api/audits/compare?base_id=${encodeURIComponent(base_id)}&target_id=${encodeURIComponent(target_id)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to compare audits");
  return res.json();
}

export async function simulateWebhook(channel: string = "SLACK", incident_id?: string, custom_message?: string) {
  const res = await fetch(`${API_BASE_URL}/api/integrations/webhook/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel, incident_id, custom_message }),
  });
  if (!res.ok) throw new Error("Failed to simulate webhook dispatch");
  return res.json();
}

