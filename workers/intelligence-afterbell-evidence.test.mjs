import test from "node:test";
import assert from "node:assert/strict";
import { afterbellOwnerDeltas, shouldRefreshAfterbell, __afterbellEvidenceContract } from "./intelligence-afterbell-evidence.mjs";

const STOCK="Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh";
const USDC="EPjFWdd5AufqSSqeM2q8vMLQV4G7wEGGkZwyTDt1v";
const WALLET="9P6Ej2CRTDYMW9628wXA8awM1t82jnfynYNNPSVx7pfU";
const POOL="So11111111111111111111111111111111111111112";

const balance=(accountIndex,mint,owner,amount)=>({accountIndex,mint,owner,uiTokenAmount:{uiAmountString:String(amount)}});
const signedTx=(preTokenBalances,postTokenBalances)=>({transaction:{message:{accountKeys:[{pubkey:WALLET,signer:true},{pubkey:POOL,signer:false}]}},meta:{preTokenBalances,postTokenBalances}});

test("Afterbell evidence decoder keeps signer-owned swap-like xStock deltas",()=>{
 const tx=signedTx([balance(1,STOCK,WALLET,1),balance(2,USDC,WALLET,1000)],[balance(1,STOCK,WALLET,2),balance(2,USDC,WALLET,800)]);
 assert.deepEqual(afterbellOwnerDeltas(tx,STOCK),[{owner:WALLET,delta:1}]);
});

test("Afterbell evidence decoder rejects one-sided transfers and non-signer pool authorities",()=>{
 const transfer=signedTx([balance(1,STOCK,WALLET,1)],[balance(1,STOCK,WALLET,2)]);
 assert.deepEqual(afterbellOwnerDeltas(transfer,STOCK),[]);
 const poolOnly={transaction:{message:{accountKeys:[{pubkey:WALLET,signer:true},{pubkey:POOL,signer:false}]}},meta:{preTokenBalances:[balance(1,STOCK,POOL,10),balance(2,USDC,POOL,1000)],postTokenBalances:[balance(1,STOCK,POOL,9),balance(2,USDC,POOL,1100)]}};
 assert.deepEqual(afterbellOwnerDeltas(poolOnly,STOCK),[]);
});

test("Afterbell archive refresh is after-close weekday only and credit bounded",()=>{
 assert.equal(shouldRefreshAfterbell(Date.UTC(2026,8,22,22,0,0)),true);
 assert.equal(shouldRefreshAfterbell(Date.UTC(2026,8,22,16,0,0)),false);
 assert.equal(shouldRefreshAfterbell(Date.UTC(2026,8,26,22,0,0)),false);
 assert.equal(__afterbellEvidenceContract.syntheticTrades,false);
 assert.equal(__afterbellEvidenceContract.queriesPoolAddress,true);
 assert.equal(__afterbellEvidenceContract.signerOnly,true);
 assert.equal(__afterbellEvidenceContract.maxSupportedTransactionVersion,1);
 assert.equal(__afterbellEvidenceContract.defaultAssetsPerRun,1);
 assert.ok(__afterbellEvidenceContract.defaultAssetsPerRun<=__afterbellEvidenceContract.maxAssetsPerRun);
});
