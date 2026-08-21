import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import { Student, ClassGroup, ScoreRecord, WeakPointTagCategory, SyncLogEntry, SyncNotificationData } from '../types';
import {
  INITIAL_CLASSES,
  INITIAL_STUDENTS,
  INITIAL_SCORE_RECORDS,
  DEFAULT_LEVELS,
  DEFAULT_UNITS,
  DEFAULT_TEACHERS,
  DEFAULT_WEAK_POINT_CATEGORIES
} from '../data/initialData';
import {
  GistConfig,
  GistSyncResult,
  MergeReport,
  getStoredGistConfig,
  saveStoredGistConfig,
  createGistOnGitHub,
  pushDataToGist,
  pullDataFromGist,
  pushDataToGistWithSmartMerge,
  mergeDatasets,
  mergeData,
  parseGistUrlParams,
  generateGistShareUrl,
  DEFAULT_GIST_FILENAME,
  GIST_LOGS_STORAGE_KEY
} from '../utils/gistSync';

export interface UrlBindingNotification {
  type: 'success' | 'info' | 'error';
  message: string;
}

export interface ScoreBatchSyncResult {
  localSavedCount: number;
  newRecords: ScoreRecord[];
  cloudSynced: boolean;
  cloudMessage: string;
  mergeReport?: MergeReport;
  totalRecordsCount: number;
}

interface AppContextType {
  classes: ClassGroup[];
  students: Student[];
  scoreRecords: ScoreRecord[];
  levels: string[];
  units: string[];
  teachers: string[];
  weakPointCategories: WeakPointTagCategory[];

  // GitHub Gist Cloud Sync & Smart Merge
  gistConfig: GistConfig;
  updateGistConfig: (cfg: Partial<GistConfig>) => void;
  isSyncingGist: boolean;
  gistLastMessage: string | null;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  latestMergeReport: MergeReport | null;
  syncNotification: SyncNotificationData | null;
  showSyncNotification: (data: SyncNotificationData) => void;
  dismissSyncNotification: () => void;
  urlBindingNotification: UrlBindingNotification | null;
  dismissUrlBindingNotification: () => void;
  syncLogs: SyncLogEntry[];
  addSyncLog: (entry: Omit<SyncLogEntry, 'id' | 'timestamp'>) => void;
  isGistConfigModalOpen: boolean;
  openGistConfigModal: () => void;
  closeGistConfigModal: () => void;
  pushToGist: (customToken?: string, customGistId?: string) => Promise<GistSyncResult & { report?: MergeReport }>;
  pullFromGist: (customToken?: string, customGistId?: string, silent?: boolean) => Promise<GistSyncResult>;
  purePullFromGist: (customToken?: string, customGistId?: string) => Promise<GistSyncResult>;
  syncAndMergeGist: () => Promise<GistSyncResult & { report?: MergeReport }>;
  manualRefreshFromCloud: () => Promise<{ success: boolean; message: string; mergeReport?: MergeReport }>;
  manualSaveAndPushToCloud: () => Promise<{ success: boolean; message: string; mergeReport?: MergeReport }>;
  createAndLinkGist: (token: string) => Promise<GistSyncResult>;
  getShareUrl: (mode?: 'full' | 'readonly') => string;

  // Score Operations
  addScoreBatch: (records: Omit<ScoreRecord, 'id' | 'recordedAt'>[]) => void;
  addScoreBatchAndSync: (
    records: Omit<ScoreRecord, 'id' | 'recordedAt'>[],
    options?: { syncToCloud?: boolean; teacherName?: string }
  ) => Promise<ScoreBatchSyncResult>;
  updateScoreRecord: (id: string, updated: Partial<ScoreRecord>) => void;
  deleteScoreRecord: (id: string) => void;
  deleteScoreBatch: (batchId: string) => void;

  // Class Operations
  addClass: (cls: Omit<ClassGroup, 'id'>) => ClassGroup;
  addClassAndSync: (
    cls: Omit<ClassGroup, 'id'>,
    options?: { teacherName?: string }
  ) => Promise<{ success: boolean; message: string; mergeReport?: MergeReport }>;
  batchAddClasses: (classesList: Omit<ClassGroup, 'id'>[]) => ClassGroup[];
  updateClass: (id: string, cls: Partial<ClassGroup>, syncStudentsLevel?: boolean) => void;
  updateClassAndSync: (
    id: string,
    cls: Partial<ClassGroup>,
    syncStudentsLevel?: boolean,
    options?: { teacherName?: string }
  ) => Promise<{ success: boolean; message: string; mergeReport?: MergeReport; affectedStudentCount?: number }>;
  deleteClass: (id: string) => void;

  // Student Operations
  addStudent: (student: Omit<Student, 'id'>) => Student;
  addStudentAndSync: (
    student: Omit<Student, 'id'>,
    options?: { teacherName?: string }
  ) => Promise<{ success: boolean; message: string; mergeReport?: MergeReport }>;
  updateStudent: (id: string, student: Partial<Student>) => void;
  updateStudentAndSync: (
    id: string,
    student: Partial<Student>,
    options?: { teacherName?: string }
  ) => Promise<{ success: boolean; message: string; mergeReport?: MergeReport }>;
  batchUpdateStudentsLevelAndSync: (
    studentIds: string[],
    newLevel: string,
    options?: { teacherName?: string }
  ) => Promise<{ success: boolean; message: string; mergeReport?: MergeReport }>;
  deleteStudent: (id: string) => void;
  batchAddStudents: (students: Omit<Student, 'id'>[]) => void;
  batchDeleteStudents: (studentIds: string[]) => void;
  transferStudent: (
    studentId: string,
    targetClassId: string,
    newLevel?: string,
    syncPastScores?: boolean,
    reasonNote?: string
  ) => void;
  batchTransferStudents: (
    studentIds: string[],
    targetClassId: string,
    newLevel?: string,
    syncPastScores?: boolean,
    reasonNote?: string
  ) => void;
  suspendStudent: (studentId: string, reason?: string, removeFromClass?: boolean) => void;
  restoreStudent: (studentId: string, targetClassId?: string, newLevel?: string) => void;
  batchSuspendStudents: (studentIds: string[], reason?: string) => void;
  batchRestoreStudents: (studentIds: string[], targetClassId?: string) => void;

  // Config Operations
  addLevel: (level: string) => void;
  deleteLevel: (level: string) => void;
  addUnit: (unit: string) => void;
  deleteUnit: (unit: string) => void;
  addTeacher: (teacher: string) => void;
  deleteTeacher: (teacher: string) => void;
  addWeakPointTag: (category: string, tag: string) => void;

  // Data & Reset
  clearStudentsAndClasses: () => void;
  resetToDemoData: () => void;
  exportDataToJson: () => string;
  importDataFromJson: (jsonStr: string) => boolean;
}

const STORAGE_KEYS = {
  CLASSES: 'training_scores_classes_v2',
  STUDENTS: 'training_scores_students_v2',
  RECORDS: 'training_scores_records_v2',
  LEVELS: 'training_scores_levels_v2',
  UNITS: 'training_scores_units_v2',
  TEACHERS: 'training_scores_teachers_v2',
  TAGS: 'training_scores_tags_v2',
};

const normalizeTimestamp = (val: any): number => {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (!val) return Date.now();
  const t = new Date(val).getTime();
  return isNaN(t) ? Date.now() : t;
};

const normalizeScore = (s: any): ScoreRecord => ({
  ...s,
  id: s.id || `scr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  updatedAt: normalizeTimestamp(s.updatedAt || s.recordedAt),
  isDeleted: Boolean(s.isDeleted),
  weakPoints: Array.isArray(s.weakPoints) ? s.weakPoints : []
});

const normalizeStudent = (s: any): Student => ({
  ...s,
  id: s.id || `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  updatedAt: normalizeTimestamp(s.updatedAt),
  isDeleted: Boolean(s.isDeleted),
  status: s.status || 'active'
});

