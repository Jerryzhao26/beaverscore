export function assertUniqueRosterField(items: { id: string; isDeleted?: boolean; name?: string; studentNo?: string }[], field: 'name' | 'studentNo', value: unknown, id?: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(field === 'name' ? '班级名称不能为空' : '学号不能为空');
  if (items.some(item => !item.isDeleted && item.id !== id && String(item[field] ?? '').trim() === value.trim())) throw new Error(`${field === 'name' ? '班级名称' : '学号'}重复：${value.trim()}`);
}
