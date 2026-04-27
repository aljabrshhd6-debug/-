/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Eye,
  EyeOff,
  Lock,
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  History, 
  AlertCircle, 
  Calendar,
  Plus,
  Search,
  Check,
  X,
  RefreshCw,
  Clock,
  Phone,
  ChevronRight,
  Trash2,
  Settings as SettingsIcon,
  Smile,
  Frown,
  Star,
  Heart,
  UserCheck,
  UserX,
  Zap,
  Coffee,
  Sun,
  Moon,
  Flag,
  Mail,
  Globe,
  Tag,
  BookOpen,
  LogIn,
  LogOut
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Member, AttendanceRecord, AppSettings, IconMapping, Course, Trainee } from './types';
import { SAMPLE_MEMBERS } from './constants';
import { 
  auth, 
  db, 
  signInWithGoogle, 
  logout, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query,
  handleFirestoreError,
  OperationType
} from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

const AVAILABLE_ICONS = [
  { name: 'CheckSquare', icon: CheckSquare },
  { name: 'Users', icon: Users },
  { name: 'Smile', icon: Smile },
  { name: 'Frown', icon: Frown },
  { name: 'Check', icon: Check },
  { name: 'X', icon: X },
  { name: 'Star', icon: Star },
  { name: 'Heart', icon: Heart },
  { name: 'AlertCircle', icon: AlertCircle },
  { name: 'RefreshCw', icon: RefreshCw },
  { name: 'UserCheck', icon: UserCheck },
  { name: 'UserX', icon: UserX },
  { name: 'Zap', icon: Zap },
  { name: 'Coffee', icon: Coffee },
  { name: 'Sun', icon: Sun },
  { name: 'Moon', icon: Moon },
  { name: 'Flag', icon: Flag },
  { name: 'Tag', icon: Tag },
];

const DEFAULT_SETTINGS: AppSettings = {
  icons: {
    activeMember: 'CheckSquare',
    expiredMember: 'AlertCircle',
    present: 'Check',
    absent: 'X',
    compensation: 'RefreshCw'
  },
  financialPassword: '1234',
  teachers: ['أ. ندى', 'أ. مشاعل', 'أ. ليلى', 'أ. احمد', 'أ. علي']
};

