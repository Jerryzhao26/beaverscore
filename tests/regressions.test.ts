import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { calculateStudentStats, getScorePercentage, getPercentageDelta } from '../src/utils/analysis';
import { mergeDatasets, databaseEquals, DEFAULT_GIST_FILENAME as filename, pushDataToGistWithSmartMerge, pullDataFromGist } from '../src/utils/gistSync';
import { emptyEntryRow, fillEmptyScores, restoreEntryRows, isValidScoreInput, sameExam, prepareScoreBatch, entryDraftKey, readEntryDraft } from '../src/utils/scoreEntry';
import { ScoreRecord, Student } from '../src/types';

const student = { id: 's1', name: '测试学员', classId: 'c1', currentLevel: 'BF1' } as Student;
const score = (id: string, mark = 80, maximum = 100, date = '2026-09-01', time = 1): ScoreRecord => ({
  id, studentId: 's1', studentName: '测试学员', classId: 'c1', className: '测试班', teacherName: '教师',
  examCategory: 'institutional', level: 'BF1', unit: 'U1', examTitle: 'BF1U1', examDate: date,
  score: mark, maxScore: maximum, attendance: 'present', weakPoints: [], recordedAt: `${date}T10:00:00Z`, updatedAt: time
});
const db = (records: ScoreRecord[] = []) => ({ classes: [], students: [student], scoreRecords: records, levels: [], units: [], teachers: [], weakPointCategories: [] });
const gistId = '0123456789abcdef0123456789abcdef';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function fakeGist(initial: any = db(), history = 0) {
  const files: Record<string, { content: string }> = { [filename]: { content: JSON.stringify(initial) } };
  for (let i = 0; i < history; i++) files[`${filename}.changes.old-${i}.json`] = { content: JSON.stringify(db([score(`history-${i}`)])) };
  let patches = 0;
  let getBarrier: (() => Promise<void>) | undefined;
  globalThis.fetch = (async (_url: any, options: any = {}) => {
    if (options.method === 'PATCH') {
      patches++;
      const changes = JSON.parse(options.body).files;
      for (const [name, value] of Object.entries(changes)) {
        if (value === null) delete files[name]; else files[name] = value as { content: string };
      }
      return new Response(JSON.stringify({ html_url: 'mock-gist' }), { status: 200 });
    }
    const snapshot = JSON.stringify({ files });
    if (getBarrier) await getBarrier();
    return new Response(snapshot, { status: 200 });
  }) as typeof fetch;
  return {
    files, get patches() { return patches; },
    synchronizeNextTwoReads() {
      let count = 0, release!: () => void;
      const barrier = new Promise<void>(resolve => { release = resolve; });
      getBarrier = async () => { count++; if (count === 2) { getBarrier = undefined; release(); } await barrier; };
    }
  };
}

test('different maxima use percentages; original marks are preserved', () => {
  const result = calculateStudentStats([student], [score('a', 90), score('b', 95, 150, '2026-09-02')])[0];
  assert.equal(result.latestScore, 95);
  assert.equal(result.latestMaxScore, 150);
  assert.equal(result.scoreDelta, -26.7);
  assert.equal(result.latestPercentage, 63.3);
  assert.equal(calculateStudentStats([student], [score('a', 50, 50)])[0].fullScoreCount, 1);
  assert.equal(calculateStudentStats([student], [score('a', 100, 150)])[0].fullScoreCount, 0);
});

test('invalid scores and absent/deleted records do not distort statistics', () => {
  for (const record of [score('x', 110), score('x', Infinity), score('x', -1), score('x', 80, 0)]) assert.equal(getScorePercentage(record), null);
  const result = calculateStudentStats([student], [score('valid', 120, 150), { ...score('deleted', 100), isDeleted: true }, { ...score('absent', 0), attendance: 'absent' }])[0];
  assert.equal(result.recordsCount, 1);
  assert.equal(result.minScore, 80);
});

