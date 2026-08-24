# Orbital Guard - SIH Presentation Content Plan

*Based on the standard 6-slide Smart India Hackathon (SIH) format.*

---

## Slide 1: Title Page
- **Problem Statement ID:** [Insert your SIH PS ID here, e.g., SIH 12345]
- **Problem Statement Title:** Real-time Satellite Tracking and Conjunction Analysis Dashboard for Space Situational Awareness
- **Theme:** Space Technology / Smart Automation [Choose appropriate]
- **PS Category:** Software
- **Team ID:** [Insert your Team ID, e.g., 103663]
- **Team Name:** [Insert your Team Name]

---

## Slide 2: ORBITAL GUARD (Overview)

### Our Idea
- **Interactive 3D Dashboard:** A real-time 3D globe visualizing Low Earth Orbit (LEO) satellites and space debris using `react-globe.gl`.
- **Live Orbital Propagation:** Calculates accurate satellite trajectories on-the-fly using the SGP4 algorithm based on CelesTrak Two-Line Element (TLE) data.
- **Automated Collision Detection:** Proactively calculates Time of Closest Approach (TCA), miss distance, and relative velocity to detect conjunctions.
- **Dynamic Visual Alerts:** Automatically renders warning arcs on the globe to highlight high-risk collision paths between tracked bodies.

### Addressing Challenges
- **Space Overcrowding:** Solves the challenge of tracking thousands of objects in the increasingly congested LEO environment.
- **Complex Data Interpretation:** Transforms raw, unreadable TLE mathematical data into intuitive 3D visual insights.
- **Reactive vs. Proactive:** Shifts satellite monitoring from reactive observation to proactive collision avoidance.
- **High Cost of SSA Tools:** Replaces expensive, proprietary Space Situational Awareness (SSA) software with an accessible, open-source web platform.

### What Makes Us Unique
- **Hybrid Propagation:** Uses backend Python physics (`skyfield`) for heavy conjunction math, and client-side JavaScript (`satellite.js`) for smooth 60FPS UI rendering.
- **Serverless Architecture:** Fully optimized to run on lightweight, cost-free serverless infrastructure (Vercel + Prisma Postgres) without needing heavy dedicated servers.
- **Focus on LEO:** Specifically optimized to filter and track Low Earth Orbit bodies, where the risk of the Kessler Syndrome is highest.

---

## Slide 3: Technical Approach
*(Note: You should create a block diagram/flowchart for this slide based on this text)*

**System Flow:**
1. **Data Ingestion:** Backend reaches out to CelesTrak API to fetch live TLE data for Active Satellites and Debris.
2. **Database (Vercel Postgres):** Parses and filters data (Mean Motion > 11.25 for LEO) and stores it using SQLAlchemy (`pg8000`).
3. **Backend Engine (FastAPI):** Exposes REST API endpoints. Uses `skyfield` to compute Conjunction Risk Scores based on distance and velocity.
4. **Frontend (Next.js/React):** Fetches tracked objects and conjunction alerts.
5. **UI Rendering:** Uses `satellite.js` to calculate live coordinates (Lat/Lng/Alt) every second, rendering them on a `three.js` 3D globe.

---

## Slide 4: Feasibility and Viability

### Feasibility
**Technical Feasibility:**
- Built entirely on mature, proven open-source frameworks (React, FastAPI, SQLAlchemy).
- Relies on standard, freely accessible data feeds (CelesTrak / Space Track).
- Serverless-native backend ensures 99.9% uptime with zero manual server management.

**Financial Feasibility:**
- **Zero Data Cost:** Utilizes open-source public domain satellite catalogs.
- **Low Hosting Cost:** Monorepo architecture designed to run on free-tier serverless platforms (Vercel) with minimal compute overhead.

### Challenges and Scalability
**Key Challenges:**
- **Computational Load:** Running O(n²) collision checks on 12,000+ satellites requires massive compute power.
- **Data Freshness:** TLE data degrades in accuracy over time due to atmospheric drag.

**Mitigation & Scalability:**
- **Targeted Tracking:** Users track specific objects (up to 20 simultaneously), reducing collision calculations from millions of permutations to a focused subset.
- **Automated Syncing:** A dedicated `/api/catalog/sync` endpoint allows automated daily cron jobs to refresh TLE data, ensuring orbital physics remain highly accurate.

---

## Slide 5: Impact and Benefits

### Impact on Space Sector
- **Protects Space Assets:** Helps prevent catastrophic collisions that could destroy multi-million dollar satellites (e.g., Starlink, weather satellites).
- **Prevents Kessler Syndrome:** Mitigates the cascading generation of space debris, keeping Low Earth Orbit safe for future generations.
- **Democratizes Space Data:** Makes complex orbital mechanics accessible to students, researchers, and hobbyists.

### Benefits
- **Economic Benefits:** Saves satellite operators money by preventing loss of assets and avoiding unnecessary evasive maneuvers.
- **Operational Benefits:** Provides instant, visually intuitive risk assessments rather than requiring operators to parse raw text data.
- **Strategic Benefits:** Strengthens national space situational awareness and promotes sustainable space exploration.

---

## Slide 6: Research and References

### Research Articles
- **SGP4 Orbital Routing:** "Spacetrack Report No. 3" - Hoots, F. R., and Roehrich, R. L. (Foundational mathematics for TLE propagation).
- **Kessler Syndrome:** Kessler, D.J., and Cour-Palais, B.G. (1978). "Collision Frequency of Artificial Satellites: The Creation of a Debris Belt".

### Data and Web References
- **CelesTrak (Data Source):** Primary source for live Two-Line Element (TLE) satellite data. (https://celestrak.org/)
- **Skyfield (Physics Engine):** Elegant astronomy for Python. (https://rhodesmill.org/skyfield/)
- **satellite.js:** JavaScript library for SGP4/SDP4 calculations. (https://github.com/shashwatak/satellite-js)
- **react-globe.gl:** UI component for 3D globe data visualizations. (https://globe.gl/)

**Prototype:** [Insert your Vercel Link here: https://orbital-guard-one.vercel.app/]
