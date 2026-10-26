-- Webtoons are image content: reuse videos RLS and the image storage policy.
-- No existing content, storage objects, grants, or RLS policies are changed.
BEGIN;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS image_pages jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.videos ADD CONSTRAINT videos_image_pages_check CHECK (
  jsonb_typeof(image_pages) = 'array'
  AND jsonb_array_length(image_pages) <= 100
  AND NOT jsonb_path_exists(image_pages, '$[*] ? (@.type() != "string")')
  AND (image_pages = '[]'::jsonb OR media_type = 'image')
);

DO $$
DECLARE
  home_id public.menus.id%TYPE;
  parent_id_value public.menus.id%TYPE;
  child_id public.menus.id%TYPE;
BEGIN
  LOCK TABLE public.menus, public.menu_permissions IN SHARE ROW EXCLUSIVE MODE;
  SELECT id INTO STRICT home_id FROM public.menus WHERE level = 1 AND route = '/';
  IF NOT EXISTS (SELECT 1 FROM public.menu_permissions WHERE menu_id = home_id) THEN
    RAISE EXCEPTION 'Home permissions must be configured before creating Webtoon menus';
  END IF;
  IF EXISTS (SELECT 1 FROM public.menus WHERE route IN ('/webtoon', '/webtoon/episodes')) THEN
    RAISE EXCEPTION 'Webtoon route already exists; inspect existing menus before applying';
  END IF;
  INSERT INTO public.menus (name, parent_id, level, route, icon, sort_order, is_visible, is_active)
  SELECT '웹툰', NULL, 1, '/webtoon', 'book-open', coalesce(max(sort_order), 0) + 1, true, true
  FROM public.menus WHERE level = 1
  RETURNING id INTO parent_id_value;
  INSERT INTO public.menus (name, parent_id, level, route, sort_order, is_visible, is_active)
  VALUES ('전체 웹툰', parent_id_value, 2, '/webtoon/episodes', 1, true, true)
  RETURNING id INTO child_id;
  -- Menu insert triggers can create permissions; match the existing Home roles
  -- rather than introducing new roles or changing existing menu permissions.
  DELETE FROM public.menu_permissions p
  WHERE p.menu_id IN (parent_id_value, child_id)
    AND NOT EXISTS (SELECT 1 FROM public.menu_permissions h WHERE h.menu_id = home_id AND h.role = p.role);
  INSERT INTO public.menu_permissions (menu_id, role)
  SELECT target.id, h.role FROM (VALUES (parent_id_value), (child_id)) AS target(id)
  CROSS JOIN (SELECT DISTINCT role FROM public.menu_permissions WHERE menu_id = home_id) h
  WHERE NOT EXISTS (SELECT 1 FROM public.menu_permissions p WHERE p.menu_id = target.id AND p.role = h.role);
END $$;
COMMIT;
