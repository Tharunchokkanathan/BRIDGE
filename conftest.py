"""
Pytest Configuration & Test Fixture Isolation for BRIDGE
Ensures automated test execution runs against an isolated temporary SQLite database,
preventing any mutation or dirtiness of the tracked repository database (data/bridge_local.db).
"""

import os
import shutil
import tempfile
import pytest

# Create an isolated temporary directory for test databases before test collection
TEMP_TEST_DIR = tempfile.mkdtemp(prefix="bridge_test_")
TEMP_DB_PATH = os.path.join(TEMP_TEST_DIR, "isolated_test_bridge.db")

# Force BRIDGE_DB_PATH environment variable for the duration of the test run
os.environ["BRIDGE_DB_PATH"] = TEMP_DB_PATH


@pytest.fixture(scope="session", autouse=True)
def isolated_test_database():
    """
    Session fixture confirming isolated test database path is active
    and cleaning up temporary test artifacts upon test session exit.
    """
    yield TEMP_DB_PATH
    
    # Teardown: remove temporary test directory
    if os.path.exists(TEMP_TEST_DIR):
        try:
            shutil.rmtree(TEMP_TEST_DIR, ignore_errors=True)
        except OSError:
            pass
