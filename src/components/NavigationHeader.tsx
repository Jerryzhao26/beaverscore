import React from 'react';
import { useApp } from '../context/AppContext';
import { ActiveTab } from '../types';
import { CloudSyncButtons } from './CloudSyncButtons';
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
            {/* Direct Dual Action Buttons: 同步合并 (Push & Merge) + 拉取数据 (Pull) */}
            <CloudSyncButtons variant="header" />
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
