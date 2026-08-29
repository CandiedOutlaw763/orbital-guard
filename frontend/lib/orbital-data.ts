export type RiskLevel = 'HIGH' | 'MODERATE' | 'LOW'

export type ConjunctionAlert = {
  id: string
  risk: RiskLevel
  primary: string
  secondary: string
  countdown: string
  tcaDate: string
  tcaTime: string
  probabilityMantissa: string
  probabilityExponent: string
}

export const conjunctionAlerts: ConjunctionAlert[] = [
  {
    id: 'CDM-8841',
    risk: 'HIGH',
    primary: 'SAT-301',
    secondary: 'SAT-302',
    countdown: '05h 10m 22s',
    tcaDate: '28 May 2025,',
    tcaTime: '17:52:31 UTC',
    probabilityMantissa: '7.2',
    probabilityExponent: '-4',
  },
  {
    id: 'CDM-8842',
    risk: 'HIGH',
    primary: 'SAT-412',
    secondary: 'DEB-221',
    countdown: '05h 10m 22s',
    tcaDate: '28 May 2025,',
    tcaTime: '17:52:31 UTC',
    probabilityMantissa: '1.1',
    probabilityExponent: '-5',
  },
  {
    id: 'CDM-8843',
    risk: 'MODERATE',
    primary: 'SAT-093',
    secondary: 'DEB-134',
    countdown: '11h 42m 55s',
    tcaDate: '29 May 2025,',
    tcaTime: '00:25:04 UTC',
    probabilityMantissa: '9.8',
    probabilityExponent: '-6',
  },
  {
    id: 'CDM-8844',
    risk: 'MODERATE',
    primary: 'SAT-509',
    secondary: 'DEB-134',
    countdown: '18h 39m 12s',
    tcaDate: '29 May 2025,',
    tcaTime: '07:21:21 UTC',
    probabilityMantissa: '2.4',
    probabilityExponent: '-6',
  },
  {
    id: 'CDM-8845',
    risk: 'LOW',
    primary: 'SAT-588',
    secondary: 'DEB-402',
    countdown: '22h 15m 05s',
    tcaDate: '29 May 2025,',
    tcaTime: '11:57:14 UTC',
    probabilityMantissa: '1.2',
    probabilityExponent: '-6',
  },
]

export type TrackedObject = {
  name: string
  noradId: string
  altitude: string
  active?: boolean
}

export const trackedObjects: TrackedObject[] = [
  { name: 'IRIDIUM 33 DEB', noradId: '34071', altitude: '736 km', active: true },
  { name: 'COSMOS 2251 DEB', noradId: '34651', altitude: '837 km' },
  { name: 'FENGYUN 1C DEB', noradId: '30045', altitude: '850 km' },
  { name: 'SL-16 R/B', noradId: '25400', altitude: '842 km' },
  { name: 'CZ-6A DEB', noradId: '54216', altitude: '791 km' },
]

export const riskStyles: Record<RiskLevel, string> = {
  HIGH: 'bg-destructive/85 text-foreground',
  MODERATE: 'bg-warning/85 text-primary-foreground',
  LOW: 'bg-success/80 text-primary-foreground',
}