test('progress compares only same category and level/grade', () => {
  const previous = score('a', 80), latest = { ...score('b', 90), level: 'BF2' };
  assert.equal(getPercentageDelta(latest, previous), null);
  assert.equal(calculateStudentStats([student], [previous, latest])[0].hasComparison, false);
});

test('edited and deleted existing records are detected without any new IDs', () => {
  const original = db([score('a', 80)]), remote = db([score('a', 95, 100, '2026-09-01', 2)]);
  const updated = mergeDatasets(original, remote);
  assert.equal(updated.report.incomingScoresCount, 0);
  assert.equal(updated.report.incomingScoresUpdated, 1);
  assert.equal(databaseEquals(original, updated.merged), false);
  const deleted = mergeDatasets(original, db([{ ...score('a', 80, 100, '2026-09-01', 3), isDeleted: true }])).merged;
  assert.equal(deleted.scoreRecords[0].isDeleted, true);
  assert.equal(databaseEquals(original, deleted), false);
});

test('newer dictionary re-add clocks survive an older remote clock', () => {
  const local = { ...db(), levels: ['BF1'], dictionaryAddedAt: { levels: { BF1: 300 } } };
  const remote = { ...db(), levels: ['BF1'], deletedEntities: { levels: { BF1: 200 } }, dictionaryAddedAt: { levels: { BF1: 100 } } };
  assert.deepEqual(mergeDatasets(local, remote).merged.levels, ['BF1']);
});

test('batch fill validates the range and leaves entered marks and absent rows intact', () => {
  const rows = [emptyEntryRow(student), { ...emptyEntryRow({ ...student, id: 's2' }), score: '70' }, { ...emptyEntryRow({ ...student, id: 's3' }), attendance: 'absent' as const }];
  assert.deepEqual(fillEmptyScores(rows, '85', 100).map(row => row.score), ['85', '70', '']);
  for (const input of ['110', '-1', 'Infinity', '', ' ']) {
    assert.equal(isValidScoreInput(input, 100), false);
    assert.equal(fillEmptyScores(rows, input, 100), rows);
  }
  assert.equal(isValidScoreInput('85', 50), false);
});

test('roster refresh preserves drafts by student ID and adds new blank rows', () => {
  const draft = [{ ...emptyEntryRow(student), score: '85', teacherRemark: '保留评语', attendance: 'leave' as const }];
  const restored = restoreEntryRows([{ ...student, name: '更名' }, { ...student, id: 's2' }], draft);
  assert.equal(restored[0].score, '85');
  assert.equal(restored[0].teacherRemark, '保留评语');
  assert.equal(restored[0].student.name, '更名');
  assert.equal(restored[1].score, '');
  assert.equal(restored[1].schoolGrade, '');
  assert.deepEqual(restoreEntryRows([], draft), []);
});

test('draft keys isolate classes/categories and reload reads persisted input', () => {
  const store = new Map<string, string>();
  const previous = globalThis.localStorage;
  globalThis.localStorage = { getItem: (key: string) => store.get(key) ?? null } as Storage;
  try {
    const first = entryDraftKey('c1', 'institutional'), second = entryDraftKey('c2', 'institutional');
    store.set(first, JSON.stringify({ rows: [{ ...emptyEntryRow(student), score: '80' }] }));
    assert.equal(readEntryDraft(first).rows[0].score, '80');
    assert.equal(readEntryDraft(second), null);
    assert.equal(readEntryDraft(entryDraftKey('c1', 'public_school')), null);
    store.set(second, 'corrupt'); assert.equal(readEntryDraft(second), null);
  } finally { globalThis.localStorage = previous; }
});

test('duplicates require explicit choice; update keeps ID, retest creates a new ID', () => {
  const original = score('existing');
  assert.equal(sameExam(original, { ...original, maxScore: 150 }), true);
  assert.throws(() => prepareScoreBatch([original], [original]), /已有记录/);
  const updated = prepareScoreBatch([{ ...original, score: 90 }], [original], { duplicateMode: 'update' }, 1)[0];
  assert.equal(updated.id, original.id); assert.equal(updated.score, 90); assert.ok(updated.updatedAt! > original.updatedAt!);
  const retest = prepareScoreBatch([original], [original], { duplicateMode: 'retest' })[0];
  assert.notEqual(retest.id, original.id);
  assert.throws(() => prepareScoreBatch([score('invalid', 110)], []), /无效/);
});

