import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Student, ClassGroup, ScoreRecord, WeakPointTagCategory, SyncLogEntry, DeletedEntities, SyncNotificationData } from '../types';
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
  batchAddClasses: (classesList: Omit<ClassGroup, 'id'>[]) => ClassGroup[];
  updateClass: (id: string, cls: Partial<ClassGroup>, syncStudentsLevel?: boolean) => void;
  deleteClass: (id: string) => void;

  // Student Operations
  addStudent: (student: Omit<Student, 'id'>) => Student;
  updateStudent: (id: string, student: Partial<Student>) => void;
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
  DELETED_ENTITIES: 'training_scores_deleted_entities_v2',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [deletedEntities, setDeletedEntities] = useState<DeletedEntities>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DELETED_ENTITIES);
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && typeof parsed === 'object') {
        return {
          classes: parsed.classes || {},
          students: parsed.students || {},
          scoreRecords: parsed.scoreRecords || {},
          levels: parsed.levels || {},
          units: parsed.units || {},
          teachers: parsed.teachers || {},
        };
      }
      return { classes: {}, students: {}, scoreRecords: {}, levels: {}, units: {}, teachers: {} };
    } catch {
      return { classes: {}, students: {}, scoreRecords: {}, levels: {}, units: {}, teachers: {} };
    }
  });

  const [classes, setClasses] = useState<ClassGroup[]>(() => {
    try {
      const savedTomb = localStorage.getItem(STORAGE_KEYS.DELETED_ENTITIES);
      const parsedTomb = savedTomb ? JSON.parse(savedTomb) : null;
      const delClasses = parsedTomb?.classes || {};

      const saved = localStorage.getItem(STORAGE_KEYS.CLASSES);
      const parsed = saved ? JSON.parse(saved) : null;
      const list: ClassGroup[] = Array.isArray(parsed) ? parsed : INITIAL_CLASSES;
      return list.filter((c: ClassGroup) => {
        const delTime = delClasses[c.id] || (c.name ? delClasses[c.name] : undefined);
        if (!delTime) return true;
        const cTime = c.updatedAt ? new Date(c.updatedAt).getTime() : 0;
        return cTime > delTime;
      });
    } catch {
      return INITIAL_CLASSES;
    }
  });

  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const savedTomb = localStorage.getItem(STORAGE_KEYS.DELETED_ENTITIES);
      const parsedTomb = savedTomb ? JSON.parse(savedTomb) : null;
      const delStudents = parsedTomb?.students || {};

      const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      const parsed = saved ? JSON.parse(saved) : null;
      const list: Student[] = Array.isArray(parsed) ? parsed : INITIAL_STUDENTS;
      return list.filter((s: Student) => {
        const delTime = delStudents[s.id];
        if (!delTime) return true;
        const sTime = s.updatedAt ? new Date(s.updatedAt).getTime() : 0;
        return sTime > delTime;
      });
    } catch {
      return INITIAL_STUDENTS;
    }
  });

  const [scoreRecords, setScoreRecords] = useState<ScoreRecord[]>(() => {
    try {
      const savedTomb = localStorage.getItem(STORAGE_KEYS.DELETED_ENTITIES);
      const parsedTomb = savedTomb ? JSON.parse(savedTomb) : null;
      const delScores = parsedTomb?.scoreRecords || {};

      const saved = localStorage.getItem(STORAGE_KEYS.RECORDS);
      const parsed = saved ? JSON.parse(saved) : null;
      const list: ScoreRecord[] = Array.isArray(parsed) ? parsed : INITIAL_SCORE_RECORDS;
      return list
        .filter((r: ScoreRecord) => {
          const delTime = delScores[r.id];
          if (!delTime) return true;
          const rTime = Math.max(
            r.updatedAt ? new Date(r.updatedAt).getTime() : 0,
            r.recordedAt ? new Date(r.recordedAt).getTime() : 0
          );
          return rTime > delTime;
        })
        .map((r: any) => ({
          ...r,
          weakPoints: Array.isArray(r.weakPoints) ? r.weakPoints : []
        }));
    } catch {
      return INITIAL_SCORE_RECORDS;
    }
  });

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
      classes,
      students,
      scoreRecords,
      levels,
      units,
      teachers,
      weakPointCategories,
      deletedEntities,
    };
  };

  const applyMergedData = (data: any) => {
    if (!data) return;
    let activeDel: DeletedEntities = deletedEntities;
    if (data.deletedEntities) {
      activeDel = {
        classes: { ...(deletedEntities.classes || {}), ...(data.deletedEntities.classes || {}) },
        students: { ...(deletedEntities.students || {}), ...(data.deletedEntities.students || {}) },
        scoreRecords: { ...(deletedEntities.scoreRecords || {}), ...(data.deletedEntities.scoreRecords || {}) },
        levels: { ...(deletedEntities.levels || {}), ...(data.deletedEntities.levels || {}) },
        units: { ...(deletedEntities.units || {}), ...(data.deletedEntities.units || {}) },
        teachers: { ...(deletedEntities.teachers || {}), ...(data.deletedEntities.teachers || {}) },
      };
      setDeletedEntities(activeDel);
    }

    if (Array.isArray(data.classes)) {
      const filtered = data.classes.filter((c: ClassGroup) => {
        const delTime = activeDel.classes[c.id] || (c.name ? activeDel.classes[c.name] : undefined);
        if (!delTime) return true;
        const cTime = c.updatedAt ? new Date(c.updatedAt).getTime() : 0;
        return cTime > delTime;
      });
      setClasses(filtered);
    }
    if (Array.isArray(data.students)) {
      const filtered = data.students.filter((s: Student) => {
        const delTime = activeDel.students[s.id];
        if (!delTime) return true;
        const sTime = s.updatedAt ? new Date(s.updatedAt).getTime() : 0;
        return sTime > delTime;
      });
      setStudents(filtered);
    }
    if (Array.isArray(data.scoreRecords)) {
      const filtered = data.scoreRecords
        .filter((r: ScoreRecord) => {
          const delTime = activeDel.scoreRecords[r.id];
          if (!delTime) return true;
          const rTime = Math.max(
            r.updatedAt ? new Date(r.updatedAt).getTime() : 0,
            r.recordedAt ? new Date(r.recordedAt).getTime() : 0
          );
          return rTime > delTime;
        })
        .map((r: any) => ({
          ...r,
          weakPoints: Array.isArray(r.weakPoints) ? r.weakPoints : []
        }));
      setScoreRecords(filtered);
    }
    if (Array.isArray(data.levels)) {
      const delMap = activeDel.levels || {};
      setLevels(data.levels.filter((l: string) => !delMap[l]));
    }
    if (Array.isArray(data.units)) {
      const delMap = activeDel.units || {};
      setUnits(data.units.filter((u: string) => !delMap[u]));
    }
    if (Array.isArray(data.teachers)) {
      const delMap = activeDel.teachers || {};
      setTeachers(data.teachers.filter((t: string) => !delMap[t]));
    }
    if (Array.isArray(data.weakPointCategories)) setWeakPointCategories(data.weakPointCategories);
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
          totalRecordsCount: res.data?.scoreRecords?.length || scoreRecords.length
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
          totalScoresCount: res.report?.totalScoresCount || res.data?.scoreRecords?.length || scoreRecords.length,
          totalStudentsCount: res.report?.totalStudentsCount || res.data?.students?.length || students.length,
          totalClassesCount: res.report?.totalClassesCount || res.data?.classes?.length || classes.length,
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
            totalRecordsCount: merged.scoreRecords?.length || scoreRecords.length
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
              : `本地学情数据与云端 Gist 完全一致（全校共 ${merged.students?.length || 0} 位学员，${merged.scoreRecords?.length || 0} 条有效测评记录），无新增变动。`,
            timestamp: new Date().toLocaleTimeString('zh-CN'),
            teacherName: gistConfig.teacherName,
            gistId: gistIdToUse,
            incomingScoresCount: report.incomingScoresCount,
            incomingStudentsCount: report.incomingStudentsCount,
            incomingClassesCount: report.incomingClassesCount,
            totalScoresCount: report.totalScoresCount || merged.scoreRecords?.length,
            totalStudentsCount: report.totalStudentsCount || merged.students?.length,
            totalClassesCount: report.totalClassesCount || merged.classes?.length,
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
            gistId: gistIdToUse
          });
        }
      }
      return res;
    } finally {
      if (!silent) setIsSyncingGist(false);
      setTimeout(() => {
        isPullingRef.current = false;
      }, 800);
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

      const fullData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        classes,
        students,
        scoreRecords,
        levels,
        units,
        teachers,
        weakPointCategories,
        deletedEntities,
      };

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
    classes,
    students,
    scoreRecords,
    levels,
    units,
    teachers,
    weakPointCategories,
    deletedEntities,
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
    classes,
    students,
    scoreRecords,
    levels,
    units,
    teachers,
    weakPointCategories,
    deletedEntities
  ]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(scoreRecords));
  }, [scoreRecords]);

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DELETED_ENTITIES, JSON.stringify(deletedEntities));
  }, [deletedEntities]);

  const addScoreBatch = (records: Omit<ScoreRecord, 'id' | 'recordedAt'>[]) => {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const nowIso = new Date().toISOString();
    const newItems: ScoreRecord[] = records.map((r, idx) => ({
      ...r,
      id: `scr_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      recordedAt: nowStr,
      updatedAt: nowIso
    }));
    setScoreRecords(prev => [...newItems, ...prev]);
  };

  const addScoreBatchAndSync = async (
    records: Omit<ScoreRecord, 'id' | 'recordedAt'>[],
    options?: { syncToCloud?: boolean; teacherName?: string }
  ): Promise<ScoreBatchSyncResult> => {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const nowIso = new Date().toISOString();
    const operatorTeacher = options?.teacherName || gistConfig.teacherName || '任课教师';

    const newItems: ScoreRecord[] = records.map((r, idx) => ({
      ...r,
      id: `scr_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      recordedAt: nowStr,
      updatedAt: nowIso
    }));

    // 1. Immediately update local state & persistence
    const updatedRecords = [...newItems, ...scoreRecords];
    setScoreRecords(updatedRecords);
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updatedRecords));

    const shouldSyncCloud = options?.syncToCloud !== false;
    const isCloudReady = Boolean(gistConfig.token && gistConfig.gistId);

    if (!shouldSyncCloud || !isCloudReady) {
      const msg = !isCloudReady
        ? '✅ 已保存在当前电脑本地（未配置云端 Gist 同步）'
        : '✅ 已保存在当前电脑本地（本地模式）';

      addSyncLog({
        type: 'local_save',
        success: true,
        message: `本地录入保存了 ${newItems.length} 条成绩`,
        operatorTeacher,
        totalRecordsCount: updatedRecords.length
      });

      return {
        localSavedCount: newItems.length,
        newRecords: newItems,
        cloudSynced: false,
        cloudMessage: msg,
        totalRecordsCount: updatedRecords.length
      };
    }

    // 2. Perform Atomic Smart Merge & Push to GitHub Gist
    setIsSyncingGist(true);
    setGistLastMessage('正在执行云端智能合并与加密上传...');

    try {
      const fullLocalData = {
        version: '2.0',
        exportedAt: nowIso,
        classes,
        students,
        scoreRecords: updatedRecords,
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
          lastSyncedAt: nowIso
        });

        const totalCount = res.data?.scoreRecords?.length || updatedRecords.length;
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
          totalStudentsCount: res.data?.students?.length || students.length,
          totalClassesCount: res.data?.classes?.length || classes.length,
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
          totalRecordsCount: updatedRecords.length
        });

        return {
          localSavedCount: newItems.length,
          newRecords: newItems,
          cloudSynced: false,
          cloudMessage: errMsg,
          totalRecordsCount: updatedRecords.length
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
        totalRecordsCount: updatedRecords.length
      };
    } finally {
      setIsSyncingGist(false);
    }
  };

  const updateScoreRecord = (id: string, updated: Partial<ScoreRecord>) => {
    const nowIso = new Date().toISOString();
    setScoreRecords(prev =>
      prev.map(item => (item.id === id ? { ...item, ...updated, updatedAt: nowIso } : item))
    );
  };

  const deleteScoreRecord = (id: string) => {
    const now = Date.now();
    setDeletedEntities(prev => ({
      ...prev,
      scoreRecords: { ...(prev.scoreRecords || {}), [id]: now }
    }));
    setScoreRecords(prev => prev.filter(item => item.id !== id));
  };

  const deleteScoreBatch = (batchId: string) => {
    const now = Date.now();
    const recordsToDelete = scoreRecords.filter(item => item.batchId === batchId);
    setDeletedEntities(prev => {
      const nextScoresDel = { ...(prev.scoreRecords || {}) };
      recordsToDelete.forEach(r => { nextScoresDel[r.id] = now; });
      return {
        ...prev,
        scoreRecords: nextScoresDel,
      };
    });
    setScoreRecords(prev => prev.filter(item => item.batchId !== batchId));
  };

  const addClass = (cls: Omit<ClassGroup, 'id'>): ClassGroup => {
    const nowIso = new Date().toISOString();
    const levelVal = cls.currentLevel || cls.level || 'BF1';
    const newClass: ClassGroup = {
      ...cls,
      level: levelVal,
      currentLevel: levelVal,
      id: `cls_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      updatedAt: nowIso,
    };
    setClasses(prev => [...prev, newClass]);
    return newClass;
  };

  const batchAddClasses = (classesList: Omit<ClassGroup, 'id'>[]): ClassGroup[] => {
    const nowIso = new Date().toISOString();
    const created: ClassGroup[] = classesList.map((c, idx) => {
      const levelVal = c.currentLevel || c.level || 'BF1';
      return {
        ...c,
        level: levelVal,
        currentLevel: levelVal,
        id: `cls_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        updatedAt: nowIso,
      };
    });
    setClasses(prev => [...prev, ...created]);
    return created;
  };

  const updateClass = (id: string, updated: Partial<ClassGroup>, syncStudentsLevel: boolean = true) => {
    const nowIso = new Date().toISOString();
    const effectiveLevel = updated.currentLevel || updated.level;

    setClasses(prev =>
      prev.map(c => {
        if (c.id === id) {
          const nextLevel = effectiveLevel || c.currentLevel || c.level || 'BF1';
          return {
            ...c,
            ...updated,
            level: nextLevel,
            currentLevel: nextLevel,
            updatedAt: nowIso,
          };
        }
        return c;
      })
    );

    // Synchronize currentLevel to all students enrolled in this class
    if (effectiveLevel && syncStudentsLevel) {
      setStudents(prev =>
        prev.map(s =>
          s.classId === id
            ? { ...s, currentLevel: effectiveLevel, updatedAt: nowIso }
            : s
        )
      );
    }

    if (updated.name) {
      setScoreRecords(prev =>
        prev.map(r => (r.classId === id ? { ...r, className: updated.name!, updatedAt: nowIso } : r))
      );
    }
  };

  const deleteClass = (id: string) => {
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const targetClass = classes.find(c => c.id === id);

    setDeletedEntities(prev => ({
      ...prev,
      classes: {
        ...(prev.classes || {}),
        [id]: now,
        ...(targetClass?.name ? { [targetClass.name]: now } : {})
      }
    }));

    setClasses(prev => prev.filter(c => c.id !== id));
    // Clear classId for students that were in this deleted class so they safely become unassigned
    setStudents(prev =>
      prev.map(s =>
        s.classId === id
          ? { ...s, classId: '', updatedAt: nowIso }
          : s
      )
    );
  };

  const addStudent = (student: Omit<Student, 'id'>): Student => {
    const nowIso = new Date().toISOString();
    const newStudent: Student = {
      ...student,
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      updatedAt: nowIso,
    };
    setStudents(prev => [...prev, newStudent]);
    return newStudent;
  };

  const updateStudent = (id: string, updated: Partial<Student>) => {
    const nowIso = new Date().toISOString();
    setStudents(prev =>
      prev.map(s => (s.id === id ? { ...s, ...updated, updatedAt: nowIso } : s))
    );
    if (updated.name) {
      setScoreRecords(prev =>
        prev.map(r => (r.studentId === id ? { ...r, studentName: updated.name!, updatedAt: nowIso } : r))
      );
    }
  };

  const deleteStudent = (id: string) => {
    const now = Date.now();
    setDeletedEntities(prev => ({
      ...prev,
      students: { ...(prev.students || {}), [id]: now }
    }));
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  const batchAddStudents = (newStudentsList: Omit<Student, 'id'>[]) => {
    const nowIso = new Date().toISOString();
    const created: Student[] = newStudentsList.map((s, idx) => ({
      ...s,
      id: `std_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      updatedAt: nowIso,
    }));
    setStudents(prev => [...prev, ...created]);
  };

  const batchDeleteStudents = (studentIds: string[]) => {
    if (!studentIds || studentIds.length === 0) return;
    const now = Date.now();
    setDeletedEntities(prev => {
      const nextStudentsDel = { ...(prev.students || {}) };
      studentIds.forEach(sid => { nextStudentsDel[sid] = now; });
      return {
        ...prev,
        students: nextStudentsDel,
      };
    });
    setStudents(prev => prev.filter(s => !studentIds.includes(s.id)));
  };

  const transferStudent = (
    studentId: string,
    targetClassId: string,
    newLevel?: string,
    syncPastScores: boolean = false,
    reasonNote?: string
  ) => {
    const targetClass = classes.find(c => c.id === targetClassId);
    if (!targetClass) return;

    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const fromClass = classes.find(c => c.id === student.classId);
    const dateStr = new Date().toISOString().split('T')[0];
    const transferLog = `[调班记录 ${dateStr}] 从「${fromClass?.name || '原班级'}」转至「${targetClass.name}」${reasonNote ? ` (${reasonNote})` : ''}`;

    const updatedNotes = student.notes
      ? `${student.notes}\n${transferLog}`
      : transferLog;

    const updatedLevel = newLevel || targetClass.level || student.currentLevel;
    const nowIso = new Date().toISOString();

    setStudents(prev =>
      prev.map(s =>
        s.id === studentId
          ? {
              ...s,
              classId: targetClassId,
              currentLevel: updatedLevel,
              notes: updatedNotes,
              updatedAt: nowIso,
            }
          : s
      )
    );

    if (syncPastScores) {
      setScoreRecords(prev =>
        prev.map(r =>
          r.studentId === studentId
            ? { ...r, classId: targetClassId, className: targetClass.name, updatedAt: nowIso }
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
    const targetClass = classes.find(c => c.id === targetClassId);
    if (!targetClass || studentIds.length === 0) return;

    const dateStr = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    setStudents(prev =>
      prev.map(s => {
        if (!studentIds.includes(s.id)) return s;
        const fromClass = classes.find(c => c.id === s.classId);
        const transferLog = `[调班记录 ${dateStr}] 从「${fromClass?.name || '原班级'}」转至「${targetClass.name}」${reasonNote ? ` (${reasonNote})` : ''}`;
        const updatedNotes = s.notes ? `${s.notes}\n${transferLog}` : transferLog;
        const updatedLevel = newLevel || targetClass.level || s.currentLevel;

        return {
          ...s,
          classId: targetClassId,
          currentLevel: updatedLevel,
          notes: updatedNotes,
          updatedAt: nowIso,
        };
      })
    );

    if (syncPastScores) {
      setScoreRecords(prev =>
        prev.map(r =>
          studentIds.includes(r.studentId)
            ? { ...r, classId: targetClassId, className: targetClass.name, updatedAt: nowIso }
            : r
        )
      );
    }
  };

  const suspendStudent = (studentId: string, reason?: string, removeFromClass: boolean = true) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const currentClass = classes.find(c => c.id === student.classId);
    const dateStr = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();
    const reasonText = reason?.trim() || '暂缓学业';
    const suspendLog = `[停学记录 ${dateStr}] 原班级:「${currentClass?.name || '未分班'}」 原因: ${reasonText}`;
    const updatedNotes = student.notes ? `${student.notes}\n${suspendLog}` : suspendLog;

    setStudents(prev =>
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
              updatedAt: nowIso,
            }
          : s
      )
    );
  };

  const restoreStudent = (studentId: string, targetClassId?: string, newLevel?: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const destinationClassId = targetClassId || student.previousClassId || (classes[0]?.id || '');
    const targetClass = classes.find(c => c.id === destinationClassId);
    const dateStr = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();
    const restoreLog = `[复学记录 ${dateStr}] 办理复学恢复就读，进入班级「${targetClass?.name || '待分班'}」`;
    const updatedNotes = student.notes ? `${student.notes}\n${restoreLog}` : restoreLog;
    const updatedLevel = newLevel || targetClass?.level || student.currentLevel;

    setStudents(prev =>
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
              updatedAt: nowIso,
            }
          : s
      )
    );
  };

  const batchSuspendStudents = (studentIds: string[], reason?: string) => {
    if (!studentIds || studentIds.length === 0) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();
    const reasonText = reason?.trim() || '批量办理停学';

    setStudents(prev =>
      prev.map(s => {
        if (!studentIds.includes(s.id)) return s;
        const currentClass = classes.find(c => c.id === s.classId);
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
          updatedAt: nowIso,
        };
      })
    );
  };

  const batchRestoreStudents = (studentIds: string[], targetClassId?: string) => {
    if (!studentIds || studentIds.length === 0) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    setStudents(prev =>
      prev.map(s => {
        if (!studentIds.includes(s.id)) return s;
        const destinationClassId = targetClassId || s.previousClassId || (classes[0]?.id || '');
        const targetClass = classes.find(c => c.id === destinationClassId);
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
          updatedAt: nowIso,
        };
      })
    );
  };

  const addLevel = (level: string) => {
    const trimmed = level.trim();
    if (trimmed && !levels.includes(trimmed)) {
      setDeletedEntities(prev => {
        const nextLevels = { ...(prev.levels || {}) };
        delete nextLevels[trimmed];
        return { ...prev, levels: nextLevels };
      });
      setLevels(prev => [...prev, trimmed]);
    }
  };

  const deleteLevel = (level: string) => {
    const now = Date.now();
    setDeletedEntities(prev => ({
      ...prev,
      levels: { ...(prev.levels || {}), [level]: now }
    }));
    setLevels(prev => prev.filter(l => l !== level));
  };

  const addUnit = (unit: string) => {
    const trimmed = unit.trim();
    if (trimmed && !units.includes(trimmed)) {
      setDeletedEntities(prev => {
        const nextUnits = { ...(prev.units || {}) };
        delete nextUnits[trimmed];
        return { ...prev, units: nextUnits };
      });
      setUnits(prev => [...prev, trimmed]);
    }
  };

  const deleteUnit = (unit: string) => {
    const now = Date.now();
    setDeletedEntities(prev => ({
      ...prev,
      units: { ...(prev.units || {}), [unit]: now }
    }));
    setUnits(prev => prev.filter(u => u !== unit));
  };

  const addTeacher = (teacher: string) => {
    const trimmed = teacher.trim();
    if (trimmed && !teachers.includes(trimmed)) {
      setDeletedEntities(prev => {
        const nextTeachers = { ...(prev.teachers || {}) };
        delete nextTeachers[trimmed];
        return { ...prev, teachers: nextTeachers };
      });
      setTeachers(prev => [...prev, trimmed]);
    }
  };

  const deleteTeacher = (teacher: string) => {
    const now = Date.now();
    setDeletedEntities(prev => ({
      ...prev,
      teachers: { ...(prev.teachers || {}), [teacher]: now }
    }));
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
    setDeletedEntities(prev => {
      const classesDel = { ...(prev.classes || {}) };
      const studentsDel = { ...(prev.students || {}) };
      const scoresDel = { ...(prev.scoreRecords || {}) };
      classes.forEach(c => {
        classesDel[c.id] = now;
        if (c.name) classesDel[c.name] = now;
      });
      students.forEach(s => {
        studentsDel[s.id] = now;
      });
      scoreRecords.forEach(r => {
        scoresDel[r.id] = now;
      });
      return {
        ...prev,
        classes: classesDel,
        students: studentsDel,
        scoreRecords: scoresDel,
      };
    });
    setClasses([]);
    setStudents([]);
    setScoreRecords([]);
  };

  const resetToDemoData = () => {
    setDeletedEntities({ classes: {}, students: {}, scoreRecords: {}, levels: {}, units: {}, teachers: {} });
    setClasses(INITIAL_CLASSES);
    setStudents(INITIAL_STUDENTS);
    setScoreRecords(INITIAL_SCORE_RECORDS);
    setLevels(DEFAULT_LEVELS);
    setUnits(DEFAULT_UNITS);
    setTeachers(DEFAULT_TEACHERS);
    setWeakPointCategories(DEFAULT_WEAK_POINT_CATEGORIES);
  };

  const exportDataToJson = () => {
    const backup = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      classes,
      students,
      scoreRecords,
      levels,
      units,
      teachers,
      weakPointCategories,
      deletedEntities,
    };
    return JSON.stringify(backup, null, 2);
  };

  const importDataFromJson = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.classes) && Array.isArray(data.students) && Array.isArray(data.scoreRecords)) {
        if (data.deletedEntities && typeof data.deletedEntities === 'object') {
          setDeletedEntities(data.deletedEntities);
        } else {
          setDeletedEntities({ classes: {}, students: {}, scoreRecords: {}, levels: {}, units: {}, teachers: {} });
        }
        setClasses(data.classes);
        setStudents(data.students);
        setScoreRecords(
          data.scoreRecords.map((r: any) => ({
            ...r,
            weakPoints: Array.isArray(r.weakPoints) ? r.weakPoints : []
          }))
        );
        if (Array.isArray(data.levels)) setLevels(data.levels);
        if (Array.isArray(data.units)) setUnits(data.units);
        if (Array.isArray(data.teachers)) setTeachers(data.teachers);
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
        batchAddClasses,
        updateClass,
        deleteClass,
        addStudent,
        updateStudent,
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
