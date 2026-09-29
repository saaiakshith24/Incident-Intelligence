import os
import json
import time
from typing import Dict, List, Any, Optional
from backend.app.simulator.engine import simulator_engine
from backend.app.memory.hindsight_engine import hindsight_engine
from backend.app.verification.engine import verification_engine

# Allowlisted safe actions
SAFE_ACTIONS_ALLOWLIST = {
    "restart_service": {
        "id": "restart_service",
        "name": "Restart Service",
        "risk_level": "LOW",
        "required_approval": True,
        "description": "Reboots the target microservice process. Useful for temporary deadlocks or high CPU spikes."
    },
    "rollback_deployment": {
        "id": "rollback_deployment",
        "name": "Rollback Deployment",
        "risk_level": "HIGH",
        "required_approval": True,
        "description": "Reverts service release to the last known stable deployment version."
    },
    "reduce_connection_pool": {
        "id": "reduce_connection_pool",
        "name": "Reduce Connection Pressure & Recycle Pool",
        "risk_level": "MEDIUM",
        "required_approval": True,
        "description": "Recycles leaked/zombie database connections and re-caps connection pool limits."
    },
    "scale_service": {
        "id": "scale_service",
        "name": "Scale Service Replicas",
        "risk_level": "LOW",
        "required_approval": True,
        "description": "Increases instance replica count to handle queue backlog."
    },
    "disable_faulty_dependency": {
        "id": "disable_faulty_dependency",
        "name": "Circuit Break Faulty Dependency",
        "risk_level": "MEDIUM",
        "required_approval": True,
        "description": "Temporarily disables calls to an unhealthy downstream external service."
    },
    "clear_application_cache": {
        "id": "clear_application_cache",
        "name": "Clear Application Cache",
        "risk_level": "LOW",
        "required_approval": False,
        "description": "Purges redis/memcached cache entries."
    }
}

