/* Intelligence Mesh operational read models: Demand Engine, gaps, and index jobs. */

import { intelligenceDb } from './intelligence-indexer.mjs';

const s=v=>String(v==null?'':v).trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
async function all(stmt){try{const r=await stmt.all();return r?.results||[]}catch{return[]}}

export async function demandPatterns(env={},limit=50){
  const db=intelligenceDb(env); if(!db) return [];
  const rows=await all(db.prepare(`
    SELECT pattern_key,feature,scope_type,scope_value,request_count,avg_cost_ms,last_requested_at,
      priority_score,materialization_state,updated_at
    FROM intelligence_demand_patterns ORDER BY priority_score DESC,last_requested_at DESC LIMIT ?
  `).bind(Math.max(1,Math.min(200,n(limit)||50))));
  return rows.map(row=>({
    ...row,
    suggestedAction:n(row.priority_score)>=250?'materialize':n(row.priority_score)>=75?'precompute':'observe'
  }));
}

export async function openGaps(env={},limit=100){
  const db=intelligenceDb(env); if(!db) return [];
  return all(db.prepare(`SELECT id,source,start_slot,end_slot,state,detected_at,repaired_at,verification_json FROM intelligence_slot_gaps WHERE state<>'repaired' ORDER BY detected_at ASC LIMIT ?`).bind(Math.max(1,Math.min(500,n(limit)||100))));
}

export async function indexJobs(env={},wallet='',limit=50){
  const db=intelligenceDb(env); if(!db) return [];
  if(s(wallet)) return all(db.prepare(`SELECT id,wallet,job_type,state,cursor_before,page_size,pages_completed,signatures_seen,transactions_ingested,source,last_error,next_attempt_at,created_at,updated_at FROM intelligence_index_jobs WHERE wallet=? ORDER BY updated_at DESC LIMIT ?`).bind(s(wallet),Math.max(1,Math.min(100,n(limit)||50))));
  return all(db.prepare(`SELECT id,wallet,job_type,state,cursor_before,page_size,pages_completed,signatures_seen,transactions_ingested,source,last_error,next_attempt_at,created_at,updated_at FROM intelligence_index_jobs ORDER BY updated_at DESC LIMIT ?`).bind(Math.max(1,Math.min(100,n(limit)||50))));
}
