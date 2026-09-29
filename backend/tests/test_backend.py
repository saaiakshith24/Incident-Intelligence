import pytest
import asyncio
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.simulator.engine import simulator_engine
from backend.app.memory.hindsight_engine import hindsight_engine
from backend.app.agents.incident_agent import incident_agent
from backend.app.verification.engine import verification_engine
from backend.app.evaluation.engine import evaluation_engine
from backend.app.auditor.validator import validate_and_sanitize_url

client = TestClient(app)

def test_health_and_status():
    res1 = client.get("/health")
    assert res1.status_code == 200
    assert res1.json()["status"] == "healthy"

    res2 = client.get("/api/system/status")
    assert res2.status_code == 200
    data = res2.json()
    assert data["backend"]["status"] == "ONLINE"
    assert data["simulator"]["status"] == "ONLINE"
    assert data["hindsight"]["status"] == "ONLINE"

def test_url_validation_and_ssrf_protection():
    # Test valid URL
    valid, url, err = validate_and_sanitize_url("example.com")
    assert valid is True
    assert url.startswith("https://")

    # Test SSRF blocked cloud metadata IP
    valid_meta, _, err_meta = validate_and_sanitize_url("http://169.254.169.254/latest/meta-data")
    assert valid_meta is False
    assert "SSRF Protection" in err_meta

    # Test SSRF blocked internal 10.x IP
    valid_priv, _, err_priv = validate_and_sanitize_url("http://10.0.0.1/admin")
    assert valid_priv is False

def test_website_audit_endpoints():
    res = client.post("/api/audits", json={
        "url": "http://localhost:3000",
        "scan_mode": "FULL_AUDIT",
        "allow_local": True
    })
    assert res.status_code == 200
    audit = res.json()
    assert "id" in audit
    audit_id = audit["id"]

    # Poll audit status
    prog_res = client.get(f"/api/audits/{audit_id}")
    assert prog_res.status_code == 200
    assert prog_res.json()["id"] == audit_id

    # List audits
    list_res = client.get("/api/audits")
    assert list_res.status_code == 200
    assert len(list_res.json()) > 0

def test_log_ingest_and_correlation():
    raw_sample = """
    {"timestamp": "12:00:00", "level": "ERROR", "service": "payment-service", "message": "FATAL: connection pool exhausted (98/100 handles)"}
    {"timestamp": "12:00:01", "level": "WARN", "service": "payment-service", "message": "PaymentTransactionWorker leak detected in v2.5.0"}
    """
    res = client.post("/api/logs/ingest", json={"raw_logs": raw_sample, "source_label": "Docker Stdout"})
    assert res.status_code == 200
    data = res.json()
    assert data["parsed_count"] == 2
    assert data["error_count"] >= 1
    assert data["correlation"]["suggested_scenario"] == "INCIDENT_1_DB_EXHAUSTION"

def test_error_center_endpoint():
    res = client.get("/api/errors")
    assert res.status_code == 200
    errors = res.json()
    assert len(errors) >= 3
    assert any(e["type"] == "TypeError" for e in errors)
    assert any(e["occurrences"] > 100 for e in errors)

def test_services_endpoint():
    res = client.get("/api/services")
    assert res.status_code == 200
    services = res.json()
    assert len(services) == 8
    svc_ids = [s["id"] for s in services]
    assert "payment-service" in svc_ids
    assert "postgres-db" in svc_ids
    assert "api-gateway" in svc_ids

    res_single = client.get("/api/services/payment-service")
    assert res_single.status_code == 200
    assert res_single.json()["id"] == "payment-service"

def test_runbooks_endpoint():
    res = client.get("/api/runbooks")
    assert res.status_code == 200
    runbooks = res.json()
    assert len(runbooks) >= 4
    titles = [r["title"] for r in runbooks]
    assert any("Database Connection" in t for t in titles)

def test_audit_logs_endpoint():
    res = client.get("/api/audit-logs")
    assert res.status_code == 200
    logs = res.json()
    assert isinstance(logs, list)

def test_incident_injection_and_investigation():
    simulator_engine.reset()
    res = client.post("/api/incidents/inject", json={"scenario_type": "INCIDENT_1_DB_EXHAUSTION", "mode": "WITH_MEMORY"})
    assert res.status_code == 200
    inc = res.json()
    inc_id = inc["id"]
    assert inc["scenario_type"] == "INCIDENT_1_DB_EXHAUSTION"

    inv_res = client.post(f"/api/incidents/{inc_id}/investigate?mode=WITH_MEMORY")
    assert inv_res.status_code == 200
    inv = inv_res.json()
    assert len(inv["failed_action_memories"]) > 0
    assert len(inv["human_correction_memories"]) > 0

def test_recommendation_with_hindsight_influence():
    simulator_engine.reset()
    inc_res = client.post("/api/incidents/inject", json={"scenario_type": "INCIDENT_1_DB_EXHAUSTION", "mode": "WITH_MEMORY"}).json()
    inc_id = inc_res["id"]
    client.post(f"/api/incidents/{inc_id}/investigate?mode=WITH_MEMORY")
    
    rec_res = client.post(f"/api/incidents/{inc_id}/recommend?mode=WITH_MEMORY")
    assert rec_res.status_code == 200
    rec = rec_res.json()

    # WITH_MEMORY must avoid naive restart_service and choose reduce_connection_pool!
    assert rec["action_id"] == "reduce_connection_pool"
    assert rec["hindsight_influence"]["is_influenced"] is True

