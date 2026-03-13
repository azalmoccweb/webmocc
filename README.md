# AZAL Premium Operations Report

Premium Node.js + TypeScript dashboard for Railway deployment.

## What is included

- 4 static fleets: E190, Airbus, Boeing 767, Boeing 787
- Full manual daily input for the active month
- Automatic row generation for every calendar day in the month
- KPI calculation by fleet
- Prior Day / Rolling 7 / Prior Month / YTD summary cards
- PDF, CSV and JSON export
- Browser local storage persistence

## Daily inputs

For each fleet and each day, the app accepts:

- Total Flights
- Delay 15+
- Delayed Aircraft Count
- Total Delay Minutes
- Tech Cancellations
- Total MELs
- Notes

## KPI formulas

- EM15 = 100 × (1 - Delay15+ / Total Flights)
- Cancel Avg = Tech Cancellations / Total Flights × 100
- MEL / Flight = Total MELs / Total Flights
- Delay Avg = Total Delay Minutes / Delayed Aircraft Count
- Delay Burden = Total Delay Minutes / Total Flights

## Default scoring logic

- Delay Avg target: 15
- Delay Avg critical: 45
- Cancel Avg target: 0.5%
- Cancel Avg critical: 5.0%
- EM15 weight: 40%
- Delay Avg weight: 25%
- Cancel Avg weight: 20%
- MEL / Flight weight: 15%

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Start

```bash
npm start
```

## Railway

Push to GitHub and deploy the repository on Railway.

## Railway deploy note
This repo uses a multi-stage Dockerfile. Build is done inside Docker with `npm ci --include=dev`, so Railway can compile Vite/TypeScript reliably even when production env vars are set during build.
