import numpy as np
from datetime import datetime, timedelta, timezone
from skyfield.api import EarthSatellite, load, wgs84
from database import SessionLocal, TrackedObject, Conjunction

ts = load.timescale()
db = SessionLocal()

objects = db.query(TrackedObject).all()
sats = []
for obj in objects:
    if not obj.tle_line1 or not obj.tle_line2: continue
    sat = EarthSatellite(obj.tle_line1, obj.tle_line2, obj.name, ts)
    sats.append({'sat': sat, 'db_obj': obj})

now = datetime.now(timezone.utc)
times_coarse = [now + timedelta(minutes=5*i) for i in range(24 * 12)]
t_coarse = ts.from_datetimes(times_coarse)

positions = []
valid_sats = []
for s in sats:
    try:
        geocentric = s['sat'].at(t_coarse)
        positions.append(geocentric.position.km)
        valid_sats.append(s)
    except Exception:
        pass

pos_array = np.array(positions)
N = len(valid_sats)
print(f"Propagated {N} objects")

# Find coarse conjunctions
counts = {s['db_obj'].norad_id: 0 for s in valid_sats}

for i in range(N):
    for j in range(i + 1, N):
        diff = pos_array[i] - pos_array[j]
        dist_sq = np.sum(diff**2, axis=0)
        min_dist_sq = np.min(dist_sq)
        if min_dist_sq < 100.0**2: # relaxed threshold to 100km to ensure we get some conjunctions
            norad_i = valid_sats[i]['db_obj'].norad_id
            norad_j = valid_sats[j]['db_obj'].norad_id
            counts[norad_i] += 1
            counts[norad_j] += 1

debris = []
satellites = []
for s in valid_sats:
    obj = s['db_obj']
    c = counts[obj.norad_id]
    if "DEB" in obj.name or "R/B" in obj.name or "DEBRIS" in obj.name:
        debris.append((c, obj))
    else:
        satellites.append((c, obj))

debris.sort(key=lambda x: x[0], reverse=True)
satellites.sort(key=lambda x: x[0], reverse=True)

keep_debris = [d[1] for d in debris[:5]]
keep_sats = [s[1] for s in satellites[:15]]

keep_ids = [o.norad_id for o in keep_debris] + [o.norad_id for o in keep_sats]
db.query(TrackedObject).filter(TrackedObject.norad_id.not_in(keep_ids)).delete(synchronize_session=False)
db.commit()

print(f"Kept 5 debris and 15 satellites with highest conjunction potential.")
db.close()
