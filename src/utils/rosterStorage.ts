import type { ClassGroup, Student } from '../types';
import { persistItem } from './storage';
export const ROSTER_SNAPSHOT_KEY = 'training_scores_roster_atomic_v1';
export function readRosterSnapshot(): { classes: ClassGroup[]; students: Student[] } | null {
  try { const data = JSON.parse(localStorage.getItem(ROSTER_SNAPSHOT_KEY) || 'null'); return data && Array.isArray(data.classes) && Array.isArray(data.students) ? data : null; } catch { return null; }
}
// One durable write holds both collections; legacy keys remain readable by older code.
export function persistRosterSnapshot(classes: ClassGroup[], students: Student[]) {
  persistItem(ROSTER_SNAPSHOT_KEY, JSON.stringify({ classes, students }));
}
