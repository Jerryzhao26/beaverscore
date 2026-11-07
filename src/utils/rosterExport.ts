import type { ClassGroup, Student } from '../types';
import type * as SheetJS from 'xlsx';

export function createRosterExport(classes: ClassGroup[], students: Student[], levels: string[], teachers: string[], exportedAt = new Date().toISOString()) {
  return {
    format: 'beaverscore-roster', version: 1, exportedAt,
    classes: classes.filter(c => !c.isDeleted).map(c => ({ ...c })),
    students: students.filter(s => !s.isDeleted).map(s => ({ ...s })),
    levels: [...levels], teachers: [...teachers],
  };
}

export function createRosterWorkbook(X: typeof SheetJS, data: ReturnType<typeof createRosterExport>) {
  const names = new Map(data.classes.map(c => [c.id, c.name]));
  const classRows = data.classes.map(c => ({
    班级名称: c.name, 级别: c.currentLevel || c.level, 教师: c.teacherName, 学年: c.academicYear || '',
    班级ID: c.id, 更新时间: c.updatedAt ? new Date(c.updatedAt).toISOString() : '',
  }));
  const studentRows = data.students.map(s => ({
    姓名: s.name, 学号: s.studentNo, 性别: s.gender === 'female' ? '女' : s.gender === 'male' ? '男' : '',
    班级: names.get(s.classId) || '', 教师: data.classes.find(c => c.id === s.classId)?.teacherName || '', '学年/学期': data.classes.find(c => c.id === s.classId)?.academicYear || '', 班级级别: data.classes.find(c => c.id === s.classId)?.currentLevel || data.classes.find(c => c.id === s.classId)?.level || '', 学生级别: s.currentLevel, 级别: s.currentLevel, 联系电话: s.contactPhone || s.phone || '',
    入学日期: s.enrolledDate, 公校年级: s.schoolGrade || '', 备注: s.notes || '',
    状态: s.status === 'suspended' ? '停学' : '在读', 学生ID: s.id, 班级ID: s.classId,
    停学日期: s.suspendedAt || '', 停学原因: s.suspendReason || '',
    原班级: names.get(s.previousClassId || '') || '', 原班级ID: s.previousClassId || '',
    家长联系: s.parentContact || '', 家长备注: s.parentNote || '', 原联系电话: s.phone || '',
    更新时间: s.updatedAt ? new Date(s.updatedAt).toISOString() : '',
  }));
  const book = X.utils.book_new();
  const append = (name: string, rows: Record<string, unknown>[], header: string[]) => {
    const sheet = X.utils.json_to_sheet(rows, { header });
    sheet['!cols'] = header.map(h => ({ wch: h.includes('ID') ? 30 : h.includes('备注') ? 28 : 18 }));
    sheet['!autofilter'] = { ref: sheet['!ref'] || 'A1' };
    X.utils.book_append_sheet(book, sheet, name);
  };
  append('班级', classRows, ['班级名称', '级别', '教师', '学年', '班级ID', '更新时间']);
  append('学生', studentRows, ['姓名', '学号', '性别', '班级', '教师', '学年/学期', '班级级别', '学生级别', '级别', '联系电话', '入学日期', '公校年级', '备注', '状态', '学生ID', '班级ID', '停学日期', '停学原因', '原班级', '原班级ID', '家长联系', '家长备注', '原联系电话', '更新时间']);
  append('使用说明', [
    { 项目: '导出时间', 内容: data.exportedAt },
    { 项目: '范围', 内容: '全部未删除班级和学生，含停学学生，不受页面筛选影响；不含成绩和云端凭据。' },
    { 项目: '数据合并', 内容: '需要合并已有档案时请使用 JSON 名单，在备份与恢复中导入。按档案 ID 和更新时间合并；同学号但不同 ID 的档案需人工核对。' },
    { 项目: 'Excel 用途', 内容: '可在联合导入中上传学生工作表，按 ID 匹配并逐项确认资料、班级及级别差异。停学学生需要明确选择恢复或跳过。' },
  ], ['项目', '内容']);
  return book;
}
