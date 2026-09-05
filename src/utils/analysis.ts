import { ScoreRecord, Student } from '../types';

export function normalizeExamCategory(cat?: string): 'institutional' | 'public_school' {
  if (cat === 'public_school' || cat === '公校考试' || cat === '公校') {
    return 'public_school';
  }
  return 'institutional';
}

export function getExamCategoryLabel(cat?: string): string {
  const norm = normalizeExamCategory(cat);
  return norm === 'public_school' ? '公校考试' : '机构测试';
}

/**
 * Formats standard exam titles:
 * - Institutional (机构测试): Level + Unit (e.g., "E1U2", "BF1U1", "BF2期中综合测验")
 * - Public School (公校测试): Grade + Type (e.g., "四上期中考试", "三上期末考试")
 */
export function formatExamTitle(params: {
  examCategory?: 'institutional' | 'public_school' | string;
  level?: string;
  unit?: string;
  schoolGrade?: string;
}): string {
  const cat = normalizeExamCategory(params.examCategory);
  if (cat === 'public_school') {
    const grade = (params.schoolGrade || params.level || '三上').trim();
    const type = (params.unit || '期中考试').trim();
    if (type.startsWith(grade)) {
      return type;
    }
    return `${grade}${type}`;
  } else {
    const lvl = (params.level || 'BF1').trim();
    let u = (params.unit || 'U1').trim();
    // If unit matches standard "U1 (Unit 1)" or "u1", condense it to "U1"
    const match = u.match(/^([uU]\d+)/);
    if (match) {
      u = match[1].toUpperCase();
    }
    return `${lvl}${u}`;
  }
}

/**
 * Safely parses an exam date string (YYYY-MM-DD, YYYY/MM/DD, or ISO) into a comparable numeric timestamp.
 */
