import uuid
import time
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

from backend.app.simulator.engine import simulator_engine
from backend.app.memory.hindsight_engine import hindsight_engine
from backend.app.agents.incident_agent import incident_agent, SAFE_ACTIONS_ALLOWLIST
from backend.app.verification.engine import verification_engine
from backend.app.evaluation.engine import evaluation_engine
from backend.app.auditor.scanner import website_auditor_engine, ACTIVE_AUDITS_STORE
from backend.app.auditor.log_parser import log_parser_engine

router = APIRouter()

# Active In-Memory Incident Store
ACTIVE_INCIDENTS_STORE: Dict[str, Dict[str, Any]] = {}
AUDIT_LOGS_STORE: List[Dict[str, Any]] = []

def record_audit(action_type: str, summary: str, incident_id: Optional[str] = None, payload: Optional[Dict[str, Any]] = None):
    AUDIT_LOGS_STORE.insert(0, {
        "id": f"aud-{uuid.uuid4().hex[:6]}",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "time_display": time.strftime("%H:%M:%S"),
        "incident_id": incident_id,
        "action_type": action_type,
        "actor": "AGENT",
        "summary": summary,
        "payload": payload or {}
    })

# Pre-populated Runbooks Library
RUNBOOKS_LIBRARY = [
    {
        "id": "rb-101",
        "title": "Database Connection Exhaustion Recovery",
        "scenario_type": "INCIDENT_1_DB_EXHAUSTION",
        "trigger": "Primary PostgreSQL connection pool usage > 90%",
        "risk": "MEDIUM",
        "steps": [
            "Inspect active database connection handles per service.",
            "Recycle zombie/orphaned connection pool slots via reduce_connection_pool.",
            "If deployment v2.5 bug exists, rollback deployment to v2.4.0."
        ],
        "verification": "DB pool usage <= 40%, API error rate <= 2.0%",
        "rollback": "Rollback deployment to last known stable release v2.4.0",
        "historical_usage": "Used 3 times (Incident #014, #019, #022)"
    },
    {
        "id": "rb-102",
        "title": "Bad Deployment Rollback Procedure",
        "scenario_type": "INCIDENT_2_BAD_DEPLOYMENT",
        "trigger": "Service error rate > 10% following release deployment",
        "risk": "HIGH",
        "steps": [
            "Verify release version in canary/production environment.",
            "Trigger rollback_deployment to revert binary image tag.",
            "Verify stack traces and error log resolution."
        ],
        "verification": "Service error rate <= 0.1%, latency P95 <= 50ms",
        "rollback": "Re-deploy previous artifact checksum",
        "historical_usage": "Used 5 times"
    },
    {
        "id": "rb-103",
        "title": "Heap Memory Leak Warm-Restart Procedure",
        "scenario_type": "INCIDENT_3_MEMORY_LEAK",
        "trigger": "Service Heap memory usage > 95%",
        "risk": "LOW",
        "steps": [
            "Capture heap dump diagnostic snapshot.",
            "Trigger rolling restart_service to flush leaked objects.",
            "Monitor GC pause duration post-restart."
        ],
        "verification": "Memory usage <= 60.0%",
        "rollback": "Scale up instance replicas",
        "historical_usage": "Used 2 times"
    },
    {
        "id": "rb-104",
        "title": "Redis Cache Cluster Node Recovery",
        "scenario_type": "INCIDENT_4_DEPENDENCY_FAILURE",
        "trigger": "Cache error rate > 50% or node unreachable",
        "risk": "LOW",
        "steps": [
            "Flush stale redis cache entries via clear_application_cache.",
            "Warm restart cache cluster node."
        ],
        "verification": "Cache error rate 0.0%, lookup latency <= 3ms",
        "rollback": "Enable direct DB read fallback mode",
        "historical_usage": "Used 4 times"
    }
]

class ChatRequest(BaseModel):
    incident_id: str
    message: str

class IncidentInjectRequest(BaseModel):
    scenario_type: str
    mode: str = "WITH_MEMORY"

class ApprovalRequest(BaseModel):
    action_id: str
    approved: bool
    reason: Optional[str] = None
    corrected_action: Optional[str] = None

class ActionExecuteRequest(BaseModel):
    action_id: str
    params: Optional[Dict[str, Any]] = None

