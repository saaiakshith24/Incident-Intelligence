import re
import json
import time
from typing import List, Dict, Any, Optional

ERROR_KEYWORDS = [
    "ERROR", "FATAL", "CRITICAL", "EXCEPTION", "TIMEOUT", "CONNECTION REFUSED",
    "DATABASE ERROR", "OUT OF MEMORY", "SERVICE UNAVAILABLE", "POOL EXHAUSTED",
    "NULLPOINTEREXCEPTION", "DEADLOCK", "CORS_ERROR", "HTTP 500", "HTTP 502", "HTTP 503"
]

class LogParserEngine:
    def __init__(self):
        pass

    def parse_logs(self, raw_content: str, source_label: str = "Uploaded Log") -> List[Dict[str, Any]]:
        """
        Parse raw log text into structured operational log events.
        Handles JSON lines, standard application logs, Apache/Nginx formats.
        """
        if not raw_content or not raw_content.strip():
            return []

        lines = raw_content.strip().split("\n")
        parsed_entries = []

        for idx, line in enumerate(lines):
            line_str = line.strip()
            if not line_str:
                continue

            entry = self._parse_single_line(line_str, idx, source_label)
            if entry:
                parsed_entries.append(entry)

        return parsed_entries

    def _parse_single_line(self, line: str, line_num: int, source_label: str) -> Optional[Dict[str, Any]]:
        # 1. Try parsing JSON format
        if line.startswith("{") and line.endswith("}"):
            try:
                data = json.loads(line)
                level = data.get("level", data.get("severity", "INFO")).upper()
                msg = data.get("message", data.get("msg", str(data)))
                service = data.get("service", data.get("app", "app-service"))
                ts = data.get("timestamp", data.get("time", time.strftime("%H:%M:%S")))

                return {
                    "id": f"log-{line_num + 1}",
                    "timestamp": ts,
                    "level": level,
                    "service": service,
                    "message": msg,
                    "raw": line,
                    "is_error": level in ["ERROR", "FATAL", "CRITICAL"] or any(k in msg.upper() for k in ERROR_KEYWORDS),
                    "stack_trace": data.get("stack_trace", data.get("stack", None)),
                    "source": source_label
                }
            except json.JSONDecodeError:
                pass

        # 2. Standard Application Log pattern: [timestamp] [level] [service] message
        app_match = re.match(r"^\[?([0-9T:\-\.\sZ]+)\]?\s*\[?([A-Z]+)\]?\s*\[?([a-zA-Z0-9_\-]+)?\]?\s*:?\s*(.*)$", line)
        if app_match:
            ts, level, service, msg = app_match.groups()
            level = level.upper() if level else "INFO"
            service = service or "application"
            msg = msg or line

            return {
                "id": f"log-{line_num + 1}",
                "timestamp": ts,
                "level": level,
                "service": service,
                "message": msg,
                "raw": line,
                "is_error": level in ["ERROR", "FATAL", "CRITICAL"] or any(k in msg.upper() for k in ERROR_KEYWORDS),
                "stack_trace": None,
                "source": source_label
            }

        # 3. Fallback: Generic text line inspection
        is_error = any(k in line.upper() for k in ERROR_KEYWORDS)
        level = "ERROR" if is_error else "INFO"

        return {
            "id": f"log-{line_num + 1}",
            "timestamp": time.strftime("%H:%M:%S"),
            "level": level,
            "service": "system",
            "message": line,
            "raw": line,
            "is_error": is_error,
            "stack_trace": None,
            "source": source_label
        }

    def correlate_logs_with_website_scan(
        self,
        logs: List[Dict[str, Any]],
        website_url: str,
        http_status: int,
        failed_apis: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Correlate frontend browser errors, failed API calls, and backend server logs
        into a unified incident analysis.
        """
        error_logs = [l for l in logs if l.get("is_error")]
        
        # Check if database or connection pool leak is evident
        db_issues = [l for l in error_logs if "database" in l["message"].lower() or "connection" in l["message"].lower() or "pool" in l["message"].lower()]
        oom_issues = [l for l in error_logs if "out of memory" in l["message"].lower() or "heap" in l["message"].lower() or "oom" in l["message"].lower()]
        npe_issues = [l for l in error_logs if "nullpointer" in l["message"].lower() or "uncaught exception" in l["message"].lower()]

        if db_issues or any(api.get("status", 200) == 503 for api in failed_apis):
            primary_hypothesis = "Database connection pool exhaustion or backend transaction bottleneck."
            suggested_scenario = "INCIDENT_1_DB_EXHAUSTION"
            severity = "CRITICAL"
        elif npe_issues or any(api.get("status", 200) == 500 for api in failed_apis):
            primary_hypothesis = "Application release defect or NullPointer exception on backend API handler."
            suggested_scenario = "INCIDENT_2_BAD_DEPLOYMENT"
            severity = "HIGH"
        elif oom_issues:
            primary_hypothesis = "Heap memory leak causing container OOM crashes."
            suggested_scenario = "INCIDENT_3_MEMORY_LEAK"
            severity = "HIGH"
        elif http_status >= 500:
            primary_hypothesis = f"Backend service unavailable or internal error (HTTP {http_status})."
            suggested_scenario = "INCIDENT_4_DEPENDENCY_FAILURE"
            severity = "HIGH"
        else:
            primary_hypothesis = "Normal operational health with isolated client telemetry."
            suggested_scenario = "NONE"
            severity = "LOW"

        return {
            "correlated": len(error_logs) > 0 or len(failed_apis) > 0 or http_status >= 400,
            "severity": severity,
            "suggested_scenario": suggested_scenario,
            "primary_hypothesis": primary_hypothesis,
            "error_logs_count": len(error_logs),
            "failed_apis_count": len(failed_apis),
            "key_log_signals": [l["message"] for l in error_logs[:5]]
        }

log_parser_engine = LogParserEngine()
