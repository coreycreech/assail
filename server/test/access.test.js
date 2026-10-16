import test from 'node:test';
import assert from 'node:assert/strict';
import { apiAccess } from '../src/access.js';

test('API access matrix checks current database roles, public content, and deleted users', async () => {
  const check = (role,path,method='GET') => new Promise((resolve,reject) => {
    const pool={query:async()=>[role===null?[]:[{userTypeId:role}]]};
    const auth=(req,res,next)=>role===undefined?res.status(401).json({}):next();
    const res={status(code){this.code=code;return this;},json(){resolve(this.code);}};
    apiAccess(pool,auth)({path,method,authUserId:1},res,error=>error?reject(error):resolve(200));
  });
  for(const role of [undefined,1,2,3]) {
    assert.equal(await check(role,'/pages'),200);
    assert.equal(await check(role,'/public/resources'),200);
    assert.equal(await check(role,'/pages/1/sections'),200);
    assert.equal(await check(role,'/auth/login','POST'),200);
  }
  for(const path of ['/events','/billing/1','/clients','/services','/documents/1/download']) {
    for(const method of ['GET','POST','PUT','DELETE']) {
      assert.equal(await check(1,path,method),200);
      assert.equal(await check(2,path,method),200);
      assert.equal(await check(3,path,method),403);
      assert.equal(await check(undefined,path,method),401);
      assert.equal(await check(null,path,method),401);
    }
  }
  for(const path of ['/users','/user-types','/page-section-images','/sections/1']) {
    for(const method of ['GET','POST','PUT','DELETE']) {
      assert.equal(await check(1,path,method),200);
      assert.equal(await check(2,path,method),403);
    }
  }
  assert.equal(await check(2,'/resources'),200);
  assert.equal(await check(undefined,'/resources'),401);
  for(const method of ['POST','PUT','DELETE']) {
    assert.equal(await check(1,'/resources/1',method),200);
    assert.equal(await check(2,'/resources/1',method),403);
    assert.equal(await check(undefined,'/public/resources',method),401);
    assert.equal(await check(1,'/pages/1/sections',method),200);
    assert.equal(await check(2,'/pages/1/sections',method),403);
  }
});
