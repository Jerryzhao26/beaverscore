import React, { useState, useMemo } from 'react';
import { Student, ScoreRecord } from '../types';
import { normalizeExamCategory, getExamCategoryLabel } from '../utils/analysis';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  X,
  Printer,
  TrendingUp,
  Award,
  Calendar,
  Layers,
  BookOpen,
  Tag,
  GraduationCap,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Building2,
  School
} from 'lucide-react';

interface StudentReportModalProps {
  student: Student;
  records: ScoreRecord[];
  onClose: () => void;
}

export const StudentReportModal: React.FC<StudentReportModalProps> = ({
  student,
  records,
  onClose
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'institutional' | 'public_school'>('all');

  const filteredRecords = useMemo(() => {
    return records
      .filter(r => {
        if (selectedCategory !== 'all') {
          return normalizeExamCategory(r.examCategory) === selectedCategory;
        }
        return true;
      })
      .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
  }, [records, selectedCategory]);

  const validScores = useMemo(() => {
    return filteredRecords
      .filter(r => r.attendance === 'present' && typeof r.score === 'number' && !isNaN(r.score))
      .map(r => r.score as number);
  }, [filteredRecords]);

  const totalCount = validScores.length;
  const avgScore = totalCount > 0 ? Math.round((validScores.reduce((a, b) => a + b, 0) / totalCount) * 10) / 10 : 0;
  const maxScore = totalCount > 0 ? Math.max(...validScores) : 0;
  const latestRecord = filteredRecords[filteredRecords.length - 1];
  const previousRecord = filteredRecords.length > 1 ? filteredRecords[filteredRecords.length - 2] : null;

  const scoreDelta = (latestRecord && previousRecord && typeof latestRecord.score === 'number' && typeof previousRecord.score === 'number')
    ? latestRecord.score - previousRecord.score
    : null;

  const chartData = useMemo(() => {
    return filteredRecords.map(r => ({
      name: `${r.level} ${r.unit}`,
      date: r.examDate,
      score: r.attendance === 'present' && typeof r.score === 'number' ? r.score : null,
      category: getExamCategoryLabel(r.examCategory),
      title: r.examTitle
    }));
  }, [filteredRecords]);

  const weakPointCounts = useMemo(() => {
    const map: { [tag: string]: number } = {};
    filteredRecords.forEach(r => {
      (r.weakPoints || []).forEach(t => {
        map[t] = (map[t] || 0) + 1;
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredRecords]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center text-base">
              {student.name.slice(0, 1)}
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center">
                {student.name} · 个人学情成长与能力诊断报告
                <span className="ml-2 px-2 py-0.5 rounded text-xs bg-indigo-600 font-normal">
                  {student.currentLevel}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                学号: {student.studentNo} | 状态: {student.status === 'suspended' ? '休学' : '在读'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              打印/导出PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category filter & student info summary */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-1 bg-slate-200/80 p-1 rounded-lg">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🌐 全部数据 ({records.length})
              </button>
              <button
                onClick={() => setSelectedCategory('institutional')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center ${
                  selectedCategory === 'institutional'
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3 h-3 mr-1" />
                🏢 机构内测
              </button>
              <button
                onClick={() => setSelectedCategory('public_school')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center ${
                  selectedCategory === 'public_school'
                    ? 'bg-white text-emerald-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <School className="w-3 h-3 mr-1" />
                🏫 公立统考
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              累计入库测验档案: <strong className="text-indigo-600">{filteredRecords.length}</strong> 场
            </div>
          </div>

          {/* Metric KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5 text-center">
              <div className="text-xs text-indigo-700 font-semibold">历史测验均分</div>
              <div className="text-2xl font-black text-indigo-900 mt-1">
                {totalCount > 0 ? `${avgScore} 分` : '-'}
              </div>
              <div className="text-[11px] text-indigo-600/80 mt-0.5">参评 {totalCount} 次</div>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5 text-center">
              <div className="text-xs text-emerald-700 font-semibold">历史最佳单次</div>
              <div className="text-2xl font-black text-emerald-900 mt-1">
                {totalCount > 0 ? `${maxScore} 分` : '-'}
              </div>
              <div className="text-[11px] text-emerald-600/80 mt-0.5">最高纪录</div>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 text-center">
              <div className="text-xs text-blue-700 font-semibold">最新阶段考得分</div>
              <div className="text-2xl font-black text-blue-900 mt-1">
                {latestRecord?.score !== null && latestRecord?.score !== undefined ? `${latestRecord.score} 分` : '-'}
              </div>
              <div className="text-[11px] text-blue-600/80 mt-0.5">
                {latestRecord ? `${latestRecord.level} ${latestRecord.unit}` : '暂无'}
              </div>
            </div>

            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3.5 text-center">
              <div className="text-xs text-amber-800 font-semibold">阶段进退步幅度</div>
              <div className="text-2xl font-black mt-1 flex items-center justify-center">
                {scoreDelta !== null ? (
                  scoreDelta > 0 ? (
                    <span className="text-emerald-600 flex items-center">
                      <ArrowUpRight className="w-5 h-5 mr-0.5" />+{scoreDelta}
                    </span>
                  ) : scoreDelta < 0 ? (
                    <span className="text-rose-600 flex items-center">
                      <ArrowDownRight className="w-5 h-5 mr-0.5" />{scoreDelta}
                    </span>
                  ) : (
                    <span className="text-slate-600">持平</span>
                  )
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </div>
              <div className="text-[11px] text-amber-700/80 mt-0.5">较上一单元变动</div>
            </div>
          </div>

          {/* Trend Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center">
              <TrendingUp className="w-4 h-4 mr-1.5 text-indigo-600" />
              历史测验成绩曲线与发展轨迹
            </h3>

            {chartData.length < 2 ? (
              <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
                需要至少 2 次测验数据以生成连续趋势折线图
              </div>
            ) : (
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[50, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        color: '#fff',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      name="得分 (分)"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#4f46e5' }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Weak Points Summary */}
          {weakPointCounts.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center">
                <Tag className="w-4 h-4 mr-1.5 text-rose-600" />
                需重点强化的知识点短板 (按失分频次排列)
              </h3>
              <div className="flex flex-wrap gap-2">
                {weakPointCounts.map(([tag, count]) => (
                  <div
                    key={tag}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center space-x-1"
                  >
                    <span>{tag}</span>
                    <span className="bg-rose-200/80 px-1.5 py-0.2 rounded-full text-[10px] font-bold text-rose-900">
                      {count} 次
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Score Records History Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                历次测验得分明细与教师指导建议
              </h3>
              <span className="text-xs text-slate-400">共 {filteredRecords.length} 条流水</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 border-b border-slate-200">
                    <th className="py-2.5 px-3">日期</th>
                    <th className="py-2.5 px-3">类别</th>
                    <th className="py-2.5 px-3">考项 / 单元</th>
                    <th className="py-2.5 px-3 text-center">得分</th>
                    <th className="py-2.5 px-3">薄弱短板</th>
                    <th className="py-2.5 px-3">教师评语 / 建议</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-mono text-slate-500">{r.examDate}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            normalizeExamCategory(r.examCategory) === 'public_school'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {getExamCategoryLabel(r.examCategory)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{r.level} {r.unit}</div>
                        <div className="text-[11px] text-slate-400">{r.examTitle}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {r.attendance === 'present' && typeof r.score === 'number' ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full font-bold font-mono ${
                              r.score >= 90
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.score >= 80
                                ? 'bg-blue-100 text-blue-800'
                                : r.score >= 60
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {r.score} 分
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            {r.attendance === 'leave' ? '请假' : '缺考'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {(r.weakPoints || []).map(t => (
                            <span key={t} className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 text-[10px]">
                              {t}
                            </span>
                          ))}
                        </div>
                        {r.mistakeDetails && (
                          <p className="text-[10px] text-slate-400 mt-0.5 italic">{r.mistakeDetails}</p>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs">
                        {r.teacherRemark || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            关闭诊断报告
          </button>
        </div>
      </div>
    </div>
  );
};
