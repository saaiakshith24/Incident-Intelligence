import random
import time
from typing import Dict, List, Any

INITIAL_SERVICES = {
    "api-gateway": {
        "id": "api-gateway",
        "name": "API Gateway",
        "type": "api_gateway",
        "status": "HEALTHY",
        "version": "v2.1.0",
        "cpu_usage": 18.5,
        "memory_usage": 32.0,
        "request_rate": 1450.0,
        "error_rate": 0.05,
        "latency_p95": 24.0,
        "db_connections": 0,
        "connection_pool_usage": 0.0,
        "dependencies": ["user-service", "order-service", "payment-service"]
    },
    "user-service": {
        "id": "user-service",
        "name": "User Service",
        "type": "microservice",
        "status": "HEALTHY",
        "version": "v1.8.4",
        "cpu_usage": 22.0,
        "memory_usage": 45.0,
        "request_rate": 620.0,
        "error_rate": 0.02,
        "latency_p95": 18.0,
        "db_connections": 15,
        "connection_pool_usage": 15.0,
        "dependencies": ["redis-cache", "postgres-db"]
    },
    "order-service": {
        "id": "order-service",
        "name": "Order Service",
        "type": "microservice",
        "status": "HEALTHY",
        "version": "v3.0.1",
        "cpu_usage": 31.0,
        "memory_usage": 52.0,
        "request_rate": 480.0,
        "error_rate": 0.08,
        "latency_p95": 35.0,
        "db_connections": 25,
        "connection_pool_usage": 25.0,
        "dependencies": ["inventory-service", "postgres-db"]
    },
    "payment-service": {
        "id": "payment-service",
        "name": "Payment Service",
        "type": "microservice",
        "status": "HEALTHY",
        "version": "v2.4.0",
        "cpu_usage": 28.0,
        "memory_usage": 48.0,
        "request_rate": 350.0,
        "error_rate": 0.04,
        "latency_p95": 42.0,
        "db_connections": 20,
        "connection_pool_usage": 20.0,
        "dependencies": ["notification-service", "postgres-db"]
    },
    "inventory-service": {
        "id": "inventory-service",
        "name": "Inventory Service",
        "type": "microservice",
        "status": "HEALTHY",
        "version": "v1.5.2",
        "cpu_usage": 19.0,
        "memory_usage": 41.0,
        "request_rate": 290.0,
        "error_rate": 0.01,
        "latency_p95": 15.0,
        "db_connections": 12,
        "connection_pool_usage": 12.0,
        "dependencies": ["redis-cache", "postgres-db"]
    },
    "notification-service": {
        "id": "notification-service",
        "name": "Notification Service",
        "type": "microservice",
        "status": "HEALTHY",
        "version": "v1.2.0",
        "cpu_usage": 14.0,
        "memory_usage": 29.0,
        "request_rate": 180.0,
        "error_rate": 0.01,
        "latency_p95": 22.0,
        "db_connections": 5,
        "connection_pool_usage": 5.0,
        "dependencies": []
    },
    "redis-cache": {
        "id": "redis-cache",
        "name": "Redis Cache Cluster",
        "type": "cache",
        "status": "HEALTHY",
        "version": "7.2",
        "cpu_usage": 12.0,
        "memory_usage": 38.0,
        "request_rate": 2100.0,
        "error_rate": 0.00,
        "latency_p95": 2.5,
        "db_connections": 0,
        "connection_pool_usage": 0.0,
        "dependencies": []
    },
    "postgres-db": {
        "id": "postgres-db",
        "name": "Primary PostgreSQL Cluster",
        "type": "database",
        "status": "HEALTHY",
        "version": "16.1",
        "cpu_usage": 34.0,
        "memory_usage": 58.0,
        "request_rate": 1850.0,
        "error_rate": 0.00,
        "latency_p95": 8.0,
        "db_connections": 32,
        "connection_pool_usage": 32.0,
        "dependencies": []
    }
}

