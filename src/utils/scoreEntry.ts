import { ScoreRecord, Student } from '../types';
import { normalizeExamCategory, getScorePercentage } from './analysis';

export interface EntryRowState {
  student: Student;
  schoolGrade: string;
  score: string;
  attendance: 'present' | 'absent' | 'leave';
  weakPoints: string[];
  mistakeDetails: string;
  teacherRemark: string;
  isExpanded: boolean;
}
export function emptyEntryRow(student: Student): EntryRowState {
  return { student, schoolGrade: student.schoolGrade || '', score: '', attendance: 'present', weakPoints: [], mistakeDetails: '', teacherRemark: '', isExpanded: false };
}
export function hasEntryInput(row: EntryRowState): boolean {
  return row.score.trim() !== '' || row.attendance !== 'present' || row.weakPoints.length > 0 || !!row.mistakeDetails || !!row.teacherRemark;
}
export function isValidScoreInput(value: string, maximum: number): boolean {
  return value.trim() !== '' && Number.isFinite(Number(value)) && Number.isFinite(maximum) && maximum > 0 && Number(value) >= 0 && Number(value) <= maximum;
}
export function fillEmptyScores(rows: EntryRowState[], value: string, maximum: number): EntryRowState[] {
  if (!isValidScoreInput(value, maximum)) return rows;
  return rows.map(row => row.attendance === 'present' && row.score.trim() === '' ? { ...row, score: value } : row);
}
export function sameExam(a: Partial<ScoreRecord>, b: Partial<ScoreRecord>): boolean {
  return a.studentId === b.studentId && a.classId === b.classId && a.examDate === b.examDate
    && normalizeExamCategory(a.examCategory) === normalizeExamCategory(b.examCategory)
    && (a.schoolGrade || a.level) === (b.schoolGrade || b.level) && a.unit === b.unit;
}
export const entryDraftKey = (classId: string, category: string): string => `beaverscore_entry_draft_v1:${classId}:${category}`;
export function readEntryDraft(key: string): any {
  try {
    const data = JSON.parse(localStorage.getItem(key) || 'null');
    return data && Array.isArray(data.rows) ? data : null;
  } catch { return null; }
}
export function restoreEntryRows(students: Student[], saved: any[] = []): EntryRowState[] {
  return students.map(student => {
    const row = saved.find(row => row?.student?.id === student.id);
    if (!row) return emptyEntryRow(student);
    return { ...emptyEntryRow(student), ...row, student,
      score: typeof row.score === 'string' ? row.score : '',
      attendance: ['present', 'absent', 'leave'].includes(row.attendance) ? row.attendance : 'present',
      weakPoints: Array.isArray(row.weakPoints) ? row.weakPoints : [] };
  });
}

export function prepareScoreBatch(
  records: Omit<ScoreRecord, 'id' | 'recordedAt'>[], current: ScoreRecord[],
  options?: { syncToCloud?: boolean; duplicateMode?: 'update' | 'retest' }, now = Date.now()
): ScoreRecord[] {
  if (records.some(record => record.attendance === 'present' && getScorePercentage(record) === null)) {
    throw new Error('存在超出满分范围或无效的成绩，请检查后保存');
  }
  const existingFor = (record: Partial<ScoreRecord>) => current.filter(item => !item.isDeleted && sameExam(item, record))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  if (!options?.duplicateMode && records.some(record => existingFor(record))) {
    throw new Error('本次考试已有记录，请选择更新原成绩或作为补考新增');
  }
  return records.map(record => {
    const original = options?.duplicateMode === 'update' ? existingFor(record) : undefined;
    return { ...record, id: original?.id || `scr_${crypto.randomUUID()}`, localOnly: options?.syncToCloud === false,
      recordedAt: new Date(now).toISOString(), updatedAt: Math.max(now, (original?.updatedAt || 0) + 1),
      isDeleted: false, weakPoints: Array.isArray(record.weakPoints) ? record.weakPoints : [] };
  });
}

export function getLocalDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
