import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupJointRows, suggestClass, suggestStudent, buildJointPlan } from '../src/utils/jointImport';
import { persistRosterSnapshot, readRosterSnapshot } from '../src/utils/rosterStorage';
import type { ClassGroup, Student } from '../src/types';
const row = { 班级名称: '周六班', 教师: '张老师', 班级级别: 'BF1', '学年/学期': '秋', 姓名: '小明' };
const c: ClassGroup = { id: 'c1', name: '周六班', teacherName: '张老师', level: 'BF1', currentLevel: 'BF1', academicYear: '秋' };
const s: Student = { id: 's1', name: '小明', studentNo: '001', gender: 'male', classId: 'c1', currentLevel: 'BF1', enrolledDate: '2026-01-01', updatedAt: 1 };
const plan = (rows: any[], cs: ClassGroup[] = [], ss: Student[] = [], cc: any = {}, sc: any = {}) => buildJointPlan(rows, cs, ss, ['BF1', 'BF2'], cc, sc, 1000000000000);
const key = groupJointRows([row])[0].key;
test('creates class and students together with generated stable linkage and IDs', () => {
  const p = plan([row, { ...row, 姓名: '小红' }]); assert.deepEqual(p.errors, []);
  assert.equal(p.createdClasses, 1); assert.equal(p.createdStudents, 2);
  assert.equal(p.students[0].classId, p.classes[0].id); assert.notEqual(p.students[0].studentNo, p.students[1].studentNo);
});
test('same name different teacher requires decision; supports independent same-name class', () => {
  const r = { ...row, 教师: '李老师' }; const g = groupJointRows([r])[0];
  assert.equal(suggestClass(g, [c]), ''); assert.ok(plan([r], [c]).errors.length);
  const p = plan([r], [c], [], { [g.key]: { target: 'new' } }); assert.deepEqual(p.errors, []); assert.equal(p.classes.length, 2);
});
test('level conflict requires explicit field decision and scope, all scope updates outside roster', () => {
  const r = { ...row, 班级级别: 'BF2', 姓名: '新人' };
  assert.ok(plan([r], [c]).errors.length);
  const p = plan([r], [c], [s], { [key]: { target: 'c1', fields: { currentLevel: 'BF2' }, scope: 'all' } });
  assert.deepEqual(p.errors, []); assert.equal(p.students.find(x => x.id === 's1')!.currentLevel, 'BF2');
});
test('name-only match requires confirmation; repeated numbered import is a no-op', () => {
  assert.equal(suggestStudent(row, [s]), '');
  const r = { ...row, 学号: '001' }; const p = plan([r], [c], [s]);
  assert.deepEqual(p.errors, []); assert.equal(p.createdStudents, 0); assert.equal(p.updatedStudents, 0);
});
test('blank fields preserve data and differences require adopt decision', () => {
  const r = { ...row, 学号: '001', 联系电话: '', 备注: '新备注' };
  assert.ok(plan([r], [c], [s]).errors.length);
  const p = plan([r], [c], [{ ...s, contactPhone: '0123' }], {}, { 2: { target: 's1', adopt: true } });
  assert.deepEqual(p.errors, []); assert.equal(p.students[0].contactPhone, '0123'); assert.equal(p.students[0].notes, '新备注');
});
test('transfers and suspended restoration are explicit', () => {
  const old = { ...s, classId: 'other', status: 'suspended' as const }; const r = { ...row, 学号: '001' };
  assert.ok(plan([r], [c], [old]).errors.length);
  const p = plan([r], [c], [old], {}, { 2: { target: 's1', move: true, restore: true } }); assert.deepEqual(p.errors, []); assert.equal(p.students[0].status, 'active'); assert.equal(p.students[0].classId, 'c1');
});
test('duplicates and contradictory class levels block commit until resolved', () => {
  assert.ok(plan([row, row]).errors.length);
  assert.ok(plan([row, { ...row, 班级级别: 'BF2', 姓名: '另一人' }]).errors.length);
  const p = plan([row, row], [], [], {}, { 3: { target: 'skip' } }); assert.deepEqual(p.errors, []);
});
test('atomic roster write either persists both collections or leaves prior snapshot', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'); let stored = ''; let fail = false;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { setItem(_k: string, v: string) { if (fail) throw Error('quota'); stored = v; }, getItem() { return stored; } } });
  try { persistRosterSnapshot([c], [s]); const before = stored; fail = true; assert.throws(() => persistRosterSnapshot([], [])); assert.equal(stored, before); assert.deepEqual(readRosterSnapshot()!.students, [s]); }
  finally { if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete (globalThis as any).localStorage; }
});
