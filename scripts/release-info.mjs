import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const commit=process.env.GITHUB_SHA || execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
writeFileSync('public/release.json',JSON.stringify({commit,builtAt:new Date().toISOString()})+'\n');
