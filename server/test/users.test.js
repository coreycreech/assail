import 'express-async-errors';
import express from 'express';
import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { registerUsers } from '../src/users.js';

test('user administration permissions, CRUD, password handling, and validation', async () => {
  const rows = new Map([[1, {userId:1,userName:'admin',userTypeId:1}], [2,{userId:2,userName:'staff',userTypeId:2}]]);
  let sequence = 2;
  const types = new Map([[1,{userTypeId:1,userTypeDesc:'Admin'}],[2,{userTypeId:2,userTypeDesc:'Staff'}]]);
  let typeSequence=2;
  const pool = {query: async (sql, args=[]) => {
    if(sql.startsWith('SELECT userTypeId FROM User WHERE')) return [[rows.get(args[0])].filter(Boolean)];
    if(sql.startsWith('SELECT userId FROM User WHERE userTypeId')) return [[...rows.values()].filter(r=>r.userTypeId===args[0])];
    if(sql.includes('FROM UserType') && sql.startsWith('SELECT')) return [[...types.values()].filter(t=>!args.length || (sql.includes('userTypeDesc =') ? t.userTypeDesc===args[0] && t.userTypeId!==args[1] : t.userTypeId===args[0]))];
    if(sql.startsWith('INSERT INTO UserType')) {const userTypeId=++typeSequence;types.set(userTypeId,{userTypeId,userTypeDesc:args[0]});return [{insertId:userTypeId}];}
    if(sql.startsWith('UPDATE UserType')) {types.get(args[1]).userTypeDesc=args[0];return [{affectedRows:1}];}
    if(sql.startsWith('DELETE FROM UserType')) return [{affectedRows:Number(types.delete(args[0]))}];
    if(sql.startsWith('SELECT userId FROM User WHERE userName')) return [[...rows.values()].filter(r=>r.userName===args[0] && r.userId!==args[1])];
    if(sql.startsWith('SELECT userId FROM User WHERE userId')) return [[rows.get(args[0])].filter(Boolean)];
    if(sql.startsWith('SELECT userId, userName')) return [[...rows.values()].filter(r=>!args.length || r.userId===args[0]).map(({password,...r})=>r)];
    if(sql.startsWith('INSERT')) { const userId=++sequence;rows.set(userId,{...args[0],userId});return [{insertId:userId}]; }
    if(sql.startsWith('UPDATE')) { Object.assign(rows.get(args[1]),args[0]);return [{affectedRows:1}]; }
    if(sql.startsWith('DELETE')) return [{affectedRows:Number(rows.delete(args[0]))}];
    throw new Error('Unexpected query: '+sql);
  }};
  const app=express();app.use(express.json());
  registerUsers(app,pool,(req,res,next)=>{req.authUserId=Number(req.headers['x-test-user']);if(!req.authUserId)return res.sendStatus(401);next();});
  app.use((error,_req,res,_next)=>res.status(error.status || 500).json({message:error.message}));
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const call=async(method,path,body,user=1)=>{
    const response=await fetch(`http://127.0.0.1:${server.address().port}${path}`,{method,headers:{'Content-Type':'application/json','x-test-user':String(user)},body:body && method!=='GET'?JSON.stringify(body):undefined});
    const text=await response.text();return {status:response.status,body:text.startsWith('{') || text.startsWith('[')?JSON.parse(text):text};
  };
  try {
    assert.equal((await call('GET','/api/users',null,0)).status,401);
    for(const [method,path] of [['GET','/api/users'],['GET','/api/user-types'],['POST','/api/users'],['PUT','/api/users/1'],['DELETE','/api/users/1']]) assert.equal((await call(method,path,{},2)).status,403);
    const draft={userName:'new',userTypeId:2,email:'new@example.com',firstName:'New',lastName:'User',password:'a-long-test-password'};
    const {userTypeId: omittedRole, ...withoutRole} = draft;
    const defaultUser = await call('POST','/api/users',{...withoutRole,userName:'default-staff'});
    assert.equal(defaultUser.status,201);
    assert.equal(defaultUser.body.userTypeId,2);
    const explicitAdmin = await call('POST','/api/users',{...draft,userName:'explicit-admin',userTypeId:1});
    assert.equal(explicitAdmin.status,201);
    assert.equal(explicitAdmin.body.userTypeId,1);
    assert.equal((await call('PUT','/api/users/'+defaultUser.body.userId,{...withoutRole,password:''})).status,400);
    assert.equal((await call('POST','/api/users',{...draft,password:'short'})).status,400);
    assert.equal((await call('POST','/api/users',{...draft,userTypeId:99})).status,400);
    const created=await call('POST','/api/users',draft);assert.equal(created.status,201);assert.ok(!('password' in created.body));
    const id=created.body.userId, hash=rows.get(id).password;assert.ok(await bcrypt.compare(draft.password,hash));
    assert.equal((await call('POST','/api/users',draft)).status,409);
    assert.equal((await call('PUT',`/api/users/${id}`,{...draft,password:'',firstName:'Edited'})).status,200);
    assert.equal(rows.get(id).password,hash);
    assert.equal((await call('PUT',`/api/users/${id}`,{...draft,password:'new-long-test-password'})).status,200);
    assert.ok(await bcrypt.compare('new-long-test-password',rows.get(id).password));
    assert.equal((await call('PUT','/api/users/1',{...draft,userName:'admin',password:''})).status,403);
    assert.equal((await call('PUT','/api/users/1',{...draft,userName:'admin',userTypeId:1,password:''})).status,403);
    assert.equal(rows.get(1).userTypeId,1);
    assert.equal((await call('DELETE','/api/users/1')).status,400);
    assert.equal((await call('DELETE',`/api/users/${id}`)).status,204);
    assert.equal((await call('GET','/api/users',null,id)).status,403);
    assert.equal((await call('DELETE',`/api/users/${id}`)).status,404);
    assert.equal((await call('DELETE','/api/users/invalid')).status,400);
    assert.equal((await call('POST','/api/user-types',{userTypeDesc:'Extra'},2)).status,403);
    assert.equal((await call('POST','/api/user-types',{userTypeDesc:' '})).status,400);
    const type=await call('POST','/api/user-types',{userTypeDesc:'Extra'});assert.equal(type.status,201);
    const tid=type.body.userTypeId;
    assert.equal((await call('POST','/api/user-types',{userTypeDesc:'Extra'})).status,409);
    assert.equal((await call('PUT','/api/user-types/'+tid,{userTypeDesc:'Updated'})).status,200);
    rows.get(2).userTypeId=tid;
    assert.equal((await call('DELETE','/api/user-types/'+tid)).status,409);
    rows.get(2).userTypeId=2;
    assert.equal((await call('DELETE','/api/user-types/'+tid)).status,204);
    assert.equal((await call('DELETE','/api/user-types/'+tid)).status,404);
    for(const id of [1,2]) {
      assert.equal((await call('DELETE','/api/user-types/'+id)).status,400);
      assert.equal((await call('PUT','/api/user-types/'+id,{userTypeDesc:'Changed'})).status,400);
    }
  } finally { server.closeAllConnections();await new Promise(resolve=>server.close(resolve)); }
});

