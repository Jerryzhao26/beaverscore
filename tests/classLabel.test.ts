import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classLabel } from '../src/utils/classLabel';
test('same-name classes show teacher, current level and term', () => {
  const a = { name: '260905', teacherName: '张老师', level: 'BF1', currentLevel: 'BF2', academicYear: '2026秋' };
  const b = { ...a, teacherName: '李老师', currentLevel: 'E1' };
  assert.equal(classLabel(a), '260905 · 张老师 · BF2 · 2026秋');
  assert.notEqual(classLabel(a), classLabel(b));
  assert.equal(classLabel(undefined), '未分班');
});
