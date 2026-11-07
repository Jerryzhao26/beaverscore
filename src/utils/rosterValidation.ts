export function assertUniqueRosterField(items: { id: string; isDeleted?: boolean; name?: string; studentNo?: string }[], field: 'name' | 'studentNo', value: unknown, id?: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(field === 'name' ? '班级名称不能为空' : '学号不能为空');
  if (field === 'name') return; // Class identity is its ID; different teachers/terms may share a name.
  if (items.some(item => !item.isDeleted && item.id !== id && String(item[field] ?? '').trim() === value.trim())) throw new Error(`学号重复：${value.trim()}`);
}
