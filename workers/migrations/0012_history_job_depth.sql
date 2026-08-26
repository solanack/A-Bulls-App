-- A Bulls App — persist requested history window for source-aware retrieval.
-- Additive only. Existing jobs remain valid with NULL request boundaries.

ALTER TABLE intelligence_index_jobs ADD COLUMN requested_from INTEGER;
ALTER TABLE intelligence_index_jobs ADD COLUMN requested_to INTEGER;

CREATE INDEX IF NOT EXISTS idx_intelligence_index_jobs_requested_window
  ON intelligence_index_jobs(requested_from, requested_to, state);
