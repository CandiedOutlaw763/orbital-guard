# Orbital Guard - SIH Presentation Content Plan

*Based strictly on the official SIH2025 Idea Submission Template.*

---

## Slide 1: TITLE PAGE
- **Problem Statement ID:** [Insert your SIH PS ID here]
- **Problem Statement Title:** Real-time Satellite Tracking and Conjunction Analysis Dashboard
- **Theme:** Space Technology / Smart Automation [Choose appropriate]
- **PS Category:** Software
- **Team ID:** [Insert your Team ID]
- **Team Name:** [Insert your Team Name]

---

## Slide 2: IDEA TITLE - Orbital Guard

### Proposed Solution (Describe your Idea/Solution/Prototype)
- **Detailed explanation of the proposed solution:** 
  - A real-time 3D dashboard visualizing Low Earth Orbit (LEO) satellites.
  - Automatically calculates satellite trajectories on-the-fly using the SGP4 algorithm based on Two-Line Element (TLE) data.
  - Proactively calculates Time of Closest Approach (TCA), miss distance, and relative velocity to detect collision risks between tracked bodies.
- **How it addresses the problem:**
  - Mitigates the challenge of tracking thousands of objects in the increasingly congested LEO environment.
  - Transforms raw, unreadable mathematical data (TLE) into intuitive visual alerts (dynamic red arcs for collision paths).
- **Innovation and uniqueness of the solution:**
  - **Hybrid Propagation Engine:** Uses Python (`skyfield`) for backend physics and JS (`satellite.js`) for smooth 60FPS UI rendering.
  - **Serverless Architecture:** Fully optimized to run on lightweight, cost-free serverless infrastructure (Vercel) without needing expensive dedicated servers.

---

## Slide 3: TECHNICAL APPROACH

### Technologies to be used
- **Frontend:** React 18, Vite, Tailwind CSS, `react-globe.gl` (for 3D Earth visualization), `react-plotly.js`.
- **Backend (Serverless):** Python 3, FastAPI, SQLAlchemy (`pg8000` driver for Vercel compatibility), `skyfield` (astronomical physics engine).
- **Database:** Prisma Postgres (Cloud-hosted).

### Methodology and process for implementation
*(Note: Include a block diagram or flowchart on this slide depicting the following)*
1. **Data Ingestion:** Backend fetches live TLE data from the CelesTrak API.
2. **Filtering & Storage:** Filters for LEO objects (Mean Motion > 11.25) and securely stores them in the Postgres Database.
3. **Collision Engine:** FastAPI backend uses `skyfield` to compute Conjunction Risk Scores based on distance and velocity.
4. **Real-time Rendering:** React frontend fetches tracked objects; `satellite.js` calculates live coordinates every second to render smooth orbital movement on the 3D globe.

---

## Slide 4: FEASIBILITY AND VIABILITY

### Analysis of the feasibility of the idea
- **Technical Feasibility:** Built entirely on mature, proven open-source frameworks (React, FastAPI) and relies on standard, free data feeds (CelesTrak).
- **Financial Feasibility:** Uses open-source public domain satellite catalogs and serverless-native hosting (Vercel free tier) resulting in near-zero operational costs.

### Potential challenges and risks
- **Computational Load:** Running O(n²) collision checks on 12,000+ satellites requires massive compute power.
- **Data Freshness:** Satellite trajectories drift over time due to atmospheric drag, making old TLE data inaccurate.

### Strategies for overcoming these challenges
- **Targeted Tracking (Compute Mitigation):** Users track a focused subset of objects (up to 20 simultaneously), reducing collision calculations from millions to manageable real-time batches.
- **Automated Syncing (Data Freshness):** Built a dedicated `/api/catalog/sync` webhook that updates the database instantly with fresh parameters to maintain physics accuracy.

---

## Slide 5: IMPACT AND BENEFITS

### Potential impact on the target audience
- **Protects High-Value Assets:** Helps satellite operators prevent catastrophic collisions that could destroy multi-million dollar satellites (e.g., Starlink, weather satellites).
- **Prevents Kessler Syndrome:** Mitigates the cascading generation of space debris, keeping Low Earth Orbit safe and accessible for future generations.

### Benefits of the solution
- **Economic:** Saves operators money by preventing loss of assets and avoiding unnecessary, fuel-wasting evasive maneuvers.
- **Social/Educational:** Democratizes space situational awareness, making complex orbital mechanics visually accessible to students and researchers without requiring expensive proprietary software.
- **Environmental (Space):** Actively promotes space sustainability by providing tools to avoid adding more debris to the orbital environment.

---

## Slide 6: RESEARCH AND REFERENCES

### Details / Links of the reference and research work
- **SGP4 Orbital Routing:** "Spacetrack Report No. 3" - Hoots, F. R., and Roehrich, R. L. (Foundational mathematics for TLE propagation).
- **Kessler Syndrome:** Kessler, D.J., and Cour-Palais, B.G. (1978). "Collision Frequency of Artificial Satellites: The Creation of a Debris Belt".
- **CelesTrak (Data Source):** Primary source for live Two-Line Element (TLE) satellite data. (https://celestrak.org/)
- **Skyfield (Physics Engine):** Elegant astronomy for Python. (https://rhodesmill.org/skyfield/)
- **satellite.js:** JavaScript library for SGP4/SDP4 calculations. (https://github.com/shashwatak/satellite-js)
- **Live Prototype:** [Insert your Vercel Link here: https://orbital-guard-one.vercel.app/]
