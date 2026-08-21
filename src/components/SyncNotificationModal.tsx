import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Cloud,
  CloudUpload,
  CloudDownload,
  X,
  Users,
  School,
  FileSpreadsheet,
  Calendar,
  Sparkles,
  ArrowRight,
  BookOpen,
  UserCheck
} from 'lucide-react';
import { SyncNotificationData } from '../types';

interface SyncNotificationModalProps {
  notification: SyncNotificationData | null;
  onClose: () => void;
  onNavigateToRecords?: () => void;
  onNavigateToStudents?: () => void;
}

export const SyncNotificationModal: React.FC<SyncNotificationModalProps> = ({
  notification,
  onClose,
  onNavigateToRecords,
  onNavigateToStudents
}) => {
  if (!notification) return null;

  const isSuccess = notification.type === 'success';
  const isInfo = notification.type === 'info';
  const isError = notification.type === 'error';

  const hasScoreChanges = (notification.incomingScoresCount && notification.incomingScoresCount > 0) ||
    (notification.outgoingScoresCount && notification.outgoingScoresCount > 0);
  const hasStudentChanges = notification.incomingStudentsCount && notification.incomingStudentsCount > 0;
  const hasClassChanges = notification.incomingClassesCount && notification.incomingClassesCount > 0;

  const getActionIcon = () => {
    if (isError) return <AlertCircle className="w-6 h-6 text-red-500" />;
    if (notification.action === 'push') return <CloudUpload className="w-6 h-6 text-blue-500" />;
    if (notification.action === 'pull') return <CloudDownload className="w-6 h-6 text-emerald-500" />;
    return <Sparkles className="w-6 h-6 text-indigo-500" />;
  };

  const getHeaderBadge = () => {
    if (isError) {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">同步异常</span>;
    }
    if (notification.action === 'push') {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">云端推送 · 备份</span>;
    }
    if (notification.action === 'pull') {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">云端拉取 · 融合</span>;
    }
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">录入入库 · 双向同步</span>;
  };

  return (
    <div
      id="sync-notification-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        id="sync-notification-dialog"
        className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all duration-200 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Highlight Bar */}
        <div
          className={`h-1.5 w-full ${
            isError
              ? 'bg-red-500'
              : notification.action === 'push'
              ? 'bg-blue-500'
              : notification.action === 'pull'
              ? 'bg-emerald-500'
              : 'bg-indigo-500'
          }`}
        />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
          <div className="flex items-start gap-3.5">
            <div className={`p-2.5 rounded-xl flex-shrink-0 ${
              isError
                ? 'bg-red-50 ring-1 ring-red-200'
                : notification.action === 'push'
                ? 'bg-blue-50 ring-1 ring-blue-200'
                : notification.action === 'pull'
                ? 'bg-emerald-50 ring-1 ring-emerald-200'
                : 'bg-indigo-50 ring-1 ring-indigo-200'
            }`}>
              {getActionIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {getHeaderBadge()}
                {notification.timestamp && (
                  <span className="text-xs text-slate-400 font-mono">
                    {notification.timestamp}
                  </span>
                )}
                {notification.teacherName && (
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    操作老师: {notification.teacherName}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-900 leading-snug">
                {notification.title}
              </h3>
            </div>
          </div>

          <button
            id="close-sync-notification-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="关闭通知"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="px-6 py-5 overflow-y-auto space-y-5 flex-1">
          {/* Main Description */}
          <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            {notification.message}
          </div>

          {/* Sync Stats Cards */}
          {(hasScoreChanges || hasStudentChanges || hasClassChanges || (notification.totalScoresCount !== undefined)) && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5" />
                本次同步数据统计概要
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {notification.incomingScoresCount !== undefined && (
                  <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 text-center">
                    <div className="text-xs text-emerald-700 font-medium">新拉取成绩</div>
                    <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
                      +{notification.incomingScoresCount}
                    </div>
                  </div>
                )}

                {notification.outgoingScoresCount !== undefined && (
                  <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-center">
                    <div className="text-xs text-blue-700 font-medium">本地上传成绩</div>
                    <div className="text-xl font-extrabold text-blue-700 mt-0.5">
                      +{notification.outgoingScoresCount}
                    </div>
                  </div>
                )}

                {notification.incomingStudentsCount !== undefined && (
                  <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-3 text-center">
                    <div className="text-xs text-purple-700 font-medium">新增学员</div>
                    <div className="text-xl font-extrabold text-purple-700 mt-0.5">
                      +{notification.incomingStudentsCount}
                    </div>
                  </div>
                )}

                {notification.totalScoresCount !== undefined && (
                  <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-center">
                    <div className="text-xs text-slate-600 font-medium">全校有效成绩</div>
                    <div className="text-xl font-extrabold text-slate-800 mt-0.5">
                      {notification.totalScoresCount}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* New Students Detail Section */}
          {notification.incomingStudentNames && notification.incomingStudentNames.length > 0 && (
            <div className="bg-purple-50/40 border border-purple-100 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                  <Users className="w-4 h-4 text-purple-600" />
                  新融入学员档案 ({notification.incomingStudentNames.length} 人)
                </div>
                {onNavigateToStudents && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToStudents();
                    }}
                    className="text-xs text-purple-700 hover:text-purple-900 font-medium flex items-center gap-1"
                  >
                    查看花名册 <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {notification.incomingStudentNames.map((name, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200"
                  >
                    <UserCheck className="w-3 h-3 text-purple-600" />
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* New Classes Detail Section */}
          {notification.incomingClassNames && notification.incomingClassNames.length > 0 && (
            <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <School className="w-4 h-4 text-blue-600" />
                新融入班级 ({notification.incomingClassNames.length} 个)
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {notification.incomingClassNames.map((cName, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                  >
                    <School className="w-3 h-3 text-blue-600" />
                    {cName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* New Scores Sample List */}
          {notification.incomingScoreSamples && notification.incomingScoreSamples.length > 0 && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  新同步成绩记录预览 (前 {notification.incomingScoreSamples.length} 条)
                </div>
                {onNavigateToRecords && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToRecords();
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  >
                    查看成绩台账 <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-200/70 border border-slate-200/60 rounded-lg overflow-hidden bg-white">
                {notification.incomingScoreSamples.map((sample, idx) => (
                  <div key={idx} className="p-2.5 text-xs flex items-center justify-between gap-2 hover:bg-slate-50/80">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-slate-900 flex-shrink-0">
                        {sample.studentName}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] truncate">
                        {sample.className}
                      </span>
                      <span className="text-slate-500 text-[11px] truncate hidden sm:inline">
                        {sample.unit} · {sample.examTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {sample.examDate && (
                        <span className="text-[11px] text-slate-400 hidden sm:inline flex items-center gap-0.5">
                          <Calendar className="w-2.5 h-2.5" />
                          {sample.examDate}
                        </span>
                      )}
                      <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                        sample.score === null
                          ? 'bg-slate-100 text-slate-500'
                          : sample.score >= 90
                          ? 'bg-emerald-100 text-emerald-800'
                          : sample.score >= 80
                          ? 'bg-blue-100 text-blue-800'
                          : sample.score >= 60
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {sample.score !== null ? `${sample.score}分` : '待评'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Dictionaries Detail (if any) */}
          {notification.newDictionaries && (
            (notification.newDictionaries.levels && notification.newDictionaries.levels.length > 0) ||
            (notification.newDictionaries.units && notification.newDictionaries.units.length > 0) ||
            (notification.newDictionaries.teachers && notification.newDictionaries.teachers.length > 0)
          ) && (
            <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl p-3 space-y-1.5 text-xs text-amber-900">
              <div className="font-bold flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                同步更新了字典配置项:
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {notification.newDictionaries.levels && notification.newDictionaries.levels.length > 0 && (
                  <span>新等级: {notification.newDictionaries.levels.join(', ')}</span>
                )}
                {notification.newDictionaries.units && notification.newDictionaries.units.length > 0 && (
                  <span>新单元: {notification.newDictionaries.units.join(', ')}</span>
                )}
                {notification.newDictionaries.teachers && notification.newDictionaries.teachers.length > 0 && (
                  <span>新教师: {notification.newDictionaries.teachers.join(', ')}</span>
                )}
              </div>
            </div>
          )}

          {/* Gist Info Footer Bar */}
          {notification.gistId && (
            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>GitHub Gist 仓库: {notification.gistId.slice(0, 10)}...</span>
              <span className="text-emerald-600 font-medium">✓ 多端实时版本已对齐</span>
            </div>
          )}
        </div>

        {/* Modal Footer Buttons */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {isSuccess ? '✅ 数据已在本地与云端实时生效' : isError ? '❌ 请检查网络或凭证配置' : 'ℹ️ 数据已就绪'}
          </div>

          <div className="flex items-center gap-2">
            <button
              id="confirm-sync-notification-btn"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-xl transition-all shadow-sm"
            >
              确认并关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
