import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { calculateStudentStats, exportToCSV } from '../utils/analysis';
import { PUBLIC_SCHOOL_GRADES } from '../data/initialData';
import { Student } from '../types';
import { StudentReportModal } from './StudentReportModal';
import confetti from 'canvas-confetti';
import {
  Trophy,
  TrendingUp,
  AlertTriangle,
  Award,
  Sparkles,
  Layers,
  GraduationCap,
  BookOpen,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  CheckCircle,
  Building2,
  School,
  Tag
} from 'lucide-react';

type RankingTab = 'progress' | 'decline' | 'excellence' | 'fullmarks';

export const RankingsView: React.FC = () => {
  const { classes, students, scoreRecords, levels, units } = useApp();

  const [activeRankingTab, setActiveRankingTab] = useState<RankingTab>('progress');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'institutional' | 'public_school'>('all');
  const [levelRangeFilter, setLevelRangeFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');

  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);

  const allStats = useMemo(() => {
    let levelPrefix: string | undefined;
    let selectedLevel: string | undefined;

    if (levelRangeFilter === 'BF') {
      levelPrefix = 'BF';
    } else if (levelRangeFilter === 'E') {
      levelPrefix = 'E';
    } else if (levelRangeFilter === 'NM') {
      levelPrefix = 'NM';
    } else if (levelRangeFilter !== 'all') {
      selectedLevel = levelRangeFilter;
    }

    return calculateStudentStats(students, scoreRecords, {
      examCategory: categoryFilter,
      levelPrefix,
      selectedLevel,
      classId: classFilter,
      unit: unitFilter
    });
  }, [students, scoreRecords, categoryFilter, levelRangeFilter, classFilter, unitFilter]);

  const progressRanking = useMemo(() => {
    return [...allStats]
      .filter(s => s.recordsCount >= 2 && s.scoreDelta > 0)
      .sort((a, b) => b.scoreDelta - a.scoreDelta);
  }, [allStats]);

  const declineRanking = useMemo(() => {
    return [...allStats]
      .filter(s => (s.recordsCount >= 2 && s.scoreDelta < 0) || s.latestScore < 70)
      .sort((a, b) => a.scoreDelta - b.scoreDelta);
  }, [allStats]);

  const excellenceRanking = useMemo(() => {
    return [...allStats].sort((a, b) => {
      if (b.averageScore !== a.averageScore) {
        return b.averageScore - a.averageScore;
      }
      return b.topScoreCount - a.topScoreCount;
    });
  }, [allStats]);

  const fullMarksRanking = useMemo(() => {
    return [...allStats]
      .filter(s => s.latestScore >= 95 || s.fullScoreCount > 0)
      .sort((a, b) => b.latestScore - a.latestScore);
  }, [allStats]);

  const triggerCelebration = () => {
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  const handleExportRanking = () => {
    let list: any[] = [];
    let title = '排行榜';

    if (activeRankingTab === 'progress') {
      title = '学生突破进步榜';
      list = progressRanking.map((s, idx) => ({
        '排名': idx + 1,
        '学员姓名': s.studentName,
        '所属班级': s.className,
        '级别': s.level,
        '上次成绩': `${s.previousScore ?? '-'}分 (${s.previousUnit ?? ''})`,
        '最新成绩': `${s.latestScore}分 (${s.latestUnit})`,
        '提升幅度': `+${s.scoreDelta}分`,
        '教师评语': s.latestRemark || ''
      }));
    } else if (activeRankingTab === 'decline') {
      title = '学情预警与需关注榜';
      list = declineRanking.map((s, idx) => ({
        '预警次序': idx + 1,
        '学员姓名': s.studentName,
        '所属班级': s.className,
        '级别': s.level,
        '变动情况': `${s.scoreDelta}分 (前次${s.previousScore ?? '-'} ➔ 本次${s.latestScore})`,
        '主要薄弱点': s.recentWeakPoints.join('; '),
        '失分细节': s.latestMistake || '',
        '教师建议': s.latestRemark || ''
      }));
    } else {
      title = '平时综合优异榜';
      list = excellenceRanking.map((s, idx) => ({
        '综合排名': idx + 1,
        '学员姓名': s.studentName,
        '所属班级': s.className,
        '级别': s.level,
        '历史测评均分': `${s.averageScore}分`,
        '最高分': `${s.maxScore}分`,
        '90分以上次数': `${s.topScoreCount}次`,
        '参评次数': `${s.recordsCount}次`
      }));
    }

    exportToCSV(`${title}_${new Date().toISOString().split('T')[0]}`, list);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Trophy className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                学生表现实时排行与学情进退步研判
              </h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              自动比对学生历次单元测验成绩，实时计算涨分幅度、预警异常退步、表彰平时优异标杆，支持按级别范围（BF/NM/E系列）自选维度过滤。
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={triggerCelebration}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-600" />
              放礼花表彰
            </button>
            <button
              onClick={handleExportRanking}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              导出当前榜单
            </button>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center">
              <Tag className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              比对数据池 (公校与机构严格分开比对)
            </label>
            <span className="text-[11px] text-slate-500">
              {categoryFilter === 'institutional' && '🏢 当前仅统计机构测试成绩，公校成绩不参与比对'}
              {categoryFilter === 'public_school' && '🏫 当前仅统计公校统考成绩，机构成绩不参与比对'}
              {categoryFilter === 'all' && '🌐 查看所有类别统计 (进退步依然只在同类别内比对)'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              id="btn-filter-cat-all"
              onClick={() => setCategoryFilter('all')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>🌐 全部考试类别</span>
            </button>
            <button
              type="button"
              id="btn-filter-cat-institutional"
              onClick={() => setCategoryFilter('institutional')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                categoryFilter === 'institutional'
                  ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/20'
                  : 'bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>🏢 机构内部测试专用榜</span>
            </button>
            <button
              type="button"
              id="btn-filter-cat-public-school"
              onClick={() => setCategoryFilter('public_school')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                categoryFilter === 'public_school'
                  ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/20'
                  : 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60'
              }`}
            >
              <School className="w-3.5 h-3.5" />
              <span>🏫 公立学校考试专用榜</span>
            </button>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-600 mb-1.5 flex items-center">
              <Layers className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              限定考评级别范围 (Level Filter)
            </label>
            <select
              value={levelRangeFilter}
              onChange={e => setLevelRangeFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">🌐 全部级别 / 年级范围 (全校综合)</option>
              {categoryFilter !== 'public_school' && (
                <optgroup label="机构分段阶段组">
                  <option value="BF">🐣 启蒙进阶组 (BF系列: BF1, BF2, BF3)</option>
                  <option value="NM">⚡ 核心冲刺组 (NM系列)</option>
                  <option value="E">🎓 拔尖高阶组 (E系列: E1, E2, E3, E4)</option>
                </optgroup>
              )}
              {categoryFilter !== 'public_school' && (
                <optgroup label="机构具体级别">
                  {levels.map(l => (
                    <option key={l} value={l}>
                      只看机构 {l} 级别
                    </option>
                  ))}
                </optgroup>
              )}
              {(categoryFilter === 'public_school' || categoryFilter === 'all') && (
                <optgroup label="公立学校在读年级 (Grade)">
                  {PUBLIC_SCHOOL_GRADES.map(g => (
                    <option key={g} value={g}>
                      🏫 公校年级: {g}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1.5 flex items-center">
              <GraduationCap className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              限定班级范围 (Scope)
            </label>
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">全校全班级大排名</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.teacherName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1.5 flex items-center">
              <BookOpen className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              限定考评单元 (Unit)
            </label>
            <select
              value={unitFilter}
              onChange={e => setUnitFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">全部历史单元测验</option>
              {units.map(u => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveRankingTab('progress')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center cursor-pointer ${
              activeRankingTab === 'progress'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <TrendingUp className="w-4 h-4 mr-1.5" />
            🚀 突破进步之星榜 ({progressRanking.length}人)
          </button>

          <button
            onClick={() => setActiveRankingTab('decline')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center cursor-pointer ${
              activeRankingTab === 'decline'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4 mr-1.5" />
            ⚠️ 学情预警与需关注榜 ({declineRanking.length}人)
          </button>

          <button
            onClick={() => setActiveRankingTab('excellence')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center cursor-pointer ${
              activeRankingTab === 'excellence'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
            }`}
          >
            <Award className="w-4 h-4 mr-1.5" />
            🌟 平时综合优异榜 ({excellenceRanking.length}人)
          </button>

          <button
            onClick={() => setActiveRankingTab('fullmarks')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center cursor-pointer ${
              activeRankingTab === 'fullmarks'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <Star className="w-4 h-4 mr-1.5" />
            💯 拔尖/满分达人榜 ({fullMarksRanking.length}人)
          </button>
        </div>
      </div>

      {activeRankingTab === 'progress' && (
        <div className="space-y-4">
          {progressRanking.length >= 3 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-b from-slate-50 to-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between order-2 md:order-1">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center">
                      🥈 2
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-800">
                      {progressRanking[1].level}
                    </span>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-base font-bold text-slate-900">{progressRanking[1].studentName}</h3>
                    <p className="text-xs text-slate-500">{progressRanking[1].className}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 my-3 text-center">
                    <div className="text-xs text-emerald-700 font-medium">提升幅度</div>
                    <div className="text-2xl font-black text-emerald-600">
                      +{progressRanking[1].scoreDelta} <span className="text-xs font-normal">分 🚀</span>
                    </div>
                    <div className="text-[11px] text-emerald-800 mt-1">
                      {progressRanking[1].previousScore}分 ➔ <strong>{progressRanking[1].latestScore}分</strong>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const std = students.find(s => s.id === progressRanking[1].studentId);
                    if (std) setSelectedStudentForReport(std);
                  }}
                  className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
                >
                  查看个人成长档案
                </button>
              </div>

              <div className="bg-gradient-to-b from-amber-50/50 to-white rounded-2xl p-6 border-2 border-amber-300 shadow-md flex flex-col justify-between order-1 md:order-2 ring-4 ring-amber-100">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="w-10 h-10 rounded-full bg-amber-400 text-amber-950 font-black text-base flex items-center justify-center shadow-xs">
                      🥇 1
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      突破进步冠军 · {progressRanking[0].level}
                    </span>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-xl font-black text-slate-900">{progressRanking[0].studentName}</h3>
                    <p className="text-xs text-slate-500">{progressRanking[0].className}</p>
                  </div>
                  <div className="bg-emerald-100/70 border border-emerald-200 rounded-xl p-3.5 my-3 text-center">
                    <div className="text-xs text-emerald-800 font-bold">全校突破最大跨度</div>
                    <div className="text-3xl font-black text-emerald-700">
                      +{progressRanking[0].scoreDelta} <span className="text-sm font-normal">分 🚀</span>
                    </div>
                    <div className="text-xs text-emerald-900 mt-1 font-semibold">
                      从 {progressRanking[0].previousScore}分 暴涨至 <strong>{progressRanking[0].latestScore}分</strong>
                    </div>
                  </div>
                  {progressRanking[0].latestRemark && (
                    <p className="text-xs text-slate-600 bg-amber-50 p-2 rounded border border-amber-100 italic line-clamp-2">
                      “{progressRanking[0].latestRemark}”
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    const std = students.find(s => s.id === progressRanking[0].studentId);
                    if (std) setSelectedStudentForReport(std);
                  }}
                  className="w-full mt-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  查看进步之星成长报告 ➔
                </button>
              </div>

              <div className="bg-gradient-to-b from-amber-50/20 to-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between order-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-full bg-amber-200 text-amber-900 font-black text-sm flex items-center justify-center">
                      🥉 3
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-800">
                      {progressRanking[2].level}
                    </span>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-base font-bold text-slate-900">{progressRanking[2].studentName}</h3>
                    <p className="text-xs text-slate-500">{progressRanking[2].className}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 my-3 text-center">
                    <div className="text-xs text-emerald-700 font-medium">提升幅度</div>
                    <div className="text-2xl font-black text-emerald-600">
                      +{progressRanking[2].scoreDelta} <span className="text-xs font-normal">分 🚀</span>
                    </div>
                    <div className="text-[11px] text-emerald-800 mt-1">
                      {progressRanking[2].previousScore}分 ➔ <strong>{progressRanking[2].latestScore}分</strong>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const std = students.find(s => s.id === progressRanking[2].studentId);
                    if (std) setSelectedStudentForReport(std);
                  }}
                  className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
                >
                  查看个人成长档案
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                全榜单明细 · 突破进步之星榜
              </span>
              <span className="text-xs text-slate-500">
                按对比上一单元测验涨分幅度由高到低排列
              </span>
            </div>

            {progressRanking.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                当前筛选条件下暂无录入两次及以上测验产生涨分的数据
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50/60 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 w-16 text-center">排名</th>
                      <th className="py-2.5 px-4 w-36">学员姓名</th>
                      <th className="py-2.5 px-4 w-40">班级 / 级别</th>
                      <th className="py-2.5 px-4 w-36 text-center">上阶段成绩</th>
                      <th className="py-2.5 px-4 w-36 text-center">最新阶段得分</th>
                      <th className="py-2.5 px-4 w-36 text-center">净提升幅度</th>
                      <th className="py-2.5 px-4">教师突破寄语</th>
                      <th className="py-2.5 px-4 w-24 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {progressRanking.map((item, idx) => (
                      <tr key={item.studentId} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 text-center font-bold text-slate-700">
                          {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : idx + 1}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                          {item.studentName}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div>{item.className}</div>
                          <span className="inline-block px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                            {item.level}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500">
                          {item.previousScore ?? '-'} 分 ({item.previousUnit ?? '-'})
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-900">
                          {item.latestScore} 分 ({item.latestUnit})
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs">
                            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                            +{item.scoreDelta} 分
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 italic">
                          {item.latestRemark || '表现稳健，继续保持！'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              const std = students.find(s => s.id === item.studentId);
                              if (std) setSelectedStudentForReport(std);
                            }}
                            className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                          >
                            学情报告
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeRankingTab === 'decline' && (
        <div className="space-y-4">
          <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-4 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-rose-900">
                学情预警机制说明
              </h4>
              <p className="text-xs text-rose-700 mt-0.5">
                系统实时捕获单次测验下滑超过 5 分或当前得分在 70 分以下的学员，直观展示该生的薄弱失分点，便于主讲老师和助教及时介入辅导、约谈沟通。
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            {declineRanking.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-base font-semibold text-slate-700">全体学员状态优良</h3>
                <p className="text-xs text-slate-400 mt-1">当前没有出现明显下滑或低于70分的学员</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-rose-50/50 text-rose-900 border-b border-rose-100 font-semibold">
                    <tr>
                      <th className="py-2.5 px-4 w-12 text-center">序号</th>
                      <th className="py-2.5 px-4 w-32">需关注学员</th>
                      <th className="py-2.5 px-4 w-36">班级 / 级别</th>
                      <th className="py-2.5 px-4 w-36 text-center">成绩变动轨迹</th>
                      <th className="py-2.5 px-4">近期暴露的高频失分薄弱点</th>
                      <th className="py-2.5 px-4 w-48">建议教学干预措施</th>
                      <th className="py-2.5 px-4 w-24 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {declineRanking.map((item, idx) => (
                      <tr key={item.studentId} className="hover:bg-rose-50/30 transition">
                        <td className="py-3 px-4 text-center font-bold text-rose-700">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                          {item.studentName}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div>{item.className}</div>
                          <span className="inline-block px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {item.level}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.previousScore !== undefined ? (
                            <div>
                              <span className="text-slate-400">{item.previousScore}分</span>
                              <span className="mx-1 text-slate-300">➔</span>
                              <strong className="text-rose-600 font-bold">{item.latestScore}分</strong>
                              <div className="text-[11px] font-semibold text-rose-600 mt-0.5 flex items-center justify-center">
                                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                                下滑 {Math.abs(item.scoreDelta)} 分
                              </div>
                            </div>
                          ) : (
                            <div className="text-rose-600 font-bold">
                              当前 {item.latestScore} 分 (需提升)
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {item.recentWeakPoints.length > 0 ? (
                              item.recentWeakPoints.map(t => (
                                <span
                                  key={t}
                                  className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[11px] font-medium"
                                >
                                  {t}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic">基础综合考点欠缺</span>
                            )}
                          </div>
                          {item.latestMistake && (
                            <p className="text-[11px] text-slate-500 mt-1 italic">
                              失分点: {item.latestMistake}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div className="bg-amber-50 p-1.5 rounded border border-amber-200/60 text-[11px] text-amber-900">
                            {item.latestRemark || '建议安排课后词汇/语法打卡，重点复习错题本'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              const std = students.find(s => s.id === item.studentId);
                              if (std) setSelectedStudentForReport(std);
                            }}
                            className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                          >
                            诊断画像
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeRankingTab === 'excellence' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              平时综合优异荣誉总榜 (Honor Roll)
            </span>
            <span className="text-xs text-slate-500">
              综合考量历史均分、优秀率与发挥稳定性
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 w-16 text-center">位次</th>
                  <th className="py-2.5 px-4 w-36">学员姓名</th>
                  <th className="py-2.5 px-4 w-40">班级 / 级别</th>
                  <th className="py-2.5 px-4 w-32 text-center">历史均分</th>
                  <th className="py-2.5 px-4 w-28 text-center">最高单次分</th>
                  <th className="py-2.5 px-4 w-28 text-center">优秀次数(≥90)</th>
                  <th className="py-2.5 px-4 w-28 text-center">测验场次</th>
                  <th className="py-2.5 px-4 w-28 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {excellenceRanking.map((item, idx) => (
                  <tr key={item.studentId} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 text-center font-bold">
                      {idx === 0 ? (
                        <span className="text-amber-500 text-sm">🥇 1</span>
                      ) : idx === 1 ? (
                        <span className="text-slate-400 text-sm">🥈 2</span>
                      ) : idx === 2 ? (
                        <span className="text-amber-700 text-sm">🥉 3</span>
                      ) : (
                        idx + 1
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                      {item.studentName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{item.className}</div>
                      <span className="inline-block px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                            {item.level}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-black text-indigo-700 text-sm">
                        {item.averageScore}
                      </span>{' '}
                      分
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600">
                      {item.maxScore} 分
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-amber-600">
                      {item.topScoreCount} 次
                    </td>
                    <td className="py-3 px-4 text-center text-slate-500">
                      {item.recordsCount} 次
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          const std = students.find(s => s.id === item.studentId);
                          if (std) setSelectedStudentForReport(std);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                      >
                        学情报告
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeRankingTab === 'fullmarks' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center">
              <Star className="w-4 h-4 mr-1 text-amber-600" />
              满分与拔尖达人榜 (95分 - 100分标杆)
            </span>
            <span className="text-xs text-amber-700">展现卓越综合素质的学员</span>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {fullMarksRanking.map(item => (
              <div
                key={item.studentId}
                className="bg-amber-50/30 border border-amber-200 rounded-xl p-4 flex flex-col justify-between hover:shadow-sm transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-xs">
                      {item.level}
                    </span>
                    <span className="text-xl font-black text-amber-600">
                      {item.latestScore === 100 ? '💯 满分' : `${item.latestScore}分`}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-base mt-2">{item.studentName}</h4>
                  <p className="text-xs text-slate-500">{item.className} · {item.latestUnit}</p>

                  <div className="mt-2 text-xs text-slate-600 italic bg-white p-2 rounded border border-amber-100">
                    “{item.latestRemark || '思维缜密，答卷堪称标杆范本！'}”
                  </div>
                </div>

                <button
                  onClick={() => {
                    const std = students.find(s => s.id === item.studentId);
                    if (std) setSelectedStudentForReport(std);
                  }}
                  className="mt-3 w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  查看荣誉学情单
                </button>
              </div>
            ))}
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
    </div>
  );
};
