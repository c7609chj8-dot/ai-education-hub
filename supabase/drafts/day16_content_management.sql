-- 16일차 검토용 초안. 원격 DB에 적용하지 않습니다.
CREATE TABLE academy.contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('news','faq','partnership')),
  category text NOT NULL CHECK (length(btrim(category)) BETWEEN 1 AND 100),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 4000),
  link_path text,
  link_label text,
  display_date date,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 100000),
  is_public boolean NOT NULL DEFAULT false,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((link_path IS NULL AND link_label IS NULL) OR
    (kind='faq' AND link_path IS NOT NULL AND link_path IN ('/programs','/schedule','/partnership','/contact') AND link_label IS NOT NULL AND length(btrim(link_label)) BETWEEN 1 AND 50))
);
CREATE INDEX contents_order_idx ON academy.contents(kind,sort_order,id);
ALTER TABLE academy.contents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON academy.contents FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA academy TO anon,authenticated,service_role;
GRANT SELECT (id,kind,category,title,body,link_path,link_label,display_date,sort_order,is_public) ON academy.contents TO anon,authenticated;
CREATE POLICY contents_select_public ON academy.contents FOR SELECT TO anon,authenticated USING (is_public);
CREATE VIEW public.published_contents WITH (security_invoker=true) AS
  SELECT id,kind,category,title,body,link_path,link_label,display_date,sort_order FROM academy.contents WHERE is_public;
REVOKE ALL ON public.published_contents FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.published_contents TO anon,authenticated;
GRANT SELECT (id,kind,category,title,body,link_path,link_label,display_date,sort_order,is_public,revision,updated_at),
  INSERT (kind,category,title,body,link_path,link_label,display_date,sort_order,is_public),
  UPDATE (category,title,body,link_path,link_label,display_date,sort_order,is_public,revision,updated_at) ON academy.contents TO service_role;

CREATE TABLE academy.content_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES academy.contents(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL,
  revision integer NOT NULL CHECK (revision>0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX content_events_content_idx ON academy.content_events(content_id,created_at DESC,id DESC);
ALTER TABLE academy.content_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON academy.content_events FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT (id,content_id,actor_id,revision,created_at), INSERT (content_id,actor_id,revision) ON academy.content_events TO service_role;

CREATE FUNCTION public.academy_admin_list_contents(p_after_kind text,p_after_order integer,p_after_id uuid,p_limit integer)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $function$
  WITH selected AS (
    SELECT id,kind,category,title,body,link_path,link_label,display_date,sort_order,is_public,revision,updated_at
    FROM academy.contents
    WHERE (p_after_kind IS NULL AND p_after_order IS NULL AND p_after_id IS NULL) OR
      (p_after_kind IS NOT NULL AND p_after_order IS NOT NULL AND p_after_id IS NOT NULL AND (kind,sort_order,id)>(p_after_kind,p_after_order,p_after_id))
    ORDER BY kind,sort_order,id LIMIT least(greatest(coalesce(p_limit,20),1),51)
  ) SELECT jsonb_build_object('items',coalesce(jsonb_agg(to_jsonb(selected) ORDER BY kind,sort_order,id),'[]'::jsonb)) FROM selected;
$function$;
CREATE FUNCTION public.academy_admin_save_content(p_id uuid,p_revision integer,p_kind text,p_category text,p_title text,p_body text,p_display_date date,p_sort_order integer,p_is_public boolean,p_actor_id uuid,p_link_path text,p_link_label text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $function$
DECLARE v_id uuid;v_revision integer;
BEGIN
  IF p_actor_id IS NULL OR p_kind IS NULL OR p_kind NOT IN ('news','faq','partnership') OR
     p_category IS NULL OR length(btrim(p_category)) NOT BETWEEN 1 AND 100 OR
     p_title IS NULL OR length(btrim(p_title)) NOT BETWEEN 1 AND 200 OR
     p_body IS NULL OR length(btrim(p_body)) NOT BETWEEN 1 AND 4000 OR
     p_sort_order IS NULL OR p_sort_order NOT BETWEEN 0 AND 100000 OR p_is_public IS NULL THEN
    RETURN jsonb_build_object('result','invalid'); END IF;
  IF NOT ((p_link_path IS NULL AND p_link_label IS NULL) OR
    (p_kind='faq' AND p_link_path IS NOT NULL AND p_link_path IN ('/programs','/schedule','/partnership','/contact') AND p_link_label IS NOT NULL AND length(btrim(p_link_label)) BETWEEN 1 AND 50)) THEN
    RETURN jsonb_build_object('result','invalid'); END IF;
  IF p_id IS NULL THEN
    IF p_revision IS NOT NULL THEN RETURN jsonb_build_object('result','invalid'); END IF;
    INSERT INTO academy.contents(kind,category,title,body,link_path,link_label,display_date,sort_order,is_public)
      VALUES(p_kind,btrim(p_category),btrim(p_title),btrim(p_body),p_link_path,CASE WHEN p_link_label IS NULL THEN NULL ELSE btrim(p_link_label) END,p_display_date,p_sort_order,p_is_public) RETURNING id,revision INTO v_id,v_revision;
  ELSE
    IF p_revision IS NULL OR p_revision<1 THEN RETURN jsonb_build_object('result','invalid'); END IF;
    UPDATE academy.contents SET category=btrim(p_category),title=btrim(p_title),body=btrim(p_body),link_path=p_link_path,link_label=CASE WHEN p_link_label IS NULL THEN NULL ELSE btrim(p_link_label) END,display_date=p_display_date,
      sort_order=p_sort_order,is_public=p_is_public,revision=revision+1,updated_at=clock_timestamp()
      WHERE id=p_id AND kind=p_kind AND revision=p_revision RETURNING id,revision INTO v_id,v_revision;
    IF v_id IS NULL THEN RETURN jsonb_build_object('result','conflict'); END IF;
  END IF;
  INSERT INTO academy.content_events(content_id,actor_id,revision) VALUES(v_id,p_actor_id,v_revision);
  RETURN jsonb_build_object('result','saved','id',v_id,'revision',v_revision);
END;
$function$;
REVOKE ALL ON FUNCTION public.academy_admin_list_contents(text,integer,uuid,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.academy_admin_save_content(uuid,integer,text,text,text,text,date,integer,boolean,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.academy_admin_list_contents(text,integer,uuid,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.academy_admin_save_content(uuid,integer,text,text,text,text,date,integer,boolean,uuid,text,text) TO service_role;
