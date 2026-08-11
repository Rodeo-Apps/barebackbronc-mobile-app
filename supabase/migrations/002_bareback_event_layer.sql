-- 002 — Bareback riding event layer
--
-- Two things carry more weight here than anywhere else in the portfolio:
-- the rigging specification, which is enforceable at the chute, and the
-- health record, because this event ends careers.

CREATE TABLE IF NOT EXISTS public.bucking_horses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID,
  name TEXT NOT NULL,
  brand TEXT,
  foaling_year INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bronc_patterns (
  horse_id UUID PRIMARY KEY REFERENCES public.bucking_horses(id) ON DELETE CASCADE,
  jump_frequency_hz NUMERIC(4,2),
  direction_changes_avg NUMERIC(4,2),
  drop_severity_avg NUMERIC(4,2),
  buck_off_rate NUMERIC(5,2),
  avg_horse_score NUMERIC(4,1),
  trips_recorded INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bb_rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  horse_id UUID REFERENCES public.bucking_horses(id) ON DELETE SET NULL,
  rule_set_id UUID REFERENCES public.rule_sets(id),
  qualified_ride BOOLEAN NOT NULL DEFAULT false,
  marked_out BOOLEAN,
  judge1_rider INTEGER CHECK (judge1_rider BETWEEN 0 AND 25),
  judge1_horse INTEGER CHECK (judge1_horse BETWEEN 0 AND 25),
  judge2_rider INTEGER CHECK (judge2_rider BETWEEN 0 AND 25),
  judge2_horse INTEGER CHECK (judge2_horse BETWEEN 0 AND 25),
  official_score INTEGER GENERATED ALWAYS AS (
    COALESCE(judge1_rider,0) + COALESCE(judge1_horse,0) +
    COALESCE(judge2_rider,0) + COALESCE(judge2_horse,0)
  ) STORED,
  status TEXT NOT NULL DEFAULT 'clean',
  reride_offered BOOLEAN NOT NULL DEFAULT false,
  reride_accepted BOOLEAN,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The spec is precise and enforceable, so it is columns rather than a note.
CREATE TABLE IF NOT EXISTS public.bb_riggings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  handhold_length_in NUMERIC(4,2),
  suede_cover_in NUMERIC(4,2),
  width_at_handhold_in NUMERIC(4,2),
  width_at_dring_in NUMERIC(4,2),
  handhold_material_legal BOOLEAN NOT NULL DEFAULT true,
  cinch_material TEXT CHECK (cinch_material IN ('mohair','hemp','other')),
  hardware_drings_only BOOLEAN NOT NULL DEFAULT true,
  -- Derived from the specification, never supplied by the client.
  passes_spec BOOLEAN GENERATED ALWAYS AS (
    handhold_length_in <= 8
    AND suede_cover_in >= 3
    AND width_at_handhold_in <= 10
    AND width_at_dring_in <= 6
    AND handhold_material_legal
    AND cinch_material IN ('mohair','hemp')
    AND hardware_drings_only
  ) STORED,
  retired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Weighted heaviest in this app. Access is restricted to the athlete alone.
CREATE TABLE IF NOT EXISTS public.bb_health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN
    ('injury','concussion_symptom','recovery','load','prehab')),
  body_region TEXT CHECK (body_region IN
    ('elbow','shoulder','neck','back','hand','wrist','knee','hip','head','other')),
  occurred_on DATE NOT NULL,
  notes TEXT,
  -- The app records. It never clears anybody to ride.
  professional_seen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bucking_horses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bronc_patterns    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bb_rides          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bb_riggings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bb_health_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bucking horses are public" ON public.bucking_horses;
CREATE POLICY "Bucking horses are public" ON public.bucking_horses FOR SELECT USING (true);
DROP POLICY IF EXISTS "Patterns are public" ON public.bronc_patterns;
CREATE POLICY "Patterns are public" ON public.bronc_patterns FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users manage own rides" ON public.bb_rides;
CREATE POLICY "Users manage own rides" ON public.bb_rides FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users manage own riggings" ON public.bb_riggings;
CREATE POLICY "Users manage own riggings" ON public.bb_riggings FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
-- Health records are the athlete's alone. No coach read, no team read.
DROP POLICY IF EXISTS "Health records are private" ON public.bb_health_records;
CREATE POLICY "Health records are private" ON public.bb_health_records FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
