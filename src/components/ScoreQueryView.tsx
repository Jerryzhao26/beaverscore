import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ScoreRecord, Student, ExamCategory } from '../types';
import { exportToCSV, normalizeExamCategory, getExamCategoryLabel, compareScoreRecordsByExamDateDesc } from '../utils/analysis';
import { PUBLIC_SCHOOL_GRADES, PUBLIC_SCHOOL_EXAM_UNITS } from '../data/initialData';
import { StudentReportModal } from './StudentReportModal';
import { ConfirmDialog } from './ConfirmDialog';
import {
  Search,
  Filter,
  Download,
  Trash2,
  Edit,
  User,
  GraduationCap,
  Layers,
  BookOpen,
  Tag,
  FileText,
  Award,
  ChevronRight,
  Eye
} from 'lucide-react';

export const ScoreQueryView: React.FC = () => {
  const {
    classes,
    students,
    scoreRecords,
    levels,
    units,
    teachers,
    updateScoreRecord,
    deleteScoreRecord
  } = useApp();

  const [viewMode, setViewMode] = useState<'records' | 'student_profiles'>('records');

  const [filterCategory, setFilterCategory] = useState<'all' | 'institutional' | 'public_school'>('all');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterStudentName, setFilterStudentName] = useState<string>('');
  const [filterTeacher, setFilterTeacher] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [filterScoreRange, setFilterScoreRange] = useState<string>('all');
  const [filterTagKeyword, setFilterTagKeyword] = useState<string>('');

  const availableLevels = useMemo(() => {
    const set = new Set<string>();
    if (filterCategory === 'institutional' || filterCategory === 'all') {
      levels.forEach(l => set.add(l));
    }
    if (filterCategory === 'public_school' || filterCategory === 'all') {
      PUBLIC_SCHOOL_GRADES.forEach(g => set.add(g));
    }
    scoreRecords.forEach(r => {
      if (r.level) set.add(r.level);
      if (r.schoolGrade) set.add(r.schoolGrade);
    });
    return Array.from(set);
  }, [levels, filterCategory, scoreRecords]);

  const availableUnits = useMemo(() => {
    const set = new Set<string>();
    if (filterCategory === 'institutional' || filterCategory === 'all') {
      units.forEach(u => set.add(u));
    }
    if (filterCategory === 'public_school' || filterCategory === 'all') {
      PUBLIC_SCHOOL_EXAM_UNITS.forEach(u => set.add(u));
    }
    scoreRecords.forEach(r => {
      if (r.unit) set.add(r.unit);
    });
    return Array.from(set);
  }, [units, filterCategory, scoreRecords]);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);
  const [editingRecord, setEditingRecord] = useState<ScoreRecord | null>(null);

  const filteredRecords = useMemo(() => {
    return scoreRecords.filter(r => {
      if (filterCategory !== 'all') {
        const cat = normalizeExamCategory(r.examCategory);
        if (cat !== filterCategory) return false;
      }
      if (filterClass !== 'all' && r.classId !== filterClass) return false;
      if (
        filterStudentName.trim() &&
        !r.studentName.toLowerCase().includes(filterStudentName.trim().toLowerCase())
      ) {
        return false;
      }
      if (filterTeacher !== 'all' && r.teacherName !== filterTeacher) return false;
      if (filterLevel !== 'all' && r.level !== filterLevel && r.schoolGrade !== filterLevel) return false;
      if (filterUnit !== 'all' && r.unit !== filterUnit) return false;
      if (filterScoreRange === 'absent') {
        if (r.attendance === 'present' && typeof r.score === 'number') return false;
      } else if (filterScoreRange === '100') {
        if (r.attendance !== 'present' || r.score === null || r.score < 100) return false;
      } else if (filterScoreRange === '90+') {
        if (r.attendance !== 'present' || r.score === null || r.score < 90) return false;
      } else if (filterScoreRange === '80-89') {
        if (r.attendance !== 'present' || r.score === null || r.score < 80 || r.score >= 90) return false;
      } else if (filterScoreRange === '60-79') {
        if (r.attendance !== 'present' || r.score === null || r.score < 60 || r.score >= 80) return false;
      } else if (filterScoreRange === '<60') {
        if (r.attendance !== 'present' || r.score === null || r.score >= 60) return false;
      }

      if (filterTagKeyword.trim()) {
        const kw = filterTagKeyword.trim().toLowerCase();
        const hasInWeak = (r.weakPoints || []).some(t => t.toLowerCase().includes(kw));
        const hasInMistake = r.mistakeDetails?.toLowerCase().includes(kw);
        const hasInRemark = r.teacherRemark?.toLowerCase().includes(kw);
        if (!hasInWeak && !hasInMistake && !hasInRemark) return false;
      }

      return true;
    }).sort(compareScoreRecordsByExamDateDesc);
  }, [
    scoreRecords,
    filterCategory,
    filterClass,
    filterStudentName,
    filterTeacher,
    filterLevel,
    filterUnit,
    filterScoreRange,
    filterTagKeyword
  ]);

  const summaryStats = useMemo(() => {
    const presentRecords = filteredRecords.filter(
      r => r.attendance === 'present' && typeof r.score === 'number' && !isNaN(r.score)
    );
    const total = presentRecords.length;
    if (total === 0) {
      return { total: 0, avg: 0, max: 0, min: 0, passRate: 0, distinctionRate: 0 };
    }
    const scores = presentRecords.map(r => r.score as number);
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = Math.round((sum / total) * 10) / 10;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const passCount = scores.filter(s => s >= 60).length;
    const distinctionCount = scores.filter(s => s >= 90).length;
    const passRate = Math.round((passCount / total) * 100);
    const distinctionRate = Math.round((distinctionCount / total) * 100);

    return { total, avg, max, min, passRate, distinctionRate };
  }, [filteredRecords]);

  const handleExportCSV = () => {
    const exportData = filteredRecords.map(r => ({
      '测验日期': r.examDate,
      '考试类别': getExamCategoryLabel(r.examCategory),
      '测验标题': r.examTitle,
      '班级': r.className,
      '学员姓名': r.studentName,
      '考核级别': r.level,
      '考核单元': r.unit,
      '得分': r.attendance === 'present' && typeof r.score === 'number' ? r.score : '缺考/无分',
      '出考状态': r.attendance === 'present' ? '出席' : r.attendance === 'leave' ? '请假' : '缺考',
      '失分/薄弱标签': (r.weakPoints || []).join('; '),
      '失分点说明': r.mistakeDetails || '',
      '教师评语建议': r.teacherRemark || '',
      '执教老师': r.teacherName
    }));

    exportToCSV(`成绩档案_${new Date().toISOString().split('T')[0]}`, exportData);
  };

  const handleOpenStudentReport = (studentId: string, studentName: string) => {
    const s = students.find(item => item.id === studentId) || {
      id: studentId,
      name: studentName,
      gender: 'male',
      studentNo: '',
      classId: '',
      currentLevel: 'BF1',
      enrolledDate: ''
    };
    setSelectedStudentForReport(s);
  };

  const handleSaveEditRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    updateScoreRecord(editingRecord.id, editingRecord);
    setEditingRecord(null);
  };

  const handleClearFilters = () => {
    setFilterClass('all');
    setFilterStudentName('');
    setFilterTeacher('all');
    setFilterLevel('all');
    setFilterUnit('all');
    setFilterScoreRange('all');
    setFilterTagKeyword('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Search className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                成绩综合档案与多维检索中心
              </h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              支持按班级、学生姓名、教师、级别 (BF1-E4)、单元 (U1-U4) 以及失分关键词进行精准查询与学情穿透。
            </p>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('records')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'records'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📊 历次流水档案 ({filteredRecords.length})
            </button>
            <button
              onClick={() => setViewMode('student_profiles')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === 'student_profiles'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              👤 学员学情画像 ({students.length}人)
            </button>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center">
              <Tag className="w-3 h-3 mr-1 text-indigo-600" />
              考试类别
            </label>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">全部类别 (All)</option>
              <option value="institutional">🏢 机构内部测试</option>
              <option value="public_school">🏫 公立学校考试</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center">
              <GraduationCap className="w-3 h-3 mr-1 text-indigo-600" />
              班级筛选
            </label>
            <select
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">全部班级 (All)</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center">
              <User className="w-3 h-3 mr-1 text-indigo-600" />
              学员姓名搜索
            </label>
            <div className="relative">
              <input
                type="text"
                value={filterStudentName}
                onChange={e => setFilterStudentName(e.target.value)}
                placeholder="输入学员姓名..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500"
              />
              {filterStudentName && (
                <button
                  onClick={() => setFilterStudentName('')}
                  className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center">
              <User className="w-3 h-3 mr-1 text-indigo-600" />
              任课老师
            </label>
            <select
              value={filterTeacher}
              onChange={e => setFilterTeacher(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">全部教师</option>
              {teachers.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center">
              <Layers className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              {filterCategory === 'public_school' ? '公校年级 (Grade)' : '考评级别 / 年级'}
            </label>
            <select
              value={filterLevel}
              onChange={e => setFilterLevel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">全部级别 / 年级</option>
              {availableLevels.map(l => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center">
              <BookOpen className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              {filterCategory === 'public_school' ? '公校考项 / 类型' : '考评单元 (Unit)'}
            </label>
            <select
              value={filterUnit}
              onChange={e => setFilterUnit(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">全部考项 / 单元</option>
              {availableUnits.map(u => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center">
              <Award className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              分数分段
            </label>
            <select
              value={filterScoreRange}
              onChange={e => setFilterScoreRange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">全部分数段</option>
              <option value="100">💯 满分 (100分)</option>
              <option value="90+">🌟 优秀 (90 - 100分)</option>
              <option value="80-89">👍 良好 (80 - 89分)</option>
              <option value="60-79">📝 及格 (60 - 79分)</option>
              <option value="<60">⚠️ 需提升 (&lt; 60分)</option>
              <option value="absent">🚫 缺考 / 请假档案 (不计分)</option>
            </select>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 w-full sm:w-1/2">
            <Tag className="w-3.5 h-3.5 text-amber-500" />
            <input
              type="text"
              value={filterTagKeyword}
              onChange={e => setFilterTagKeyword(e.target.value)}
              placeholder="按失分点/薄弱项/评语关键词过滤 (如：时态、词汇、听力、阅读)..."
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800 text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleClearFilters}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md font-medium transition cursor-pointer"
            >
              重置筛选条件
            </button>
            <button
              id="btn-export-csv"
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold flex items-center shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              导出当前检索清单 (CSV)
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-2xs">
          <div className="text-[11px] text-slate-400 font-medium">检索记录条数</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{summaryStats.total} 条</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-2xs">
          <div className="text-[11px] text-slate-400 font-medium">筛选均分</div>
          <div className="text-xl font-bold text-indigo-600 mt-0.5">{summaryStats.avg} 分</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-2xs">
          <div className="text-[11px] text-slate-400 font-medium">最高历史分</div>
          <div className="text-xl font-bold text-emerald-600 mt-0.5">{summaryStats.max} 分</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-2xs">
          <div className="text-[11px] text-slate-400 font-medium">最低分</div>
          <div className="text-xl font-bold text-rose-500 mt-0.5">{summaryStats.min} 分</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-2xs">
          <div className="text-[11px] text-slate-400 font-medium">优秀率 (≥90)</div>
          <div className="text-xl font-bold text-amber-600 mt-0.5">{summaryStats.distinctionRate}%</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-2xs">
          <div className="text-[11px] text-slate-400 font-medium">及格率 (≥60)</div>
          <div className="text-xl font-bold text-emerald-600 mt-0.5">{summaryStats.passRate}%</div>
        </div>
      </div>

      {viewMode === 'records' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Filter className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-semibold text-slate-800">未找到符合条件的成绩档案</h3>
              <p className="text-sm text-slate-400 mt-1">
                请尝试调整或清空上方的筛选条件，或在【日常成绩录入】中登记新考项。
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 w-28">测验日期</th>
                    <th className="py-3 px-4 w-36">学员姓名</th>
                    <th className="py-3 px-4 w-40">班级 / 教师</th>
                    <th className="py-3 px-3 w-28">级别 / 单元</th>
                    <th className="py-3 px-3 w-24 text-center">得分</th>
                    <th className="py-3 px-4">主要失分点 & 薄弱项</th>
                    <th className="py-3 px-4 w-48">教师评语 / 建议</th>
                    <th className="py-3 px-4 w-28 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredRecords.map(record => (
                    <tr key={record.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                        {record.examDate}
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleOpenStudentReport(record.studentId, record.studentName)}
                          className="text-left group flex items-center space-x-1.5 cursor-pointer"
                          title="点击查看该学生学情成长档案"
                        >
                          <span className="font-bold text-slate-900 group-hover:text-indigo-600 underline-offset-2 group-hover:underline">
                            {record.studentName}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 transition" />
                        </button>
                      </td>

                      <td className="py-3 px-4 text-xs">
                        <div className="font-medium text-slate-800">{record.className}</div>
                        <div className="text-slate-400">{record.teacherName}</div>
                      </td>

                      <td className="py-3 px-3 text-xs">
                        <div className="flex items-center gap-1 mb-1">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              normalizeExamCategory(record.examCategory) === 'public_school'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            }`}
                          >
                            {getExamCategoryLabel(record.examCategory)}
                          </span>
                          <span className="inline-block px-1.5 py-0.5 rounded font-bold bg-slate-100 text-slate-700 text-[10px]">
                            {record.level}
                          </span>
                        </div>
                        <div className="text-slate-700 font-medium">{record.unit}</div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {record.attendance === 'absent' ? (
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            缺考 (不计分)
                          </span>
                        ) : record.attendance === 'leave' ? (
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            请假 (不计分)
                          </span>
                        ) : typeof record.score === 'number' ? (
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                              record.score >= 90
                                ? 'bg-emerald-100 text-emerald-800'
                                : record.score >= 80
                                ? 'bg-blue-100 text-blue-800'
                                : record.score >= 60
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {record.score} 分
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs text-slate-400 bg-slate-100">
                            -
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs">
                        <div className="flex flex-wrap gap-1">
                          {(record.weakPoints || []).map(t => (
                            <span
                              key={t}
                              className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/50 text-[11px]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                        {record.mistakeDetails && (
                          <p className="text-[11px] text-slate-500 mt-1 italic line-clamp-1">
                            {record.mistakeDetails}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-600">
                        <p className="line-clamp-2" title={record.teacherRemark}>
                          {record.teacherRemark || '-'}
                        </p>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenStudentReport(record.studentId, record.studentName)}
                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
                            title="生成学情诊断报告单"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingRecord(record)}
                            className="p-1 text-slate-500 hover:bg-slate-100 rounded cursor-pointer"
                            title="修改成绩与评析"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: `确定删除该条成绩记录？`,
                                message: `确定从系统数据库中删除学员【${record.studentName}】在 ${record.level} ${record.unit}（${record.examTitle}）的成绩记录（${record.score}分）吗？此操作不可逆。`,
                                confirmText: '确认删除成绩',
                                variant: 'danger',
                                onConfirm: () => {
                                  deleteScoreRecord(record.id);
                                }
                              });
                            }}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                            title="删除记录"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {viewMode === 'student_profiles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map(student => {
            const studentRecords = scoreRecords
              .filter(r => r.studentId === student.id && r.attendance === 'present' && typeof r.score === 'number' && !isNaN(r.score))
              .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());

            const scores = studentRecords.map(r => r.score as number);
            const count = scores.length;
            const avg = count > 0 ? (scores.reduce((a, b) => a + b, 0) / count).toFixed(1) : '-';
            const latest = studentRecords[studentRecords.length - 1];
            const prev = studentRecords.length > 1 ? studentRecords[studentRecords.length - 2] : null;
            const delta = (latest && prev && typeof latest.score === 'number' && typeof prev.score === 'number')
              ? latest.score - prev.score
              : null;

            const weakCounts: { [tag: string]: number } = {};
            studentRecords.forEach(r => {
              (r.weakPoints || []).forEach(t => {
                weakCounts[t] = (weakCounts[t] || 0) + 1;
              });
            });
            const topWeaks = Object.keys(weakCounts).slice(0, 3);

            return (
              <div
                key={student.id}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm">
                        {student.name.slice(0, 1)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 flex items-center">
                          {student.name}
                          <span className="ml-2 text-xs font-normal text-slate-500">
                            {student.studentNo}
                          </span>
                        </h4>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {classes.find(c => c.id === student.classId)?.name || '在读学员'}
                        </div>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-800">
                      {student.currentLevel}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-lg p-2.5 my-3 text-center text-xs">
                    <div>
                      <div className="text-slate-400 text-[10px]">均分</div>
                      <div className="font-bold text-indigo-700 text-sm">{avg}分</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px]">最新测评</div>
                      <div className="font-bold text-slate-800 text-sm">{latest?.score ?? '-'}分</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px]">近期变动</div>
                      <div className="font-bold text-sm">
                        {delta !== null ? (
                          delta > 0 ? (
                            <span className="text-emerald-600">+{delta}分</span>
                          ) : delta < 0 ? (
                            <span className="text-rose-600">{delta}分</span>
                          ) : (
                            <span className="text-slate-400">持平</span>
                          )
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {topWeaks.length > 0 && (
                    <div className="text-xs">
                      <span className="text-slate-400 text-[11px]">需巩固短板:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {topWeaks.map(tag => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100 text-[10px]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    累计参与 {count} 次阶段测验
                  </span>
                  <button
                    onClick={() => handleOpenStudentReport(student.id, student.name)}
                    className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    学情报告单
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              修改成绩档案: {editingRecord.studentName} ({editingRecord.level} · {editingRecord.unit})
            </h3>

            <form onSubmit={handleSaveEditRecord} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">考试类别</label>
                  <select
                    value={normalizeExamCategory(editingRecord.examCategory)}
                    onChange={e => {
                      const newCat = e.target.value as ExamCategory;
                      setEditingRecord({
                        ...editingRecord,
                        examCategory: newCat,
                        level: newCat === 'public_school' ? (editingRecord.schoolGrade || '三上') : (levels[0] || 'BF1'),
                        unit: newCat === 'public_school' ? PUBLIC_SCHOOL_EXAM_UNITS[0] : (units[0] || 'U1 (Unit 1)')
                      });
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="institutional">🏢 机构内部测试</option>
                    <option value="public_school">🏫 公立学校考试</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">出考状态</label>
                  <select
                    value={editingRecord.attendance}
                    onChange={e => {
                      const att = e.target.value as 'present' | 'absent' | 'leave';
                      setEditingRecord({
                        ...editingRecord,
                        attendance: att,
                        score: att === 'present' ? (editingRecord.score ?? 85) : null
                      });
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm text-slate-800 cursor-pointer"
                  >
                    <option value="present">正常出席</option>
                    <option value="leave">请假 (不计分)</option>
                    <option value="absent">缺考 (不计分)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">得分 (0-100)</label>
                  <input
                    type="number"
                    disabled={editingRecord.attendance !== 'present'}
                    value={editingRecord.attendance === 'present' ? (editingRecord.score ?? '') : ''}
                    placeholder={editingRecord.attendance === 'present' ? '0-100' : '缺考不计分'}
                    onChange={e =>
                      setEditingRecord({
                        ...editingRecord,
                        score: e.target.value === '' ? null : Number(e.target.value)
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {normalizeExamCategory(editingRecord.examCategory) === 'public_school' ? '公校在读年级' : '机构级别'}
                  </label>
                  {normalizeExamCategory(editingRecord.examCategory) === 'public_school' ? (
                    <select
                      value={editingRecord.schoolGrade || editingRecord.level}
                      onChange={e =>
                        setEditingRecord({
                          ...editingRecord,
                          level: e.target.value,
                          schoolGrade: e.target.value
                        })
                      }
                      className="w-full p-2 border border-emerald-300 bg-emerald-50 text-emerald-900 font-bold rounded-lg text-xs cursor-pointer"
                    >
                      {PUBLIC_SCHOOL_GRADES.map(g => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={editingRecord.level}
                      onChange={e =>
                        setEditingRecord({
                          ...editingRecord,
                          level: e.target.value
                        })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      {levels.map(l => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">考项 / 单元</label>
                  {normalizeExamCategory(editingRecord.examCategory) === 'public_school' ? (
                    <select
                      value={editingRecord.unit}
                      onChange={e =>
                        setEditingRecord({
                          ...editingRecord,
                          unit: e.target.value
                        })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs cursor-pointer"
                    >
                      {PUBLIC_SCHOOL_EXAM_UNITS.map(u => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={editingRecord.unit}
                      onChange={e =>
                        setEditingRecord({
                          ...editingRecord,
                          unit: e.target.value
                        })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs cursor-pointer"
                    >
                      {units.map(u => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">测验日期</label>
                  <input
                    type="date"
                    value={editingRecord.examDate || ''}
                    onChange={e =>
                      setEditingRecord({
                        ...editingRecord,
                        examDate: e.target.value
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">失分点具体说明</label>
                <textarea
                  value={editingRecord.mistakeDetails || ''}
                  onChange={e =>
                    setEditingRecord({ ...editingRecord, mistakeDetails: e.target.value })
                  }
                  rows={2}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">教师评语与建议</label>
                <textarea
                  value={editingRecord.teacherRemark || ''}
                  onChange={e =>
                    setEditingRecord({ ...editingRecord, teacherRemark: e.target.value })
                  }
                  rows={2}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  保存修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedStudentForReport && (
        <StudentReportModal
          student={selectedStudentForReport}
          records={scoreRecords.filter(r => r.studentId === selectedStudentForReport.id)}
          onClose={() => setSelectedStudentForReport(null)}
        />
      )}

      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
