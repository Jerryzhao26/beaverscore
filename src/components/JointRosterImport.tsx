import { classLabel } from '../utils/classLabel';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { groupJointRows, resolveJointGroups, suggestClass, suggestStudent, studentCandidates, buildJointPlan, rosterVersion, type Row, type ClassChoice, type StudentChoice } from '../utils/jointImport';
export function JointRosterImport() {
  const { classes, students, levels, commitJointRoster } = useApp();
  const [rows, setRows] = useState<Row[]>([]); const [cc, setCC] = useState<Record<string, ClassChoice>>({}); const [sc, setSC] = useState<Record<string, StudentChoice>>({});
  const [step, setStep] = useState(0); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [version, setVersion] = useState('');
  const groups = groupJointRows(rows);
  const resolved = resolveJointGroups(rows, classes, cc);
  const plan = buildJointPlan(rows, classes, students, levels, cc, sc);
  const updateClass = (key: string, patch: Partial<ClassChoice>) => setCC(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  const updateStudent = (line: number, patch: Partial<StudentChoice>) => setSC(prev => ({ ...prev, [line]: { ...prev[line], ...patch } }));
  async function template() {
    try { const X = await import('xlsx'); const b = X.utils.book_new();
      X.utils.book_append_sheet(b, X.utils.json_to_sheet([{ 班级名称: '周六上午班', 教师: '张老师', 班级级别: levels[0] || 'BF1', '学年/学期': '2026秋', 姓名: '张三', 学号: '', 性别: '', 学生级别: '', 联系电话: '', 入学日期: '', 公校年级: '', 备注: '', 班级ID: '', 学生ID: '' }]), '联合导入');
      X.writeFile(b, '班级与学生联合导入模板.xlsx');
    } catch { setMessage('模板下载失败，请重试'); }
  }
  async function read(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
    setBusy(true); setRows([]); setStep(0); setMessage('');
    try {
      if (file.size > 5 * 1024 * 1024) throw Error('文件不能超过 5 MB');
      const X = await import('xlsx'); const b = X.read(await file.arrayBuffer(), { type: 'array', raw: true });
      const data = X.utils.sheet_to_json<Row>(b.Sheets['联合导入'] || b.Sheets['学生'] || b.Sheets[b.SheetNames[0]], { raw: false, defval: '' });
      if (!data.length || data.length > 5000) throw Error('请上传 1–5000 行名单');
      if (!('姓名' in data[0]) && !('学员姓名' in data[0])) throw Error('未找到姓名列，请使用联合导入模板，每行填写一位学生');
      const choices: Record<string, ClassChoice> = {}; for (const g of groupJointRows(data)) choices[g.key] = { target: suggestClass(g, classes) };
      const identities: Record<string, StudentChoice> = {}; for (const g of groupJointRows(data)) for (const { row, line } of g.rows) identities[line] = { target: suggestStudent(row, students) };
      setRows(data); setCC(choices); setSC(identities); setVersion(rosterVersion(classes, students)); setStep(1);
    } catch (err) { setMessage(err instanceof Error ? err.message : '读取失败'); } finally { setBusy(false); }
  }
  function confirm() {
    try {
      if (plan.errors.length) return;
      commitJointRoster(rows, cc, sc, version);
      setMessage(`导入完成：新班级 ${plan.createdClasses}，更新班级 ${plan.updatedClasses}，新学生 ${plan.createdStudents}，更新学生 ${plan.updatedStudents}，跳过 ${plan.skipped} 行。已保存本地，可同步合并至云端。`);
      setStep(0); setRows([]);
    } catch (err) { setMessage(err instanceof Error ? err.message : '保存失败，请重试'); }
  }
  return <section className="p-5 my-4 bg-indigo-50 border border-indigo-200 rounded-xl text-sm space-y-3">
    <h3 className="font-bold">班级与学员联合导入</h3>
    <p>一行一个学生，同班重复填写班级信息。新班级会一起创建；学号、ID 可留空，由系统生成。已有档案优先按 ID、学号识别，同名仅作为候选。空白资料不会清空已有值。</p>
    <div className="flex flex-wrap gap-3"><button onClick={() => void template()} className="bg-white border rounded px-3 py-2">下载联合导入模板</button><label className="bg-indigo-700 text-white rounded px-3 py-2 cursor-pointer">{busy ? '正在读取…' : '上传班级与学生名单'}<input aria-label="上传联合导入名单" className="sr-only" type="file" accept=".xlsx,.xls,.csv" disabled={busy} onChange={read} /></label></div>
    <p className="font-semibold text-amber-800">同名但教师或级别不同的两个班，应分别选择“新建独立班级”。只有确认属于同一班时才选择合并。</p>
    <p className="text-xs">多个分组可归入同一已有班级，也可选择合并到本次新建班级。先确认班级 → 确认学生 → 预览变更 → 保存。最多 5000 行、5 MB。优先读取「联合导入」或「学生」工作表，否则读取首个工作表；下载后删除示例行。此流程不修改历史成绩。</p>
    {message && <p role="status" className="font-semibold">{message}</p>}
    {step > 0 && version !== rosterVersion(classes, students) && <p role="alert">名单已发生变化，请重新上传文件后确认，避免覆盖其他修改。</p>}
    {step === 1 && <div className="space-y-4"><h4 className="font-bold">1. 确认班级（每班一次）</h4>{groups.map(g => {
      const bucket = resolved.groups.find(b => b.members.includes(g.key)); const fieldRows = bucket?.group.rows || g.rows; const attached = bucket && bucket.group.key !== g.key;
      const choice = cc[g.key]; const existing = classes.find(c => c.id === choice?.target); const fields = { name: ['班级名称', fieldRows.map(r => r.row['班级名称'] || r.row['班级'] || '')], teacherName: ['教师', fieldRows.map(r => r.row['教师'] || r.row['老师'] || '')], currentLevel: ['班级级别', fieldRows.map(r => r.row['班级级别'] || r.row['级别'] || '')], academicYear: ['学年/学期', fieldRows.map(r => r.row['学年/学期'] || r.row['学年'] || '')] } as const;
      return <div key={g.key} className="p-3 bg-white rounded border space-y-2"><p className="font-semibold">{classLabel({ name: g.name, teacherName: g.teacher, currentLevel: [...new Set(g.rows.map(r => r.row['班级级别'] || r.row['级别']).filter(Boolean))].join(' / '), academicYear: g.year })} · {g.rows.length} 人</p>
        <label>归属 <select aria-label={`${g.name}归属`} value={choice?.target || ''} onChange={e => updateClass(g.key, { target: e.target.value, fields: {}, scope: undefined })}><option value="">请选择归属</option><option value="new">新建独立班级（允许同名）</option>{classes.map(c => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}{groups.filter(other => other.key !== g.key && cc[other.key]?.target === 'new').map(other => <option key={other.key} value={`group:${other.key}`}>合并到本次新建：{classLabel({ name: other.name, teacherName: other.teacher, currentLevel: [...new Set(other.rows.map(r => r.row['班级级别'] || r.row['级别']).filter(Boolean))].join(' / '), academicYear: other.year })}（第 {other.rows[0].line} 行分组）</option>)}<option value="skip">跳过本班及学生</option></select></label>
        {attached && <p className="text-indigo-700">已并入「{bucket.group.name}」的同一导入目标。班级资料差异请在对应主分组统一确认，所有学生会一起导入。</p>}
        {!attached && choice?.target !== 'skip' && Object.entries(fields).map(([field, [label, raw]]) => {
          const values = [...new Set((raw as readonly string[]).map(v => v.trim()).filter(Boolean))]; const old = existing ? String(field === 'currentLevel' ? existing.currentLevel || existing.level : existing[field] || '') : '';
          if (values.length < 2 && (!existing || !values.length || values[0] === old)) return null;
          return <label key={field} className="block">{label}：现有 {old || '空'}；表格 {values.join(' / ')} <select value={choice?.fields?.[field] || ''} onChange={e => updateClass(g.key, { fields: { ...choice.fields, [field]: e.target.value } })}><option value="">请选择</option>{existing && <option value={old || '__EMPTY__'}>保留现有：{old || '空'}</option>}{values.filter(v => v !== old).map(v => <option key={v} value={v}>采用：{v}</option>)}</select></label>;
        })}
        {!attached && existing && <label className="block">级别更新范围 <select value={choice.scope || ''} onChange={e => updateClass(g.key, { scope: e.target.value as ClassChoice['scope'] })}><option value="">修改级别时请选择范围</option><option value="class">只改班级，已有学生保持原级别</option><option value="imported">本次导入学生继承（有学生级别的除外）</option><option value="all">全班在读学生同步调级（含表格外 {students.filter(s => s.classId === existing.id && s.status !== 'suspended').length} 人，预览中显示明细）</option></select></label>}
      </div>;
    })}<button className="px-4 py-2 bg-indigo-700 text-white rounded" onClick={() => setStep(2)}>下一步：确认学生</button></div>}
    <datalist id="joint-existing-students">{students.map(s => <option key={s.id} value={s.id}>{s.name} / {s.studentNo}</option>)}</datalist>
    {step === 2 && <div className="space-y-3"><h4 className="font-bold">2. 确认学生身份、资料与转班</h4><div className="max-h-[32rem] overflow-auto space-y-2">{groups.filter(g => cc[g.key]?.target !== 'skip').flatMap(g => g.rows.map(({ row, line }) => {
      const destination = resolved.groups.find(b => b.members.includes(g.key))?.choice.target;
      const choice = sc[line]; const candidates = studentCandidates(row, students); const existing = students.find(s => s.id === choice?.target);
      return <div key={line} className="p-3 bg-white border rounded space-y-2"><p>第 {line} 行：{row['姓名'] || row['学员姓名']} / 学号 {row['学号'] || '自动分配'} / {g.name}</p>
        <select aria-label={`第${line}行学生身份`} value={choice?.target || ''} onChange={e => setSC(prev => ({ ...prev, [line]: { target: e.target.value } }))}><option value="">请选择身份（含同名候选）</option><option value="new">作为新学生</option><optgroup label="候选档案">{candidates.map(s => <option key={s.id} value={s.id}>{s.name} / {s.studentNo} / {classLabel(classes.find(c => c.id === s.classId), '无班级')} / {s.id.slice(-8)}</option>)}</optgroup><option value="skip">跳过此行</option></select><input className="border rounded p-1 ml-2" aria-label={`第${line}行搜索其他学生`} list="joint-existing-students" placeholder="或搜索其他已有学生" onChange={e => setSC(prev => ({ ...prev, [line]: { target: e.target.value } }))} />
        {existing && <><p className="text-xs">现有：{existing.name} / {existing.studentNo} / {existing.currentLevel} / {existing.contactPhone || '无电话'} / {existing.status === 'suspended' ? '停学' : '在读'}</p><details><summary>查看表格非空资料（采用时更新以下字段）</summary>{Object.entries(row).filter(([k, v]) => v && ['姓名','学员姓名','学号','性别','学生级别','联系电话','手机号','入学日期','公校年级','备注'].includes(k)).map(([k,v]) => <p key={k}>{k}：{String(existing[({ 姓名:'name',学员姓名:'name',学号:'studentNo',性别:'gender',学生级别:'currentLevel',联系电话:'contactPhone',手机号:'contactPhone',入学日期:'enrolledDate',公校年级:'schoolGrade',备注:'notes' } as Record<string,string>)[k]] || '空')} → {v}</p>)}</details>
          <label className="block">资料差异 <select value={choice.adopt === undefined ? '' : String(choice.adopt)} onChange={e => updateStudent(line, { adopt: e.target.value === '' ? undefined : e.target.value === 'true' })}><option value="">有差异时请选择</option><option value="false">保留现有资料</option><option value="true">采用表格中的非空资料</option></select></label>
          {(destination === 'new' || existing.classId !== destination) && <label className="block">班级不同 <select value={choice.move === undefined ? '' : String(choice.move)} onChange={e => updateStudent(line, { move: e.target.value === '' ? undefined : e.target.value === 'true' })}><option value="">请选择</option><option value="false">保留原班，跳过此行</option><option value="true">转入本次确认班级（历史成绩保留原归属）</option></select></label>}
          {existing.status === 'suspended' && <label className="block"><input type="checkbox" checked={!!choice.restore} onChange={e => updateStudent(line, { restore: e.target.checked })} />明确恢复为在读（否则请跳过）</label>}
        </>}
      </div>;
    }))}</div><button onClick={() => setStep(1)} className="mr-4">返回班级确认</button><button onClick={() => setStep(3)} className="bg-indigo-700 text-white px-4 py-2 rounded">下一步：预览变更</button></div>}
    {step === 3 && <div className="space-y-2"><h4 className="font-bold">3. 最终预览</h4><p>新班级 {plan.createdClasses} · 修改班级 {plan.updatedClasses} · 新学生 {plan.createdStudents} · 修改学生 {plan.updatedStudents} · 跳过 {plan.skipped} 行 · 待处理 {plan.errors.length} 项</p><ul className="text-rose-700 max-h-48 overflow-auto">{plan.errors.map((e,i) => <li key={i}>{e}</li>)}</ul><ul className="max-h-64 overflow-auto">{plan.changes.map((e,i) => <li key={i}>{e}</li>)}</ul><button onClick={() => setStep(2)} className="mr-4">返回处理</button><button disabled={!!plan.errors.length || version !== rosterVersion(classes, students)} onClick={confirm} className="bg-emerald-700 text-white px-4 py-2 rounded disabled:opacity-40">确认全部变更并保存</button></div>}
    {step > 0 && <button onClick={() => { setStep(0); setRows([]); }} className="underline">取消本次导入</button>}
  </section>;
}
