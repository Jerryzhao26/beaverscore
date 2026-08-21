import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Database,
  Key,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  Plus,
  Radio,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  Clock,
  History
} from 'lucide-react';

interface GistConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GistConfigModal: React.FC<GistConfigModalProps> = ({ isOpen, onClose }) => {
  const {
    gistConfig,
    updateGistConfig,
    isSyncingGist,
    pushToGist,
    pullFromGist,
    createAndLinkGist,
    getShareUrl,
    syncLogs
  } = useApp();

  const [tokenInput, setTokenInput] = useState<string>(gistConfig.token || '');
  const [gistIdInput, setGistIdInput] = useState<string>(gistConfig.gistId || '');
  const [teacherNameInput, setTeacherNameInput] = useState<string>(gistConfig.teacherName || '');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'invite' | 'logs'>('config');

  if (!isOpen) return null;

  const isConnected = Boolean(gistConfig.gistId);
  const hasToken = Boolean(gistConfig.token);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateGistConfig({
      token: tokenInput.trim(),
      gistId: gistIdInput.trim(),
      teacherName: teacherNameInput.trim()
    });
    setFeedbackMsg({
      text: '✅ 云端配置已成功更新保存！',
      type: 'success'
    });
  };

  const handleCreateNewGist = async () => {
    if (!tokenInput.trim()) {
      setFeedbackMsg({
        text: '❌ 请先在上方输入有效的 GitHub Token (需包含 gist 权限)',
        type: 'error'
      });
      return;
    }
    const res = await createAndLinkGist(tokenInput.trim());
    if (res.success && res.gistId) {
      setGistIdInput(res.gistId);
      setFeedbackMsg({
        text: `🎉 成功在 GitHub 创建并绑定私有 Gist (ID: ${res.gistId.slice(0, 8)}...)！`,
        type: 'success'
      });
    } else {
      setFeedbackMsg({
        text: `❌ 创建失败: ${res.message}`,
        type: 'error'
      });
    }
  };

  const handleTestAndPull = async () => {
    if (!gistIdInput.trim()) {
      setFeedbackMsg({
        text: '❌ 请先填写 Gist ID 或点击新建仓库',
        type: 'error'
      });
      return;
    }
    const res = await pullFromGist(tokenInput.trim() || undefined, gistIdInput.trim(), false);
    if (res.success) {
      setFeedbackMsg({
        text: `✅ 云端握手成功！已成功拉取并融合最新全校数据档案。`,
        type: 'success'
      });
    } else {
      setFeedbackMsg({
        text: `❌ 拉取失败: ${res.message}`,
        type: 'error'
      });
    }
  };

  const handleCopyShareLink = (mode: 'full' | 'readonly' = 'full') => {
    const url = getShareUrl(mode);
    if (!url) return;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
    setFeedbackMsg({
      text: `📋 已复制${mode === 'full' ? '【全功能协同】' : '【只读查看】'}链接，发给同事打开即可自动完成云端配置！`,
      type: 'success'
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                GitHub Gist 私有云多教师协同同步中心
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                支持按需保存上传、无损智能合并与全校数据一键同步刷新
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Subtabs */}
        <div className="px-6 pt-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('config')}
              className={`px-4 py-2 border-b-2 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'config'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              云端连接配置
            </button>
            <button
              onClick={() => setActiveTab('invite')}
              className={`px-4 py-2 border-b-2 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'invite'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              同事协同与专属网址
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 border-b-2 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              同步操作历史 ({syncLogs?.length || 0})
            </button>
          </div>

          {/* Quick status pill */}
          <div className="pb-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                isConnected
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full mr-1.5 ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              {isConnected ? '云端已连接' : '未连接云端'}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {feedbackMsg && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                feedbackMsg.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : feedbackMsg.type === 'info'
                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedbackMsg.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>{feedbackMsg.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackMsg(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* TAB 1: CONFIG */}
          {activeTab === 'config' && (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  工作机制说明：
                </div>
                <p>
                  1. 老师录入自己班级的成绩后，点击<strong>「保存并同步到云端」</strong>，系统会自动将本次录入与云端合并并上传。
                </p>
                <p>
                  2. 多个老师录入不同班级互不影响；想要查看同事刚录入的最新数据，随时点击页面顶部的<strong>「🔄 刷新获取云端数据」</strong>即可。
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span className="flex items-center">
                    <Key className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                    GitHub Personal Access Token (PAT) <span className="text-rose-500 ml-1">*</span>
                  </span>
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-normal text-indigo-600 hover:underline flex items-center"
                  >
                    前往 GitHub 生成 Token <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                </label>
                <input
                  type="password"
                  value={tokenInput || ''}
                  onChange={e => setTokenInput(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx 或 github_pat_..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  需勾选 <strong>gist</strong> 权限。Token 仅留存在您电脑本地浏览器，安全可控。
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span>GitHub Gist ID (数据仓库标识)</span>
                  {tokenInput && (
                    <button
                      type="button"
                      onClick={handleCreateNewGist}
                      disabled={isSyncingGist}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-0.5" />
                      自动在我的 GitHub 新建私有 Gist 仓库
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  value={gistIdInput || ''}
                  onChange={e => setGistIdInput(e.target.value)}
                  placeholder="如: 8a7d3bf62c129e928f09... (可从已有 Gist URL 中复制)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    当前操作教师代号 / 姓名
                  </label>
                  <input
                    type="text"
                    value={teacherNameInput || ''}
                    onChange={e => setTeacherNameInput(e.target.value)}
                    placeholder="例如: 王老师 (用于标记本次同步日志)"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    最近一次成功同步时间
                  </label>
                  <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 font-mono">
                    {gistConfig.lastSyncedAt
                      ? new Date(gistConfig.lastSyncedAt).toLocaleString('zh-CN')
                      : '尚未进行过云端同步'}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleTestAndPull}
                  disabled={isSyncingGist || !gistIdInput.trim()}
                  className="w-full sm:w-auto px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncingGist ? 'animate-spin' : ''}`} />
                  测试连接并立即拉取云端数据
                </button>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  保存配置
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: INVITE / SHARE URL */}
          {activeTab === 'invite' && (
            <div className="space-y-4">
              <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100 text-xs text-indigo-900 space-y-2">
                <h4 className="font-bold flex items-center text-sm text-indigo-950">
                  <Users className="w-4 h-4 mr-1.5 text-indigo-600" />
                  如何让同事无缝加入并共同使用此数据源？
                </h4>
                <p>
                  只需复制下方系统生成的<strong>【机构专属协同网址】</strong>发送给同事，同事在浏览器中打开该网址，系统将<strong>自动绑定此 Gist 仓库</strong>，同事无需手动复制粘贴 Gist ID！
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    🔗 全功能协同网址 (包含 Gist 仓库与 Token，直接可录入与上传)
                  </label>
                  <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                    推荐内部教师使用
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getShareUrl('full') || '请先在【云端连接配置】中填写 Gist ID'}
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyShareLink('full')}
                    disabled={!gistConfig.gistId}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold flex items-center shrink-0 cursor-pointer shadow-xs"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1" /> 已复制
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1" /> 复制协作链接
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    👁️ 只读查看网址 (仅包含 Gist ID，不包含 Token，适合校长/顾问/家长查阅)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getShareUrl('readonly') || '请先填写 Gist ID'}
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyShareLink('readonly')}
                    disabled={!gistConfig.gistId}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold flex items-center shrink-0 cursor-pointer shadow-xs"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> 复制只读链接
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800">最近同步操作明细流水</h4>
                <span className="text-xs text-slate-400">保留最新操作记录</span>
              </div>

              {(!syncLogs || syncLogs.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-xs">
                  暂无同步流水记录。每次您或同事点击「保存并同步」或「刷新同步」时，记录将自动在此生成。
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {syncLogs.map(log => (
                    <div
                      key={log.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-start justify-between text-xs hover:border-indigo-200 transition"
                    >
                      <div className="flex items-start space-x-2.5">
                        <div
                          className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${
                            log.success ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {log.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{log.message}</span>
                            {log.operatorTeacher && (
                              <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded text-[10px] font-normal">
                                操作人: {log.operatorTeacher}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3">
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(log.timestamp).toLocaleString('zh-CN')}
                            </span>
                            {log.incomingCount !== undefined && log.incomingCount > 0 && (
                              <span className="text-indigo-600 font-medium">
                                融合云端新数据 +{log.incomingCount} 条
                              </span>
                            )}
                            {log.totalRecordsCount !== undefined && (
                              <span>全校总条数: {log.totalRecordsCount}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            完成并关闭
          </button>
        </div>
      </div>
    </div>
  );
};