class SimulatorEngine:
    def __init__(self):
        self.services: Dict[str, Dict[str, Any]] = {}
        self.active_scenario: str = None
        self.scenario_start_time: float = 0
        self.logs: List[Dict[str, Any]] = []
        self.alerts: List[Dict[str, Any]] = []
        self.reset()

    def reset(self):
        """Reset simulator back to baseline healthy state."""
        import copy
        self.services = copy.deepcopy(INITIAL_SERVICES)
        self.active_scenario = None
        self.scenario_start_time = 0
        self.logs = [
            {"timestamp": time.strftime("%H:%M:%S"), "service": "api-gateway", "level": "INFO", "message": "API Gateway operating normally at 1450 req/s"},
            {"timestamp": time.strftime("%H:%M:%S"), "service": "postgres-db", "level": "INFO", "message": "DB Pool usage stable at 32/100 connections"}
        ]
        self.alerts = []

    def inject_incident(self, scenario_type: str) -> Dict[str, Any]:
        """Inject a scenario into the microservice environment."""
        self.active_scenario = scenario_type
        self.scenario_start_time = time.time()
        now_str = time.strftime("%H:%M:%S")

        if scenario_type == "INCIDENT_1_DB_EXHAUSTION":
            # Database connection pool exhaustion caused by Payment Service v2.5 leak
            self.services["payment-service"]["version"] = "v2.5.0"
            self.services["payment-service"]["status"] = "CRITICAL"
            self.services["payment-service"]["error_rate"] = 17.8
            self.services["payment-service"]["latency_p95"] = 4250.0
            self.services["payment-service"]["db_connections"] = 98
            self.services["payment-service"]["connection_pool_usage"] = 98.0
            self.services["payment-service"]["cpu_usage"] = 89.2

            self.services["postgres-db"]["status"] = "CRITICAL"
            self.services["postgres-db"]["db_connections"] = 98
            self.services["postgres-db"]["connection_pool_usage"] = 98.0
            self.services["postgres-db"]["cpu_usage"] = 94.5

            self.services["order-service"]["status"] = "DEGRADED"
            self.services["order-service"]["error_rate"] = 8.4
            self.services["order-service"]["latency_p95"] = 1850.0

            self.logs = [
                {"timestamp": now_str, "service": "payment-service", "level": "ERROR", "message": "FATAL: org.postgresql.util.PSQLException: Timeout waiting for connection from pool (acquired=98/100)"},
                {"timestamp": now_str, "service": "payment-service", "level": "WARN", "message": "Connection leak detected in PaymentTransactionWorker (active_unreturned_connections=66)"},
                {"timestamp": now_str, "service": "postgres-db", "level": "ERROR", "message": "FATAL: remaining connection slots are reserved for non-replication superuser connections (max_connections=100)"},
                {"timestamp": now_str, "service": "order-service", "level": "WARN", "message": "Order processing delayed waiting for payment verification connection pool response"}
            ]

            self.alerts = [
                {"id": "alt-101", "service": "postgres-db", "severity": "CRITICAL", "name": "DBConnectionPoolExhausted", "message": "Primary DB connection pool at 98% capacity (98/100 connections)"},
                {"id": "alt-102", "service": "payment-service", "severity": "CRITICAL", "name": "ServiceHighErrorRate", "message": "Payment Service error rate spike to 17.8%"},
                {"id": "alt-103", "service": "api-gateway", "severity": "HIGH", "name": "P95LatencyDegraded", "message": "Payment API endpoint P95 latency elevated to 4250ms"}
            ]

        elif scenario_type == "INCIDENT_2_BAD_DEPLOYMENT":
            self.services["order-service"]["version"] = "v3.1.0-buggy"
            self.services["order-service"]["status"] = "CRITICAL"
            self.services["order-service"]["error_rate"] = 42.5
            self.services["order-service"]["latency_p95"] = 2800.0

            self.logs = [
                {"timestamp": now_str, "service": "order-service", "level": "ERROR", "message": "NullPointerException at OrderValidator.java:142 after v3.1.0 deployment"},
                {"timestamp": now_str, "service": "order-service", "level": "ERROR", "message": "Failed to serialize JSON payload for order checkout response"}
            ]

            self.alerts = [
                {"id": "alt-201", "service": "order-service", "severity": "CRITICAL", "name": "DeploymentErrorSpike", "message": "Order Service error rate 42.5% following release v3.1.0"}
            ]

        elif scenario_type == "INCIDENT_3_MEMORY_LEAK":
            self.services["inventory-service"]["status"] = "CRITICAL"
            self.services["inventory-service"]["memory_usage"] = 98.6
            self.services["inventory-service"]["error_rate"] = 12.0
            self.services["inventory-service"]["latency_p95"] = 3900.0

            self.logs = [
                {"timestamp": now_str, "service": "inventory-service", "level": "ERROR", "message": "java.lang.OutOfMemoryError: Java heap space during inventory cache sync"},
                {"timestamp": now_str, "service": "inventory-service", "level": "WARN", "message": "Garbage Collection pause duration exceeded 4200ms"}
            ]

            self.alerts = [
                {"id": "alt-301", "service": "inventory-service", "severity": "CRITICAL", "name": "MemoryUsageCritical", "message": "Inventory Service memory at 98.6% - OOM imminent"}
            ]

        elif scenario_type == "INCIDENT_4_DEPENDENCY_FAILURE":
            self.services["redis-cache"]["status"] = "CRITICAL"
            self.services["redis-cache"]["error_rate"] = 99.0
            self.services["user-service"]["status"] = "DEGRADED"
            self.services["user-service"]["latency_p95"] = 1950.0

            self.logs = [
                {"timestamp": now_str, "service": "redis-cache", "level": "ERROR", "message": "Node 172.18.0.4 unreachable - Cluster health FAIL"},
                {"timestamp": now_str, "service": "user-service", "level": "WARN", "message": "Redis connection timeout - falling back to direct DB read"}
            ]

            self.alerts = [
                {"id": "alt-401", "service": "redis-cache", "severity": "CRITICAL", "name": "CacheNodeDown", "message": "Redis cluster down - cascading to DB fallback"}
            ]

        elif scenario_type == "INCIDENT_5_HIGH_API_LATENCY":
            self.services["notification-service"]["status"] = "CRITICAL"
            self.services["notification-service"]["latency_p95"] = 8500.0
            self.services["api-gateway"]["status"] = "DEGRADED"

            self.logs = [
                {"timestamp": now_str, "service": "notification-service", "level": "ERROR", "message": "Worker thread pool exhausted (max=200, queued=1450)"}
            ]

            self.alerts = [
                {"id": "alt-501", "service": "notification-service", "severity": "HIGH", "name": "ThreadPoolStarvation", "message": "Notification Service queue backlogged"}
            ]

        return {
            "scenario": scenario_type,
            "status": "INJECTED",
            "services": list(self.services.values()),
            "alerts": self.alerts,
            "logs": self.logs
        }

    def execute_action(self, action_id: str, target_service: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute a safe allowlisted action against the simulator state."""
        params = params or {}
        now_str = time.strftime("%H:%M:%S")

        # Capture before state
        before_metrics = {
            "db_connections": self.services.get("postgres-db", {}).get("db_connections", 0),
            "payment_error_rate": self.services.get("payment-service", {}).get("error_rate", 0),
            "payment_latency": self.services.get("payment-service", {}).get("latency_p95", 0),
            "payment_status": self.services.get("payment-service", {}).get("status", "UNKNOWN"),
            "payment_version": self.services.get("payment-service", {}).get("version", "v1.0")
        }

        # Action: RESTART SERVICE
        if action_id == "restart_service":
            # If scenario is DB_EXHAUSTION with v2.5 leak, restarting service gives momentary relief but connections quickly rise back up!
            if self.active_scenario == "INCIDENT_1_DB_EXHAUSTION" and self.services["payment-service"]["version"] == "v2.5.0":
                # Simulated initial drop then quick re-saturation
                self.services["payment-service"]["status"] = "DEGRADED"
                self.services["payment-service"]["error_rate"] = 12.4
                self.services["payment-service"]["db_connections"] = 88 # Still high!
                self.services["payment-service"]["connection_pool_usage"] = 88.0
                self.services["postgres-db"]["db_connections"] = 88
                self.services["postgres-db"]["connection_pool_usage"] = 88.0

                self.logs.append({
                    "timestamp": now_str,
                    "service": target_service or "payment-service",
                    "level": "WARN",
                    "message": "Service restarted successfully, but DB connection pool re-saturated to 88% due to active v2.5 pool leak bug!"
                })
                
                return {
                    "action_id": action_id,
                    "success": True,
                    "effect_summary": "Service process restarted, but DB pool remains saturated at 88% due to connection leak.",
                    "before_metrics": before_metrics,
                    "after_metrics": {
                        "db_connections": 88,
                        "payment_error_rate": 12.4,
                        "payment_latency": 2100.0,
                        "payment_status": "DEGRADED",
                        "payment_version": "v2.5.0"
                    }
                }
            else:
                # Normal restart behavior
                svc = target_service or "payment-service"
                if svc in self.services:
                    self.services[svc]["status"] = "HEALTHY"
                    self.services[svc]["error_rate"] = 0.05
                    self.services[svc]["cpu_usage"] = 20.0
                    self.services[svc]["memory_usage"] = 35.0
                    self.services[svc]["latency_p95"] = 30.0

                return {
                    "action_id": action_id,
                    "success": True,
                    "effect_summary": f"Restarted service {svc}. Telemetry restored to normal.",
                    "before_metrics": before_metrics,
                    "after_metrics": {
                        "db_connections": 25,
                        "payment_error_rate": 0.05,
                        "payment_latency": 30.0,
                        "payment_status": "HEALTHY",
                        "payment_version": self.services[svc]["version"]
                    }
                }

        # Action: ROLLBACK DEPLOYMENT
        elif action_id == "rollback_deployment":
            svc = target_service or "payment-service"
            if svc == "payment-service":
                self.services["payment-service"]["version"] = "v2.4.0"
                self.services["payment-service"]["status"] = "HEALTHY"
                self.services["payment-service"]["error_rate"] = 0.08
                self.services["payment-service"]["latency_p95"] = 45.0
                self.services["payment-service"]["db_connections"] = 20
                self.services["payment-service"]["connection_pool_usage"] = 20.0
                
                self.services["postgres-db"]["status"] = "HEALTHY"
                self.services["postgres-db"]["db_connections"] = 28
                self.services["postgres-db"]["connection_pool_usage"] = 28.0

                self.services["order-service"]["status"] = "HEALTHY"
                self.services["order-service"]["error_rate"] = 0.08
                self.services["order-service"]["latency_p95"] = 35.0

            elif svc == "order-service":
                self.services["order-service"]["version"] = "v3.0.1"
                self.services["order-service"]["status"] = "HEALTHY"
                self.services["order-service"]["error_rate"] = 0.05

            self.logs.append({
                "timestamp": now_str,
                "service": svc,
                "level": "INFO",
                "message": f"Deployment rolled back to previous stable release. Bug eliminated. DB pool usage dropped to 28%."
            })
            self.alerts = []

            return {
                "action_id": action_id,
                "success": True,
                "effect_summary": f"Rolled back {svc} deployment. DB connections dropped from 98 to 28. Error rate resolved to 0.08%.",
                "before_metrics": before_metrics,
                "after_metrics": {
                    "db_connections": 28,
                    "payment_error_rate": 0.08,
                    "payment_latency": 45.0,
                    "payment_status": "HEALTHY",
                    "payment_version": self.services[svc]["version"]
                }
            }

        # Action: REDUCE CONNECTION POOL / RECYCLE WORKERS
        elif action_id == "reduce_connection_pool":
            self.services["payment-service"]["db_connections"] = 25
            self.services["payment-service"]["connection_pool_usage"] = 25.0
            self.services["payment-service"]["status"] = "HEALTHY"
            self.services["payment-service"]["error_rate"] = 0.15
            self.services["payment-service"]["latency_p95"] = 65.0
            
            self.services["postgres-db"]["status"] = "HEALTHY"
            self.services["postgres-db"]["db_connections"] = 32
            self.services["postgres-db"]["connection_pool_usage"] = 32.0

            self.logs.append({
                "timestamp": now_str,
                "service": "postgres-db",
                "level": "INFO",
                "message": "Connection pressure reduced. Leaked connections terminated and pool limits dynamically recapped."
            })
            self.alerts = []

            return {
                "action_id": action_id,
                "success": True,
                "effect_summary": "Recycled orphaned DB connections and capped connection pressure. DB connections dropped from 98 to 32.",
                "before_metrics": before_metrics,
                "after_metrics": {
                    "db_connections": 32,
                    "payment_error_rate": 0.15,
                    "payment_latency": 65.0,
                    "payment_status": "HEALTHY",
                    "payment_version": self.services["payment-service"]["version"]
                }
            }

        # Action: SCALE SERVICE
        elif action_id == "scale_service":
            svc = target_service or "notification-service"
            if svc in self.services:
                self.services[svc]["status"] = "HEALTHY"
                self.services[svc]["latency_p95"] = 40.0
                self.services[svc]["cpu_usage"] = 25.0

            return {
                "action_id": action_id,
                "success": True,
                "effect_summary": f"Scaled replicas for {svc}. Workload queue cleared.",
                "before_metrics": before_metrics,
                "after_metrics": {
                    "db_connections": self.services["postgres-db"]["db_connections"],
                    "payment_error_rate": 0.05,
                    "payment_latency": 40.0,
                    "payment_status": "HEALTHY",
                    "payment_version": "scaled"
                }
            }

        # Action: CLEAR APPLICATION CACHE
        elif action_id == "clear_application_cache":
            self.services["redis-cache"]["status"] = "HEALTHY"
            self.services["redis-cache"]["error_rate"] = 0.0
            self.services["user-service"]["status"] = "HEALTHY"
            self.services["user-service"]["latency_p95"] = 18.0

            return {
                "action_id": action_id,
                "success": True,
                "effect_summary": "Purged application cache and warm-restarted Redis node.",
                "before_metrics": before_metrics,
                "after_metrics": {
                    "db_connections": 25,
                    "payment_error_rate": 0.0,
                    "payment_latency": 18.0,
                    "payment_status": "HEALTHY",
                    "payment_version": "cached"
                }
            }

        # Default fallback action
        return {
            "action_id": action_id,
            "success": True,
            "effect_summary": f"Executed action {action_id} on {target_service}.",
            "before_metrics": before_metrics,
            "after_metrics": before_metrics
        }

# Global simulator instance
simulator_engine = SimulatorEngine()
