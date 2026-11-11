-- Disposable-schema rollback candidate. The caller must use one transaction.
-- After any real collection, stop writes, preserve records, and review a forward fix.
-- Never remove collected applications by bypassing this guard or using CASCADE.
DO $rollback_guard$
BEGIN
  IF EXISTS (SELECT 1 FROM academy.application_notices) OR
     EXISTS (SELECT 1 FROM academy.applications) OR
     EXISTS (SELECT 1 FROM academy.application_private) OR
     EXISTS (SELECT 1 FROM academy.application_status_events) THEN
    RAISE EXCEPTION 'B04 rollback requires all candidate tables to be empty' USING ERRCODE = '55000';
  END IF;
END;
$rollback_guard$;

DROP TABLE academy.application_status_events;
DROP TABLE academy.application_private;
DROP TABLE academy.applications;
DROP TABLE academy.application_notices;
