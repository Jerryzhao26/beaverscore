import { test } from 'node:test';
import assert from 'node:assert/strict';
import { studentCounts } from '../src/utils/studentCounts';
import type { Student } from '../src/types';
const s = { id: 's1', name: '学生', studentNo: '001', gender: 'male', classId: '', currentLevel: 'BF1', enrolledDate: '' } as Student;
test('registered includes suspended; active includes legacy and unassigned students but excludes deleted', () => {
  assert.deepEqual(studentCounts([s, { ...s, status: 'active' }, { ...s, status: 'suspended' }, { ...s, status: 'active', isDeleted: true }, { ...s, status: 'suspended', isDeleted: true }]), { totalStudentsCount: 3, activeStudentsCount: 2 });
});
test('fresh snapshots reflect suspension, restoration, deletion and zero results', () => {
  assert.deepEqual(studentCounts([{ ...s, status: 'suspended' }]), { totalStudentsCount: 1, activeStudentsCount: 0 });
  assert.equal(studentCounts([{ ...s, status: 'active' }]).activeStudentsCount, 1);
  assert.deepEqual(studentCounts([{ ...s, isDeleted: true }]), { totalStudentsCount: 0, activeStudentsCount: 0 });
  assert.deepEqual(studentCounts([]), { totalStudentsCount: 0, activeStudentsCount: 0 });
});
