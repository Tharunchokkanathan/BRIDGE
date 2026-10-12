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
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    print(f" Serving Dispatcher & Customer Intervention Portal on:")
    print(f" -> http://{host}:{port}")
    print(f" API Documentation: http://{host}:{port}/docs")
    print("=============================================================\n")
    uvicorn.run("server:app", host=host, port=port, reload=False, app_dir=app_dir)
