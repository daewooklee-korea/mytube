-- Assertions run against the real RLS roles; all changes are rolled back.
BEGIN;
SET LOCAL ROLE anon;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.videos WHERE id = 52) THEN RAISE EXCEPTION 'Public episode not readable'; END IF;
  IF EXISTS (SELECT 1 FROM public.menus WHERE NOT is_public) THEN RAISE EXCEPTION 'Private menu leaked'; END IF;
  IF EXISTS (SELECT 1 FROM public.videos WHERE menu_id <> 'efc45a78-53ed-432c-adcb-e3530e04ee78' OR status <> 'ACTIVE' OR deleted_at IS NOT NULL) THEN RAISE EXCEPTION 'Private content leaked'; END IF;
  BEGIN
    UPDATE public.menus SET is_public = true WHERE route = '/music';
    IF FOUND THEN RAISE EXCEPTION 'Anonymous menu update allowed'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.videos (title, user_id) VALUES ('unauthorized', 'f11e77d7-e107-447b-9d51-882cc19ba693');
    RAISE EXCEPTION 'Anonymous upload allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
UPDATE public.menus SET is_public = false WHERE route = '/webtoon' AND parent_id IS NULL;
SET LOCAL ROLE anon;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.menus) OR EXISTS (SELECT 1 FROM public.videos) THEN RAISE EXCEPTION 'Non-public parent failed to block descendants'; END IF;
END $$;
RESET ROLE;
UPDATE public.menus SET is_public = true, is_visible = false WHERE route = '/webtoon' AND parent_id IS NULL;
SET LOCAL ROLE anon;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.menus) OR EXISTS (SELECT 1 FROM public.videos) THEN RAISE EXCEPTION 'Hidden parent failed to block descendants'; END IF;
END $$;
RESET ROLE;
UPDATE public.menus SET is_visible = true, is_active = false WHERE route = '/webtoon' AND parent_id IS NULL;
SET LOCAL ROLE anon;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.menus) OR EXISTS (SELECT 1 FROM public.videos) THEN RAISE EXCEPTION 'Inactive parent failed to block descendants'; END IF;
END $$;
RESET ROLE;
UPDATE public.menus SET is_active = true WHERE route = '/webtoon' AND parent_id IS NULL;
UPDATE public.menus SET is_public = false WHERE id = 'efc45a78-53ed-432c-adcb-e3530e04ee78';
SET LOCAL ROLE anon;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.videos WHERE id=52) THEN RAISE EXCEPTION 'Private child content leaked'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', 'f11e77d7-e107-447b-9d51-882cc19ba693', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  UPDATE public.menus SET is_public = false WHERE route = '/webtoon' AND parent_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Admin cannot manage public flag'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  UPDATE public.menus SET is_public = true WHERE route = '/webtoon' AND parent_id IS NULL;
  IF FOUND THEN RAISE EXCEPTION 'Non-admin can manage public flag'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: guest reads, private isolation, ancestor flags, child flags and guest writes' AS result;
