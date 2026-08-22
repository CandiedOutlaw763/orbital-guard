from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import SessionLocal, TrackedObject, Conjunction
from datetime import datetime, timezone
import math
import os

app = FastAPI(title="Satellite Conjunction Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from skyfield.api import EarthSatellite, load, wgs84
# Use /tmp on Vercel (read-only filesystem outside /tmp)
load.directory = '/tmp' if not os.name == 'nt' else load.directory
ts = load.timescale()

@app.get("/api/objects")
def get_objects():
    db = SessionLocal()
    objects = db.query(TrackedObject).all()
    
    t = ts.now()
    res = []
    for obj in objects:
        if not obj.tle_line1 or not obj.tle_line2:
            continue
        try:
            sat = EarthSatellite(obj.tle_line1, obj.tle_line2, obj.name, ts)
            geocentric = sat.at(t)
            subpoint = wgs84.subpoint(geocentric)
            
            res.append({
                "norad_id": obj.norad_id,
                "name": obj.name,
                "type": obj.object_type,
                "size": obj.rcs_size,
                "lat": subpoint.latitude.degrees,
                "lng": subpoint.longitude.degrees,
                "alt": subpoint.elevation.km,
                "tle1": obj.tle_line1,
                "tle2": obj.tle_line2
            })
        except Exception:
            pass
    db.close()
    return res

@app.get("/api/conjunctions")
def get_conjunctions():
    db = SessionLocal()
    conjunctions = db.query(Conjunction).order_by(Conjunction.risk_score.desc()).all()
    
    res = []
    for c in conjunctions:
        obj1 = db.query(TrackedObject).filter(TrackedObject.norad_id == c.object1_id).first()
        obj2 = db.query(TrackedObject).filter(TrackedObject.norad_id == c.object2_id).first()
        
        res.append({
            "id": c.id,
            "object1": {"norad_id": obj1.norad_id, "name": obj1.name} if obj1 else None,
            "object2": {"norad_id": obj2.norad_id, "name": obj2.name} if obj2 else None,
            "tca_time": c.tca_time.isoformat() + "Z" if c.tca_time else None,
            "miss_distance_km": c.miss_distance_km,
            "relative_velocity_km_s": c.relative_velocity_km_s,
            "risk_score": c.risk_score
        })
    db.close()
    return res

from propagation import detect_conjunctions
from database import MasterCatalog
from sqlalchemy import or_
import random

@app.post("/api/catalog/sync")
def sync_catalog(db: Session = Depends(get_db)):
    import requests
    groups = ['stations', 'weather', 'iridium-33-debris', 'cosmos-2251-debris']
    headers = {'User-Agent': 'OrbitalGuard/1.2'}
    
    # Fast delete
    db.query(MasterCatalog).delete()
    db.commit()
    
    added = 0
    for group in groups:
        resp = requests.get(f"https://celestrak.org/NORAD/elements/gp.php?GROUP={group}&FORMAT=tle", headers=headers)
        if resp.status_code != 200: continue
        
        lines = resp.text.strip().split('\n')
        batch = []
        for i in range(0, len(lines), 3):
            if i + 2 < len(lines):
                name = lines[i].strip()
                line1 = lines[i+1].strip()
                line2 = lines[i+2].strip()
                try:
                    mean_motion = float(line2[52:63].strip())
                    if mean_motion < 11.25: continue
                    norad_id = int(line1[2:7])
                    batch.append(MasterCatalog(norad_id=norad_id, name=name, tle_line1=line1, tle_line2=line2))
                    added += 1
                except: pass
        # Fast bulk insert
        if batch:
            db.bulk_save_objects(batch)
            db.commit()
            
    return {"status": "success", "objects_synced": added}

@app.get("/api/catalog/search")
def search_catalog(q: str):
    db = SessionLocal()
    # If purely numeric, search by ID
    if q.isdigit():
        results = db.query(MasterCatalog).filter(MasterCatalog.norad_id == int(q)).limit(10).all()
    else:
        results = db.query(MasterCatalog).filter(MasterCatalog.name.ilike(f"%{q}%")).limit(10).all()
    
    res = [{"norad_id": r.norad_id, "name": r.name} for r in results]
    db.close()
    return res

@app.post("/api/objects/add")
def add_object(norad_id: int):
    db = SessionLocal()
    
    # Check if already tracked
    existing = db.query(TrackedObject).filter(TrackedObject.norad_id == norad_id).first()
    if existing:
        db.close()
        return {"status": "already tracked"}
        
    master_obj = db.query(MasterCatalog).filter(MasterCatalog.norad_id == norad_id).first()
    if not master_obj:
        db.close()
        return {"error": "not found in master catalog"}, 404
        
    new_obj = TrackedObject(
        norad_id=master_obj.norad_id,
        name=master_obj.name,
        tle_line1=master_obj.tle_line1,
        tle_line2=master_obj.tle_line2,
        object_type='UNKNOWN',
        rcs_size='UNKNOWN'
    )
    db.add(new_obj)
    db.commit()
    db.close()
    
    # Run focused conjunction detection
    detect_conjunctions(new_norad_id=norad_id)
    return {"status": "success"}

@app.post("/api/objects/random")
def add_random():
    db = SessionLocal()
    
    # Clear current
    db.query(TrackedObject).delete()
    db.query(Conjunction).delete()
    
    # Get all IDs from master
    all_ids = [r[0] for r in db.query(MasterCatalog.norad_id).all()]
    random_ids = random.sample(all_ids, min(20, len(all_ids)))
    
    master_objs = db.query(MasterCatalog).filter(MasterCatalog.norad_id.in_(random_ids)).all()
    
    for m in master_objs:
        db.add(TrackedObject(
            norad_id=m.norad_id,
            name=m.name,
            tle_line1=m.tle_line1,
            tle_line2=m.tle_line2,
            object_type='UNKNOWN',
            rcs_size='UNKNOWN'
        ))
        
    db.commit()
    db.close()
    
    detect_conjunctions()
    return {"status": "success"}

@app.post("/api/objects/clear")
def clear_objects():
    db = SessionLocal()
    db.query(TrackedObject).delete()
    db.query(Conjunction).delete()
    db.commit()
    db.close()
    return {"status": "success"}

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
