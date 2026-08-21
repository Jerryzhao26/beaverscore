import {
  ClassGroup,
  Student,
  ScoreRecord,
  WeakPointTagCategory,
  DeletedEntities,
  StudentUpdateDetail,
  ClassUpdateDetail,
  ScoreUpdateDetail
} from '../types';

export interface GistConfig {
  token: string;
  gistId: string;
  filename: string;
  teacherName?: string; // Current teacher name for sync stamping
  autoSync: boolean; // Auto-push to Gist when local data changes
  autoPullOnLoad: boolean; // Auto-pull latest data on startup / URL open
  lastSyncedAt: string | null;
}

export interface GistSyncResult {
  success: boolean;
  message: string;
  data?: any;
  gistId?: string;
  updatedAt?: string;
  gistUrl?: string;
}

export const DEFAULT_GIST_FILENAME = 'student_scores_database.json';

export const GIST_STORAGE_KEY = 'training_scores_gist_config_v2';
export const GIST_LOGS_STORAGE_KEY = 'training_scores_gist_logs_v2';

export const getStoredGistConfig = (): GistConfig => {
  // Support migration from v1
  const savedV2 = localStorage.getItem(GIST_STORAGE_KEY);
  const savedV1 = localStorage.getItem('training_scores_gist_config_v1');
  const saved = savedV2 || savedV1;
  
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        token: parsed.token || '',
        gistId: parsed.gistId || '',
        filename: parsed.filename || DEFAULT_GIST_FILENAME,
        teacherName: parsed.teacherName || '',
        autoSync: typeof parsed.autoSync === 'boolean' ? parsed.autoSync : true,
        autoPullOnLoad: typeof parsed.autoPullOnLoad === 'boolean' ? parsed.autoPullOnLoad : true,
        lastSyncedAt: parsed.lastSyncedAt || null,
      };
    } catch {
      // fallback
    }
  }
  return {
    token: '',
    gistId: '',
    filename: DEFAULT_GIST_FILENAME,
    teacherName: '',
    autoSync: true,
    autoPullOnLoad: true,
    lastSyncedAt: null,
  };
};

export const saveStoredGistConfig = (config: GistConfig) => {
  localStorage.setItem(GIST_STORAGE_KEY, JSON.stringify(config));
};

export function extractGistId(input: string): string {
  if (!input) return '';
  let str = input.trim();
  if (str === 'undefined' || str === 'null' || str === '[object Object]') return '';
  // Remove query string and hash
  str = str.split('?')[0].split('#')[0].replace(/\/+$/, '');
  // Extract last path component if it's a URL
  const parts = str.split('/');
  const lastPart = parts[parts.length - 1].trim();
  if (!lastPart || lastPart === 'undefined' || lastPart === 'null' || lastPart.length < 5) {
    return '';
  }
  return lastPart;
}

/**
 * Normalizes GitHub personal access token
 */
