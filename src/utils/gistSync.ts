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
 * 2. 核心合并算法 (Merge Logic)
 * 纯粹通用的基于 updatedAt 时间戳与 isDeleted 软删除的双向合并算法
 * - 遍历 localList 与 remoteList，按 id 匹配
 * - 若 id 仅存在于单侧，直接保留
 * - 若两边都存在同一个 id，对比 updatedAt，保留时间戳较大的最新修改版本（无论是内容更新还是 isDeleted: true 软删除）
 */
export function mergeData<T extends { id: string; updatedAt?: number | string; isDeleted?: boolean }>(
  localList: T[] = [],
  remoteList: T[] = []
): T[] {
  const map = new Map<string, T>();

  const normalizeItem = (item: T): T => {
    const rawTime = item.updatedAt;
    const numTime = typeof rawTime === 'number' && !isNaN(rawTime)
      ? rawTime
      : (rawTime ? new Date(rawTime).getTime() || 0 : 0);
    return {
      ...item,
      updatedAt: numTime,
      isDeleted: Boolean(item.isDeleted),
    };
  };

  // 1. 添加所有本地项
  for (const rawItem of (Array.isArray(localList) ? localList : [])) {
    if (!rawItem || !rawItem.id) continue;
    const item = normalizeItem(rawItem);
    map.set(item.id, item);
  }

  // 2. 双向合并云端项
  for (const rawRemote of (Array.isArray(remoteList) ? remoteList : [])) {
    if (!rawRemote || !rawRemote.id) continue;
    const remote = normalizeItem(rawRemote);
    const local = map.get(remote.id);

    if (!local) {
      map.set(remote.id, remote);
    } else {
      const localTime = Number(local.updatedAt) || 0;
      const remoteTime = Number(remote.updatedAt) || 0;

      if (remoteTime > localTime) {
        map.set(remote.id, remote);
      } else if (localTime > remoteTime) {
        map.set(remote.id, local);
      } else {
        // 时间戳相同时，以最新包含字段融合，若其中一方已软删除则优先标记为删除
        map.set(remote.id, {
          ...remote,
          ...local,
          updatedAt: localTime,
          isDeleted: Boolean(local.isDeleted || remote.isDeleted),
        });
      }
    }
  }

  return Array.from(map.values());
}

