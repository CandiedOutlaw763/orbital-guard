import requests
import time
from database import SessionLocal, MasterCatalog

def sync_catalog():
    groups = ['active', 'iridium-33-debris', 'cosmos-2251-debris']
    
    db = SessionLocal()
    print("Clearing old catalog...")
    db.query(MasterCatalog).delete()
    db.commit()
    
    objects_added = 0
    batch_size = 1000
    batch = []
    
    # Track unique NORAD IDs so we don't insert duplicates if groups overlap
    seen_ids = set()
    
    headers = {
        'User-Agent': 'OrbitalGuard/1.0 (siddh@example.com)'
    }
    
    for group in groups:
        print(f"Fetching {group} from Celestrak...")
        resp = requests.get(f"https://celestrak.org/NORAD/elements/gp.php?GROUP={group}&FORMAT=tle", headers=headers)
        
        if resp.status_code != 200:
            print(f"Failed to fetch {group}. Status: {resp.status_code}")
            time.sleep(3)
            continue
            
        lines = resp.text.strip().split('\n')
        
        print(f"Parsing {group}...")
        for i in range(0, len(lines), 3):
            if i + 2 < len(lines):
                name = lines[i].strip()
                line1 = lines[i+1].strip()
                line2 = lines[i+2].strip()
                try:
                    norad_id = int(line1[2:7])
                    
                    if norad_id in seen_ids:
                        continue
                        
                    seen_ids.add(norad_id)
                    batch.append(MasterCatalog(
                        norad_id=norad_id,
                        name=name,
                        tle_line1=line1,
                        tle_line2=line2
                    ))
                    objects_added += 1
                    
                    if len(batch) >= batch_size:
                        db.bulk_save_objects(batch)
                        db.commit()
                        batch = []
                except Exception as e:
                    pass
            
        # Sleep to avoid rate limiting
        time.sleep(3)
                    
    if batch:
        db.bulk_save_objects(batch)
        db.commit()
        
    db.close()
    print(f"Successfully synced {objects_added} objects into the Master Catalog.")

if __name__ == "__main__":
    sync_catalog()
