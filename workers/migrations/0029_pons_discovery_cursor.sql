-- A Bulls App — Blockscout v2 keyset cursor for resumable Pons discovery.
-- Keeps historical discovery bounded without depending on the legacy Blockscout logs API.

ALTER TABLE pons_discovery_state ADD COLUMN cursor_json TEXT;