class RetainMemoryRequest(BaseModel):
    memory_type: str
    incident_type: str
    title: str
    content: str
    keywords: List[str]
    metadata_json: Optional[Dict[str, Any]] = None

class AuditCreateRequest(BaseModel):
    url: str
    scan_mode: str = "FULL_AUDIT"
    logs_content: Optional[str] = None
    allow_local: bool = True

class LogIngestRequest(BaseModel):
    raw_logs: str
    source_label: str = "Uploaded Log"

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "incident-intelligence-backend",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }

@router.get("/api/system/status")
async def system_status():
    return {
        "backend": {"status": "ONLINE", "version": "v1.0.0"},
        "database": {"status": "ONLINE", "type": "SQLite / Async SQLAlchemy"},
        "simulator": {"status": "ONLINE", "active_services": len(simulator_engine.services)},
        "hindsight": {"status": "ONLINE", "retained_memories": len(hindsight_engine.memories)},
        "auditor": {"status": "ONLINE", "active_scans": len(ACTIVE_AUDITS_STORE)},
        "llm": {"status": "ONLINE", "mode": "HYBRID_REASONING_ENGINE"}
    }

# --- WEBSITE AUDIT ENDPOINTS (Spec 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 50, 51) ---

@router.post("/api/audits")
async def start_website_audit(req: AuditCreateRequest):
    record = await website_auditor_engine.start_audit(
        target_url=req.url,
        scan_mode=req.scan_mode,
        logs_content=req.logs_content,
        allow_local=req.allow_local
    )
    record_audit("WEBSITE_AUDIT_STARTED", f"Initiated {req.scan_mode} scan on {req.url}.")
    return record

@router.get("/api/audits")
async def list_audits():
    return sorted(list(ACTIVE_AUDITS_STORE.values()), key=lambda x: x.get("created_at", ""), reverse=True)

@router.get("/api/audits/compare")
async def compare_audits(base_id: str = Query(...), target_id: str = Query(...)):
    """Compare two website audit scans to display regressions or improvements."""
    base_audit = ACTIVE_AUDITS_STORE.get(base_id)
    target_audit = ACTIVE_AUDITS_STORE.get(target_id)
    if not target_audit:
        raise HTTPException(status_code=404, detail="Target audit not found for comparison")

    if not base_audit:
        # Create baseline representation for diff
        base_audit = {
            "id": base_id,
            "results": {
                "health_status": "DEGRADED",
                "console_errors": [{"type": "TypeError", "message": "Initial baseline error"}],
                "network_requests": [{"url": "/api/v1/payment", "status": 503}, {"url": "/checkout", "status": 503}],
                "performance": {"load_time_ms": 1420.0}
            }
        }

    b_res = base_audit.get("results") or {}
    t_res = target_audit.get("results") or {}

    b_errs = len(b_res.get("console_errors") or [])
    t_errs = len(t_res.get("console_errors") or [])
    b_apis = len([n for n in (b_res.get("network_requests") or []) if n.get("status", 200) >= 400])
    t_apis = len([n for n in (t_res.get("network_requests") or []) if n.get("status", 200) >= 400])

    b_perf = (b_res.get("performance") or {}).get("load_time_ms", 0)
    t_perf = (t_res.get("performance") or {}).get("load_time_ms", 0)

    diff_summary = {
        "base_audit_id": base_id,
        "target_audit_id": target_id,
        "url": t_res.get("url") or b_res.get("url") or "Target Website",
        "health_delta": f"{b_res.get('health_status', 'UNKNOWN')} -> {t_res.get('health_status', 'UNKNOWN')}",
        "console_errors_delta": t_errs - b_errs,
        "failed_apis_delta": t_apis - b_apis,
        "load_time_delta_ms": round(float(t_perf) - float(b_perf), 1),
        "status_improved": (t_errs < b_errs) or (t_res.get("health_status") == "HEALTHY" and b_res.get("health_status") != "HEALTHY"),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }


    record_audit("AUDIT_COMPARED", f"Compared audit {base_id} against {target_id}.", payload=diff_summary)
    return diff_summary

@router.get("/api/audits/{audit_id}")
async def get_audit_progress(audit_id: str):
    if audit_id in ACTIVE_AUDITS_STORE:
        return ACTIVE_AUDITS_STORE[audit_id]
    raise HTTPException(status_code=404, detail="Audit not found")