export function normalizeGithubToken(token?: string): string {
  if (!token) return '';
  let clean = token.trim().replace(/^["']|["']$/g, '');
  if (clean === 'undefined' || clean === 'null') return '';
  if (clean.startsWith('Bearer ')) clean = clean.substring(7).trim();
  if (clean.startsWith('token ')) clean = clean.substring(6).trim();
  return clean;
}

/**
 * Parses URL query parameters and hash fragments for Gist configuration
 */
export interface UrlGistParams {
  gistId?: string;
  token?: string;
  autoSync?: boolean;
  autoPull?: boolean;
  hasUrlBinding: boolean;
}

export function parseGistUrlParams(): UrlGistParams {
  if (typeof window === 'undefined') return { hasUrlBinding: false };

  const url = new URL(window.location.href);
  const searchParams = url.searchParams;

  // Also check hash fragment e.g. #gistId=xxx&token=yyy
  const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : '';
  const hashParams = new URLSearchParams(hash);

  const rawGistId =
    searchParams.get('gistId') ||
    searchParams.get('gist') ||
    searchParams.get('id') ||
    hashParams.get('gistId') ||
    hashParams.get('gist') ||
    hashParams.get('id');

  const rawToken =
    searchParams.get('token') ||
    searchParams.get('pat') ||
    hashParams.get('token') ||
    hashParams.get('pat');

  const autoSyncParam = searchParams.get('autoSync') || hashParams.get('autoSync');
  const autoPullParam = searchParams.get('autoPull') || hashParams.get('autoPull');

  if (rawGistId) {
    const cleanId = extractGistId(rawGistId);
    if (cleanId) {
      const cleanTok = normalizeGithubToken(rawToken || undefined);
      return {
        gistId: cleanId,
        token: cleanTok || undefined,
        autoSync: autoSyncParam !== null ? autoSyncParam === 'true' || autoSyncParam === '1' : true,
        autoPull: autoPullParam !== null ? autoPullParam === 'true' || autoPullParam === '1' : true,
        hasUrlBinding: true,
      };
    }
  }

  return { hasUrlBinding: false };
}

/**
 * Generates direct shareable URLs for automatic Gist pulling and syncing
 */
export function generateGistShareUrl(params: {
  gistId: string;
  token?: string;
  autoSync?: boolean;
  autoPull?: boolean;
  mode?: 'full' | 'readonly';
  useHash?: boolean;
}): string {
  if (typeof window === 'undefined') return '';
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const cleanGistId = (params.gistId || '').trim();
  if (!cleanGistId) return '';

  const urlParams = new URLSearchParams();
  urlParams.set('gistId', cleanGistId);

  if (params.mode !== 'readonly' && params.token && params.token.trim()) {
    urlParams.set('token', params.token.trim());
  }

  if (params.autoSync !== undefined) {
    urlParams.set('autoSync', params.autoSync ? 'true' : 'false');
  } else {
    urlParams.set('autoSync', 'true');
  }

  if (params.autoPull !== undefined) {
    urlParams.set('autoPull', params.autoPull ? 'true' : 'false');
  } else {
    urlParams.set('autoPull', 'true');
  }

  if (params.useHash) {
    return `${baseUrl}#${urlParams.toString()}`;
  }
  return `${baseUrl}?${urlParams.toString()}`;
}

export interface MergeReport {
  incomingScoresCount: number; // Scores from other teachers incorporated
  outgoingScoresCount: number; // Local scores merged into cloud
  incomingScoresUpdated?: number; // Scores modified by remote
  outgoingScoresUpdated?: number; // Scores modified by local
  totalScoresCount: number;
  incomingStudentsCount: number;
  outgoingStudentsCount?: number;
  incomingStudentsUpdated?: number;
  outgoingStudentsUpdated?: number;
  totalStudentsCount: number;
  incomingClassesCount: number;
  outgoingClassesCount?: number;
  incomingClassesUpdated?: number;
  outgoingClassesUpdated?: number;
  totalClassesCount: number;
  isMerged: boolean;
  incomingStudentNames?: string[];
  outgoingStudentNames?: string[];
  incomingClassNames?: string[];
  outgoingClassNames?: string[];
  incomingStudentUpdates?: StudentUpdateDetail[];
  outgoingStudentUpdates?: StudentUpdateDetail[];
  incomingClassUpdates?: ClassUpdateDetail[];
  outgoingClassUpdates?: ClassUpdateDetail[];
  incomingScoreUpdates?: ScoreUpdateDetail[];
  outgoingScoreUpdates?: ScoreUpdateDetail[];
  incomingScoreSamples?: {
    studentName: string;
    className: string;
    unit: string;
    examTitle: string;
    score: number | null;
    level?: string;
    examDate?: string;
  }[];
  newDictionaries?: {
    levels?: string[];
    units?: string[];
    teachers?: string[];
  };
}

/**
 * Intelligent 3-way/Incremental Merge for multi-teacher concurrent scoring with tombstone deletion tracking
 */
export function mergeDatasets(localData: any, remoteData: any): { merged: any; report: MergeReport } {
  const report: MergeReport = {
    incomingScoresCount: 0,
    outgoingScoresCount: 0,
    incomingScoresUpdated: 0,
    outgoingScoresUpdated: 0,
    totalScoresCount: 0,
    incomingStudentsCount: 0,
    outgoingStudentsCount: 0,
    incomingStudentsUpdated: 0,
    outgoingStudentsUpdated: 0,
    totalStudentsCount: 0,
    incomingClassesCount: 0,
    outgoingClassesCount: 0,
    incomingClassesUpdated: 0,
    outgoingClassesUpdated: 0,
    totalClassesCount: 0,
    isMerged: false,
    incomingStudentNames: [],
    outgoingStudentNames: [],
    incomingClassNames: [],
    outgoingClassNames: [],
    incomingStudentUpdates: [],
    outgoingStudentUpdates: [],
    incomingClassUpdates: [],
    outgoingClassUpdates: [],
    incomingScoreUpdates: [],
    outgoingScoreUpdates: [],
    incomingScoreSamples: [],
    newDictionaries: { levels: [], units: [], teachers: [] }
  };

  // Extract and combine deletion tombstones
  const localDel: DeletedEntities = localData?.deletedEntities || { classes: {}, students: {}, scoreRecords: {}, levels: {}, units: {}, teachers: {} };
  const remoteDel: DeletedEntities = remoteData?.deletedEntities || { classes: {}, students: {}, scoreRecords: {}, levels: {}, units: {}, teachers: {} };

  const mergedDel: DeletedEntities = {
    classes: { ...(remoteDel.classes || {}), ...(localDel.classes || {}) },
    students: { ...(remoteDel.students || {}), ...(localDel.students || {}) },
    scoreRecords: { ...(remoteDel.scoreRecords || {}), ...(localDel.scoreRecords || {}) },
    levels: { ...(remoteDel.levels || {}), ...(localDel.levels || {}) },
    units: { ...(remoteDel.units || {}), ...(localDel.units || {}) },
    teachers: { ...(remoteDel.teachers || {}), ...(localDel.teachers || {}) },
  };

  // Safe timestamp parser to avoid NaN comparisons
  const safeTime = (val: any): number => {
    if (!val) return 0;
    const t = new Date(val).getTime();
    return isNaN(t) ? 0 : t;
  };

  const getScoreRecordTime = (sc: ScoreRecord): number => {
    return Math.max(
      safeTime(sc.updatedAt),
      safeTime(sc.recordedAt),
      safeTime(sc.examDate)
    );
  };

  const getScoreSignature = (sc: Partial<ScoreRecord>): string => {
    const std = (sc.studentId || sc.studentName || '').trim();
    const date = (sc.examDate || '').trim();
    const lvl = (sc.level || '').trim();
    const unit = (sc.unit || '').trim();
    const title = (sc.examTitle || '').trim();
    return `sig_${std}_${date}_${lvl}_${unit}_${title}`;
  };

  const isClassDeleted = (c: ClassGroup): boolean => {
    if (!c || (!c.id && !c.name)) return true;
    const delTime = (c.id ? mergedDel.classes[c.id] : undefined) || (c.name ? mergedDel.classes[c.name] : undefined);
    if (!delTime) return false;
    const classTime = safeTime(c.updatedAt);
    return classTime <= delTime;
  };

  const isStudentDeleted = (s: Student): boolean => {
    if (!s || !s.id) return true;
    const delTime = mergedDel.students[s.id] || (s.name ? mergedDel.students[s.name] : undefined);
    if (!delTime) return false;
    const stuTime = safeTime(s.updatedAt);
    return stuTime <= delTime;
  };

  const isScoreDeleted = (sc: ScoreRecord): boolean => {
    if (!sc || (!sc.id && !sc.studentId)) return true;
    
    // Check direct score deletion by ID or by test signature
    const sig = getScoreSignature(sc);
    const delTime = (sc.id ? mergedDel.scoreRecords[sc.id] : undefined) || mergedDel.scoreRecords[sig];
    const recTime = getScoreRecordTime(sc);

    if (delTime && recTime <= delTime) {
      return true;
    }

    // Check if the student belonging to this score was deleted
    if (sc.studentId && mergedDel.students[sc.studentId]) {
      const studentDelTime = mergedDel.students[sc.studentId];
      if (recTime <= studentDelTime) {
        return true;
      }
    }

    return false;
  };

  if (!remoteData || (!remoteData.scoreRecords && !remoteData.students && !remoteData.classes)) {
    const filteredLocalScores = (Array.isArray(localData?.scoreRecords) ? localData.scoreRecords : []).filter((s: ScoreRecord) => !isScoreDeleted(s));
    const filteredLocalStudents = (Array.isArray(localData?.students) ? localData.students : []).filter((s: Student) => !isStudentDeleted(s));
    const filteredLocalClasses = (Array.isArray(localData?.classes) ? localData.classes : []).filter((c: ClassGroup) => !isClassDeleted(c));

    return {
      merged: {
        ...localData,
        classes: filteredLocalClasses,
        students: filteredLocalStudents,
        scoreRecords: filteredLocalScores,
        deletedEntities: mergedDel,
      },
      report: {
        ...report,
        totalScoresCount: filteredLocalScores.length,
        totalStudentsCount: filteredLocalStudents.length,
        totalClassesCount: filteredLocalClasses.length,
      },
    };
  }

  // 1. Merge Score Records
  const localScores: ScoreRecord[] = (Array.isArray(localData.scoreRecords) ? localData.scoreRecords : []).filter((s: ScoreRecord) => !isScoreDeleted(s));
  const remoteScores: ScoreRecord[] = (Array.isArray(remoteData.scoreRecords) ? remoteData.scoreRecords : []).filter((s: ScoreRecord) => !isScoreDeleted(s));

  const scoreMap = new Map<string, ScoreRecord>();

  // Add all active local records first
  for (const s of localScores) {
    if (s && s.id && !isScoreDeleted(s)) {
      scoreMap.set(s.id, s);
    }
  }

  // Merge remote records
  let newFromRemote = 0;
  let incomingScoresUpdated = 0;
  let outgoingScoresUpdated = 0;
  const incomingScoreUpdates: ScoreUpdateDetail[] = [];
  const outgoingScoreUpdates: ScoreUpdateDetail[] = [];
  const incomingScoreSamples: {
    studentName: string;
    className: string;
    unit: string;
    examTitle: string;
    score: number | null;
    level?: string;
    examDate?: string;
  }[] = [];

  for (const r of remoteScores) {
    if (!r || !r.id || isScoreDeleted(r)) continue;

    if (!scoreMap.has(r.id)) {
      scoreMap.set(r.id, r);
      newFromRemote++;
      if (incomingScoreSamples.length < 8) {
        incomingScoreSamples.push({
          studentName: r.studentName || '未命名学员',
          className: r.className || '未指定班级',
          unit: r.unit || '阶段测验',
          examTitle: r.examTitle || '测验',
          score: typeof r.score === 'number' ? r.score : null,
          level: r.level,
          examDate: r.examDate
        });
      }
    } else {
      const existing = scoreMap.get(r.id)!;
      const existingTime = Math.max(
        existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0,
        existing.recordedAt ? new Date(existing.recordedAt).getTime() : 0
      );
      const remoteTime = Math.max(
        r.updatedAt ? new Date(r.updatedAt).getTime() : 0,
        r.recordedAt ? new Date(r.recordedAt).getTime() : 0
      );

      const hasDiff = (existing.score !== r.score) || (existing.attendance !== r.attendance) || (existing.level !== r.level);

      if (remoteTime > existingTime) {
        scoreMap.set(r.id, r);
        if (hasDiff) {
          incomingScoresUpdated++;
          if (incomingScoreUpdates.length < 10) {
            incomingScoreUpdates.push({
              scoreId: r.id,
              studentName: r.studentName || existing.studentName,
              className: r.className || existing.className,
              unit: r.unit || existing.unit,
              description: `成绩: ${existing.score ?? '待评'}分 → ${r.score ?? '待评'}分`
            });
          }
        }
      } else if (existingTime > remoteTime) {
        scoreMap.set(r.id, existing);
        if (hasDiff) {
          outgoingScoresUpdated++;
          if (outgoingScoreUpdates.length < 10) {
            outgoingScoreUpdates.push({
              scoreId: existing.id,
              studentName: existing.studentName,
              className: existing.className,
              unit: existing.unit,
              description: `成绩: ${r.score ?? '待评'}分 → ${existing.score ?? '待评'}分`
            });
          }
        }
      } else {
        const mergedWeakPoints = Array.from(new Set([...(existing.weakPoints || []), ...(r.weakPoints || [])]));
        scoreMap.set(r.id, {
          ...r,
          ...existing,
          weakPoints: mergedWeakPoints,
          mistakeDetails: existing.mistakeDetails || r.mistakeDetails,
          teacherRemark: existing.teacherRemark || r.teacherRemark,
        });
      }
    }
  }

  // 2. Merge Students with proper updatedAt timestamp & tombstone filtering
  const localStudents: Student[] = (Array.isArray(localData.students) ? localData.students : []).filter((s: Student) => !isStudentDeleted(s));
  const remoteStudents: Student[] = (Array.isArray(remoteData.students) ? remoteData.students : []).filter((s: Student) => !isStudentDeleted(s));

  const studentMap = new Map<string, Student>();
  for (const stu of localStudents) {
    if (stu && stu.id && !isStudentDeleted(stu)) studentMap.set(stu.id, stu);
  }

  let newStudentsFromRemote = 0;
  let incomingStudentsUpdated = 0;
  let outgoingStudentsUpdated = 0;
  const incomingStudentNames: string[] = [];
  const incomingStudentUpdates: StudentUpdateDetail[] = [];
  const outgoingStudentUpdates: StudentUpdateDetail[] = [];

  for (const rStu of remoteStudents) {
    if (!rStu || !rStu.id || isStudentDeleted(rStu)) continue;
    if (!studentMap.has(rStu.id)) {
      studentMap.set(rStu.id, rStu);
      newStudentsFromRemote++;
      if (rStu.name && incomingStudentNames.length < 10) {
        incomingStudentNames.push(rStu.name);
      }
    } else {
      const existStu = studentMap.get(rStu.id)!;
      const existTime = existStu.updatedAt ? new Date(existStu.updatedAt).getTime() : 0;
      const remoteTime = rStu.updatedAt ? new Date(rStu.updatedAt).getTime() : 0;

      const levelChanged = existStu.currentLevel !== rStu.currentLevel;
      const classChanged = existStu.classId !== rStu.classId;
      const statusChanged = existStu.status !== rStu.status;
      const hasStudentDiff = levelChanged || classChanged || statusChanged || existStu.name !== rStu.name;

      if (remoteTime > existTime) {
        studentMap.set(rStu.id, {
          ...existStu,
          ...rStu,
          updatedAt: rStu.updatedAt || existStu.updatedAt,
        });
        if (hasStudentDiff) {
          incomingStudentsUpdated++;
          if (levelChanged) {
            incomingStudentUpdates.push({
              studentId: rStu.id,
              studentName: rStu.name || existStu.name,
              field: 'currentLevel',
              from: existStu.currentLevel || '未定',
              to: rStu.currentLevel || '未定',
              description: `在读级别: ${existStu.currentLevel || '未定'} → ${rStu.currentLevel || '未定'}`
            });
          } else if (classChanged) {
            incomingStudentUpdates.push({
              studentId: rStu.id,
              studentName: rStu.name || existStu.name,
              field: 'classId',
              from: existStu.classId,
              to: rStu.classId,
              description: '班级调动调整'
            });
          }
        }
      } else {
        studentMap.set(rStu.id, {
          ...rStu,
          ...existStu,
          name: existStu.name || rStu.name,
          phone: existStu.phone !== undefined ? existStu.phone : rStu.phone,
          parentContact: existStu.parentContact !== undefined ? existStu.parentContact : rStu.parentContact,
          notes: existStu.notes !== undefined ? existStu.notes : rStu.notes,
          classId: existStu.classId !== undefined ? existStu.classId : rStu.classId,
          currentLevel: existStu.currentLevel || rStu.currentLevel,
          schoolGrade: existStu.schoolGrade || rStu.schoolGrade,
          studentNo: existStu.studentNo || rStu.studentNo,
          status: existStu.status || rStu.status || 'active',
          suspendedAt: existStu.suspendedAt !== undefined ? existStu.suspendedAt : rStu.suspendedAt,
          suspendReason: existStu.suspendReason !== undefined ? existStu.suspendReason : rStu.suspendReason,
          previousClassId: existStu.previousClassId !== undefined ? existStu.previousClassId : rStu.previousClassId,
          updatedAt: existStu.updatedAt || rStu.updatedAt,
        });
        if (hasStudentDiff) {
          outgoingStudentsUpdated++;
          if (levelChanged) {
            outgoingStudentUpdates.push({
              studentId: existStu.id,
              studentName: existStu.name,
              field: 'currentLevel',
              from: rStu.currentLevel || '未定',
              to: existStu.currentLevel || '未定',
              description: `在读级别: ${rStu.currentLevel || '未定'} → ${existStu.currentLevel || '未定'}`
            });
          } else if (classChanged) {
            outgoingStudentUpdates.push({
              studentId: existStu.id,
              studentName: existStu.name,
              field: 'classId',
              from: rStu.classId,
              to: existStu.classId,
              description: '班级调动调整'
            });
          }
        }
      }
    }
  }
  const mergedStudents = Array.from(studentMap.values()).filter(s => !isStudentDeleted(s));
  const newStudentsFromLocal = mergedStudents.filter(s => !remoteStudents.some(r => r.id === s.id)).length;
  const outgoingStudentNames = mergedStudents.filter(s => !remoteStudents.some(r => r.id === s.id)).map(s => s.name).slice(0, 10);

  // 3. Merge Classes
  const localClasses: ClassGroup[] = (Array.isArray(localData.classes) ? localData.classes : []).filter((c: ClassGroup) => !isClassDeleted(c));
  const remoteClasses: ClassGroup[] = (Array.isArray(remoteData.classes) ? remoteData.classes : []).filter((c: ClassGroup) => !isClassDeleted(c));

  const classMap = new Map<string, ClassGroup>();
  for (const c of localClasses) {
    if (c && (c.id || c.name) && !isClassDeleted(c)) classMap.set(c.id || c.name, c);
  }

  let newClassesFromRemote = 0;
  let incomingClassesUpdated = 0;
  let outgoingClassesUpdated = 0;
  const incomingClassNames: string[] = [];
  const incomingClassUpdates: ClassUpdateDetail[] = [];
  const outgoingClassUpdates: ClassUpdateDetail[] = [];

  for (const rC of remoteClasses) {
    if (!rC || (!rC.id && !rC.name) || isClassDeleted(rC)) continue;
    const key = rC.id || rC.name;
    if (!classMap.has(key)) {
      classMap.set(key, rC);
      newClassesFromRemote++;
      if (rC.name && incomingClassNames.length < 10) {
        incomingClassNames.push(rC.name);
      }
    } else {
      const existClass = classMap.get(key)!;
      const existTime = existClass.updatedAt ? new Date(existClass.updatedAt).getTime() : 0;
      const remoteTime = rC.updatedAt ? new Date(rC.updatedAt).getTime() : 0;

      const levelDiff = (existClass.currentLevel || existClass.level) !== (rC.currentLevel || rC.level);
      const teacherDiff = existClass.teacherName !== rC.teacherName;

      if (remoteTime > existTime) {
        classMap.set(key, {
          ...existClass,
          ...rC,
          updatedAt: rC.updatedAt || existClass.updatedAt,
        });
        if (levelDiff || teacherDiff) {
          incomingClassesUpdated++;
          if (levelDiff) {
            incomingClassUpdates.push({
              classId: rC.id,
              className: rC.name,
              field: 'level',
              from: existClass.currentLevel || existClass.level,
              to: rC.currentLevel || rC.level,
              description: `班级主授级别: ${existClass.currentLevel || existClass.level} → ${rC.currentLevel || rC.level}`
            });
          }
        }
      } else {
        classMap.set(key, {
          ...rC,
          ...existClass,
          name: existClass.name || rC.name,
          teacherName: existClass.teacherName || rC.teacherName,
          level: existClass.level || rC.level,
          updatedAt: existClass.updatedAt || rC.updatedAt,
        });
        if (levelDiff || teacherDiff) {
          outgoingClassesUpdated++;
          if (levelDiff) {
            outgoingClassUpdates.push({
              classId: existClass.id,
              className: existClass.name,
              field: 'level',
              from: rC.currentLevel || rC.level,
              to: existClass.currentLevel || existClass.level,
              description: `班级主授级别: ${rC.currentLevel || rC.level} → ${existClass.currentLevel || existClass.level}`
            });
          }
        }
      }
    }
  }
  const mergedClasses = Array.from(classMap.values()).filter(c => !isClassDeleted(c));
  const newClassesFromLocal = mergedClasses.filter(c => !remoteClasses.some(r => (r.id && r.id === c.id) || (r.name && r.name === c.name))).length;
  const outgoingClassNames = mergedClasses.filter(c => !remoteClasses.some(r => (r.id && r.id === c.id) || (r.name && r.name === c.name))).map(c => c.name).slice(0, 10);

  // Secondary duplicate prevention & studentName / className synchronization
  const mergedScoresList = Array.from(scoreMap.values()).filter(sc => !isScoreDeleted(sc));
  const uniqueScores: ScoreRecord[] = [];
  const contentDedupeMap = new Set<string>();

  for (const sc of mergedScoresList) {
    const matchedStudent = studentMap.get(sc.studentId);
    const matchedClass = classMap.get(sc.classId);
    const normalizedSc: ScoreRecord = {
      ...sc,
      studentName: matchedStudent?.name || sc.studentName,
      className: matchedClass?.name || sc.className,
    };

    const sig = `${normalizedSc.studentId || ''}_${normalizedSc.classId || ''}_${normalizedSc.examDate || ''}_${normalizedSc.unit || ''}_${normalizedSc.level || ''}_${normalizedSc.examTitle || ''}_${normalizedSc.score}_${normalizedSc.maxScore}`;
    if (!contentDedupeMap.has(sig)) {
      contentDedupeMap.add(sig);
      uniqueScores.push(normalizedSc);
    }
  }

  // 4. Merge Dictionaries (filter deleted)
  const delLevels = mergedDel.levels || {};
  const delUnits = mergedDel.units || {};
  const delTeachers = mergedDel.teachers || {};

  const mergedLevels = Array.from(
    new Set([...(localData.levels || []), ...(remoteData.levels || [])].filter(l => Boolean(l) && !delLevels[l]))
  );
  const mergedUnits = Array.from(
    new Set([...(localData.units || []), ...(remoteData.units || [])].filter(u => Boolean(u) && !delUnits[u]))
  );
  const mergedTeachers = Array.from(
    new Set([...(localData.teachers || []), ...(remoteData.teachers || [])].filter(t => Boolean(t) && !delTeachers[t]))
  );

  // 5. Merge Weak Point Categories
  const localCats: WeakPointTagCategory[] = Array.isArray(localData.weakPointCategories)
    ? localData.weakPointCategories
    : [];
  const remoteCats: WeakPointTagCategory[] = Array.isArray(remoteData.weakPointCategories)
    ? remoteData.weakPointCategories
    : [];

  const catMap = new Map<string, string[]>();
  for (const c of localCats) {
    if (c && c.category) {
      catMap.set(c.category, Array.isArray(c.tags) ? [...c.tags] : []);
    }
  }
  for (const rC of remoteCats) {
    if (rC && rC.category) {
      const existingTags = catMap.get(rC.category) || [];
      const remoteTags = Array.isArray(rC.tags) ? rC.tags : [];
      catMap.set(rC.category, Array.from(new Set([...existingTags, ...remoteTags])));
    }
  }
  const mergedWeakPointCategories: WeakPointTagCategory[] = Array.from(catMap.entries()).map(([category, tags]) => ({
    category,
    tags,
  }));

  const newOutgoingCount = uniqueScores.filter(s => !remoteScores.some(r => r.id === s.id)).length;

  const localLevelSet = new Set(localData.levels || []);
  const newLevelsFromRemote = mergedLevels.filter(l => !localLevelSet.has(l));
  const localUnitSet = new Set(localData.units || []);
  const newUnitsFromRemote = mergedUnits.filter(u => !localUnitSet.has(u));
  const localTeacherSet = new Set(localData.teachers || []);
  const newTeachersFromRemote = mergedTeachers.filter(t => !localTeacherSet.has(t));

  report.incomingScoresCount = newFromRemote;
  report.outgoingScoresCount = newOutgoingCount;
  report.incomingScoresUpdated = incomingScoresUpdated;
  report.outgoingScoresUpdated = outgoingScoresUpdated;
  report.totalScoresCount = uniqueScores.length;
  report.incomingStudentsCount = newStudentsFromRemote;
  report.outgoingStudentsCount = newStudentsFromLocal;
  report.incomingStudentsUpdated = incomingStudentsUpdated;
  report.outgoingStudentsUpdated = outgoingStudentsUpdated;
  report.totalStudentsCount = mergedStudents.length;
  report.incomingClassesCount = newClassesFromRemote;
  report.outgoingClassesCount = newClassesFromLocal;
  report.incomingClassesUpdated = incomingClassesUpdated;
  report.outgoingClassesUpdated = outgoingClassesUpdated;
  report.totalClassesCount = mergedClasses.length;
  report.isMerged =
    newFromRemote > 0 ||
    newOutgoingCount > 0 ||
    incomingScoresUpdated > 0 ||
    outgoingScoresUpdated > 0 ||
    newStudentsFromRemote > 0 ||
    newStudentsFromLocal > 0 ||
    incomingStudentsUpdated > 0 ||
    outgoingStudentsUpdated > 0 ||
    newClassesFromRemote > 0 ||
    newClassesFromLocal > 0 ||
    incomingClassesUpdated > 0 ||
    outgoingClassesUpdated > 0 ||
    newLevelsFromRemote.length > 0 ||
    newUnitsFromRemote.length > 0 ||
    newTeachersFromRemote.length > 0;
  report.incomingStudentNames = incomingStudentNames;
  report.outgoingStudentNames = outgoingStudentNames;
  report.incomingClassNames = incomingClassNames;
  report.outgoingClassNames = outgoingClassNames;
  report.incomingStudentUpdates = incomingStudentUpdates;
  report.outgoingStudentUpdates = outgoingStudentUpdates;
  report.incomingClassUpdates = incomingClassUpdates;
  report.outgoingClassUpdates = outgoingClassUpdates;
  report.incomingScoreUpdates = incomingScoreUpdates;
  report.outgoingScoreUpdates = outgoingScoreUpdates;
  report.incomingScoreSamples = incomingScoreSamples;
  report.newDictionaries = {
    levels: newLevelsFromRemote,
    units: newUnitsFromRemote,
    teachers: newTeachersFromRemote
  };

  const mergedData = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    classes: mergedClasses,
    students: mergedStudents,
    scoreRecords: uniqueScores,
    levels: mergedLevels,
    units: mergedUnits,
    teachers: mergedTeachers,
    weakPointCategories: mergedWeakPointCategories,
    deletedEntities: mergedDel,
  };

  return {
    merged: mergedData,
    report,
  };
}

/**
 * Creates a brand new secret Gist on GitHub with the full app dataset
 */
export async function createGistOnGitHub(
  token: string,
  fullData: any,
  filename: string = DEFAULT_GIST_FILENAME
): Promise<GistSyncResult> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { success: false, message: '请先提供有效的 GitHub Personal Access Token (PAT)' };
  }

  try {
    const payload = {
      description: 'EduTrack Pro 机构学员考评与成绩追踪数据库 (Auto-generated by EduTrack)',
      public: false,
      files: {
        [filename]: {
          content: JSON.stringify(fullData, null, 2),
        },
      },
    };

    const res = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${cleanToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const errMsg = errJson?.message || `HTTP ${res.status}: ${res.statusText}`;
      if (res.status === 401) {
        return { success: false, message: 'GitHub Token 无效或已过期，请检查 Token 权限（需勾选 gist 权限）' };
      }
      return { success: false, message: `创建 Gist 失败: ${errMsg}` };
    }

    const json = await res.json();
    const newGistId = json.id;
    const gistUrl = json.html_url;

    return {
      success: true,
      message: '✅ 成功在 GitHub 创建专属私有 Gist 数据库！',
      gistId: newGistId,
      gistUrl,
      updatedAt: json.updated_at || new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      success: false,
      message: `网络请求失败: ${err.message || '无法连接 GitHub API，请检查网络'}`,
    };
  }
}