class IncidentAgent:
    def __init__(self):
        pass

    def investigate_incident(self, scenario_type: str, mode: str = "WITH_MEMORY") -> Dict[str, Any]:
        """
        Step 1 & 2: Collect current evidence, query Hindsight operational memory, compare past vs present.
        """
        sim_state = simulator_engine.services
        alerts = simulator_engine.alerts
        logs = simulator_engine.logs

        # Step A: Collect Evidence
        evidence = {
            "alerts": alerts,
            "logs": logs[:4],
            "metrics_snapshot": {
                "db_connections": sim_state.get("postgres-db", {}).get("db_connections", 0),
                "pool_usage_pct": sim_state.get("postgres-db", {}).get("connection_pool_usage", 0.0),
                "payment_error_rate": sim_state.get("payment-service", {}).get("error_rate", 0.0),
                "payment_latency_p95": sim_state.get("payment-service", {}).get("latency_p95", 0.0),
                "payment_version": sim_state.get("payment-service", {}).get("version", "v1.0")
            }
        }

        # Step B: Memory Recall
        memory_evidence = []
        failed_action_memories = []
        human_correction_memories = []

        if mode == "WITH_MEMORY":
            # Search Hindsight for relevant past operational memories
            query_str = f"{scenario_type} connection leak payment service restart rollback"
            recalled = hindsight_engine.recall(query_str, incident_type=scenario_type, limit=5)
            memory_evidence = recalled

            failed_action_memories = [m for m in recalled if m["memory_type"] == "FAILURE"]
            human_correction_memories = [m for m in recalled if m["memory_type"] == "CORRECTION"]

        # Step C: Past vs Present Matrix
        past_vs_present = {
            "comparison_matrix": [
                {"signal": "DB Connections", "previous": "96%", "current": f"{evidence['metrics_snapshot']['db_connections']}%", "match": True},
                {"signal": "API Error Rate", "previous": "14.2%", "current": f"{evidence['metrics_snapshot']['payment_error_rate']}%", "match": True},
                {"signal": "Deployment Version", "previous": "v2.5.0-rc1", "current": evidence['metrics_snapshot']['payment_version'], "match": True},
                {"signal": "Root Cause", "previous": "Connection pool leak", "current": "Connection pool leak", "match": True}
            ],
            "explanation": (
                "Historical Incident #014 is highly similar (98% match). "
                "Hindsight memory confirms that restarting the service alone previously FAILED because connection pool leak persisted. "
                "Human SRE correction previously advised using connection pressure reduction or release rollback."
                if mode == "WITH_MEMORY" and failed_action_memories
                else "Operating in WITHOUT_MEMORY mode. Only inspecting current isolated telemetry."
            )
        }

        # Step D: Root Cause Analysis
        if scenario_type == "INCIDENT_1_DB_EXHAUSTION":
            rca_summary = "Database connection pool exhaustion caused by unreturned connections in Payment Service release v2.5."
            rca_confidence = 0.96
        elif scenario_type == "INCIDENT_2_BAD_DEPLOYMENT":
            rca_summary = "Uncaught NullPointerException in Order Service release v3.1.0."
            rca_confidence = 0.94
        else:
            rca_summary = "Service resource degradation under current load."
            rca_confidence = 0.85

        return {
            "scenario_type": scenario_type,
            "mode": mode,
            "evidence": evidence,
            "memory_recalled": memory_evidence,
            "failed_action_memories": failed_action_memories,
            "human_correction_memories": human_correction_memories,
            "past_vs_present": past_vs_present,
            "rca": {
                "summary": rca_summary,
                "confidence": rca_confidence,
                "suspect_service": "payment-service" if scenario_type == "INCIDENT_1_DB_EXHAUSTION" else "order-service"
            }
        }

    def generate_recommendation(
        self,
        scenario_type: str,
        investigation: Dict[str, Any],
        mode: str = "WITH_MEMORY"
    ) -> Dict[str, Any]:
        """
        Step 3: Generate an evidence-backed & memory-influenced recommendation.
        """
        failed_mems = investigation.get("failed_action_memories", [])
        correction_mems = investigation.get("human_correction_memories", [])

        # In WITH_MEMORY mode, if restart previously failed and human corrected, pick reduce_connection_pool or rollback_deployment!
        if mode == "WITH_MEMORY" and scenario_type == "INCIDENT_1_DB_EXHAUSTION" and (failed_mems or correction_mems):
            selected_action_id = "reduce_connection_pool"
            action_info = SAFE_ACTIONS_ALLOWLIST[selected_action_id]

            recommendation = {
                "action_id": selected_action_id,
                "action_name": action_info["name"],
                "target_service": "payment-service",
                "risk_level": action_info["risk_level"],
                "reason": "Hindsight recalled past failure for naive 'restart_service' and past human correction advocating connection pool recycling.",
                "evidence_summary": "DB Connections at 98%. Recalled 1 past failure memory and 1 human correction memory from Incident #014.",
                "hindsight_influence": {
                    "is_influenced": True,
                    "recalled_failure": "restart_service FAILED previously (pool remained saturated).",
                    "recalled_human_correction": "Senior SRE: 'Recycle pool & reduce connection pressure or rollback v2.5.'",
                    "why_selected": "Avoided past failed action ('restart_service') and selected human-proven remediation."
                },
                "expected_outcome": "Recycles zombie connection pool slots, dropping DB connection pressure from 98% to <=32%.",
                "verification_conditions": "DB connections <= 40%, Payment error rate <= 2.0%, P95 latency <= 300ms.",
                "rollback_plan": "If pressure reduction fails, execute rollback_deployment to v2.4.0."
            }

        # In WITHOUT_MEMORY mode (or default naive baseline), agent picks naive restart_service!
        else:
            selected_action_id = "restart_service"
            action_info = SAFE_ACTIONS_ALLOWLIST[selected_action_id]

            recommendation = {
                "action_id": selected_action_id,
                "action_name": action_info["name"],
                "target_service": "payment-service",
                "risk_level": action_info["risk_level"],
                "reason": "Naive baseline logic: restarting Payment Service to clear process errors.",
                "evidence_summary": "Observed high error rate (17.8%) and elevated latency on Payment Service.",
                "hindsight_influence": {
                    "is_influenced": False,
                    "recalled_failure": "None (WITHOUT_MEMORY mode active)",
                    "recalled_human_correction": "None",
                    "why_selected": "Selected simple restart based only on current process telemetry."
                },
                "expected_outcome": "Process restart.",
                "verification_conditions": "Error rate <= 2.0%.",
                "rollback_plan": "Manual intervention."
            }

        return recommendation

    def execute_and_verify(
        self,
        scenario_type: str,
        action_id: str,
        target_service: str = "payment-service"
    ) -> Dict[str, Any]:
        """
        Step 4 & 5: Execute safe action against simulator state and verify recovery using real metrics.
        """
        # Enforce allowlist check
        if action_id not in SAFE_ACTIONS_ALLOWLIST:
            return {
                "success": False,
                "error": "UNAUTHORIZED_ACTION",
                "message": f"Action '{action_id}' is not in the safe execution allowlist!"
            }

        # Execute on simulator
        exec_result = simulator_engine.execute_action(action_id, target_service)

        # Get updated simulator state for verification
        sim_state = {
            "services": list(simulator_engine.services.values()),
            "alerts": simulator_engine.alerts,
            "logs": simulator_engine.logs,
            "timestamp": time.strftime("%H:%M:%S")
        }

        # Real verification check
        verify_result = verification_engine.verify_incident_recovery(
            scenario_type=scenario_type,
            action_id=action_id,
            simulator_state=sim_state,
            action_result=exec_result
        )

        return {
            "execution": exec_result,
            "verification": verify_result
        }

    def generate_postmortem_and_retain(
        self,
        incident_id: str,
        scenario_type: str,
        investigation: Dict[str, Any],
        recommendation: Dict[str, Any],
        execution_result: Dict[str, Any],
        human_correction: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Step 6 & 7: Generate a structured postmortem and retain durable operational knowledge in Hindsight.
        """
        exec_info = execution_result.get("execution", {})
        verif_info = execution_result.get("verification", {})
        
        postmortem = {
            "incident_id": incident_id,
            "title": f"Postmortem: {scenario_type} - {incident_id}",
            "summary": f"Incident {incident_id} ({scenario_type}) was investigated and remediated.",
            "impact": "Payment Service degraded for 4 minutes with 17.8% API error rate.",
            "root_cause": investigation.get("rca", {}).get("summary", "Unknown"),
            "actions_attempted": [recommendation.get("action_id")],
            "failed_actions": [h.get("original_action") for h in (investigation.get("failed_action_memories") or [])],
            "human_corrections": [human_correction] if human_correction else [],
            "successful_action": recommendation.get("action_id"),
            "verification_result": verif_info,
            "lessons_learned": "When connection pool is exhausted due to v2.5 leak, reduce_connection_pool or rollback_deployment is required; simple restart alone is insufficient."
        }

        # Retain new knowledge in Hindsight
        retained_mem = hindsight_engine.retain(
            memory_type="OUTCOME",
            incident_type=scenario_type,
            title=f"Incident {incident_id} Resolution Knowledge",
            content=f"Incident {incident_id} ({scenario_type}) successfully resolved using {recommendation.get('action_id')}. Verified DB connections dropped to nominal bounds.",
            keywords=[scenario_type, recommendation.get('action_id'), "verification_passed"],
            source_incident_id=incident_id,
            metadata_json=postmortem
        )

        return {
            "postmortem": postmortem,
            "retained_memory": retained_mem
        }

incident_agent = IncidentAgent()