def test_recommendation_without_hindsight_influence():
    simulator_engine.reset()
    inc_res = client.post("/api/incidents/inject", json={"scenario_type": "INCIDENT_1_DB_EXHAUSTION", "mode": "WITHOUT_MEMORY"}).json()
    inc_id = inc_res["id"]
    client.post(f"/api/incidents/{inc_id}/investigate?mode=WITHOUT_MEMORY")
    
    rec_res = client.post(f"/api/incidents/{inc_id}/recommend?mode=WITHOUT_MEMORY")
    assert rec_res.status_code == 200
    rec = rec_res.json()

    # WITHOUT_MEMORY chooses naive restart_service
    assert rec["action_id"] == "restart_service"
    assert rec["hindsight_influence"]["is_influenced"] is False

def test_human_rejection_and_correction_retained():
    simulator_engine.reset()
    inc_res = client.post("/api/incidents/inject", json={"scenario_type": "INCIDENT_1_DB_EXHAUSTION", "mode": "WITH_MEMORY"}).json()
    inc_id = inc_res["id"]

    # Reject recommendation and provide human correction
    appr_res = client.post(f"/api/incidents/{inc_id}/approve", json={
        "action_id": "restart_service",
        "approved": False,
        "reason": "Restarting alone previously failed because connection pool remained locked.",
        "corrected_action": "reduce_connection_pool"
    })
    assert appr_res.status_code == 200
    assert appr_res.json()["approval_status"]["approved"] is False

    # Check that correction is searchable in Hindsight
    mem_res = client.get("/api/memory/search?query=human_correction")
    assert mem_res.status_code == 200
    mems = mem_res.json()
    assert len(mems) > 0

def test_execution_and_verification():
    simulator_engine.reset()
    inc_res = client.post("/api/incidents/inject", json={"scenario_type": "INCIDENT_1_DB_EXHAUSTION", "mode": "WITH_MEMORY"}).json()
    inc_id = inc_res["id"]

    # Executing reduce_connection_pool must pass verification!
    exec_res = client.post(f"/api/incidents/{inc_id}/execute", json={"action_id": "reduce_connection_pool"})
    assert exec_res.status_code == 200
    data = exec_res.json()
    assert data["verification"]["passed"] is True
    assert data["verification"]["status"] == "VERIFICATION_PASSED"

def test_postmortem_generation_and_retain():
    simulator_engine.reset()
    inc_res = client.post("/api/incidents/inject", json={"scenario_type": "INCIDENT_1_DB_EXHAUSTION", "mode": "WITH_MEMORY"}).json()
    inc_id = inc_res["id"]
    client.post(f"/api/incidents/{inc_id}/investigate?mode=WITH_MEMORY")
    client.post(f"/api/incidents/{inc_id}/recommend?mode=WITH_MEMORY")
    client.post(f"/api/incidents/{inc_id}/execute", json={"action_id": "reduce_connection_pool"})

    pm_res = client.post(f"/api/incidents/{inc_id}/postmortem")
    assert pm_res.status_code == 200
    data = pm_res.json()
    assert "postmortem" in data
    assert "retained_memory" in data
    assert data["retained_memory"]["id"].startswith("mem-")

def test_incident_chat():
    chat_res = client.post("/api/chat", json={
        "incident_id": "INC-8492",
        "message": "What caused this incident and why do you think the database is responsible?"
    })
    assert chat_res.status_code == 200
    data = chat_res.json()
    assert "reply" in data
    assert len(data["reply"]) > 10

def test_ablation_benchmark():
    ab_res = client.post("/api/evaluation/ablation", params={"scenario_type": "INCIDENT_1_DB_EXHAUSTION"})
    assert ab_res.status_code == 200
    ab = ab_res.json()
    assert ab["without_memory"]["recommended_action"] == "restart_service"
    assert ab["without_memory"]["verification_passed"] is False
    assert ab["with_memory"]["recommended_action"] == "reduce_connection_pool"
    assert ab["with_memory"]["verification_passed"] is True

def test_demo_reset():
    res = client.post("/api/demo/reset")
    assert res.status_code == 200
    assert res.json()["success"] is True

def test_compare_audits_endpoint():
    audit_res = client.post("/api/audits", json={
        "url": "http://localhost:3000",
        "scan_mode": "FULL_AUDIT",
        "allow_local": True
    })
    target_id = audit_res.json()["id"]

    res = client.get(f"/api/audits/compare?base_id=aud-baseline-001&target_id={target_id}")
    assert res.status_code == 200
    data = res.json()
    assert "console_errors_delta" in data
    assert "failed_apis_delta" in data
    assert "status_improved" in data


def test_simulate_webhook_endpoint():
    slack_res = client.post("/api/integrations/webhook/simulate", json={"channel": "SLACK", "incident_id": "INC-8492"})
    assert slack_res.status_code == 200
    assert slack_res.json()["status"] == "DELIVERED"
    assert slack_res.json()["integration"] == "SLACK"

    pd_res = client.post("/api/integrations/webhook/simulate", json={"channel": "PAGERDUTY", "incident_id": "INC-8492"})
    assert pd_res.status_code == 200
    assert pd_res.json()["status"] == "DELIVERED"
    assert pd_res.json()["integration"] == "PAGERDUTY"

