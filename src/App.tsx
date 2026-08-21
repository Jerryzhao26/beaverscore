/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { NavigationHeader } from './components/NavigationHeader';
import { ScoreEntryView } from './components/ScoreEntryView';
import { ScoreQueryView } from './components/ScoreQueryView';
import { RankingsView } from './components/RankingsView';
import { ClassAnalysisView } from './components/ClassAnalysisView';
import { ManagementView } from './components/ManagementView';
import { GistConfigModal } from './components/GistConfigModal';
import { SyncNotificationModal } from './components/SyncNotificationModal';
import { ActiveTab } from './types';

const MainAppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('entry');
  const {
    scoreRecords,
    students,
    classes,
    isGistConfigModalOpen,
    closeGistConfigModal,
    syncNotification,
    dismissSyncNotification
  } = useApp();

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <NavigationHeader activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'entry' && (
          <ScoreEntryView
            onNavigateToQuery={() => setActiveTab('query')}
            onNavigateToRanking={() => setActiveTab('rankings')}
          />
        )}
        {activeTab === 'query' && <ScoreQueryView />}
        {activeTab === 'rankings' && <RankingsView />}
        {activeTab === 'analytics' && <ClassAnalysisView />}
        {activeTab === 'management' && <ManagementView />}
      </main>

      {/* Global Gist Cloud Synchronization Modal */}
      <GistConfigModal isOpen={isGistConfigModalOpen} onClose={closeGistConfigModal} />

      {/* Global Sync Notification / Details Modal */}
      <SyncNotificationModal
        notification={syncNotification}
        onClose={dismissSyncNotification}
        onNavigateToRecords={() => setActiveTab('query')}
        onNavigateToStudents={() => setActiveTab('management')}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>机构学员日常成绩管理与学情分析系统 · 多教师手动保存智能合并 · 私有 Gist 云协同</span>
          <span className="font-mono text-[11px]">
            在册学员: {students.length} 人 | 班级: {classes.length} 个 | 累计测评档案: {scoreRecords.length} 条
          </span>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}

