import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizePerformanceRounds } from './intelligence-simulations.mjs';

test('performance snapshot uses only complete known-basis closed cycles',()=>{
  const summary=summarizePerformanceRounds([
    {status:'closed',coverage:'complete',buy_sol:10,matched_realized_sol:5,exit_ts:1},
    {status:'closed',coverage:'complete',buy_sol:20,matched_realized_sol:-4,exit_ts:2},
    {status:'closed',coverage:'complete',buy_sol:10,matched_realized_sol:0,exit_ts:3},
    {status:'closed',coverage:'partial',buy_sol:10,matched_realized_sol:100,exit_ts:4},
    {status:'closed',coverage:'complete',buy_sol:null,matched_realized_sol:8,exit_ts:5},
    {status:'open',coverage:'complete',buy_sol:5,matched_realized_sol:9,exit_ts:6},
  ],{periodDays:30});
  assert.equal(summary.realized_sol,1);
  assert.equal(summary.eligible_cycles,3);
  assert.equal(summary.closed_cycles,5);
  assert.equal(summary.excluded_cycles,2);
  assert.equal(summary.wins,1);
  assert.equal(summary.losses,1);
  assert.equal(summary.breakevens,1);
  assert.ok(Math.abs(summary.win_rate_pct-(100/3))<1e-9);
  assert.equal(summary.profit_factor,1.25);
  assert.equal(summary.median_roi_pct,0);
  assert.equal(summary.average_win_sol,5);
  assert.equal(summary.average_loss_sol,4);
  assert.equal(summary.realized_drawdown_sol,4);
  assert.equal(summary.excluding_best_sol,-4);
  assert.equal(summary.no_observed_losses,false);
});

test('performance snapshot labels no-loss profit factor unavailable instead of infinity',()=>{
  const summary=summarizePerformanceRounds([
    {status:'closed',coverage:'complete',buy_sol:10,matched_realized_sol:5,exit_ts:1},
    {status:'closed',coverage:'complete',buy_sol:20,matched_realized_sol:2,exit_ts:2},
  ]);
  assert.equal(summary.profit_factor,null);
  assert.equal(summary.no_observed_losses,true);
  assert.equal(summary.realized_sol,7);
});

test('performance snapshot never turns unknown basis into profit',()=>{
  const summary=summarizePerformanceRounds([
    {status:'closed',coverage:'complete',buy_sol:null,matched_realized_sol:20,exit_ts:1},
  ]);
  assert.equal(summary.realized_sol,null);
  assert.equal(summary.eligible_cycles,0);
  assert.equal(summary.excluded_cycles,1);
});