const normalizeClass = (c: any): ClassGroup => {
  const lvl = c.currentLevel || c.level || 'BF1';
  return {
    ...c,
    id: c.id || `cls_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    level: lvl,
    currentLevel: lvl,
    updatedAt: normalizeTimestamp(c.updatedAt),
    isDeleted: Boolean(c.isDeleted),
  };
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [rawClasses, setRawClasses] = useState<ClassGroup[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLASSES);
      const parsed = saved ? JSON.parse(saved) : null;
      const list: ClassGroup[] = Array.isArray(parsed) ? parsed : INITIAL_CLASSES;
      return list.map(normalizeClass);
    } catch {
      return INITIAL_CLASSES.map(normalizeClass);
    }
  });

  const [rawStudents, setRawStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      const parsed = saved ? JSON.parse(saved) : null;
      const list: Student[] = Array.isArray(parsed) ? parsed : INITIAL_STUDENTS;
      return list.map(normalizeStudent);
    } catch {
      return INITIAL_STUDENTS.map(normalizeStudent);
    }
  });

  const [rawScoreRecords, setRawScoreRecords] = useState<ScoreRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RECORDS);
      const parsed = saved ? JSON.parse(saved) : null;
      const list: ScoreRecord[] = Array.isArray(parsed) ? parsed : INITIAL_SCORE_RECORDS;
      return list.map(normalizeScore);
    } catch {
      return INITIAL_SCORE_RECORDS.map(normalizeScore);
    }
  });

  // UI-Facing filtered state (filtering out soft-deleted items)
  const classes = useMemo(() => rawClasses.filter(c => !c.isDeleted), [rawClasses]);
  const students = useMemo(() => rawStudents.filter(s => !s.isDeleted), [rawStudents]);
  const scoreRecords = useMemo(() => rawScoreRecords.filter(r => !r.isDeleted), [rawScoreRecords]);

  const [levels, setLevels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LEVELS);
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : DEFAULT_LEVELS;
    } catch {
      return DEFAULT_LEVELS;
    }
  });

  const [units, setUnits] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.UNITS);
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : DEFAULT_UNITS;
    } catch {
      return DEFAULT_UNITS;
    }
  });

  const [teachers, setTeachers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TEACHERS);
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : DEFAULT_TEACHERS;
    } catch {
      return DEFAULT_TEACHERS;
    }
  });

  const [weakPointCategories, setWeakPointCategories] = useState<WeakPointTagCategory[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TAGS);
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : DEFAULT_WEAK_POINT_CATEGORIES;
    } catch {
      return DEFAULT_WEAK_POINT_CATEGORIES;
    }
  });

  // GitHub Gist Cloud Sync State
  const [gistConfig, setGistConfig] = useState<GistConfig>(() => getStoredGistConfig());
  const [isSyncingGist, setIsSyncingGist] = useState<boolean>(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [gistLastMessage, setGistLastMessage] = useState<string | null>(null);
  const [latestMergeReport, setLatestMergeReport] = useState<MergeReport | null>(null);
  const [urlBindingNotification, setUrlBindingNotification] = useState<UrlBindingNotification | null>(null);
  const [isGistConfigModalOpen, setIsGistConfigModalOpen] = useState<boolean>(false);

  const [syncNotification, setSyncNotification] = useState<SyncNotificationData | null>(null);

  const showSyncNotification = (data: SyncNotificationData) => {
    setSyncNotification(data);
  };

  const dismissSyncNotification = () => {
    setSyncNotification(null);
  };

  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(GIST_LOGS_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const addSyncLog = (entry: Omit<SyncLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: SyncLogEntry = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    };
    setSyncLogs(prev => {
      const updated = [newEntry, ...prev].slice(0, 40);
      try {
        localStorage.setItem(GIST_LOGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const openGistConfigModal = () => setIsGistConfigModalOpen(true);
  const closeGistConfigModal = () => setIsGistConfigModalOpen(false);

  const isPullingRef = useRef<boolean>(false);
  const isInitialMountRef = useRef<boolean>(true);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const updateGistConfig = (cfg: Partial<GistConfig>) => {
    setGistConfig(prev => {
      const updated = { ...prev, ...cfg };
      saveStoredGistConfig(updated);
      return updated;
    });
  };

  const dismissUrlBindingNotification = () => {
    setUrlBindingNotification(null);
  };

  const getFullDatabaseObject = () => {
    return {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      classes: rawClasses,
      students: rawStudents,
      scoreRecords: rawScoreRecords,
      levels,
      units,
      teachers,
      weakPointCategories,
    };
  };

  const applyMergedData = (data: any) => {
    if (!data) return;

    if (Array.isArray(data.classes)) {
      setRawClasses(data.classes.map(normalizeClass));
    }
    if (Array.isArray(data.students)) {
      setRawStudents(data.students.map(normalizeStudent));
    }
    if (Array.isArray(data.scoreRecords)) {
      setRawScoreRecords(data.scoreRecords.map(normalizeScore));
    }
    if (Array.isArray(data.levels)) {
      setLevels(Array.from(new Set(data.levels.filter(Boolean))));
    }
    if (Array.isArray(data.units)) {
      setUnits(Array.from(new Set(data.units.filter(Boolean))));
    }
    if (Array.isArray(data.teachers)) {
      setTeachers(Array.from(new Set(data.teachers.filter(Boolean))));
    }
    if (Array.isArray(data.weakPointCategories)) {
      setWeakPointCategories(data.weakPointCategories);
    }
  };

  const pushToGist = async (
    customToken?: string,
    customGistId?: string
  ): Promise<GistSyncResult & { report?: MergeReport }> => {
    const tokenToUse = customToken || gistConfig.token;
    const gistIdToUse = customGistId || gistConfig.gistId;
    const filenameToUse = gistConfig.filename || DEFAULT_GIST_FILENAME;

    setIsSyncingGist(true);
    setGistLastMessage('正在执行多端智能合并与云端同步...');
    try {
      const fullData = getFullDatabaseObject();
      const res = await pushDataToGistWithSmartMerge(tokenToUse, gistIdToUse, fullData, filenameToUse);
      if (res.success) {
        if (res.data) {
          applyMergedData(res.data);
        }
        if (res.report) {
          setLatestMergeReport(res.report);
        }
        const nowIso = new Date().toISOString();
        updateGistConfig({
          token: tokenToUse,
          gistId: gistIdToUse,
          lastSyncedAt: nowIso,
        });
        setGistLastMessage(res.message || `✅ 智能同步完成 (${new Date().toLocaleTimeString('zh-CN')})`);
        addSyncLog({
          type: 'push',
          success: true,
          message: '全校数据智能合并并同步上传至 Gist',
          operatorTeacher: gistConfig.teacherName || '任课教师',
          incomingCount: res.report?.incomingScoresCount || 0,
          totalRecordsCount: res.report?.totalScoresCount || scoreRecords.length
        });

        const incoming = res.report?.incomingScoresCount || 0;
        const outgoing = res.report?.outgoingScoresCount || 0;
        showSyncNotification({
          id: `sync_push_${Date.now()}`,
          type: 'success',
          action: 'push',
          title: incoming > 0 ? '云端双向智能合并完成' : '已成功推送归档至云端 Gist',
          message: incoming > 0
            ? `本地学情已安全上传合并，并同步融合了其他老师录入的 ${incoming} 条新成绩、${res.report?.incomingStudentsCount || 0} 位新学员！`
            : '全校学员档案、班级信息及成绩台账已完整加密保存在 GitHub Gist 专属数据库。',
          timestamp: new Date().toLocaleTimeString('zh-CN'),
          teacherName: gistConfig.teacherName,
          gistId: gistIdToUse,
          incomingScoresCount: incoming,
          outgoingScoresCount: outgoing,
          incomingStudentsCount: res.report?.incomingStudentsCount,
          incomingClassesCount: res.report?.incomingClassesCount,
          totalScoresCount: res.report?.totalScoresCount || scoreRecords.length,
          totalStudentsCount: res.report?.totalStudentsCount || students.length,
          totalClassesCount: res.report?.totalClassesCount || classes.length,
          incomingStudentNames: res.report?.incomingStudentNames,
          incomingClassNames: res.report?.incomingClassNames,
          incomingScoreSamples: res.report?.incomingScoreSamples,
          newDictionaries: res.report?.newDictionaries
        });
      } else {
        setGistLastMessage(`❌ 同步失败: ${res.message}`);
        addSyncLog({
          type: 'push',
          success: false,
          message: `上传同步失败: ${res.message}`,
          operatorTeacher: gistConfig.teacherName || '任课教师'
        });
        showSyncNotification({
          id: `sync_push_err_${Date.now()}`,
          type: 'error',
          action: 'push',
          title: '云端同步推送失败',
          message: res.message || '请检查 GitHub Token 权限设置或网络连接',
          timestamp: new Date().toLocaleTimeString('zh-CN'),
          teacherName: gistConfig.teacherName,
          gistId: gistIdToUse
        });
      }
      return res;
    } finally {
      setIsSyncingGist(false);
    }
  };

  const syncAndMergeGist = async (): Promise<GistSyncResult & { report?: MergeReport }> => {
    if (!gistConfig.gistId) {
      return { success: false, message: '请先提供或绑定 Gist ID' };
    }
    return pushToGist();
  };

  const manualSaveAndPushToCloud = async (): Promise<{ success: boolean; message: string; mergeReport?: MergeReport }> => {
    if (!gistConfig.gistId || !gistConfig.token) {
      return { success: false, message: '尚未配置 GitHub Token 或 Gist ID' };
    }
    const res = await pushToGist();
    return {
      success: res.success,
      message: res.success ? '✅ 已成功将数据智能合并并上传至云端！' : `❌ 上传失败: ${res.message}`,
      mergeReport: res.report
    };
  };

  const manualRefreshFromCloud = async (): Promise<{ success: boolean; message: string; mergeReport?: MergeReport }> => {
    if (!gistConfig.gistId) {
      return { success: false, message: '尚未配置或绑定 Gist ID' };
    }
    const res = await pullFromGist(gistConfig.token || undefined, gistConfig.gistId, false);
    return {
      success: res.success,
      message: res.success ? '✅ 已成功拉取并刷新云端全校最新学情档案！' : `❌ 拉取失败: ${res.message}`,
      mergeReport: latestMergeReport || undefined
    };
  };

  const pullFromGist = async (
    customToken?: string,
    customGistId?: string,
    silent: boolean = false
  ): Promise<GistSyncResult> => {
    const tokenToUse = customToken !== undefined ? customToken : gistConfig.token;
    const gistIdToUse = customGistId || gistConfig.gistId;
    const filenameToUse = gistConfig.filename || DEFAULT_GIST_FILENAME;

    if (!gistIdToUse) {
      return { success: false, message: '请先提供或绑定 Gist ID' };
    }

    isPullingRef.current = true;
    if (!silent) {
      setIsSyncingGist(true);
      setGistLastMessage('正在从 GitHub Gist 拉取最新数据 (无缓存)...');
    }

    try {
      const res = await pullDataFromGist(tokenToUse, gistIdToUse, filenameToUse);
      if (res.success && res.data) {
        const currentLocal = getFullDatabaseObject();
        const { merged, report } = mergeDatasets(currentLocal, res.data);
        applyMergedData(merged);
        if (report.incomingScoresCount > 0 || report.incomingStudentsCount > 0 || report.incomingClassesCount > 0) {
          setLatestMergeReport(report);
        }

        const nowIso = new Date().toISOString();
        updateGistConfig({
          token: tokenToUse,
          gistId: gistIdToUse,
          lastSyncedAt: nowIso,
        });
        setGistLastMessage(`✅ 数据拉取完成 (${new Date().toLocaleTimeString('zh-CN')})`);

        if (!silent) {
          addSyncLog({
            type: 'pull',
            success: true,
            message: `成功拉取云端数据，融合了 ${report.incomingScoresCount} 条新成绩与 ${report.incomingStudentsCount} 位新学员`,
            operatorTeacher: gistConfig.teacherName || '任课教师',
            incomingCount: report.incomingScoresCount,
            totalRecordsCount: report.totalScoresCount || scoreRecords.length
          });

          const hasChanges = (report.incomingScoresCount && report.incomingScoresCount > 0) ||
            (report.incomingStudentsCount && report.incomingStudentsCount > 0) ||
            (report.incomingClassesCount && report.incomingClassesCount > 0);

          showSyncNotification({
            id: `sync_pull_${Date.now()}`,
            type: hasChanges ? 'success' : 'info',
            action: 'pull',
            title: hasChanges ? '云端拉取完成 · 已融合最新学情' : '云端拉取完成 · 数据为最新状态',
            message: hasChanges
              ? `成功从云端 Gist 拉取并融合了 ${report.incomingScoresCount} 条新成绩、${report.incomingStudentsCount} 位新学员及 ${report.incomingClassesCount} 个新班级。`
              : `本地学情数据与云端 Gist 完全一致（全校共 ${report.totalStudentsCount || students.length} 位学员，${report.totalScoresCount || scoreRecords.length} 条有效测评记录），无新增变动。`,
            timestamp: new Date().toLocaleTimeString('zh-CN'),
            teacherName: gistConfig.teacherName,
            gistId: gistIdToUse,
            incomingScoresCount: report.incomingScoresCount,
            incomingStudentsCount: report.incomingStudentsCount,
            incomingClassesCount: report.incomingClassesCount,
            totalScoresCount: report.totalScoresCount || scoreRecords.length,
            totalStudentsCount: report.totalStudentsCount || students.length,
            totalClassesCount: report.totalClassesCount || classes.length,
            incomingStudentNames: report.incomingStudentNames,
            incomingClassNames: report.incomingClassNames,
            incomingScoreSamples: report.incomingScoreSamples,
            newDictionaries: report.newDictionaries
          });
        }
      } else {
        if (!silent) {
          setGistLastMessage(`❌ 拉取失败: ${res.message}`);
          addSyncLog({
            type: 'pull',
            success: false,
            message: `拉取失败: ${res.message}`,
            operatorTeacher: gistConfig.teacherName || '任课教师'
          });
          showSyncNotification({
            id: `sync_pull_err_${Date.now()}`,
            type: 'error',
            action: 'pull',
            title: '云端数据拉取失败',
            message: res.message || '请检查 Gist ID 是否正确或网络是否畅通',
            timestamp: new Date().toLocaleTimeString('zh-CN'),
            teacherName: gistConfig.teacherName,
          });
        }
      }

      return res;
    } catch (err: any) {
      const errMsg = `❌ 拉取异常: ${err?.message || '网络连接超时'}`;
      if (!silent) {
        setGistLastMessage(errMsg);
      }
      return { success: false, message: errMsg };
    } finally {
      if (!silent) {
        setIsSyncingGist(false);
      }
      isPullingRef.current = false;
    }
  };

  /**
   * Pure Pull: Downloads cloud Gist data and applies it
   */
  const purePullFromGist = async (
    customToken?: string,
    customGistId?: string
  ): Promise<GistSyncResult> => {
    const tokenToUse = customToken !== undefined ? customToken : gistConfig.token;
    const gistIdToUse = customGistId || gistConfig.gistId;
    const filenameToUse = gistConfig.filename || DEFAULT_GIST_FILENAME;

    if (!gistIdToUse) {
      return { success: false, message: '请先提供或绑定 Gist ID' };
    }

    isPullingRef.current = true;
    setIsSyncingGist(true);
    setGistLastMessage('正在从 GitHub Gist 纯粹拉取云端数据并刷新本地...');

    try {
      const res = await pullDataFromGist(tokenToUse, gistIdToUse, filenameToUse);
      if (res.success && res.data) {
        applyMergedData(res.data);

        const nowIso = new Date().toISOString();
        updateGistConfig({
          token: tokenToUse,
          gistId: gistIdToUse,
          lastSyncedAt: nowIso,
        });

        const activeStudents = Array.isArray(res.data.students) ? res.data.students.filter((s: any) => !s.isDeleted).length : 0;
        const activeScores = Array.isArray(res.data.scoreRecords) ? res.data.scoreRecords.filter((s: any) => !s.isDeleted).length : 0;
        const activeClasses = Array.isArray(res.data.classes) ? res.data.classes.filter((s: any) => !s.isDeleted).length : 0;

        const successMsg = `✅ 纯粹拉取成功！已用云端权威数据完全同步本地（共 ${activeStudents} 位学员，${activeScores} 条测评记录，${activeClasses} 个班级）`;
        setGistLastMessage(successMsg);

        addSyncLog({
          type: 'pull',
          success: true,
          message: `执行纯拉取操作：完全以云端数据同步本地，共 ${activeScores} 条成绩、${activeStudents} 位学员`,
          operatorTeacher: gistConfig.teacherName || '任课教师',
          incomingCount: activeScores,
          totalRecordsCount: activeScores,
        });

        showSyncNotification({
          id: `sync_pure_pull_${Date.now()}`,
          type: 'success',
          action: 'pull',
          title: '📥 纯粹拉取完成 · 本地已与云端完全一致',
          message: `已从云端 Gist 下载最新完整档案并直接更新本地。全校共 ${activeStudents} 位学员、${activeScores} 条成绩记录、${activeClasses} 个班级。`,
          timestamp: new Date().toLocaleTimeString('zh-CN'),
          teacherName: gistConfig.teacherName,
          gistId: gistIdToUse,
          totalScoresCount: activeScores,
          totalStudentsCount: activeStudents,
          totalClassesCount: activeClasses,
        });

        return { success: true, message: successMsg, data: res.data };
      } else {
        const errMsg = `❌ 纯粹拉取失败: ${res.message || '未知错误'}`;
        setGistLastMessage(errMsg);
        return { success: false, message: errMsg };
      }
    } catch (err: any) {
      const errMsg = `❌ 拉取异常: ${err?.message || '网络连接超时'}`;
      setGistLastMessage(errMsg);
      return { success: false, message: errMsg };
    } finally {
      setIsSyncingGist(false);
      isPullingRef.current = false;
    }
  };

  const createAndLinkGist = async (token: string): Promise<GistSyncResult> => {
    setIsSyncingGist(true);
    setGistLastMessage('正在创建 GitHub Gist 数据仓库...');
    try {
      const fullData = getFullDatabaseObject();
      const res = await createGistOnGitHub(token, fullData, gistConfig.filename || DEFAULT_GIST_FILENAME);
      if (res.success && res.gistId) {
        const nowIso = new Date().toISOString();
        updateGistConfig({
          token,
          gistId: res.gistId,
          lastSyncedAt: nowIso,
        });
        setGistLastMessage(`✅ 成功新建并绑定 Gist 仓库 (${res.gistId.substring(0, 8)}...)`);
      } else {
        setGistLastMessage(`❌ 创建 Gist 失败: ${res.message}`);
      }
      return res;
    } finally {
      setIsSyncingGist(false);
    }
  };

  const getShareUrl = (mode: 'full' | 'readonly' = 'full') => {
    return generateGistShareUrl({
      gistId: gistConfig.gistId,
      token: mode === 'full' ? gistConfig.token : undefined,
      autoSync: gistConfig.autoSync,
      autoPull: gistConfig.autoPullOnLoad,
      mode
    });
  };

  useEffect(() => {
    const initGistSync = async () => {
      const urlParams = parseGistUrlParams();

      if (urlParams.hasUrlBinding && urlParams.gistId) {
        const targetToken = urlParams.token !== undefined ? urlParams.token : (gistConfig.token || '');
        const targetGistId = urlParams.gistId;
        const targetAutoSync = urlParams.autoSync !== undefined ? urlParams.autoSync : true;
        const targetAutoPull = urlParams.autoPull !== undefined ? urlParams.autoPull : true;

        updateGistConfig({
          token: targetToken,
          gistId: targetGistId,
          autoSync: targetAutoSync,
          autoPullOnLoad: targetAutoPull
        });

        const pullRes = await pullFromGist(targetToken, targetGistId, false);
        if (pullRes.success) {
          setUrlBindingNotification({
            type: 'success',
            message: `🔗 已通过专属链接自动绑定 Gist (ID: ${targetGistId.slice(0, 8)}...) 并成功拉取最新学情数据！`
          });
        } else {
          setUrlBindingNotification({
            type: 'info',
            message: `🔗 已绑定 Gist 仓库 (${targetGistId.slice(0, 8)}...)。提示: ${pullRes.message}`
          });
        }
      } else if (gistConfig.gistId && gistConfig.autoPullOnLoad) {
        pullFromGist(gistConfig.token, gistConfig.gistId, true);
      }

      setTimeout(() => {
        isInitialMountRef.current = false;
      }, 1000);
    };

    initGistSync();
  }, []);

  useEffect(() => {
    if (isInitialMountRef.current || isPullingRef.current) return;
    if (!gistConfig.autoSync || !gistConfig.token || !gistConfig.gistId) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    setAutoSaveStatus('saving');

    autoSaveTimerRef.current = setTimeout(async () => {
      if (isPullingRef.current) return;

      const fullData = getFullDatabaseObject();

      const res = await pushDataToGistWithSmartMerge(
        gistConfig.token,
        gistConfig.gistId,
        fullData,
        gistConfig.filename || DEFAULT_GIST_FILENAME
      );

      if (res.success) {
        if (res.data && res.report) {
          setLatestMergeReport(res.report);
          if (res.report.incomingScoresCount > 0 || res.report.incomingStudentsCount > 0 || res.report.incomingClassesCount > 0) {
            applyMergedData(res.data);
            setGistLastMessage(`⚡ 自动合并成功！融合了云端协同数据（${res.report.incomingScoresCount} 条新成绩, ${res.report.incomingStudentsCount} 位新学员）`);
          }
        }
        const nowIso = new Date().toISOString();
        updateGistConfig({ lastSyncedAt: nowIso });
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      } else {
        setAutoSaveStatus('error');
        setGistLastMessage(`⚠️ 自动储存失败: ${res.message}`);
      }
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    rawClasses,
    rawStudents,
    rawScoreRecords,
    levels,
    units,
    teachers,
    weakPointCategories,
    gistConfig.autoSync,
    gistConfig.token,
    gistConfig.gistId
  ]);

  useEffect(() => {
    if (!gistConfig.gistId || !gistConfig.autoPullOnLoad) return;

    const performBackgroundSync = async () => {
      if (isPullingRef.current || autoSaveStatus === 'saving') return;
      try {
        const remoteRes = await pullDataFromGist(
          gistConfig.token,
          gistConfig.gistId,
          gistConfig.filename || DEFAULT_GIST_FILENAME
        );
        if (remoteRes.success && remoteRes.data) {
          const currentLocal = getFullDatabaseObject();
          const { merged, report } = mergeDatasets(currentLocal, remoteRes.data);
          if (report.incomingScoresCount > 0 || report.incomingStudentsCount > 0 || report.incomingClassesCount > 0) {
            applyMergedData(merged);
            setLatestMergeReport(report);
            setGistLastMessage(`🔄 云端多端协同：已自动合并来自其他老师的 ${report.incomingScoresCount} 条新成绩与 ${report.incomingStudentsCount} 位新学员`);
          }
        }
      } catch {
        // background sync silence
      }
    };

    const interval = setInterval(performBackgroundSync, 15000);

    const handleWindowActive = () => {
      if (document.visibilityState === 'visible') {
        performBackgroundSync();
      }
    };

    window.addEventListener('visibilitychange', handleWindowActive);
    window.addEventListener('focus', handleWindowActive);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleWindowActive);
      window.removeEventListener('focus', handleWindowActive);
    };
  }, [
    gistConfig.gistId,
    gistConfig.token,
    gistConfig.autoPullOnLoad,
    rawClasses,
    rawStudents,
    rawScoreRecords,
    levels,
    units,
    teachers,
    weakPointCategories
  ]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(rawClasses));
  }, [rawClasses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(rawStudents));
  }, [rawStudents]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(rawScoreRecords));
  }, [rawScoreRecords]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LEVELS, JSON.stringify(levels));
  }, [levels]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.UNITS, JSON.stringify(units));
  }, [units]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(weakPointCategories));
  }, [weakPointCategories]);

  // 1. Score Operations with updatedAt & soft-delete
  const addScoreBatch = (records: Omit<ScoreRecord, 'id' | 'recordedAt'>[]) => {
    const now = Date.now();
    const nowStr = new Date(now).toISOString().replace('T', ' ').substring(0, 19);
    const newItems: ScoreRecord[] = records.map((r, idx) => ({
      ...r,
      id: `scr_${now}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      recordedAt: nowStr,
      updatedAt: now,
      isDeleted: false,
      weakPoints: Array.isArray(r.weakPoints) ? r.weakPoints : []
    }));
    setRawScoreRecords(prev => [...newItems, ...prev]);
  };

  const addScoreBatchAndSync = async (
    records: Omit<ScoreRecord, 'id' | 'recordedAt'>[],
    options?: { syncToCloud?: boolean; teacherName?: string }
  ): Promise<ScoreBatchSyncResult> => {
    const now = Date.now();
    const nowStr = new Date(now).toISOString().replace('T', ' ').substring(0, 19);
    const operatorTeacher = options?.teacherName || gistConfig.teacherName || '任课教师';

    const newItems: ScoreRecord[] = records.map((r, idx) => ({
      ...r,
      id: `scr_${now}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      recordedAt: nowStr,
      updatedAt: now,
      isDeleted: false,
      weakPoints: Array.isArray(r.weakPoints) ? r.weakPoints : []
    }));

    // 1. Update local raw state & persistence
    const updatedRawRecords = [...newItems, ...rawScoreRecords];
    setRawScoreRecords(updatedRawRecords);
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updatedRawRecords));

    const shouldSyncCloud = options?.syncToCloud !== false;
    const isCloudReady = Boolean(gistConfig.token && gistConfig.gistId);

    const activeTotalCount = updatedRawRecords.filter(r => !r.isDeleted).length;

    if (!shouldSyncCloud || !isCloudReady) {
      const msg = !isCloudReady
        ? '✅ 已保存在当前电脑本地（未配置云端 Gist 同步）'
        : '✅ 已保存在当前电脑本地（本地模式）';

      addSyncLog({
        type: 'local_save',
        success: true,
        message: `本地录入保存了 ${newItems.length} 条成绩`,
        operatorTeacher,
        totalRecordsCount: activeTotalCount
      });

      return {
        localSavedCount: newItems.length,
        newRecords: newItems,
        cloudSynced: false,
        cloudMessage: msg,
        totalRecordsCount: activeTotalCount
      };
    }

    // 2. Perform Atomic Smart Merge & Push to GitHub Gist
    setIsSyncingGist(true);
    setGistLastMessage('正在执行云端智能合并与加密上传...');

    try {
      const fullLocalData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        classes: rawClasses,
        students: rawStudents,
        scoreRecords: updatedRawRecords,
        levels,
        units,
        teachers,
        weakPointCategories
      };

      const res = await pushDataToGistWithSmartMerge(
        gistConfig.token,
        gistConfig.gistId,
        fullLocalData,
        gistConfig.filename || DEFAULT_GIST_FILENAME
      );

      if (res.success) {
        if (res.data) {
          applyMergedData(res.data);
        }
        if (res.report) {
          setLatestMergeReport(res.report);
        }
        updateGistConfig({
          lastSyncedAt: new Date().toISOString()
        });

        const totalCount = res.report?.totalScoresCount || res.data?.scoreRecords?.filter((r: any) => !r.isDeleted).length || activeTotalCount;
        const incoming = res.report?.incomingScoresCount || 0;
        const successMsg = incoming > 0
          ? `✅ 成功归档并同步至云端！本次上传 ${newItems.length} 条，并融合了其他老师的 ${incoming} 条最新成绩`
          : `✅ 成功归档并同步至云端！本次录入 ${newItems.length} 条已保存在私有 Gist 库`;

        setGistLastMessage(successMsg);

        addSyncLog({
          type: 'save_and_push',
          success: true,
          message: `成功归档并同步 ${newItems.length} 条成绩至云端`,
          operatorTeacher,
          incomingCount: incoming,
          outgoingCount: newItems.length,
          totalRecordsCount: totalCount
        });

        showSyncNotification({
          id: `sync_entry_${Date.now()}`,
          type: 'success',
          action: 'save_and_push',
          title: '成绩已入库并同步至云端 Gist',
          message: incoming > 0
            ? `本次录入的 ${newItems.length} 条成绩已成功加密上传，并同步融合了其他老师录入的 ${incoming} 条最新成绩！`
            : `本次录入的 ${newItems.length} 条成绩已成功归档并同步保存在云端 Gist 数据库。`,
          timestamp: new Date().toLocaleTimeString('zh-CN'),
          teacherName: operatorTeacher,
          gistId: gistConfig.gistId,
          outgoingScoresCount: newItems.length,
          incomingScoresCount: incoming,
          incomingStudentsCount: res.report?.incomingStudentsCount,
          incomingClassesCount: res.report?.incomingClassesCount,
          totalScoresCount: totalCount,
          totalStudentsCount: res.report?.totalStudentsCount || students.length,
          totalClassesCount: res.report?.totalClassesCount || classes.length,
          incomingStudentNames: res.report?.incomingStudentNames,
          incomingClassNames: res.report?.incomingClassNames,
          incomingScoreSamples: res.report?.incomingScoreSamples,
          newDictionaries: res.report?.newDictionaries
        });

        return {
          localSavedCount: newItems.length,
          newRecords: newItems,
          cloudSynced: true,
          cloudMessage: successMsg,
          mergeReport: res.report,
          totalRecordsCount: totalCount
        };
      } else {
        const errMsg = `⚠️ 已保存在本地，但云端同步失败: ${res.message}`;
        setGistLastMessage(errMsg);

        addSyncLog({
          type: 'save_and_push',
          success: false,
          message: `云端同步失败: ${res.message}`,
          operatorTeacher,
          totalRecordsCount: activeTotalCount
        });

        return {
          localSavedCount: newItems.length,
          newRecords: newItems,
          cloudSynced: false,
          cloudMessage: errMsg,
          totalRecordsCount: activeTotalCount
        };
      }
    } catch (err: any) {
      const errMsg = `⚠️ 已保存在本地，云端上传异常: ${err?.message || '网络连接超时'}`;
      setGistLastMessage(errMsg);
      return {
        localSavedCount: newItems.length,
        newRecords: newItems,
        cloudSynced: false,
        cloudMessage: errMsg,
        totalRecordsCount: activeTotalCount
      };
    } finally {
      setIsSyncingGist(false);
    }
  };

  const updateScoreRecord = (id: string, updated: Partial<ScoreRecord>) => {
    const now = Date.now();
    setRawScoreRecords(prev =>
      prev.map(item => (item.id === id ? { ...item, ...updated, updatedAt: now, isDeleted: false } : item))
    );
  };

  const deleteScoreRecord = (id: string) => {
    const now = Date.now();
    setRawScoreRecords(prev =>
      prev.map(item => (item.id === id ? { ...item, isDeleted: true, updatedAt: now } : item))
    );
  };

  const deleteScoreBatch = (batchId: string) => {
    const now = Date.now();
    setRawScoreRecords(prev =>
      prev.map(item => (item.batchId === batchId ? { ...item, isDeleted: true, updatedAt: now } : item))
    );
  };

  // 2. Class Operations
  const addClass = (cls: Omit<ClassGroup, 'id'>): ClassGroup => {
    const now = Date.now();
    const levelVal = cls.currentLevel || cls.level || 'BF1';
    const newClass: ClassGroup = {
      ...cls,
      level: levelVal,
      currentLevel: levelVal,
      id: `cls_${now}_${Math.random().toString(36).substring(2, 6)}`,
      updatedAt: now,
      isDeleted: false,
    };
    setRawClasses(prev => [...prev, newClass]);
    return newClass;
  };

  const batchAddClasses = (classesList: Omit<ClassGroup, 'id'>[]): ClassGroup[] => {
    const now = Date.now();
    const created: ClassGroup[] = classesList.map((c, idx) => {
      const levelVal = c.currentLevel || c.level || 'BF1';
      return {
        ...c,
        level: levelVal,
        currentLevel: levelVal,
        id: `cls_${now}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        updatedAt: now,
        isDeleted: false,
      };
    });
    setRawClasses(prev => [...prev, ...created]);
    return created;
  };

  const updateClass = (id: string, updated: Partial<ClassGroup>, syncStudentsLevel: boolean = true) => {
    const now = Date.now();
    const effectiveLevel = updated.currentLevel || updated.level;

    setRawClasses(prev =>
      prev.map(c => {
        if (c.id === id) {
          const nextLevel = effectiveLevel || c.currentLevel || c.level || 'BF1';
          return {
            ...c,
            ...updated,
            level: nextLevel,
            currentLevel: nextLevel,
            updatedAt: now,
            isDeleted: false,
          };
        }
        return c;
      })
    );

    if (effectiveLevel && syncStudentsLevel) {
      setRawStudents(prev =>
        prev.map(s =>
          s.classId === id
            ? { ...s, currentLevel: effectiveLevel, updatedAt: now }
            : s
        )
      );
    }

    if (updated.name) {
      setRawScoreRecords(prev =>
        prev.map(r => (r.classId === id ? { ...r, className: updated.name!, updatedAt: now } : r))
      );
    }
  };

  const updateClassAndSync = async (
    id: string,
    updated: Partial<ClassGroup>,
    syncStudentsLevel: boolean = true,
    options?: { teacherName?: string }
  ): Promise<{ success: boolean; message: string; mergeReport?: MergeReport; affectedStudentCount?: number }> => {
    const now = Date.now();
    const operatorTeacher = options?.teacherName || gistConfig.teacherName || '任课教师';

    const prevClass = rawClasses.find(c => c.id === id);
    const oldLevel = prevClass?.currentLevel || prevClass?.level || 'BF1';
    const newLevel = updated.currentLevel || updated.level || oldLevel;
    const levelChanged = oldLevel.trim().toUpperCase() !== newLevel.trim().toUpperCase();
    const oldName = prevClass?.name || '未知班级';
    const newName = updated.name ? updated.name.trim() : oldName;

    const affectedStudents = rawStudents.filter(s => !s.isDeleted && s.classId === id);
    const outgoingStudentUpdates: { studentId: string; studentName: string; field: string; from?: string; to?: string; description: string }[] = [];

    if (newLevel && syncStudentsLevel) {
      affectedStudents.forEach(s => {
        const sOldLvl = s.currentLevel || oldLevel;
        if (sOldLvl.trim().toUpperCase() !== newLevel.trim().toUpperCase()) {
          outgoingStudentUpdates.push({
            studentId: s.id,
            studentName: s.name,
            field: 'currentLevel',
            from: sOldLvl,
            to: newLevel,
            description: `在读级别联动更新: ${sOldLvl} → ${newLevel}`
          });
        }
      });
    }

    const outgoingClassUpdates = [
      {
        classId: id,
        className: newName,
        field: 'level',
        from: oldLevel,
        to: newLevel,
        description: levelChanged
          ? `班级主授级别调整: ${oldLevel} → ${newLevel}`
          : `班级设置信息更新`
      }
    ];

    const nextClasses = rawClasses.map(c => {
      if (c.id === id) {
        return {
          ...c,
          ...updated,
          name: newName,
          level: newLevel,
          currentLevel: newLevel,
          updatedAt: now,
          isDeleted: false
        };
      }
      return c;
    });
    setRawClasses(nextClasses);

    let nextStudents = rawStudents;
    if (newLevel && syncStudentsLevel) {
      nextStudents = rawStudents.map(s => {
        if (s.classId === id) {
          return {
            ...s,
            currentLevel: newLevel,
            updatedAt: now
          };
        }
        return s;
      });
      setRawStudents(nextStudents);
    }

    let nextRecords = rawScoreRecords;
    if (updated.name && updated.name !== oldName) {
      nextRecords = rawScoreRecords.map(r =>
        r.classId === id ? { ...r, className: updated.name!, updatedAt: now } : r
      );
      setRawScoreRecords(nextRecords);
    }

    const isCloudReady = Boolean(gistConfig.token && gistConfig.gistId);

    if (!isCloudReady) {
      const msg = `✅ 班级【${newName}】已保存至本地${levelChanged ? `，并联动更新了该班 ${outgoingStudentUpdates.length} 位学员的在读级别` : ''}`;
      showSyncNotification({
        id: `sync_class_local_${Date.now()}`,
        type: 'info',
        action: 'save_and_push',
        title: '班级与学员级别已在本地更新',
        message: `${msg}。如需跨设备同步给其他老师，请前往【Gist云同步协作】配置 GitHub Token 与 Gist ID。`,
        timestamp: new Date().toLocaleTimeString('zh-CN'),
        teacherName: operatorTeacher,
        outgoingStudentsUpdated: outgoingStudentUpdates.length,
        outgoingClassesUpdated: 1,
        outgoingStudentUpdates,
        outgoingClassUpdates,
        totalStudentsCount: nextStudents.filter(s => !s.isDeleted).length,
        totalClassesCount: nextClasses.filter(c => !c.isDeleted).length,
        totalScoresCount: nextRecords.filter(r => !r.isDeleted).length
      });

      return {
        success: true,
        message: msg,
        affectedStudentCount: affectedStudents.length
      };
    }

    setIsSyncingGist(true);
    setGistLastMessage(`正在将班级【${newName}】${levelChanged ? `及 ${outgoingStudentUpdates.length} 位学员新级别` : ''}加密同步至云端...`);

    try {
      const fullLocalData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        classes: nextClasses,
        students: nextStudents,
        scoreRecords: nextRecords,
        levels,
        units,
        teachers,
        weakPointCategories,
      };

      const res = await pushDataToGistWithSmartMerge(
        gistConfig.token,
        gistConfig.gistId,
        fullLocalData,
        gistConfig.filename || DEFAULT_GIST_FILENAME
      );

      if (res.success) {
        if (res.data) {
          applyMergedData(res.data);
        }
        if (res.report) {
          setLatestMergeReport(res.report);
        }
        updateGistConfig({
          lastSyncedAt: new Date().toISOString()
        });

        const incomingScores = res.report?.incomingScoresCount || 0;
        const incomingStudents = res.report?.incomingStudentsCount || 0;
        const successMsg = `✅ 班级【${newName}】与学员在读级别已成功同步至云端！`;
        setGistLastMessage(successMsg);

        addSyncLog({
          type: 'save_and_push',
          success: true,
          message: `班级【${newName}】级别设为【${newLevel}】，联动更新 ${outgoingStudentUpdates.length} 位学员在读级别并同步推送到云端`,
          operatorTeacher,
          incomingCount: incomingScores,
          totalRecordsCount: res.report?.totalScoresCount || nextRecords.filter(r => !r.isDeleted).length
        });

        showSyncNotification({
          id: `sync_class_push_${Date.now()}`,
          type: 'success',
          action: 'save_and_push',
          title: levelChanged
            ? `班级主授级别已调整并同步更新 ${outgoingStudentUpdates.length} 位学员在读级别`
            : `班级设置已保存并同步至云端 Gist`,
          message: levelChanged
            ? `班级【${newName}】主授级别已设为【${newLevel}】，已批量联动更新全班 ${outgoingStudentUpdates.length} 位学员在读级别，并成功加密上传至云端 Gist！`
            : `班级【${newName}】信息已成功保存并实时同步至云端。`,
          timestamp: new Date().toLocaleTimeString('zh-CN'),
          teacherName: operatorTeacher,
          gistId: gistConfig.gistId,
          outgoingStudentsUpdated: outgoingStudentUpdates.length,
          outgoingClassesUpdated: 1,
          outgoingStudentUpdates,
          outgoingClassUpdates,
          totalStudentsCount: res.report?.totalStudentsCount || nextStudents.filter(s => !s.isDeleted).length,
          totalClassesCount: res.report?.totalClassesCount || nextClasses.filter(c => !c.isDeleted).length,
          totalScoresCount: res.report?.totalScoresCount || nextRecords.filter(r => !r.isDeleted).length,
          incomingScoresCount: incomingScores,
          incomingStudentsCount: incomingStudents,
          incomingStudentUpdates: res.report?.incomingStudentUpdates,
          incomingScoreSamples: res.report?.incomingScoreSamples,
          newDictionaries: res.report?.newDictionaries
        });

        return {
          success: true,
          message: successMsg,
          mergeReport: res.report,
          affectedStudentCount: affectedStudents.length
        };
      } else {
        const errMsg = `⚠️ 班级和学员级别已在本地保存，但云端同步失败: ${res.message}`;
        setGistLastMessage(errMsg);

        showSyncNotification({
          id: `sync_class_err_${Date.now()}`,
          type: 'error',
          action: 'save_and_push',
          title: '云端同步异常 (本地数据已保存)',
          message: `班级与学员级别已在当前电脑保存成功，但上传云端时提示: ${res.message}。请检查 GitHub Token 与网络连接后重试。`,
          timestamp: new Date().toLocaleTimeString('zh-CN'),
          teacherName: operatorTeacher,
          gistId: gistConfig.gistId,
          outgoingStudentsUpdated: outgoingStudentUpdates.length,
          outgoingClassesUpdated: 1,
          outgoingStudentUpdates,
          outgoingClassUpdates,
          totalStudentsCount: nextStudents.filter(s => !s.isDeleted).length,
          totalClassesCount: nextClasses.filter(c => !c.isDeleted).length,
          totalScoresCount: nextRecords.filter(r => !r.isDeleted).length
        });

        return {
          success: false,
          message: errMsg,
          affectedStudentCount: affectedStudents.length
        };
      }
    } catch (err: any) {
      const errMsg = `⚠️ 已保存在本地，云端上传异常: ${err?.message || '网络连接超时'}`;
      setGistLastMessage(errMsg);
      return {
        success: false,
        message: errMsg,
        affectedStudentCount: affectedStudents.length
      };
    } finally {
      setIsSyncingGist(false);
    }
  };

  const addClassAndSync = async (
    cls: Omit<ClassGroup, 'id'>,
    options?: { teacherName?: string }
  ): Promise<{ success: boolean; message: string; mergeReport?: MergeReport }> => {
    const created = addClass(cls);
    const operatorTeacher = options?.teacherName || gistConfig.teacherName || '任课教师';

    if (!gistConfig.token || !gistConfig.gistId) {
      return {
        success: true,
        message: `已创建班级【${created.name}】（本地保存）`
      };
    }

    const pushRes = await pushToGist();
    if (pushRes.success) {
      showSyncNotification({
        id: `sync_add_class_${Date.now()}`,
        type: 'success',
        action: 'save_and_push',
        title: `新班级【${created.name}】已创建并同步云端`,
        message: `班级【${created.name}】（主授级别: ${created.currentLevel || created.level}）已成功创建并同步至云端 Gist。`,
        timestamp: new Date().toLocaleTimeString('zh-CN'),
        teacherName: operatorTeacher,
        gistId: gistConfig.gistId,
        outgoingClassesCount: 1,
        outgoingClassesUpdated: 1,
        totalClassesCount: classes.length + 1,
        totalStudentsCount: students.length,
        totalScoresCount: scoreRecords.length
      });
    }

    return {
      success: pushRes.success,
      message: pushRes.message,
      mergeReport: pushRes.report
    };
  };

  const deleteClass = (id: string) => {
    const now = Date.now();
    setRawClasses(prev =>
      prev.map(c => c.id === id ? { ...c, isDeleted: true, updatedAt: now } : c)
    );
    setRawStudents(prev =>
      prev.map(s => s.classId === id ? { ...s, classId: '', updatedAt: now } : s)
    );
  };

  // 3. Student Operations
  const addStudent = (student: Omit<Student, 'id'>): Student => {
    const now = Date.now();
    const newStudent: Student = {
      ...student,
      id: `std_${now}_${Math.random().toString(36).substring(2, 6)}`,
      updatedAt: now,
      isDeleted: false,
      status: student.status || 'active'
    };
    setRawStudents(prev => [...prev, newStudent]);
    return newStudent;
  };

  const addStudentAndSync = async (
    student: Omit<Student, 'id'>,
    options?: { teacherName?: string }
  ): Promise<{ success: boolean; message: string; mergeReport?: MergeReport }> => {
    const created = addStudent(student);
    const operatorTeacher = options?.teacherName || gistConfig.teacherName || '任课教师';

    if (!gistConfig.token || !gistConfig.gistId) {
      return {
        success: true,
        message: `已添加学员【${created.name}】（本地保存）`
      };
    }

    const pushRes = await pushToGist();
    if (pushRes.success) {
      showSyncNotification({
        id: `sync_add_student_${Date.now()}`,
        type: 'success',
        action: 'save_and_push',
        title: `学员【${created.name}】已建档并同步云端`,
        message: `学员【${created.name}】（级别: ${created.currentLevel}）已成功注册入库并同步至云端 Gist。`,
        timestamp: new Date().toLocaleTimeString('zh-CN'),
        teacherName: operatorTeacher,
        gistId: gistConfig.gistId,
        outgoingStudentsCount: 1,
        totalStudentsCount: students.length + 1,
        totalClassesCount: classes.length,
        totalScoresCount: scoreRecords.length
      });
    }

    return {
      success: pushRes.success,
      message: pushRes.message,
      mergeReport: pushRes.report
    };
  };

  const updateStudent = (id: string, updated: Partial<Student>) => {
    const now = Date.now();
    setRawStudents(prev =>
      prev.map(s => (s.id === id ? { ...s, ...updated, updatedAt: now, isDeleted: false } : s))
    );
    if (updated.name) {
      setRawScoreRecords(prev =>
        prev.map(r => (r.studentId === id ? { ...r, studentName: updated.name!, updatedAt: now } : r))
      );
    }
  };

  const updateStudentAndSync = async (
    id: string,
    updated: Partial<Student>,
    options?: { teacherName?: string }
  ): Promise<{ success: boolean; message: string; mergeReport?: MergeReport }> => {
    const now = Date.now();
    const operatorTeacher = options?.teacherName || gistConfig.teacherName || '任课教师';

    const prevStudent = rawStudents.find(s => s.id === id);
    const oldLevel = prevStudent?.currentLevel || 'BF1';
    const newLevel = updated.currentLevel || oldLevel;
    const levelChanged = oldLevel.trim().toUpperCase() !== newLevel.trim().toUpperCase();
    const studentName = updated.name ? updated.name.trim() : (prevStudent?.name || '学员');

    const outgoingStudentUpdates = [
      {
        studentId: id,
        studentName,
        field: 'currentLevel',
        from: oldLevel,
        to: newLevel,
        description: levelChanged
          ? `在读级别调整: ${oldLevel} → ${newLevel}`
          : `学员档案信息更新`
      }
    ];

    const nextStudents = rawStudents.map(s =>
      s.id === id ? { ...s, ...updated, currentLevel: newLevel, updatedAt: now, isDeleted: false } : s
    );
    setRawStudents(nextStudents);

    let nextRecords = rawScoreRecords;
    if (updated.name && updated.name !== prevStudent?.name) {
      nextRecords = rawScoreRecords.map(r =>
        r.studentId === id ? { ...r, studentName: updated.name!, updatedAt: now } : r
      );
      setRawScoreRecords(nextRecords);
    }

    const isCloudReady = Boolean(gistConfig.token && gistConfig.gistId);

    if (!isCloudReady) {
      const msg = `✅ 学员【${studentName}】档案已保存至本地${levelChanged ? `（在读级别: ${oldLevel} → ${newLevel}）` : ''}`;
      showSyncNotification({
        id: `sync_student_local_${Date.now()}`,
        type: 'info',
        action: 'save_and_push',
        title: '学员档案已在本地更新',
        message: `${msg}。如需跨设备同步给其他老师，请前往【Gist云同步协作】配置 GitHub Token 与 Gist ID。`,
        timestamp: new Date().toLocaleTimeString('zh-CN'),
        teacherName: operatorTeacher,
        outgoingStudentsUpdated: 1,
        outgoingStudentUpdates,
        totalStudentsCount: nextStudents.filter(s => !s.isDeleted).length,
        totalClassesCount: classes.length,
        totalScoresCount: nextRecords.filter(r => !r.isDeleted).length
      });

      return {
        success: true,
        message: msg
      };
    }

    setIsSyncingGist(true);
    setGistLastMessage(`正在将学员【${studentName}】最新档案${levelChanged ? `（在读级别: ${newLevel}）` : ''}同步至云端...`);

    try {
      const fullLocalData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        classes: rawClasses,
        students: nextStudents,
        scoreRecords: nextRecords,
        levels,
        units,
        teachers,
        weakPointCategories,
      };

      const res = await pushDataToGistWithSmartMerge(
        gistConfig.token,
        gistConfig.gistId,
        fullLocalData,
        gistConfig.filename || DEFAULT_GIST_FILENAME
      );

      if (res.success) {
        if (res.data) {
          applyMergedData(res.data);
        }
        if (res.report) {
          setLatestMergeReport(res.report);
        }
        updateGistConfig({
          lastSyncedAt: new Date().toISOString()
        });

        const successMsg = `✅ 学员【${studentName}】档案及级别已成功同步至云端！`;
        setGistLastMessage(successMsg);

        addSyncLog({
          type: 'save_and_push',
          success: true,
          message: `学员【${studentName}】档案更新（级别: ${newLevel}）并已同步至云端`,
          operatorTeacher,
          totalRecordsCount: res.report?.totalScoresCount || nextRecords.filter(r => !r.isDeleted).length
        });

        showSyncNotification({
          id: `sync_student_push_${Date.now()}`,
          type: 'success',
          action: 'save_and_push',
          title: levelChanged
            ? `学员【${studentName}】在读级别已调整为【${newLevel}】并同步云端`
            : `学员【${studentName}】档案已保存并同步至云端`,
          message: levelChanged
            ? `学员【${studentName}】在读级别由【${oldLevel}】调整为【${newLevel}】，已成功更新并加密同步至云端 Gist！`
            : `学员【${studentName}】档案信息已成功保存并实时同步至云端。`,
          timestamp: new Date().toLocaleTimeString('zh-CN'),
          teacherName: operatorTeacher,
          gistId: gistConfig.gistId,
          outgoingStudentsUpdated: 1,
          outgoingStudentUpdates,
          totalStudentsCount: res.report?.totalStudentsCount || nextStudents.filter(s => !s.isDeleted).length,
          totalClassesCount: res.report?.totalClassesCount || classes.length,
          totalScoresCount: res.report?.totalScoresCount || nextRecords.filter(r => !r.isDeleted).length,
          incomingScoresCount: res.report?.incomingScoresCount || 0,
          incomingStudentsCount: res.report?.incomingStudentsCount || 0,
          incomingStudentUpdates: res.report?.incomingStudentUpdates,
          incomingScoreSamples: res.report?.incomingScoreSamples
        });

        return {
          success: true,
          message: successMsg,
          mergeReport: res.report
        };
      } else {
        const errMsg = `⚠️ 学员档案已在本地保存，但云端同步失败: ${res.message}`;
        setGistLastMessage(errMsg);

        showSyncNotification({
          id: `sync_student_err_${Date.now()}`,
          type: 'error',
          action: 'save_and_push',
          title: '云端同步异常 (本地数据已保存)',
          message: `学员档案已在当前电脑保存成功，但上传云端时提示: ${res.message}。请检查 GitHub Token 与网络连接后重试。`,
          timestamp: new Date().toLocaleTimeString('zh-CN'),
          teacherName: operatorTeacher,
          gistId: gistConfig.gistId,
          outgoingStudentsUpdated: 1,
          outgoingStudentUpdates,
          totalStudentsCount: nextStudents.filter(s => !s.isDeleted).length,
          totalClassesCount: classes.length,
          totalScoresCount: nextRecords.filter(r => !r.isDeleted).length
        });

        return {
          success: false,
          message: errMsg
        };
      }
    } catch (err: any) {
      const errMsg = `⚠️ 已保存在本地，云端上传异常: ${err?.message || '网络连接超时'}`;
      setGistLastMessage(errMsg);
      return {
        success: false,
        message: errMsg
      };
    } finally {
      setIsSyncingGist(false);
    }
  };

  const batchUpdateStudentsLevelAndSync = async (
    studentIds: string[],
    newLevel: string,
    options?: { teacherName?: string }
  ): Promise<{ success: boolean; message: string; mergeReport?: MergeReport }> => {
    if (!studentIds || studentIds.length === 0) {
      return { success: false, message: '请选择需要调整级别的学员' };
    }

    const now = Date.now();
    const operatorTeacher = options?.teacherName || gistConfig.teacherName || '任课教师';

    const outgoingStudentUpdates: { studentId: string; studentName: string; field: string; from?: string; to?: string; description: string }[] = [];

    const nextStudents = rawStudents.map(s => {
      if (studentIds.includes(s.id)) {
        const oldLvl = s.currentLevel || 'BF1';
        outgoingStudentUpdates.push({
          studentId: s.id,
          studentName: s.name,
          field: 'currentLevel',
          from: oldLvl,
          to: newLevel,
          description: `在读级别批量调整: ${oldLvl} → ${newLevel}`
        });
        return {
          ...s,
          currentLevel: newLevel,
          updatedAt: now,
          isDeleted: false
        };
      }
      return s;
    });

    setRawStudents(nextStudents);

    const isCloudReady = Boolean(gistConfig.token && gistConfig.gistId);

    if (!isCloudReady) {
      const msg = `✅ 已批量将 ${outgoingStudentUpdates.length} 位学员在读级别调整为【${newLevel}】（本地保存）`;
      showSyncNotification({
        id: `sync_batch_level_local_${Date.now()}`,
        type: 'info',
        action: 'save_and_push',
        title: `批量调级已在本地更新 (${outgoingStudentUpdates.length} 位学员)`,
        message: `${msg}。如需跨设备同步给其他老师，请前往【Gist云同步协作】配置 GitHub Token 与 Gist ID。`,
        timestamp: new Date().toLocaleTimeString('zh-CN'),
        teacherName: operatorTeacher,
        outgoingStudentsUpdated: outgoingStudentUpdates.length,
        outgoingStudentUpdates,
        totalStudentsCount: nextStudents.filter(s => !s.isDeleted).length,
        totalClassesCount: classes.length,
        totalScoresCount: scoreRecords.length
      });

      return {
        success: true,
        message: msg
      };
    }

    setIsSyncingGist(true);
    setGistLastMessage(`正在将 ${outgoingStudentUpdates.length} 位学员的新级别【${newLevel}】同步至云端...`);

    try {
      const fullLocalData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        classes: rawClasses,
        students: nextStudents,
        scoreRecords: rawScoreRecords,
        levels,
        units,
        teachers,
        weakPointCategories,
      };

      const res = await pushDataToGistWithSmartMerge(
        gistConfig.token,
        gistConfig.gistId,
        fullLocalData,
        gistConfig.filename || DEFAULT_GIST_FILENAME
      );

      if (res.success) {
        if (res.data) {
          applyMergedData(res.data);
        }
        if (res.report) {
          setLatestMergeReport(res.report);
        }
        updateGistConfig({
          lastSyncedAt: new Date().toISOString()
        });

        const successMsg = `✅ 已成功批量更新 ${outgoingStudentUpdates.length} 位学员在读级别为【${newLevel}】并同步至云端！`;
        setGistLastMessage(successMsg);

        addSyncLog({
          type: 'save_and_push',
          success: true,
          message: `批量将 ${outgoingStudentUpdates.length} 位学员在读级别调整为【${newLevel}】并同步云端`,
          operatorTeacher,
          totalRecordsCount: res.report?.totalScoresCount || scoreRecords.length
        });

        showSyncNotification({
          id: `sync_batch_level_push_${Date.now()}`,
          type: 'success',
          action: 'save_and_push',
          title: `已批量调整 ${outgoingStudentUpdates.length} 位学员在读级别为【${newLevel}】并同步云端`,
          message: `已批量调整 ${outgoingStudentUpdates.length} 位学员的在读级别为【${newLevel}】，并成功加密上传至云端 Gist！`,
          timestamp: new Date().toLocaleTimeString('zh-CN'),
          teacherName: operatorTeacher,
          gistId: gistConfig.gistId,
          outgoingStudentsUpdated: outgoingStudentUpdates.length,
          outgoingStudentUpdates,
          totalStudentsCount: res.report?.totalStudentsCount || nextStudents.filter(s => !s.isDeleted).length,
          totalClassesCount: res.report?.totalClassesCount || classes.length,
          totalScoresCount: res.report?.totalScoresCount || scoreRecords.length,
          incomingScoresCount: res.report?.incomingScoresCount || 0,
          incomingStudentsCount: res.report?.incomingStudentsCount || 0,
          incomingStudentUpdates: res.report?.incomingStudentUpdates,
          incomingScoreSamples: res.report?.incomingScoreSamples
        });

        return {
          success: true,
          message: successMsg,
          mergeReport: res.report
        };
      } else {
        const errMsg = `⚠️ 学员级别已在本地修改，但云端同步失败: ${res.message}`;
        setGistLastMessage(errMsg);

        showSyncNotification({
          id: `sync_batch_err_${Date.now()}`,
          type: 'error',
          action: 'save_and_push',
          title: '云端同步异常 (本地数据已保存)',
          message: `已在本地修改 ${outgoingStudentUpdates.length} 位学员在读级别，但上传云端时提示: ${res.message}。`,
          timestamp: new Date().toLocaleTimeString('zh-CN'),
          teacherName: operatorTeacher,
          gistId: gistConfig.gistId,
          outgoingStudentsUpdated: outgoingStudentUpdates.length,
          outgoingStudentUpdates,
          totalStudentsCount: nextStudents.filter(s => !s.isDeleted).length,
          totalClassesCount: classes.length,
          totalScoresCount: scoreRecords.length
        });

        return {
          success: false,
          message: errMsg
        };
      }
    } catch (err: any) {
      const errMsg = `⚠️ 已保存在本地，云端上传异常: ${err?.message || '网络连接超时'}`;
      setGistLastMessage(errMsg);
      return {
        success: false,
        message: errMsg
      };
    } finally {
      setIsSyncingGist(false);
    }
  };

  const deleteStudent = (id: string) => {
    const now = Date.now();
    setRawStudents(prev =>
      prev.map(s => s.id === id ? { ...s, isDeleted: true, updatedAt: now } : s)
    );
    setRawScoreRecords(prev =>
      prev.map(r => r.studentId === id ? { ...r, isDeleted: true, updatedAt: now } : r)
    );
  };

  const batchAddStudents = (newStudentsList: Omit<Student, 'id'>[]) => {
    const now = Date.now();
    const created: Student[] = newStudentsList.map((s, idx) => ({
      ...s,
      id: `std_${now}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      updatedAt: now,
      isDeleted: false,
      status: s.status || 'active'
    }));
    setRawStudents(prev => [...prev, ...created]);
  };

  const batchDeleteStudents = (studentIds: string[]) => {
    if (!studentIds || studentIds.length === 0) return;
    const now = Date.now();
    const idSet = new Set(studentIds);
    setRawStudents(prev =>
      prev.map(s => idSet.has(s.id) ? { ...s, isDeleted: true, updatedAt: now } : s)
    );
    setRawScoreRecords(prev =>
      prev.map(r => idSet.has(r.studentId) ? { ...r, isDeleted: true, updatedAt: now } : r)
    );
  };

  const transferStudent = (
    studentId: string,
    targetClassId: string,
    newLevel?: string,
    syncPastScores: boolean = false,
    reasonNote?: string
  ) => {
    const targetClass = rawClasses.find(c => c.id === targetClassId);
    if (!targetClass) return;

    const student = rawStudents.find(s => s.id === studentId);
    if (!student) return;

    const fromClass = rawClasses.find(c => c.id === student.classId);
    const dateStr = new Date().toISOString().split('T')[0];
    const transferLog = `[调班记录 ${dateStr}] 从「${fromClass?.name || '原班级'}」转至「${targetClass.name}」${reasonNote ? ` (${reasonNote})` : ''}`;

    const updatedNotes = student.notes
      ? `${student.notes}\n${transferLog}`
      : transferLog;

    const updatedLevel = newLevel || targetClass.level || student.currentLevel;
    const now = Date.now();

    setRawStudents(prev =>
      prev.map(s =>
        s.id === studentId
          ? {
              ...s,
              classId: targetClassId,
              currentLevel: updatedLevel,
              notes: updatedNotes,
              updatedAt: now,
              isDeleted: false
            }
          : s
      )
    );

    if (syncPastScores) {
      setRawScoreRecords(prev =>
        prev.map(r =>
          r.studentId === studentId
            ? { ...r, classId: targetClassId, className: targetClass.name, updatedAt: now }
            : r
        )
      );
    }
  };

  const batchTransferStudents = (
    studentIds: string[],
    targetClassId: string,
    newLevel?: string,
    syncPastScores: boolean = false,
    reasonNote?: string
  ) => {
    const targetClass = rawClasses.find(c => c.id === targetClassId);
    if (!targetClass || studentIds.length === 0) return;

    const dateStr = new Date().toISOString().split('T')[0];
    const now = Date.now();

    setRawStudents(prev =>
      prev.map(s => {
        if (!studentIds.includes(s.id)) return s;
        const fromClass = rawClasses.find(c => c.id === s.classId);
        const transferLog = `[调班记录 ${dateStr}] 从「${fromClass?.name || '原班级'}」转至「${targetClass.name}」${reasonNote ? ` (${reasonNote})` : ''}`;
        const updatedNotes = s.notes ? `${s.notes}\n${transferLog}` : transferLog;
        const updatedLevel = newLevel || targetClass.level || s.currentLevel;

        return {
          ...s,
          classId: targetClassId,
          currentLevel: updatedLevel,
          notes: updatedNotes,
          updatedAt: now,
          isDeleted: false
        };
      })
    );

    if (syncPastScores) {
      setRawScoreRecords(prev =>
        prev.map(r =>
          studentIds.includes(r.studentId)
            ? { ...r, classId: targetClassId, className: targetClass.name, updatedAt: now }
            : r
        )
      );
    }
  };

  const suspendStudent = (studentId: string, reason?: string, removeFromClass: boolean = true) => {
    const student = rawStudents.find(s => s.id === studentId);
    if (!student) return;

    const currentClass = rawClasses.find(c => c.id === student.classId);
    const dateStr = new Date().toISOString().split('T')[0];
    const now = Date.now();
    const reasonText = reason?.trim() || '暂缓学业';
    const suspendLog = `[停学记录 ${dateStr}] 原班级:「${currentClass?.name || '未分班'}」 原因: ${reasonText}`;
    const updatedNotes = student.notes ? `${student.notes}\n${suspendLog}` : suspendLog;

    setRawStudents(prev =>
      prev.map(s =>
        s.id === studentId
          ? {
              ...s,
              status: 'suspended',
              suspendedAt: dateStr,
              suspendReason: reasonText,
              previousClassId: s.classId || s.previousClassId,
              classId: removeFromClass ? '' : s.classId,
              notes: updatedNotes,
              updatedAt: now,
              isDeleted: false
            }
          : s
      )
    );
  };

  const restoreStudent = (studentId: string, targetClassId?: string, newLevel?: string) => {
    const student = rawStudents.find(s => s.id === studentId);
    if (!student) return;

    const destinationClassId = targetClassId || student.previousClassId || (classes[0]?.id || '');
    const targetClass = rawClasses.find(c => c.id === destinationClassId);
    const dateStr = new Date().toISOString().split('T')[0];
    const now = Date.now();
    const restoreLog = `[复学记录 ${dateStr}] 办理复学恢复就读，进入班级「${targetClass?.name || '待分班'}」`;
    const updatedNotes = student.notes ? `${student.notes}\n${restoreLog}` : restoreLog;
    const updatedLevel = newLevel || targetClass?.level || student.currentLevel;

    setRawStudents(prev =>
      prev.map(s =>
        s.id === studentId
          ? {
              ...s,
              status: 'active',
              suspendedAt: undefined,
              suspendReason: undefined,
              classId: destinationClassId,
              currentLevel: updatedLevel,
              notes: updatedNotes,
              updatedAt: now,
              isDeleted: false
            }
          : s
      )
    );
  };

  const batchSuspendStudents = (studentIds: string[], reason?: string) => {
    if (!studentIds || studentIds.length === 0) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const now = Date.now();
    const reasonText = reason?.trim() || '批量办理停学';

    setRawStudents(prev =>
      prev.map(s => {
        if (!studentIds.includes(s.id)) return s;
        const currentClass = rawClasses.find(c => c.id === s.classId);
        const suspendLog = `[停学记录 ${dateStr}] 原班级:「${currentClass?.name || '未分班'}」 原因: ${reasonText}`;
        const updatedNotes = s.notes ? `${s.notes}\n${suspendLog}` : suspendLog;
        return {
          ...s,
          status: 'suspended',
          suspendedAt: dateStr,
          suspendReason: reasonText,
          previousClassId: s.classId || s.previousClassId,
          classId: '',
          notes: updatedNotes,
          updatedAt: now,
          isDeleted: false
        };
      })
    );
  };

  const batchRestoreStudents = (studentIds: string[], targetClassId?: string) => {
    if (!studentIds || studentIds.length === 0) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const now = Date.now();

    setRawStudents(prev =>
      prev.map(s => {
        if (!studentIds.includes(s.id)) return s;
        const destinationClassId = targetClassId || s.previousClassId || (classes[0]?.id || '');
        const targetClass = rawClasses.find(c => c.id === destinationClassId);
        const restoreLog = `[复学记录 ${dateStr}] 批量办理复学恢复就读，进入班级「${targetClass?.name || '待分班'}」`;
        const updatedNotes = s.notes ? `${s.notes}\n${restoreLog}` : restoreLog;
        return {
          ...s,
          status: 'active',
          suspendedAt: undefined,
          suspendReason: undefined,
          classId: destinationClassId,
          currentLevel: targetClass?.level || s.currentLevel,
          notes: updatedNotes,
          updatedAt: now,
          isDeleted: false
        };
      })
    );
  };

  const addLevel = (level: string) => {
    const trimmed = level.trim();
    if (trimmed && !levels.includes(trimmed)) {
      setLevels(prev => [...prev, trimmed]);
    }
  };

  const deleteLevel = (level: string) => {
    setLevels(prev => prev.filter(l => l !== level));
  };

  const addUnit = (unit: string) => {
    const trimmed = unit.trim();
    if (trimmed && !units.includes(trimmed)) {
      setUnits(prev => [...prev, trimmed]);
    }
  };

  const deleteUnit = (unit: string) => {
    setUnits(prev => prev.filter(u => u !== unit));
  };

  const addTeacher = (teacher: string) => {
    const trimmed = teacher.trim();
    if (trimmed && !teachers.includes(trimmed)) {
      setTeachers(prev => [...prev, trimmed]);
    }
  };

  const deleteTeacher = (teacher: string) => {
    setTeachers(prev => prev.filter(t => t !== teacher));
  };

  const addWeakPointTag = (category: string, tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;
    setWeakPointCategories(prev => {
      const catExists = prev.some(c => c.category === category);
      if (catExists) {
        return prev.map(c =>
          c.category === category
            ? { ...c, tags: c.tags.includes(trimmedTag) ? c.tags : [...c.tags, trimmedTag] }
            : c
        );
      } else {
        return [...prev, { category, tags: [trimmedTag] }];
      }
    });
  };

  const clearStudentsAndClasses = () => {
    const now = Date.now();
    setRawClasses(prev => prev.map(c => ({ ...c, isDeleted: true, updatedAt: now })));
    setRawStudents(prev => prev.map(s => ({ ...s, isDeleted: true, updatedAt: now })));
    setRawScoreRecords(prev => prev.map(r => ({ ...r, isDeleted: true, updatedAt: now })));
  };

  const resetToDemoData = () => {
    const now = Date.now();
    setRawClasses(INITIAL_CLASSES.map(c => ({ ...normalizeClass(c), updatedAt: now, isDeleted: false })));
    setRawStudents(INITIAL_STUDENTS.map(s => ({ ...normalizeStudent(s), updatedAt: now, isDeleted: false })));
    setRawScoreRecords(INITIAL_SCORE_RECORDS.map(r => ({ ...normalizeScore(r), updatedAt: now, isDeleted: false })));
    setLevels(DEFAULT_LEVELS);
    setUnits(DEFAULT_UNITS);
    setTeachers(DEFAULT_TEACHERS);
    setWeakPointCategories(DEFAULT_WEAK_POINT_CATEGORIES);
  };

  const exportDataToJson = () => {
    const backup = getFullDatabaseObject();
    return JSON.stringify(backup, null, 2);
  };

  const importDataFromJson = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.classes) || Array.isArray(data.students) || Array.isArray(data.scoreRecords)) {
        if (Array.isArray(data.classes)) {
          const merged = mergeData(rawClasses, data.classes.map(normalizeClass));
          setRawClasses(merged);
        }
        if (Array.isArray(data.students)) {
          const merged = mergeData(rawStudents, data.students.map(normalizeStudent));
          setRawStudents(merged);
        }
        if (Array.isArray(data.scoreRecords)) {
          const merged = mergeData(rawScoreRecords, data.scoreRecords.map(normalizeScore));
          setRawScoreRecords(merged);
        }
        if (Array.isArray(data.levels)) setLevels(Array.from(new Set([...levels, ...data.levels.filter(Boolean)])));
        if (Array.isArray(data.units)) setUnits(Array.from(new Set([...units, ...data.units.filter(Boolean)])));
        if (Array.isArray(data.teachers)) setTeachers(Array.from(new Set([...teachers, ...data.teachers.filter(Boolean)])));
        if (Array.isArray(data.weakPointCategories)) setWeakPointCategories(data.weakPointCategories);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        classes,
        students,
        scoreRecords,
        levels,
        units,
        teachers,
        weakPointCategories,
        gistConfig,
        updateGistConfig,
        isSyncingGist,
        gistLastMessage,
        autoSaveStatus,
        latestMergeReport,
        syncNotification,
        showSyncNotification,
        dismissSyncNotification,
        urlBindingNotification,
        dismissUrlBindingNotification,
        syncLogs,
        addSyncLog,
        isGistConfigModalOpen,
        openGistConfigModal,
        closeGistConfigModal,
        pushToGist,
        pullFromGist,
        purePullFromGist,
        syncAndMergeGist,
        manualRefreshFromCloud,
        manualSaveAndPushToCloud,
        createAndLinkGist,
        getShareUrl,
        addScoreBatch,
        addScoreBatchAndSync,
        updateScoreRecord,
        deleteScoreRecord,
        deleteScoreBatch,
        addClass,
        addClassAndSync,
        batchAddClasses,
        updateClass,
        updateClassAndSync,
        deleteClass,
        addStudent,
        addStudentAndSync,
        updateStudent,
        updateStudentAndSync,
        batchUpdateStudentsLevelAndSync,
        deleteStudent,
        batchAddStudents,
        batchDeleteStudents,
        transferStudent,
        batchTransferStudents,
        suspendStudent,
        restoreStudent,
        batchSuspendStudents,
        batchRestoreStudents,
        addLevel,
        deleteLevel,
        addUnit,
        deleteUnit,
        addTeacher,
        deleteTeacher,
        addWeakPointTag,
        clearStudentsAndClasses,
        resetToDemoData,
        exportDataToJson,
        importDataFromJson,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
