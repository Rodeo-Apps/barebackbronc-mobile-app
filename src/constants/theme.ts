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
  /**
   * The event_type codes this app covers, EXACTLY as they appear in the
   * `reference_options` table.
   *
   * Deliberately separate from `eventType` above, which is the app's own slug
   * and does not match the database ("tiedown" vs "tie_down_roping"). Reusing
   * the slug as a filter silently matched nothing: the query succeeded, the
   * screen said the producer was not running this event, and there was no
   * error anywhere to notice.
   *
   * An array because the mapping is genuinely one-to-many. Team roping is two
   * rows, header and heeler, and a heeler who only saw the header rows would
   * conclude they had not been entered. Ranch rodeo is a whole card of events
   * rather than one.
   */
  eventCodes: ["bareback", "ranch_bareback"] as readonly string[],
  /**
   * What a run in this event is actually measured in.
   *
   * Roughstock is judged, not timed: a bronc ride is two judges marking the
   * horse and the rider out of 25 each, and the eight seconds is a pass/fail
   * gate rather than the result. Asking a bronc rider for "Time (seconds)" and
   * filing their 82-point ride in `final_time` records the wrong number in the
   * wrong column, and it reads back as an 82-second ride.
   *
   * "either" is for ranch rodeo, where the card is genuinely mixed — ranch
   * bronc is judged and every other event on it is timed.
   */
  resultKind: "score" as "time" | "score" | "either",
  eventLabel: "Bareback riding",
  tagline: "The lick, counted.",
  associations: ["PRCA","NIRA","NHSRA","IPRA"] as readonly string[],
} as const;

// Spacing follows the house rule from the BarrelConnect cursor rules:
// screens px-5 py-6 gap-y-6, cards p-4 rounded-2xl gap-y-2.
export const spacing = { screenX: 20, screenY: 24, gap: 24, cardPad: 16 } as const;
export const radius = { card: 16, pill: 999, control: 12 } as const;
