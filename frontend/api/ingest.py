import requests
from datetime import datetime, timezone
from database import SessionLocal, TrackedObject

def fetch_data():
    print("Fetching SATCAT data for active satellites...")
    
    groups = ['stations', 'iridium-33-debris', 'cosmos-2251-debris', 'visual']
    
    unique_objects = {}
    
    for group in groups:
        print(f"Fetching TLEs for {group}...")
        resp = requests.get(f"https://celestrak.org/NORAD/elements/gp.php?GROUP={group}&FORMAT=tle")
        if resp.status_code == 200:
            lines = resp.text.strip().split('\n')
            for i in range(0, len(lines), 3):
                if i + 2 < len(lines):
                    name = lines[i].strip()
                    line1 = lines[i+1].strip()
                    line2 = lines[i+2].strip()
                    norad_id = int(line1[2:7])
                    unique_objects[norad_id] = {
                        'name': name,
                        'line1': line1,
                        'line2': line2
                    }
        else:
            print(f"Failed to fetch {group}")
            
    print(f"Total unique objects fetched: {len(unique_objects)}")
    
    db = SessionLocal()
    
    for norad_id, data in unique_objects.items():
        obj = db.query(TrackedObject).filter(TrackedObject.norad_id == norad_id).first()
        if not obj:
            obj = TrackedObject(norad_id=norad_id)
            db.add(obj)
            
        obj.name = data['name']
        obj.tle_line1 = data['line1']
        obj.tle_line2 = data['line2']
        # Epoch can be parsed from line 1
        # E.g., 1 25544U 98067A   20230.12345678 ...
        # But for now, we don't strictly need it in DB if skyfield parses it from line1
        # Let's just set a dummy epoch or omit it
        obj.object_type = 'UNKNOWN'
        obj.rcs_size = 'UNKNOWN'
            
    db.commit()
    db.close()
    print("Database updated.")

if __name__ == "__main__":
    fetch_data()
