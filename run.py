import uvicorn
import os
import sys

# Configure UTF-8 for console output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

if __name__ == "__main__":
    app_dir = os.path.join(os.path.dirname(__file__), "app")
    sys.path.insert(0, app_dir)
    print("=============================================================")
    print(" [*] BRIDGE -- AI-Powered First Attempt Delivery Success Engine")
    print("=============================================================")
    print(" Serving Dispatcher & Customer Intervention Portal on:")
    print(" -> http://127.0.0.1:8000")
    print(" API Documentation: http://127.0.0.1:8000/docs")
    print("=============================================================\n")
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=False, app_dir=app_dir)
