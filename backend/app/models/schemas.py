from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database.db import Base

# SQLAlchemy Models

class DBService(Base):
    __tablename__ = "services"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False) # api_gateway, microservice, cache, database
    status = Column(String, default="HEALTHY") # HEALTHY, DEGRADED, CRITICAL
    version = Column(String, default="v1.0.0")
    cpu_usage = Column(Float, default=15.0)
    memory_usage = Column(Float, default=30.0)
    request_rate = Column(Float, default=100.0)
    error_rate = Column(Float, default=0.1)
    latency_p95 = Column(Float, default=45.0)
    db_connections = Column(Integer, default=10)
    connection_pool_usage = Column(Float, default=10.0)
    dependencies = Column(JSON, default=list) # List of service IDs
    updated_at = Column(DateTime, default=datetime.utcnow)

class DBIncident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    scenario_type = Column(String, nullable=False)
    status = Column(String, default="INCIDENT_DETECTED")
    severity = Column(String, default="HIGH") # LOW, MEDIUM, HIGH, CRITICAL
    affected_services = Column(JSON, default=list)
    root_cause = Column(Text, nullable=True)
    rca_confidence = Column(Float, default=0.0)
    evidence = Column(JSON, default=dict)
    recommended_action = Column(JSON, nullable=True)
    execution_status = Column(String, default="IDLE")
    verification_status = Column(String, default="UNVERIFIED")
    mode = Column(String, default="WITH_MEMORY") # WITH_MEMORY vs WITHOUT_MEMORY
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

class DBIncidentEvent(Base):
    __tablename__ = "incident_events"

    id = Column(String, primary_key=True)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=False)
    event_type = Column(String, nullable=False) # DETECTED, RECALL, RCA, APPROVAL, EXECUTED, VERIFIED, RETAINED
    stage = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    details = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=datetime.utcnow)

class DBHumanCorrection(Base):
    __tablename__ = "human_corrections"

    id = Column(String, primary_key=True)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=False)
    original_action = Column(String, nullable=False)
    user_decision = Column(String, nullable=False) # APPROVED, REJECTED, CORRECTED
    rejection_reason = Column(Text, nullable=True)
    suggested_action = Column(String, nullable=True)
    correction_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class DBPostmortem(Base):
    __tablename__ = "postmortems"

    id = Column(String, primary_key=True)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=False)
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=False)
    impact = Column(Text, nullable=False)
    root_cause = Column(Text, nullable=False)
    actions_attempted = Column(JSON, default=list)
    failed_actions = Column(JSON, default=list)
    human_corrections = Column(JSON, default=list)
    successful_action = Column(String, nullable=False)
    verification_result = Column(JSON, default=dict)
    lessons_learned = Column(Text, nullable=False)
    hindsight_memory_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class DBHindsightMemory(Base):
    __tablename__ = "hindsight_memories"

    id = Column(String, primary_key=True)
    memory_type = Column(String, nullable=False) # INCIDENT, RCA, ACTION, FAILURE, CORRECTION, OUTCOME, VERIFICATION, RUNBOOK, PREVENTION
    incident_type = Column(String, nullable=False)
    source_incident_id = Column(String, nullable=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    metadata_json = Column(JSON, default=dict)
    keywords = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

class DBEvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    scenario_type = Column(String, nullable=False)
    with_memory = Column(Boolean, default=True)
    detection_time_ms = Column(Float, default=0.0)
    rca_accuracy = Column(Float, default=0.0)
    failed_action_avoided = Column(Boolean, default=False)
    first_pass_resolution = Column(Boolean, default=False)
    total_actions_taken = Column(Integer, default=1)
    verification_passed = Column(Boolean, default=False)
    details = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

class DBAuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True)
    incident_id = Column(String, nullable=True)
    action_type = Column(String, nullable=False)
    actor = Column(String, default="AGENT") # AGENT, HUMAN_OPERATOR, SYSTEM
    summary = Column(Text, nullable=False)
    payload = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=datetime.utcnow)


# Pydantic Schemas

class ServiceSchema(BaseModel):
    id: str
    name: str
    type: str
    status: str
    version: str
    cpu_usage: float
    memory_usage: float
    request_rate: float
    error_rate: float
    latency_p95: float
    db_connections: int
    connection_pool_usage: float
    dependencies: List[str]
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class IncidentInjectRequest(BaseModel):
    scenario_type: str = Field(..., example="INCIDENT_1_DB_EXHAUSTION")
    mode: str = Field("WITH_MEMORY", example="WITH_MEMORY") # WITH_MEMORY or WITHOUT_MEMORY

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

class MemoryQueryRequest(BaseModel):
    query: str
    incident_type: Optional[str] = None
    limit: int = 5
