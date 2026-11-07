import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { prepareRosterImport, type ImportKind, type Row } from '../utils/rosterImport';

export function RosterImport({ kind }: { kind: ImportKind }) {
  const { classes, students, levels, batchAddClasses, batchAddStudents } = useApp();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const plan = rows ? prepareRosterImport(kind, rows, classes, students, levels) : null;
  const label = kind === 'classes' ? '班级' : '学生';
  async function template(templateKind: ImportKind) {
    const templateLabel = templateKind === 'classes' ? '班级' : '学生';
    const X = await import('xlsx');
    const sample = templateKind === 'classes' ? [{ 班级名称: '示例班', 级别: levels[0] || 'BF1', 教师: '张老师', 学年: '2026-2027' }] : [{ 姓名: '张三', 学号: '0001', 性别: '男', 班级: classes[0]?.name || '示例班', 级别: '', 联系电话: '13800000000', 入学日期: '2026-11-07', 公校年级: '', 备注: '' }];
    const book = X.utils.book_new();
    X.utils.book_append_sheet(book, X.utils.json_to_sheet(sample), templateLabel);
    X.writeFile(book, `${templateLabel}导入模板.xlsx`);
  }
  async function read(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setRows(null); setMessage(''); setBusy(true);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('文件请控制在 5 MB 以内');
      const X = await import('xlsx');
      const book = X.read(await file.arrayBuffer(), { type: 'array', raw: true });
      const sheet = book.Sheets[book.SheetNames[0]];
      const data = X.utils.sheet_to_json<Row>(sheet, { raw: false, defval: '' });
      if (data.length > 5000) throw new Error('每次最多导入 5000 行');
      const first = data[0];
      if (first && kind === 'students' && !['姓名', '学员姓名', 'Name', 'studentName'].some(key => key in first)) throw new Error('学生名单缺少「姓名」列。若文件只有班级、级别、教师和学年，请下载「学生导入模板」填写。');
      if (first && kind === 'classes' && ['姓名', '学员姓名', 'Name', 'studentName'].some(key => key in first)) throw new Error('这是学生名单，请切换「学员名册」后上传；班级模板只用于创建班级。');
      setRows(data);
    } catch (err) { setMessage(err instanceof Error ? err.message : '文件解析失败'); }
    finally { setBusy(false); }
  }
  function commit() {
    if (!plan || plan.errors.length) return;
    try {
      if (kind === 'classes') batchAddClasses(plan.newClasses); else batchAddStudents(plan.newStudents);
      setMessage(`已导入 ${plan.newClasses.length + plan.newStudents.length} 条${label}。已保存本地；可通过同步合并上传云端（开启自动同步时会自动上传）。`);
      setRows(null);
    } catch { setMessage('保存失败，请检查浏览器存储空间并核对名单后重试。'); }
  }
  return <section className="my-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-3">
    <h3 className="font-bold">批量导入{label}</h3>
    <p>仅新增，不覆盖已有资料。先导入班级，再导入学生。读取第一个工作表；请保留表头，删除模板示例行，学号、电话和日期使用文本格式。</p>
    <p className="font-semibold text-slate-700">班级模板填写班级名称、级别、教师、学年；学生模板填写姓名、学号、性别、班级等。两个模板是独立文件。</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => void template('classes').catch(() => setMessage('模板下载失败，请重试'))} className="px-3 py-2 border border-emerald-300 rounded-lg bg-white">下载班级导入模板</button>
      <button type="button" onClick={() => void template('students').catch(() => setMessage('模板下载失败，请重试'))} className="px-3 py-2 border border-indigo-300 rounded-lg bg-white">下载学生导入模板（姓名 / 学号）</button>
      <label className={`px-4 py-2 bg-emerald-700 text-white rounded-lg cursor-pointer ${busy ? 'opacity-50' : ''}`}>
        上传{label}名单（Excel / CSV）
        <input className="sr-only" aria-label={`选择${label}导入文件`} disabled={busy} type="file" accept=".xlsx,.xls,.csv" onChange={read} />
      </label>
    </div>
    <p>当前入口导入<strong>{label}</strong>。{kind === 'classes' ? '导入学生请切换上方「学员名册」。' : '请先在「班级管理」中导入班级，再上传学生名单。'}</p>
    {busy && <p role="status">正在读取…</p>}
    {message && <p role="status">{message}</p>}
    {plan && <div>
      <p>校验通过 {plan.newClasses.length + plan.newStudents.length} 条；错误 {plan.errors.length} 条。存在错误时整批不导入，请修改文件后重选。</p>
      <ul className="max-h-40 overflow-auto text-rose-700">{plan.errors.map((s, i) => <li key={i}>{s}</li>)}</ul>
      <div className="max-h-48 overflow-auto"><table className="w-full text-left"><thead><tr><th>名称</th><th>{kind === 'classes' ? '教师' : '学号'}</th><th>级别</th></tr></thead><tbody>{(kind === 'classes' ? plan.newClasses : plan.newStudents).slice(0, 20).map((r, i) => <tr key={i}><td>{r.name}</td><td>{'teacherName' in r ? r.teacherName : r.studentNo}</td><td>{r.currentLevel}</td></tr>)}</tbody></table></div>
      <p>预览前 20 条</p>
      <button type="button" disabled={!!plan.errors.length} onClick={commit} className="mt-2 px-4 py-2 bg-emerald-700 text-white rounded disabled:opacity-40">确认导入全部有效记录</button>
      <button type="button" onClick={() => setRows(null)} className="ml-4">取消</button>
    </div>}
  </section>;
}