/**
 * Pushes updated application data to an existing Gist
 */
export async function pushDataToGist(
  token: string,
  gistId: string,
  fullData: any,
  filename: string = DEFAULT_GIST_FILENAME
): Promise<GistSyncResult> {
  const cleanToken = token.trim();
  const cleanGistId = extractGistId(gistId);

  if (!cleanToken) {
    return { success: false, message: '请先提供 GitHub Token' };
  }
  if (!cleanGistId) {
    return { success: false, message: '请先提供或新建 Gist ID' };
  }

  try {
    const payload = {
      description: `EduTrack Pro 成绩数据库 (最后更新于: ${new Date().toLocaleString('zh-CN')})`,
      files: {
        [filename]: {
          content: JSON.stringify(fullData, null, 2),
        },
      },
    };

    const res = await fetch(`https://api.github.com/gists/${cleanGistId}`, {
      method: 'PATCH',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${cleanToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const errMsg = errJson?.message || `HTTP ${res.status}: ${res.statusText}`;
      if (res.status === 404) {
        return { success: false, message: '找不到指定的 Gist ID，可能已被删除或 ID 填写错误' };
      }
      if (res.status === 401 || res.status === 403) {
        return { success: false, message: 'Token 权限不足或无效，无法更新该 Gist（需具备 gist 写入权限）' };
      }
      return { success: false, message: `同步到 Gist 失败: ${errMsg}` };
    }

    const json = await res.json();
    return {
      success: true,
      message: '✅ 数据已成功同步推送到 GitHub Gist！',
      gistId: cleanGistId,
      gistUrl: json.html_url,
      updatedAt: json.updated_at || new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      success: false,
      message: `网络请求失败: ${err.message || '无法连接 GitHub API'}`,
    };
  }
}

/**
 * Fallback helper that attempts to download raw JSON directly from GitHub's Gist raw mirrors
 */
async function fetchFromRawUrlFallback(cleanGistId: string, filename: string): Promise<GistSyncResult> {
  const fallbackUrls = [
    `https://gist.githubusercontent.com/raw/${cleanGistId}/${filename}?_t=${Date.now()}`,
    `https://gist.githubusercontent.com/raw/${cleanGistId}?_t=${Date.now()}`,
    `https://gist.githubusercontent.com/anonymous/${cleanGistId}/raw/${filename}?_t=${Date.now()}`,
    `https://gist.githubusercontent.com/anonymous/${cleanGistId}/raw?_t=${Date.now()}`,
  ];

  for (const url of fallbackUrls) {
    try {
      const res = await fetch(url, { method: 'GET', mode: 'cors' });
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().startsWith('{')) {
          const parsed = JSON.parse(text);
          if (parsed && (parsed.classes || parsed.students || parsed.scoreRecords)) {
            return {
              success: true,
              message: '✅ 成功通过云端镜像拉取最新数据！',
              data: parsed,
              gistId: cleanGistId,
              updatedAt: new Date().toISOString(),
            };
          }
        }
      }
    } catch {
      // Continue to next fallback
    }
  }

  return { success: false, message: '通过镜像拉取失败' };
}

