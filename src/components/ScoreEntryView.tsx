import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ScoreRecord, Student } from '../types';
import { normalizeExamCategory, getExamDateTimestamp, compareScoreRecordsByExamDateAsc, formatExamTitle } from '../utils/analysis';
import { PUBLIC_SCHOOL_GRADES, PUBLIC_SCHOOL_EXAM_UNITS } from '../data/initialData';
import confetti from 'canvas-confetti';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  Calendar,
  GraduationCap,
  Layers,
  ChevronDown,
  ChevronUp,
  Tag,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Building2,
  School,
  Database,
  RefreshCw,
  ShieldCheck,
  Key,
  UploadCloud,
  Save,
  Clock,
  ExternalLink
} from 'lucide-react';

interface EntryRowState {
  student: Student;
  schoolGrade: string;
  score: string;
  attendance: 'present' | 'absent' | 'leave';
  weakPoints: string[];
  mistakeDetails: string;
  teacherRemark: string;
  isExpanded: boolean;
}

export const ScoreEntryView: React.FC<{ onNavigateToQuery?: () => void; onNavigateToRanking?: () => void }> = ({
  onNavigateToQuery,
  onNavigateToRanking
}) => {
  const {
    classes,
    students,
    scoreRecords,
    levels,
    units,
    teachers,
    weakPointCategories,
    addScoreBatchAndSync,
    gistConfig,
    isSyncingGist,
    openGistConfigModal,
    manualRefreshFromCloud
  } = useApp();

  const [examCategory, setExamCategory] = useState<'institutional' | 'public_school'>('institutional');
  const [selectedClassId, setSelectedClassId] = useState<string>(() => classes?.[0]?.id || '');
  const [selectedLevel, setSelectedLevel] = useState<string>('BF1');
  const [selectedUnit, setSelectedUnit] = useState<string>('U1 (Unit 1)');
  const [examDate, setExamDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [maxScore, setMaxScore] = useState<number>(100);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [isRefreshingCloud, setIsRefreshingCloud] = useState<boolean>(false);

  const [toastMessage, setToastMessage] = useState<{ text: string; type?: 'success' | 'info' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const [rows, setRows] = useState<EntryRowState[]>([]);
  const [batchDefaultScore, setBatchDefaultScore] = useState<string>('85');
  const [batchDefaultGrade, setBatchDefaultGrade] = useState<string>('三上');
  const [savedSuccessModal, setSavedSuccessModal] = useState<{
    count: number;
    scoredCount: number;
    absentCount: number;
    skippedCount: number;
    avg: number;
    highest: { name: string; score: number } | null;
    category: 'institutional' | 'public_school';
    cloudSyncResult?: {
      cloudSynced: boolean;
      cloudMessage: string;
      incomingCount?: number;
      totalRecordsCount?: number;
    };
  } | null>(null);

  const [activeTagPickerIndex, setActiveTagPickerIndex] = useState<number | null>(null);
  const [customTagInput, setCustomTagInput] = useState<string>('');

  const isCloudConnected = Boolean(gistConfig.gistId && gistConfig.token);

  const handleManualRefreshCloud = async () => {
    if (!gistConfig.gistId) {
      openGistConfigModal();
      return;
    }
    setIsRefreshingCloud(true);
    const res = await manualRefreshFromCloud();
    setIsRefreshingCloud(false);
    if (res.success) {
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
  };

  useEffect(() => {
    const currentCls = (classes || []).find(c => c.id === selectedClassId);
    if (currentCls) {
      setSelectedLevel(currentCls.level || levels?.[0] || 'BF1');
      setSelectedTeacher(currentCls.teacherName || teachers?.[0] || '');
      if (examCategory === 'public_school') {
        setSelectedUnit(prev => (PUBLIC_SCHOOL_EXAM_UNITS.includes(prev) ? prev : PUBLIC_SCHOOL_EXAM_UNITS[0]));
      } else {
        setSelectedUnit(prev => (units.includes(prev) ? prev : (units[0] || 'U1 (Unit 1)')));
      }
    }
  }, [selectedClassId, classes, examCategory]);

  useEffect(() => {
    if (!selectedClassId) {
      if (classes?.length > 0) {
        setSelectedClassId(classes[0].id);
      }
      return;
    }
    const classStudents = (students || []).filter(s => s.classId === selectedClassId && s.status !== 'suspended');

    const initialRows: EntryRowState[] = classStudents.map(student => ({
      student,
      schoolGrade: student.schoolGrade || '三上',
      score: '',
      attendance: 'present',
      weakPoints: [],
      mistakeDetails: '',
      teacherRemark: '',
      isExpanded: false
    }));

    setRows(initialRows);
  }, [selectedClassId, students, classes]);

  const getStudentPreviousScore = (studentId: string) => {
    const currentExamTs = getExamDateTimestamp(examDate) || Date.now();
    const records = (scoreRecords || [])
      .filter(
        r =>
          r &&
          r.studentId === studentId &&
          r.attendance === 'present' &&
          typeof r.score === 'number' &&
          !isNaN(r.score) &&
          normalizeExamCategory(r.examCategory) === examCategory
      )
      .sort(compareScoreRecordsByExamDateAsc);

    const priorRecords = records.filter(r => getExamDateTimestamp(r.examDate) < currentExamTs);
    if (priorRecords.length > 0) {
      return priorRecords[priorRecords.length - 1];
    }

    const sameDateRecords = records.filter(r => getExamDateTimestamp(r.examDate) === currentExamTs);
    if (sameDateRecords.length > 0) {
      return sameDateRecords[sameDateRecords.length - 1];
    }

    return null;
  };

  const handleRowScoreChange = (index: number, val: string) => {
    const updated = [...rows];
    if (val === '' || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= maxScore)) {
      updated[index].score = val;
      setRows(updated);
    }
  };

  const handleRowSchoolGradeChange = (index: number, grade: string) => {
    const updated = [...rows];
    updated[index].schoolGrade = grade;
    setRows(updated);
  };

  const handleRowAttendanceChange = (index: number, att: 'present' | 'absent' | 'leave') => {
    const updated = [...rows];
    updated[index].attendance = att;
    if (att !== 'present') {
      updated[index].score = '';
    }
    setRows(updated);
  };

  const toggleWeakPointTag = (rowIndex: number, tag: string) => {
    const updated = [...rows];
    const currentTags = updated[rowIndex].weakPoints;
    if (currentTags.includes(tag)) {
      updated[rowIndex].weakPoints = currentTags.filter(t => t !== tag);
    } else {
      updated[rowIndex].weakPoints = [...currentTags, tag];
    }
    setRows(updated);
  };

  const handleAddCustomTag = (rowIndex: number) => {
    if (!customTagInput.trim()) return;
    toggleWeakPointTag(rowIndex, customTagInput.trim());
    setCustomTagInput('');
  };

  const toggleRowExpand = (index: number) => {
    const updated = [...rows];
    updated[index].isExpanded = !updated[index].isExpanded;
    setRows(updated);
  };

  const handleBatchFillScores = () => {
    if (isNaN(Number(batchDefaultScore))) return;
    const updated = rows.map(r => ({
      ...r,
      score: r.attendance === 'present' ? batchDefaultScore : r.score
    }));
    setRows(updated);
    showToast(`已为所有出考学生预填参考分 ${batchDefaultScore} 分`, 'info');
  };

  const handleBatchFillSchoolGrade = () => {
    if (!batchDefaultGrade) return;
    const updated = rows.map(r => ({
      ...r,
      schoolGrade: batchDefaultGrade
    }));
    setRows(updated);
    showToast(`已一键将全班学员的公校年级设为【${batchDefaultGrade}】`, 'success');
  };

  const handleSaveScoreBatch = async (syncToCloud: boolean = true) => {
    if (!selectedClassId) {
      showToast('请先选择需要录入成绩的班级', 'error');
      return;
    }

    if (rows.length === 0) {
      showToast('所选班级暂无学生名单，请先在【班级与学员管理】中添加学员', 'error');
      return;
    }

    const actionableRows = rows.filter(
      r => r.attendance !== 'present' || (r.score.trim() !== '' && !isNaN(Number(r.score)))
    );

    if (actionableRows.length === 0) {
      showToast('请至少为一位学员录入本次测验成绩，或标记缺考/请假状态。若全员留空则不会保存任何记录。', 'error');
      return;
    }

    const currentCls = classes.find(c => c.id === selectedClassId);
    const className = currentCls?.name || '未知班级';
    const batchId = `batch_${Date.now()}`;

    const newRecords: Omit<ScoreRecord, 'id' | 'recordedAt'>[] = actionableRows.map(r => {
      const studentGrade = r.schoolGrade || r.student.schoolGrade || '三上';
      const recordLevel = examCategory === 'public_school' ? studentGrade : selectedLevel;
      const computedTitle = formatExamTitle({
        examCategory,
        level: selectedLevel,
        unit: selectedUnit,
        schoolGrade: studentGrade
      });

      return {
        classId: selectedClassId,
        className,
        studentId: r.student.id,
        studentName: r.student.name,
        teacherName: selectedTeacher || '主讲教师',
        examCategory,
        level: recordLevel,
        schoolGrade: examCategory === 'public_school' ? studentGrade : undefined,
        unit: selectedUnit,
        examTitle: computedTitle,
        examDate,
        maxScore,
        score: r.attendance === 'present' ? Number(r.score) : null,
        attendance: r.attendance,
        weakPoints: r.weakPoints,
        mistakeDetails: r.mistakeDetails,
        teacherRemark: r.teacherRemark,
        batchId
      };
    });

    const syncResult = await addScoreBatchAndSync(newRecords, {
      syncToCloud,
      teacherName: selectedTeacher || gistConfig.teacherName
    });

    const presentScores = newRecords
      .filter(r => r.attendance === 'present' && typeof r.score === 'number' && !isNaN(r.score))
      .map(r => r.score as number);
    const avg = presentScores.length > 0
      ? Math.round((presentScores.reduce((a, b) => a + b, 0) / presentScores.length) * 10) / 10
      : 0;
    const highestScore = presentScores.length > 0 ? Math.max(...presentScores) : 0;
    const topStudent = newRecords.find(r => r.score === highestScore);
    const scoredCount = presentScores.length;
    const absentCount = newRecords.filter(r => r.attendance !== 'present').length;
    const skippedCount = rows.length - newRecords.length;

    if (avg >= 85 || highestScore >= 95) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}
    }

    setSavedSuccessModal({
      count: newRecords.length,
      scoredCount,
      absentCount,
      skippedCount,
      avg,
      highest: topStudent && typeof topStudent.score === 'number' ? { name: topStudent.studentName, score: topStudent.score } : null,
      category: examCategory,
      cloudSyncResult: {
        cloudSynced: syncResult.cloudSynced,
        cloudMessage: syncResult.cloudMessage,
        incomingCount: syncResult.mergeReport?.incomingScoresCount || 0,
        totalRecordsCount: syncResult.totalRecordsCount
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveScoreBatch(isCloudConnected);
  };

  const handleResetForm = () => {
    setSavedSuccessModal(null);
    setRows(prev =>
      prev.map(r => ({
        ...r,
        score: '',
        weakPoints: [],
        mistakeDetails: '',
        teacherRemark: '',
        isExpanded: false
      }))
    );
    showToast('已清空重置当前录入表单的所有成绩与标记！', 'info');
  };

  return (
    <div className="space-y-5">
      {/* Top Cloud Collaboration Status Bar */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg shrink-0 ${
            isCloudConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
          }`}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                isCloudConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {isCloudConnected ? 'GitHub Gist 私有云已连接' : '本地单机模式 (未配置云端)'}
              </span>
              {isCloudConnected && (
                <span className="text-xs font-mono text-slate-500 hidden md:inline">
                  ID: {gistConfig.gistId.slice(0, 10)}...
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isCloudConnected ? (
                <>
                  每次录入后点击保存即会自动将数据加密上传并合并至云端；如需查看同事刚录入的班级，点击右侧
                  <strong className="text-indigo-600 font-semibold">【刷新云端】</strong>即可。
                </>
              ) : (
                '当前成绩仅保存在当前浏览器本地。建议点击右侧【配置云端】绑定私有 Gist，实现跨设备多教师协同。'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={handleManualRefreshCloud}
            disabled={isRefreshingCloud || isSyncingGist}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center transition cursor-pointer"
            title="从云端获取同事录入的最新班级成绩"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshingCloud || isSyncingGist ? 'animate-spin text-indigo-600' : ''}`} />
            {isRefreshingCloud ? '正在刷新...' : '刷新云端数据'}
          </button>

          <button
            type="button"
            onClick={openGistConfigModal}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center transition cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 mr-1 text-indigo-600" />
            {isCloudConnected ? '云端协同设置' : '一键配置云端'}
          </button>
        </div>
      </div>

      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-sm animate-in fade-in slide-in-from-top-2 duration-150 ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : toastMessage.type === 'info'
              ? 'bg-sky-50 text-sky-800 border-sky-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Title Bar with Instructions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                测验成绩登记与快速入库
              </h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              支持分别录入<strong className="text-indigo-600 font-semibold">【机构测试】</strong>与<strong className="text-emerald-600 font-semibold">【公校考试】</strong>两类成绩，公校成绩支持同班学生各自独立选择在读年级（一上至初三下）。
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">当前班级应考:</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
              {rows.length} 名学员
            </span>
          </div>
        </div>

        {/* 考试类别选择器 */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
            <Tag className="w-3.5 h-3.5 mr-1 text-indigo-600" />
            第一步：选择考试类别（公校与机构数据将严格独立比对）*
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              id="btn-category-institutional"
              onClick={() => {
                setExamCategory('institutional');
                setSelectedUnit(units[0] || 'U1 (Unit 1)');
              }}
              className={`p-3.5 rounded-xl border text-left flex items-start space-x-3 transition cursor-pointer ${
                examCategory === 'institutional'
                  ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${
                examCategory === 'institutional' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <Building2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${
                    examCategory === 'institutional' ? 'text-indigo-950' : 'text-slate-800'
                  }`}>
                    🏢 机构内部测试
                  </span>
                  {examCategory === 'institutional' && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-600 text-white">
                      当前选中
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  培训机构内部单元测验、级别关卡考评（如 BF1、E2），全班统一考项，仅与机构内历史测验比对进退步。
                </p>
              </div>
            </button>

            <button
              type="button"
              id="btn-category-public-school"
              onClick={() => {
                setExamCategory('public_school');
                setSelectedUnit(PUBLIC_SCHOOL_EXAM_UNITS[0] || '期中考试');
              }}
              className={`p-3.5 rounded-xl border text-left flex items-start space-x-3 transition cursor-pointer ${
                examCategory === 'public_school'
                  ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${
                examCategory === 'public_school' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <School className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${
                    examCategory === 'public_school' ? 'text-emerald-950' : 'text-slate-800'
                  }`}>
                    🏫 公立学校考试（支持跨年级）
                  </span>
                  {examCategory === 'public_school' && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white">
                      当前选中
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  公立学校期中/期末/月考。<strong>同班学员在公校可能分属不同年级（如一上、一下至初一上）</strong>，支持针对每个孩子分别指定公校年级！
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Form Exam Dimensions Config */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center">
              <GraduationCap className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              1. 考核班级 *
            </label>
            <select
              id="select-class-entry"
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition cursor-pointer"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.level} · {c.teacherName})
                </option>
              ))}
            </select>
          </div>

          {examCategory === 'institutional' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center">
                <Layers className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                2. 机构考核级别 (Level) *
              </label>
              <select
                id="select-level-entry"
                value={selectedLevel}
                onChange={e => setSelectedLevel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition cursor-pointer"
              >
                {levels.map(lvl => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1.5 flex items-center">
                <School className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                2. 公校年级设置模式
              </label>
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg px-3 py-1.5 text-xs text-emerald-900 flex items-center justify-between">
                <span className="font-semibold">按学员独立分配年级</span>
                <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">
                  一上 ~ 初三下
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                下方表格已为每位学员单独配置公校年级列
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center">
              <BookOpen className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              {examCategory === 'public_school' ? '3. 公校考核考项/大考类型 *' : '3. 机构考核单元/考项 *'}
            </label>
            <select
              id="select-unit-entry"
              value={selectedUnit}
              onChange={e => setSelectedUnit(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition cursor-pointer"
            >
              {examCategory === 'public_school' ? (
                PUBLIC_SCHOOL_EXAM_UNITS.map(u => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))
              ) : (
                units.map(u => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              4. 测验日期与执考教师
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                id="input-exam-date"
                value={examDate}
                onChange={e => setExamDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
              <select
                id="select-teacher-entry"
                value={selectedTeacher}
                onChange={e => setSelectedTeacher(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white cursor-pointer"
              >
                {teachers.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 font-medium">测验标识生成规则:</span>
            {examCategory === 'public_school' ? (
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                <School className="w-3.5 h-3.5 text-emerald-600" />
                <span>公校测试 · 年级 + 考项类型（如：四上{selectedUnit}）</span>
              </div>
            ) : (
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-800 font-semibold border border-indigo-200">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>机构测试 · 级别 + 单元（当前生成：{formatExamTitle({ examCategory: 'institutional', level: selectedLevel, unit: selectedUnit })}）</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <span className="text-slate-500 font-medium">满分标准:</span>
            <select
              value={maxScore}
              onChange={e => setMaxScore(Number(e.target.value))}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value={100}>100 分制</option>
              <option value={120}>120 分制</option>
              <option value={150}>150 分制</option>
              <option value={50}>50 分制</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Batch Toolkit Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-slate-700 flex items-center">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
            快速辅助工具:
          </span>

          <div className="flex items-center space-x-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-slate-500">预填分数:</span>
            <input
              type="number"
              value={batchDefaultScore}
              onChange={e => setBatchDefaultScore(e.target.value)}
              className="w-14 px-1.5 py-0.5 bg-slate-50 border border-slate-300 rounded text-center font-medium"
              placeholder="85"
            />
            <button
              type="button"
              id="btn-batch-fill-score"
              onClick={handleBatchFillScores}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-700 font-medium transition cursor-pointer"
            >
              一键应用
            </button>
          </div>

          {examCategory === 'public_school' && (
            <div className="flex items-center space-x-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
              <School className="w-3.5 h-3.5 text-emerald-700" />
              <span className="text-emerald-800 font-semibold">批量统设公校年级:</span>
              <select
                value={batchDefaultGrade}
                onChange={e => setBatchDefaultGrade(e.target.value)}
                className="px-2 py-0.5 bg-white border border-emerald-300 rounded text-emerald-900 font-bold cursor-pointer"
              >
                {PUBLIC_SCHOOL_GRADES.map(g => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <button
                type="button"
                id="btn-batch-fill-grade"
                onClick={handleBatchFillSchoolGrade}
                className="px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium transition cursor-pointer shadow-2xs"
              >
                一键设为全班年级
              </button>
            </div>
          )}
        </div>

        <div className="text-slate-500 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs">
          <span>💡 <strong>录入规则</strong>：得分留空<strong>不生成记录</strong>；标记缺考/请假<strong>生成缺考档案（不计分）</strong>。</span>
        </div>
      </div>

      {/* Main Student Score Entry Form Matrix */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {rows.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
            <AlertCircle className="w-10 h-10 mx-auto text-amber-500 mb-3" />
            <h3 className="text-base font-semibold text-slate-800">当前班级暂无学生</h3>
            <p className="text-sm text-slate-500 mt-1">
              请切换其他班级，或点击顶部【班级与学员管理】为该班添加学生名单。
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-3 w-10 text-center">序号</th>
                    <th className="py-3 px-3 w-40">学员姓名 / 学号</th>
                    {examCategory === 'public_school' && (
                      <th className="py-3 px-3 w-36 text-emerald-800">
                        <div className="flex items-center space-x-1">
                          <School className="w-3.5 h-3.5 text-emerald-600" />
                          <span>公校在读年级</span>
                        </div>
                      </th>
                    )}
                    <th className="py-3 px-3 w-32">出考状态</th>
                    <th className="py-3 px-3 w-40">本次得分 (分)</th>
                    <th className="py-3 px-3 w-48">
                      <div className="flex items-center space-x-1">
                        <span>上次{examCategory === 'public_school' ? '公校' : '机构'}对比</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                          examCategory === 'public_school' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {examCategory === 'public_school' ? '按考试日期比对' : '同机构比对'}
                        </span>
                      </div>
                    </th>
                    <th className="py-3 px-4">薄弱项 & 失分标签</th>
                    <th className="py-3 px-4 w-28 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {rows.map((row, idx) => {
                    const prevRecord = getStudentPreviousScore(row.student.id);
                    const currentScoreNum = row.attendance === 'present' && row.score !== '' ? Number(row.score) : null;
                    const delta = currentScoreNum !== null && prevRecord && typeof prevRecord.score === 'number'
                      ? currentScoreNum - prevRecord.score
                      : null;

                    let scoreBadgeColor = 'border-slate-300 focus:ring-indigo-500';
                    if (currentScoreNum !== null) {
                      if (currentScoreNum >= 90) scoreBadgeColor = 'border-emerald-400 bg-emerald-50/30 text-emerald-900 font-bold';
                      else if (currentScoreNum >= 80) scoreBadgeColor = 'border-blue-400 bg-blue-50/30 text-blue-900 font-semibold';
                      else if (currentScoreNum >= 60) scoreBadgeColor = 'border-amber-400 bg-amber-50/30 text-amber-900';
                      else scoreBadgeColor = 'border-rose-400 bg-rose-50/30 text-rose-900 font-bold';
                    }

                    return (
                      <React.Fragment key={row.student.id}>
                        <tr className={`hover:bg-slate-50/60 transition ${row.isExpanded ? 'bg-indigo-50/20' : ''}`}>
                          <td className="py-3 px-3 text-center text-xs font-medium text-slate-400">
                            {idx + 1}
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0">
                                {row.student.name.slice(0, 1)}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 flex items-center space-x-1.5">
                                  <span>{row.student.name}</span>
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                                    row.student.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {row.student.gender === 'female' ? '女' : '男'}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-400">
                                  {row.student.studentNo || `ID: ${row.student.id.slice(-4)}`}
                                </div>
                              </div>
                            </div>
                          </td>

                          {examCategory === 'public_school' && (
                            <td className="py-3 px-3">
                              <div className="flex items-center space-x-1">
                                <select
                                  id={`select-grade-${row.student.id}`}
                                  value={row.schoolGrade}
                                  onChange={e => handleRowSchoolGradeChange(idx, e.target.value)}
                                  className="text-xs font-bold px-2 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs hover:bg-emerald-100/70 transition"
                                >
                                  {PUBLIC_SCHOOL_GRADES.map(g => (
                                    <option key={g} value={g}>
                                      {g}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                          )}

                          <td className="py-3 px-3">
                            <select
                              value={row.attendance}
                              onChange={e => handleRowAttendanceChange(idx, e.target.value as any)}
                              className={`text-xs font-medium px-2 py-1.5 rounded-md border focus:outline-none cursor-pointer ${
                                row.attendance === 'present'
                                  ? 'border-slate-200 bg-white text-slate-700'
                                  : row.attendance === 'leave'
                                  ? 'border-amber-300 bg-amber-50 text-amber-800 font-semibold'
                                  : 'border-rose-300 bg-rose-50 text-rose-800 font-semibold'
                              }`}
                            >
                              <option value="present">正常出席</option>
                              <option value="leave">请假 (不计分)</option>
                              <option value="absent">缺考 (不计分)</option>
                            </select>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex flex-col">
                              <div className="relative flex items-center">
                                <input
                                  type="text"
                                  id={`input-score-${row.student.id}`}
                                  disabled={row.attendance !== 'present'}
                                  value={row.attendance === 'present' ? row.score : ''}
                                  onChange={e => handleRowScoreChange(idx, e.target.value)}
                                  placeholder={
                                    row.attendance === 'absent'
                                      ? '缺考(无分)'
                                      : row.attendance === 'leave'
                                      ? '请假(无分)'
                                      : '留空不保存'
                                  }
                                  className={`w-28 px-3 py-1.5 rounded-lg border text-sm text-center font-mono ${scoreBadgeColor} disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2`}
                                />
                                {row.attendance === 'present' && (
                                  <span className="ml-1.5 text-xs text-slate-400 font-medium">分</span>
                                )}
                              </div>
                              <div className="mt-1 text-[11px]">
                                {row.attendance !== 'present' ? (
                                  <span className="text-amber-600 font-medium">
                                    {row.attendance === 'absent' ? '📋 生成缺考档案' : '📋 生成请假档案'}
                                  </span>
                                ) : row.score.trim() === '' ? (
                                  <span className="text-slate-400">⚡ 留空本次不保存</span>
                                ) : (
                                  <span className="text-emerald-600 font-medium">✓ 录入 {row.score} 分</span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            {prevRecord && typeof prevRecord.score === 'number' ? (
                              <div className="text-xs">
                                <div className="text-slate-600 flex items-center gap-1 flex-wrap">
                                  <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                                    examCategory === 'public_school' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                                  }`}>
                                    {prevRecord.level}
                                  </span>
                                  <span>{prevRecord.unit}:</span>
                                  <strong className="text-slate-800">{prevRecord.score}分</strong>
                                </div>
                                {delta !== null && (
                                  <div className="mt-0.5 flex items-center font-semibold">
                                    {delta > 0 ? (
                                      <span className="text-emerald-600 flex items-center">
                                        <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                                        提升 +{delta} 分
                                      </span>
                                    ) : delta < 0 ? (
                                      <span className="text-rose-600 flex items-center">
                                        <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                                        下滑 {delta} 分
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 flex items-center">
                                        <Minus className="w-3 h-3 mr-0.5" />
                                        保持持平
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">首次参评</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {(row.weakPoints || []).map(tag => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/60"
                                >
                                  {tag}
                                  <button
                                    type="button"
                                    onClick={() => toggleWeakPointTag(idx, tag)}
                                    className="ml-1 text-amber-500 hover:text-amber-800 cursor-pointer"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}

                              <button
                                type="button"
                                id={`btn-add-tag-${row.student.id}`}
                                onClick={() => setActiveTagPickerIndex(activeTagPickerIndex === idx ? null : idx)}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition cursor-pointer"
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                {(row.weakPoints || []).length === 0 ? '+ 标记失分点' : '+ 添加'}
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => toggleRowExpand(idx)}
                              className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800 py-1 px-2 rounded hover:bg-indigo-50 transition cursor-pointer"
                            >
                              {row.isExpanded ? (
                                <>
                                  收起 <ChevronUp className="w-3.5 h-3.5 ml-1" />
                                </>
                              ) : (
                                <>
                                  展开评析 <ChevronDown className="w-3.5 h-3.5 ml-1" />
                                </>
                              )}
                            </button>
                          </td>
                        </tr>

                        {row.isExpanded && (
                          <tr className="bg-indigo-50/30 border-b border-indigo-100/60">
                            <td colSpan={examCategory === 'public_school' ? 8 : 7} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-3.5 rounded-lg border border-indigo-100 shadow-2xs">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    📝 失分点具体描述 (如具体题目、失分原因、混淆概念)
                                  </label>
                                  <textarea
                                    value={row.mistakeDetails || ''}
                                    onChange={e => {
                                       const updated = [...rows];
                                       updated[idx].mistakeDetails = e.target.value;
                                       setRows(updated);
                                    }}
                                    rows={2}
                                    placeholder="例如：单项选择第4题现在完成时与过去时混淆；阅读推断题漏看not；作文句子缺连词。"
                                    className="w-full p-2 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 text-slate-800"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    💡 针对性辅导建议与评语 (反馈给家长与学员)
                                  </label>
                                  <textarea
                                    value={row.teacherRemark || ''}
                                    onChange={e => {
                                       const updated = [...rows];
                                       updated[idx].teacherRemark = e.target.value;
                                       setRows(updated);
                                    }}
                                    rows={2}
                                    placeholder="例如：本次词汇掌握扎实，需多注意审题习惯；建议每天安排10分钟阅读训练。"
                                    className="w-full p-2 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 text-slate-800"
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions Bar */}
            {(() => {
              const scoredCount = rows.filter(r => r.attendance === 'present' && r.score.trim() !== '').length;
              const absentCount = rows.filter(r => r.attendance !== 'present').length;
              const skippedCount = rows.filter(r => r.attendance === 'present' && r.score.trim() === '').length;
              const willSaveTotal = scoredCount + absentCount;

              return (
                <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                    <div className="flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>已录入分数: <strong className="text-emerald-700 font-bold">{scoredCount}</strong> 人</span>
                    </div>
                    {absentCount > 0 && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-medium">
                        缺考/请假: {absentCount} 人
                      </span>
                    )}
                    {skippedCount > 0 && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-full">
                        留空跳过: {skippedCount} 人
                      </span>
                    )}
                    <span className="text-slate-400">
                      (本次将保存 <strong>{willSaveTotal}</strong> 条档案)
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    >
                      清空重置
                    </button>

                    {isCloudConnected && (
                      <button
                        type="button"
                        onClick={() => handleSaveScoreBatch(false)}
                        disabled={willSaveTotal === 0 || isSyncingGist}
                        className="px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-medium text-xs rounded-lg transition flex items-center cursor-pointer"
                        title="仅保存在当前电脑浏览器，不上载至云端"
                      >
                        <Save className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        仅存本地
                      </button>
                    )}

                    <button
                      type="button"
                      id="btn-submit-score-batch"
                      onClick={() => handleSaveScoreBatch(isCloudConnected)}
                      disabled={willSaveTotal === 0 || isSyncingGist}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm rounded-lg shadow-sm hover:shadow transition flex items-center cursor-pointer"
                    >
                      {isSyncingGist ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                          正在合并并同步至云端...
                        </>
                      ) : isCloudConnected ? (
                        <>
                          <UploadCloud className="w-4 h-4 mr-1.5" />
                          确认归档并同步至云端 ({willSaveTotal}人)
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                          确认归档入库 ({willSaveTotal}人)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </form>

      {/* Floating Tag Picker Drawer/Modal */}
      {activeTagPickerIndex !== null && rows[activeTagPickerIndex] && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center">
                  <Tag className="w-4 h-4 mr-1.5 text-indigo-600" />
                  为【{rows[activeTagPickerIndex].student.name}】选择失分/薄弱点标签
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  点击快速勾选，支持多选，便于系统生成学情统计和针对性弱项雷达
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTagPickerIndex(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="py-4 space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              {(weakPointCategories || []).map(cat => (
                <div key={cat.category} className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-500 tracking-wider">
                    {cat.category}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(cat.tags || []).map(t => {
                      const isSelected = (rows[activeTagPickerIndex]?.weakPoints || []).includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleWeakPointTag(activeTagPickerIndex, t)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isSelected && '✓ '}
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  自定义新增失分点标签:
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={e => setCustomTagInput(e.target.value)}
                    placeholder="输入个性化失分点，如：第3单元听力口音不适应"
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTag(activeTagPickerIndex);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCustomTag(activeTagPickerIndex)}
                    className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-900 transition cursor-pointer"
                  >
                    添加并应用
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
              <span className="text-xs text-slate-500">
                已选中 <strong className="text-indigo-600">{(rows[activeTagPickerIndex]?.weakPoints || []).length}</strong> 个标签
              </span>
              <button
                type="button"
                onClick={() => setActiveTagPickerIndex(null)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
              >
                完成选择
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal with Cloud Sync Receipt */}
      {savedSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 text-center shadow-xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Award className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 flex items-center justify-center gap-2">
              <span>🎉 成绩登记与归档成功！</span>
            </h3>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                savedSuccessModal.category === 'public_school' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
              }`}>
                {savedSuccessModal.category === 'public_school' ? '🏫 公立学校考试' : '🏢 机构内部测试'}
              </span>
              <span className="text-xs text-slate-500">已独立存入档案库</span>
            </div>

            {/* Performance Summary */}
            <div className="bg-slate-50 rounded-xl p-4 my-3.5 border border-slate-100 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-xs text-slate-400">本次归档</div>
                  <div className="text-lg font-bold text-slate-800">{savedSuccessModal.count} 条</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">实考平均分</div>
                  <div className="text-lg font-bold text-indigo-600">
                    {savedSuccessModal.scoredCount > 0 ? `${savedSuccessModal.avg}分` : '无实考'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">最高分</div>
                  <div className="text-lg font-bold text-amber-600">
                    {savedSuccessModal.highest ? `${savedSuccessModal.highest.score}分` : '-'}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500 px-1">
                <span>实考录分: <strong className="text-emerald-700">{savedSuccessModal.scoredCount}</strong> 人</span>
                {savedSuccessModal.absentCount > 0 && (
                  <span>缺考/请假: <strong className="text-amber-700">{savedSuccessModal.absentCount}</strong> 人 (不计分)</span>
                )}
                {savedSuccessModal.skippedCount > 0 && (
                  <span>留空跳过: <strong className="text-slate-600">{savedSuccessModal.skippedCount}</strong> 人 (待补录)</span>
                )}
              </div>
            </div>

            {/* Cloud Sync Receipt Box */}
            {savedSuccessModal.cloudSyncResult && (
              <div className={`text-left p-3.5 rounded-xl border text-xs my-3 ${
                savedSuccessModal.cloudSyncResult.cloudSynced
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/70 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center space-x-2 font-bold mb-1">
                  {savedSuccessModal.cloudSyncResult.cloudSynced ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>云端协同同步回执：已成功同步至 GitHub Gist</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>本地存储回执</span>
                    </>
                  )}
                </div>
                <div className="text-[11px] leading-relaxed text-slate-600 pl-6 space-y-1">
                  <p>{savedSuccessModal.cloudSyncResult.cloudMessage}</p>
                  {savedSuccessModal.cloudSyncResult.cloudSynced && (
                    <div className="flex items-center gap-3 pt-1 text-slate-500 font-medium">
                      <span>已融合其他老师数据: <strong className="text-indigo-600 font-bold">{savedSuccessModal.cloudSyncResult.incomingCount || 0}</strong> 条</span>
                      <span>•</span>
                      <span>云端总库累计: <strong className="text-slate-800 font-bold">{savedSuccessModal.cloudSyncResult.totalRecordsCount || scoreRecords.length}</strong> 条</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setSavedSuccessModal(null);
                  if (onNavigateToRanking) onNavigateToRanking();
                }}
                className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer"
              >
                查看实时进退步与荣誉榜 ➔
              </button>

              <button
                type="button"
                onClick={() => {
                  setSavedSuccessModal(null);
                  if (onNavigateToQuery) onNavigateToQuery();
                }}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer"
              >
                前往档案明细与查询
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetForm}
              className="mt-3 w-full py-1.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              继续录入下一个班级
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
