import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { createRosterExport, createRosterWorkbook } from '../utils/rosterExport';

export function RosterExport() {
  const { classes, students, levels, teachers } = useApp();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function download(format: 'xlsx' | 'json') {
    setBusy(true); setMessage('');
    try {
      const data = createRosterExport(classes, students, levels, teachers);
      const date = new Date().toLocaleDateString('sv-SE');
      const name = `BeaverScore_班级与学生名单_${date}`;
      if (format === 'xlsx') {
        const X = await import('xlsx');
        X.writeFile(createRosterWorkbook(X, data), `${name}.xlsx`);
      } else {
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }));
        try {
          const a = document.createElement('a'); a.href = url; a.download = `${name}.json`;
          document.body.appendChild(a); a.click(); a.remove();
        } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
      }
      setMessage(`已生成 ${data.classes.length} 个班级、${data.students.length} 位学生的${format === 'xlsx' ? ' Excel' : ' JSON'}名单。`);
    } catch { setMessage('导出失败，请重试。'); }
    finally { setBusy(false); }
  }
  return <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
    <h3 className="font-bold text-sm">一键导出班级与学生名单</h3>
    <p className="text-slate-500">导出全部未删除档案（含停学学生），不受筛选影响。Excel 用于整理；JSON 保留档案 ID 和更新时间，可在「备份与恢复」中导入合并。仅导出本机当前数据，需要云端最新名单时请先拉取数据。</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={() => void download('xlsx')} className="px-4 py-2 bg-emerald-700 text-white rounded-lg disabled:opacity-50">导出班级和学生（Excel）</button>
      <button type="button" disabled={busy} onClick={() => void download('json')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">导出合并名单（JSON）</button>
    </div>
    <p className="text-slate-500">不包含成绩或云端凭据。Excel 可通过联合导入确认后更新已有档案；JSON 可在备份与恢复中按 ID 合并。同学号但不同 ID 的档案需要人工核对。</p>
    {message && <p role="status">{message}</p>}
  </section>;
}
