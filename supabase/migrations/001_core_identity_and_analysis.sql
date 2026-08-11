-- =====================================================================
-- 001 — Identity, safety primitives, and run analysis
--
-- Identical across every RodeoApps event app. The event layer is 002.
--
-- Minor-safety rules live in the DATABASE, not the client, so they hold
-- regardless of which client writes. The privacy policy commits to them.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  birth_year INTEGER,
  is_youth BOOLEAN NOT NULL DEFAULT false,
  primary_role TEXT,
  privacy_level TEXT NOT NULL DEFAULT 'public'
    CHECK (privacy_level IN ('public', 'followers', 'private')),
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ
);

-- Anyone under 18 defaults to followers-only. Enforced here rather than in
-- the signup screen so it cannot be bypassed by a different client.
CREATE OR REPLACE FUNCTION public.enforce_minor_privacy()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.birth_year IS NOT NULL
     AND (EXTRACT(YEAR FROM now())::int - NEW.birth_year) < 18 THEN
    NEW.is_youth := true;
    IF NEW.privacy_level = 'public' THEN
      NEW.privacy_level := 'followers';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_minor_privacy ON public.profiles;
CREATE TRIGGER trg_profiles_minor_privacy
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_minor_privacy();

CREATE TABLE IF NOT EXISTS public.guardian_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  minor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_sharing_allowed BOOLEAN NOT NULL DEFAULT false,
  dm_allowed BOOLEAN NOT NULL DEFAULT false,
  recruiting_visible BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (guardian_id, minor_id)
);

-- Block and report are launch requirements, not phase two. App Store review
-- rejects social apps without them on user-generated content.
CREATE TABLE IF NOT EXISTS public.blocks (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'harassment', 'unwanted_contact', 'spam', 'impersonation',
    'animal_welfare', 'safety', 'other'
  )),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.association_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  association_code TEXT NOT NULL,
  member_number TEXT,
  classification JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  valid_from DATE,
  valid_to DATE,
  verified_at TIMESTAMPTZ
);

-- ---------------------------------------------------------------------
-- Rule versioning. Required at phase 0, not later.
--
-- A run must be scored under the rules in force on the day it happened,
-- forever. Recomputing a 2026 average with 2027 rules produces wrong
-- history, wrong standings and wrong money.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rule_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_code TEXT NOT NULL,
  edition_label TEXT NOT NULL,
  source_url TEXT,
  effective_from DATE NOT NULL,
  effective_to DATE,
  revision_date DATE,
  superseded_by UUID REFERENCES public.rule_sets(id),
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.rule_set_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id UUID NOT NULL REFERENCES public.rule_sets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  value JSONB NOT NULL,
  citation TEXT,
  amended_on DATE,
  UNIQUE (rule_set_id, event_type, rule_key)
);

CREATE TABLE IF NOT EXISTS public.rule_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id UUID NOT NULL REFERENCES public.rule_sets(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  changed_on DATE NOT NULL DEFAULT current_date,
  source_note TEXT
);

-- Resolve by effective date, never by "current".
CREATE OR REPLACE FUNCTION public.rules_for(
  p_association TEXT, p_event TEXT, p_on DATE
) RETURNS TABLE (rule_key TEXT, value JSONB, citation TEXT)
LANGUAGE sql STABLE AS $$
  SELECT e.rule_key, e.value, e.citation
  FROM public.rule_sets s
  JOIN public.rule_set_entries e ON e.rule_set_id = s.id
  WHERE s.association_code = p_association
    AND e.event_type = p_event
    AND s.effective_from <= p_on
    AND (s.effective_to IS NULL OR s.effective_to >= p_on)
  ORDER BY s.effective_from DESC;
$$;