type View = 'dashboard' | 'accountant' | 'courses' | 'courses_list' | 'courses_add' | 'courses_trainees' | 'courses_trainee_add' | 'course_fun' | 'course_rose' | 'course_bread' | 'attendance' | 'members' | 'compensation' | 'expiry' | 'settings' | 'about' | string;

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showTotalAmount, setShowTotalAmount] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notif, setNotif] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [members, setMembers] = useState<Member[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const showNotif = (message: string, type: 'success' | 'error' = 'success') => {
    setNotif({message, type});
    setTimeout(() => setNotif(null), 3000);
  };

  const verifyPassword = () => {
    const SECRET_PASSWORD = settings.financialPassword || '1234'; 
    if (passwordInput === SECRET_PASSWORD) {
      setShowTotalAmount(true);
      setIsPasswordModalOpen(false);
      setPasswordInput('');
      setPasswordError(false);
      showNotif('تم عرض المبالغ بنجاح', 'success');
    } else {
      setPasswordError(true);
    }
  };

  // Data Listeners
  useEffect(() => {
    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
      setMembers(data.sort((a, b) => (b.id > a.id ? 1 : -1)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'members');
    });

    const unsubCourses = onSnapshot(collection(db, 'courses'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setCourses(data.sort((a, b) => (b.id > a.id ? 1 : -1)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'courses');
    });

    const unsubTrainees = onSnapshot(collection(db, 'trainees'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trainee));
      setTrainees(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'trainees');
    });

    const unsubAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      setAttendance(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'attendance');
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as AppSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });

    return () => {
      unsubMembers();
      unsubCourses();
      unsubTrainees();
      unsubAttendance();
      unsubSettings();
    };
  }, []);

  const [newCourse, setNewCourse] = useState<Partial<Course>>({
    title: '',
    instructor: '',
    startDate: '',
    endDate: '',
    price: '',
    description: '',
    capacity: 20,
    status: 'upcoming'
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [detailsCourse, setDetailsCourse] = useState<Course | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [newTrainee, setNewTrainee] = useState<Partial<Trainee>>({
    fullName: '',
    motherPhone: '',
    courseId: '',
    duration: '',
    amount: '',
    paymentMethod: 'لم يتم الدفع',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMemberStats, setEditingMemberStats] = useState<{
    id: string;
    name: string;
    attendedCount: number;
    absentCount: number;
    compensationSessions: number;
  } | null>(null);

  const [newMember, setNewMember] = useState<Partial<Member>>({
    name: '',
    phone: '',
    startDate: '',
    endDate: '',
    subscriptionDays: 30,
    sessionsCount: 12,
    grade: 'التأسيس',
    subjects: 'حقيبة كاملة',
    price: '700',
    paidAmount: '700',
    paymentMethod: 'كاش',
    paymentDate: '',
    teacherName: ''
  });

  // Helper for Remaining Days
  const getRemainingDays = (endDate: string) => {
    if (!endDate) return 0;
    try {
      const end = new Date(endDate);
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      const diff = end.getTime() - start.getTime();
      return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    } catch (e) {
      return 0;
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const activeMembers = members.filter(m => m.status === 'active');
    const expiredMembers = members.filter(m => m.status === 'expired');
    const exp_soon = members.filter(m => {
      if (!m.endDate) return false;
      const end = new Date(m.endDate);
      const diff = end.getTime() - new Date().getTime();
      const days = diff / (1000 * 3600 * 24);
      return days > 0 && days <= 7;
    });

    return {
      total: members.length,
      active: activeMembers.length,
      expired: expiredMembers.length,
      expiringSoon: exp_soon.length,
      compensationPending: members.reduce((acc, curr) => acc + (curr.compensationSessions || 0), 0),
      unpaid: members.filter(m => m.paymentMethod === 'لم يتم الدفع').length
    };
  }, [members]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMember.name || !newMember.startDate || !newMember.endDate) {
      showNotif('يرجى ملء جميع الحقول المطلوبة (الاسم، تاريخ البدء، تاريخ الانتهاء)', 'error');
      return;
    }

    const id = Math.random().toString(36).substr(2, 9);
    const member: Member = {
      id,
      name: newMember.name!,
      phone: newMember.phone || '',
      startDate: newMember.startDate!,
      endDate: newMember.endDate!,
      status: 'active',
      sessionsCount: newMember.sessionsCount!,
      attendedCount: 0,
      absentCount: 0,
      compensationSessions: 0,
      subscriptionDays: newMember.subscriptionDays,
      grade: newMember.grade,
      subjects: newMember.subjects,
      price: newMember.price,
      paidAmount: newMember.paidAmount,
      paymentMethod: newMember.paymentMethod as any,
      paymentDate: newMember.paymentDate || new Date().toISOString().split('T')[0],
      teacherName: newMember.teacherName
    };

    try {
      await setDoc(doc(db, 'members', id), member);
      setIsAddModalOpen(false);
      showNotif('تمت إضافة المشترك بنجاح');
      setNewMember({ 
        name: '', 
        phone: '', 
        startDate: '', 
        endDate: '', 
        subscriptionDays: 30,
        sessionsCount: 12,
        grade: 'التأسيس',
        subjects: 'حقيبة كاملة',
        price: '700',
        paidAmount: '700',
        paymentMethod: 'كاش',
        paymentDate: '',
        teacherName: ''
      });
    } catch (err) {
      console.error("Error adding member:", err);
      handleFirestoreError(err, OperationType.WRITE, `members/${id}`);
    }
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.title || !newCourse.instructor) return;

    const id = Math.random().toString(36).substr(2, 9);
    const course: Course = {
      id,
      title: newCourse.title!,
      instructor: newCourse.instructor!,
      startDate: newCourse.startDate || '',
      endDate: newCourse.endDate || '',
      capacity: newCourse.capacity || 20,
      enrolledCount: 0,
      status: 'upcoming',
      price: newCourse.price || '0',
      description: newCourse.description || ''
    };

    try {
      await setDoc(doc(db, 'courses', id), course);
      setView('courses_list');
      showNotif('تم حفظ الدورة بنجاح');
      setNewCourse({
        title: '',
        instructor: '',
        startDate: '',
        endDate: '',
        price: '',
        description: '',
        capacity: 20,
        status: 'upcoming'
      });
    } catch (err) {
      console.error("Error saving course:", err);
      handleFirestoreError(err, OperationType.WRITE, `courses/${id}`);
    }
  };

  const handleRegisterTrainee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrainee.fullName || !newTrainee.courseId) return;

    const id = Math.random().toString(36).substr(2, 9);
    const trainee: Trainee = {
      id,
      fullName: newTrainee.fullName!,
      motherPhone: newTrainee.motherPhone || '',
      courseId: newTrainee.courseId!,
      duration: newTrainee.duration || '',
      amount: newTrainee.amount || '',
      paymentMethod: newTrainee.paymentMethod as any,
      date: newTrainee.date!,
      notes: newTrainee.notes
    };

    try {
      await setDoc(doc(db, 'trainees', id), trainee);
      // Update enrolledCount in course
      const course = courses.find(c => c.id === trainee.courseId || c.title === trainee.courseId);
      if (course) {
        await updateDoc(doc(db, 'courses', course.id), {
          enrolledCount: (course.enrolledCount || 0) + 1
        });
      }
      setView('courses_trainees');
      showNotif('تم تسجيل المتدرب بنجاح');
      setNewTrainee({
        fullName: '',
        motherPhone: '',
        courseId: '',
        duration: '',
        amount: '',
        paymentMethod: 'لم يتم الدفع',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    } catch (err) {
      console.error("Error registering trainee:", err);
      handleFirestoreError(err, OperationType.WRITE, `trainees/${id}`);
    }
  };

  const renewMember = async (id: string) => {
    const m = members.find(m => m.id === id);
    if (!m) return;
    
    const currentEnd = new Date(m.endDate);
    const today = new Date();
    const baseDate = currentEnd > today ? currentEnd : today;
    const newEnd = new Date(baseDate);
    newEnd.setMonth(newEnd.getMonth() + 1);
    
    try {
      await updateDoc(doc(db, 'members', id), {
        status: 'active',
        endDate: newEnd.toISOString().split('T')[0]
      });
      showNotif('تم تجديد الاشتراك بنجاح');
    } catch (err) {
      console.error("Error renewing member:", err);
      handleFirestoreError(err, OperationType.UPDATE, `members/${id}`);
    }
  };

  const deleteMember = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'members', id));
      showNotif('تم حذف المشترك');
    } catch (err) {
      console.error("Error deleting member:", err);
      handleFirestoreError(err, OperationType.DELETE, `members/${id}`);
    }
  };

  const deleteCourse = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'courses', id));
      showNotif('تم حذف الدورة');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `courses/${id}`);
    }
  };

  const handleUpdateStats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMemberStats) return;
    
    try {
      await updateDoc(doc(db, 'members', editingMemberStats.id), {
        attendedCount: Number(editingMemberStats.attendedCount), 
        absentCount: Number(editingMemberStats.absentCount), 
        compensationSessions: Number(editingMemberStats.compensationSessions)
      });
      setEditingMemberStats(null);
    } catch (err) {
      console.error("Error updating stats:", err);
    }
  };

  const resetAllStats = async () => {
    try {
      const promises = members.map(m => 
        updateDoc(doc(db, 'members', m.id), {
          attendedCount: 0,
          absentCount: 0,
          compensationSessions: 0
        })
      );
      // Also clear attendance records
      const attendancePromises = attendance.map(a => deleteDoc(doc(db, 'attendance', a.id)));
      await Promise.all([...promises, ...attendancePromises]);
      showNotif('تم تصفير الإحصائيات بنجاح');
    } catch (err) {
      console.error("Error resetting stats:", err);
      showNotif('فشل في تصفير الإحصائيات', 'error');
    }
  };

  const updatePayment = async (memberId: string, method: 'كاش' | 'تحويل') => {
    const m = members.find(m => m.id === memberId);
    if (!m) return;

    try {
      await updateDoc(doc(db, 'members', memberId), {
        paymentMethod: method,
        paidAmount: m.price,
        paymentDate: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      console.error("Error updating payment:", err);
    }
  };

  // Sync settings with Firestore
  const updateSettings = async (newSettings: AppSettings) => {
    try {
      await setDoc(doc(db, 'settings', 'global'), newSettings);
    } catch (err) {
      console.error("Error updating settings:", err);
    }
  };

  const DynamicIcon = ({ name, size = 18, className = "" }: { name: string, size?: number, className?: string }) => {
    const IconComponent = (Icons as any)[name] || Icons.HelpCircle;
    return <IconComponent size={size} className={className} />;
  };

  // Sidebar Items
  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { 
      id: 'courses', 
      label: 'الدورات', 
      icon: BookOpen,
      children: [
        { id: 'courses_list', label: 'قائمة الدورات' },
        { id: 'courses_add', label: 'إضافة دورة' },
        { id: 'courses_trainees', label: 'تسجيل المتدربين' },
        { id: 'course_fun', label: 'ساعة مرح وساعة فن' },
        { id: 'course_rose', label: 'ورشة صناعة الورد المخملي' },
        { id: 'course_bread', label: 'فن خبز المسح' },
      ]
    },
    { 
      id: 'attendance', 
      label: 'تسجيل الحضور', 
      icon: CheckSquare,
      children: (settings.teachers || []).map(t => ({ id: `attendance_${t}`, label: t, teacherName: t }))
    },
    { 
      id: 'members', 
      label: 'المشتركين', 
      icon: Users,
      children: (settings.teachers || []).map(t => ({ id: `members_${t}`, label: t, teacherName: t }))
    },
    { id: 'accountant', label: 'المحاسبة المالية', icon: Icons.Calculator },
    { id: 'compensation', label: 'التعويض', icon: RefreshCw },
    { id: 'expiry', label: 'انتهاء المدة', icon: Clock },
    { id: 'about', label: 'عن الجمعية', icon: Heart },
    { id: 'settings', label: 'الإعدادات', icon: SettingsIcon },
  ];

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.name.includes(searchQuery) || m.phone.includes(searchQuery);
    
    // Check if current view is a teacher-specific view
    const currentNavItem = navItems.find(item => 
      item.id === view || (item.children && item.children.find((c: any) => c.id === view))
    );
    
    if (view.startsWith('members_')) {
      return matchesSearch && m.teacherName === view.replace('members_', '');
    }

    if (view.startsWith('attendance_')) {
      return matchesSearch && m.teacherName === view.replace('attendance_', '');
    }
    
    return matchesSearch;
  });

  const markAttendance = async (memberId: string, status: 'present' | 'absent' | 'absent_compensated' | 'compensated') => {
    const today = new Date().toISOString().split('T')[0];
    const id = Math.random().toString(36).substr(2, 9);
    const newRecord: AttendanceRecord = {
      id,
      memberId,
      date: today,
      status
    };
    
    try {
      await setDoc(doc(db, 'attendance', id), newRecord);
      
      const m = members.find(m => m.id === memberId);
      if (m) {
        await updateDoc(doc(db, 'members', memberId), {
          attendedCount: (status === 'present' || status === 'compensated') ? m.attendedCount + 1 : m.attendedCount,
          absentCount: (status === 'absent' || status === 'absent_compensated') ? m.absentCount + 1 : m.absentCount,
          compensationSessions: status === 'absent_compensated' 
            ? m.compensationSessions + 1 
            : (status === 'compensated' && m.compensationSessions > 0 ? m.compensationSessions - 1 : m.compensationSessions)
        });
      }
      showNotif('تم تسجيل الحضور بنجاح');
    } catch (err) {
      console.error("Error marking attendance:", err);
      showNotif('حدث خطأ أثناء تحضير الطالب', 'error');
    }
  };

  if (false && authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-natural-bg" dir="rtl">
        <div className="text-center">
          <RefreshCw className="animate-spin text-natural-accent mx-auto mb-4" size={48} />
          <p className="text-natural-sidebar font-bold">جاري تحميل النظام...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-natural-bg text-natural-primary font-sans relative" dir="rtl">
      {/* Toast Notification */}
      <AnimatePresence>
        {notif && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '50%' }}
            animate={{ opacity: 1, y: 20, x: '50%' }}
            exit={{ opacity: 0, y: -20, x: '50%' }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border ${
              notif.type === 'success' 
                ? 'bg-green-500 text-white border-green-400' 
                : 'bg-red-500 text-white border-red-400'
            }`}
          >
            {notif.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
            <span className="font-bold">{notif.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[40]"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 right-0 z-[50]
        w-64 bg-natural-sidebar border-l border-natural-border flex flex-col text-white
        transition-transform duration-300 transform
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3 text-white">
            <div className="bg-white p-1 rounded-lg overflow-hidden flex items-center justify-center w-10 h-10 shadow-sm transition-transform hover:scale-105">
              <img 
                src="/logo (4).jpg" 
                alt="شعار الجمعية" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    const icon = document.createElement('div');
                    icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-star"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
                    icon.className = "text-natural-accent";
                    parent.appendChild(icon);
                  }
                }}
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-[13px] font-bold tracking-tight leading-tight">الجمعية التعاونية إبداع</h1>
              <span className="text-[10px] text-white/60">لتعزيز الموهبة</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <div key={item.id} className="space-y-1">
              <button
                onClick={() => setView(item.id as View)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  view === item.id || (item.children && item.children.some((c: any) => c.id === view))
                    ? 'bg-natural-accent text-white font-medium shadow-lg shadow-natural-accent/20' 
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon size={20} />
                <span className="flex-1 text-right">{item.label}</span>
              </button>
              
              {item.children && (view === item.id || item.children.some((c: any) => c.id === view)) && (
                <div className="mr-6 space-y-1 mt-1 border-r border-white/10 pr-2">
                  {item.children.map((child: any) => (
                    <button
                      key={child.id}
                      onClick={() => setView(child.id as View)}
                      className={`w-full text-right px-4 py-2 rounded-lg text-xs transition-all ${
                        view === child.id 
                          ? 'text-white font-bold bg-white/10' 
                          : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                      }`}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">تاريخ اليوم</p>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-natural-accent">{new Date().toLocaleDateString('ar-SA')} م</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-natural-border px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-natural-bg rounded-lg text-natural-sidebar"
            >
              <Icons.Menu size={24} />
            </button>
            <div className="header-title">
              <h2 className="text-base lg:text-lg font-semibold text-natural-sidebar">
              {(() => {
                const item = navItems.find(n => n.id === view);
                if (item) return item.label;
                const parent = navItems.find(n => n.children?.some((c: any) => c.id === view));
                if (parent) {
                  const child = parent.children?.find((c: any) => c.id === view);
                  return `${parent.label} - ${(child as any).label}`;
                }
                return '';
              })()}
            </h2>
            <div className="flex items-center gap-4 mt-1 bg-natural-bg/50 px-4 py-2 rounded-2xl border border-natural-border/50">
              <div className="flex items-center gap-2">
                <div className="bg-natural-accent/10 p-1.5 rounded-lg">
                  <Clock size={16} className="text-natural-accent" />
                </div>
                <span className="text-sm font-bold text-natural-sidebar">
                  {new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(new Date())}
                </span>
              </div>
              <span className="text-natural-border/50">|</span>
              <div className="flex flex-col">
                <span className="text-[10px] text-natural-secondary leading-none mb-0.5">الميلادي</span>
                <span className="text-xs font-medium text-natural-sidebar">{new Date().toLocaleDateString('en-CA')}</span>
              </div>
            </div>
          </div>
        </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-natural-secondary" size={18} />
              <input 
                type="text" 
                placeholder="بحث..." 
                className="bg-natural-bg border-none rounded-lg pr-10 pl-4 py-2 text-sm w-64 focus:ring-2 focus:ring-natural-accent outline-none transition-all"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {/* Modal */}
            {isAddModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsAddModalOpen(false)}
                  className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-8 relative z-10 shadow-2xl border border-natural-border custom-scrollbar"
                >
                  <h3 className="text-xl font-bold mb-6 text-natural-sidebar sticky top-0 bg-white z-10 pb-2">إضافة مشترك جديد</h3>
                  <form onSubmit={handleAddMember} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-natural-secondary mb-1">الاسم</label>
                      <input 
                        type="text" 
                        required
                        className="w-full p-3 bg-natural-bg border-none rounded-xl focus:ring-2 focus:ring-natural-accent outline-none"
                        value={newMember.name}
                        onChange={e => setNewMember({...newMember, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-natural-secondary mb-1">رقم الهاتف</label>
                      <input 
                        type="tel" 
                        className="w-full p-3 bg-natural-bg border-none rounded-xl focus:ring-2 focus:ring-natural-accent outline-none"
                        value={newMember.phone}
                        onChange={e => setNewMember({...newMember, phone: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-sm font-medium text-natural-secondary">تاريخ البدء</label>
                          <button 
                            type="button" 
                            onClick={() => {
                              const today = new Date().toISOString().split('T')[0];
                              setNewMember({...newMember, startDate: today});
                            }}
                            className="text-[10px] text-natural-accent hover:underline font-bold"
                          >
                            اليوم
                          </button>
                        </div>
                        <input 
                          type="date" 
                          required
                          className="w-full p-3 bg-natural-bg border-none rounded-xl focus:ring-2 focus:ring-natural-accent outline-none text-sm text-natural-primary text-center"
                          value={newMember.startDate}
                          onChange={e => {
                            const start = e.target.value;
                            let newEnd = newMember.endDate;
                            if (start && newMember.subscriptionDays) {
                              try {
                                const d = new Date(start);
                                d.setDate(d.getDate() + (newMember.subscriptionDays || 0));
                                if (!isNaN(d.getTime())) {
                                  newEnd = d.toISOString().split('T')[0];
                                }
                              } catch(err) {}
                            }
                            setNewMember({...newMember, startDate: start, endDate: newEnd});
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-natural-secondary mb-1">مدة الاشتراك (يوم)</label>
                        <input 
                          type="number" 
                          className="w-full p-3 bg-natural-bg border-none rounded-xl focus:ring-2 focus:ring-natural-accent outline-none font-bold text-center"
                          value={newMember.subscriptionDays || ''}
                          onChange={e => {
                            const days = parseInt(e.target.value) || 0;
                            let newEnd = newMember.endDate;
                            if (newMember.startDate && newMember.startDate.length === 10) {
                              try {
                                const d = new Date(newMember.startDate);
                                d.setDate(d.getDate() + days);
                                if (!isNaN(d.getTime())) {
                                  newEnd = d.toISOString().split('T')[0];
                                }
                              } catch(err) {}
                            }
                            setNewMember({...newMember, subscriptionDays: days, endDate: newEnd});
                          }}
                        />
                        <p className="text-[10px] text-natural-secondary mt-1 text-center font-bold">ينتهي في: {newMember.endDate || '-'}</p>
                      </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-natural-secondary mb-1">تاريخ الانتهاء</label>
                        <input 
                          type="date" 
                          required
                          className="w-full p-3 bg-natural-bg border-none rounded-xl focus:ring-2 focus:ring-natural-accent outline-none text-sm text-natural-primary text-center"
                          value={newMember.endDate}
                          onChange={e => setNewMember({...newMember, endDate: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-natural-secondary mb-1">المعلم/ة</label>
                        <input 
                          list="teachersList"
                          className="w-full p-3 bg-natural-bg border-none rounded-xl focus:ring-2 focus:ring-natural-accent outline-none text-sm"
                          value={newMember.teacherName}
                          onChange={e => setNewMember({...newMember, teacherName: e.target.value})}
                          placeholder="اختر أو اكتب اسم المعلم"
                        />
                        <datalist id="teachersList">
                          {(settings.teachers || []).map(teacher => (
                            <option key={teacher} value={teacher} />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-natural-secondary mb-1">الصف</label>
                        <input 
                          list="gradesList"
                          className="w-full p-3 bg-natural-bg border-none rounded-xl focus:ring-2 focus:ring-natural-accent outline-none text-sm"
                          value={newMember.grade}
                          onChange={e => setNewMember({...newMember, grade: e.target.value})}
                          placeholder="اختر أو اكتب الصف"
                        />
                        <datalist id="gradesList">
                          <option value="التأسيس" />
                          <option value="الابتدائي" />
                          <option value="ثاني" />
                          <option value="ثالث" />
                          <option value="رابع" />
                          <option value="خامس" />
                          <option value="سادس" />
                          <option value="اول متوسط" />
                        </datalist>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-natural-secondary mb-1">عدد المواد</label>
                        <input 
                          list="subjectsList"
                          className="w-full p-3 bg-natural-bg border-none rounded-xl focus:ring-2 focus:ring-natural-accent outline-none text-sm"
                          value={newMember.subjects}
                          onChange={e => setNewMember({...newMember, subjects: e.target.value})}
                          placeholder="اختر أو اكتب المواد"
                        />
                        <datalist id="subjectsList">
                          <option value="حقيبة كاملة" />
                          <option value="انجليزي" />
                          <option value="رياضيات" />
                          <option value="لغتي" />
                          <option value="رياضيات والانجليزي" />
                        </datalist>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-natural-secondary mb-1">عدد الحصص</label>
                        <input 
                          type="text" 
                          className="w-full p-3 bg-natural-bg border-none rounded-xl focus:ring-2 focus:ring-natural-accent outline-none font-bold"
                          placeholder="مثلاً: 12"
                          value={newMember.sessionsCount || ''}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '' || /^\d+$/.test(val)) {
                              setNewMember({...newMember, sessionsCount: val === '' ? 0 : parseInt(val)})
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-natural-secondary mb-1">السعر (ر.س)</label>
                        <input 
                          type="text" 
                          className="w-full p-3 bg-natural-bg border-none rounded-xl focus:ring-2 focus:ring-natural-accent outline-none text-sm font-bold"
                          placeholder="أدخل السعر..."
                          value={newMember.price}
                          onChange={e => setNewMember({...newMember, price: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {['700', '550', '500', '350', '250', '150', '70', '50'].map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setNewMember({...newMember, price: p})}
                          className={`px-3 py-1 text-xs rounded-lg border transition-all ${
                            newMember.price === p 
                              ? 'bg-natural-accent text-white border-natural-accent shadow-sm' 
                              : 'bg-white text-natural-secondary border-natural-border hover:bg-natural-bg'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-natural-border mt-2 space-y-4">
                      <h4 className="text-sm font-bold text-natural-sidebar flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-natural-accent rounded-full"></span>
                        بيانات الدفع
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-medium text-natural-secondary mb-1">المبلغ المدفوع</label>
                          <input 
                            type="text" 
                            className="w-full p-2.5 bg-natural-bg border-none rounded-lg focus:ring-2 focus:ring-natural-accent outline-none text-sm font-bold"
                            value={newMember.paidAmount}
                            onChange={e => setNewMember({...newMember, paidAmount: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-natural-secondary mb-1">طريقة الدفع</label>
                          <select 
                            className="w-full p-2.5 bg-natural-bg border-none rounded-lg focus:ring-2 focus:ring-natural-accent outline-none text-sm appearance-none"
                            value={newMember.paymentMethod}
                            onChange={e => {
                              const method = e.target.value as any;
                              const updates: any = { paymentMethod: method };
                              if (method === 'لم يتم الدفع') {
                                updates.paidAmount = '0';
                                updates.paymentDate = '';
                              }
                              setNewMember({...newMember, ...updates});
                            }}
                          >
                            <option value="كاش">كاش</option>
                            <option value="تحويل">تحويل</option>
                            <option value="لم يتم الدفع">لم يتم الدفع</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[10px] font-medium text-natural-secondary">تاريخ الدفع</label>
                          <button 
                            type="button" 
                            onClick={() => {
                              const today = new Date().toISOString().split('T')[0];
                              setNewMember({...newMember, paymentDate: today});
                            }}
                            className="text-[9px] text-natural-accent hover:underline font-bold"
                          >
                            اليوم
                          </button>
                        </div>
                        <div className="relative">
                          <input 
                            type="date" 
                            className="w-full p-2.5 bg-natural-bg border-none rounded-lg focus:ring-2 focus:ring-natural-accent outline-none text-sm pr-9 text-right"
                            value={newMember.paymentDate}
                            onChange={e => setNewMember({...newMember, paymentDate: e.target.value})}
                          />
                          <div className="absolute top-1/2 right-3 -translate-y-1/2 text-natural-secondary pointer-events-none">
                            <Calendar size={16} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-6 sticky bottom-0 bg-white z-10 mt-auto border-t border-natural-border">
                      <button 
                        type="submit"
                        className="flex-1 bg-natural-accent text-white p-3 rounded-xl font-bold hover:bg-opacity-90 transition-colors shadow-lg shadow-natural-accent/20"
                      >
                        حفظ العضو
                      </button>
                      <button 
                        type="button"
                        onClick={() => setIsAddModalOpen(false)}
                        className="flex-1 bg-natural-bg text-natural-secondary p-3 rounded-xl font-bold hover:bg-natural-border transition-colors border border-natural-border"
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}

            {view === 'accountant' && (
              <AccountantView 
                members={members} 
                trainees={trainees} 
                settings={settings} 
                setSettings={setSettings}
                showTotalAmount={showTotalAmount} 
                setIsPasswordModalOpen={setIsPasswordModalOpen}
              />
            )}

            {view === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Welcome Section */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-natural-sidebar rounded-3xl p-3 shadow-xl overflow-hidden">
                      <img src="/logo (4).jpg" alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-natural-sidebar leading-tight">الجمعية التعاونية إبداع</h2>
                      <p className="text-natural-secondary mt-1">مرحباً بك مجدداً في لوحة إدارة الموهبة ✨</p>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => setIsAddModalOpen(true)}
                      className="flex-1 md:flex-none bg-natural-accent text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-natural-accent/20 flex items-center justify-center gap-2 hover:scale-105 transition-all"
                    >
                      <Plus size={20} />
                      مشترك جديد
                    </button>
                    <button 
                      onClick={() => setView('attendance')}
                      className="flex-1 md:flex-none bg-natural-sidebar text-white px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all"
                    >
                      <CheckSquare size={20} />
                      تسجيل حضور
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <StatCard label="إجمالي المشتركين" value={stats.total} icon={Users} color="accent" />
                  <StatCard label="المشتركين النشطين" value={stats.active} icon={CheckSquare} color="success" />
                  <StatCard label="أوشك على الانتهاء" value={stats.expiringSoon} icon={AlertCircle} color="accent" />
                  <StatCard label="جلسات الانتظار" value={stats.compensationPending} icon={RefreshCw} color="sidebar" />
                  <StatCard label="بيانات لم تدفع" value={stats.unpaid} icon={Tag} color="accent" />
                </div>

                {/* Dashboard Lists */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <SectionCard title="تنبيهات انتهاء المدة" badge={`${stats.expiringSoon} أعضاء`}>
                    <div className="space-y-4">
                      {members.filter(m => m.status === 'active').slice(0, 3).map(m => (
                        <div key={m.id} className="flex items-center justify-between p-3 hover:bg-natural-bg rounded-lg transition-colors border border-transparent hover:border-natural-border">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-natural-accent/10 rounded-full flex items-center justify-center text-natural-accent font-bold">
                              {m.name[0]}
                            </div>
                            <div>
                              <p className="font-medium text-sm text-natural-primary">{m.name}</p>
                              <p className="text-xs text-natural-secondary">ينتهي في: {m.endDate}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => renewMember(m.id)}
                              className="text-natural-accent text-xs font-semibold hover:underline"
                            >
                              تجديد
                            </button>
                            <button 
                              onClick={() => deleteMember(m.id)}
                              className="text-red-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>

                  <SectionCard title="نشاط اليوم" icon={History}>
                    <div className="space-y-4">
                       {attendance.length === 0 ? (
                         <div className="text-center py-8 text-gray-400">
                           <Calendar size={40} className="mx-auto mb-2 opacity-20" />
                           <p className="text-sm">لا يوجد سجلات حضور لليوم بعد</p>
                         </div>
                       ) : (
                         attendance.map(record => (
                           <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                             <p className="text-sm font-medium">{members.find(m => m.id === record.memberId)?.name}</p>
                             <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                               record.status === 'present' ? 'bg-natural-success/10 text-natural-success' : 
                               'bg-natural-accent/10 text-natural-accent'
                             }`}>
                               {record.status === 'present' ? 'حاضر' : 
                                record.status === 'compensated' ? 'تعويض' :
                                record.status === 'absent_compensated' ? 'غياب بتعويض' : 'غياب'}
                             </span>
                           </div>
                         ))
                       )}
                    </div>
                  </SectionCard>

                  <SectionCard title="مشتركين لم يتم الدفع" badge={`${stats.unpaid} حالات`} icon={Calendar}>
                    <div className="space-y-4">
                      {members.filter(m => m.paymentMethod === 'لم يتم الدفع').length === 0 ? (
                        <div className="text-center py-8 text-gray-400 font-bold">
                          <Check size={40} className="mx-auto mb-2 opacity-20 text-natural-success" />
                          <p className="text-sm">جميع المشتركين سددوا الرسوم</p>
                        </div>
                      ) : (
                        members.filter(m => m.paymentMethod === 'لم يتم الدفع').map(m => (
                          <div key={m.id} className="flex items-center justify-between p-3 bg-red-50/50 rounded-xl border border-red-100/50 group hover:bg-red-50 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold">
                                {m.name[0]}
                              </div>
                              <div>
                                <p className="font-bold text-sm text-red-900">{m.name}</p>
                                <p className="text-[10px] text-red-600 font-bold">المبلغ المستحق: {m.price} ر.س</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col items-end gap-1 ml-2">
                                <span className="text-[9px] px-2 py-0.5 bg-white border border-red-200 rounded-full text-red-600 font-bold">غير مدفوع</span>
                                <p className="text-[9px] text-gray-400">{m.startDate} م</p>
                              </div>
                              <div className="flex gap-1 border-r border-red-100 pr-2 mr-2">
                                <button 
                                  onClick={() => updatePayment(m.id, 'كاش')}
                                  className="text-[10px] bg-orange-500 text-white px-2 py-1 rounded-lg hover:bg-orange-600 transition-colors font-bold shadow-sm"
                                >
                                  كاش
                                </button>
                                <button 
                                  onClick={() => updatePayment(m.id, 'تحويل')}
                                  className="text-[10px] bg-blue-500 text-white px-2 py-1 rounded-lg hover:bg-blue-600 transition-colors font-bold shadow-sm"
                                >
                                  تحويل
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </SectionCard>
                </div>
              </motion.div>
            )}

            {(view === 'courses' || view === 'courses_list') && (
              <motion.div
                key="courses"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-natural-sidebar">إدارة الدورات التدريبية</h2>
                    <p className="text-sm text-natural-secondary mt-1">عرض وإدارة جميع الدورات والورش التدريبية المتاحة.</p>
                  </div>
                  <button 
                    onClick={() => setView('courses_add')}
                    className="bg-natural-accent text-white px-6 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-opacity-90 transition-all font-bold shadow-lg shadow-natural-accent/20"
                  >
                    <Plus size={20} />
                    إضافة دورة جديدة
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map(course => (
                    <div key={course.id} className="bg-white rounded-3xl border border-natural-border overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            course.status === 'active' ? 'bg-natural-success/10 text-natural-success' :
                            course.status === 'upcoming' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {course.status === 'active' ? 'نشطة حالياً' : 
                             course.status === 'upcoming' ? 'قادمة قريباً' : 'مكتملة'}
                          </div>
                          <span className="text-lg font-bold text-natural-accent">{course.price} ر.س</span>
                        </div>
                        <h3 className="text-xl font-bold text-natural-sidebar mb-2 group-hover:text-natural-accent transition-colors">{course.title}</h3>
                        <p className="text-sm text-natural-secondary line-clamp-2 mb-4 h-10">{course.description}</p>
                        
                        <div className="space-y-3 pt-4 border-t border-natural-bg">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-natural-secondary flex items-center gap-2">
                              <Users size={16} className="text-natural-accent" />
                              المدرب:
                            </span>
                            <span className="font-bold text-natural-sidebar">{course.instructor}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-natural-secondary flex items-center gap-2">
                              <Calendar size={16} className="text-natural-accent" />
                              الفترة:
                            </span>
                            <span className="text-xs font-medium">{course.startDate} - {course.endDate}</span>
                          </div>
                          <div className="pt-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-natural-secondary">المقاعد الشغولة</span>
                              <span className="font-bold">{course.enrolledCount} / {course.capacity}</span>
                            </div>
                            <div className="w-full bg-natural-bg h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-natural-accent h-full transition-all duration-1000" 
                                style={{ width: `${(course.enrolledCount / course.capacity) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-natural-bg/50 p-4 border-t border-natural-border flex gap-2">
                        <button 
                          onClick={() => setDetailsCourse(course)}
                          className="flex-1 bg-white border border-natural-border py-2 rounded-xl text-sm font-bold text-natural-sidebar hover:bg-natural-sidebar hover:text-white transition-all"
                        >
                          التفاصيل
                        </button>
                        <button 
                          onClick={() => {
                            if (course.title === 'ساعة مرح وساعة فن') setView('course_fun');
                            else if (course.title === 'ورشة صناعة الورد المخملي') setView('course_rose');
                            else if (course.title === 'فن خبز المسح') setView('course_bread');
                            else {
                                setSelectedCourseId(course.id);
                                setView('courses_trainees');
                            }
                          }}
                          className="flex-1 bg-natural-sidebar text-white py-2 rounded-xl text-sm font-bold hover:bg-opacity-90 transition-all font-bold"
                        >
                          إدارة المسجلين
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmId(course.id)}
                          className="bg-red-50 text-red-500 p-2 rounded-xl border border-red-100 hover:bg-red-500 hover:text-white transition-all"
                          title="حذف الدورة"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {view === 'courses_add' && (
              <motion.div
                key="courses_add"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-natural-border overflow-hidden"
              >
                <div className="bg-natural-sidebar p-8 text-white">
                  <h2 className="text-2xl font-bold">إضافة دورة جديدة</h2>
                  <p className="text-white/60">أدخل تفاصيل الدورة التدريبية الجديدة ليتم عرضها في النظام.</p>
                </div>
                <form onSubmit={handleSaveCourse} className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-natural-sidebar block px-1">اسم الدورة</label>
                      <input 
                        required
                        type="text" 
                        value={newCourse.title}
                        onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
                        placeholder="مثلاً: دورة الخط العربي" 
                        className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-natural-sidebar block px-1">المدرب</label>
                      <input 
                        required
                        type="text" 
                        value={newCourse.instructor}
                        onChange={(e) => setNewCourse({...newCourse, instructor: e.target.value})}
                        placeholder="اسم المدرب أو المعلم" 
                        className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-natural-sidebar block px-1">تاريخ البدء</label>
                      <input 
                        type="date" 
                        value={newCourse.startDate}
                        onChange={(e) => setNewCourse({...newCourse, startDate: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-natural-sidebar block px-1">تاريخ الانتهاء</label>
                      <input 
                        type="date" 
                        value={newCourse.endDate}
                        onChange={(e) => setNewCourse({...newCourse, endDate: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-natural-sidebar block px-1">السعر (ر.س)</label>
                      <input 
                        type="number" 
                        value={newCourse.price}
                        onChange={(e) => setNewCourse({...newCourse, price: e.target.value})}
                        placeholder="0" 
                        className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-natural-sidebar block px-1">وصف الدورة</label>
                    <textarea 
                      rows={4} 
                      value={newCourse.description}
                      onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                      placeholder="اكتب نبذة عن الدورة ومحتواها..." 
                      className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all"
                    ></textarea>
                  </div>
                  <div className="pt-4 flex gap-4">
                    <button type="submit" className="flex-1 bg-natural-accent text-white py-4 rounded-2xl font-bold shadow-lg shadow-natural-accent/20 hover:scale-[1.02] active:scale-95 transition-all">
                      حفظ الدورة
                    </button>
                    <button type="button" onClick={() => setView('courses_list')} className="px-8 bg-natural-bg text-natural-sidebar py-4 rounded-2xl font-bold hover:bg-natural-border transition-all">
                      إلغاء
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {view === 'courses_trainees' && (
              <motion.div
                key="courses_trainees"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-natural-sidebar">
                      {selectedCourseId 
                        ? `متدربي دورة: ${courses.find(c => c.id === selectedCourseId)?.title || ''}` 
                        : 'تسجيل المتدربين'}
                    </h2>
                    <p className="text-sm text-natural-secondary mt-1">إشراف ومتابعة المتدربين المسجلين في الدورات التدريبية.</p>
                  </div>
                  <div className="flex gap-2">
                    {selectedCourseId && (
                      <button 
                        onClick={() => setSelectedCourseId(null)}
                        className="bg-natural-bg text-natural-sidebar px-4 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-natural-border transition-all font-bold"
                      >
                        عرض الكل
                      </button>
                    )}
                    <button 
                      onClick={() => setView('courses_trainee_add')}
                      className="bg-natural-accent text-white px-6 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-opacity-90 transition-all font-bold shadow-lg shadow-natural-accent/20"
                    >
                      <Plus size={20} />
                      تسجيل متدرب جديد
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-natural-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead className="bg-natural-bg/50 border-b border-natural-border">
                        <tr>
                          <th className="p-4 text-xs font-bold text-natural-sidebar">الأسم ثلاثي</th>
                          <th className="p-4 text-xs font-bold text-natural-sidebar">رقم جوال الأم</th>
                          <th className="p-4 text-xs font-bold text-natural-sidebar">الدورة</th>
                          <th className="p-4 text-xs font-bold text-natural-sidebar">المدة</th>
                          <th className="p-4 text-xs font-bold text-natural-sidebar">المبلغ</th>
                          <th className="p-4 text-xs font-bold text-natural-sidebar">طريقة الدفع</th>
                          <th className="p-4 text-xs font-bold text-natural-sidebar">التاريخ</th>
                          <th className="p-4 text-xs font-bold text-natural-sidebar">الملاحظات</th>
                          <th className="p-4 text-xs font-bold text-natural-sidebar text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-natural-bg">
                        {trainees.filter(t => !selectedCourseId || t.courseId === selectedCourseId || t.courseId === courses.find(c => c.id === selectedCourseId)?.title).length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-10 text-center text-gray-400 font-bold">
                              لا يوجد متدربين مطابقين للبحث
                            </td>
                          </tr>
                        ) : (
                          trainees.filter(t => !selectedCourseId || t.courseId === selectedCourseId || t.courseId === courses.find(c => c.id === selectedCourseId)?.title).map(trainee => {
                            const course = courses.find(c => c.id === trainee.courseId || c.title === trainee.courseId);
                            return (
                              <tr key={trainee.id} className="hover:bg-natural-bg/20 transition-colors">
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-natural-sidebar/10 rounded-lg flex items-center justify-center text-natural-sidebar text-xs font-bold">
                                      {trainee.fullName[0]}
                                    </div>
                                    <span className="font-semibold text-sm">{trainee.fullName}</span>
                                  </div>
                                </td>
                                <td className="p-4 text-sm font-mono">{trainee.motherPhone}</td>
                                <td className="p-4">
                                  <span className="text-xs font-bold text-natural-accent">{course?.title || trainee.courseId || 'دورة غير محددة'}</span>
                                </td>
                                <td className="p-4 text-sm">{trainee.duration}</td>
                                <td className="p-4 text-sm font-bold text-natural-sidebar">{trainee.amount} ر.س</td>
                                <td className="p-4">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                    trainee.paymentMethod === 'كاش' 
                                      ? 'bg-orange-50 text-orange-600 border-orange-100' 
                                      : trainee.paymentMethod === 'تحويل'
                                      ? 'bg-blue-50 text-blue-600 border-blue-100'
                                      : 'bg-red-50 text-red-500 border-red-100'
                                  }`}>
                                    {trainee.paymentMethod}
                                  </span>
                                </td>
                                <td className="p-4 text-xs font-mono">{trainee.date}</td>
                                <td className="p-4 text-xs text-natural-secondary max-w-[150px] truncate" title={trainee.notes}>
                                  {trainee.notes || '-'}
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <button className="p-1 hover:text-natural-accent transition-colors"><Icons.Edit2 size={16} /></button>
                                    <button className="p-1 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'courses_trainee_add' && (
              <motion.div
                key="courses_trainee_add"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-natural-border overflow-hidden"
              >
                <div className="bg-natural-sidebar p-8 text-white">
                  <h2 className="text-2xl font-bold">تسجيل متدرب جديد</h2>
                  <p className="text-white/60">أدخل بيانات المتدرب بدقة لضمان صحة السجلات.</p>
                </div>
                <form onSubmit={handleRegisterTrainee} className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-natural-sidebar block px-1">الأسم ثلاثي</label>
                      <input 
                        required
                        type="text" 
                        value={newTrainee.fullName}
                        onChange={(e) => setNewTrainee({...newTrainee, fullName: e.target.value})}
                        placeholder="أدخل الاسم الثلاثي للمتدرب" 
                        className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-natural-sidebar block px-1">رقم جوال الأم</label>
                      <input 
                        required
                        type="tel" 
                        value={newTrainee.motherPhone}
                        onChange={(e) => setNewTrainee({...newTrainee, motherPhone: e.target.value})}
                        placeholder="05xxxxxxxx" 
                        className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all" 
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-natural-sidebar block px-1">الدورة التدريبية</label>
                      <input 
                        required
                        list="courseList"
                        value={newTrainee.courseId}
                        onChange={(e) => setNewTrainee({...newTrainee, courseId: e.target.value})}
                        placeholder="اختر الدورة أو اكتب اسماً جديداً"
                        className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all"
                      />
                      <datalist id="courseList">
                        {courses.map(course => (
                          <option key={course.id} value={course.title} />
                        ))}
                      </datalist>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-natural-sidebar block px-1">المدة</label>
                      <input 
                        type="text" 
                        value={newTrainee.duration}
                        onChange={(e) => setNewTrainee({...newTrainee, duration: e.target.value})}
                        placeholder="مثلاً: شهر واحد" 
                        className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-natural-sidebar block px-1">المبلغ (ر.س)</label>
                      <input 
                        type="number" 
                        value={newTrainee.amount}
                        onChange={(e) => setNewTrainee({...newTrainee, amount: e.target.value})}
                        placeholder="0.00" 
                        className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-natural-sidebar block px-1">طريقة الدفع</label>
                      <select 
                        required
                        value={newTrainee.paymentMethod}
                        onChange={(e) => setNewTrainee({...newTrainee, paymentMethod: e.target.value as any})}
                        className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all appearance-none"
                      >
                        <option value="كاش">كاش</option>
                        <option value="تحويل">تحويل</option>
                        <option value="لم يتم الدفع">لم يتم الدفع</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-natural-sidebar block px-1">تاريخ التسجيل</label>
                      <input 
                        required
                        type="date" 
                        value={newTrainee.date}
                        onChange={(e) => setNewTrainee({...newTrainee, date: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-natural-sidebar block px-1">ملاحظات إضافية</label>
                    <textarea 
                      rows={3} 
                      value={newTrainee.notes}
                      onChange={(e) => setNewTrainee({...newTrainee, notes: e.target.value})}
                      placeholder="أي ملاحظات حول الطالب أو عملية التسجيل..." 
                      className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all"
                    ></textarea>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <button type="submit" className="flex-1 bg-natural-accent text-white py-4 rounded-2xl font-bold shadow-lg shadow-natural-accent/20 hover:scale-[1.02] active:scale-95 transition-all">
                      حفظ وتسجيل المتدرب
                    </button>
                    <button type="button" onClick={() => setView('courses_trainees')} className="px-8 bg-natural-bg text-natural-sidebar py-4 rounded-2xl font-bold hover:bg-natural-border transition-all">
                      إلغاء
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {(view === 'course_fun' || view === 'course_rose' || view === 'course_bread') && (
              <motion.div
                key={view}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6"
              >
                <div className="bg-natural-sidebar rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                  <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-2">
                      {view === 'course_fun' ? 'ساعة مرح وساعة فن' : 
                       view === 'course_rose' ? 'ورشة صناعة الورد المخملي' : 'فن خبز المسح'}
                    </h2>
                    <p className="text-white/60">قائمة المتدربين المسجلين في هذه الدورة ومتابعة بياناتهم.</p>
                  </div>
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <BookOpen size={120} />
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-natural-border overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead className="bg-natural-bg/50 border-b border-natural-border">
                        <tr>
                          <th className="p-4 text-xs font-bold text-natural-sidebar">الأسم ثلاثي</th>
                          <th className="p-4 text-xs font-bold text-natural-sidebar">رقم جوال الأم</th>
                          <th className="p-4 text-xs font-bold text-natural-sidebar">المبلغ</th>
                          <th className="p-4 text-xs font-bold text-natural-sidebar">طريقة الدفع</th>
                          <th className="p-4 text-xs font-bold text-natural-sidebar">تاريخ التسجيل</th>
                          <th className="p-4 text-xs font-bold text-natural-sidebar">ملاحظات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-natural-bg">
                        {trainees.filter(t => {
                          const courseName = view === 'course_fun' ? 'ساعة مرح وساعة فن' : 
                                            view === 'course_rose' ? 'ورشة صناعة الورد المخملي' : 'فن خبز المسح';
                          const course = courses.find(c => c.id === t.courseId);
                          return (course?.title === courseName) || (t.courseId === courseName);
                        }).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-10 text-center text-gray-400 font-bold">
                              لا يوجد متدربين مسجلين في هذه الدورة حتى الآن
                            </td>
                          </tr>
                        ) : (
                          trainees.filter(t => {
                            const courseName = view === 'course_fun' ? 'ساعة مرح وساعة فن' : 
                                              view === 'course_rose' ? 'ورشة صناعة الورد المخملي' : 'فن خبز المسح';
                            const course = courses.find(c => c.id === t.courseId);
                            return (course?.title === courseName) || (t.courseId === courseName);
                          }).map(trainee => (
                            <tr key={trainee.id} className="hover:bg-natural-bg/20 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-natural-accent/10 rounded-lg flex items-center justify-center text-natural-accent text-xs font-bold">
                                    {trainee.fullName[0]}
                                  </div>
                                  <span className="font-semibold text-sm">{trainee.fullName}</span>
                                </div>
                              </td>
                              <td className="p-4 text-sm font-mono">{trainee.motherPhone}</td>
                              <td className="p-4 text-sm font-bold text-natural-sidebar">{trainee.amount} ر.س</td>
                              <td className="p-4">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                  trainee.paymentMethod === 'كاش' 
                                    ? 'bg-orange-50 text-orange-600 border-orange-100' 
                                    : trainee.paymentMethod === 'تحويل'
                                    ? 'bg-blue-50 text-blue-600 border-blue-100'
                                    : 'bg-red-50 text-red-500 border-red-100'
                                }`}>
                                  {trainee.paymentMethod}
                                </span>
                              </td>
                              <td className="p-4 text-xs font-mono">{trainee.date}</td>
                              <td className="p-4 text-xs text-natural-secondary">{trainee.notes || '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {view.startsWith('attendance') && (
              <motion.div
                key={view}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl shadow-sm border border-natural-border overflow-hidden"
              >
                <div className="p-6 border-b border-natural-border bg-natural-bg/30 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-natural-sidebar">قائمة تسجيل الحضور</h3>
                    <p className="text-xs text-natural-secondary mt-1">سجل حضور المشتركين لليوم: {new Date().toLocaleDateString('en-CA')}</p>
                  </div>
                </div>
                <div className="divide-y divide-natural-bg">
                  {filteredMembers.filter(m => m.status === 'active').map(member => (
                    <div key={member.id} className="p-4 flex items-center justify-between hover:bg-natural-bg/50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white border border-natural-border rounded-xl flex items-center justify-center text-natural-accent font-bold shadow-sm">
                          {member.name[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-natural-primary">{member.name}</p>
                            <span className="text-[10px] bg-natural-sidebar/10 text-natural-sidebar px-2 py-0.5 rounded-lg border border-natural-sidebar/20">
                              {member.grade} - {member.subjects} ({member.price} ر.س)
                            </span>
                            {member.teacherName && (
                              <span className="text-[10px] bg-natural-accent/10 text-natural-accent px-2 py-0.5 rounded-lg border border-natural-accent/20 font-bold">
                                {member.teacherName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <button 
                              onClick={() => setEditingMemberStats({
                                id: member.id,
                                name: member.name,
                                attendedCount: member.attendedCount,
                                absentCount: member.absentCount,
                                compensationSessions: member.compensationSessions
                              })}
                              className="text-xs text-natural-secondary flex items-center gap-1 hover:text-natural-accent transition-colors"
                            >
                              <DynamicIcon name={settings.icons.activeMember} size={12} /> {member.attendedCount} / {member.sessionsCount} حصة
                              <Icons.Edit2 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            <button 
                              onClick={() => setEditingMemberStats({
                                id: member.id,
                                name: member.name,
                                attendedCount: member.attendedCount,
                                absentCount: member.absentCount,
                                compensationSessions: member.compensationSessions
                              })}
                              className="text-xs text-natural-secondary flex items-center gap-1 hover:text-natural-accent transition-colors"
                            >
                               <DynamicIcon name={settings.icons.absent} size={12} className="text-natural-accent" /> {member.absentCount} غياب
                               <Icons.Edit2 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                             </button>
                             <button 
                              onClick={() => setEditingMemberStats({
                                id: member.id,
                                name: member.name,
                                attendedCount: member.attendedCount,
                                absentCount: member.absentCount,
                                compensationSessions: member.compensationSessions
                              })}
                              className="text-xs text-natural-secondary flex items-center gap-1 hover:text-natural-accent transition-colors"
                            >
                               <DynamicIcon name={settings.icons.compensation} size={12} className="text-natural-sidebar" /> {member.compensationSessions} رصيد تعويض
                               <Icons.Edit2 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                             </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => markAttendance(member.id, 'present')}
                          className="bg-natural-success/10 text-natural-success hover:bg-natural-success hover:text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 active:scale-95 border border-natural-success/20"
                        >
                          <DynamicIcon name={settings.icons.present} size={14} /> حاضر
                        </button>
                        <button 
                          onClick={() => markAttendance(member.id, 'absent')}
                          className="bg-gray-100 text-gray-500 hover:bg-gray-200 px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 active:scale-95 border border-gray-200"
                        >
                          <DynamicIcon name={settings.icons.absent} size={14} /> غياب
                        </button>
                        <button 
                          onClick={() => markAttendance(member.id, 'absent_compensated')}
                          className="bg-natural-accent/10 text-natural-accent hover:bg-natural-accent hover:text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 active:scale-95 border border-natural-accent/20"
                        >
                          <DynamicIcon name={settings.icons.absent} size={14} /> غياب بتعويض
                        </button>
                        <button 
                          onClick={() => markAttendance(member.id, 'compensated')}
                          className="bg-natural-sidebar/10 text-natural-sidebar hover:bg-natural-sidebar hover:text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 active:scale-95 border border-natural-sidebar/20"
                          disabled={member.compensationSessions <= 0}
                        >
                          <DynamicIcon name={settings.icons.compensation} size={14} /> تعويض
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Attendance History Table */}
                <div className="mt-8 border-t border-natural-border pt-8 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-bold text-lg text-natural-sidebar flex items-center gap-2">
                        <History size={20} className="text-natural-accent" />
                        سجل الحضور والغياب (التاريخي)
                      </h3>
                      <p className="text-xs text-natural-secondary mt-1">كشف كامل بجميع عمليات التحضير المسجلة في النظام</p>
                    </div>
                  </div>
                  
                  <div className="bg-natural-bg/20 rounded-2xl border border-natural-border overflow-hidden">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-natural-sidebar text-white">
                        <tr>
                          <th className="p-4 font-bold">التاريخ</th>
                          <th className="p-4 font-bold">اليوم</th>
                          <th className="p-4 font-bold">المشترك</th>
                          <th className="p-4 font-bold">المعلم/ة</th>
                          <th className="p-4 font-bold">نوع التحضير</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-natural-border">
                        {attendance.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-10 text-center text-gray-400 font-bold">
                              لا توجد سجلات حضور مسجلة حتى الآن
                            </td>
                          </tr>
                        ) : (
                          [...attendance].reverse().map(record => {
                            const member = members.find(m => m.id === record.memberId);
                            const recordDate = new Date(record.date);
                            const dayName = new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(recordDate);
                            
                            return (
                              <tr key={record.id} className="hover:bg-white transition-colors">
                                <td className="p-4 font-mono text-xs">{record.date}</td>
                                <td className="p-4 font-bold text-natural-sidebar">{dayName}</td>
                                <td className="p-4 font-bold text-natural-primary">{member?.name || 'مشترك محذوف'}</td>
                                <td className="p-4 text-xs">
                                  {member?.teacherName ? (
                                    <span className="bg-natural-accent/10 text-natural-accent px-2 py-0.5 rounded-full border border-natural-accent/20">
                                      {member.teacherName}
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className="p-4">
                                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                    record.status === 'present' ? 'bg-natural-success/10 text-natural-success border border-natural-success/20' :
                                    record.status === 'compensated' ? 'bg-natural-sidebar/10 text-natural-sidebar border border-natural-sidebar/20' :
                                    record.status === 'absent_compensated' ? 'bg-natural-accent/10 text-natural-accent border border-natural-accent/20' :
                                    'bg-red-50 text-red-500 border border-red-100'
                                  }`}>
                                    {record.status === 'present' ? 'حاضر' : 
                                     record.status === 'compensated' ? 'حصة تعويض' :
                                     record.status === 'absent_compensated' ? 'غياب (بتعويض)' : 'غياب'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {view.startsWith('members') && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard 
                    label="عدد المشتركين" 
                    value={filteredMembers.length} 
                    icon={Users} 
                    color="accent" 
                  />
                  <StatCard 
                    label="إجمالي المبالغ" 
                    value={showTotalAmount 
                      ? `${filteredMembers.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0).toLocaleString()} ر.س`
                      : '••••••'
                    } 
                    icon={showTotalAmount ? Tag : Lock} 
                    color="success" 
                    onClick={() => {
                      if (showTotalAmount) setShowTotalAmount(false);
                      else setIsPasswordModalOpen(true);
                    }}
                  />
                  <StatCard 
                    label="إجمالي المحصل" 
                    value={showTotalAmount 
                      ? `${filteredMembers.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0).toLocaleString()} ر.س`
                      : '••••••'
                    } 
                    icon={showTotalAmount ? Check : Lock} 
                    color="sidebar" 
                    onClick={() => {
                      if (showTotalAmount) setShowTotalAmount(false);
                      else setIsPasswordModalOpen(true);
                    }}
                  />
                </div>

                <motion.div
                  key={view}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-white rounded-2xl shadow-sm border border-natural-border overflow-hidden"
                >
                  <table className="w-full text-right">
                  <thead className="bg-natural-bg/50 border-b border-natural-border">
                    <tr>
                      <th className="p-4 text-xs font-semibold text-natural-secondary uppercase tracking-wider">المشترك</th>
                      <th className="p-4 text-xs font-semibold text-natural-secondary uppercase tracking-wider">الصف / المواد</th>
                      <th className="p-4 text-xs font-semibold text-natural-secondary uppercase tracking-wider">بيانات الدفع</th>
                      <th className="p-4 text-xs font-semibold text-natural-secondary uppercase tracking-wider">الهاتف</th>
                      <th className="p-4 text-xs font-semibold text-natural-secondary uppercase tracking-wider">الحضور / الغياب</th>
                      <th className="p-4 text-xs font-semibold text-natural-secondary uppercase tracking-wider">مدة الاشتراك</th>
                      <th className="p-4 text-xs font-semibold text-natural-secondary uppercase tracking-wider">الحالة</th>
                      <th className="p-4 text-xs font-semibold text-natural-secondary uppercase tracking-wider">التعويض</th>
                      <th className="p-4 text-xs font-semibold text-natural-secondary uppercase tracking-wider">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-natural-bg">
                    {filteredMembers.map(member => (
                      <tr key={member.id} className="hover:bg-natural-bg/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-natural-accent/10 rounded-lg flex items-center justify-center text-natural-accent text-xs font-bold">
                              {member.name[0]}
                            </div>
                            <span className="font-medium text-sm text-natural-primary">{member.name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-natural-sidebar">{member.grade}</span>
                            <span className="text-[10px] text-natural-secondary">{member.subjects}</span>
                            {member.teacherName && (
                              <span className="text-[10px] text-natural-accent mt-1 bg-natural-accent/5 px-1.5 py-0.5 rounded border border-natural-accent/10 w-fit">
                                {member.teacherName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1 min-w-[120px]">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-natural-secondary">السعر:</span>
                              <span className="text-xs font-bold text-natural-sidebar">{member.price} ر.س</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-natural-secondary">المدفوع:</span>
                              <span className="text-xs font-bold text-natural-success">{member.paidAmount} ر.س</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                member.paymentMethod === 'كاش' 
                                  ? 'bg-orange-50 text-orange-600 border border-orange-100' 
                                  : member.paymentMethod === 'تحويل'
                                  ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                  : 'bg-red-50 text-red-600 border-red-100'
                              }`}>
                                {member.paymentMethod}
                              </span>
                              <span className="text-[9px] text-gray-400 font-mono">
                                {member.paymentDate || '-'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-natural-secondary">{member.phone}</td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-natural-success">حضور: {member.attendedCount}</span>
                            <span className="text-xs font-medium text-natural-accent">غياب: {member.absentCount}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-natural-secondary">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              {member.startDate} <span className="text-[8px] text-natural-border font-bold">إلى</span> {member.endDate}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                                getRemainingDays(member.endDate) <= 3 
                                ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' 
                                : 'bg-natural-accent/5 text-natural-accent border-natural-accent/10'
                              }`}>
                                المتبقي: {getRemainingDays(member.endDate)} يوم
                              </span>
                            </div>
                          </div>
                        </td>
                         <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            member.status === 'active' ? 'bg-natural-success/10 text-natural-success border border-natural-success/20' : 'bg-natural-accent/10 text-natural-accent border border-natural-accent/20'
                          }`}>
                            {member.status === 'active' ? 'نشط' : 'منتهي'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${member.compensationSessions > 0 ? 'bg-natural-sidebar/20 text-natural-sidebar' : 'bg-gray-100 text-gray-400'}`}>
                            {member.compensationSessions} حصص
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => deleteMember(member.id)}
                              className="text-natural-secondary hover:text-red-500 transition-colors p-1"
                              title="حذف"
                            >
                              <Trash2 size={18} />
                            </button>
                            <button className="text-natural-secondary hover:text-natural-accent transition-colors p-1">
                              <ChevronRight size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            </div>
          )}

            {view === 'about' && (
              <motion.div
                key="about"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-natural-border overflow-hidden">
                  <div className="bg-natural-sidebar p-12 text-center relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="bg-white p-4 rounded-[2rem] shadow-2xl inline-block mb-6 relative group overflow-hidden w-32 h-32 flex items-center justify-center">
                        <img 
                          src="/logo (4).jpg" 
                          alt="شعار الجمعية" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const icon = document.createElement('div');
                              icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';
                              icon.className = "text-natural-accent";
                              parent.appendChild(icon);
                            }
                          }}
                        />
                      </div>
                      <h2 className="text-3xl font-bold text-white mb-2">الجمعية التعاونية إبداع لتعزيز الموهبة</h2>
                      <p className="text-white/60 text-lg">Creativity Cooperative Society for Talent Enhancement</p>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-natural-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                  </div>
                  
                  <div className="p-12 space-y-10">
                    <section>
                      <h3 className="text-xl font-bold text-natural-sidebar mb-4 flex items-center gap-2">
                        <span className="w-2 h-8 bg-natural-accent rounded-full"></span>
                        من نحن
                      </h3>
                      <p className="text-natural-secondary leading-relaxed text-lg">
                        الجمعية التعاونية إبداع لتعزيز الموهبة هي مؤسسة تعنى بإيجاد وتنمية المواهب في مختلف المجالات. نسعى دائماً لتمكين المبدعين من خلال توفير البيئة الخصبة والأدوات اللازمة لإطلاق طاقاتهم الكامنة وتحويل أفكارهم إلى واقع ملموس.
                      </p>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-natural-bg/50 p-8 rounded-[2rem] border border-natural-border">
                        <h4 className="font-bold text-natural-sidebar mb-3 flex items-center gap-2">
                          <Zap size={20} className="text-natural-accent" />
                          رؤيتنا
                        </h4>
                        <p className="text-sm text-natural-secondary leading-relaxed">
                          نطمح لأن نكون المنصة الرائدة في اكتشاف وصقل المواهب الإبداعية، وبناء مجتمع حيوي يسهم في دفع عجلة الابتكار والتميز.
                        </p>
                      </div>
                      <div className="bg-natural-bg/50 p-8 rounded-[2rem] border border-natural-border">
                        <h4 className="font-bold text-natural-sidebar mb-3 flex items-center gap-2">
                          <Users size={20} className="text-natural-accent" />
                          أهدافنا
                        </h4>
                        <ul className="text-sm text-natural-secondary space-y-2">
                          <li className="flex items-start gap-2">
                            <span className="text-natural-accent mt-1">•</span>
                            اكتشاف المواهب الشابة وتوفير الرعاية المناسبة لهم.
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-natural-accent mt-1">•</span>
                            تنظيم ورش عمل وفعاليات تعليمية وتدريبية متخصصة.
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-natural-accent mt-1">•</span>
                            تعزيز ثقافة الإبداع والتعاون بين الموهوبين.
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-natural-border flex flex-col items-center gap-6">
                      <p className="text-sm font-bold text-natural-secondary">تواصل معنا</p>
                      <div className="flex gap-4">
                        <a href="mailto:creaivity.44association@gmail.com" className="p-4 bg-natural-bg rounded-2xl text-natural-sidebar hover:bg-natural-accent hover:text-white transition-all shadow-sm">
                          <Mail size={24} />
                        </a>
                        <a href="tel:+966599322131" className="p-4 bg-natural-bg rounded-2xl text-natural-sidebar hover:bg-natural-accent hover:text-white transition-all shadow-sm">
                          <Phone size={24} />
                        </a>
                        <a href="https://ibdaa.org.sa" target="_blank" className="p-4 bg-natural-bg rounded-2xl text-natural-sidebar hover:bg-natural-accent hover:text-white transition-all shadow-sm">
                          <Globe size={24} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <SectionCard title="تخصيص أيقونات النظام" icon={SettingsIcon}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {Object.entries(settings.icons).map(([key, currentIcon]) => (
                      <div key={key} className="space-y-3">
                        <p className="text-sm font-bold text-natural-sidebar capitalize border-r-2 border-natural-accent pr-2">
                          {key === 'activeMember' && 'أيقونة المشترك النشط'}
                          {key === 'expiredMember' && 'أيقونة المشترك المنتهي'}
                          {key === 'present' && 'أيقونة الحضور'}
                          {key === 'absent' && 'أيقونة الغياب'}
                          {key === 'compensation' && 'أيقونة التعويض'}
                        </p>
                        <div className="grid grid-cols-6 gap-2 bg-natural-bg/30 p-4 rounded-2xl border border-natural-border">
                          {AVAILABLE_ICONS.map(iconObj => (
                            <button
                              key={iconObj.name}
                              onClick={() => setSettings({
                                ...settings,
                                icons: { ...settings.icons, [key]: iconObj.name }
                              })}
                              className={`p-3 rounded-xl transition-all flex items-center justify-center ${
                                currentIcon === iconObj.name 
                                  ? 'bg-natural-accent text-white shadow-md' 
                                  : 'bg-white text-natural-sidebar hover:bg-natural-accent/10 border border-natural-border'
                              }`}
                            >
                              <iconObj.icon size={20} />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
                <SectionCard title="إجراءات النظام" icon={Zap}>
                  <div className="space-y-6">
                    <div className="p-6 bg-natural-bg/30 rounded-2xl border border-natural-border">
                      <p className="text-sm font-bold text-natural-sidebar mb-4 flex items-center gap-2">
                        <Users size={16} className="text-natural-accent" />
                        إدارة أسماء المعلمين
                      </p>
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          <input 
                            type="text" 
                            id="newTeacherName"
                            placeholder="اسم المعلم الجديد"
                            className="flex-1 px-4 py-3 bg-white border border-natural-border rounded-xl outline-none focus:border-natural-accent transition-all"
                          />
                          <button 
                            onClick={() => {
                              const input = document.getElementById('newTeacherName') as HTMLInputElement;
                              const name = input.value.trim();
                              if (name && !settings.teachers?.includes(name)) {
                                const newTeachers = [...(settings.teachers || []), name];
                                setSettings({...settings, teachers: newTeachers});
                                updateSettings({...settings, teachers: newTeachers});
                                input.value = '';
                                showNotif('تم إضافة المعلم بنجاح', 'success');
                              }
                            }}
                            className="bg-natural-sidebar text-white px-8 py-3 rounded-xl font-bold hover:bg-natural-accent transition-all"
                          >
                            إضافة
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(settings.teachers || []).map((teacher, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-natural-border shadow-sm">
                              <span className="text-sm font-bold text-natural-sidebar">{teacher}</span>
                              <button 
                                onClick={() => {
                                  const newTeachers = settings.teachers?.filter(t => t !== teacher);
                                  setSettings({...settings, teachers: newTeachers});
                                  updateSettings({...settings, teachers: newTeachers});
                                  showNotif('تم حذف المعلم', 'success');
                                }}
                                className="text-red-500 hover:bg-red-50 p-1 rounded-lg transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-natural-bg/30 rounded-2xl border border-natural-border">
                      <p className="text-sm font-bold text-natural-sidebar mb-4 flex items-center gap-2">
                        <Lock size={16} className="text-natural-accent" />
                        تغيير كلمة مرور الإحصائيات المالية
                      </p>
                      <div className="flex gap-4">
                        <input 
                          type="text" 
                          placeholder="كلمة المرور الجديدة"
                          className="flex-1 px-4 py-3 bg-white border border-natural-border rounded-xl outline-none focus:border-natural-accent transition-all text-center font-bold tracking-widest"
                          value={settings.financialPassword || ''}
                          onChange={(e) => setSettings({
                            ...settings,
                            financialPassword: e.target.value
                          })}
                        />
                        <button 
                          onClick={() => {
                            updateSettings(settings);
                            showNotif('تم حفظ كلمة المرور الجديدة', 'success');
                          }}
                          className="bg-natural-sidebar text-white px-8 py-3 rounded-xl font-bold hover:bg-natural-accent transition-all shadow-lg shadow-natural-sidebar/10"
                        >
                          حفظ
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
                      <div>
                        <p className="font-bold text-red-900">تصفير الإحصائيات</p>
                        <p className="text-xs text-red-600">سيتم تصفير جميع عدادات الحضور والغياب والتعويض لجميع المشتركين وحذف سجل اليوم.</p>
                      </div>
                      <button 
                        onClick={() => {
                          if(confirm('هل أنت متأكد من رغبتك في تصفير جميع الإحصائيات؟')) {
                            resetAllStats();
                          }
                        }}
                        className="bg-red-500 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors"
                      >
                        تصفير الآن
                      </button>
                    </div>
                  </div>
                </SectionCard>
                <div className="bg-natural-accent/5 p-6 rounded-3xl border border-natural-accent/20">
                  <p className="text-sm text-natural-secondary">
                    * ملاحظة: يتم تطبيق هذه الإعدادات فورياً وحفظها في متصفحك.
                  </p>
                </div>
              </motion.div>
            )}


            {view === 'compensation' && (
              <motion.div
                key="compensation"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-2xl shadow-sm border border-natural-border overflow-hidden">
                  <div className="p-6 border-b border-natural-border bg-natural-bg/30">
                    <h3 className="font-bold text-lg text-natural-sidebar">إدارة جلسات التعويض</h3>
                    <p className="text-xs text-natural-secondary mt-1">قائمة المشتركين المستحقين لتعويض غيابات سابقة</p>
                  </div>
                  <div className="divide-y divide-natural-bg">
                    {members.filter(m => m.compensationSessions > 0).length === 0 ? (
                      <div className="p-20 text-center text-natural-secondary">
                        <RefreshCw size={48} className="mx-auto mb-4 opacity-10" />
                        <p>لا يوجد جلسات تعويض معلقة حالياً</p>
                      </div>
                    ) : (
                      members.filter(m => m.compensationSessions > 0).map(member => (
                        <div key={member.id} className="p-6 flex items-center justify-between hover:bg-natural-bg/30 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-natural-accent/10 rounded-xl flex items-center justify-center text-natural-accent font-bold">
                              {member.name[0]}
                            </div>
                            <div>
                              <p className="font-bold text-natural-primary">{member.name}</p>
                              <p className="text-xs text-natural-secondary mt-1">عدد جلسات التعويض المتاحة: <span className="text-natural-accent font-bold">{member.compensationSessions}</span></p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              markAttendance(member.id, 'compensated');
                            }}
                            className="bg-natural-accent text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-natural-accent/20 hover:scale-105 transition-transform active:scale-95"
                          >
                            استخدام جلسة تعويض
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'expiry' && (
              <motion.div
                key="expiry"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-2xl shadow-sm border border-natural-border overflow-hidden">
                  <div className="p-6 border-b border-natural-border bg-natural-bg/30">
                    <h3 className="font-bold text-lg text-natural-sidebar">مراقبة انتهاء الاشتراكات</h3>
                    <p className="text-xs text-natural-secondary mt-1">متابعة دقيقة لتواريخ انتهاء المشتركين وتسهيل التجديد</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead className="bg-natural-bg/50 border-b border-natural-border">
                        <tr>
                          <th className="p-4 text-xs font-semibold text-natural-secondary">المشترك</th>
                          <th className="p-4 text-xs font-semibold text-natural-secondary">تاريخ الانتهاء</th>
                          <th className="p-4 text-xs font-semibold text-natural-secondary">الأيام المتبقية</th>
                          <th className="p-4 text-xs font-semibold text-natural-secondary">الإجراء</th>
                          <th className="p-4 text-xs font-semibold text-natural-secondary text-left">حذف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-natural-bg">
                        {[...members].sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()).map(member => {
                          const diff = new Date(member.endDate).getTime() - new Date().getTime();
                          const days = Math.ceil(diff / (1000 * 3600 * 24));
                          const isExpired = days < 0;
                          const isSoon = days >= 0 && days <= 7;

                          return (
                            <tr key={member.id} className="hover:bg-natural-bg/30 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${isExpired ? 'bg-natural-accent/10 text-natural-accent' : 'bg-natural-success/10 text-natural-success'}`}>
                                    {member.name[0]}
                                  </div>
                                  <span className="font-medium text-sm text-natural-primary">{member.name}</span>
                                </div>
                              </td>
                              <td className="p-4 text-sm text-natural-secondary">{member.endDate}</td>
                              <td className="p-4">
                                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                                  isExpired ? 'bg-red-100 text-red-600' : 
                                  isSoon ? 'bg-orange-100 text-orange-600' : 
                                  'bg-green-100 text-green-600'
                                }`}>
                                  {isExpired ? `منتهي منذ ${Math.abs(days)} يوم` : `${days} يوم متبقي`}
                                </span>
                              </td>
                              <td className="p-4">
                                <button 
                                  onClick={() => renewMember(member.id)}
                                  className="text-xs font-bold text-natural-accent hover:underline decoration-2"
                                >
                                  تجديد الاشتراك
                                </button>
                              </td>
                              <td className="p-4 text-left">
                                <button 
                                  onClick={() => deleteMember(member.id)}
                                  className="text-natural-secondary hover:text-red-500 transition-colors p-1"
                                  title="حذف"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Course Details Modal */}
          <AnimatePresence>
            {detailsCourse && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-natural-sidebar/40 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-natural-border"
                >
                  <div className="bg-natural-sidebar p-6 text-white flex justify-between items-center">
                    <h3 className="text-xl font-bold">تفاصيل الدورة التدريبية</h3>
                    <button onClick={() => setDetailsCourse(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-2xl font-bold text-natural-sidebar">{detailsCourse.title}</h4>
                        <p className="text-natural-accent font-bold mt-1">{detailsCourse.instructor}</p>
                      </div>
                      <div className="bg-natural-accent/10 text-natural-accent px-4 py-2 rounded-2xl font-bold">
                        {detailsCourse.price} ر.س
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-natural-bg/50 rounded-2xl border border-natural-border">
                        <p className="text-xs text-natural-secondary mb-1">تاريخ البدء</p>
                        <p className="font-bold text-natural-sidebar">{detailsCourse.startDate}</p>
                      </div>
                      <div className="p-4 bg-natural-bg/50 rounded-2xl border border-natural-border">
                        <p className="text-xs text-natural-secondary mb-1">تاريخ الانتهاء</p>
                        <p className="font-bold text-natural-sidebar">{detailsCourse.endDate}</p>
                      </div>
                      <div className="p-4 bg-natural-bg/50 rounded-2xl border border-natural-border">
                        <p className="text-xs text-natural-secondary mb-1">السعة القصوى</p>
                        <p className="font-bold text-natural-sidebar">{detailsCourse.capacity} متدرب</p>
                      </div>
                      <div className="p-4 bg-natural-bg/50 rounded-2xl border border-natural-border">
                        <p className="text-xs text-natural-secondary mb-1">الحالة</p>
                        <p className="font-bold text-natural-sidebar">
                          {detailsCourse.status === 'active' ? 'نشطة' : detailsCourse.status === 'upcoming' ? 'قادمة' : 'مكتملة'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-natural-sidebar uppercase tracking-wider">وصف الدورة</p>
                      <p className="text-natural-secondary leading-relaxed bg-natural-bg p-4 rounded-2xl border border-natural-border">
                        {detailsCourse.description || 'لا يوجد وصف متاح لهذه الدورة.'}
                      </p>
                    </div>

                    <button 
                      onClick={() => setDetailsCourse(null)}
                      className="w-full bg-natural-sidebar text-white py-4 rounded-2xl font-bold hover:bg-opacity-90 transition-all shadow-lg"
                    >
                      إغلاق التفاصيل
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Delete Confirmation Modal */}
          <AnimatePresence>
            {deleteConfirmId && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-red-900/20 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-red-100 text-center"
                >
                  <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trash2 size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-natural-sidebar mb-2">تأكيد حذف الدورة</h3>
                  <p className="text-natural-secondary mb-8">هل أنت متأكد من رغبتك في حذف هذه الدورة؟ لا يمكن التراجع عن هذا الإجراء وسوف تتأثر بيانات المسجلين.</p>
                  
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => {
                        deleteCourse(deleteConfirmId);
                        setDeleteConfirmId(null);
                      }}
                      className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                    >
                      نعم، احذف الدورة
                    </button>
                    <button 
                      onClick={() => setDeleteConfirmId(null)}
                      className="w-full bg-natural-bg text-natural-sidebar py-4 rounded-2xl font-bold hover:bg-natural-border transition-all"
                    >
                      إلغاء
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Password Protection Modal */}
          <AnimatePresence>
            {isPasswordModalOpen && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-natural-sidebar/60 backdrop-blur-md">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-natural-border overflow-hidden"
                >
                  <div className="bg-natural-sidebar p-8 text-center text-white">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Lock size={32} className="text-natural-accent" />
                    </div>
                    <h3 className="text-xl font-bold mb-1">منطقة محمية</h3>
                    <p className="text-white/60 text-xs">يرجى إدخال كلمة المرور لرؤية المبالغ</p>
                  </div>

                  <div className="p-8 space-y-6">
                    <div className="space-y-4">
                      <div className="relative">
                        <input 
                          type="password" 
                          placeholder="كلمة المرور"
                          className={`w-full px-5 py-4 bg-natural-bg border ${passwordError ? 'border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.5)]' : 'border-natural-border focus:border-natural-accent'} rounded-2xl outline-none text-center font-bold tracking-[0.5em] transition-all`}
                          value={passwordInput}
                          onChange={e => {
                            setPasswordInput(e.target.value);
                            setPasswordError(false);
                          }}
                          onKeyDown={e => e.key === 'Enter' && verifyPassword()}
                          autoFocus
                        />
                        {passwordError && (
                          <motion.p 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-red-500 text-[10px] text-center mt-2 font-bold"
                          >
                            كلمة المرور غير صحيحة، حاول مرة أخرى
                          </motion.p>
                        )}
                      </div>

                      <button 
                        onClick={verifyPassword}
                        className="w-full bg-natural-sidebar text-white py-4 rounded-2xl font-bold hover:bg-natural-accent transition-all shadow-xl shadow-natural-sidebar/20"
                      >
                        دخول
                      </button>
                      <button 
                        onClick={() => {
                          setIsPasswordModalOpen(false);
                          setPasswordInput('');
                          setPasswordError(false);
                        }}
                        className="w-full text-natural-secondary py-2 text-sm font-bold hover:text-natural-sidebar transition-colors"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
                              {/* Quick Stats Edit Modal */}
          <AnimatePresence>
            {editingMemberStats && (
              <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-natural-sidebar/40 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border border-natural-border"
                >
                  <div className="bg-natural-accent p-6 text-white flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold">تعديل سجل الحضور</h3>
                      <p className="text-[10px] opacity-80">{editingMemberStats.name}</p>
                    </div>
                    <button onClick={() => setEditingMemberStats(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  <form onSubmit={handleUpdateStats} className="p-8 space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-natural-sidebar mb-2">عدد الحصص المنجزة</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            className="w-full px-4 py-3 bg-natural-bg border border-natural-border rounded-xl focus:border-natural-accent outline-none text-center font-bold"
                            value={editingMemberStats.attendedCount}
                            onChange={e => setEditingMemberStats({...editingMemberStats, attendedCount: parseInt(e.target.value) || 0})}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-natural-sidebar mb-2">عدد أيام الغياب</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            className="w-full px-4 py-3 bg-natural-bg border border-natural-border rounded-xl focus:border-natural-accent outline-none text-center font-bold"
                            value={editingMemberStats.absentCount}
                            onChange={e => setEditingMemberStats({...editingMemberStats, absentCount: parseInt(e.target.value) || 0})}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-natural-sidebar mb-2">رصيد التعويض المتاح</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            className="w-full px-4 py-3 bg-natural-bg border border-natural-border rounded-xl focus:border-natural-accent outline-none text-center font-bold"
                            value={editingMemberStats.compensationSessions}
                            onChange={e => setEditingMemberStats({...editingMemberStats, compensationSessions: parseInt(e.target.value) || 0})}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button 
                        type="submit"
                        className="w-full bg-natural-accent text-white py-4 rounded-2xl font-bold hover:bg-opacity-90 transition-all shadow-lg"
                      >
                        حفظ التعديلات
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function AccountantView({ members, trainees, settings, setSettings, showTotalAmount, setIsPasswordModalOpen }: any) {
  const [financials, setFinancials] = useState<Record<string, { base?: number, percentage: number, extra: number }>>({});
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcExpression, setCalcExpression] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  
  // Quick Calculation States
  const [calcBase, setCalcBase] = useState<number>(0);
  const [calcPct, setCalcPct] = useState<number>(0);
  const [calcFixed, setCalcFixed] = useState<number>(0);

  const teachers = settings.teachers || [];
  
  const calculateTeacherProfit = (teacher: string) => {
    const teacherMembers = members.filter((m: any) => m.teacherName === teacher);
    const total = teacherMembers.reduce((acc: number, curr: any) => acc + (Number(curr.price) || 0), 0);
    const config = financials[teacher] || { base: total, percentage: 0, extra: 0 };
    const baseToUse = config.base !== undefined ? config.base : total;
    return (baseToUse * (config.percentage / 100)) + Number(config.extra);
  };

  const totalTeacherProfits = teachers.reduce((acc: number, t: string) => acc + calculateTeacherProfit(t), 0);
  const totalExpected = members.reduce((acc: number, curr: any) => acc + (Number(curr.price) || 0), 0);
  const totalAssocProfit = totalExpected - totalTeacherProfits;

  const quickCalcResult = (Number(calcBase) * (Number(calcPct) / 100)) + Number(calcFixed);

  const handleCalcClick = (val: string) => {
    if (val === 'C') {
      setCalcDisplay('0');
      setCalcExpression('');
    } else if (val === '=') {
      try {
        const result = eval(calcExpression.replace(/×/g, '*').replace(/÷/g, '/'));
        setCalcDisplay(String(result));
        setCalcExpression(String(result));
      } catch {
        setCalcDisplay('Error');
      }
    } else {
      const lastChar = calcExpression.slice(-1);
      const isOperator = ['+', '-', '*', '/', '×', '÷'].includes(val);
      const lastIsOperator = ['+', '-', '*', '/', '×', '÷'].includes(lastChar);
      
      if (isOperator && lastIsOperator) {
        setCalcExpression(calcExpression.slice(0, -1) + val);
      } else {
        setCalcExpression(calcExpression === '0' ? val : calcExpression + val);
        setCalcDisplay(calcDisplay === '0' || ['+', '-', '×', '÷'].includes(lastChar) ? val : calcDisplay + val);
      }
    }
  };

  const handleAddTeacher = () => {
    if (!newTeacherName.trim()) return;
    if (teachers.includes(newTeacherName.trim())) {
      setNewTeacherName('');
      return;
    }
    const updatedTeachers = [...teachers, newTeacherName.trim()];
    setSettings({ ...settings, teachers: updatedTeachers });
    setNewTeacherName('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-natural-sidebar">المحاسبة المالية</h2>
          <p className="text-natural-secondary text-sm">تقارير المبالغ المالية لكل معلم/ة</p>
        </div>
        <button 
          onClick={() => {
            if (showTotalAmount) setIsPasswordModalOpen(false); 
            setIsPasswordModalOpen(true);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold transition-all ${
            showTotalAmount 
              ? 'bg-natural-accent/10 text-natural-accent border-natural-accent/20' 
              : 'bg-natural-sidebar text-white border-transparent'
          }`}
        >
          {showTotalAmount ? <EyeOff size={18} /> : <Lock size={18} />}
          {showTotalAmount ? 'إخفاء المبالغ' : 'كشف المبالغ'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            label="إجمالي المبالغ المتوقعة" 
            value={showTotalAmount ? `${totalExpected.toLocaleString()} ر.س` : '••••••'} 
            icon={Tag} 
            color="accent" 
          />
          <StatCard 
            label="المبلغ المتبقي للجمعية" 
            value={showTotalAmount ? `${totalAssocProfit.toLocaleString()} ر.س` : '••••••'} 
            icon={Heart} 
            color="success" 
          />
          <StatCard 
            label="إجمالي مستحقات المعلمين" 
            value={showTotalAmount ? `${totalTeacherProfits.toLocaleString()} ر.س` : '••••••'} 
            icon={Users} 
            color="sidebar" 
          />
          <StatCard 
            label="إجمالي الدورات" 
            value={showTotalAmount ? `${trainees.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0).toLocaleString()} ر.س` : '••••••'} 
            icon={BookOpen} 
            color="accent" 
          />
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-natural-border shadow-sm">
            <h3 className="font-bold text-natural-sidebar mb-4 flex items-center gap-2">
              <Icons.Zap size={20} className="text-natural-accent" />
              حساب سريع
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-natural-secondary block mb-1">المبلغ الأساسي</label>
                <input 
                  type="number"
                  value={calcBase || ''}
                  onChange={e => setCalcBase(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-natural-bg border border-natural-border rounded-xl outline-none focus:border-natural-accent font-bold"
                  placeholder="0"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-natural-secondary block mb-1">النسبة (%)</label>
                  <input 
                    type="number"
                    value={calcPct || ''}
                    onChange={e => setCalcPct(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-natural-bg border border-natural-border rounded-xl outline-none focus:border-natural-accent font-bold text-center"
                    placeholder="0"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-natural-secondary block mb-1">مبلغ مضاف</label>
                  <input 
                    type="number"
                    value={calcFixed || ''}
                    onChange={e => setCalcFixed(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-natural-bg border border-natural-border rounded-xl outline-none focus:border-natural-accent font-bold text-center"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-natural-bg mt-4">
                <div className="flex justify-between items-center bg-natural-sidebar p-4 rounded-2xl text-white">
                  <span className="text-xs font-bold opacity-70">الناتج:</span>
                  <span className="text-lg font-bold">{quickCalcResult.toLocaleString()} ر.س</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-natural-border shadow-sm">
            <h3 className="font-bold text-natural-sidebar mb-4 flex items-center gap-2">
              <Icons.Calculator size={20} className="text-natural-accent" />
              آلة حاسبة
            </h3>
            
            <div className="bg-natural-bg p-4 rounded-2xl mb-4 text-left">
              <div className="text-[10px] text-natural-secondary h-4 overflow-hidden text-right">{calcExpression || ' '}</div>
              <div className="text-xl font-bold text-natural-sidebar truncate text-right">{calcDisplay}</div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '0', '.', 'C', '+'].map(btn => (
                <button 
                  key={btn} 
                  onClick={() => handleCalcClick(btn)}
                  className={`py-2 rounded-xl font-bold transition-all ${
                    ['÷', '×', '-', '+'].includes(btn) 
                      ? 'bg-natural-accent/10 text-natural-accent hover:bg-natural-accent hover:text-white' 
                      : btn === 'C' 
                      ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white' 
                      : 'bg-natural-bg text-natural-sidebar hover:bg-natural-sidebar hover:text-white'
                  }`}
                >
                  {btn}
                </button>
              ))}
              <button 
                onClick={() => handleCalcClick('=')}
                className="col-span-4 bg-natural-sidebar text-white py-2 rounded-xl font-bold hover:bg-natural-accent transition-colors mt-1"
              >
                =
              </button>
            </div>
          </div>
        </div>
      </div>


      <div className="bg-white rounded-3xl border border-natural-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-natural-border bg-natural-bg/30">
          <h3 className="font-bold text-lg text-natural-sidebar">تحليل المبالغ حسب المعلمين</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-natural-bg/50 border-b border-natural-border">
              <tr>
                <th className="p-4 text-xs font-bold text-natural-sidebar">المعلم/ة</th>
                <th className="p-4 text-xs font-bold text-natural-sidebar text-center">طلاب</th>
                <th className="p-4 text-xs font-bold text-natural-sidebar text-center">إجمالي النظام</th>
                <th className="p-4 text-xs font-bold text-natural-sidebar">المبلغ الأساسي</th>
                <th className="p-4 text-xs font-bold text-natural-sidebar">النسبة (%)</th>
                <th className="p-4 text-xs font-bold text-natural-sidebar">المستحق للمعلم</th>
                <th className="p-4 text-xs font-bold text-natural-sidebar">للجمعية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-natural-bg">
              {teachers.map((teacher: string) => {
                const teacherMembers = members.filter((m: any) => m.teacherName === teacher);
                const total = teacherMembers.reduce((acc: number, curr: any) => acc + (Number(curr.price) || 0), 0);
                const config = financials[teacher] || { base: undefined, percentage: 0, extra: 0 };
                
                const baseToUse = config.base !== undefined ? config.base : total;
                const teacherProfit = (baseToUse * (config.percentage / 100)) + Number(config.extra);
                const assocProfit = total - teacherProfit;

                return (
                  <tr key={teacher} className="hover:bg-natural-bg/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-natural-accent/10 rounded-lg flex items-center justify-center text-natural-accent">
                            <Icons.User size={16} />
                          </div>
                          <span className="font-bold text-natural-sidebar text-sm">{teacher}</span>
                        </div>
                        <button 
                          onClick={() => {
                            const updatedTeachers = (settings.teachers || []).filter((t: string) => t !== teacher);
                            setSettings({ ...settings, teachers: updatedTeachers });
                          }}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="حذف"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-xs font-bold text-natural-secondary">
                        {teacherMembers.length}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-xs text-center text-natural-secondary">
                      {showTotalAmount ? `${total.toLocaleString()} ر.س` : '••••••'}
                    </td>
                    <td className="p-4">
                      <input 
                        type="number"
                        placeholder={total.toString()}
                        value={config.base ?? ''}
                        onChange={e => setFinancials({
                          ...financials,
                          [teacher]: { ...config, base: e.target.value === '' ? undefined : Number(e.target.value) }
                        })}
                        className="w-24 p-2 bg-natural-bg rounded-lg border-none focus:ring-1 focus:ring-natural-accent outline-none text-xs text-center font-bold"
                      />
                    </td>
                    <td className="p-4">
                      <input 
                        type="number"
                        placeholder="%"
                        value={config.percentage || ''}
                        onChange={e => setFinancials({
                          ...financials,
                          [teacher]: { ...config, percentage: Number(e.target.value) }
                        })}
                        className="w-16 p-2 bg-natural-bg rounded-lg border-none focus:ring-1 focus:ring-natural-accent outline-none text-xs text-center font-bold"
                      />
                    </td>
                    <td className="p-4 font-bold text-natural-accent">
                      {showTotalAmount ? `${teacherProfit.toLocaleString()} ر.س` : '••••••'}
                    </td>
                    <td className="p-4 font-bold text-natural-secondary text-sm">
                      {showTotalAmount ? `${assocProfit.toLocaleString()} ر.س` : '••••••'}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-natural-bg/10">
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-natural-accent/20 rounded-lg flex items-center justify-center text-natural-accent">
                      <Plus size={16} />
                    </div>
                    <input 
                      type="text"
                      placeholder="اسم المعلم/ة الجديد..."
                      value={newTeacherName}
                      onChange={e => setNewTeacherName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddTeacher()}
                      className="flex-1 bg-white p-2 rounded-lg border border-natural-border focus:border-natural-accent outline-none text-xs font-bold"
                    />
                  </div>
                </td>
                <td colSpan={6} className="p-4">
                  <button 
                    onClick={handleAddTeacher}
                    disabled={!newTeacherName.trim()}
                    className="px-4 py-2 bg-natural-accent text-white rounded-xl text-xs font-bold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    إضافة المعلم/ة للجدول
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot className="bg-natural-sidebar text-white shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
              <tr>
                <td colSpan={2} className="p-6 font-bold text-lg text-white">الإجمالي العام</td>
                <td className="p-6 font-bold text-lg text-center border-r border-white/10 text-white">
                  {showTotalAmount ? `${totalExpected.toLocaleString()} ر.س` : '••••••'}
                </td>
                <td className="p-6 border-r border-white/10" colSpan={2}></td>
                <td className="p-6 font-bold text-lg bg-natural-accent/20 border-r border-white/10 text-white">
                  {showTotalAmount ? `${totalTeacherProfits.toLocaleString()} ر.س` : '••••••'}
                </td>
                <td className="p-6 font-bold text-lg text-white">
                  {showTotalAmount ? `${totalAssocProfit.toLocaleString()} ر.س` : '••••••'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

function TeacherRow({ teacher, total, paid, studentCount, showTotalAmount }: any) {
  return null; // This component is now integrated into AccountantView for better state management
}

function StatCard({ label, value, icon: Icon, color, onClick }: any) {
  const colors: any = {
    accent: 'bg-natural-accent/10 text-natural-accent',
    success: 'bg-natural-success/10 text-natural-success',
    sidebar: 'bg-natural-sidebar/10 text-natural-sidebar',
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-white p-6 rounded-2xl shadow-sm border border-natural-border hover:shadow-md transition-all ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${colors[color] || colors.accent}`}>
          <Icon size={24} />
        </div>
      </div>
      <p className="text-natural-secondary text-sm font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-natural-sidebar">{value}</p>
    </div>
  );
}

function SectionCard({ title, children, badge, icon: Icon }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-natural-border overflow-hidden">
      <div className="p-5 border-b border-natural-border flex justify-between items-center bg-natural-bg/50">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={18} className="text-natural-accent" />}
          <h3 className="font-bold text-natural-sidebar text-sm">{title}</h3>
        </div>
        {badge && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-natural-accent/10 text-natural-accent px-2 py-1 rounded-full border border-natural-accent/20">
            {badge}
          </span>
        )}
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}
