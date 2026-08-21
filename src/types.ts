export type ExamCategory = 'institutional' | 'public_school';
export type StudentStatus = 'active' | 'suspended';

export interface Student {
  id: string;
  name: string;
  gender: 'male' | 'female';
  studentNo: string;
  phone?: string;
  contactPhone?: string;
  parentContact?: string;
  parentNote?: string;
  classId: string;
  currentLevel: string; // e.g. BF1, BF2, BF3, NM, E1, E2, E3, E4
  schoolGrade?: string; // e.g. 一上, 一下, 二上, 二下, 三上, 三下, 四上, 四下, 五上, 五下, 六上, 六下, 初一上, 初一下, 初二上, 初二下, 初三上, 初三下
  enrolledDate: string;
  notes?: string;
  status?: StudentStatus; // 'active' (在读) | 'suspended' (停学)
  suspendedAt?: string; // 停学日期 (YYYY-MM-DD)
  suspendReason?: string; // 停学原因
  previousClassId?: string; // 停学前所在班级
  updatedAt?: string;
}

export interface ClassGroup {
  id: string;
  name: string;
  level: string; // default level
  currentLevel?: string;
  academicYear?: string;
  teacherName: string;
  updatedAt?: string;
}

export interface ScoreRecord {
  id: string;
  classId: string;
  className: string;
  studentId: string;
  studentName: string;
  teacherName: string;
  examCategory?: ExamCategory | string; // 'institutional' = 机构测试, 'public_school' = 公校考试
  level: string; // For institutional: BF1, BF2, E1, etc. For public_school: 一上, 二上, 三上, 四上, 五上, 六上, 初一上, etc.
  schoolGrade?: string; // Explicit public school grade
  unit: string;  // U1, U2, U3, U4, Midterm, Final, 期中考试, 期末考试, etc.
  examTitle: string;
  examDate: string;
  maxScore: number;
  score: number | null; // number if attended and scored, null if absent / leave / not scored
  attendance: 'present' | 'absent' | 'leave';
  weakPoints: string[]; // 失分点/薄弱项标签
  mistakeDetails?: string; // 详细失分说明
  teacherRemark?: string;  // 教师评语与指导建议
  recordedAt: string;
  updatedAt?: string;
  batchId?: string;
}

export interface WeakPointTagCategory {
  category: string;
  tags: string[];
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  type: 'push' | 'pull' | 'save_and_push' | 'local_save';
  success: boolean;
  message: string;
  operatorTeacher?: string;
  incomingCount?: number;
  outgoingCount?: number;
  totalRecordsCount?: number;
}

export type ActiveTab = 'entry' | 'query' | 'rankings' | 'analytics' | 'management';

export interface DeletedEntities {
  classes: Record<string, number>; // classId -> timestamp deleted (epoch ms)
  students: Record<string, number>; // studentId -> timestamp deleted (epoch ms)
  scoreRecords: Record<string, number>; // scoreId -> timestamp deleted (epoch ms)
  levels?: Record<string, number>;
  units?: Record<string, number>;
  teachers?: Record<string, number>;
}

export interface ScoreSampleItem {
  studentName: string;
  className: string;
  unit: string;
  examTitle: string;
  score: number | null;
  level?: string;
  examDate?: string;
}

export interface StudentUpdateDetail {
  studentId: string;
  studentName: string;
  field: string;
  from?: string;
  to?: string;
  description: string;
}

export interface ClassUpdateDetail {
  classId: string;
  className: string;
  field: string;
  from?: string;
  to?: string;
  description: string;
}

export interface ScoreUpdateDetail {
  scoreId: string;
  studentName: string;
  className: string;
  unit: string;
  description: string;
}

export interface SyncNotificationData {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  action: 'pull' | 'push' | 'save_and_push' | 'link' | 'auto_sync';
  title: string;
  message: string;
  timestamp: string;
  teacherName?: string;
  gistId?: string;
  isInitialLoad?: boolean;
  incomingScoresCount?: number;
  outgoingScoresCount?: number;
  incomingScoresUpdated?: number;
  outgoingScoresUpdated?: number;
  incomingStudentsCount?: number;
  outgoingStudentsCount?: number;
  incomingStudentsUpdated?: number;
  outgoingStudentsUpdated?: number;
  incomingClassesCount?: number;
  outgoingClassesCount?: number;
  incomingClassesUpdated?: number;
  outgoingClassesUpdated?: number;
  totalScoresCount?: number;
  totalStudentsCount?: number;
  totalClassesCount?: number;
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
  incomingScoreSamples?: ScoreSampleItem[];
  newDictionaries?: {
    levels?: string[];
    units?: string[];
    teachers?: string[];
  };
}
