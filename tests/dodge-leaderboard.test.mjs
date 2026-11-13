import test from 'node:test'
import assert from 'node:assert/strict'
import { registerScore, cleanEntries, normalizeName } from '../public/games/dodge-leaderboard.mjs'
test('top five ordered by score; earlier equal scores win',()=>{
 let rows=[]
 for(let i=1;i<=7;i++)rows=registerScore(rows,`도전자${i}`,i*100,i).entries
 assert.deepEqual(rows.map(r=>r.score),[700,600,500,400,300])
 assert.equal(registerScore(rows,'새도전자',300,100).rank,0)
})
test('a name has only its highest score, lower scores and ties preserve original record',()=>{
 let rows=registerScore([],'대욱',1000,1).entries
 rows=registerScore(rows,'대욱',500,2).entries;assert.equal(rows.length,1);assert.equal(rows[0].score,1000)
 rows=registerScore(rows,'대욱',1000,3).entries;assert.equal(rows[0].at,1)
 rows=registerScore(rows,'대욱',2000,4).entries;assert.equal(rows[0].score,2000);assert.equal(rows[0].at,4)
})
test('name normalization and validation prevent empty names and markup',()=>{
 assert.equal(normalizeName('  플레이   미  '),'플레이 미')
 for(const name of ['','   ','<img src=x>','a'.repeat(13)])assert.throws(()=>normalizeName(name))
 assert.equal(registerScore(registerScore([],'PLAYER',10,1).entries,'player',20,2).entries.length,1)
})
test('invalid stored data and out-of-range scores are rejected',()=>{
 assert.deepEqual(cleanEntries(null),[])
 assert.deepEqual(cleanEntries([{name:'가짜',score:99999,at:1}]),[])
 for(const score of [0,-1,3001,1.5,NaN])assert.throws(()=>registerScore([],'이름',score))
})
