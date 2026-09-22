import test from "node:test";
import assert from "node:assert/strict";
import { afterbellOwnerDeltas, __afterbellEvidenceContract } from "./intelligence-afterbell-evidence.mjs";

const STOCK="Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh";
const USDC="EPjFWdd5AufqSSqeM2q8vMLQV4G7wEGGkZwyTDt1v";
const WALLET="9P6Ej2CRTDYMW9628wXA8awM1t82jnfynYNNPSVx7pfU";

const balance=(accountIndex,mint,owner,amount)=>({accountIndex,mint,owner,uiTokenAmount:{uiAmountString:String(amount)}});

test("Afterbell evidence decoder keeps swap-like xStock owner deltas",()=>{
 const tx={meta:{preTokenBalances:[balance(1,STOCK,WALLET,1),balance(2,USDC,WALLET,1000)],postTokenBalances:[balance(1,STOCK,WALLET,2),balance(2,USDC,WALLET,800)]}};
 assert.deepEqual(afterbellOwnerDeltas(tx,STOCK),[{owner:WALLET,delta:1}]);
});

test("Afterbell evidence decoder rejects one-sided transfers as trades",()=>{
 const tx={meta:{preTokenBalances:[balance(1,STOCK,WALLET,1)],postTokenBalances:[balance(1,STOCK,WALLET,2)]}};
 assert.deepEqual(afterbellOwnerDeltas(tx,STOCK),[]);
 assert.equal(__afterbellEvidenceContract.syntheticTrades,false);
 assert.ok(__afterbellEvidenceContract.defaultAssetsPerRun<=__afterbellEvidenceContract.maxAssetsPerRun);
});
