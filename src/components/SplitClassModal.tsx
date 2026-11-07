import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { classLabel } from '../utils/classLabel';
import { groupJointRows, rosterVersion, type Row } from '../utils/jointImport';
export function SplitClassModal({ sourceId, onClose }: { sourceId: string; onClose: () => void }) {
  const { classes, students, levels, teachers, commitJointRoster } = useApp();
  const source = classes.find(c => c.id === sourceId);
  const members = students.filter(s => s.classId === sourceId && s.status !== 'suspended');
  const [version] = useState(() => rosterVersion(classes, students));
  const [name, setName] = useState(source?.name || '');
  const [teacher, setTeacher] = useState(''); const [level, setLevel] = useState('');
  const [year, setYear] = useState(source?.academicYear || ''); const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  function save() {
    if (!source || !name.trim() || !teacher.trim() || !level || !selected.length || selected.length >= members.length) { setError('请填写新班级信息，并选择部分学生转出，原班至少保留一位学生。'); return; }
    if (name.trim() === source.name && teacher.trim() === source.teacherName && level === (source.currentLevel || source.level) && year.trim() === (source.academicYear || '')) { setError('请填写另一个班的教师或级别等区别信息。'); return; }
    try {
      const rows: Row[] = members.filter(s => selected.includes(s.id)).map(s => ({ 班级名称: name.trim(), 教师: teacher.trim(), 班级级别: level, '学年/学期': year.trim(), 姓名: s.name, 学生ID: s.id }));
      const key = groupJointRows(rows)[0].key;
      commitJointRoster(rows, { [key]: { target: 'new', scope: 'imported' } }, Object.fromEntries(rows.map((_, i) => [i + 2, { target: rows[i]['学生ID'], move: true, adopt: false }])), version);
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : '拆分保存失败'); }
  }
  return <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"><div role="dialog" aria-modal="true" aria-labelledby="split-class-title" className="bg-white rounded-xl p-5 max-w-2xl w-full max-h-[90vh] overflow-auto space-y-3 text-sm">
    <h3 id="split-class-title" className="font-bold text-lg">拆分班级</h3>
    <p>原班：{classLabel(source)}。未勾选的学生留在原班；勾选的学生转入下面新建的独立班级，并采用新班级级别。原班教师和级别保持现状，可通过“编辑/调级”调整。</p>
    <div className="grid grid-cols-2 gap-3"><label>新班名称<input className="border p-2 rounded w-full" value={name} onChange={e => setName(e.target.value)} /></label><label>新班教师<input className="border p-2 rounded w-full" list="split-teachers" value={teacher} onChange={e => setTeacher(e.target.value)} /></label><label>新班级别<select className="border p-2 rounded w-full" value={level} onChange={e => setLevel(e.target.value)}><option value="">请选择级别</option>{levels.map(l => <option key={l}>{l}</option>)}</select></label><label>学年/学期<input className="border p-2 rounded w-full" value={year} onChange={e => setYear(e.target.value)} /></label></div>
    <datalist id="split-teachers">{teachers.map(t => <option key={t} value={t} />)}</datalist>
    <h4 className="font-semibold">勾选要转到新班的学生（{selected.length} / {members.length}）</h4>
    <div className="max-h-64 overflow-auto border rounded p-2 space-y-2">{members.map(s => <label key={s.id} className="flex gap-2"><input type="checkbox" checked={selected.includes(s.id)} onChange={e => setSelected(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id))} />{s.name} · {s.studentNo} · {s.currentLevel}</label>)}</div>
    <p>确认后：原班保留 {members.length - selected.length} 人，新班 {selected.length} 人。学生 ID、学号、电话和备注保留；历史成绩继续保留原班级及原考试信息，不自动重写。</p>
    {error && <p role="alert" className="text-rose-700">{error}</p>}
    <div className="flex gap-3"><button onClick={onClose} className="border rounded px-4 py-2">取消</button><button disabled={version !== rosterVersion(classes, students)} onClick={save} className="bg-indigo-700 text-white px-4 py-2 rounded disabled:opacity-40">确认新建班级并转出选中学生</button></div>
    {version !== rosterVersion(classes, students) && <p role="alert">名单已变化，请关闭后重新选择。</p>}
  </div></div>;
}
