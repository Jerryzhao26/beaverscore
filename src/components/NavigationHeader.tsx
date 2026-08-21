import React from 'react';
import { useApp } from '../context/AppContext';
import { ActiveTab } from '../types';
import {
  FileSpreadsheet,
  Search,
  Trophy,
  Users,
  Settings,
  Github,
  RefreshCw,
  Zap,
  BarChart3,
  Database,
  Cloud
} from 'lucide-react';

interface NavigationHeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenSettings?: () => void;
  onOpenGistSync?: () => void;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  onOpenGistSync
}) => {
  const {
    students,
    scoreRecords,
    gistConfig,
    isSyncingGist,
    openGistConfigModal,
    manualRefreshFromCloud
  } = useApp();

  const totalStudents = students?.length || 0;
  const totalRecords = scoreRecords?.length || 0;
  const isGistConnected = Boolean(gistConfig?.gistId && gistConfig?.token);

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleManualRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRefreshing || isSyncingGist) return;
    setIsRefreshing(true);
    await manualRefreshFromCloud();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleOpenGistModal = () => {
    if (onOpenGistSync) {
      onOpenGistSync();
    } else {
      openGistConfigModal();
    }
  };

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'entry',
      label: '成绩录入',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      badge: '双轨录入'
    },
    {
      id: 'query',
      label: '档案明细',
      icon: <Search className="w-4 h-4" />,
      badge: `${totalRecords}条`
    },
    {
      id: 'rankings',
      label: '进退步与榜单',
      icon: <Trophy className="w-4 h-4" />
    },
    {
      id: 'analytics',
      label: '学情与弱项研判',
      icon: <BarChart3 className="w-4 h-4" />
    },
    {
      id: 'management',
      label: '班级与设置',
      icon: <Settings className="w-4 h-4" />,
      badge: `${totalStudents}人`
    }
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-xs">
              E
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                  EduTrack Pro{' '}
                  <span className="hidden sm:inline font-normal text-slate-400 text-sm">
                    | 培训机构双轨成绩管理系统
                  </span>
                </h1>
              </div>
              <p className="text-[11px] text-slate-500 hidden md:block">
                机构BF1-E4 & 公校考级双轨比对 · 手动保存智能合并 · 私有 Gist 云协同
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Cloud Gist Status & Action Button */}
            <div className="flex items-center">
              <button
                type="button"
                id="btn-gist-sync-header"
                onClick={handleOpenGistModal}
                className={`py-1.5 px-3 rounded-l-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  isSyncingGist || isRefreshing
                    ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs'
                    : isGistConnected
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 rounded-r-lg'
                }`}
                title={
                  isGistConnected
                    ? `已连接私有 Gist 云端\n教师名: ${gistConfig.teacherName || '未指定'}\n点击查看协同配置与多端同步邀请`
                    : '点击配置 GitHub Gist，开启跨电脑多老师协同'
                }
              >
                {isSyncingGist || isRefreshing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                ) : isGistConnected ? (
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Github className="w-3.5 h-3.5 text-indigo-600" />
                )}
                <span className="hidden sm:inline">
                  {isSyncingGist
                    ? '云端合并同步中...'
                    : isRefreshing
                    ? '刷新最新数据...'
                    : isGistConnected
                    ? 'Gist 云端协同'
                    : '配置云端协同'}
                </span>
                <span className="inline-flex items-center">
                  <span className={`w-2 h-2 rounded-full ${isGistConnected ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                </span>
              </button>

              {isGistConnected && (
                <button
                  type="button"
                  id="btn-instant-gist-pull"
                  onClick={handleManualRefresh}
                  disabled={isSyncingGist || isRefreshing}
                  className={`py-1.5 px-2.5 rounded-r-lg border border-l-0 text-xs font-semibold flex items-center justify-center transition cursor-pointer ${
                    isRefreshing || isSyncingGist
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200'
                  }`}
                  title="点击刷新并获取同事录入的最新班级数据"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isSyncingGist ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
          </div>
        </div>

        <nav className="flex space-x-1.5 border-t border-slate-100 py-2 overflow-x-auto no-scrollbar">
          {navItems.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-nav-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                {tab.icon}
                <span className="ml-1.5">{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-2 px-2 py-0.5 text-[10px] rounded-full font-semibold ${
                      isActive
                        ? 'bg-indigo-200 text-indigo-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
