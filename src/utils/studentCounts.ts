import type { Student } from '../types';
export function studentCounts(students: Student[]) {
  const registered = students.filter(s => !s.isDeleted);
  return {
    totalStudentsCount: registered.length,
    activeStudentsCount: registered.filter(s => s.status !== 'suspended').length,
  };
}
