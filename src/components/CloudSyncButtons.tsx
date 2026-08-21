import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  UploadCloud,
  DownloadCloud,
  Settings,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Cloud,
  Check
} from 'lucide-react';

interface CloudSyncButtonsProps {
  variant?: 'header' | 'toolbar' | 'card';
  showConfigButton?: boolean;
  className?: string;
}

export const CloudSyncButtons: React.FC<CloudSyncButtonsProps> = ({
  variant = 'toolbar',
  showConfigButton = true,
  className = ''
}) => {
  const {
    gistConfig,
    isSyncingGist,
    openGistConfigModal,
    manualSaveAndPushToCloud,
    manualRefreshFromCloud,
    autoSaveStatus
  } = useApp();

  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const isGistConnected = Boolean(gistConfig?.gistId && gistConfig?.token);

  // 1. Action: 同步合并 (Push & Merge)
  const handleSyncAndMerge = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isGistConnected) {
      openGistConfigModal();
      return;
    }
    if (isPushing || isSyncingGist) return;
    setIsPushing(true);
    try {
      await manualSaveAndPushToCloud();
    } finally {
      setTimeout(() => setIsPushing(false), 500);
    }
  };

  // 2. Action: 拉取数据 (Pull Data)
  const handlePullData = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isGistConnected) {
      openGistConfigModal();
      return;
    }
    if (isPulling || isSyncingGist) return;
    setIsPulling(true);
    try {
      await manualRefreshFromCloud();
    } finally {
      setTimeout(() => setIsPulling(false), 500);
    }
  };

  // Render for Header
  if (variant === 'header') {
    return (
      <div className={`flex items-center gap-1.5 sm:gap-2 ${className}`}>
        {/* 1. 同步合并按钮 */}
        <button
          type="button"
          id="header-btn-sync-merge"
          onClick={handleSyncAndMerge}
          disabled={isPushing || isSyncingGist}
          className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
            isPushing || isSyncingGist
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white'
          }`}
          title="【同步合并】将本机的全部新增、修改及【删除操作】推送到云端，并智能融合其他老师的数据"
        >
          {isPushing || isSyncingGist ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-700" />
          ) : (
            <UploadCloud className="w-3.5 h-3.5" />
          )}
          <span>{isPushing || isSyncingGist ? '同步合并中...' : '同步合并'}</span>
        </button>

        {/* 2. 拉取数据按钮 */}
        <button
          type="button"
          id="header-btn-pull-data"
          onClick={handlePullData}
          disabled={isPulling || isSyncingGist}
          className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border shadow-2xs ${
            isPulling
              ? 'bg-sky-100 text-sky-800 border-sky-300'
              : 'bg-white hover:bg-sky-50 text-sky-700 border-sky-200 hover:border-sky-300'
          }`}
          title="【拉取数据】从云端下载其他老师录入的最新班级、学员与成绩档案并刷新本地"
        >
          {isPulling ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
          ) : (
            <DownloadCloud className="w-3.5 h-3.5 text-sky-600" />
          )}
          <span>{isPulling ? '拉取中...' : '拉取数据'}</span>
        </button>

        {/* 3. Gist配置入口 */}
        {showConfigButton && (
          <button
            type="button"
            id="header-btn-gist-config"
            onClick={openGistConfigModal}
            className={`h-9 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
              isGistConnected
                ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
            }`}
            title={
              isGistConnected
                ? `云端已就绪 (教师: ${gistConfig.teacherName || '未设置'})\n点击管理 Token / Gist ID 或生成协同链接`
                : '尚未绑定云端 Gist，点击配置后可跨设备协同'
            }
          >
            <Cloud className={`w-3.5 h-3.5 ${isGistConnected ? 'text-emerald-600' : 'text-amber-600'}`} />
            <span className="hidden md:inline">
              {isGistConnected ? (gistConfig.teacherName ? `${gistConfig.teacherName}` : '云端已绑定') : '配置云端'}
            </span>
            <span className={`w-2 h-2 rounded-full ${isGistConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </button>
        )}
      </div>
    );
  }

  // Render for View Toolbar (inside 成绩录入 / 档案明细 / 班级设置)
  return (
    <div className={`flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 sm:p-2.5 ${className}`}>
      <div className="flex items-center gap-1.5 mr-auto text-xs text-slate-600 font-medium">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
          云
        </span>
        <span className="hidden sm:inline">云端协同操作:</span>
        {isGistConnected ? (
          <span className="text-[11px] text-emerald-700 font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {gistConfig.teacherName || '已连接 Gist'}
          </span>
        ) : (
          <span className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
            未绑定云端
          </span>
        )}
      </div>

      {/* 1. 同步合并按钮 */}
      <button
        type="button"
        id="toolbar-btn-sync-merge"
        onClick={handleSyncAndMerge}
        disabled={isPushing || isSyncingGist}
        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
          isPushing || isSyncingGist
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white'
        }`}
        title="【同步合并】将本页或本机的全部新增、修改及【删除操作】立即上传推送到云端 Gist，并融合其他老师的数据"
      >
        {isPushing || isSyncingGist ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-700" />
        ) : (
          <UploadCloud className="w-3.5 h-3.5" />
        )}
        <span>{isPushing || isSyncingGist ? '同步合并中...' : '同步合并 (Push)'}</span>
      </button>

      {/* 2. 拉取数据按钮 */}
      <button
        type="button"
        id="toolbar-btn-pull-data"
        onClick={handlePullData}
        disabled={isPulling || isSyncingGist}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
          isPulling
            ? 'bg-sky-100 text-sky-800 border-sky-300'
            : 'bg-white hover:bg-sky-50 text-sky-700 border-sky-200 hover:border-sky-300'
        }`}
        title="【拉取数据】从云端 Gist 下载最新全校班级、学员与成绩档案并刷新本地"
      >
        {isPulling ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
        ) : (
          <DownloadCloud className="w-3.5 h-3.5 text-sky-600" />
        )}
        <span>{isPulling ? '拉取中...' : '拉取数据 (Pull)'}</span>
      </button>

      {/* 3. 配置弹窗 */}
      {showConfigButton && (
        <button
          type="button"
          onClick={openGistConfigModal}
          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition cursor-pointer"
          title="配置 GitHub Token、Gist ID 或协同共享链接"
        >
          <Settings className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