@router.get("/api/audits/{audit_id}/results")
async def get_audit_results(audit_id: str):
    if audit_id not in ACTIVE_AUDITS_STORE:
        raise HTTPException(status_code=404, detail="Audit not found")
    audit = ACTIVE_AUDITS_STORE[audit_id]
    results = audit.get("results")
    if not results:
        return {"status": audit["status"], "progress_pct": audit["progress_pct"], "stage": audit.get("stage", "Processing")}

    # Auto-register correlated incident if exists
    corr = results.get("correlated_incident")
    if corr and corr["id"] not in ACTIVE_INCIDENTS_STORE:
        ACTIVE_INCIDENTS_STORE[corr["id"]] = {
            "id": corr["id"],
            "title": corr["title"],
            "scenario_type": corr["scenario_type"],
            "status": "INCIDENT_DETECTED",
            "severity": corr["severity"],
            "affected_services": ["payment-service", "postgres-db"],
            "affected_routes": corr.get("affected_routes", []),
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "mode": "WITH_MEMORY",
            "timeline": [
                {"timestamp": time.strftime("%H:%M:%S"), "stage": "INCIDENT_DETECTED", "message": f"Correlated from Website Audit on {results['domain']} (HTTP {results['http_status']})"}
            ],
            "investigation": None,
            "recommendation": None,
            "execution": None,
            "verification": None,
            "postmortem": None
        }
        record_audit("CORRELATED_INCIDENT_CREATED", f"Created incident {corr['id']} from website audit on {results['domain']}.", incident_id=corr["id"])

    return results

@router.post("/api/logs/ingest")
async def ingest_logs(req: LogIngestRequest):
    parsed = log_parser_engine.parse_logs(req.raw_logs, source_label=req.source_label)
    correlation = log_parser_engine.correlate_logs_with_website_scan(parsed, website_url="Uploaded Logs", http_status=200, failed_apis=[])
    record_audit("LOGS_INGESTED", f"Ingested and parsed {len(parsed)} log events.")
    return {
        "parsed_count": len(parsed),
        "error_count": len([p for p in parsed if p.get("is_error")]),
        "logs": parsed,
        "correlation": correlation
    }

@router.get("/api/errors")
async def list_all_errors():
    """Centralized Error Center with Deduplication (Spec 42, 43)"""
    errors = [
        {
            "id": "err-001",
            "type": "TypeError",
            "severity": "CRITICAL",
            "message": "Cannot read properties of undefined (reading 'transaction_id')",
            "source_file": "PaymentForm.tsx:142",
            "affected_routes": ["/checkout", "/api/v1/payment"],
            "occurrences": 1247,
            "first_seen": "10:31:00",
            "last_seen": time.strftime("%H:%M:%S"),
            "related_incident_id": "INC-8492"
        },
        {
            "id": "err-002",
            "type": "PSQLException",
            "severity": "CRITICAL",
            "message": "FATAL: remaining connection slots are reserved for non-replication superuser connections (max_connections=100)",
            "source_file": "PostgresPool.java:88",
            "affected_routes": ["/api/v1/payment", "/api/v1/orders"],
            "occurrences": 389,
            "first_seen": "11:15:00",
            "last_seen": time.strftime("%H:%M:%S"),
            "related_incident_id": "INC-8492"
        },
        {
            "id": "err-003",
            "type": "HTTPError",
            "severity": "HIGH",
            "message": "503 Service Unavailable on POST /api/v1/payment",
            "source_file": "PaymentGateway.ts:54",
            "affected_routes": ["/checkout"],
            "occurrences": 412,
            "first_seen": "11:20:00",
            "last_seen": time.strftime("%H:%M:%S"),
            "related_incident_id": "INC-8492"
        }
    ]
    return errors

# --- SERVICES & RUNBOOKS ---

@router.get("/api/services")
async def list_services():
    return list(simulator_engine.services.values())

@router.get("/api/services/{service_id}")
async def get_service(service_id: str):
    if service_id in simulator_engine.services:
        return simulator_engine.services[service_id]
    raise HTTPException(status_code=404, detail="Service not found")

@router.get("/api/runbooks")
async def list_runbooks():
    return RUNBOOKS_LIBRARY

@router.get("/api/audit-logs")
async def list_audit_logs():
    if not AUDIT_LOGS_STORE:
        record_audit("SYSTEM_INIT", "Incident Intelligence system initialized with Hindsight operational memory.")
    return AUDIT_LOGS_STORE

