import numpy as np
from datetime import datetime, timedelta, timezone
from skyfield.api import EarthSatellite, load, wgs84
from database import SessionLocal, TrackedObject, Conjunction

ts = load.timescale()

def compute_risk_score(miss_distance_km, relative_velocity_km_s, size_a, size_b):
    # Rule-based risk classification tuned to the mission thresholds.
    if miss_distance_km < 30:
        return 9.5
    if miss_distance_km < 80 and relative_velocity_km_s > 10:
        return 8.5
    if miss_distance_km < 80:
        return 5.0
    if relative_velocity_km_s >= 5:
        return 5.0
    return 2.0

def detect_conjunctions(new_norad_id=None):
    print("Starting conjunction detection...")
    db = SessionLocal()
    objects = db.query(TrackedObject).all()
    
    if not objects:
        print("No objects in database.")
        db.close()
        return
        
    sats = []
    for obj in objects:
        if not obj.tle_line1 or not obj.tle_line2:
            continue
        sat = EarthSatellite(obj.tle_line1, obj.tle_line2, obj.name, ts)
        sats.append({'sat': sat, 'db_obj': obj})
        
    # Coarse pass time window
    now = datetime.now(timezone.utc)
    # Next 24 hours in 5 minute steps
    times_coarse = [now + timedelta(minutes=5*i) for i in range(24 * 12)]
    t_coarse = ts.from_datetimes(times_coarse)
    
    # Calculate positions
    print(f"Propagating {len(sats)} objects over {len(times_coarse)} steps...")
    positions = []
    velocities = []
    valid_sats = []
    
    new_idx = -1
    for idx, s in enumerate(sats):
        try:
            geocentric = s['sat'].at(t_coarse)
            positions.append(geocentric.position.km)
            velocities.append(geocentric.velocity.km_per_s)
            valid_sats.append(s)
            if new_norad_id and s['db_obj'].norad_id == new_norad_id:
                new_idx = len(valid_sats) - 1
        except Exception as e:
            continue
            
    pos_array = np.array(positions)
    vel_array = np.array(velocities)
    N = len(valid_sats)
    
    # Clear old conjunctions ONLY if we are doing a full run
    if new_norad_id is None:
        db.query(Conjunction).delete()
    
    for i in range(N):
        for j in range(i + 1, N):
            # If focused check, skip pairs that don't involve the new object
            if new_norad_id is not None:
                if i != new_idx and j != new_idx:
                    continue
                    
            diff = pos_array[i] - pos_array[j]
            dist_sq = np.sum(diff**2, axis=0)
            
            min_dist_sq = np.min(dist_sq)
            if min_dist_sq < 50.0**2: # 50 km threshold
                min_idx = np.argmin(dist_sq)
                coarse_tca = times_coarse[min_idx]
                
                # Refine around coarse TCA (+/- 10 minutes, 10 second steps)
                times_fine = [coarse_tca + timedelta(seconds=10*k) for k in range(-60, 61)]
                t_fine = ts.from_datetimes(times_fine)
                
                p_i = valid_sats[i]['sat'].at(t_fine).position.km
                p_j = valid_sats[j]['sat'].at(t_fine).position.km
                v_i = valid_sats[i]['sat'].at(t_fine).velocity.km_per_s
                v_j = valid_sats[j]['sat'].at(t_fine).velocity.km_per_s
                
                diff_fine = p_i - p_j
                dist_sq_fine = np.sum(diff_fine**2, axis=0)
                fine_min_idx = np.argmin(dist_sq_fine)
                
                min_dist_km = np.sqrt(dist_sq_fine[fine_min_idx])
                actual_tca = times_fine[fine_min_idx]
                
                rel_vel = np.linalg.norm(v_i[:, fine_min_idx] - v_j[:, fine_min_idx])
                
                risk = compute_risk_score(
                    min_dist_km, 
                    rel_vel, 
                    valid_sats[i]['db_obj'].rcs_size, 
                    valid_sats[j]['db_obj'].rcs_size
                )
                
                c = Conjunction(
                    object1_id=valid_sats[i]['db_obj'].norad_id,
                    object2_id=valid_sats[j]['db_obj'].norad_id,
                    tca_time=actual_tca,
                    miss_distance_km=min_dist_km,
                    relative_velocity_km_s=rel_vel,
                    risk_score=risk
                )
                db.add(c)
                print(f"Detected conjunction: {valid_sats[i]['db_obj'].name} vs {valid_sats[j]['db_obj'].name} at {actual_tca} (Miss: {min_dist_km:.2f} km)")

    db.commit()
    db.close()
    print("Conjunction detection completed.")

if __name__ == "__main__":
    detect_conjunctions()
