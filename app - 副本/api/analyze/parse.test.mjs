import test from 'node:test';
import assert from 'node:assert/strict';
import {parseModelReport} from './parse.js';
test('accepts plain JSON, BOM and Markdown wrappers without altering quoted data',()=>{
 for(const text of ['{"name":"长鑫存储"}','\uFEFF{"name":"长鑫存储"}','```json\n{"name":"长鑫存储"}\n```'])assert.deepEqual(parseModelReport(text),{name:'长鑫存储'});
});
test('does not pretend truncated JSON or executable expressions are reports',()=>{
 for(const text of ['{"name":"长鑫','{"a":1,','(()=>({a:1}))()']) assert.throws(()=>parseModelReport(text));
});
