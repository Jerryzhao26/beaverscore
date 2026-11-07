import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as X from 'xlsx';
import { createRosterExport, createRosterWorkbook } from '../src/utils/rosterExport';
import { mergeData } from '../src/utils/gistSync';
import type { ClassGroup, Student } from '../src/types';
const classes: ClassGroup[] = [{ id: 'c1', name: '一班', level: 'BF1', teacherName: '张老师', updatedAt: 100 }];
const students: Student[] = [{ id: 's1', name: '=张三', studentNo: '0001', gender: 'female', classId: 'c1', currentLevel: 'BF1', enrolledDate: '2026-11-07', contactPhone: '01380000000', updatedAt: 200 }, { id: 's2', name: '李四', studentNo: '0002', gender: 'male', classId: '', previousClassId: 'c1', currentLevel: 'BF1', enrolledDate: '', status: 'suspended', suspendReason: '暂休', parentNote: '保留备注' }];
test('JSON roster retains identity and suspension fields without scores or credentials', () => {
  const data = createRosterExport([...classes, { ...classes[0], id: 'deleted', isDeleted: true }], [...students, { ...students[0], id: 'deleted', isDeleted: true }], ['BF1'], ['张老师'], '2026-11-07T00:00:00Z');
  const parsed = JSON.parse(JSON.stringify(data));
  assert.deepEqual(parsed.students, students); assert.deepEqual(parsed.classes, classes);
  assert.equal(parsed.students[1].previousClassId, 'c1');
  assert.ok(!('scoreRecords' in parsed)); assert.ok(!('token' in parsed));
  const merged = mergeData([{ ...students[0], updatedAt: 1, name: '旧姓名' }], parsed.students);
  assert.equal(merged.length, 2); assert.equal(merged.find(s => s.id === 's1')?.name, '=张三');
});
test('workbook round-trip retains text numbers, safe strings and class associations', () => {
  const book = createRosterWorkbook(X, createRosterExport(classes, students, [], []));
  const parsed = X.read(X.write(book, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer' });
  assert.deepEqual(parsed.SheetNames, ['班级', '学生', '使用说明']);
  const rows = X.utils.sheet_to_json<Record<string, string>>(parsed.Sheets['学生']);
  assert.equal(rows[0]['学号'], '0001'); assert.equal(rows[0]['联系电话'], '01380000000');
  assert.equal(rows[0]['班级'], '一班'); assert.equal(rows[1]['状态'], '停学'); assert.equal(rows[1]['原班级ID'], 'c1');
  assert.equal(parsed.Sheets['学生'].A2.t, 's'); assert.equal(parsed.Sheets['学生'].A2.f, undefined);
});
test('empty roster still provides labeled worksheets', () => {
  const book = createRosterWorkbook(X, createRosterExport([], [], [], []));
  assert.equal(book.Sheets['学生'].A1.v, '姓名'); assert.equal(book.Sheets['班级'].A1.v, '班级名称');
});
