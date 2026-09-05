import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { normalizeExamCategory, getExamCategoryLabel } from '../utils/analysis';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  Tag,
  AlertCircle,
  Award,
  Layers,
  GraduationCap
} from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export const ClassAnalysisView: React.FC = () => {
  const { classes, scoreRecords, levels, units } = useApp();

  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'institutional' | 'public_school'>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const filteredRecords = useMemo(() => {
    return scoreRecords.filter(r => {
      if (selectedCategory !== 'all' && normalizeExamCategory(r.examCategory) !== selectedCategory) {
        return false;
      }
      if (selectedClassId !== 'all' && r.classId !== selectedClassId) {
        return false;
      }
      if (selectedLevel !== 'all' && r.level !== selectedLevel && r.schoolGrade !== selectedLevel) {
        return false;
      }
      return r.attendance === 'present' && typeof r.score === 'number' && !isNaN(r.score);
    });
  }, [scoreRecords, selectedCategory, selectedClassId, selectedLevel]);

  const levelComparisonData = useMemo(() => {
    const map: { [lvl: string]: { total: number; sum: number; count: number; max: number; min: number } } = {};

    filteredRecords.forEach(r => {
      const lvl = r.level;
      if (!map[lvl]) {
        map[lvl] = { total: 0, sum: 0, count: 0, max: -1, min: 101 };
      }
      const score = r.score as number;
      map[lvl].sum += score;
      map[lvl].count += 1;
      map[lvl].max = Math.max(map[lvl].max, score);
      map[lvl].min = Math.min(map[lvl].min, score);
    });

    return Object.keys(map).map(lvl => ({
      level: lvl,
      avg: Math.round((map[lvl].sum / map[lvl].count) * 10) / 10,
      max: map[lvl].max,
      min: map[lvl].min,
      count: map[lvl].count
    }));
  }, [filteredRecords]);

  const unitTrendData = useMemo(() => {
    const map: { [unit: string]: { sum: number; count: number } } = {};

    filteredRecords.forEach(r => {
      const u = r.unit;
      if (!map[u]) {
        map[u] = { sum: 0, count: 0 };
      }
      map[u].sum += r.score as number;
      map[u].count += 1;
    });

    return Object.keys(map).map(u => ({
      unit: u,
      avg: Math.round((map[u].sum / map[u].count) * 10) / 10,
      count: map[u].count
    }));
  }, [filteredRecords]);

  const scoreDistributionData = useMemo(() => {
    let excellent = 0; // >=90
    let good = 0;      // 80-89
    let pass = 0;      // 60-79
    let fail = 0;      // <60

    filteredRecords.forEach(r => {
      const score = r.score as number;
      if (score >= 90) excellent++;
      else if (score >= 80) good++;
      else if (score >= 60) pass++;
      else fail++;
    });

    const total = filteredRecords.length || 1;

    return [
      { name: '优秀 (≥90分)', count: excellent, percent: Math.round((excellent / total) * 100) },
      { name: '良好 (80-89分)', count: good, percent: Math.round((good / total) * 100) },
      { name: '及格 (60-79分)', count: pass, percent: Math.round((pass / total) * 100) },
      { name: '需提升 (<60分)', count: fail, percent: Math.round((fail / total) * 100) }
    ];
  }, [filteredRecords]);

  const weakPointsData = useMemo(() => {
    const countMap: { [tag: string]: number } = {};

    filteredRecords.forEach(r => {
      (r.weakPoints || []).forEach(t => {
        countMap[t] = (countMap[t] || 0) + 1;
      });
    });

    return Object.entries(countMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filteredRecords]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <BarChart3 className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                班级学情与级别达标全景看板
              </h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              通过图表直观洞察各班级/各阶段的均分走势、分数段占比分布及全班高频知识短板。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">🌐 全部类别</option>
              <option value="institutional">🏢 机构内部测评</option>
              <option value="public_school">🏫 公立学校考试</option>
            </select>

            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">全部班级</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedLevel}
              onChange={e => setSelectedLevel(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">全部级别/年级</option>
              {levels.map(l => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">各级别测验均分与极值对比</h3>
            </div>
            <span className="text-xs text-slate-400">平均分 / 最高分</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelComparisonData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="level" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="avg" name="均分 (分)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="max" name="最高分 (分)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">单元考项平均分走势</h3>
            </div>
            <span className="text-xs text-slate-400">历次单元均分</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={unitTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="unit" tick={{ fontSize: 10 }} />
                <YAxis domain={[50, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="avg"
                  name="单元平均分"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <PieIcon className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">成绩梯队与分数段分布</h3>
            </div>
            <span className="text-xs text-slate-400">总样本: {filteredRecords.length} 份</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 items-center">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={scoreDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {scoreDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 text-xs">
              {scoreDistributionData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between p-2 rounded bg-slate-50">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-slate-700 font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {item.count}人 ({item.percent}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-900">高频丢分短板排查 (前8项)</h3>
            </div>
            <span className="text-xs text-slate-400">教学干预重点</span>
          </div>

          {weakPointsData.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              暂无失分标签统计
            </div>
          ) : (
            <div className="space-y-2.5">
              {weakPointsData.map((item, index) => {
                const maxCount = weakPointsData[0]?.count || 1;
                const pct = Math.round((item.count / maxCount) * 100);
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-700 flex items-center">
                        <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] flex items-center justify-center mr-1.5 font-bold">
                          {index + 1}
                        </span>
                        {item.name}
                      </span>
                      <span className="text-rose-600 font-bold">{item.count} 次失分</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-500 h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
