import uuid
import math
import time
from typing import List, Dict, Any, Optional

# Initial Operational Knowledge Base for Hindsight (Seed Memories)
SEED_MEMORIES = [
    {
        "id": "mem-001",
        "memory_type": "FAILURE",
        "incident_type": "INCIDENT_1_DB_EXHAUSTION",
        "source_incident_id": "INC-014",
        "title": "Restart Payment Service alone FAILED on DB Connection Leak",
        "content": "In Incident #014 (Database connection exhaustion on Payment Service v2.5), restarting Payment Service (restart_service) was attempted. Result: FAILED. Reason: The connection leak in v2.5 immediately saturated the connection pool again within 45 seconds (98% saturation). Restarting alone is INSUFFICIENT.",
        "keywords": ["restart", "payment-service", "failed", "db_connections", "pool_leak", "v2.5"],
        "metadata_json": {
            "attempted_action": "restart_service",
            "result": "FAILED",
            "db_connections_after": 88,
            "human_correction": "Restarting alone did not resolve connection exhaustion because unreturned pooled connections remained locked."
        },
        "created_at": "2026-08-15T14:22:00Z"
    },
    {
        "id": "mem-002",
        "memory_type": "CORRECTION",
        "incident_type": "INCIDENT_1_DB_EXHAUSTION",
        "source_incident_id": "INC-014",
        "title": "Engineer Correction: Use connection pressure reduction or rollback v2.5",
        "content": "Human Engineer Correction on Incident #014: Senior SRE rejected simple restart. Stated: 'When DB connection pool is 98% saturated due to Payment Service release v2.5 leak, we MUST reduce connection pressure (reduce_connection_pool) to terminate zombie connections or rollback deployment (rollback_deployment) to v2.4.'",
        "keywords": ["human_correction", "reduce_connection_pool", "rollback_deployment", "payment-service", "v2.5"],
        "metadata_json": {
            "human_decision": "REJECTED_RESTART",
            "recommended_replacement": "reduce_connection_pool",
            "reasons": "Pool leak requires connection reset or version rollback."
        },
        "created_at": "2026-08-15T14:25:00Z"
    },
    {
        "id": "mem-003",
        "memory_type": "VERIFICATION",
        "incident_type": "INCIDENT_1_DB_EXHAUSTION",
        "source_incident_id": "INC-014",
        "title": "Verification Passed: Connection pool dropped to 28% after Rollback & Recycled Pool",
        "content": "Executing rollback_deployment (to v2.4.0) combined with connection pressure reset successfully restored DB connections from 98/100 to 28/100 and Payment error rate from 17.8% to 0.08%. Verification PASSED.",
        "keywords": ["verification_passed", "rollback_deployment", "28%", "healthy"],
        "metadata_json": {
            "action": "rollback_deployment",
            "verification": "PASSED",
            "db_connections_before": 98,
            "db_connections_after": 28
        },
        "created_at": "2026-08-15T14:30:00Z"
    },
    {
        "id": "mem-004",
        "memory_type": "FAILURE",
        "incident_type": "INCIDENT_2_BAD_DEPLOYMENT",
        "source_incident_id": "INC-009",
        "title": "Cache clear on Order Service bad release FAILED",
        "content": "In Incident #009 (Order Service release v3.1.0 NullPointer crashes), clear_application_cache was attempted. Result: FAILED. Clearing cache does not fix faulty release code.",
        "keywords": ["clear_application_cache", "failed", "order-service", "v3.1.0"],
        "metadata_json": {"attempted_action": "clear_application_cache", "result": "FAILED"},
        "created_at": "2026-07-10T10:15:00Z"
    },
    {
        "id": "mem-005",
        "memory_type": "CORRECTION",
        "incident_type": "INCIDENT_2_BAD_DEPLOYMENT",
        "source_incident_id": "INC-009",
        "title": "Human Correction: Rollback faulty deployment immediately",
        "content": "Engineer Correction: Bad release introducing NullPointerException requires immediate rollback_deployment to v3.0.1.",
        "keywords": ["rollback_deployment", "human_correction", "order-service"],
        "metadata_json": {"suggested_action": "rollback_deployment"},
        "created_at": "2026-07-10T10:20:00Z"
    }
]

class HindsightMemoryEngine:
    def __init__(self):
        self.memories: List[Dict[str, Any]] = []
        self._load_seed_memories()

    def _load_seed_memories(self):
        import copy
        self.memories = copy.deepcopy(SEED_MEMORIES)

    def reset_memories(self):
        """Reset memory store to seed memories."""
        self._load_seed_memories()

    def retain(
        self,
        memory_type: str,
        incident_type: str,
        title: str,
        content: str,
        keywords: List[str],
        source_incident_id: Optional[str] = None,
        metadata_json: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Store durable operational knowledge in Hindsight."""
        memory_id = f"mem-{uuid.uuid4().hex[:8]}"
        new_mem = {
            "id": memory_id,
            "memory_type": memory_type, # INCIDENT, RCA, ACTION, FAILURE, CORRECTION, OUTCOME, VERIFICATION, RUNBOOK, PREVENTION
            "incident_type": incident_type,
            "source_incident_id": source_incident_id,
            "title": title,
            "content": content,
            "keywords": keywords or [],
            "metadata_json": metadata_json or {},
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        self.memories.append(new_mem)
        return new_mem

    def recall(
        self,
        query: str,
        incident_type: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Recall relevant historical operational memories based on semantic keyword scoring,
        incident matching, failure memories, and human corrections.
        """
        scored_memories = []
        query_words = set(query.lower().replace("_", " ").replace("-", " ").split())

        for mem in self.memories:
            score = 0.0
            content_lower = mem["content"].lower()
            title_lower = mem["title"].lower()

            # Direct incident type match
            if incident_type and mem["incident_type"] == incident_type:
                score += 4.0

            # Keyword match
            for kw in mem.get("keywords", []):
                if kw.lower() in query_words or kw.lower() in query.lower():
                    score += 2.5

            # Content & title overlap
            for qw in query_words:
                if len(qw) > 2:
                    if qw in content_lower:
                        score += 1.0
                    if qw in title_lower:
                        score += 1.5

            # Boost high-value operational memories (failures & corrections)
            if mem["memory_type"] in ["FAILURE", "CORRECTION"]:
                score += 2.0

            if score > 0.5:
                scored_memories.append({
                    "memory": mem,
                    "relevance_score": min(round(score / 10.0, 2), 0.99),
                    "memory_type": mem["memory_type"]
                })

        # Sort by relevance score descending
        scored_memories.sort(key=lambda x: x["relevance_score"], reverse=True)
        return scored_memories[:limit]

    def search_failures(self, query: str) -> List[Dict[str, Any]]:
        """Recall explicitly failed past actions."""
        results = self.recall(query, limit=10)
        return [r for r in results if r["memory_type"] == "FAILURE"]

    def search_corrections(self, query: str) -> List[Dict[str, Any]]:
        """Recall explicitly recorded human engineer corrections."""
        results = self.recall(query, limit=10)
        return [r for r in results if r["memory_type"] == "CORRECTION"]

    def get_all_memories(self) -> List[Dict[str, Any]]:
        return sorted(self.memories, key=lambda x: x["created_at"], reverse=True)

# Global Hindsight Engine Instance
hindsight_engine = HindsightMemoryEngine()
