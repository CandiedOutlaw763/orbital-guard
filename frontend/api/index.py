import os
import sys
import traceback

# Add api directory to Python path so Vercel can find sibling modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set Skyfield directory to /tmp BEFORE any imports
if os.name != 'nt':
    os.environ['SKYFIELD_DATA_DIR'] = '/tmp'

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Satellite Conjunction Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Try importing everything and capture errors
startup_errors = []

try:
    from database import SessionLocal, TrackedObject, Conjunction, MasterCatalog
except Exception as e:
    startup_errors.append(f"database import: {traceback.format_exc()}")

try:
    from skyfield.api import EarthSatellite, load, wgs84
    if os.name != 'nt':
        load.directory = '/tmp'
    ts = load.timescale(builtin=True)
except Exception as e:
    startup_errors.append(f"skyfield import: {traceback.format_exc()}")
    ts = None

@app.get("/api/health")
def health_check():
    return {
        "status": "error" if startup_errors else "ok",
        "errors": startup_errors,
        "python_version": os.sys.version,
        "env_vars": list(k for k in os.environ.keys() if 'POSTGRES' in k or 'DATABASE' in k)
    }

@app.get("/api/objects")
def get_objects():
    if startup_errors:
        return {"error": startup_errors}
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
    if startup_errors:
        return []
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

@app.post("/api/catalog/sync")
def sync_catalog():
    if startup_errors:
        return {"error": startup_errors}
    import requests
    db = SessionLocal()
    groups = ['stations', 'weather', 'iridium-33-debris', 'cosmos-2251-debris']
    headers = {'User-Agent': 'OrbitalGuard/1.2'}
    
    db.query(MasterCatalog).delete()
    db.commit()
    
    added = 0
    for group in groups:
        try:
            resp = requests.get(f"https://celestrak.org/NORAD/elements/gp.php?GROUP={group}&FORMAT=tle", headers=headers, timeout=15)
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
            if batch:
                db.bulk_save_objects(batch)
                db.commit()
        except Exception:
            pass
    
    db.close()
    return {"status": "success", "objects_synced": added}

@app.get("/api/catalog/search")
def search_catalog(q: str):
    if startup_errors:
        return []
    db = SessionLocal()
    if q.isdigit():
        results = db.query(MasterCatalog).filter(MasterCatalog.norad_id == int(q)).limit(10).all()
    else:
        results = db.query(MasterCatalog).filter(MasterCatalog.name.ilike(f"%{q}%")).limit(10).all()
    
    res = [{"norad_id": r.norad_id, "name": r.name} for r in results]
    db.close()
    return res

import random

@app.post("/api/objects/add")
def add_object(norad_id: int):
    if startup_errors:
        return {"error": startup_errors}
    db = SessionLocal()
    
    existing = db.query(TrackedObject).filter(TrackedObject.norad_id == norad_id).first()
    if existing:
        db.close()
        return {"status": "already tracked"}
        
    master_obj = db.query(MasterCatalog).filter(MasterCatalog.norad_id == norad_id).first()
    if not master_obj:
        db.close()
        return {"error": "not found in master catalog"}
        
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
    return {"status": "success"}

@app.get("/api/objects/random")
def get_random():
    if startup_errors:
        return {"error": startup_errors}
    db = SessionLocal()
    
    # Get all IDs from master
    all_ids = [r[0] for r in db.query(MasterCatalog.norad_id).all()]
    db.close()
    
    if not all_ids:
        return {"status": "error", "message": "master catalog is empty"}
        
    random_ids = random.sample(all_ids, min(20, len(all_ids)))
    return {"status": "success", "norad_ids": random_ids}

from pydantic import BaseModel
from typing import List

class NoradIdsRequest(BaseModel):
    norad_ids: List[int]

