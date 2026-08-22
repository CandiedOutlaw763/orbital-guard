# 🌍 Orbital Guard

Orbital Guard is a real-time 3D satellite tracking and conjunction analysis dashboard. It allows users to visualize satellites in Low Earth Orbit (LEO), monitor their live orbital positions, and proactively detect potential collisions (conjunctions) between tracked space objects.

## ✨ Features

- **Interactive 3D Globe:** Visualizes Earth, day/night cycles, and live satellite positions using 
eact-globe.gl and Three.js.
- **Live Orbital Propagation:** Uses SGP4 (via satellite.js and skyfield) to accurately calculate satellite trajectories in real-time based on Two-Line Element (TLE) data from CelesTrak.
- **Conjunction Analysis:** Actively monitors tracked objects for close approaches. Computes the Time of Closest Approach (TCA), miss distance, relative velocity, and assigns a normalized Risk Score.
- **Visual Risk Alerts:** High-risk conjunctions trigger dynamic red arcs between satellites directly on the 3D globe.
- **Search & Track:** Search the master catalog by NORAD ID or satellite name to track specific bodies (e.g., ISS, Hubble, Weather satellites).
- **Responsive Design:** A fully responsive, modern UI built with React, Tailwind CSS, and Lucide icons that works seamlessly on both desktop and mobile.

## 🛠️ Technology Stack

**Frontend:**
- React 18 + Vite
- Tailwind CSS
- 
eact-globe.gl (3D Visualization)
- satellite.js (Client-side orbital propagation)
- 
eact-plotly.js (Data visualization)

**Backend (Serverless):**
- Python 3 + FastAPI
- SQLAlchemy (with pure-Python pg8000 driver for serverless compatibility)
- skyfield (Backend astronomical and orbital physics calculations)
- Prisma Postgres (Hosted on Vercel)

## 🚀 Deployment

Orbital Guard is configured to deploy seamlessly on **Vercel** as a monorepo:
1. **Frontend:** Vercel automatically detects the Vite React app and builds it.
2. **Backend:** The pi/ directory contains index.py, which Vercel's Python runtime natively converts into Serverless Functions. A ercel.json file ensures all /api/* traffic routes into the FastAPI app.

### Database Syncing
Because the backend is serverless, the PostgreSQL database acts as the single source of truth for the Master Catalog. 
To initially populate the database on a fresh deployment, trigger the sync endpoint:
\\\ash
curl -X POST https://<your-vercel-domain>/api/catalog/sync
\\\
This fetches the latest TLE data from CelesTrak and securely upserts it into the production database.
