import test from 'node:test';
import assert from 'node:assert/strict';
import {productionConfigFailures} from './verify-production-config.mjs';

const valid=`main = "worker-vnext-entry.mjs"
[vars]
ALLOWED_ORIGINS = "https://abullsapp.com,https://www.abullsapp.com"
UNIVERSE_ENABLED = "true"
TRICKSTER_STUDIO_ENABLED = "true"
PLAYABLE_DATA_ENABLED = "true"
INTELLIGENCE_MESH_ENABLED = "true"
INTELLIGENCE_EXTERNAL_RETRIEVAL_ENABLED = "false"
INTELLIGENCE_SUBSTREAMS_HISTORY_ENABLED = "false"
INTELLIGENCE_OLD_FAITHFUL_HISTORY_ENABLED = "false"
[[d1_databases]]
binding = "LEADERBOARD_DB"
database_id = "12345678-abcd-1234-abcd-1234567890ab"
[[ratelimits]]
name = "RATE_LIMITER"
namespace_id = "1001"
[ratelimits.simple]
limit = 60
period = 60
[observability]
enabled = true`;

test('accepts a resolved fail-closed first-release configuration',()=>assert.deepEqual(productionConfigFailures(valid),[]));
test('rejects account placeholders before deployment',()=>assert.ok(productionConfigFailures(valid.replace('1001','<YOUR_NAMESPACE_ID>')).includes('placeholder_values_present')));
test('rejects optional historical transports enabled without provider verification',()=>assert.ok(productionConfigFailures(valid.replace('INTELLIGENCE_OLD_FAITHFUL_HISTORY_ENABLED = "false"','INTELLIGENCE_OLD_FAITHFUL_HISTORY_ENABLED = "true"')).includes('intelligence_old_faithful_history_enabled_not_fail_closed')));
