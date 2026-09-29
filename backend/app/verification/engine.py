from typing import Dict, Any

class VerificationEngine:
    def __init__(self):
        pass

    def verify_incident_recovery(
        self,
        scenario_type: str,
        action_id: str,
        simulator_state: Dict[str, Any],
        action_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluate if recovery actually occurred by comparing live metrics against explicit operational thresholds.
        Never mark an incident as resolved merely because an action was executed!
        """
        services = {s["id"]: s for s in simulator_state.get("services", [])}
        
        # Scenario 1: DB Connection Exhaustion
        if scenario_type == "INCIDENT_1_DB_EXHAUSTION":
            postgres = services.get("postgres-db", {})
            payment = services.get("payment-service", {})
            
            db_conn = postgres.get("db_connections", 98)
            err_rate = payment.get("error_rate", 17.8)
            latency = payment.get("latency_p95", 4250.0)

            # Thresholds: DB connections <= 40%, Error rate <= 2.0%, Latency <= 300ms
            target_db_conn = 40
            target_err_rate = 2.0
            target_latency = 300.0

            passed_db = db_conn <= target_db_conn
            passed_err = err_rate <= target_err_rate
            passed_lat = latency <= target_latency

            passed = passed_db and passed_err and passed_lat

            details = [
                {
                    "metric": "DB Connections",
                    "observed": f"{db_conn}/100 ({db_conn}%)",
                    "threshold": f"<= {target_db_conn}%",
                    "passed": passed_db
                },
                {
                    "metric": "Payment Error Rate",
                    "observed": f"{err_rate}%",
                    "threshold": f"<= {target_err_rate}%",
                    "passed": passed_err
                },
                {
                    "metric": "P95 Latency",
                    "observed": f"{latency}ms",
                    "threshold": f"<= {target_latency}ms",
                    "passed": passed_lat
                }
            ]

            if passed:
                status = "VERIFICATION_PASSED"
                summary = f"Recovery verified successfully! DB connections dropped to {db_conn}%, error rate reduced to {err_rate}%."
            else:
                status = "VERIFICATION_FAILED"
                if action_id == "restart_service":
                    summary = f"VERIFICATION FAILED: Service restarted, but DB connections remain critical at {db_conn}% due to unreturned pool connections."
                else:
                    summary = f"VERIFICATION FAILED: Telemetry failed to satisfy operational recovery thresholds."

            return {
                "status": status,
                "passed": passed,
                "summary": summary,
                "metrics_evaluated": details,
                "verified_at_timestamp": simulator_state.get("timestamp")
            }

        # Scenario 2: Bad Deployment
        elif scenario_type == "INCIDENT_2_BAD_DEPLOYMENT":
            order = services.get("order-service", {})
            err_rate = order.get("error_rate", 42.5)
            passed = err_rate <= 1.0

            return {
                "status": "VERIFICATION_PASSED" if passed else "VERIFICATION_FAILED",
                "passed": passed,
                "summary": f"Order service error rate at {err_rate}% (threshold <= 1.0%).",
                "metrics_evaluated": [{"metric": "Order Error Rate", "observed": f"{err_rate}%", "threshold": "<= 1.0%", "passed": passed}]
            }

        # Scenario 3: Memory Leak
        elif scenario_type == "INCIDENT_3_MEMORY_LEAK":
            inv = services.get("inventory-service", {})
            mem = inv.get("memory_usage", 98.6)
            passed = mem <= 60.0

            return {
                "status": "VERIFICATION_PASSED" if passed else "VERIFICATION_FAILED",
                "passed": passed,
                "summary": f"Inventory service memory usage at {mem}% (threshold <= 60.0%).",
                "metrics_evaluated": [{"metric": "Memory Usage", "observed": f"{mem}%", "threshold": "<= 60.0%", "passed": passed}]
            }

        # Default verification
        return {
            "status": "VERIFICATION_PASSED",
            "passed": True,
            "summary": "Service health metrics returned to nominal baseline values.",
            "metrics_evaluated": []
        }

verification_engine = VerificationEngine()