/**
 * Formats browser network/fetch errors into friendly and actionable user messages
 */
export function formatFriendlyNetworkError(rawMsg: string): string {
  const lower = (rawMsg || '').toLowerCase();
  if (lower.includes('load failed') || lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('cors')) {
    return '网络连接受限或跨域被拦截（可能是浏览器安全限制或私有 Gist 缺少 Token）。本地数据仍可正常录入与分析，您可随时在【Gist同步】中配置 Token。';
  }
  return rawMsg;
}

/**
 * Pulls/fetches data from a GitHub Gist (clean CORS safe with fallbacks)
 */
export async function pullDataFromGist(
  token: string,
  gistId: string,
  filename: string = DEFAULT_GIST_FILENAME
): Promise<GistSyncResult> {
  const cleanToken = normalizeGithubToken(token);
  const cleanGistId = extractGistId(gistId);

  if (!cleanGistId) {
    return { success: false, message: '请先提供有效的 Gist ID' };
  }

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
    };
    if (cleanToken) {
      headers['Authorization'] = `Bearer ${cleanToken}`;
    }

    const cacheBuster = `_t=${Date.now()}`;
    let res: Response;
    try {
      res = await fetch(`https://api.github.com/gists/${cleanGistId}?${cacheBuster}`, {
        method: 'GET',
        headers,
      });
    } catch (fetchErr: any) {
      const rawRes = await fetchFromRawUrlFallback(cleanGistId, filename);
      if (rawRes.success) return rawRes;
      throw fetchErr;
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const errMsg = errJson?.message || `HTTP ${res.status}: ${res.statusText}`;
      if (res.status === 404) {
        const rawRes = await fetchFromRawUrlFallback(cleanGistId, filename);
        if (rawRes.success) return rawRes;
        return {
          success: false,
          message: '未找到指定 Gist，请检查 Gist ID 是否正确；若为私有 Gist 请提供具备 gist 权限的 GitHub Token'
        };
      }
      if (res.status === 403) {
        const rawRes = await fetchFromRawUrlFallback(cleanGistId, filename);
        if (rawRes.success) return rawRes;
        return { success: false, message: `GitHub API 访问频次受限 (${errMsg})，建议填写 GitHub Token` };
      }
      return { success: false, message: `从 Gist 拉取失败: ${errMsg}` };
    }

    const json = await res.json();
    const files = json.files || {};
    
    let targetFile = files[filename];
    if (!targetFile) {
      const jsonKey = Object.keys(files).find(k => k.endsWith('.json'));
      if (jsonKey) {
        targetFile = files[jsonKey];
      }
    }

    if (!targetFile) {
      return { success: false, message: `Gist 中未找到可用的 JSON 数据文件（期望: ${filename}）` };
    }

    let fileContent = targetFile.content;
    if (targetFile.truncated && targetFile.raw_url) {
      const rawUrlWithTimestamp = targetFile.raw_url.includes('?')
        ? `${targetFile.raw_url}&_t=${Date.now()}`
        : `${targetFile.raw_url}?_t=${Date.now()}`;
      const rawRes = await fetch(rawUrlWithTimestamp);
      if (!rawRes.ok) {
        throw new Error(`无法获取截断的大文件数据 (HTTP ${rawRes.status})`);
      }
      fileContent = await rawRes.text();
    }

    if (!fileContent) {
      return { success: false, message: 'Gist 数据文件内容为空' };
    }

    const parsed = JSON.parse(fileContent);

    if (!parsed || (!parsed.classes && !parsed.students && !parsed.scoreRecords)) {
      return {
        success: false,
        message: 'Gist 文件格式不符合要求（未检测到班级或学员数据结构）',
      };
    }

    return {
      success: true,
      message: '✅ 成功从 GitHub Gist 拉取最新数据！',
      data: parsed,
      gistId: cleanGistId,
      gistUrl: json.html_url,
      updatedAt: json.updated_at || new Date().toISOString(),
    };
  } catch (err: any) {
    const rawRes = await fetchFromRawUrlFallback(cleanGistId, filename);
    if (rawRes.success) return rawRes;

    const friendly = formatFriendlyNetworkError(err.message || '网络连接异常');
    return {
      success: false,
      message: `解析或拉取 Gist 提示: ${friendly}`,
    };
  }
}

