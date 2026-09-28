import os
import csv
import time
from openpyxl import load_workbook

XLSX_PATH = "amazon_delivery_ml_features_v1.xlsx"
OUTPUT_DIR = "data"
OUTPUT_CSV = os.path.join(OUTPUT_DIR, "amazon_delivery_ml_features_sample.csv")
TARGET_ROWS = 200000

def extract_sample():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs("models", exist_ok=True)
    
    print(f"Opening {XLSX_PATH} in streaming read-only mode...")
    t0 = time.time()
    wb = load_workbook(XLSX_PATH, read_only=True, data_only=True)
    sheet = wb.active
    
    print(f"Workbook opened in {time.time() - t0:.2f}s. Beginning streaming extraction to {OUTPUT_CSV}...")
    
    row_count = 0
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f_out:
        writer = None
        for row in sheet.iter_rows(values_only=True):
            if writer is None:
                # Header row
                writer = csv.writer(f_out)
                writer.writerow(row)
                continue
            
            writer.writerow(row)
            row_count += 1
            
            if row_count % 25000 == 0:
                elapsed = time.time() - t0
                print(f"Extracted {row_count:,} / {TARGET_ROWS:,} rows ({elapsed:.1f}s)...")
                
            if row_count >= TARGET_ROWS:
                break
                
    wb.close()
    total_time = time.time() - t0
    file_size_mb = os.path.getsize(OUTPUT_CSV) / (1024 * 1024)
    print(f"\n[SUCCESS] Extracted {row_count:,} rows into {OUTPUT_CSV} ({file_size_mb:.2f} MB) in {total_time:.2f}s.")

if __name__ == "__main__":
    extract_sample()