test('failed cloud read stops all writes and cannot report success', async () => {
  let patches = 0;
  globalThis.fetch = (async (_url: any, options: any = {}) => { if (options.method === 'PATCH') patches++; return new Response('{"message":"temporary failure"}', { status: 500 }); }) as typeof fetch;
  const result = await pushDataToGistWithSmartMerge('mock-token', gistId, db([score('local')]));
  assert.equal(result.success, false); assert.equal(patches, 0);
});

test('two simultaneous teachers retain both submissions after another pull', async () => {
  const mock = fakeGist(); mock.synchronizeNextTwoReads();
  const results = await Promise.all([
    pushDataToGistWithSmartMerge('mock-token', gistId, db([score('teacher-a')])),
    pushDataToGistWithSmartMerge('mock-token', gistId, db([score('teacher-b')]))
  ]);
  assert.ok(results.every(result => result.success));
  const pulled = await pullDataFromGist('mock-token', gistId);
  assert.deepEqual(pulled.data.scoreRecords.map((record: ScoreRecord) => record.id).sort(), ['teacher-a', 'teacher-b']);
  assert.equal(JSON.parse(mock.files[filename].content).scoreRecords.length, 0);
});

test('concurrent history compaction retains old records and both new submissions', async () => {
  const mock = fakeGist(db(), 50); mock.synchronizeNextTwoReads();
  const results = await Promise.all([
    pushDataToGistWithSmartMerge('mock-token', gistId, db([score('new-a')])),
    pushDataToGistWithSmartMerge('mock-token', gistId, db([score('new-b')]))
  ]);
  assert.ok(results.every(result => result.success));
  const pulled = await pullDataFromGist('mock-token', gistId);
  assert.equal(pulled.data.scoreRecords.length, 52);
  assert.equal(Object.keys(mock.files).length, 3); // base + two immutable checkpoints
});

test('local-only scores are excluded automatically and released by explicit upload', async () => {
  const mock = fakeGist();
  const local = db([{ ...score('held'), localOnly: true }]);
  const auto = await pushDataToGistWithSmartMerge('mock-token', gistId, local);
  assert.equal(auto.success, true); assert.equal(mock.patches, 0);
  assert.equal(auto.data.scoreRecords[0].localOnly, true);
  const manual = await pushDataToGistWithSmartMerge('mock-token', gistId, local, filename, true);
  assert.equal(manual.success, true);
  const pulled = await pullDataFromGist('mock-token', gistId);
  assert.equal(pulled.data.scoreRecords[0].id, 'held'); assert.equal(pulled.data.scoreRecords[0].localOnly, false);
});

test('record order differences do not create endless automatic uploads', async () => {
  const mock = fakeGist(db([score('a'), score('b')]));
  const result = await pushDataToGistWithSmartMerge('mock-token', gistId, db([score('b'), score('a')]));
  assert.equal(result.success, true); assert.equal(mock.patches, 0);
});

test('incomplete file lists and unreadable journals stop sync', async () => {
  for (const payload of [
    { files: { [filename]: { content: JSON.stringify(db()) } }, truncated: true },
    { files: { [filename]: { content: JSON.stringify(db()) }, [`${filename}.changes.bad.json`]: { content: 'broken JSON' } } }
  ]) {
    let patches = 0;
    globalThis.fetch = (async (_url: any, options: any = {}) => { if (options.method === 'PATCH') patches++; return new Response(JSON.stringify(payload)); }) as typeof fetch;
    assert.equal((await pushDataToGistWithSmartMerge('mock-token', gistId, db([score('a')]))).success, false);
    assert.equal(patches, 0);
  }
});
