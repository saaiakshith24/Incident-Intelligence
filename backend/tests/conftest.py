import sys
import os

# Add project root to PYTHONPATH so that imports like `from backend.app.main import app` work when tests are run from the backend directory.
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.append(project_root)