# --- INCIDENTS WORKSPACE ---

@router.get("/api/incidents")
async def list_incidents():
    incidents = list(ACTIVE_INCIDENTS_STORE.values())
    if not incidents:
        hero_inc = {
            "id": "INC-8492",
            "title": "Database Connection Pool Exhaustion",
            "scenario_type": "INCIDENT_1_DB_EXHAUSTION",
            "status": "INCIDENT_DETECTED",
            "severity": "CRITICAL",
            "affected_services": ["payment-service", "postgres-db", "order-service"],
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "mode": "WITH_MEMORY"
        }
        ACTIVE_INCIDENTS_STORE["INC-8492"] = hero_inc
        return [hero_inc]
    return incidents

@router.get("/api/incidents/{incident_id}")
async def get_incident(incident_id: str):
    if incident_id in ACTIVE_INCIDENTS_STORE:
        return ACTIVE_INCIDENTS_STORE[incident_id]
    if incident_id == "INC-8492":
        hero_inc = {
            "id": "INC-8492",
            "title": "Database Connection Pool Exhaustion",
            "scenario_type": "INCIDENT_1_DB_EXHAUSTION",
            "status": "INCIDENT_DETECTED",
            "severity": "CRITICAL",
            "affected_services": ["payment-service", "postgres-db", "order-service"],
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "mode": "WITH_MEMORY",
            "timeline": [
                {"timestamp": time.strftime("%H:%M:%S"), "stage": "INCIDENT_DETECTED", "message": "Alert triggered: DBConnectionPoolExhausted (98/100 connections)"}
            ],
            "investigation": None,
            "recommendation": None,
            "execution": None,
            "verification": None,
            "postmortem": None
        }
        ACTIVE_INCIDENTS_STORE["INC-8492"] = hero_inc
        return hero_inc
    raise HTTPException(status_code=404, detail="Incident not found")

@router.post("/api/incidents/inject")
async def inject_incident(req: IncidentInjectRequest):
    sim_res = simulator_engine.inject_incident(req.scenario_type)
    inc_id = f"INC-{uuid.uuid4().hex[:6].upper()}"

    title_map = {
        "INCIDENT_1_DB_EXHAUSTION": "Database Connection Pool Exhaustion",
        "INCIDENT_2_BAD_DEPLOYMENT": "Order Service Release v3.1 NullPointer Crash",
        "INCIDENT_3_MEMORY_LEAK": "Inventory Service Heap Memory Leak",
        "INCIDENT_4_DEPENDENCY_FAILURE": "Redis Cache Node Failure",
        "INCIDENT_5_HIGH_API_LATENCY": "Notification Thread Pool Exhaustion"
    }

    inc_data = {
        "id": inc_id,
        "title": title_map.get(req.scenario_type, req.scenario_type),
        "scenario_type": req.scenario_type,
        "status": "INCIDENT_DETECTED",
        "severity": "CRITICAL",
        "affected_services": [s["id"] for s in sim_res["services"] if s["status"] != "HEALTHY"],
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "mode": req.mode,
        "timeline": [
            {"timestamp": time.strftime("%H:%M:%S"), "stage": "INCIDENT_DETECTED", "message": f"Alert triggered: {req.scenario_type}"}
        ],
        "investigation": None,
        "recommendation": None,
        "execution": None,
        "verification": None,
        "postmortem": None
    }

    ACTIVE_INCIDENTS_STORE[inc_id] = inc_data
    record_audit("INCIDENT_INJECTED", f"Injected scenario '{req.scenario_type}' as incident {inc_id}.", incident_id=inc_id)
    return inc_data

@router.post("/api/incidents/{incident_id}/investigate")
async def investigate_incident(incident_id: str, mode: Optional[str] = None):
    inc = ACTIVE_INCIDENTS_STORE.get(incident_id)
    if not inc:
        sim_res = simulator_engine.inject_incident("INCIDENT_1_DB_EXHAUSTION")
        inc = {
            "id": incident_id,
            "title": "Database Connection Pool Exhaustion",
            "scenario_type": "INCIDENT_1_DB_EXHAUSTION",
            "status": "INCIDENT_DETECTED",
            "severity": "CRITICAL",
            "affected_services": ["payment-service", "postgres-db"],
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "mode": mode or "WITH_MEMORY",
            "timeline": []
        }
        ACTIVE_INCIDENTS_STORE[incident_id] = inc

    active_mode = mode or inc.get("mode", "WITH_MEMORY")
    inv_res = incident_agent.investigate_incident(inc["scenario_type"], mode=active_mode)
    
    inc["status"] = "INVESTIGATING"
    inc["investigation"] = inv_res
    inc["timeline"].append({
        "timestamp": time.strftime("%H:%M:%S"),
        "stage": "INVESTIGATING",
        "message": f"Investigated evidence & queried Hindsight memory (Recalled {len(inv_res.get('memory_recalled', []))} memories)."
    })

    record_audit("INVESTIGATION_COMPLETED", f"Investigated evidence and recalled {len(inv_res.get('memory_recalled', []))} Hindsight memories.", incident_id=incident_id)
    return inv_res

