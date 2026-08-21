import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Student, ClassGroup } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import {
  Users,
  GraduationCap,
  Settings,
  Layers,
  Tag,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Download,
  Upload,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Database,
  UserCheck,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const ManagementView: React.FC = () => {
  const {
    students,
    classes,
    levels,
    units,
    teachers,
    weakPointTags,
    gistConfig,
    syncStatus,
    lastSyncTime,
    syncError,
    addStudent,
    updateStudent,
    deleteStudent,
    addClass,
    updateClass,
    deleteClass,
    updateLevels,
    updateUnits,
    updateTeachers,
    updateWeakPointTags,
    updateGistConfig,
    manualSync,
    resetToInitialData,
    importFullData
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<
    'students' | 'classes' | 'system_config' | 'gist_sync' | 'backup'
  >('students');

  // Student Form State
  const [isEditingStudent, setIsEditingStudent] = useState<boolean>(false);
  const [studentForm, setStudentForm] = useState<{
    id?: string;
    name: string;
    studentNo: string;
    gender: 'male' | 'female';
    classId: string;
    currentLevel: string;
    status: 'active' | 'suspended';
    contactPhone?: string;
    parentNote?: string;
  }>({
    name: '',
    studentNo: '',
    gender: 'male',
    classId: classes[0]?.id || '',
    currentLevel: levels[0] || 'BF1',
    status: 'active',
    contactPhone: '',
    parentNote: ''
  });

  // Class Form State
  const [isEditingClass, setIsEditingClass] = useState<boolean>(false);
  const [classForm, setClassForm] = useState<{
    id?: string;
    name: string;
    teacherName: string;
    currentLevel: string;
    academicYear: string;
  }>({
    name: '',
    teacherName: teachers[0] || '',
    currentLevel: levels[0] || 'BF1',
    academicYear: '2025春季'
  });

  // Tags/Levels input
  const [newLevelInput, setNewLevelInput] = useState<string>('');
  const [newUnitInput, setNewUnitInput] = useState<string>('');
  const [newTeacherInput, setNewTeacherInput] = useState<string>('');
  const [newTagInput, setNewTagInput] = useState<string>('');

  // Gist form
  const [gistToken, setGistToken] = useState<string>(gistConfig.token || '');
  const [gistId, setGistId] = useState<string>(gistConfig.gistId || '');
  const [autoSync, setAutoSync] = useState<boolean>(gistConfig.autoSync ?? false);
  const [syncInterval, setSyncInterval] = useState<number>(gistConfig.syncIntervalSeconds ?? 30);
  const [teacherNameInput, setTeacherNameInput] = useState<string>(gistConfig.teacherName || '');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
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

  // Filter students in management table
  const [studentClassFilter, setStudentClassFilter] = useState<string>('all');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const filteredStudents = students.filter(s => {
    if (studentClassFilter === 'unassigned') {
      if (s.classId && classes.some(c => c.id === s.classId)) return false;
    } else if (studentClassFilter !== 'all' && s.classId !== studentClassFilter) {
      return false;
    }
    if (studentSearch.trim() && !s.name.toLowerCase().includes(studentSearch.trim().toLowerCase()) && !s.studentNo.includes(studentSearch.trim())) {
      return false;
    }
    return true;
  });

  // Student CRUD handlers
  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name.trim()) return;

    if (isEditingStudent && studentForm.id) {
      updateStudent(studentForm.id, {
        name: studentForm.name.trim(),
        studentNo: studentForm.studentNo.trim() || `S${Math.floor(1000 + Math.random() * 9000)}`,
        gender: studentForm.gender,
        classId: studentForm.classId,
        currentLevel: studentForm.currentLevel,
        status: studentForm.status,
        contactPhone: studentForm.contactPhone,
        parentNote: studentForm.parentNote
      });
      showToast(`已更新学员【${studentForm.name.trim()}】档案`);
    } else {
      addStudent({
        name: studentForm.name.trim(),
        studentNo: studentForm.studentNo.trim() || `S${Math.floor(1000 + Math.random() * 9000)}`,
        gender: studentForm.gender,
        classId: studentForm.classId || '',
        currentLevel: studentForm.currentLevel || (levels[0] || 'BF1'),
        status: studentForm.status,
        contactPhone: studentForm.contactPhone,
        parentNote: studentForm.parentNote,
        enrolledDate: new Date().toISOString().split('T')[0]
      });
      showToast(`已添加新学员【${studentForm.name.trim()}】`);
    }

    setIsEditingStudent(false);
    setStudentForm({
      name: '',
      studentNo: '',
      gender: 'male',
      classId: classes[0]?.id || '',
      currentLevel: levels[0] || 'BF1',
      status: 'active',
      contactPhone: '',
      parentNote: ''
    });
  };

  const handleEditStudentClick = (student: Student) => {
    setIsEditingStudent(true);
    setStudentForm({
      id: student.id,
      name: student.name || '',
      studentNo: student.studentNo || '',
      gender: student.gender || 'male',
      classId: student.classId || '',
      currentLevel: student.currentLevel || (levels[0] || 'BF1'),
      status: student.status || 'active',
      contactPhone: student.contactPhone || '',
      parentNote: student.parentNote || ''
    });
  };

  // Class CRUD handlers
  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classForm.name.trim()) return;

    const chosenLevel = classForm.currentLevel || levels[0] || 'BF1';

    if (isEditingClass && classForm.id) {
      const studentCountInClass = students.filter(s => s.classId === classForm.id).length;
      updateClass(classForm.id, {
        name: classForm.name.trim(),
        teacherName: classForm.teacherName || teachers[0] || '王老师',
        level: chosenLevel,
        currentLevel: chosenLevel,
        academicYear: classForm.academicYear
      });
      showToast(`班级【${classForm.name.trim()}】已保存，主授级别已设为【${chosenLevel}】（已同步更新该班 ${studentCountInClass} 位学员的在读级别）`);
    } else {
      addClass({
        name: classForm.name.trim(),
        teacherName: classForm.teacherName || teachers[0] || '王老师',
        level: chosenLevel,
        currentLevel: chosenLevel,
        academicYear: classForm.academicYear || '2025春季'
      });
      showToast(`已创建班级【${classForm.name.trim()}】（主授级别: ${chosenLevel}）`);
    }

    setIsEditingClass(false);
    setClassForm({
      name: '',
      teacherName: teachers[0] || '',
      currentLevel: levels[0] || 'BF1',
      academicYear: '2025春季'
    });
  };

  const handleEditClassClick = (c: ClassGroup) => {
    setIsEditingClass(true);
    const classLevel = c.currentLevel || c.level || levels[0] || 'BF1';
    setClassForm({
      id: c.id,
      name: c.name || '',
      teacherName: c.teacherName || (teachers[0] || ''),
      currentLevel: classLevel,
      academicYear: c.academicYear || ''
    });
  };

  // Levels, units, teachers, tags handlers
  const handleAddLevel = () => {
    const val = newLevelInput.trim().toUpperCase();
    if (val && !levels.includes(val)) {
      updateLevels([...levels, val]);
      setNewLevelInput('');
    }
  };

  const handleRemoveLevel = (lvl: string) => {
    updateLevels(levels.filter(l => l !== lvl));
  };

  const handleAddUnit = () => {
    const val = newUnitInput.trim();
    if (val && !units.includes(val)) {
      updateUnits([...units, val]);
      setNewUnitInput('');
    }
  };

  const handleRemoveUnit = (u: string) => {
    updateUnits(units.filter(item => item !== u));
  };

  const handleAddTeacher = () => {
    const val = newTeacherInput.trim();
    if (val && !teachers.includes(val)) {
      updateTeachers([...teachers, val]);
      setNewTeacherInput('');
    }
  };

  const handleRemoveTeacher = (t: string) => {
    updateTeachers(teachers.filter(item => item !== t));
  };

  const handleAddTag = () => {
    const val = newTagInput.trim();
    if (val && !weakPointTags.includes(val)) {
      updateWeakPointTags([...weakPointTags, val]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    updateWeakPointTags(weakPointTags.filter(t => t !== tag));
  };

  // Gist config save
  const handleSaveGistConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateGistConfig({
      token: gistToken.trim(),
      gistId: gistId.trim(),
      autoSync,
      syncIntervalSeconds: Number(syncInterval) || 60,
      teacherName: teacherNameInput.trim()
    });
    setSaveSuccessMsg('GitHub Gist 配置已保存！');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  // Excel batch import students
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (rows.length === 0) {
          showToast('导入表格内容为空，请检查文件！');
          return;
        }

        let addedCount = 0;
        rows.forEach(row => {
          const name = row['姓名'] || row['学员姓名'] || row['Name'] || row['studentName'];
          if (!name) return;

          const studentNo = row['学号'] || row['studentNo'] || `S${Math.floor(1000 + Math.random() * 9000)}`;
          const gender = (row['性别'] === '女' || row['gender'] === 'female') ? 'female' : 'male';
          const className = row['班级'] || row['班级名称'] || row['className'];
          const level = row['级别'] || row['level'] || 'BF1';
          const phone = row['联系电话'] || row['手机号'] || '';

          // find or match class
          let targetClassId = classes[0]?.id || '';
          if (className) {
            const foundClass = classes.find(c => c.name.includes(className));
            if (foundClass) {
              targetClassId = foundClass.id;
            }
          }

          addStudent({
            name: String(name).trim(),
            studentNo: String(studentNo).trim(),
            gender,
            classId: targetClassId,
            currentLevel: String(level).trim(),
            status: 'active',
            contactPhone: phone ? String(phone) : undefined,
            enrolledDate: new Date().toISOString().split('T')[0]
          });
          addedCount++;
        });

        showToast(`成功批量导入 ${addedCount} 位新学员！`);
      } catch (err: any) {
        showToast('解析 Excel/CSV 文件失败: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Full backup JSON download
  const handleExportFullBackup = () => {
    const { students, classes, scoreRecords, levels, units, teachers, weakPointTags } = useAppStoreSnapshot();
    const backupData = {
      version: '1.2.0',
      exportedAt: new Date().toISOString(),
      students,
      classes,
      scoreRecords,
      levels,
      units,
      teachers,
      weakPointTags
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Institutional_Grade_System_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('已导出完整系统数据备份文件！');
  };

  // Helper snapshot
  const useAppStoreSnapshot = () => {
    return { students, classes, scoreRecords: useApp().scoreRecords, levels, units, teachers, weakPointTags };
  };

  // Full backup JSON upload
  const handleImportFullBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed.students || !parsed.classes || !parsed.scoreRecords) {
          throw new Error('备份文件格式不符合要求');
        }

        setConfirmDialog({
          isOpen: true,
          title: '覆盖现有数据恢复？',
          message: `检测到备份文件包含 ${parsed.students.length} 名学员、${parsed.classes.length} 个班级、${parsed.scoreRecords.length} 条成绩记录。导入将合并/替换当前数据，确定继续吗？`,
          confirmText: '确认恢复备份',
          variant: 'danger',
          onConfirm: () => {
            importFullData(parsed);
            showToast('已成功恢复系统备份数据！');
          }
        });
      } catch (err: any) {
        showToast('读取备份文件失败: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-300" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage('')} className="text-white/80 hover:text-white ml-3 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-lg bg-slate-100 text-slate-700">
                <Settings className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                机构基础档案维护与多端协作配置中心
              </h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              管理全校班级花名册、学员档案、考评级别/单元体系、教师团队及 GitHub Gist 云端多教师协同同步。
            </p>
          </div>

          <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveSubTab('students')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center ${
                activeSubTab === 'students'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 mr-1" />
              学员名册 ({students.length})
            </button>

            <button
              onClick={() => setActiveSubTab('classes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center ${
                activeSubTab === 'classes'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 mr-1" />
              班级管理 ({classes.length})
            </button>

            <button
              onClick={() => setActiveSubTab('system_config')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center ${
                activeSubTab === 'system_config'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 mr-1" />
              考评体系与标签
            </button>

            <button
              onClick={() => setActiveSubTab('gist_sync')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center ${
                activeSubTab === 'gist_sync'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5 mr-1" />
              Gist云同步协作
            </button>

            <button
              onClick={() => setActiveSubTab('backup')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center ${
                activeSubTab === 'backup'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              备份与恢复
            </button>
          </div>
        </div>
      </div>

      {/* 1. Students Tab */}
      {activeSubTab === 'students' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Form: Add/Edit Student */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs h-fit">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>{isEditingStudent ? '📝 编辑学员信息' : '➕ 注册新学员'}</span>
              {isEditingStudent && (
                <button
                  onClick={() => {
                    setIsEditingStudent(false);
                    setStudentForm({
                      name: '',
                      studentNo: '',
                      gender: 'male',
                      classId: classes[0]?.id || '',
                      currentLevel: levels[0] || 'BF1',
                      status: 'active',
                      contactPhone: '',
                      parentNote: ''
                    });
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  取消编辑
                </button>
              )}
            </h3>

            <form onSubmit={handleSaveStudent} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  学员姓名 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={studentForm.name || ''}
                  onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
                  placeholder="例如: 李晓明"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">学号 / 档案编号</label>
                  <input
                    type="text"
                    value={studentForm.studentNo || ''}
                    onChange={e => setStudentForm({ ...studentForm, studentNo: e.target.value })}
                    placeholder="留空自动生成"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">性别</label>
                  <select
                    value={studentForm.gender || 'male'}
                    onChange={e => setStudentForm({ ...studentForm, gender: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800 cursor-pointer"
                  >
                    <option value="male">👦 男生 (Male)</option>
                    <option value="female">👧 女生 (Female)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">所属班级</label>
                  <select
                    value={studentForm.classId || ''}
                    onChange={e => {
                      const newClassId = e.target.value;
                      const matchedClass = classes.find(c => c.id === newClassId);
                      setStudentForm({
                        ...studentForm,
                        classId: newClassId,
                        // Auto-fill student level if changing to a valid class
                        currentLevel: matchedClass ? (matchedClass.currentLevel || matchedClass.level || studentForm.currentLevel) : studentForm.currentLevel
                      });
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800 cursor-pointer"
                  >
                    <option value="">-- 暂不分班 (未分配) --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.currentLevel || c.level})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">当前在读级别</label>
                  <select
                    value={studentForm.currentLevel || (levels[0] || 'BF1')}
                    onChange={e => setStudentForm({ ...studentForm, currentLevel: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800 cursor-pointer"
                  >
                    {levels.map(l => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">在读状态</label>
                  <select
                    value={studentForm.status || 'active'}
                    onChange={e => setStudentForm({ ...studentForm, status: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800 cursor-pointer"
                  >
                    <option value="active">🟢 正常在读 (Active)</option>
                    <option value="suspended">⏸️ 休学 / 结业 (Suspended)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">家长联系电话</label>
                  <input
                    type="text"
                    value={studentForm.contactPhone || ''}
                    onChange={e => setStudentForm({ ...studentForm, contactPhone: e.target.value })}
                    placeholder="选填"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">家长沟通与特别备注</label>
                <textarea
                  value={studentForm.parentNote || ''}
                  onChange={e => setStudentForm({ ...studentForm, parentNote: e.target.value })}
                  placeholder="例如: 英语基础好，建议加强长难句听力..."
                  rows={2}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition shadow-xs cursor-pointer"
              >
                {isEditingStudent ? '保存学员修改' : '确认添加学员'}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-100">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                批量导入学员 (Excel / CSV)
              </label>
              <label className="w-full py-2 border border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-800 rounded-lg flex items-center justify-center font-semibold cursor-pointer transition">
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                选择 Excel/CSV 文件导入
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelImport}
                  className="hidden"
                />
              </label>
              <p className="text-[10px] text-slate-400 mt-1">
                支持包含表头列：【姓名】、【学号】、【性别】、【班级】、【级别】
              </p>
            </div>
          </div>

          {/* Right Table: Students List */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <UserCheck className="w-4 h-4 mr-1.5 text-indigo-600" />
                在册学员总览 ({filteredStudents.length}/{students.length} 人)
              </h3>

              <div className="flex items-center space-x-2">
                <select
                  value={studentClassFilter}
                  onChange={e => setStudentClassFilter(e.target.value)}
                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer"
                >
                  <option value="all">全部班级 ({students.length})</option>
                  <option value="unassigned">
                    未分班学员 ({students.filter(s => !s.classId || !classes.some(c => c.id === s.classId)).length})
                  </option>
                  {classes.map(c => {
                    const cnt = students.filter(s => s.classId === c.id).length;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} ({cnt}人)
                      </option>
                    );
                  })}
                </select>

                <input
                  type="text"
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  placeholder="搜索姓名/学号..."
                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">学号</th>
                    <th className="py-2.5 px-3">姓名</th>
                    <th className="py-2.5 px-3">班级</th>
                    <th className="py-2.5 px-3">在读级别</th>
                    <th className="py-2.5 px-3">状态</th>
                    <th className="py-2.5 px-3">联系方式</th>
                    <th className="py-2.5 px-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map(student => (
                    <tr key={student.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-mono text-slate-500">{student.studentNo}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {student.name}
                        {student.gender === 'female' ? (
                          <span className="ml-1 text-rose-500">👧</span>
                        ) : (
                          <span className="ml-1 text-blue-500">👦</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {classes.find(c => c.id === student.classId)?.name || (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            未分班
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                          {student.currentLevel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {student.status === 'active' ? (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                            在读
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px]">
                            休学
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{student.contactPhone || '-'}</td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleEditStudentClick(student)}
                          className="p-1 text-slate-600 hover:text-indigo-600 rounded cursor-pointer mr-1"
                          title="编辑档案"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              title: `确定删除学员【${student.name}】？`,
                              message: `确定从数据库中注销学员【${student.name}】吗？若已有成绩档案，建议设置为【休学】而非直接删除。`,
                              confirmText: '确认删除学员',
                              variant: 'danger',
                              onConfirm: () => {
                                deleteStudent(student.id);
                              }
                            });
                          }}
                          className="p-1 text-rose-500 hover:text-rose-700 rounded cursor-pointer"
                          title="删除学员"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. Classes Tab */}
      {activeSubTab === 'classes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs h-fit">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>{isEditingClass ? '📝 编辑班级设置' : '➕ 开设新教学班'}</span>
              {isEditingClass && (
                <button
                  onClick={() => {
                    setIsEditingClass(false);
                    setClassForm({
                      name: '',
                      teacherName: teachers[0] || '',
                      currentLevel: levels[0] || 'BF1',
                      academicYear: '2025春季'
                    });
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  取消编辑
                </button>
              )}
            </h3>

            <form onSubmit={handleSaveClass} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  班级全称 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={classForm.name || ''}
                  onChange={e => setClassForm({ ...classForm, name: e.target.value })}
                  placeholder="例如: 2025春季BF2精英班"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">主讲执教老师</label>
                <select
                  value={classForm.teacherName || (teachers[0] || '')}
                  onChange={e => setClassForm({ ...classForm, teacherName: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800 cursor-pointer"
                >
                  {teachers.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">当前主授级别</label>
                  <select
                    value={classForm.currentLevel || (levels[0] || 'BF1')}
                    onChange={e => setClassForm({ ...classForm, currentLevel: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800 cursor-pointer"
                  >
                    {levels.map(l => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">学年学期</label>
                  <input
                    type="text"
                    value={classForm.academicYear || ''}
                    onChange={e => setClassForm({ ...classForm, academicYear: e.target.value })}
                    placeholder="例如: 2025春季"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800"
                  />
                </div>
              </div>

              {isEditingClass && (
                <div className="p-2.5 rounded-lg bg-indigo-50/80 border border-indigo-100 text-[11px] text-indigo-800 leading-relaxed">
                  💡 <strong>联动提示</strong>：修改班级主授级别后，该班级下所有在读学员（当前 {students.filter(s => s.classId === classForm.id).length} 人）的【在读级别】将自动同步更新为所选级别。
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition shadow-xs cursor-pointer"
              >
                {isEditingClass ? '保存班级修改并同步学员级别' : '确认创建班级'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center">
              <GraduationCap className="w-4 h-4 mr-1.5 text-indigo-600" />
              已开设班级列表 ({classes.length} 个班级)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {classes.map(c => {
                const classStudentCount = students.filter(s => s.classId === c.id).length;
                return (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800">
                          {c.currentLevel || c.level}
                        </span>
                        <span className="text-xs text-slate-400">{c.academicYear}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-base mt-2">{c.name}</h4>
                      <div className="text-xs text-slate-500 mt-1">
                        主讲教师: <strong className="text-slate-700">{c.teacherName}</strong>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        在读学员数: <strong className="text-indigo-600">{classStudentCount} 人</strong>
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEditClassClick(c)}
                        className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded text-xs hover:bg-slate-50 font-medium cursor-pointer"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => {
                          if (classStudentCount > 0) {
                            setConfirmDialog({
                              isOpen: true,
                              title: `确定解散删除班级【${c.name}】？`,
                              message: `该班级目前有 ${classStudentCount} 名在读学员。\n\n删除该班级后：\n• 该班级将从班级列表中彻底移除；\n• 这 ${classStudentCount} 名学员将转为「未分班」状态（学员档案及历史测验成绩完整保留）；\n• 您可在学员名册中随时为他们重新分配班级。`,
                              confirmText: `解散班级 (${classStudentCount}名学员转未分班)`,
                              variant: 'danger',
                              onConfirm: () => {
                                deleteClass(c.id);
                                showToast(`已解散班级【${c.name}】，${classStudentCount}名学员已转入未分班状态`);
                              }
                            });
                          } else {
                            setConfirmDialog({
                              isOpen: true,
                              title: `确定删除班级【${c.name}】？`,
                              message: `确定从系统中删除班级【${c.name}】吗？此操作将立即从班级列表中移除该班级。`,
                              confirmText: '确认删除班级',
                              variant: 'danger',
                              onConfirm: () => {
                                deleteClass(c.id);
                                showToast(`已删除班级【${c.name}】`);
                              }
                            });
                          }
                        }}
                        className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded text-xs hover:bg-rose-100 font-medium cursor-pointer"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. System Config Tab */}
      {activeSubTab === 'system_config' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Levels Configuration */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center">
                <Layers className="w-4 h-4 mr-1.5 text-indigo-600" />
                考评级别梯队管理 (BF1 ~ E4)
              </span>
              <span className="text-xs text-slate-400">{levels.length} 个级别</span>
            </h3>

            <div className="flex space-x-2 my-3">
              <input
                type="text"
                value={newLevelInput}
                onChange={e => setNewLevelInput(e.target.value)}
                placeholder="新增级别 (如: BF4, NM2)..."
                className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs uppercase"
              />
              <button
                onClick={handleAddLevel}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                添加
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {levels.map(l => (
                <div
                  key={l}
                  className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg text-xs font-bold flex items-center space-x-1.5"
                >
                  <span>{l}</span>
                  <button
                    onClick={() => handleRemoveLevel(l)}
                    className="text-indigo-400 hover:text-rose-600 cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Units Configuration */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center">
                <Tag className="w-4 h-4 mr-1.5 text-indigo-600" />
                测验单元 (Units) 设定
              </span>
              <span className="text-xs text-slate-400">{units.length} 个单元</span>
            </h3>

            <div className="flex space-x-2 my-3">
              <input
                type="text"
                value={newUnitInput}
                onChange={e => setNewUnitInput(e.target.value)}
                placeholder="新增单元 (如: U5 (Unit 5))..."
                className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              <button
                onClick={handleAddUnit}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                添加
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {units.map(u => (
                <div
                  key={u}
                  className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-800 rounded-lg text-xs font-medium flex items-center space-x-1.5"
                >
                  <span>{u}</span>
                  <button
                    onClick={() => handleRemoveUnit(u)}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Teachers Roster */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center">
                <Users className="w-4 h-4 mr-1.5 text-indigo-600" />
                执教教师花名册
              </span>
              <span className="text-xs text-slate-400">{teachers.length} 位老师</span>
            </h3>

            <div className="flex space-x-2 my-3">
              <input
                type="text"
                value={newTeacherInput}
                onChange={e => setNewTeacherInput(e.target.value)}
                placeholder="新增教师姓名 (如: 孙老师)..."
                className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              <button
                onClick={handleAddTeacher}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                添加
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {teachers.map(t => (
                <div
                  key={t}
                  className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold flex items-center space-x-1.5"
                >
                  <span>{t}</span>
                  <button
                    onClick={() => handleRemoveTeacher(t)}
                    className="text-emerald-400 hover:text-rose-600 cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Weak Points Default Tags */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center">
                <Tag className="w-4 h-4 mr-1.5 text-indigo-600" />
                快捷失分标签库
              </span>
              <span className="text-xs text-slate-400">{weakPointTags.length} 个快捷标签</span>
            </h3>

            <div className="flex space-x-2 my-3">
              <input
                type="text"
                value={newTagInput}
                onChange={e => setNewTagInput(e.target.value)}
                placeholder="新增考点/短板标签..."
                className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              <button
                onClick={handleAddTag}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                添加
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 max-h-40 overflow-y-auto">
              {weakPointTags.map(tag => (
                <div
                  key={tag}
                  className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-md text-xs flex items-center space-x-1.5"
                >
                  <span>{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-amber-400 hover:text-rose-600 cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Gist Sync Tab */}
      {activeSubTab === 'gist_sync' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs max-w-3xl">
          <div className="flex items-start space-x-3 mb-4">
            <div className="p-3 rounded-xl bg-slate-900 text-white">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                GitHub Gist 云端跨端多教师协同同步
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                只需配置一个 GitHub Personal Access Token (PAT)，系统即可自动将全校成绩数据加密保存在您的私有 Gist 空间中，实现多位教师跨电脑、跨手机实时同步录入与智能无损合并。
              </p>
            </div>
          </div>

          {/* Sync Status Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 my-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {syncStatus === 'syncing' ? (
                <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
              ) : syncStatus === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : syncStatus === 'error' ? (
                <AlertCircle className="w-5 h-5 text-rose-600" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-slate-400" />
              )}

              <div>
                <div className="text-xs font-bold text-slate-800">
                  {syncStatus === 'syncing'
                    ? '正在与 GitHub Gist 节点握手同步...'
                    : syncStatus === 'success'
                    ? '云端数据已与本地完全同步'
                    : syncStatus === 'error'
                    ? `同步失败: ${syncError}`
                    : 'Gist 协同待命就绪'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {lastSyncTime ? `上次成功同步时间: ${lastSyncTime}` : '暂无云端同步记录'}
                </div>
              </div>
            </div>

            <button
              onClick={manualSync}
              disabled={syncStatus === 'syncing'}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold flex items-center transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              立即手动双向同步
            </button>
          </div>

          <form onSubmit={handleSaveGistConfig} className="space-y-4 text-xs mt-6">
            <div>
              <label className="block font-semibold text-slate-800 mb-1 flex items-center">
                <Key className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                GitHub Personal Access Token (classic 或 fine-grained, 勾选 gist 权限)
              </label>
              <input
                type="password"
                value={gistToken || ''}
                onChange={e => setGistToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Token 仅保存在浏览器本地，用于调用 GitHub 官方 API，确保机构数据自主可控。
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Gist ID (留空则首次同步时系统自动在您的账号下新建私有 Gist)
              </label>
              <input
                type="text"
                value={gistId || ''}
                onChange={e => setGistId(e.target.value)}
                placeholder="例如: 8a7d3bf62c129e928f09..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">您的教师代号 / 姓名</label>
                <input
                  type="text"
                  value={teacherNameInput || ''}
                  onChange={e => setTeacherNameInput(e.target.value)}
                  placeholder="例如: 王老师 (用于协同操作签名)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">后台自动同步频率 (秒)</label>
                <input
                  type="number"
                  min={15}
                  max={3600}
                  value={syncInterval ?? 30}
                  onChange={e => setSyncInterval(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="autoSyncCheckbox"
                checked={autoSync}
                onChange={e => setAutoSync(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
              />
              <label htmlFor="autoSyncCheckbox" className="font-semibold text-slate-700 cursor-pointer">
                启用后台静默自动同步 (多教师录入时实时汇聚成绩)
              </label>
            </div>

            {saveSuccessMsg && (
              <div className="p-2 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-200 font-semibold">
                {saveSuccessMsg}
              </div>
            )}

            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-lg text-xs transition cursor-pointer"
            >
              保存 Gist 同步配置
            </button>
          </form>
        </div>
      )}

      {/* 5. Backup & Restore Tab */}
      {activeSubTab === 'backup' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs max-w-2xl">
          <h3 className="text-base font-bold text-slate-900 mb-2">
            数据全量备份、灾备恢复与重置
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            您可以随时下载全系统完整 JSON 档案文件以做长期归档，或在更换浏览器、重置设备时导入还原。
          </p>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs text-slate-900">导出系统完整 JSON 备份</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  包含所有学员花名册、班级、历次测试成绩记录及自定义级别/标签配置
                </p>
              </div>
              <button
                onClick={handleExportFullBackup}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                下载备份文件
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs text-slate-900">导入恢复 JSON 备份文件</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  从此前下载的备份 JSON 还原所有历史数据
                </p>
              </div>
              <label className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center cursor-pointer">
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                选择备份文件恢复
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFullBackup}
                  className="hidden"
                />
              </label>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 flex items-center justify-between mt-6">
              <div>
                <h4 className="font-bold text-xs text-rose-900">恢复系统出厂示例演示数据</h4>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  重置清空当前所有修改，还原为包含 BF1-E4 完整演示学员与成绩的数据集
                </p>
              </div>
              <button
                onClick={() => {
                  setConfirmDialog({
                    isOpen: true,
                    title: '确定重置为出厂演示数据？',
                    message: '重置后您录入的最新成绩和学员将被初始数据覆盖。如果您有重要数据，请先点击上方【下载备份文件】。',
                    confirmText: '确认重置演示数据',
                    variant: 'danger',
                    onConfirm: () => {
                      resetToInitialData();
                    }
                  });
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                重置演示数据
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
