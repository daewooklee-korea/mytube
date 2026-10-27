BEGIN;
ALTER TABLE public.menus ADD COLUMN is_public boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.menus.is_public IS 'Allow unauthenticated read access to this menu and its active content; all ancestors must also be public, visible and active.';
CREATE SCHEMA IF NOT EXISTS private;
-- A private, read-only lookup avoids recursive menus RLS. It returns only public IDs.
CREATE FUNCTION private.public_menu_ids() RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH RECURSIVE visible AS (
    SELECT m.id FROM public.menus m
    WHERE m.parent_id IS NULL AND m.is_public AND m.is_active AND m.is_visible
    UNION
    SELECT m.id FROM public.menus m JOIN visible p ON p.id = m.parent_id
    WHERE m.is_public AND m.is_active AND m.is_visible
  ) SELECT coalesce(array_agg(id), '{}'::uuid[]) FROM visible;
$$;
REVOKE ALL ON FUNCTION private.public_menu_ids() FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.public_menu_ids() TO anon, authenticated;
GRANT SELECT ON public.menus, public.videos TO anon;
CREATE POLICY "Public menus are readable" ON public.menus FOR SELECT TO anon, authenticated
USING (id = ANY ((SELECT private.public_menu_ids())::uuid[]));
CREATE POLICY "Public menu content is readable" ON public.videos FOR SELECT TO anon, authenticated
USING (status = 'ACTIVE' AND deleted_at IS NULL AND menu_id = ANY ((SELECT private.public_menu_ids())::uuid[]));
-- Only the requested webtoon section is initially published.
UPDATE public.menus SET is_public = true WHERE route = '/webtoon' OR parent_id IN (SELECT id FROM public.menus WHERE route = '/webtoon' AND parent_id IS NULL);
COMMIT;
