from database import SessionLocal, TrackedObject, Conjunction

db = SessionLocal()

all_objects = db.query(TrackedObject).all()

satellites = []
debris = []

for obj in all_objects:
    if "DEB" in obj.name or "R/B" in obj.name or "DEBRIS" in obj.name:
        debris.append(obj)
    else:
        satellites.append(obj)

keep_sats = satellites[:15]
keep_debris = debris[:5]

keep_ids = [o.norad_id for o in keep_sats] + [o.norad_id for o in keep_debris]

deleted_objs = db.query(TrackedObject).filter(TrackedObject.norad_id.not_in(keep_ids)).delete(synchronize_session=False)
db.query(Conjunction).delete()

db.commit()
db.close()
print(f"Reduced to {len(keep_sats)} satellites and {len(keep_debris)} debris. Deleted {deleted_objs} objects.")
