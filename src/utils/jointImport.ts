import type { ClassGroup, Student } from '../types';
export type Row = Record<string, string>;
export type ClassChoice = { target: string; fields?: Record<string, string>; scope?: 'class' | 'imported' | 'all' };
export type StudentChoice = { target: string; adopt?: boolean; move?: boolean; restore?: boolean };
const get = (r: Row, ...keys: string[]) => keys.map(k => String(r[k] ?? '').trim()).find(Boolean) || '';
export function groupJointRows(rows: Row[]) {
  const groups = new Map<string, { key: string; rows: { row: Row; line: number }[]; name: string; teacher: string; year: string; id: string }>();
  rows.forEach((row, i) => {
    if (!Object.values(row).some(v => String(v ?? '').trim())) return;
    const name = get(row, '班级名称', '班级'); const teacher = get(row, '教师', '老师'); const year = get(row, '学年/学期', '学年'); const id = get(row, '班级ID');
    const key = JSON.stringify(id ? [id] : [name, teacher, year]);
    if (!groups.has(key)) groups.set(key, { key, rows: [], name, teacher, year, id });
    groups.get(key)!.rows.push({ row, line: i + 2 });
  });
  return [...groups.values()];
}
export function suggestClass(g: ReturnType<typeof groupJointRows>[number], classes: ClassGroup[]) {
  const live = classes.filter(c => !c.isDeleted);
  if (g.id) return live.some(c => c.id === g.id) ? g.id : '';
  const sameName = live.filter(c => c.name.trim() === g.name);
  const exact = sameName.filter(c => c.teacherName.trim() === g.teacher && (c.academicYear || '').trim() === g.year);
  return exact.length === 1 ? exact[0].id : sameName.length ? '' : 'new';
}
export function studentCandidates(row: Row, students: Student[]) {
  const live = students.filter(s => !s.isDeleted); const id = get(row, '学生ID'); const no = get(row, '学号'); const name = get(row, '姓名', '学员姓名');
  if (id) return live.filter(s => s.id === id);
  if (no) { const byNo = live.filter(s => s.studentNo === no); if (byNo.length) return byNo; }
  return live.filter(s => s.name.trim() === name);
}
export function suggestStudent(row: Row, students: Student[]) {
  const candidates = studentCandidates(row, students); const id = get(row, '学生ID'); const no = get(row, '学号'); const name = get(row, '姓名', '学员姓名');
  if (id) return candidates.length === 1 && candidates[0].name === name ? candidates[0].id : '';
  if (no && candidates.length === 1 && candidates[0].studentNo === no && candidates[0].name === name) return candidates[0].id;
  return candidates.length ? '' : 'new';
}
export function buildJointPlan(rows: Row[], classes: ClassGroup[], students: Student[], levels: string[], classChoices: Record<string, ClassChoice>, studentChoices: Record<string, StudentChoice>, now = Date.now()) {
  const nextClasses = classes.map(c => ({ ...c })); const nextStudents = students.map(s => ({ ...s }));
  const errors: string[] = []; const changes: string[] = []; const seen = new Set<string>(); const selectedClasses = new Set<string>();
  let createdClasses = 0, createdStudents = 0, updatedStudents = 0, updatedClasses = 0, skipped = 0;
  const groups = groupJointRows(rows); const date = new Date(now).toLocaleDateString('sv-SE');
  for (const g of groups) {
    const choice = classChoices[g.key] || { target: suggestClass(g, classes) };
    if (choice.target === 'skip') { skipped += g.rows.length; continue; }
    if (!choice.target) { errors.push(`班级「${g.name || '未填写'}」请选择归属`); continue; }
    if (!g.name) { errors.push(`第 ${g.rows[0].line} 行缺少班级名称`); continue; }
    const fields: Record<string, string> = {};
    for (const [field, keys] of Object.entries({ name: ['班级名称', '班级'], teacherName: ['教师', '老师'], currentLevel: ['班级级别', '级别'], academicYear: ['学年/学期', '学年'] })) {
      const values = [...new Set(g.rows.map(({ row }) => get(row, ...keys)).filter(Boolean))];
      if (values.length > 1 && !choice.fields?.[field]) errors.push(`班级「${g.name}」的${keys[0]}有多个值，请统一选择或拆分文件`);
      fields[field] = choice.fields?.[field] || values[0] || '';
    }
    let cls = nextClasses.find(c => !c.isDeleted && c.id === choice.target);
    if (choice.target === 'new') {
      if (!fields.teacherName || !fields.currentLevel) { errors.push(`新班级「${g.name}」教师和班级级别必填`); continue; }
      cls = { id: `cls_${crypto.randomUUID()}`, name: fields.name, teacherName: fields.teacherName, level: fields.currentLevel, currentLevel: fields.currentLevel, academicYear: fields.academicYear, updatedAt: now };
      createdClasses++; nextClasses.push(cls); changes.push(`新建班级：${cls.name} / ${cls.teacherName}`);
    } else {
      if (!cls) { errors.push(`班级「${g.name}」不存在，请重新确认`); continue; }
      if (selectedClasses.has(cls.id)) { errors.push(`多个导入分组指向「${cls.name}」，请合并文件中的班级信息或选择不同班级`); continue; }
      selectedClasses.add(cls.id);
      let changed = false; const oldLevel = cls.currentLevel || cls.level;
      for (const field of ['name', 'teacherName', 'currentLevel', 'academicYear']) {
        const incoming = fields[field]; const old = field === 'currentLevel' ? oldLevel : String(cls[field] || '');
        // An explicit field choice is required for conflicting non-empty values.
        if (incoming && incoming !== old) {
          const selected = choice.fields?.[field];
          if (!selected) { errors.push(`班级「${g.name}」${field === 'teacherName' ? '教师' : field === 'currentLevel' ? '级别' : field === 'name' ? '名称' : '学年'}不同，请选择保留或采用表格值`); continue; }
          const resolved = selected === '__EMPTY__' ? '' : selected;
          if (resolved !== old) { (cls as any)[field] = resolved; changed = true; changes.push(`班级 ${g.name}：${old || '空'} → ${selected}`); }
        }
      }
      cls.level = cls.currentLevel || cls.level;
      if (changed) { cls.updatedAt = Math.max(now, (cls.updatedAt || 0) + 1); updatedClasses++; }
      if (cls.level !== oldLevel && !choice.scope) errors.push(`班级「${g.name}」请选择级别更新范围`);
      if (cls.level !== oldLevel && choice.scope === 'all') for (const s of nextStudents.filter(s => !s.isDeleted && s.classId === cls!.id && s.status !== 'suspended')) { s.currentLevel = cls.level; s.updatedAt = Math.max(now, (s.updatedAt || 0) + 1); changes.push(`全班调级：${s.name} → ${cls.level}`); }
    }
    if (!levels.includes(cls.currentLevel || cls.level)) errors.push(`班级「${cls.name}」级别未配置，请先添加级别`);
    for (const { row, line } of g.rows) {
      const sc = studentChoices[line] || { target: suggestStudent(row, students) };
      if (sc.target === 'skip') { skipped++; continue; }
      const name = get(row, '姓名', '学员姓名'); const no = get(row, '学号'); const id = get(row, '学生ID');
      if (!name || !sc.target) { errors.push(`第 ${line} 行：${!name ? '缺少姓名' : '请选择学生身份'}`); continue; }
      const key = id ? `id:${id}` : no ? `no:${no}` : `name:${g.key}:${name}`;
      if (seen.has(key)) { errors.push(`第 ${line} 行：文件内学生重复，请核对或跳过重复行`); continue; } seen.add(key);
      const level = get(row, '学生级别') || cls.currentLevel || cls.level;
      if (!levels.includes(level)) errors.push(`第 ${line} 行：学生级别未配置`);
      const gender = get(row, '性别'); if (gender && !['男', '女', 'male', 'female'].includes(gender)) errors.push(`第 ${line} 行：性别无效`);
      const enrolled = get(row, '入学日期'); if (enrolled && (!/^\d{4}-\d{2}-\d{2}$/.test(enrolled) || !Number.isFinite(Date.parse(enrolled)) || new Date(enrolled).toISOString().slice(0, 10) !== enrolled)) errors.push(`第 ${line} 行：日期应为有效 YYYY-MM-DD`);
      const patch: Partial<Student> = {};
      for (const [field, keys] of Object.entries({ name: ['姓名', '学员姓名'], studentNo: ['学号'], contactPhone: ['联系电话', '手机号'], notes: ['备注'], schoolGrade: ['公校年级'], enrolledDate: ['入学日期'] })) { const v = get(row, ...keys); if (v) (patch as any)[field] = v; }
      if (gender) patch.gender = ['女', 'female'].includes(gender) ? 'female' : 'male';
      if (get(row, '学生级别')) patch.currentLevel = level;
      if (sc.target === 'new') {
        const allocated = no || `S${now}${crypto.randomUUID().slice(0, 8)}`;
        if (nextStudents.some(s => !s.isDeleted && s.studentNo === allocated)) { errors.push(`第 ${line} 行：学号 ${allocated} 已存在，不能作为新学生`); continue; }
        nextStudents.push({ id: `std_${crypto.randomUUID()}`, name, studentNo: allocated, gender: undefined, classId: cls.id, currentLevel: level, enrolledDate: enrolled || date, status: 'active', ...patch, updatedAt: now });
        createdStudents++; changes.push(`新增学生：${name} → ${cls.name}`);
      } else {
        const s = nextStudents.find(s => !s.isDeleted && s.id === sc.target);
        if (!s) { errors.push(`第 ${line} 行：学生不存在`); continue; }
        if (seen.has(`target:${s.id}`)) { errors.push(`第 ${line} 行：多行指向同一学生`); continue; } seen.add(`target:${s.id}`);
        if (no && nextStudents.some(other => !other.isDeleted && other.id !== s.id && other.studentNo === no)) errors.push(`第 ${line} 行：学号属于另一学生`);
        if (s.classId !== cls.id && sc.move === undefined) errors.push(`第 ${line} 行：请选择转班或保留原班并跳过`);
        if (s.classId !== cls.id && sc.move === false) { skipped++; continue; }
        if (s.status === 'suspended' && !sc.restore) { errors.push(`第 ${line} 行：停学学生需明确恢复或跳过`); continue; }
        const differs = Object.entries(patch).some(([k, v]) => s[k] !== v);
        if (differs && sc.adopt === undefined) errors.push(`第 ${line} 行：资料有差异，请选择保留或采用表格资料`);
        const before = JSON.stringify(s);
        if (sc.adopt) Object.assign(s, patch);
        if (sc.move) { changes.push(`转班：${s.name} / ${s.classId || '无班级'} → ${cls.name}`); s.classId = cls.id; }
        if (sc.restore) { s.status = 'active'; s.suspendedAt = undefined; s.suspendReason = undefined; }
        if (choice.scope === 'imported' && !get(row, '学生级别')) s.currentLevel = cls.level;
        if (JSON.stringify(s) !== before) { s.updatedAt = Math.max(now, (s.updatedAt || 0) + 1); updatedStudents++; changes.push(`更新学生：${s.name}${sc.adopt ? '（采用表格非空资料）' : ''}`); }
      }
    }
  }
  if (!groups.length) errors.push('没有可导入的名单');
  return { classes: nextClasses, students: nextStudents, errors, changes, createdClasses, createdStudents, updatedStudents, updatedClasses, skipped };
}
export const rosterVersion = (classes: ClassGroup[], students: Student[]) => JSON.stringify([classes, students]);