export function getExamDateTimestamp(dateStr?: string): number {
  if (!dateStr) return 0;
  const clean = String(dateStr).trim().replace(/\//g, '-');
  const ts = new Date(clean).getTime();
  return isNaN(ts) ? 0 : ts;
}

/**
 * Sorts ScoreRecords strictly by examDate in ascending chronological order.
 */
export function compareScoreRecordsByExamDateAsc(a: ScoreRecord, b: ScoreRecord): number {
  const tsA = getExamDateTimestamp(a.examDate);
  const tsB = getExamDateTimestamp(b.examDate);
  if (tsA !== tsB) {
    return tsA - tsB;
  }
  const recA = getExamDateTimestamp(a.recordedAt);
  const recB = getExamDateTimestamp(b.recordedAt);
  if (recA !== recB) {
    return recA - recB;
  }
  return (a.id || '').localeCompare(b.id || '');
}

/**
 * Sorts ScoreRecords by examDate in descending chronological order (newest exam date first).
 */
export function compareScoreRecordsByExamDateDesc(a: ScoreRecord, b: ScoreRecord): number {
  return compareScoreRecordsByExamDateAsc(b, a);
}

export interface StudentProgressStats {
  studentId: string;
  studentName: string;
  className: string;
  level: string;
  status?: 'active' | 'suspended';
  suspendedAt?: string;
  examCategory?: 'institutional' | 'public_school' | 'all';
  recordsCount: number;
  latestScore: number;
  latestUnit: string;
  latestDate: string;
  latestExamTitle?: string;
  latestCategory: 'institutional' | 'public_school';
  previousScore?: number;
  previousUnit?: string;
  previousCategory?: 'institutional' | 'public_school';
  scoreDelta: number; // positive = improved, negative = dropped (strictly compared within same category by examDate)
  hasComparison: boolean; // whether 2+ records in this category exist
  averageScore: number;
  maxScore: number;
  minScore: number;
  topScoreCount: number; // >= 90
  fullScoreCount: number; // == 100
  recentWeakPoints: string[];
  allWeakPointsFrequency: { [tag: string]: number };
  latestRemark?: string;
  latestMistake?: string;
}

export function calculateStudentStats(
  students: Student[],
  scoreRecords: ScoreRecord[],
  filters?: {
    examCategory?: 'institutional' | 'public_school' | 'all';
    levelPrefix?: string; // e.g. "BF" or "E" or specific "BF2"
    selectedLevel?: string;
    classId?: string;
    unit?: string;
    status?: 'active' | 'suspended' | 'all';
  }
): StudentProgressStats[] {
  const result: StudentProgressStats[] = [];

  (students || []).forEach(student => {
    // Check status filter (default to 'all' if not specified)
    if (filters?.status && filters.status !== 'all') {
      const stuStatus = student.status || 'active';
      if (stuStatus !== filters.status) return;
    }

    // 1. Get all present records with numeric score for this student, sorted strictly by examDate ascending
    let records = (scoreRecords || [])
      .filter(r => r && r.studentId === student.id && r.attendance === 'present' && typeof r.score === 'number' && !isNaN(r.score))
      .sort(compareScoreRecordsByExamDateAsc);

    // 2. Exam Category Filter (Institutional vs Public School)
    if (filters?.examCategory && filters.examCategory !== 'all') {
      records = records.filter(r => normalizeExamCategory(r.examCategory) === filters.examCategory);
    }

    if (filters?.classId && filters.classId !== 'all') {
      records = records.filter(r => r.classId === filters.classId);
    }
    if (filters?.selectedLevel && filters.selectedLevel !== 'all') {
      records = records.filter(r => r.level === filters.selectedLevel || r.schoolGrade === filters.selectedLevel);
    } else if (filters?.levelPrefix && filters.levelPrefix !== 'all') {
      records = records.filter(r => r.level.startsWith(filters.levelPrefix!));
    }
    if (filters?.unit && filters.unit !== 'all') {
      records = records.filter(r => r.unit === filters.unit);
    }

    if (records.length === 0) return;

    const scores = records.map(r => r.score as number);
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = Math.round((sum / scores.length) * 10) / 10;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const topCount = scores.filter(s => s >= 90).length;
    const fullCount = scores.filter(s => s >= 100).length;

    // The chronologically latest record according to examDate
    const latest = records[records.length - 1];
    const latestCat = normalizeExamCategory(latest.examCategory);

    // Find previous record of the SAME category chronologically by examDate
    const sameCategoryRecords = records.filter(r => normalizeExamCategory(r.examCategory) === latestCat);
    let prev: ScoreRecord | undefined = undefined;
    if (sameCategoryRecords.length > 1) {
      prev = sameCategoryRecords[sameCategoryRecords.length - 2];
    }

    const hasComparison = prev !== undefined && typeof prev.score === 'number';
    const delta = (prev !== undefined && typeof prev.score === 'number' && typeof latest.score === 'number')
      ? latest.score - prev.score
      : 0;

    // Aggregate weak points frequency
    const tagFreq: { [tag: string]: number } = {};
    records.forEach(r => {
      (r.weakPoints || []).forEach(tag => {
        tagFreq[tag] = (tagFreq[tag] || 0) + 1;
      });
    });

    result.push({
      studentId: student.id,
      studentName: student.name,
      className: latest.className,
      level: latest.level,
      status: student.status || 'active',
      suspendedAt: student.suspendedAt,
      examCategory: filters?.examCategory,
      recordsCount: records.length,
      latestScore: (latest.score as number) ?? 0,
      latestUnit: latest.unit,
      latestDate: latest.examDate,
      latestExamTitle: latest.examTitle,
      latestCategory: latestCat,
      previousScore: typeof prev?.score === 'number' ? prev.score : undefined,
      previousUnit: prev?.unit,
      previousCategory: prev ? normalizeExamCategory(prev.examCategory) : undefined,
      scoreDelta: delta,
      hasComparison,
      averageScore: avg,
      maxScore: max,
      minScore: min,
      topScoreCount: topCount,
      fullScoreCount: fullCount,
      recentWeakPoints: Array.isArray(latest.weakPoints) ? latest.weakPoints : [],
      allWeakPointsFrequency: tagFreq,
      latestRemark: latest.teacherRemark,
      latestMistake: latest.mistakeDetails
    });
  });

  return result;
}

export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(header => {
          let val = row[header] ?? '';
          if (Array.isArray(val)) {
            val = val.join('; ');
          }
          val = String(val).replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(',')
    )
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
