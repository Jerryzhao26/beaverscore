import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareRosterImport } from '../src/utils/rosterImport';
import type { ClassGroup, Student } from '../src/types';
const classes: ClassGroup[] = [{ id: 'c1', name: '一班', level: 'BF1', teacherName: '王老师' }];
const row = { 姓名: '张三', 学号: '0001', 班级: '一班', 性别: '男' };
const prepare = (rows: any[], existing: Student[] = [], cs = classes) => prepareRosterImport('students', rows, cs, existing, ['BF1'], '2026-11-07');
test('preserves student number and inherits class level', () => {
  const result = prepare([row]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.newStudents[0].studentNo, '0001');
  assert.equal(result.newStudents[0].classId, 'c1');
  assert.equal(result.newStudents[0].currentLevel, 'BF1');
});
test('rejects unmatched, partial and ambiguous class names', () => {
  assert.equal(prepare([{ ...row, 班级: '一' }]).errors.length, 1);
  assert.equal(prepare([row], [], [...classes, { ...classes[0], id: 'c2' }]).errors.length, 1);
});
test('rejects duplicate numbers within workbook and existing roster', () => {
  assert.equal(prepare([row, row]).errors.length, 1);
  assert.equal(prepare([row], [{ studentNo: '0001' } as Student]).errors.length, 1);
});
test('rejects missing fields, invalid gender, level and date', () => {
  for (const change of [{ 学号: '' }, { 姓名: '' }, { 性别: '' }, { 级别: 'BAD' }, { 入学日期: '2026-02-30' }]) assert.equal(prepare([{ ...row, ...change }]).errors.length, 1);
});
test('class import detects duplicates and requires teacher and level', () => {
  const valid = { 班级名称: '二班', 级别: 'BF1', 教师: '李老师' };
  const run = (rows: any[]) => prepareRosterImport('classes', rows, classes, [], ['BF1']);
  assert.equal(run([valid]).newClasses.length, 1);
  assert.equal(run([valid, valid]).errors.length, 1);
  assert.equal(run([{ ...valid, 教师: '' }]).errors.length, 1);
  assert.equal(run([{ ...valid, 班级名称: '一班' }]).errors.length, 1);
});
test('empty input reports error and ignores blank rows', () => {
  assert.equal(prepare([]).errors.length, 1);
  assert.equal(prepare([{}, row]).newStudents.length, 1);
});
test('CSV text fields retain leading zeros through workbook parsing', async () => {
  const X = await import('xlsx');
  const book = X.read('姓名,学号,班级,性别,联系电话\n张三,0001,一班,男,01380000000', { type: 'string', raw: true });
  const rows = X.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[book.SheetNames[0]], { raw: false, defval: '' });
  const result = prepare(rows);
  assert.equal(result.newStudents[0].studentNo, '0001');
  assert.equal(result.newStudents[0].contactPhone, '01380000000');
});