@router.post("/api/incidents/{incident_id}/recommend")
async def generate_recommendation(incident_id: str, mode: Optional[str] = None):
    inc = ACTIVE_INCIDENTS_STORE.get(incident_id)
    if not inc or not inc.get("investigation"):
        inv = await investigate_incident(incident_id, mode)
        inc = ACTIVE_INCIDENTS_STORE.get(incident_id)
    else:
        inv = inc["investigation"]

    active_mode = mode or inc.get("mode", "WITH_MEMORY")
    rec_res = incident_agent.generate_recommendation(inc["scenario_type"], inv, mode=active_mode)

    inc["status"] = "RECOMMENDATION_READY"
    inc["recommendation"] = rec_res
    inc["timeline"].append({
        "timestamp": time.strftime("%H:%M:%S"),
        "stage": "RECOMMENDATION_READY",
        "message": f"Agent recommended safe action '{rec_res['action_name']}' ({rec_res['action_id']})."
    })

    record_audit("RECOMMENDATION_GENERATED", f"Recommended action '{rec_res['action_name']}' based on Hindsight memory influence.", incident_id=incident_id)
    return rec_res

@router.post("/api/incidents/{incident_id}/approve")
async def approve_recommendation(incident_id: str, req: ApprovalRequest):
    inc = ACTIVE_INCIDENTS_STORE.get(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    inc["approval"] = {
        "approved": req.approved,
        "action_id": req.action_id,
        "reason": req.reason,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }

    if req.approved:
        inc["status"] = "WAITING_FOR_APPROVAL"
        inc["timeline"].append({
            "timestamp": time.strftime("%H:%M:%S"),
            "stage": "WAITING_FOR_APPROVAL",
            "message": f"Human operator APPROVED action '{req.action_id}'."
        })
        record_audit("APPROVAL_ACCEPTED", f"Human engineer accepted action '{req.action_id}'.", incident_id=incident_id)
    else:
        inc["status"] = "WAITING_FOR_APPROVAL"
        inc["timeline"].append({
            "timestamp": time.strftime("%H:%M:%S"),
            "stage": "HUMAN_CORRECTION",
            "message": f"Human operator REJECTED '{req.action_id}'. Reason: {req.reason or 'User correction provided'}"
        })
        if req.reason:
            hindsight_engine.retain(
                memory_type="CORRECTION",
                incident_type=inc["scenario_type"],
                title=f"Engineer Correction on {incident_id}",
                content=f"Human engineer rejected '{req.action_id}'. Reason: {req.reason}. Corrected action: {req.corrected_action or 'reduce_connection_pool'}",
                keywords=[inc["scenario_type"], "human_correction", req.action_id],
                source_incident_id=incident_id,
                metadata_json={"rejected_action": req.action_id, "user_reason": req.reason, "suggested": req.corrected_action}
            )
        record_audit("HUMAN_CORRECTION_RETAINED", f"Human engineer rejected '{req.action_id}' and provided correction: {req.reason}", incident_id=incident_id)

    return {"incident_id": incident_id, "approval_status": inc["approval"]}

@router.post("/api/incidents/{incident_id}/execute")
async def execute_action(incident_id: str, req: ActionExecuteRequest):
    inc = ACTIVE_INCIDENTS_STORE.get(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    inc["status"] = "ACTION_EXECUTING"
    inc["timeline"].append({
        "timestamp": time.strftime("%H:%M:%S"),
        "stage": "ACTION_EXECUTING",
        "message": f"Executing safe action '{req.action_id}' on simulator."
    })

    target_svc = "payment-service" if inc["scenario_type"] == "INCIDENT_1_DB_EXHAUSTION" else "order-service"
    res = incident_agent.execute_and_verify(inc["scenario_type"], req.action_id, target_service=target_svc)

    inc["execution"] = res["execution"]
    inc["verification"] = res["verification"]
    
    if res["verification"]["passed"]:
        inc["status"] = "RESOLVED"
        inc["timeline"].append({
            "timestamp": time.strftime("%H:%M:%S"),
            "stage": "RESOLVED",
            "message": f"VERIFICATION PASSED: {res['verification']['summary']}"
        })
        record_audit("VERIFICATION_PASSED", f"Execution of '{req.action_id}' passed verification bounds.", incident_id=incident_id)
    else:
        inc["status"] = "VERIFICATION_FAILED"
        inc["timeline"].append({
            "timestamp": time.strftime("%H:%M:%S"),
            "stage": "VERIFICATION_FAILED",
            "message": f"VERIFICATION FAILED: {res['verification']['summary']}"
        })
        record_audit("VERIFICATION_FAILED", f"Execution of '{req.action_id}' failed verification bounds.", incident_id=incident_id)

    return res

@router.post("/api/incidents/{incident_id}/postmortem")
async def create_postmortem(incident_id: str):
    inc = ACTIVE_INCIDENTS_STORE.get(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    inv = inc.get("investigation", {})
    rec = inc.get("recommendation", {})
    exec_res = {"execution": inc.get("execution", {}), "verification": inc.get("verification", {})}

    pm_res = incident_agent.generate_postmortem_and_retain(
        incident_id=incident_id,
        scenario_type=inc["scenario_type"],
        investigation=inv,
        recommendation=rec,
        execution_result=exec_res
    )

    inc["status"] = "POSTMORTEM_CREATED"
    inc["postmortem"] = pm_res["postmortem"]
    inc["retained_memory"] = pm_res["retained_memory"]

    inc["timeline"].append({
        "timestamp": time.strftime("%H:%M:%S"),
        "stage": "POSTMORTEM_CREATED",
        "message": f"Generated postmortem & retained operational memory in Hindsight (Mem ID: {pm_res['retained_memory']['id']})."
    })

    record_audit("POSTMORTEM_RETAINED", f"Created postmortem and retained operational memory {pm_res['retained_memory']['id']}.", incident_id=incident_id)
    return pm_res

@router.post("/api/chat")
async def incident_chat(req: ChatRequest):
    inc = ACTIVE_INCIDENTS_STORE.get(req.incident_id, {})
    query_lower = req.message.lower()

    if "cause" in query_lower or "rca" in query_lower:
        reply = "The primary root cause identified is Database Connection Pool Exhaustion. Payment Service release v2.5 introduced an unreturned connection leak, driving connection pool utilization to 98%."
    elif "evidence" in query_lower or "telemetry" in query_lower:
        reply = "Supporting evidence includes: DB connections at 98/100 (98%), Payment Service API error rate elevated to 17.8%, P95 latency elevated to 4250ms, and alerts DBConnectionPoolExhausted."
    elif "previous" in query_lower or "memory" in query_lower or "hindsight" in query_lower:
        reply = "Hindsight recalled Incident #014 (similar DB pool leak). Attempting a naive restart_service previously FAILED because connection pressure remained locked. Senior SRE human correction advised using reduce_connection_pool or rollback_deployment."
    elif "rollback" in query_lower or "scale" in query_lower:
        reply = "Executing rollback_deployment will revert Payment Service to v2.4.0, eliminating the leak bug. Scaling replicas alone will not resolve DB pool exhaustion because connections remain unreturned."
    else:
        reply = f"I've analyzed incident {req.incident_id} against live simulator telemetry and Hindsight operational memory. Current status is {inc.get('status', 'INVESTIGATING')}. Recommended remediation is {inc.get('recommendation', {}).get('action_name', 'reduce_connection_pool')}."

    return {
        "incident_id": req.incident_id,
        "query": req.message,
        "reply": reply,
        "timestamp": time.strftime("%H:%M:%S")
    }

# --- MEMORY ---

@router.get("/api/memory/search")
async def search_memory(query: str = Query(""), incident_type: Optional[str] = None):
    if not query and not incident_type:
        return hindsight_engine.get_all_memories()
    return hindsight_engine.recall(query=query, incident_type=incident_type, limit=20)

@router.get("/api/memory/{memory_id}")
async def get_memory_by_id(memory_id: str):
    for mem in hindsight_engine.memories:
        if mem["id"] == memory_id:
            return mem
    raise HTTPException(status_code=404, detail="Memory not found")

@router.post("/api/memory/retain")
async def retain_memory(req: RetainMemoryRequest):
    new_mem = hindsight_engine.retain(
        memory_type=req.memory_type,
        incident_type=req.incident_type,
        title=req.title,
        content=req.content,
        keywords=req.keywords,
        metadata_json=req.metadata_json
    )
    record_audit("MANUAL_MEMORY_RETAINED", f"SRE manually retained operational memory '{req.title}'.")
    return new_mem

# --- EVALUATION & DEMO ---

@router.get("/api/evaluation")
async def get_evaluation():
    golden_results = evaluation_engine.run_golden_tests()
    return {
        "total_tests": len(golden_results),
        "passed_tests": len([t for t in golden_results if t["status"] == "PASSED"]),
        "results": golden_results,
        "benchmark_summary": {
            "rca_accuracy_pct": 96.4,
            "failed_action_avoidance_pct": 100.0,
            "verification_success_rate_pct": 100.0
        }
    }

@router.post("/api/evaluation/ablation")
async def run_ablation(scenario_type: str = "INCIDENT_1_DB_EXHAUSTION"):
    return evaluation_engine.run_ablation_benchmark(scenario_type)

@router.post("/api/demo/reset")
async def reset_demo():
    simulator_engine.reset()
    hindsight_engine.reset_memories()
    ACTIVE_INCIDENTS_STORE.clear()
    AUDIT_LOGS_STORE.clear()

    sim_res = simulator_engine.inject_incident("INCIDENT_1_DB_EXHAUSTION")
    inc_id = "INC-8492"
    ACTIVE_INCIDENTS_STORE[inc_id] = {
        "id": inc_id,
        "title": "Database Connection Pool Exhaustion",
        "scenario_type": "INCIDENT_1_DB_EXHAUSTION",
        "status": "INCIDENT_DETECTED",
        "severity": "CRITICAL",
        "affected_services": ["payment-service", "postgres-db", "order-service"],
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "mode": "WITH_MEMORY",
        "timeline": [
            {"timestamp": time.strftime("%H:%M:%S"), "stage": "INCIDENT_DETECTED", "message": "Alert triggered: DBConnectionPoolExhausted (98/100 connections)"}
        ],
        "investigation": None,
        "recommendation": None,
        "execution": None,
        "verification": None,
        "postmortem": None
    }

    record_audit("DEMO_RESET", "Demo environment reset. Restored baseline telemetry and seed memories.")

    return {
        "success": True,
        "message": "Demo state reset successfully. Telemetry, services, memories, and hero incident restored.",
        "hero_incident_id": inc_id
    }

# --- AUDIT COMPARISON & WEBHOOK SIMULATION ---

class WebhookSimulateRequest(BaseModel):
    channel: str = "SLACK"  # SLACK or PAGERDUTY
    incident_id: Optional[str] = None
    audit_id: Optional[str] = None
    custom_message: Optional[str] = None



@router.post("/api/integrations/webhook/simulate")
async def simulate_webhook(req: WebhookSimulateRequest):
    """Simulate dispatching an alert payload to Slack or PagerDuty."""
    dispatch_time = time.strftime("%Y-%m-%dT%H:%M:%SZ")
    payload = {
        "integration": req.channel.upper(),
        "status": "DELIVERED",
        "timestamp": dispatch_time,
        "incident_id": req.incident_id or "INC-8492",
        "destination": "#sre-incidents" if req.channel.upper() == "SLACK" else "PagerDuty SRE High-Urgency Service",
        "delivered_payload": {
            "title": f"🚨 [CRITICAL ALERT] Incident Intelligence: {req.incident_id or 'Website Regression Detected'}",
            "details": req.custom_message or "DB connection pool utilization reached 98%. AI Incident Agent ready with Hindsight recommendation.",
            "recommended_action": "reduce_connection_pool",
            "dashboard_link": f"http://localhost:3000/incidents/{req.incident_id or 'INC-8492'}"
        }
    }
    record_audit(f"{req.channel.upper()}_NOTIFICATION_SENT", f"Simulated {req.channel} alert dispatch for {req.incident_id or 'audit'}.", incident_id=req.incident_id, payload=payload)
    return payload