-- ---------------------------------------------------------------------
-- Run analysis. The walk-around benchmark and everything measured from it.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.benchmark_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  animal_id UUID,
  capture_method TEXT NOT NULL CHECK (capture_method IN ('orbit', 'turntable')),
  coverage_degrees NUMERIC CHECK (coverage_degrees BETWEEN 0 AND 360),
  frame_count INTEGER,
  duration_ms INTEGER,
  quality_score NUMERIC CHECK (quality_score BETWEEN 0 AND 1),
  quality_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','rejected')),
  video_url TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rider_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  capture_id UUID REFERENCES public.benchmark_captures(id) ON DELETE SET NULL,
  embedding NUMERIC[] NOT NULL,
  measurements JSONB NOT NULL DEFAULT '{}'::jsonb,
  sample_count INTEGER NOT NULL DEFAULT 1,
  sample_variance NUMERIC,
  confidence NUMERIC CHECK (confidence BETWEEN 0 AND 1),
  is_active BOOLEAN NOT NULL DEFAULT true,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rider_baselines_one_active
  ON public.rider_baselines(user_id) WHERE is_active;

CREATE TABLE IF NOT EXISTS public.run_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id UUID,
  rider_baseline_id UUID REFERENCES public.rider_baselines(id) ON DELETE SET NULL,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  segments JSONB NOT NULL DEFAULT '{}'::jsonb,
  key_moments JSONB NOT NULL DEFAULT '[]'::jsonb,
  engine_version TEXT NOT NULL,
  pose_model TEXT,
  confidence NUMERIC CHECK (confidence BETWEEN 0 AND 1),
  analysed_on_device BOOLEAN NOT NULL DEFAULT true,
  analysed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stable codes, because the coach-side tally counts how many contestants
-- share a fault and that only means something if it is named identically
-- every time.
CREATE TABLE IF NOT EXISTS public.run_faults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id UUID NOT NULL REFERENCES public.run_measurements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  taxonomy_version TEXT NOT NULL,
  segment TEXT NOT NULL,
  attributed_to TEXT NOT NULL CHECK (attributed_to IN ('rider','horse','pair')),
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high')),
  measured_value NUMERIC,
  baseline_value NUMERIC,
  deviation NUMERIC,
  t_ms INTEGER,
  confidence NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_run_faults_code ON public.run_faults(code);
CREATE INDEX IF NOT EXISTS idx_run_measurements_user ON public.run_measurements(user_id);

-- =====================================================================
-- ROW LEVEL SECURITY — on every table, no exceptions
-- =====================================================================

ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_links          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.association_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_sets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_set_entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_change_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_captures      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_baselines         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_measurements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_faults              ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles readable by visibility" ON public.profiles;
CREATE POLICY "Profiles readable by visibility" ON public.profiles FOR SELECT
  USING (
    privacy_level = 'public'
    OR id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.guardian_links g
      WHERE g.minor_id = profiles.id AND g.guardian_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users write own profile" ON public.profiles;
CREATE POLICY "Users write own profile" ON public.profiles FOR ALL
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Guardian links visible to both parties" ON public.guardian_links;
CREATE POLICY "Guardian links visible to both parties" ON public.guardian_links FOR SELECT
  USING (guardian_id = auth.uid() OR minor_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own blocks" ON public.blocks;
CREATE POLICY "Users manage own blocks" ON public.blocks FOR ALL
  USING (blocker_id = auth.uid()) WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users file own reports" ON public.reports;
CREATE POLICY "Users file own reports" ON public.reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Users read own reports" ON public.reports;
CREATE POLICY "Users read own reports" ON public.reports FOR SELECT
  USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own memberships" ON public.association_memberships;
CREATE POLICY "Users manage own memberships" ON public.association_memberships FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Rule sets are reference data: everyone reads, nobody writes from a client.
DROP POLICY IF EXISTS "Rule sets are readable" ON public.rule_sets;
CREATE POLICY "Rule sets are readable" ON public.rule_sets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Rule entries are readable" ON public.rule_set_entries;
CREATE POLICY "Rule entries are readable" ON public.rule_set_entries FOR SELECT USING (true);
DROP POLICY IF EXISTS "Rule changes are readable" ON public.rule_change_log;
CREATE POLICY "Rule changes are readable" ON public.rule_change_log FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own captures" ON public.benchmark_captures;
CREATE POLICY "Users manage own captures" ON public.benchmark_captures FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own baseline" ON public.rider_baselines;
CREATE POLICY "Users manage own baseline" ON public.rider_baselines FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own measurements" ON public.run_measurements;
CREATE POLICY "Users manage own measurements" ON public.run_measurements FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own faults" ON public.run_faults;
CREATE POLICY "Users manage own faults" ON public.run_faults FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
