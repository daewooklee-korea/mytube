-- Run this entire file in the PlayMe project's Supabase SQL Editor.
-- Data-only addition: no changes to tables, RLS, or existing menus.
-- Based on App.jsx's menus/menu_permissions query and Admin.jsx's menu writer.
-- Required columns were verified via the REST API. Full schema introspection
-- and remote execution require admin credentials and were unavailable.
BEGIN;

DO $$
DECLARE
  study_id public.menus.id%TYPE;
  course_id public.menus.id%TYPE;
  candidate_count integer;
  missing_columns text;
BEGIN
  SELECT string_agg(required.table_name || '.' || required.column_name, ', ')
  INTO missing_columns
  FROM (VALUES
    ('menus', 'id'), ('menus', 'name'), ('menus', 'parent_id'),
    ('menus', 'level'), ('menus', 'route'), ('menus', 'sort_order'),
    ('menus', 'is_visible'), ('menus', 'is_active'),
    ('menu_permissions', 'menu_id'), ('menu_permissions', 'role')
  ) AS required(table_name, column_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = required.table_name
      AND c.column_name = required.column_name
  );
  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION 'Required columns missing: %', missing_columns;
  END IF;

  -- Serializes concurrent executions and menu writes during this small insert.
  LOCK TABLE public.menus, public.menu_permissions IN SHARE ROW EXCLUSIVE MODE;

  SELECT count(*) INTO candidate_count FROM public.menus
  WHERE level = 1 AND (route = '/study' OR lower(name) = 'study');
  IF candidate_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one Study parent, found %', candidate_count;
  END IF;
  SELECT id INTO study_id FROM public.menus
  WHERE level = 1 AND (route = '/study' OR lower(name) = 'study');

  IF NOT EXISTS (SELECT 1 FROM public.menu_permissions WHERE menu_id = study_id) THEN
    RAISE EXCEPTION 'Study has no menu_permissions. Configure Study roles first.';
  END IF;

  SELECT count(*) INTO candidate_count FROM public.menus
  WHERE route = '/study/logic-vocal-mixing';
  IF candidate_count > 1 THEN
    RAISE EXCEPTION 'Duplicate education routes already exist; inspect menus first.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.menus WHERE route = '/study/logic-vocal-mixing'
    AND (parent_id IS DISTINCT FROM study_id OR level IS DISTINCT FROM 2)
  ) THEN
    RAISE EXCEPTION 'Education route exists outside Study level 2; no data changed.';
  END IF;

  SELECT id INTO course_id FROM public.menus
  WHERE route = '/study/logic-vocal-mixing';
  IF course_id IS NULL THEN
    INSERT INTO public.menus (name, parent_id, level, route, sort_order, is_visible, is_active)
    SELECT '🎙️ Logic Pro 보컬 믹싱', study_id, 2, '/study/logic-vocal-mixing',
      coalesce(max(sort_order), 0) + 1, true, true
    FROM public.menus WHERE parent_id = study_id
    RETURNING id INTO course_id;

    -- Only the newly created course inherits Study roles. Rerunning must not
    -- override later admin choices about visibility or role permissions.
    INSERT INTO public.menu_permissions (menu_id, role)
    SELECT DISTINCT course_id, parent_permission.role
    FROM public.menu_permissions parent_permission
    WHERE parent_permission.menu_id = study_id
      AND NOT EXISTS (
        SELECT 1 FROM public.menu_permissions existing
        WHERE existing.menu_id = course_id AND existing.role = parent_permission.role
      );
  END IF;
END $$;

-- Verify the new menu and its role visibility in the SQL Editor result.
SELECT m.id, m.name, m.route, m.parent_id, m.level, m.is_active, m.is_visible, p.role
FROM public.menus m
LEFT JOIN public.menu_permissions p ON p.menu_id = m.id
WHERE m.route = '/study/logic-vocal-mixing';
COMMIT;
