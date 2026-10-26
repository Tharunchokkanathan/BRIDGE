import os
import sys

# Ensure project root and src/app are in python path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
APP_DIR = os.path.join(ROOT_DIR, "app")
if APP_DIR not in sys.path:
    sys.path.insert(0, APP_DIR)
SRC_DIR = os.path.join(ROOT_DIR, "src")
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from app.server import app