@app.post("/api/objects/batch")
def get_objects_batch(req: NoradIdsRequest):
    if startup_errors:
        return []
    db = SessionLocal()
    objs = db.query(MasterCatalog).filter(MasterCatalog.norad_id.in_(req.norad_ids)).all()
    
    t = ts.now()
    res = []
    for obj in objs:
        if not obj.tle_line1 or not obj.tle_line2:
            continue
        try:
            sat = EarthSatellite(obj.tle_line1, obj.tle_line2, obj.name, ts)
            geocentric = sat.at(t)
            subpoint = wgs84.subpoint(geocentric)
            
            res.append({
                "norad_id": obj.norad_id,
                "name": obj.name,
                "type": 'UNKNOWN',
                "size": 'UNKNOWN',
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

import numpy as np
from datetime import datetime, timedelta, timezone

def compute_risk_score(miss_distance_km, relative_velocity_km_s, size_a, size_b):
    if miss_distance_km < 30: return 9.5
    if miss_distance_km < 80 and relative_velocity_km_s > 10: return 8.5
    if miss_distance_km < 80: return 5.0
    if relative_velocity_km_s >= 5: return 5.0
    return 2.0

@app.post("/api/conjunctions/batch")
def get_conjunctions_batch(req: NoradIdsRequest):
    if startup_errors or not req.norad_ids:
        return []
        
    db = SessionLocal()
    objs = db.query(MasterCatalog).filter(MasterCatalog.norad_id.in_(req.norad_ids)).all()
    db.close()
    
    sats = []
    for obj in objs:
        if not obj.tle_line1 or not obj.tle_line2:
            continue
        sat = EarthSatellite(obj.tle_line1, obj.tle_line2, obj.name, ts)
        sats.append({'sat': sat, 'db_obj': obj})
        
    now = datetime.now(timezone.utc)
    # Next 24 hours in 5 minute steps
    times_coarse = [now + timedelta(minutes=5*i) for i in range(24 * 12)]
    t_coarse = ts.from_datetimes(times_coarse)
    
    positions = []
    velocities = []
    valid_sats = []
    
    for s in sats:
        try:
            geocentric = s['sat'].at(t_coarse)
            positions.append(geocentric.position.km)
            velocities.append(geocentric.velocity.km_per_s)
            valid_sats.append(s)
        except Exception:
            continue
            
    if len(valid_sats) < 2:
        return []
        
    pos_array = np.array(positions)
    N = len(valid_sats)
    
    res = []
    conj_id = 1
    
    for i in range(N):
        for j in range(i + 1, N):
            diff = pos_array[i] - pos_array[j]
            dist_sq = np.sum(diff**2, axis=0)
            
            min_dist_sq = np.min(dist_sq)
            if min_dist_sq < 50.0**2:
                min_idx = np.argmin(dist_sq)
                coarse_tca = times_coarse[min_idx]
                
                times_fine = [coarse_tca + timedelta(seconds=10*k) for k in range(-60, 61)]
                t_fine = ts.from_datetimes(times_fine)
                
                p_i = valid_sats[i]['sat'].at(t_fine).position.km
                p_j = valid_sats[j]['sat'].at(t_fine).position.km
                v_i = valid_sats[i]['sat'].at(t_fine).velocity.km_per_s
                v_j = valid_sats[j]['sat'].at(t_fine).velocity.km_per_s
                
                diff_fine = p_i - p_j
                dist_sq_fine = np.sum(diff_fine**2, axis=0)
                fine_min_idx = np.argmin(dist_sq_fine)
                
                min_dist_km = float(np.sqrt(dist_sq_fine[fine_min_idx]))
                actual_tca = times_fine[fine_min_idx]
                
                rel_vel = float(np.linalg.norm(v_i[:, fine_min_idx] - v_j[:, fine_min_idx]))
                
                risk = compute_risk_score(
                    min_dist_km, 
                    rel_vel, 
                    'UNKNOWN', 
                    'UNKNOWN'
                )
                
                res.append({
                    "id": conj_id,
                    "object1": {"norad_id": valid_sats[i]['db_obj'].norad_id, "name": valid_sats[i]['db_obj'].name},
                    "object2": {"norad_id": valid_sats[j]['db_obj'].norad_id, "name": valid_sats[j]['db_obj'].name},
                    "tca_time": actual_tca.isoformat() + "Z",
                    "miss_distance_km": min_dist_km,
                    "relative_velocity_km_s": rel_vel,
                    "risk_score": risk
                })
                conj_id += 1
                
    # Sort by risk score
    res.sort(key=lambda x: x['risk_score'], reverse=True)
    return res

@app.post("/api/objects/clear")
def clear_objects():
    if startup_errors:
        return {"error": startup_errors}
    db = SessionLocal()
    db.query(TrackedObject).delete()
    db.query(Conjunction).delete()
    db.commit()
    db.close()
    return {"status": "success"}
