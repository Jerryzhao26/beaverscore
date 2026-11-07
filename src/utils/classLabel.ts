import type { ClassGroup } from '../types';
export function classLabel(cls?: Partial<ClassGroup>, fallback = '未分班'): string {
  if (!cls) return fallback;
  return [cls.name || '未命名班级', cls.teacherName || '未填教师', cls.currentLevel || cls.level || '未填级别', cls.academicYear].filter(Boolean).join(' · ');
}
