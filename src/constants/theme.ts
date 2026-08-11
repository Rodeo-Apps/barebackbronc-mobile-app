// src/constants/theme.ts
//
// Read from the live barebackbronc.pro stylesheet rather than from the spine
// document. Where the two disagree the shipped site wins: a user opening
// the app straight off the website should not feel a colour change.

export const colors = {
  background: '#0d0708',
  surface: '#160d0f',
  card: '#1d1214',
  border: '#331f22',
  text: '#e6d3d3',
  muted: '#a89596',
  accent: '#cc2936',
  accentAlt: '#e8a0a5',
  cream: '#f2e9e7',
  success: '#4ba36b',
  warning: '#d99a2b',
  danger: '#c8503f',
} as const;

export const app = {
  name: "Bareback Riding",
  short: "BarebackBronc",
  domain: "barebackbronc.pro",
  eventType: "bareback",
  eventLabel: "Bareback riding",
  tagline: "The lick, counted.",
  associations: ["PRCA","NIRA","NHSRA","IPRA"] as readonly string[],
} as const;

// Spacing follows the house rule from the BarrelConnect cursor rules:
// screens px-5 py-6 gap-y-6, cards p-4 rounded-2xl gap-y-2.
export const spacing = { screenX: 20, screenY: 24, gap: 24, cardPad: 16 } as const;
export const radius = { card: 16, pill: 999, control: 12 } as const;