/**
 * Intelligent Smart Push
 */
export async function pushDataToGistWithSmartMerge(
  token: string,
  gistId: string,
  localData: any,
  filename: string = DEFAULT_GIST_FILENAME
): Promise<GistSyncResult & { report?: MergeReport }> {
  const cleanToken = token.trim();
  const cleanGistId = extractGistId(gistId);

  if (!cleanToken) {
    return { success: false, message: '请先提供 GitHub Token' };
  }
  if (!cleanGistId) {
    return { success: false, message: '请先提供或新建 Gist ID' };
  }

  try {
    const remoteResult = await pullDataFromGist(cleanToken, cleanGistId, filename);

    let finalDataToPush = localData;
    let mergeReport: MergeReport | undefined = undefined;

    if (remoteResult.success && remoteResult.data) {
      const { merged, report } = mergeDatasets(localData, remoteResult.data);
      finalDataToPush = merged;
      mergeReport = report;
    }

    const pushResult = await pushDataToGist(cleanToken, cleanGistId, finalDataToPush, filename);

    if (!pushResult.success) {
      return pushResult;
    }

    let summaryMsg = '✅ 数据已成功同步推送到 GitHub Gist！';
    if (mergeReport && mergeReport.incomingScoresCount > 0) {
      summaryMsg = `✅ 智能合并推送成功！同时融合了其他老师录入的 ${mergeReport.incomingScoresCount} 条新成绩记录。`;
    }

    return {
      ...pushResult,
      message: summaryMsg,
      data: finalDataToPush,
      report: mergeReport,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `智能合并与同步失败: ${err.message || '网络通信异常'}`,
    };
  }
}
