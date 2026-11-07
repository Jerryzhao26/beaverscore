import type { ClassGroup, Student } from '../types';
export type ImportKind = 'classes' | 'students';
export type Row = Record<string, unknown>;
export function prepareRosterImport(kind: ImportKind, rows: Row[], classes: ClassGroup[], students: Student[], levels: string[], today = new Date().toLocaleDateString('sv-SE')) {
  const errors: string[] = [];
  const newClasses: Omit<ClassGroup, 'id'>[] = [];
  const newStudents: Omit<Student, 'id'>[] = [];
  const names = new Set(classes.filter(c => !c.isDeleted).map(c => c.name.trim()));
  const numbers = new Set(students.filter(s => !s.isDeleted).map(s => s.studentNo.trim()));
  const value = (row: Row, ...keys: string[]) => {
    for (const key of keys) if (row[key] !== undefined && String(row[key]).trim()) return String(row[key]).trim();
    return '';
  };
  rows.forEach((row, i) => {
    if (Object.values(row).every(v => !String(v ?? '').trim())) return;
    const fail = (message: string) => errors.push(`第 ${i + 2} 行：${message}`);
    const name = value(row, ...(kind === 'classes' ? ['班级名称', '班级', 'className'] : ['姓名', '学员姓名', 'Name', 'studentName']));
    const level = value(row, '级别', 'level');
    if (!name) return fail(kind === 'classes' ? '缺少班级名称' : '缺少姓名');
    if (level && !levels.includes(level)) return fail(`未知级别 ${level}，请先在系统配置添加`);
    if (kind === 'classes') {
      const teacherName = value(row, '教师', '老师', 'teacherName');
      if (!level || !teacherName) return fail('级别和教师必填');
      if (names.has(name)) return fail(`班级名称重复：${name}`);
      names.add(name);
      newClasses.push({ name, level, currentLevel: level, teacherName, academicYear: value(row, '学年', 'academicYear') });
    } else {
      const studentNo = value(row, '学号', 'studentNo');
      const className = value(row, '班级', '班级名称', 'className');
      const matches = classes.filter(c => !c.isDeleted && c.name.trim() === className);
      const gender = value(row, '性别', 'gender');
      if (!studentNo) return fail('学号必填（请将学号列设为文本以保留前导零）');
      if (numbers.has(studentNo)) return fail(`学号重复：${studentNo}`);
      if (matches.length !== 1) return fail(`班级不存在或重名：${className || '未填写'}，请先导入班级`);
      if (!['男', '女', 'male', 'female'].includes(gender)) return fail('性别须为男、女、male 或 female');
      const enrolledDate = value(row, '入学日期', 'enrolledDate') || today;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(enrolledDate) || !Number.isFinite(Date.parse(enrolledDate)) || new Date(enrolledDate).toISOString().slice(0, 10) !== enrolledDate) return fail('入学日期须为有效的 YYYY-MM-DD 文本');
      numbers.add(studentNo);
      newStudents.push({ name, studentNo, gender: ['女', 'female'].includes(gender) ? 'female' : 'male', classId: matches[0].id, currentLevel: level || matches[0].currentLevel || matches[0].level, enrolledDate, status: 'active', contactPhone: value(row, '联系电话', '手机号', 'contactPhone'), schoolGrade: value(row, '公校年级', 'schoolGrade'), notes: value(row, '备注', 'notes') });
    }
  });
  if (!newClasses.length && !newStudents.length && !errors.length) errors.push('表格为空或没有可导入的数据');
  return { newClasses, newStudents, errors };
}