/**
 * 完整数据集双向合并函数：采用时间戳与软删除算法合并班级、学员、成绩及字典数据
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

  const rawLocalScores: ScoreRecord[] = Array.isArray(localData?.scoreRecords) ? localData.scoreRecords : [];
  const rawRemoteScores: ScoreRecord[] = Array.isArray(remoteData?.scoreRecords) ? remoteData.scoreRecords : [];

  const rawLocalStudents: Student[] = Array.isArray(localData?.students) ? localData.students : [];
  const rawRemoteStudents: Student[] = Array.isArray(remoteData?.students) ? remoteData.students : [];

  const rawLocalClasses: ClassGroup[] = Array.isArray(localData?.classes) ? localData.classes : [];
  const rawRemoteClasses: ClassGroup[] = Array.isArray(remoteData?.classes) ? remoteData.classes : [];

  // 1. 合并成绩记录
  const mergedScores = mergeData<ScoreRecord>(rawLocalScores, rawRemoteScores);

  // 统计成绩变化
  const localScoresMap = new Map(rawLocalScores.map(s => [s.id, s]));
  const remoteScoresMap = new Map(rawRemoteScores.map(s => [s.id, s]));

  let newScoresFromRemote = 0;
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

  for (const s of mergedScores) {
    if (s.isDeleted) continue; // 仅统计活跃记录

    const inLocal = localScoresMap.get(s.id);
    const inRemote = remoteScoresMap.get(s.id);

    if (!inLocal && inRemote && !inRemote.isDeleted) {
      newScoresFromRemote++;
      if (incomingScoreSamples.length < 8) {
        incomingScoreSamples.push({
          studentName: s.studentName || '未命名学员',
          className: s.className || '未指定班级',
          unit: s.unit || '阶段测验',
          examTitle: s.examTitle || '测验',
          score: typeof s.score === 'number' ? s.score : null,
          level: s.level,
          examDate: s.examDate
        });
      }
    } else if (inLocal && inRemote && !inLocal.isDeleted && !inRemote.isDeleted) {
      const lTime = Number(inLocal.updatedAt) || 0;
      const rTime = Number(inRemote.updatedAt) || 0;
      if (rTime > lTime && (inLocal.score !== inRemote.score || inLocal.attendance !== inRemote.attendance)) {
        incomingScoresUpdated++;
        if (incomingScoreUpdates.length < 10) {
          incomingScoreUpdates.push({
            scoreId: s.id,
            studentName: s.studentName,
            className: s.className,
            unit: s.unit,
            description: `成绩: ${inLocal.score ?? '待评'}分 → ${inRemote.score ?? '待评'}分`
          });
        }
      } else if (lTime > rTime && (inLocal.score !== inRemote.score || inLocal.attendance !== inRemote.attendance)) {
        outgoingScoresUpdated++;
        if (outgoingScoreUpdates.length < 10) {
          outgoingScoreUpdates.push({
            scoreId: s.id,
            studentName: s.studentName,
            className: s.className,
            unit: s.unit,
            description: `成绩: ${inRemote.score ?? '待评'}分 → ${inLocal.score ?? '待评'}分`
          });
        }
      }
    }
  }

  // 2. 合并学员列表
  const mergedStudents = mergeData<Student>(rawLocalStudents, rawRemoteStudents);
  const localStudentsMap = new Map(rawLocalStudents.map(s => [s.id, s]));
  const remoteStudentsMap = new Map(rawRemoteStudents.map(s => [s.id, s]));

  let newStudentsFromRemote = 0;
  let incomingStudentsUpdated = 0;
  let outgoingStudentsUpdated = 0;
  const incomingStudentNames: string[] = [];
  const incomingStudentUpdates: StudentUpdateDetail[] = [];
  const outgoingStudentUpdates: StudentUpdateDetail[] = [];

  for (const stu of mergedStudents) {
    if (stu.isDeleted) continue;

    const inLocal = localStudentsMap.get(stu.id);
    const inRemote = remoteStudentsMap.get(stu.id);

    if (!inLocal && inRemote && !inRemote.isDeleted) {
      newStudentsFromRemote++;
      if (stu.name && incomingStudentNames.length < 10) {
        incomingStudentNames.push(stu.name);
      }
    } else if (inLocal && inRemote && !inLocal.isDeleted && !inRemote.isDeleted) {
      const lTime = Number(inLocal.updatedAt) || 0;
      const rTime = Number(inRemote.updatedAt) || 0;
      const levelDiff = inLocal.currentLevel !== inRemote.currentLevel;
      const classDiff = inLocal.classId !== inRemote.classId;

      if (rTime > lTime && (levelDiff || classDiff)) {
        incomingStudentsUpdated++;
        if (levelDiff) {
          incomingStudentUpdates.push({
            studentId: stu.id,
            studentName: stu.name,
            field: 'currentLevel',
            from: inLocal.currentLevel || '未定',
            to: inRemote.currentLevel || '未定',
            description: `在读级别: ${inLocal.currentLevel || '未定'} → ${inRemote.currentLevel || '未定'}`
          });
        }
      } else if (lTime > rTime && (levelDiff || classDiff)) {
        outgoingStudentsUpdated++;
        if (levelDiff) {
          outgoingStudentUpdates.push({
            studentId: stu.id,
            studentName: stu.name,
            field: 'currentLevel',
            from: inRemote.currentLevel || '未定',
            to: inLocal.currentLevel || '未定',
            description: `在读级别: ${inRemote.currentLevel || '未定'} → ${inLocal.currentLevel || '未定'}`
          });
        }
      }
    }
  }

  // 3. 合并班级列表
  const mergedClasses = mergeData<ClassGroup>(rawLocalClasses, rawRemoteClasses);
  const localClassesMap = new Map(rawLocalClasses.map(c => [c.id, c]));
  const remoteClassesMap = new Map(rawRemoteClasses.map(c => [c.id, c]));

  let newClassesFromRemote = 0;
  let incomingClassesUpdated = 0;
  let outgoingClassesUpdated = 0;
  const incomingClassNames: string[] = [];
  const incomingClassUpdates: ClassUpdateDetail[] = [];
  const outgoingClassUpdates: ClassUpdateDetail[] = [];

  for (const cls of mergedClasses) {
    if (cls.isDeleted) continue;

    const inLocal = localClassesMap.get(cls.id);
    const inRemote = remoteClassesMap.get(cls.id);

    if (!inLocal && inRemote && !inRemote.isDeleted) {
      newClassesFromRemote++;
      if (cls.name && incomingClassNames.length < 10) {
        incomingClassNames.push(cls.name);
      }
    } else if (inLocal && inRemote && !inLocal.isDeleted && !inRemote.isDeleted) {
      const lTime = Number(inLocal.updatedAt) || 0;
      const rTime = Number(inRemote.updatedAt) || 0;
      const levelDiff = (inLocal.currentLevel || inLocal.level) !== (inRemote.currentLevel || inRemote.level);
      const teacherDiff = inLocal.teacherName !== inRemote.teacherName;

      if (rTime > lTime && (levelDiff || teacherDiff)) {
        incomingClassesUpdated++;
        if (levelDiff) {
          incomingClassUpdates.push({
            classId: cls.id,
            className: cls.name,
            field: 'level',
            from: inLocal.currentLevel || inLocal.level,
            to: inRemote.currentLevel || inRemote.level,
            description: `班级主授级别: ${inLocal.currentLevel || inLocal.level} → ${inRemote.currentLevel || inRemote.level}`
          });
        }
      } else if (lTime > rTime && (levelDiff || teacherDiff)) {
        outgoingClassesUpdated++;
      }
    }
  }

  // 4. 合并字典与标签（支持软删除与新增时间戳，防止已删除项在同步时死灰复燃）
  const localDeleted = localData?.deletedEntities || {};
  const remoteDeleted = remoteData?.deletedEntities || {};
  const localAdded = localData?.dictionaryAddedAt || {};
  const remoteAdded = remoteData?.dictionaryAddedAt || {};

  // 合并删除字典记录
  const mergedDeletedEntities = {
    levels: { ...(localDeleted.levels || {}), ...(remoteDeleted.levels || {}) },
    units: { ...(localDeleted.units || {}), ...(remoteDeleted.units || {}) },
    teachers: { ...(localDeleted.teachers || {}), ...(remoteDeleted.teachers || {}) },
    tags: { ...(localDeleted.tags || {}), ...(remoteDeleted.tags || {}) },
    weakPointCategories: { ...(localDeleted.weakPointCategories || {}), ...(remoteDeleted.weakPointCategories || {}) },
  };

  // 合并新增字典记录
  const mergedDictionaryAddedAt = {
    levels: { ...(localAdded.levels || {}), ...(remoteAdded.levels || {}) },
    units: { ...(localAdded.units || {}), ...(remoteAdded.units || {}) },
    teachers: { ...(localAdded.teachers || {}), ...(remoteAdded.teachers || {}) },
    tags: { ...(localAdded.tags || {}), ...(remoteAdded.tags || {}) },
  };

  const mergeDictionaryList = (
    localList: string[] = [],
    remoteList: string[] = [],
    deletedMap: Record<string, number> = {},
    addedMap: Record<string, number> = {}
  ): string[] => {
    const candidates = Array.from(new Set([...(localList || []), ...(remoteList || [])].filter(Boolean)));
    return candidates.filter(item => {
      const deletedAt = deletedMap[item] || 0;
      const addedAt = addedMap[item] || 0;
      if (deletedAt > 0) {
        // 如果有删除标记，仅当在删除之后又明确被重新添加时才保留
        return addedAt > deletedAt;
      }
      return true;
    });
  };

  const mergedLevels = mergeDictionaryList(
    localData?.levels || [],
    remoteData?.levels || [],
    mergedDeletedEntities.levels,
    mergedDictionaryAddedAt.levels
  );

  const mergedUnits = mergeDictionaryList(
    localData?.units || [],
    remoteData?.units || [],
    mergedDeletedEntities.units,
    mergedDictionaryAddedAt.units
  );

  const mergedTeachers = mergeDictionaryList(
    localData?.teachers || [],
    remoteData?.teachers || [],
    mergedDeletedEntities.teachers,
    mergedDictionaryAddedAt.teachers
  );

  const localCats: WeakPointTagCategory[] = Array.isArray(localData?.weakPointCategories) ? localData.weakPointCategories : [];
  const remoteCats: WeakPointTagCategory[] = Array.isArray(remoteData?.weakPointCategories) ? remoteData.weakPointCategories : [];
  const catMap = new Map<string, string[]>();

  for (const c of localCats) {
    if (c && c.category && !mergedDeletedEntities.weakPointCategories[c.category]) {
      const validTags = (Array.isArray(c.tags) ? c.tags : []).filter(
        t => !mergedDeletedEntities.tags[`${c.category}:::${t}`]
      );
      catMap.set(c.category, validTags);
    }
  }

  for (const rC of remoteCats) {
    if (rC && rC.category && !mergedDeletedEntities.weakPointCategories[rC.category]) {
      const existing = catMap.get(rC.category) || [];
      const remoteValidTags = (Array.isArray(rC.tags) ? rC.tags : []).filter(
        t => !mergedDeletedEntities.tags[`${rC.category}:::${t}`]
      );
      catMap.set(rC.category, Array.from(new Set([...existing, ...remoteValidTags])));
    }
  }

  const mergedWeakPointCategories: WeakPointTagCategory[] = Array.from(catMap.entries()).map(([category, tags]) => ({
    category,
    tags
  }));

  // 计算活跃非删除数量
  const activeScoresCount = mergedScores.filter(s => !s.isDeleted).length;
  const activeStudentsCount = mergedStudents.filter(s => !s.isDeleted).length;
  const activeClassesCount = mergedClasses.filter(c => !c.isDeleted).length;

  const newOutgoingScoresCount = mergedScores.filter(s => !s.isDeleted && !remoteScoresMap.has(s.id)).length;
  const newOutgoingStudentsCount = mergedStudents.filter(s => !s.isDeleted && !remoteStudentsMap.has(s.id)).length;
  const newOutgoingClassesCount = mergedClasses.filter(c => !c.isDeleted && !remoteClassesMap.has(c.id)).length;

  report.incomingScoresCount = newScoresFromRemote;
  report.outgoingScoresCount = newOutgoingScoresCount;
  report.incomingScoresUpdated = incomingScoresUpdated;
  report.outgoingScoresUpdated = outgoingScoresUpdated;
  report.totalScoresCount = activeScoresCount;
  report.incomingStudentsCount = newStudentsFromRemote;
  report.outgoingStudentsCount = newOutgoingStudentsCount;
  report.incomingStudentsUpdated = incomingStudentsUpdated;
  report.outgoingStudentsUpdated = outgoingStudentsUpdated;
  report.totalStudentsCount = activeStudentsCount;
  report.incomingClassesCount = newClassesFromRemote;
  report.outgoingClassesCount = newOutgoingClassesCount;
  report.incomingClassesUpdated = incomingClassesUpdated;
  report.outgoingClassesUpdated = outgoingClassesUpdated;
  report.totalClassesCount = activeClassesCount;
  report.isMerged =
    newScoresFromRemote > 0 ||
    newOutgoingScoresCount > 0 ||
    incomingScoresUpdated > 0 ||
    outgoingScoresUpdated > 0 ||
    newStudentsFromRemote > 0 ||
    newOutgoingStudentsCount > 0 ||
    incomingStudentsUpdated > 0 ||
    outgoingStudentsUpdated > 0 ||
    newClassesFromRemote > 0 ||
    newOutgoingClassesCount > 0 ||
    incomingClassesUpdated > 0;
  report.incomingStudentNames = incomingStudentNames;
  report.incomingClassNames = incomingClassNames;
  report.incomingStudentUpdates = incomingStudentUpdates;
  report.outgoingStudentUpdates = outgoingStudentUpdates;
  report.incomingClassUpdates = incomingClassUpdates;
  report.outgoingClassUpdates = outgoingClassUpdates;
  report.incomingScoreUpdates = incomingScoreUpdates;
  report.outgoingScoreUpdates = outgoingScoreUpdates;
  report.incomingScoreSamples = incomingScoreSamples;
  report.newDictionaries = {
    levels: mergedLevels.filter(l => !(localData?.levels || []).includes(l)),
    units: mergedUnits.filter(u => !(localData?.units || []).includes(u)),
    teachers: mergedTeachers.filter(t => !(localData?.teachers || []).includes(t))
  };

  const mergedData = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    classes: mergedClasses,
    students: mergedStudents,
    scoreRecords: mergedScores,
    levels: mergedLevels,
    units: mergedUnits,
    teachers: mergedTeachers,
    weakPointCategories: mergedWeakPointCategories,
    deletedEntities: mergedDeletedEntities,
    dictionaryAddedAt: mergedDictionaryAddedAt,
  };

  return {
    merged: mergedData,
    report
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
