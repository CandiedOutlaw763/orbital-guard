import requests
import time
from database import SessionLocal, MasterCatalog

def sync_catalog():
    groups = [
        'starlink', 'oneweb', 'iridium-NEXT', 'stations', 'gps', 'glonass', 
        'galileo', 'beidou', 'weather', 'noaa', 'goes', 'science', 'cubesat',
        'radar', 'amateur', 'iridium-33-debris', 'cosmos-2251-debris', '1999-025'
    ]
    
    db = SessionLocal()
    
    print("Clearing old catalog to enforce LEO-only rule...")
    db.query(MasterCatalog).delete()
    db.commit()
    
    objects_added = 0
    batch_size = 1000
    batch = []
    
    headers = {
        'User-Agent': 'OrbitalGuard/1.2 (siddh@example.com)'
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
                    # Line 2, columns 53-63 is Mean Motion (revolutions per day)
                    mean_motion = float(line2[52:63].strip())
                    
                    # LEO satellites complete > 11.25 revolutions per day (altitude < 2000 km)
                    if mean_motion < 11.25:
                        continue
                        
                    norad_id = int(line1[2:7])
                    
                    # Upsert logic (simple query, could be slow but it's okay for ~10k)
                    existing = db.query(MasterCatalog).filter(MasterCatalog.norad_id == norad_id).first()
                    if existing:
                        existing.tle_line1 = line1
                        existing.tle_line2 = line2
                    else:
                        db.add(MasterCatalog(
                            norad_id=norad_id,
                            name=name,
                            tle_line1=line1,
                            tle_line2=line2
                        ))
                    objects_added += 1
                except Exception as e:
                    pass
        
        db.commit()
        # Sleep to avoid rate limiting
        time.sleep(3)
        
    db.close()
    print(f"Successfully processed {objects_added} objects into the Master Catalog.")

if __name__ == "__main__":
    sync_catalog()
