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
  Database,
  Calculator,
  TrendingUp,
  Table,
  FileText,
  ClipboardCheck,
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
import { Member, AttendanceRecord, AppSettings, IconMapping, Course, Trainee, TeacherAttendance } from './types';
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
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { useNavigate, useLocation } from 'react-router-dom';

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

type View = 'dashboard' | 'accountant' | 'teacher_attendance' | 'courses' | 'courses_list' | 'courses_add' | 'courses_trainees' | 'courses_trainee_add' | 'course_fun' | 'course_rose' | 'course_bread' | 'attendance' | 'members' | 'compensation' | 'expiry' | 'settings' | 'about' | string;

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const view = (location.pathname.substring(1) as View) || 'dashboard';
  
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showTotalAmount, setShowTotalAmount] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notif, setNotif] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [newTeacherInput, setNewTeacherInput] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const setView = (v: View) => {
    navigate(`/${v}`);
    setIsMobileMenuOpen(false);
  };

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

  const handleResetPassword = async () => {
    if (!newPasswordInput.trim()) {
      showNotif('يرجى إدخال كلمة مرور صالحة', 'error');
      return;
    }
    try {
      await updateDoc(doc(db, 'settings', 'global'), {
        financialPassword: newPasswordInput.trim()
      });
      setSettings({...settings, financialPassword: newPasswordInput.trim()});
      setIsResettingPassword(false);
      setNewPasswordInput('');
      showNotif('تم تغيير كلمة المرور بنجاح', 'success');
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.UPDATE, 'settings/global');
    }
  };

  // Data Listeners
  useEffect(() => {
    if (!user) return;

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

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), async (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as AppSettings);
      } else {
        // Initialize global settings if they don't exist
        try {
          await setDoc(doc(db, 'settings', 'global'), DEFAULT_SETTINGS);
          setSettings(DEFAULT_SETTINGS);
        } catch (error) {
          console.error("Error initializing settings:", error);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });

    const unsubTeacherAttendance = onSnapshot(collection(db, 'teacher_attendance'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherAttendance));
      setTeacherAttendance(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'teacher_attendance');
    });

    return () => {
      unsubMembers();
      unsubCourses();
      unsubTrainees();
      unsubAttendance();
      unsubSettings();
      unsubTeacherAttendance();
    };
  }, [user]);

  const [newCourse, setNewCourse] = useState<Partial<Course>>({
    title: '',
    instructor: '',
    startDate: '',
    endDate: '',
    price: '',
    duration: '',
    description: '',
    capacity: 20,
    status: 'upcoming',
    cost: '',
    associationPercentage: '30',
    extraIncome: '',
    extraExpenses: '',
    icon: 'BookOpen'
  });

  const [selectedReportCourse, setSelectedReportCourse] = useState<Course | null>(null);
  const [selectedAccountingCourseId, setSelectedAccountingCourseId] = useState<string | null>(null);

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [teacherAttendance, setTeacherAttendance] = useState<TeacherAttendance[]>([]);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [detailsCourse, setDetailsCourse] = useState<Course | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchMember, setSearchMember] = useState('');
  const [editingTrainee, setEditingTrainee] = useState<Trainee | null>(null);
  const [traineeToDelete, setTraineeToDelete] = useState<Trainee | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [courseFilter, setCourseFilter] = useState<'all' | 'active' | 'upcoming' | 'completed'>('all');

  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchMember.toLowerCase()) ||
                         c.instructor.toLowerCase().includes(searchMember.toLowerCase());
    if (courseFilter === 'all') return matchesSearch;
    return matchesSearch && c.status === courseFilter;
  });

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
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    subscriptionDays: 30,
    sessionsCount: undefined,
    grade: '',
    subjects: '',
    price: '',
    paidAmount: '',
    paymentMethod: 'كاش',
    paymentDate: new Date().toISOString().split('T')[0],
    teacherName: '',
    notes: ''
  });

  const resetNewMember = () => {
    setNewMember({ 
      name: '', 
      phone: '', 
      startDate: new Date().toISOString().split('T')[0], 
      endDate: '', 
      subscriptionDays: 30,
      sessionsCount: undefined, // Set to undefined to ensure field is blank
      grade: '', 
      subjects: '', 
      price: '', // Also clear price as part of "blank form" request
      paidAmount: '', // Also clear paid amount as part of "blank form" request
      paymentMethod: 'كاش',
      paymentDate: new Date().toISOString().split('T')[0],
      teacherName: '',
      notes: ''
    });
  };

  useEffect(() => {
    if (isAddModalOpen) {
      resetNewMember();
    }
  }, [isAddModalOpen]);

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

  const handleAddMember = async (e: React.FormEvent, keepOpen = false) => {
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
      sessionsCount: newMember.sessionsCount || 0,
      attendedCount: 0,
      absentCount: 0,
      compensationSessions: 0,
      subscriptionDays: newMember.subscriptionDays,
      grade: newMember.grade || '',
      subjects: newMember.subjects || '',
      price: newMember.price || '0',
      paidAmount: newMember.paidAmount || '0',
      paymentMethod: newMember.paymentMethod as any,
      paymentDate: newMember.paymentDate || new Date().toISOString().split('T')[0],
      teacherName: newMember.teacherName || ''
    };

    try {
      // Check if teacherName is new and add it to settings if so
      if (newMember.teacherName && !settings.teachers?.includes(newMember.teacherName)) {
        const updatedTeachers = [...(settings.teachers || []), newMember.teacherName];
        const newSettings = { ...settings, teachers: updatedTeachers };
        setSettings(newSettings);
        await updateDoc(doc(db, 'settings', 'global'), { teachers: updatedTeachers });
      }

      await setDoc(doc(db, 'members', id), member);
      
      if (!keepOpen) {
        setIsAddModalOpen(false);
      }
      
      showNotif('تمت إضافة المشترك بنجاح', 'success');
      
      // Clear form state completely - Wiping as requested
      resetNewMember();

      if (keepOpen) {
        // Scroll to top of modal to show it's empty
        const modal = document.querySelector('.custom-scrollbar');
        if (modal) modal.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error("Error adding member:", err);
      handleFirestoreError(err, OperationType.WRITE, `members/${id}`);
    }
  };

  const handleSaveCourse = async (e: React.FormEvent, keepOpen = false) => {
    e.preventDefault();
    if (!newCourse.title || !newCourse.instructor) {
      showNotif('يرجى ملء البيانات المطلوبة', 'error');
      return;
    }

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
      duration: newCourse.duration || '',
      description: newCourse.description || '',
      cost: newCourse.cost || '0',
      associationPercentage: newCourse.associationPercentage || '30',
      isSettled: false,
      extraIncome: newCourse.extraIncome || '0',
      extraExpenses: newCourse.extraExpenses || '0'
    };

    try {
      await setDoc(doc(db, 'courses', id), course);
      
      if (!keepOpen) {
        setView('courses_list');
      }
      
      showNotif('تم حفظ الدورة بنجاح', 'success');
      
      setNewCourse({
        title: '',
        instructor: '',
        startDate: '',
        endDate: '',
        price: '',
        duration: '',
        description: '',
        capacity: 20,
        status: 'upcoming',
        cost: '',
        associationPercentage: '30',
        extraIncome: '',
        extraExpenses: ''
      });
    } catch (err) {
      console.error("Error saving course:", err);
      handleFirestoreError(err, OperationType.WRITE, `courses/${id}`);
    }
  };

  const handleSettleCourse = async (courseId: string) => {
    try {
      await updateDoc(doc(db, 'courses', courseId), {
        isSettled: true,
        status: 'completed'
      });
      showNotif('تمت تسوية حسابات الدورة بنجاح', 'success');
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `courses/${courseId}`);
    }
  };

  const handleUpdateCourseFinancials = async (courseId: string, updates: Partial<Course>) => {
    try {
      await updateDoc(doc(db, 'courses', courseId), updates);
      showNotif('تم تحديث البيانات المالية', 'success');
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `courses/${courseId}`);
    }
  };

  const handleRegisterTrainee = async (e: React.FormEvent, keepOpenInput: any = false) => {
    e.preventDefault();
    const keepOpen = typeof keepOpenInput === 'boolean' ? keepOpenInput : false;
    if (!newTrainee.fullName || !newTrainee.courseId) {
      showNotif('يرجى اختيار المتدرب والدورة', 'error');
      return;
    }

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
      
      if (!keepOpen) {
        setView('courses_trainees');
      }

      showNotif('تم تسجيل المتدرب بنجاح', 'success');
      
      setNewTrainee({
        fullName: '',
        motherPhone: '',
        courseId: keepOpen ? newTrainee.courseId : '', // Keep course selected if adding multiple
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
    if (!window.confirm('هل أنت متأكد من حذف هذه الدورة؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    try {
      await deleteDoc(doc(db, 'courses', id));
      showNotif('تم حذف الدورة');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `courses/${id}`);
    }
  };

  const deleteTrainee = async (trainee: Trainee) => {
    try {
      await deleteDoc(doc(db, 'trainees', trainee.id));
      
      const course = courses.find(c => c.id === trainee.courseId || c.title === trainee.courseId);
      if (course) {
        await updateDoc(doc(db, 'courses', course.id), {
          enrolledCount: Math.max(0, (course.enrolledCount || 1) - 1)
        });
      }
      
      showNotif('تم حذف المتدرب بنجاح');
    } catch (err) {
      console.error("Error deleting trainee:", err);
      handleFirestoreError(err, OperationType.DELETE, `trainees/${trainee.id}`);
    }
  };

  const handleUpdateTrainee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrainee) return;
    try {
      await updateDoc(doc(db, 'trainees', editingTrainee.id), {
        fullName: editingTrainee.fullName,
        motherPhone: editingTrainee.motherPhone || '',
        courseId: editingTrainee.courseId,
        duration: editingTrainee.duration,
        amount: editingTrainee.amount,
        paymentMethod: editingTrainee.paymentMethod,
        date: editingTrainee.date,
        notes: editingTrainee.notes || ''
      });
      setEditingTrainee(null);
      showNotif('تم تحديث بيانات المتدرب بنجاح');
    } catch (err) {
      console.error("Error updating trainee:", err);
      handleFirestoreError(err, OperationType.UPDATE, `trainees/${editingTrainee.id}`);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    try {
      await updateDoc(doc(db, 'members', editingMember.id), {
        name: editingMember.name,
        phone: editingMember.phone,
        startDate: editingMember.startDate,
        endDate: editingMember.endDate,
        grade: editingMember.grade,
        subjects: editingMember.subjects,
        price: editingMember.price,
        paidAmount: editingMember.paidAmount,
        paymentMethod: editingMember.paymentMethod,
        paymentDate: editingMember.paymentDate,
        teacherName: editingMember.teacherName,
        notes: editingMember.notes,
        status: editingMember.status,
        compensationSessions: editingMember.compensationSessions,
        subscriptionDays: editingMember.subscriptionDays
      });
      setEditingMember(null);
      showNotif('تم تحديث بيانات المشترك بنجاح');
    } catch (err) {
      console.error("Error updating member:", err);
      handleFirestoreError(err, OperationType.UPDATE, `members/${editingMember.id}`);
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
      showNotif('تم تحديث الإحصائيات بنجاح');
    } catch (err) {
      console.error("Error updating stats:", err);
      handleFirestoreError(err, OperationType.UPDATE, `members/${editingMemberStats.id}`);
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
      showNotif('تم تحديث حالة الدفع');
    } catch (err) {
      console.error("Error updating payment:", err);
      handleFirestoreError(err, OperationType.UPDATE, `members/${memberId}`);
    }
  };

  const markTeacherAttendance = async (teacherName: string, status: 'حاضر' | 'غائب' | 'غائب بي تعويض') => {
    const today = new Date().toISOString().split('T')[0];
    const id = `${teacherName}_${today}`;
    
    try {
      await setDoc(doc(db, 'teacher_attendance', id), {
        id,
        teacherName,
        date: today,
        status
      });
      showNotif(`تم تسجيل ${teacherName} ${status}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `teacher_attendance/${id}`);
    }
  };

  const deleteTeacherAttendance = async (teacherName: string, date?: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف تحضير ${teacherName}؟`)) return;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const id = `${teacherName}_${targetDate}`;
    
    try {
      await deleteDoc(doc(db, 'teacher_attendance', id));
      showNotif(`تم حذف تحضير ${teacherName}${date ? ` ليوم ${date}` : ''}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `teacher_attendance/${id}`);
    }
  };

  // Sync settings with Firestore
  const updateSettings = async (newSettings: AppSettings) => {
    try {
      await setDoc(doc(db, 'settings', 'global'), newSettings);
      showNotif('تم حفظ الإعدادات');
    } catch (err) {
      console.error("Error updating settings:", err);
      handleFirestoreError(err, OperationType.WRITE, 'settings/global');
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
        { id: 'courses_accounting', label: 'محاسبة الدورات' },
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
    { id: 'teacher_attendance', label: 'تحضير المعلمين', icon: UserCheck },
    { id: 'compensation', label: 'التعويض', icon: RefreshCw },
    { id: 'expiry', label: 'انتهاء المدة', icon: Clock },
    { id: 'archives', label: 'الأرشيف والسجلات', icon: History },
    { id: 'database', label: 'قاعدة البيانات', icon: Database },
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

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-natural-bg" dir="rtl">
        <div className="text-center">
          <RefreshCw className="animate-spin text-natural-accent mx-auto mb-4" size={48} />
          <p className="text-natural-sidebar font-bold">جاري تحميل النظام...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-natural-bg p-4" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-[3rem] shadow-2xl border border-natural-border text-center max-w-md w-full"
        >
          <div className="w-24 h-24 bg-natural-accent/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-natural-accent">
            <Lock size={48} />
          </div>
          <h1 className="text-3xl font-black text-natural-sidebar mb-2">تسجيل الدخول</h1>
          <p className="text-natural-secondary font-medium mb-10">يرجى تسجيل الدخول للوصول إلى نظام إدارة النادي</p>
          
          <button
            onClick={() => signInWithGoogle()}
            className="w-full bg-natural-sidebar text-white py-5 rounded-[2rem] font-black hover:bg-natural-accent transition-all shadow-xl shadow-natural-sidebar/20 flex items-center justify-center gap-3"
          >
            <LogIn size={20} />
            الدخول باستخدام جوجل
          </button>
        </motion.div>
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
          
          {user && (
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-red-500/10 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
            >
              <LogOut size={18} />
              <span className="text-sm font-bold">تسجيل الخروج</span>
            </button>
          )}
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
                  className="absolute inset-0 bg-natural-sidebar/40 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden relative z-10 shadow-2xl border border-natural-border flex flex-col"
                  dir="rtl"
                >
                  {/* Modal Header */}
                  <div className="p-8 pb-4 bg-gradient-to-br from-white to-natural-bg/30 relative">
                    <div className="flex justify-between items-center relative z-10">
                      <div>
                        <h3 className="text-2xl font-black text-natural-sidebar flex items-center gap-3">
                          <div className="w-10 h-10 bg-natural-accent/10 rounded-xl flex items-center justify-center text-natural-accent">
                            <Icons.UserPlus size={24} />
                          </div>
                          إضافة مشترك جديد
                        </h3>
                        <p className="text-natural-secondary text-xs mt-2 mr-13 font-bold">يرجى إكمال جميع الحقول المطلوبة لتسجيل العضو الجديد</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={() => resetNewMember()}
                          className="px-3 py-1.5 text-[10px] font-black text-natural-secondary hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex items-center gap-1.5"
                          title="مسح كافة المدخلات"
                        >
                          <Icons.RotateCcw size={14} />
                          مسح الكل
                        </button>
                        <button 
                          type="button"
                          onClick={() => setIsAddModalOpen(false)}
                          className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-red-50 text-natural-secondary hover:text-red-500 transition-all"
                        >
                          <Icons.X size={20} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <form id="add-member-form" onSubmit={handleAddMember} className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar space-y-8">
                    {/* Basic Info Section */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-natural-sidebar flex items-center gap-2 mb-4">
                        <span className="w-8 h-8 bg-natural-bg rounded-lg flex items-center justify-center text-natural-accent">
                          <Icons.User size={16} />
                        </span>
                        بيانات المشترك الأساسية
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-natural-secondary uppercase tracking-wider mr-2">الاسم الكامل <span className="text-red-500">*</span></label>
                          <div className="relative group">
                            <input 
                              id="member-name"
                              type="text" 
                              required
                              autoFocus
                              placeholder="أدخل اسم المشترك..."
                              className="w-full p-4 pr-12 bg-natural-bg/50 border border-transparent focus:border-natural-accent focus:bg-white rounded-2xl outline-none transition-all text-sm font-bold"
                              value={newMember.name}
                              onChange={e => setNewMember({...newMember, name: e.target.value})}
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                setNewMember({...newMember, name: ''});
                                document.getElementById('member-name')?.focus();
                              }}
                              className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all ${
                                newMember.name ? 'text-natural-accent scale-110' : 'text-natural-secondary/30 pointer-events-none'
                              }`}
                            >
                              <Icons.User size={20} />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-natural-secondary uppercase tracking-wider mr-2">رقم الهاتف (اختياري)</label>
                          <div className="relative group">
                            <input 
                              id="member-phone"
                              type="tel" 
                              placeholder="05xxxxxxxx"
                              className="w-full p-4 pr-12 bg-natural-bg/50 border border-transparent focus:border-natural-accent focus:bg-white rounded-2xl outline-none transition-all text-sm font-bold"
                              value={newMember.phone}
                              onChange={e => setNewMember({...newMember, phone: e.target.value})}
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                setNewMember({...newMember, phone: ''});
                                document.getElementById('member-phone')?.focus();
                              }}
                              className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all ${
                                newMember.phone ? 'text-natural-accent scale-110' : 'text-natural-secondary/30 pointer-events-none'
                              }`}
                            >
                              <Icons.Phone size={20} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Subscription Details Section */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-natural-sidebar flex items-center gap-2 mb-4">
                        <span className="w-8 h-8 bg-natural-bg rounded-lg flex items-center justify-center text-natural-accent">
                          <Icons.Calendar size={16} />
                        </span>
                        تفاصيل الاشتراك
                      </h4>
                      <div className="bg-natural-bg/20 p-6 rounded-[2rem] border border-natural-border/50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-natural-secondary mr-2">تاريخ البدء</label>
                            <div className="relative group">
                              <input 
                                id="member-start-date"
                                type="date" 
                                required
                                className="w-full p-3.5 pr-10 bg-white border border-natural-border rounded-xl focus:border-natural-accent outline-none text-xs font-bold text-center"
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
                              <Icons.Calendar 
                                className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${newMember.startDate ? 'text-natural-accent' : 'text-natural-secondary/30'}`} 
                                size={14} 
                              />
                            </div>
                            <button 
                              type="button" 
                              onClick={() => {
                                const today = new Date().toISOString().split('T')[0];
                                let newEnd = newMember.endDate;
                                if (newMember.subscriptionDays) {
                                  try {
                                    const d = new Date(today);
                                    d.setDate(d.getDate() + (newMember.subscriptionDays || 0));
                                    if (!isNaN(d.getTime())) {
                                      newEnd = d.toISOString().split('T')[0];
                                    }
                                  } catch(err) {}
                                }
                                setNewMember({...newMember, startDate: today, endDate: newEnd});
                              }}
                              className="w-full text-[10px] text-natural-accent font-black hover:bg-natural-accent/5 py-1 rounded-lg transition-colors mt-1"
                            >
                              اختيار اليوم
                            </button>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-natural-secondary mr-2 text-center block">مدة الاشتراك</label>
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                className="w-full p-3.5 bg-white border border-natural-border rounded-xl focus:border-natural-accent outline-none font-bold text-center text-xs"
                                value={newMember.subscriptionDays || ''}
                                placeholder="30"
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
                              <span className="text-[10px] font-bold text-natural-secondary">يوم</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-natural-secondary mr-2">تاريخ الانتهاء</label>
                            <div className="relative group">
                              <input 
                                id="member-end-date"
                                type="date" 
                                required
                                className="w-full p-3.5 pr-10 bg-white border border-natural-border rounded-xl focus:border-natural-accent outline-none text-xs font-bold text-center"
                                value={newMember.endDate}
                                onChange={e => setNewMember({...newMember, endDate: e.target.value})}
                              />
                              <Icons.Timer 
                                className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${newMember.endDate ? 'text-natural-accent' : 'text-natural-secondary/30'}`} 
                                size={14} 
                              />
                            </div>
                            <p className="text-[9px] text-natural-sidebar mt-1 text-center font-black">
                              {newMember.endDate ? `تنتهي في ${newMember.endDate}` : 'ادخل المدة أو التاريخ'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Educational Details Section */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-natural-sidebar flex items-center gap-2 mb-4">
                        <span className="w-8 h-8 bg-natural-bg rounded-lg flex items-center justify-center text-natural-accent">
                          <Icons.GraduationCap size={16} />
                        </span>
                        بيانات الحلقة والدراسة
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-natural-secondary mr-2">المعلم/ة</label>
                          <div className="relative group">
                            <input 
                              id="member-teacher"
                              list="teachersList"
                              className="w-full p-3.5 pr-10 bg-natural-bg/50 border border-transparent focus:border-natural-accent focus:bg-white rounded-xl outline-none transition-all text-xs font-bold"
                              value={newMember.teacherName}
                              onChange={e => setNewMember({...newMember, teacherName: e.target.value})}
                              placeholder="اسم المعلم"
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                setNewMember({...newMember, teacherName: ''});
                                document.getElementById('member-teacher')?.focus();
                              }}
                              className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-all ${
                                newMember.teacherName ? 'text-natural-accent scale-110' : 'text-natural-secondary/30 pointer-events-none'
                              }`}
                            >
                              <Icons.UserCheck size={18} />
                            </button>
                            <datalist id="teachersList">
                              {(settings.teachers || []).map(teacher => (
                                <option key={teacher} value={teacher} />
                              ))}
                            </datalist>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-natural-secondary mr-2">الصف</label>
                            <div className="relative group">
                              <input 
                                id="member-grade"
                                list="gradesList"
                                className="w-full p-3.5 pr-10 bg-natural-bg/50 border border-transparent focus:border-natural-accent focus:bg-white rounded-xl outline-none transition-all text-xs font-bold"
                                value={newMember.grade}
                                onChange={e => setNewMember({...newMember, grade: e.target.value})}
                                placeholder="الصف الدراسي"
                              />
                              <button 
                                type="button"
                                onClick={() => {
                                  setNewMember({...newMember, grade: ''});
                                  document.getElementById('member-grade')?.focus();
                                }}
                                className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-all ${
                                  newMember.grade ? 'text-natural-accent scale-110' : 'text-natural-secondary/30 pointer-events-none'
                                }`}
                              >
                                <Icons.School size={16} />
                              </button>
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
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-natural-secondary mr-2">عدد المواد</label>
                            <div className="relative group">
                              <input 
                                id="member-subjects"
                                list="subjectsList"
                                className="w-full p-3.5 pr-10 bg-natural-bg/50 border border-transparent focus:border-natural-accent focus:bg-white rounded-xl outline-none transition-all text-xs font-bold"
                                value={newMember.subjects}
                                onChange={e => setNewMember({...newMember, subjects: e.target.value})}
                                placeholder="اختر المواد"
                              />
                              <button 
                                type="button"
                                onClick={() => {
                                  setNewMember({...newMember, subjects: ''});
                                  document.getElementById('member-subjects')?.focus();
                                }}
                                className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-all ${
                                  newMember.subjects ? 'text-natural-accent scale-110' : 'text-natural-secondary/30 pointer-events-none'
                                }`}
                              >
                                <Icons.Book size={16} />
                              </button>
                            <datalist id="subjectsList">
                              <option value="حقيبة كاملة" />
                              <option value="انجليزي" />
                              <option value="رياضيات" />
                              <option value="لغتي" />
                            </datalist>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-natural-secondary mr-2">عدد الحصص</label>
                          <div className="relative group">
                            <input 
                              id="member-sessions"
                              type="text" 
                              className="w-full p-3.5 pr-10 bg-natural-bg/50 border border-transparent focus:border-natural-accent focus:bg-white rounded-xl outline-none transition-all text-xs font-bold text-center"
                              placeholder="مثلاً: 12"
                              value={newMember.sessionsCount || ''}
                              onChange={e => {
                                const val = e.target.value;
                                if (val === '' || /^\d+$/.test(val)) {
                                  setNewMember({...newMember, sessionsCount: val === '' ? 0 : parseInt(val)})
                                }
                              }}
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                setNewMember({...newMember, sessionsCount: 0});
                                document.getElementById('member-sessions')?.focus();
                              }}
                              className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-all ${
                                newMember.sessionsCount ? 'text-natural-accent scale-110' : 'text-natural-secondary/30 pointer-events-none'
                              }`}
                            >
                              <Icons.Hash size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Financial Details Section */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-natural-sidebar flex items-center gap-2 mb-4">
                        <span className="w-8 h-8 bg-natural-bg rounded-lg flex items-center justify-center text-natural-accent">
                          <Icons.Wallet size={16} />
                        </span>
                        التحصيل المالي
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-natural-secondary mr-2">سعر الاشتراك</label>
                          <div className="relative group">
                            <input 
                              id="member-price"
                              type="text" 
                              className="w-full p-4 pr-12 bg-natural-bg/50 border border-transparent focus:border-natural-accent focus:bg-white rounded-[1.25rem] outline-none transition-all text-sm font-black"
                              placeholder="0.00"
                              value={newMember.price}
                              onChange={e => setNewMember({...newMember, price: e.target.value})}
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                setNewMember({...newMember, price: ''});
                                document.getElementById('member-price')?.focus();
                              }}
                              className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all ${
                                newMember.price ? 'text-natural-accent scale-110' : 'text-natural-secondary/30 pointer-events-none'
                              }`}
                            >
                              <Icons.DollarSign size={20} />
                            </button>
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-natural-secondary">ر.س</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {['700', '500', '350', '250', '150'].map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setNewMember({...newMember, price: p})}
                                className={`px-2 py-1 text-[9px] rounded-lg border font-bold transition-all ${
                                  newMember.price === p 
                                    ? 'bg-natural-accent text-white border-natural-accent' 
                                    : 'bg-white text-natural-secondary border-natural-border hover:bg-natural-bg'
                                }`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-natural-secondary mr-2">المبلغ المسدد</label>
                          <div className="relative group">
                            <input 
                              id="member-paid"
                              type="text" 
                              className="w-full p-4 pr-12 bg-natural-bg/80 border border-transparent focus:border-natural-accent focus:bg-white rounded-[1.25rem] outline-none transition-all text-sm font-black text-natural-accent"
                              placeholder="0.00"
                              value={newMember.paidAmount}
                              onChange={e => setNewMember({...newMember, paidAmount: e.target.value})}
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                setNewMember({...newMember, paidAmount: ''});
                                document.getElementById('member-paid')?.focus();
                              }}
                              className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all ${
                                newMember.paidAmount ? 'text-natural-accent scale-110' : 'text-natural-secondary/30 pointer-events-none'
                              }`}
                            >
                              <Icons.CreditCard size={20} />
                            </button>
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-natural-accent">مدفوع</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-natural-secondary mr-2">طريقة الدفع</label>
                          <div className="grid grid-cols-1 gap-2">
                            <select 
                              className="w-full p-4 bg-natural-bg/50 border border-transparent focus:border-natural-accent focus:bg-white rounded-[1.25rem] outline-none transition-all text-xs font-bold appearance-none"
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
                              <option value="كاش">نقدي (كاش)</option>
                              <option value="تحويل">تحويل مصرفي</option>
                              <option value="لم يتم الدفع">لم يتم الدفع بعد</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="space-y-2">
                           <div className="flex justify-between items-center mr-2">
                            <label className="text-[10px] font-black text-natural-secondary uppercase tracking-wider">تاريخ الدفع</label>
                            <button 
                              type="button" 
                              onClick={() => setNewMember({...newMember, paymentDate: new Date().toISOString().split('T')[0]})}
                              className="text-[9px] text-natural-accent font-black hover:underline"
                            >
                              اليوم
                            </button>
                           </div>
                           <div className="relative group">
                            <input 
                              id="member-payment-date"
                              type="date" 
                              className="w-full p-4 pr-12 bg-natural-bg/50 border border-transparent focus:border-natural-accent focus:bg-white rounded-[1.25rem] outline-none transition-all text-xs font-bold"
                              value={newMember.paymentDate}
                              onChange={e => setNewMember({...newMember, paymentDate: e.target.value})}
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                setNewMember({...newMember, paymentDate: ''});
                                document.getElementById('member-payment-date')?.focus();
                              }}
                              className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all ${
                                newMember.paymentDate ? 'text-natural-accent scale-110' : 'text-natural-secondary/30 pointer-events-none'
                              }`}
                            >
                              <Icons.CalendarCheck size={20} />
                            </button>
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-natural-secondary mr-2">ملاحظات إضافية</label>
                           <div className="relative group">
                            <input 
                              id="member-notes"
                              className="w-full p-4 pr-12 bg-natural-bg/50 border border-transparent focus:border-natural-accent focus:bg-white rounded-[1.25rem] outline-none transition-all text-xs font-bold"
                              placeholder="أي ملاحظات تخص المشترك..."
                              value={newMember.notes || ''}
                              onChange={e => setNewMember({...newMember, notes: e.target.value})}
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                setNewMember({...newMember, notes: ''});
                                document.getElementById('member-notes')?.focus();
                              }}
                              className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all ${
                                newMember.notes ? 'text-natural-accent scale-110' : 'text-natural-secondary/30 pointer-events-none'
                              }`}
                            >
                              <Icons.MessageSquare size={20} />
                            </button>
                           </div>
                        </div>
                      </div>
                    </div>
                  </form>

                  {/* Modal Footer */}
                  <div className="p-8 border-t border-natural-border bg-white flex flex-col md:flex-row gap-3">
                    <button 
                      type="button"
                      onClick={(e) => handleAddMember(e, false)}
                      className="flex-[2] bg-natural-sidebar text-white p-5 rounded-[1.5rem] font-bold hover:bg-opacity-95 transition-all shadow-xl shadow-natural-sidebar/10 flex items-center justify-center gap-3 group"
                    >
                      <Icons.Save size={20} className="group-hover:scale-110 transition-transform" />
                      حفظ وإغلاق
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => handleAddMember(e, true)}
                      className="flex-[2] bg-natural-accent/10 text-natural-sidebar p-5 rounded-[1.5rem] font-bold hover:bg-natural-accent/20 transition-all flex items-center justify-center gap-3 border border-natural-accent/30 group"
                    >
                      <Icons.UserPlus size={20} className="group-hover:rotate-12 transition-transform" />
                      حفظ وإضافة مشترك آخر
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsAddModalOpen(false);
                      }}
                      className="flex-1 bg-natural-bg text-natural-sidebar p-5 rounded-[1.5rem] font-bold hover:bg-natural-border transition-all border border-natural-border"
                    >
                      إلغاء
                    </button>
                  </div>
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
                teacherAttendance={teacherAttendance}
                markTeacherAttendance={markTeacherAttendance}
                deleteTeacherAttendance={deleteTeacherAttendance}
              />
            )}

            {view === 'teacher_attendance' && (
              <TeacherAttendanceView 
                teachers={settings.teachers || []}
                attendance={teacherAttendance}
                markAttendance={markTeacherAttendance}
                deleteTeacherAttendance={deleteTeacherAttendance}
                onAddTeacher={(name: string) => {
                  if (name.trim() && !settings.teachers?.includes(name.trim())) {
                    const updatedTeachers = [...(settings.teachers || []), name.trim()];
                    updateSettings({ ...settings, teachers: updatedTeachers });
                  }
                }}
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
                        onClick={() => {
                          resetNewMember();
                          setIsAddModalOpen(true);
                        }}
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
                              {(m.name || '')[0]}
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
                                {(m.name || '')[0]}
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

                <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
                  <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-natural-border shadow-sm overflow-x-auto max-w-full">
                    {(['all', 'active', 'upcoming', 'completed'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setCourseFilter(f)}
                        className={`px-6 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                          courseFilter === f ? 'bg-natural-sidebar text-white shadow-md' : 'text-natural-secondary hover:bg-natural-bg'
                        }`}
                      >
                        {f === 'all' ? 'الكل' : f === 'active' ? 'نشطة' : f === 'upcoming' ? 'قادمة' : 'مكتملة'}
                      </button>
                    ))}
                  </div>
                  <div className="relative w-full md:w-80">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-natural-secondary" size={18} />
                    <input 
                      type="text" 
                      placeholder="ابحث عن دورة أو مدربة..." 
                      className="w-full pr-12 pl-4 py-3 bg-white border border-natural-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-natural-accent focus:border-transparent transition-all shadow-sm"
                      value={searchMember}
                      onChange={(e) => setSearchMember(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCourses.map(course => (
                    <div key={course.id} className="bg-white rounded-3xl border border-natural-border overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-natural-accent/10 rounded-2xl flex items-center justify-center text-natural-accent">
                               <DynamicIcon name={course.icon || 'BookOpen'} size={20} />
                            </div>
                            <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              course.status === 'active' ? 'bg-natural-success/10 text-natural-success' :
                              course.status === 'upcoming' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'
                            }`}>
                              {course.status === 'active' ? 'نشطة حالياً' : 
                               course.status === 'upcoming' ? 'قادمة قريباً' : 'مكتملة'}
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-lg font-bold text-natural-accent">{course.price} ر.س</span>
                            <button 
                              onClick={() => setSelectedReportCourse(course)}
                              className="mt-2 p-2 bg-natural-sidebar/5 rounded-xl text-natural-sidebar hover:bg-natural-accent hover:text-white transition-all shadow-sm"
                              title="عرض جدول الإحصائيات"
                            >
                              <Icons.Table size={16} />
                            </button>
                          </div>
                        </div>
                        <h3 
                          onClick={() => setDetailsCourse(course)}
                          className="text-xl font-bold text-natural-sidebar mb-2 group-hover:text-natural-accent transition-colors cursor-pointer"
                        >
                          {course.title}
                        </h3>
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
                            setSelectedCourseId(course.id);
                            setView('courses_trainees');
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
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-natural-sidebar block px-1">المدة (مثلاً: 4 أسابيع)</label>
                      <input 
                         type="text" 
                         value={newCourse.duration}
                         onChange={(e) => setNewCourse({...newCourse, duration: e.target.value})}
                         placeholder="اسبوع - يوم" 
                         className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-natural-sidebar block px-1">أيقونة الدورة</label>
                      <div className="flex flex-wrap gap-2 p-2 bg-natural-bg rounded-xl border border-natural-border min-h-[46px]">
                        {['BookOpen', 'Palette', 'Smile', 'Star', 'Heart', 'Zap', 'Coffee', 'Globe', 'Award', 'Camera'].map(iconName => (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => setNewCourse({...newCourse, icon: iconName})}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              newCourse.icon === iconName ? 'bg-natural-accent text-white shadow-md' : 'text-natural-secondary hover:bg-natural-border'
                            }`}
                          >
                            <DynamicIcon name={iconName} size={16} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-natural-sidebar block px-1">التكلفة التشغيلية (ر.س)</label>
                      <input 
                        type="number" 
                        value={newCourse.cost}
                        onChange={(e) => setNewCourse({...newCourse, cost: e.target.value})}
                        placeholder="0" 
                        className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-natural-sidebar block px-1">نسبة الجمعية (%)</label>
                      <input 
                        type="number" 
                        value={newCourse.associationPercentage}
                        onChange={(e) => setNewCourse({...newCourse, associationPercentage: e.target.value})}
                        placeholder="30" 
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
                  <div className="pt-4 flex flex-col md:flex-row gap-4">
                    <button 
                      type="button" 
                      onClick={(e) => handleSaveCourse(e, false)}
                      className="flex-[2] bg-natural-sidebar text-white py-4 rounded-2xl font-bold shadow-lg shadow-natural-sidebar/10 hover:bg-opacity-95 transition-all flex items-center justify-center gap-2 group"
                    >
                      <Icons.Save size={20} className="group-hover:scale-110 transition-transform" />
                      حفظ وإغلاق
                    </button>
                    <button 
                      type="button" 
                      onClick={(e) => handleSaveCourse(e, true)}
                      className="flex-[2] bg-natural-accent/10 text-natural-sidebar py-4 rounded-2xl font-bold hover:bg-natural-accent/20 transition-all flex items-center justify-center gap-3 border border-natural-accent/30 group"
                    >
                      <Icons.Plus size={20} className="group-hover:rotate-90 transition-transform" />
                      حفظ وإضافة دورة أخرى
                    </button>
                    <button type="button" onClick={() => setView('courses_list')} className="flex-1 bg-natural-bg text-natural-sidebar py-4 rounded-2xl font-bold hover:bg-natural-border transition-all">
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
                      onClick={() => {
                        setNewTrainee({
                          fullName: '',
                          motherPhone: '',
                          courseId: selectedCourseId || '',
                          amount: '',
                          paymentMethod: 'كاش',
                          duration: 'شهر',
                          date: new Date().toISOString().split('T')[0],
                          notes: ''
                        });
                        setView('courses_trainee_add');
                      }}
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
                                      {(trainee.fullName || '')[0]}
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
                                    <button 
                                      onClick={() => setEditingTrainee(trainee)}
                                      className="p-1 hover:text-natural-accent transition-colors"
                                      title="تعديل"
                                    >
                                      <Icons.Edit2 size={16} />
                                    </button>
                                    <button 
                                      onClick={() => setTraineeToDelete(trainee)}
                                      className="p-1 hover:text-red-500 transition-colors"
                                      title="حذف"
                                    >
                                      <Trash2 size={16} />
                                    </button>
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
                      <label className="text-xs font-bold text-natural-sidebar block px-1">رقم جوال الأم (اختياري)</label>
                      <input 
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

                   <div className="pt-4 flex flex-col md:flex-row gap-4">
                    <button 
                      type="button" 
                      onClick={(e) => handleRegisterTrainee(e, false)}
                      className="flex-[2] bg-natural-sidebar text-white py-4 rounded-2xl font-bold shadow-lg shadow-natural-sidebar/10 hover:bg-opacity-95 transition-all flex items-center justify-center gap-2 group"
                    >
                      <Icons.Save size={20} className="group-hover:scale-110 transition-transform" />
                      حفظ البيانات
                    </button>
                    <button 
                      type="button" 
                      onClick={(e) => handleRegisterTrainee(e, true)}
                      className="flex-[2] bg-natural-accent/10 text-natural-sidebar py-4 rounded-2xl font-bold hover:bg-natural-accent/20 transition-all flex items-center justify-center gap-3 border border-natural-accent/30 group"
                    >
                      <Icons.UserPlus size={20} className="group-hover:rotate-12 transition-transform" />
                      حفظ وإضافة متدرب آخر
                    </button>
                    <button type="button" onClick={() => setView('courses_trainees')} className="flex-1 bg-natural-bg text-natural-sidebar py-4 rounded-2xl font-bold hover:bg-natural-border transition-all">
                      إلغاء
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {view === 'courses_accounting' && (
              <motion.div
                key="courses_accounting"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 pb-4 border-b-2 border-natural-sidebar/10 text-right gap-4" dir="rtl">
                  <div className="flex-1">
                    <h2 className="text-3xl font-black text-natural-sidebar mb-1">محاسبة الدورات</h2>
                    <p className="text-sm font-medium text-natural-secondary mt-1">
                      {selectedAccountingCourseId ? (
                        <span className="flex items-center gap-1">
                          التقرير المالي التفصيلي لـ: 
                          <span className="text-natural-accent font-black">
                            {courses.find(c => c.id === selectedAccountingCourseId)?.title}
                          </span>
                        </span>
                      ) : (
                        `تقرير شامل للدورات الحالية: ${courses.map(c => c.title).join(' • ')}`
                      )}
                    </p>
                  </div>
                  
                  {!selectedAccountingCourseId && courses.length > 0 && (
                    <div className="hidden lg:flex flex-wrap gap-2 max-w-xl justify-end" dir="rtl">
                      {courses.slice(0, 5).map(c => (
                        <button 
                          key={c.id}
                          onClick={() => setSelectedAccountingCourseId(c.id)}
                          className="px-3 py-1.5 bg-natural-sidebar/5 border border-natural-sidebar/10 rounded-xl text-[10px] font-black text-natural-sidebar hover:bg-natural-accent hover:text-white hover:border-natural-accent transition-all animate-in fade-in slide-in-from-top-2"
                        >
                          {c.title}
                        </button>
                      ))}
                      {courses.length > 5 && <span className="text-[10px] font-bold text-natural-secondary flex items-center">+{courses.length - 5} دورة أخرى</span>}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                      <select 
                        value={selectedAccountingCourseId || ''} 
                        onChange={(e) => setSelectedAccountingCourseId(e.target.value || null)}
                        className="w-full p-3 pr-10 bg-white border-2 border-natural-border focus:border-natural-accent rounded-2xl outline-none appearance-none font-bold text-sm text-natural-sidebar shadow-sm cursor-pointer"
                      >
                        <option value="">جميع الدورات (نظرة عامة)</option>
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                      <Icons.ChevronDown size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-natural-secondary pointer-events-none" />
                    </div>
                  </div>
                </div>

                {!selectedAccountingCourseId && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-natural-border flex items-center justify-between transition-all hover:shadow-md">
                        <div>
                          <span className="text-[10px] font-black text-natural-secondary uppercase block mb-1">إجمالي المتدربين</span>
                          <span className="text-2xl font-black text-natural-sidebar">{trainees.length}</span>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-natural-sidebar/5 flex items-center justify-center text-natural-sidebar">
                          <Icons.Users size={20} />
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-natural-border flex items-center justify-between transition-all hover:shadow-md">
                        <div>
                          <span className="text-[10px] font-black text-natural-secondary uppercase block mb-1">إجمالي الدخل</span>
                          <span className="text-2xl font-black text-natural-accent">
                            {trainees.filter(t => t.paymentMethod !== 'لم يتم الدفع').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0).toLocaleString()} ر.س
                          </span>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-natural-accent/5 flex items-center justify-center text-natural-accent">
                          <Icons.TrendingUp size={20} />
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-natural-border flex items-center justify-between transition-all hover:shadow-md">
                        <div>
                          <span className="text-[10px] font-black text-red-500 uppercase block mb-1">مبالغ متبقية</span>
                          <span className="text-2xl font-black text-red-600">
                            {trainees.filter(t => t.paymentMethod === 'لم يتم الدفع').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0).toLocaleString()} ر.س
                          </span>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                          <Icons.Clock size={20} />
                        </div>
                      </div>

                      {courses.length > 0 && (
                        <div className="md:col-span-3 pt-2 border-t border-natural-sidebar/5">
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 text-[10px] font-black text-natural-secondary px-2 italic">قائمة النظام:</span>
                            <div className="flex flex-wrap gap-2">
                              {courses.map(c => (
                                <button 
                                  key={c.id}
                                  onClick={() => setSelectedAccountingCourseId(c.id)}
                                  className="px-3 py-1 bg-white border border-natural-border rounded-xl text-[10px] font-bold text-natural-sidebar shadow-sm hover:border-natural-accent hover:text-natural-accent transition-all"
                                >
                                  {c.title}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!selectedAccountingCourseId ? (
                  <div className="space-y-6">
                    {/* Visual Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" dir="rtl">
                      <div className="bg-white p-6 rounded-[2rem] border-2 border-natural-sidebar/5 shadow-xl shadow-natural-sidebar/5">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="font-black text-natural-sidebar flex items-center gap-2">
                            <Icons.BarChart3 size={20} className="text-natural-accent" />
                            مقارنة الدخل والتكاليف
                          </h3>
                        </div>
                        <div className="h-72 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={courses.map(c => {
                                const ct = trainees.filter(t => t.courseId === c.id || t.courseId === c.title);
                                const traineeInc = ct.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
                                const extraInc = parseFloat(c.extraIncome || '0') || 0;
                                const baseCost = parseFloat(c.cost || '0') || 0;
                                const extraExp = parseFloat(c.extraExpenses || '0') || 0;
                                return {
                                  name: c.title,
                                  الدخل: traineeInc + extraInc,
                                  التكاليف: baseCost + extraExp
                                };
                              })}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                              <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip 
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ fontWeight: 'bold' }}
                              />
                              <Legend verticalAlign="top" height={36}/>
                              <Bar dataKey="الدخل" fill="#1E293B" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="التكاليف" fill="#FFC107" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-[2rem] border-2 border-natural-sidebar/5 shadow-xl shadow-natural-sidebar/5">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="font-black text-natural-sidebar flex items-center gap-2">
                            <Icons.Activity size={20} className="text-green-600" />
                            توزيع صافي الأرباح
                          </h3>
                        </div>
                        <div className="h-72 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={courses.map(c => {
                                  const ct = trainees.filter(t => t.courseId === c.id || t.courseId === c.title);
                                  const income = ct.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) + (parseFloat(c.extraIncome || '0') || 0);
                                  const cost = (parseFloat(c.cost || '0') || 0) + (parseFloat(c.extraExpenses || '0') || 0);
                                  return { name: c.title, value: Math.max(0, income - cost) };
                                }).filter(d => d.value > 0)}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {courses.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={[ '#1E293B', '#FFC107', '#10B981', '#F59E0B', '#3B82F6' ][index % 5]} />
                                ))}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              />
                              <Legend layout="vertical" align="right" verticalAlign="middle" />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Individual Tables For Each Course */}
                    <div className="space-y-10 pt-4" dir="rtl">
                      {courses.map(course => {
                        const ct = trainees.filter(t => t.courseId === course.id || t.courseId === course.title);
                        const traineeInc = ct.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
                        const extraInc = parseFloat(course.extraIncome || '0') || 0;
                        const finalIncome = traineeInc + extraInc;
                        
                        const baseCost = parseFloat(course.cost || '0') || 0;
                        const extraExp = parseFloat(course.extraExpenses || '0') || 0;
                        const totalExp = baseCost + extraExp;
                        
                        const net = finalIncome - totalExp;
                        const courseBasePrice = parseFloat(course.price || '0') || 0;
                        const potentialTotal = ct.length * courseBasePrice;
                        const totalDiscount = potentialTotal - traineeInc;
                        const progress = Math.min(100, (ct.length / (course.capacity || 20)) * 100);

                        return (
                          <div key={course.id} className="group animate-in fade-in slide-in-from-right-4">
                            <div className="bg-white rounded-[2rem] border-2 border-natural-sidebar/5 overflow-hidden shadow-xl shadow-natural-sidebar/5 transition-all hover:shadow-2xl hover:border-natural-accent/20">
                              {/* Course Mini Header */}
                              <div className="p-6 bg-natural-sidebar text-white flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                  <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-natural-accent">
                                    <Icons.BookOpen size={24} />
                                  </div>
                                  <div>
                                    <h4 className="text-lg font-black">{course.title}</h4>
                                    <p className="text-xs font-bold text-white/70">المدربة: {course.instructor}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-left px-4 border-l border-white/10">
                                    <span className="text-[10px] font-bold text-white/50 block">حالة التحصيل</span>
                                    <span className={`text-xs font-black ${course.isSettled ? 'text-green-400' : 'text-yellow-400'}`}>
                                      {course.isSettled ? 'تمت التسوية' : 'بانتظار التسوية'}
                                    </span>
                                  </div>
                                  <button 
                                    onClick={() => setSelectedAccountingCourseId(course.id)}
                                    className="p-3 bg-natural-accent text-white rounded-xl hover:scale-105 transition-transform shadow-lg shadow-black/20"
                                    title="عرض التفاصيل الكاملة"
                                  >
                                    <Icons.ChevronLeft size={20} />
                                  </button>
                                </div>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-right border-collapse">
                                  <thead>
                                    <tr className="bg-natural-bg/50 text-natural-sidebar text-[10px] uppercase font-black">
                                      <th className="p-4 border-l border-natural-sidebar/5">المشتركين</th>
                                      <th className="p-4 border-l border-natural-sidebar/5 text-center">إجمالي الدخل</th>
                                      <th className="p-4 border-l border-natural-sidebar/5 text-center">إجمالي التكاليف</th>
                                      <th className="p-4 border-l border-natural-sidebar/5 text-center">حصة الجمعية</th>
                                      <th className="p-4 border-l border-natural-sidebar/5 text-center">حصة المدربة</th>
                                      <th className="p-4 text-center">الصافي النهائي</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="text-natural-sidebar group-hover:bg-natural-bg/10 transition-colors">
                                      <td className="p-4 border-l border-natural-sidebar/5">
                                        <div className="flex items-center gap-2">
                                          <span className="text-lg font-black">{ct.length}</span>
                                          <div className="flex-1 h-1.5 w-16 bg-natural-bg rounded-full overflow-hidden">
                                            <div className="h-full bg-natural-accent" style={{ width: `${progress}%` }} />
                                          </div>
                                        </div>
                                      </td>
                                      <td className="p-4 text-center border-l border-natural-sidebar/5">
                                        <div className="flex flex-col items-center">
                                          <span className="font-black text-natural-sidebar">{finalIncome.toLocaleString()} ر.س</span>
                                          <span className="text-[8px] font-bold text-natural-secondary italic">
                                            ({traineeInc} متدربين + {extraInc} إضافي)
                                          </span>
                                        </div>
                                      </td>
                                      <td className="p-4 text-center border-l border-natural-sidebar/5 font-bold text-red-500">
                                        {totalExp.toLocaleString()} ر.س
                                      </td>
                                      <td className="p-4 text-center border-l border-natural-sidebar/5">
                                        <div className="flex flex-col items-center">
                                          <span className="font-black text-natural-sidebar">
                                            {(net > 0 ? (net * (parseFloat(course.associationPercentage || '30') / 100)) : 0).toLocaleString()} ر.س
                                          </span>
                                          <span className="text-[8px] font-bold text-natural-secondary">{course.associationPercentage || '30'}%</span>
                                        </div>
                                      </td>
                                      <td className="p-4 text-center border-l border-natural-sidebar/5">
                                        <div className="flex flex-col items-center">
                                          <span className="font-black text-natural-sidebar">
                                            {(net > 0 ? (net * ((100 - parseFloat(course.associationPercentage || '30')) / 100)) : 0).toLocaleString()} ر.س
                                          </span>
                                          <span className="text-[8px] font-bold text-natural-secondary">{100 - parseFloat(course.associationPercentage || '30')}%</span>
                                        </div>
                                      </td>
                                      <td className="p-4 text-center">
                                        <span className={`px-4 py-2 rounded-xl font-black text-sm border-2 ${net >= 0 ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                          {net.toLocaleString()} ر.س
                                        </span>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                              
                              <div className="p-5 bg-natural-sidebar/5 border-t border-natural-sidebar/5">
                                <h5 className="text-[11px] font-black text-natural-sidebar mb-3 flex items-center gap-2">
                                  <Icons.Calculator size={14} className="text-natural-accent" />
                                  الملخص المالي التفصيلي
                                </h5>
                                <div className="overflow-x-auto rounded-xl border border-natural-sidebar/10">
                                  <table className="w-full text-[10px] font-bold text-natural-sidebar">
                                    <thead className="bg-natural-sidebar/10">
                                      <tr>
                                        <th className="p-2 border-l border-natural-sidebar/5">العدد</th>
                                        <th className="p-2 border-l border-natural-sidebar/5">السعر</th>
                                        <th className="p-2 border-l border-natural-sidebar/5">الإجمالي</th>
                                        <th className="p-2 border-l border-natural-sidebar/5">الخصم</th>
                                        <th className="p-2 border-l border-natural-sidebar/5">الإجمالي النهائي</th>
                                        <th className="p-2 border-l border-natural-sidebar/5">إجمالي المصاريف</th>
                                        <th className="p-2 border-l border-natural-sidebar/5">إجمالي الربح</th>
                                        <th className="p-2 border-l border-natural-sidebar/5">صافي الربح</th>
                                        <th className="p-2 border-l border-natural-sidebar/5 text-natural-secondary">للجمعية %</th>
                                        <th className="p-2 border-l border-natural-sidebar/5">المستحق للجمعية</th>
                                        <th className="p-2 border-l border-natural-sidebar/5 text-natural-secondary">للمدربة %</th>
                                        <th className="p-2">المستحق للمدربة</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                      <tr>
                                        <td className="p-2 border-l border-natural-sidebar/5 text-center">{ct.length}</td>
                                        <td className="p-2 border-l border-natural-sidebar/5 text-center">{courseBasePrice.toLocaleString()}</td>
                                        <td className="p-2 border-l border-natural-sidebar/5 text-center">{potentialTotal.toLocaleString()}</td>
                                        <td className="p-2 border-l border-natural-sidebar/5 text-center text-red-500">{totalDiscount.toLocaleString()}</td>
                                        <td className="p-2 border-l border-natural-sidebar/5 text-center font-black">{traineeInc.toLocaleString()}</td>
                                        <td className="p-2 border-l border-natural-sidebar/5 text-center text-red-600">{totalExp.toLocaleString()}</td>
                                        <td className="p-2 border-l border-natural-sidebar/5 text-center text-natural-accent">{(finalIncome - (traineeInc - potentialTotal < 0 ? 0 : 0)).toLocaleString()}</td>
                                        <td className="p-2 border-l border-natural-sidebar/5 text-center font-black text-green-600">{net.toLocaleString()}</td>
                                        <td className="p-2 border-l border-natural-sidebar/5 text-center text-natural-sidebar/60">{course.associationPercentage || '30'}%</td>
                                        <td className="p-2 border-l border-natural-sidebar/5 text-center font-black">
                                          {(net > 0 ? (net * (parseFloat(course.associationPercentage || '30') / 100)) : 0).toLocaleString()}
                                        </td>
                                        <td className="p-2 border-l border-natural-sidebar/5 text-center text-natural-sidebar/60">{100 - parseFloat(course.associationPercentage || '30')}%</td>
                                        <td className="p-2 text-center font-black">
                                          {(net > 0 ? (net * ((100 - parseFloat(course.associationPercentage || '30')) / 100)) : 0).toLocaleString()}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                              
                              {/* Statistical Indicators Row */}
                              <div className="p-5 bg-gray-50/80 border-t border-natural-sidebar/5 grid grid-cols-2 md:grid-cols-4 gap-4" dir="rtl">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-natural-sidebar shadow-sm">
                                    <Icons.Target size={14} />
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black text-natural-secondary">نسبة الإشغال</p>
                                    <p className="text-xs font-black text-natural-sidebar">{Math.round(progress)}%</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-natural-accent shadow-sm">
                                    <Icons.TrendingUp size={14} />
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black text-natural-secondary">متوسط المدخول/متدرب</p>
                                    <p className="text-xs font-black text-natural-sidebar">
                                      {ct.length > 0 ? Math.round(traineeInc / ct.length).toLocaleString() : 0} ر.س
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-red-400 shadow-sm">
                                    <Icons.Percent size={14} />
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black text-natural-secondary">هامش الربح</p>
                                    <p className="text-xs font-black text-natural-sidebar">
                                      {finalIncome > 0 ? Math.round((net / finalIncome) * 100) : 0}%
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-blue-400 shadow-sm">
                                    <Icons.Calendar size={14} />
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black text-natural-secondary">التوقيت</p>
                                    <p className="text-xs font-black text-natural-sidebar">{course.duration || 'مستمرة'}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                </div>
              ) : (
                  <div className="space-y-6" dir="rtl">
                    {(() => {
                      const course = courses.find(c => c.id === selectedAccountingCourseId);
                      if (!course) return null;
                      
                      // Group trainees by duration (e.g., "أسبوع", "يوم")
                      const traineesByDuration = trainees
                        .filter(t => t.courseId === course.id || t.courseId === course.title)
                        .reduce((acc, t) => {
                          const dur = t.duration || 'غير محدد';
                          if (!acc[dur]) acc[dur] = [];
                          acc[dur].push(t);
                          return acc;
                        }, {} as Record<string, Trainee[]>);

                      const totalTraineesCount = Object.values(traineesByDuration).reduce<number>((sum, list: Trainee[]) => sum + list.length, 0);
                      const traineeIncome = Object.values(traineesByDuration).reduce<number>((sum, list: Trainee[]) => 
                        sum + list.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0), 0);
                      const extraIncome = parseFloat(course.extraIncome || '0') || 0;
                      const totalIncome = traineeIncome + extraIncome;
                      
                      const baseCost = parseFloat(course.cost || '0') || 0;
                      const extraExpenses = parseFloat(course.extraExpenses || '0') || 0;
                      const totalExpenses = baseCost + extraExpenses;
                      
                      const associationPercentage = parseFloat(course.associationPercentage || '30') || 0;
                      const teacherPercentage = 100 - associationPercentage;
                      
                      const netProfit = totalIncome - totalExpenses;
                      const associationShare = netProfit > 0 ? (netProfit * associationPercentage) / 100 : 0;
                      const teacherShare = netProfit > 0 ? (netProfit * teacherPercentage) / 100 : 0;

                      return (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          {/* Header */}
                          <div className="flex flex-col md:flex-row items-center justify-between pb-6 border-b-2 border-natural-sidebar/10 gap-4">
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={() => setSelectedAccountingCourseId(null)}
                                className="h-12 w-12 rounded-2xl bg-white border border-natural-border flex items-center justify-center text-natural-sidebar hover:bg-natural-bg hover:scale-110 transition-all shadow-sm"
                              >
                                <Icons.ArrowRight size={24} />
                              </button>
                              <div className="text-right">
                                <h2 className="text-2xl font-black text-natural-sidebar">{course.title}</h2>
                                <p className="text-base font-bold text-natural-sidebar/70">
                                  برنامج {course.title} مع المدربة ({course.instructor}) من تاريخ {course.startDate} إلى {course.endDate}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <button 
                                onClick={() => window.print()}
                                className="flex items-center gap-2 px-6 py-3 bg-natural-sidebar text-white rounded-2xl text-sm font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-natural-sidebar/20"
                              >
                                <Icons.Printer size={18} />
                                طباعة التقرير
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-col xl:flex-row gap-8 items-start">
                            {/* Detailed Participation Table */}
                            <div className="flex-1 w-full">
                              <div className="bg-white rounded-[2rem] border-2 border-natural-sidebar/5 overflow-hidden shadow-xl shadow-natural-sidebar/5">
                                <table className="w-full text-right border-collapse">
                                  <thead>
                                    <tr className="bg-[#FFE57F] text-natural-sidebar">
                                      <th className="p-5 text-sm font-black border-l border-natural-sidebar/10">المدة</th>
                                      <th className="p-5 text-sm font-black text-center border-l border-natural-sidebar/10">العدد</th>
                                      <th className="p-5 text-sm font-black text-center border-l border-natural-sidebar/10">السعر</th>
                                      <th className="p-5 text-sm font-black text-center border-l border-natural-sidebar/10">الإجمالي</th>
                                      <th className="p-5 text-sm font-black text-center border-l border-natural-sidebar/10">الخصم</th>
                                      <th className="p-5 text-sm font-black text-center">الإجمالي النهائي</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-natural-sidebar/5">
                                    {Object.entries(traineesByDuration).map(([duration, list]: [string, Trainee[]]) => {
                                      const durationIncome = list.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
                                      const defaultPrice = parseFloat(course.price) || 0;
                                      const potentialIncome = list.length * defaultPrice;
                                      const totalDiscounts = potentialIncome - durationIncome;

                                      return (
                                        <tr key={duration} className="hover:bg-natural-bg/30 transition-colors">
                                          <td className="p-5 font-bold text-natural-sidebar border-l border-natural-sidebar/5">{duration}</td>
                                          <td className="p-5 text-center font-bold border-l border-natural-sidebar/5">{list.length}</td>
                                          <td className="p-5 text-center font-bold border-l border-natural-sidebar/5">{defaultPrice.toLocaleString()}</td>
                                          <td className="p-5 text-center font-bold border-l border-natural-sidebar/5">{potentialIncome.toLocaleString()}</td>
                                          <td className="p-5 text-center font-bold text-red-500 border-l border-natural-sidebar/5">{totalDiscounts > 0 ? totalDiscounts.toLocaleString() : '0'}</td>
                                          <td className="p-5 text-center font-black text-natural-accent">{durationIncome.toLocaleString()}</td>
                                        </tr>
                                      );
                                    })}
                                    <tr className="bg-natural-bg/40 font-black text-natural-sidebar border-t-2 border-natural-sidebar/10">
                                      <td className="p-5 border-l border-natural-sidebar/5">المجموع</td>
                                      <td className="p-5 text-center border-l border-natural-sidebar/5">{totalTraineesCount}</td>
                                      <td className="p-5 text-center border-l border-natural-sidebar/5">-</td>
                                      <td className="p-5 text-center border-l border-natural-sidebar/5">-</td>
                                      <td className="p-5 text-center border-l border-natural-sidebar/5">-</td>
                                      <td className="p-5 text-center bg-[#FFE57F]/30">{totalIncome.toLocaleString()}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Financial Summary Sidebar */}
                            <div className="w-full xl:w-96 shrink-0">
                              <div className="bg-white rounded-[2rem] border-2 border-natural-sidebar/10 overflow-hidden shadow-2xl shadow-natural-sidebar/10">
                                <div className="bg-[#FFE57F] p-4 text-center border-b border-natural-sidebar/10">
                                  <h4 className="font-black text-natural-sidebar">ملخص الحسابات</h4>
                                </div>
                                <div className="divide-y divide-natural-sidebar/5 text-right">
                                  <div className="p-4 flex justify-between items-center bg-gray-50/50">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-natural-secondary">المصاريف الأساسية</span>
                                      <span className="text-[9px] text-natural-sidebar/50 italic">إيجار، مواد، الخ...</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="number"
                                        defaultValue={baseCost}
                                        onBlur={(e) => handleUpdateCourseFinancials(course.id, { cost: e.target.value })}
                                        className="w-20 p-1 text-center font-black text-black bg-white border border-natural-border rounded-lg outline-none focus:border-natural-accent"
                                      />
                                      <span className="text-[10px] font-bold">ر.س</span>
                                    </div>
                                  </div>
                                  <div className="p-4 flex justify-between items-center bg-red-50/30">
                                    <span className="font-bold text-red-600">مصاريف إضافية</span>
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="number"
                                        defaultValue={extraExpenses}
                                        onBlur={(e) => handleUpdateCourseFinancials(course.id, { extraExpenses: e.target.value })}
                                        className="w-20 p-1 text-center font-black text-red-600 bg-white border border-red-200 rounded-lg outline-none focus:border-red-400"
                                      />
                                      <span className="text-[10px] font-bold">ر.س</span>
                                    </div>
                                  </div>
                                  <div className="p-4 flex justify-between items-center bg-gray-100/50">
                                    <span className="font-black text-natural-sidebar">إجمالي التكاليف</span>
                                    <span className="font-black text-black text-lg">{totalExpenses.toLocaleString()} ر.س</span>
                                  </div>
                                  <div className="p-4 flex justify-between items-center bg-natural-accent/5">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-natural-sidebar">دخل إضافي</span>
                                      <span className="text-[9px] text-natural-secondary italic">رعاية، مبيعات، أخرى</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="number"
                                        defaultValue={extraIncome}
                                        onBlur={(e) => handleUpdateCourseFinancials(course.id, { extraIncome: e.target.value })}
                                        className="w-20 p-1 text-center font-black text-natural-accent bg-white border border-natural-accent/20 rounded-lg outline-none focus:border-natural-accent"
                                      />
                                      <span className="text-[10px] font-bold">ر.س</span>
                                    </div>
                                  </div>
                                  <div className="p-4 flex justify-between items-center bg-[#FFE57F]/10">
                                    <span className="font-black text-natural-sidebar">إجمالي الدخل</span>
                                    <span className="font-black text-natural-sidebar text-lg">{totalIncome.toLocaleString()}</span>
                                  </div>
                                  <div className="p-4 flex justify-between items-center">
                                    <span className="font-black text-natural-sidebar">صافي الربح</span>
                                    <span className="font-black text-natural-success text-xl">{netProfit.toLocaleString()}</span>
                                  </div>
                                  <div className="p-4 flex justify-between items-center text-right border-t-2 border-dashed border-natural-sidebar/10">
                                    <span className="font-bold text-natural-secondary">النسبة للمدربة</span>
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="number"
                                        defaultValue={teacherPercentage}
                                        onBlur={(e) => {
                                          const val = parseFloat(e.target.value) || 0;
                                          handleUpdateCourseFinancials(course.id, { associationPercentage: (100 - val).toString() });
                                        }}
                                        className="w-16 p-1 text-center font-black text-natural-sidebar bg-natural-sidebar/5 rounded-lg border border-transparent focus:border-natural-accent outline-none"
                                      />
                                      <span className="text-[10px] font-bold">%</span>
                                    </div>
                                  </div>
                                  <div className="p-4 flex justify-between items-center text-right">
                                    <span className="font-bold text-natural-secondary">النسبة للجمعية</span>
                                    <span className="font-black text-natural-sidebar text-base bg-natural-sidebar/5 px-3 py-1 rounded-lg">{associationPercentage}%</span>
                                  </div>
                                  <div className="p-5 space-y-4 bg-natural-bg/30">
                                    <div className="bg-white p-4 rounded-2xl border border-natural-sidebar/10 shadow-sm flex justify-between items-center transition-all hover:scale-105">
                                      <div className="flex flex-col text-right">
                                        <span className="text-[10px] font-black text-natural-secondary uppercase mb-1">المبلغ المستحق للمدربة</span>
                                        <span className="font-black text-natural-sidebar text-2xl">{teacherShare.toLocaleString()} ر.س</span>
                                      </div>
                                      <div className="p-2 bg-natural-sidebar/10 rounded-xl text-natural-sidebar">
                                        <Icons.User size={24} />
                                      </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-natural-accent/10 shadow-sm flex justify-between items-center transition-all hover:scale-105">
                                      <div className="flex flex-col text-right">
                                        <span className="text-[10px] font-black text-natural-secondary uppercase mb-1">المبلغ المستحق للجمعية</span>
                                        <span className="font-black text-natural-accent text-2xl">{associationShare.toLocaleString()} ر.س</span>
                                      </div>
                                      <div className="p-2 bg-natural-accent/10 rounded-xl text-natural-accent">
                                        <Icons.Home size={24} />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="p-6 bg-white">
                                    {course.isSettled ? (
                                      <div className="w-full py-4 bg-green-50 text-green-600 rounded-2xl font-black flex items-center justify-center gap-3 border-2 border-green-200">
                                        <Icons.CheckCircle size={20} />
                                        تمت التسوية بنجاح
                                      </div>
                                    ) : (
                                      <button 
                                        onClick={() => handleSettleCourse(course.id)}
                                        className="w-full py-4 bg-natural-sidebar text-white rounded-2xl font-black shadow-lg shadow-natural-sidebar/20 hover:bg-natural-accent hover:shadow-natural-accent/20 transition-all flex items-center justify-center gap-3"
                                      >
                                        <Icons.CheckCircle size={20} />
                                        تأكيد الدفع / تسوية الحساب
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </motion.div>
            )}

            {(view === 'attendance' || view.startsWith('attendance')) && (
              <motion.div
                key={view}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl shadow-sm border border-natural-border overflow-hidden"
              >
                <div className="p-6 border-b border-natural-border bg-natural-bg/30 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-natural-sidebar">قائمة تسجيل الحضور</h3>
                    <p className="text-xs text-natural-secondary mt-1">سجل حضور المشتركين لليوم: {new Date().toLocaleDateString('en-CA')}</p>
                  </div>
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <AddTeacherInput 
                      value={newTeacherInput}
                      onChange={setNewTeacherInput}
                      onAdd={(name: string) => {
                        if (!settings.teachers?.includes(name)) {
                          const updatedTeachers = [...(settings.teachers || []), name];
                          updateSettings({ ...settings, teachers: updatedTeachers });
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="divide-y divide-natural-bg">
                  {filteredMembers.filter(m => m.status === 'active').map(member => (
                    <div key={member.id} className="p-4 flex items-center justify-between hover:bg-natural-bg/50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white border border-natural-border rounded-xl flex items-center justify-center text-natural-accent font-bold shadow-sm">
                          {(member.name || '')[0]}
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
                <div className="p-6 bg-white rounded-3xl border border-natural-border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-natural-sidebar">إدارة المشتركين</h3>
                    <p className="text-xs text-natural-secondary mt-1">عرض إحصائيات المشتركين وإضافة معلمين جدد للنظام</p>
                  </div>
                  <AddTeacherInput 
                    value={newTeacherInput}
                    onChange={setNewTeacherInput}
                    onAdd={(name: string) => {
                      if (!settings.teachers?.includes(name)) {
                        const updatedTeachers = [...(settings.teachers || []), name];
                        updateSettings({ ...settings, teachers: updatedTeachers });
                      }
                    }}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                              {(member.name || '')[0]}
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
                              onClick={() => setMemberToDelete(member)}
                              className="text-natural-secondary hover:text-red-500 transition-colors p-1"
                              title="حذف"
                            >
                              <Trash2 size={18} />
                            </button>
                            <button 
                              onClick={() => setEditingMember(member)}
                              className="text-natural-secondary hover:text-natural-accent transition-colors p-1"
                              title="تعديل"
                            >
                              <Icons.Edit3 size={18} />
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

            {view === 'database' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8 pb-12"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-natural-sidebar text-white rounded-3xl flex items-center justify-center shadow-lg shadow-natural-sidebar/20">
                    <Database size={24} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-natural-sidebar">مركز البيانات الشامل</h2>
                    <p className="text-natural-secondary font-medium">استعراض كافة السجلات المخزنة في قاعدة البيانات</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  <SectionCard title="جدول المشتركين العام" icon={Users}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] font-bold text-natural-sidebar text-right">
                        <thead className="bg-natural-bg/50">
                          <tr>
                            <th className="p-3 border-l border-natural-border">الاسم</th>
                            <th className="p-3 border-l border-natural-border">الجوال</th>
                            <th className="p-3 border-l border-natural-border">التاريخ</th>
                            <th className="p-3 border-l border-natural-border">الحالة</th>
                            <th className="p-3 border-l border-natural-border">المعلمة</th>
                            <th className="p-3 border-l border-natural-border">السعر</th>
                            <th className="p-3">ملاحظات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-natural-border">
                          {members.map(m => (
                            <tr key={m.id} className="hover:bg-natural-bg/5 transition-colors">
                              <td className="p-3 border-l border-natural-border font-black">{m.name}</td>
                              <td className="p-3 border-l border-natural-border text-natural-secondary">{m.phone}</td>
                              <td className="p-3 border-l border-natural-border">{m.startDate} - {m.endDate}</td>
                              <td className="p-3 border-l border-natural-border">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] ${
                                  m.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                }`}>
                                  {m.status === 'active' ? 'نشط' : 'منتهي'}
                                </span>
                              </td>
                              <td className="p-3 border-l border-natural-border">{m.teacherName}</td>
                              <td className="p-3 border-l border-natural-border font-black">{m.price} ر.س</td>
                              <td className="p-3 text-[9px] text-natural-secondary truncate max-w-[150px]">{m.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>

                  <SectionCard title="جدول الدورات التدريبية" icon={BookOpen}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] font-bold text-natural-sidebar text-right">
                        <thead className="bg-natural-bg/50">
                          <tr>
                            <th className="p-3 border-l border-natural-border">عنوان الدورة</th>
                            <th className="p-3 border-l border-natural-border">المدربة</th>
                            <th className="p-3 border-l border-natural-border">الحالة</th>
                            <th className="p-3 border-l border-natural-border">السعر</th>
                            <th className="p-3 border-l border-natural-border">التكلفة</th>
                            <th className="p-3 border-l border-natural-border">المسجلين</th>
                            <th className="p-3">نسبة الجمعية</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-natural-border">
                          {courses.map(c => (
                            <tr key={c.id} className="hover:bg-natural-bg/5 transition-colors">
                              <td className="p-3 border-l border-natural-border font-black">{c.title}</td>
                              <td className="p-3 border-l border-natural-border">{c.instructor}</td>
                              <td className="p-3 border-l border-natural-border">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] ${
                                  c.status === 'active' ? 'bg-green-50 text-green-600' : 
                                  c.status === 'upcoming' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'
                                }`}>
                                  {c.status === 'active' ? 'نشطة' : c.status === 'upcoming' ? 'قادمة' : 'منتهية'}
                                </span>
                              </td>
                              <td className="p-3 border-l border-natural-border font-black">{c.price} ر.س</td>
                              <td className="p-3 border-l border-natural-border text-red-500">{c.cost} ر.س</td>
                              <td className="p-3 border-l border-natural-border text-center">
                                {trainees.filter(t => t.courseId === c.id || t.courseId === c.title).length} / {c.capacity}
                              </td>
                              <td className="p-3 text-center">{c.associationPercentage || '30'}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>

                  <SectionCard title="سجل المتدربين التفصيلي" icon={Users}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] font-bold text-natural-sidebar text-right">
                        <thead className="bg-natural-bg/50">
                          <tr>
                            <th className="p-3 border-l border-natural-border">اسم المتدرب</th>
                            <th className="p-3 border-l border-natural-border">الدورة</th>
                            <th className="p-3 border-l border-natural-border">المبلغ المدفوع</th>
                            <th className="p-3 border-l border-natural-border">طريقة الدفع</th>
                            <th className="p-3 border-l border-natural-border">التاريخ</th>
                            <th className="p-3">الجوال</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-natural-border">
                          {trainees.map(t => (
                            <tr key={t.id} className="hover:bg-natural-bg/5 transition-colors">
                              <td className="p-3 border-l border-natural-border font-black">{t.fullName}</td>
                              <td className="p-3 border-l border-natural-border">{t.courseId}</td>
                              <td className="p-3 border-l border-natural-border text-green-600">{t.amount} ر.س</td>
                              <td className="p-3 border-l border-natural-border">{t.paymentMethod}</td>
                              <td className="p-3 border-l border-natural-border">{t.date}</td>
                              <td className="p-3 text-natural-secondary">{t.motherPhone}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <SectionCard title="تحضير الطلاب" icon={ClipboardCheck}>
                        <div className="overflow-y-auto max-h-[400px]">
                          <table className="w-full text-[10px] font-bold text-right">
                             <thead className="bg-natural-bg sticky top-0">
                               <tr className="border-b border-natural-border">
                                 <th className="p-2">التاريخ</th>
                                 <th className="p-2">الحالة</th>
                               </tr>
                             </thead>
                             <tbody>
                               {attendance.slice(0, 100).map(a => (
                                 <tr key={a.id} className="border-b border-natural-border/10">
                                   <td className="p-2">{a.date}</td>
                                   <td className="p-2">
                                     <span className={`px-2 py-0.5 rounded-full text-[8px] ${
                                       a.status === 'present' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                     }`}>
                                       {a.status === 'present' ? 'حاضر' : 'غائب'}
                                     </span>
                                   </td>
                                 </tr>
                               ))}
                             </tbody>
                          </table>
                        </div>
                     </SectionCard>

                     <SectionCard title="تحضير المعلمين" icon={UserCheck}>
                        <div className="overflow-y-auto max-h-[400px]">
                          <table className="w-full text-[10px] font-bold text-right">
                             <thead className="bg-natural-bg sticky top-0">
                               <tr className="border-b border-natural-border">
                                 <th className="p-2">المعلمة</th>
                                 <th className="p-2">التاريخ</th>
                                 <th className="p-2">الحالة</th>
                               </tr>
                             </thead>
                             <tbody>
                               {teacherAttendance.slice(0, 100).map(ta => (
                                 <tr key={ta.id} className="border-b border-natural-border/10">
                                   <td className="p-2 font-black">{ta.teacherName}</td>
                                   <td className="p-2">{ta.date}</td>
                                   <td className="p-2">
                                     <span className={`px-2 py-0.5 rounded-full text-[8px] ${
                                       ta.status === 'حاضر' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                     }`}>
                                       {ta.status}
                                     </span>
                                   </td>
                                 </tr>
                               ))}
                             </tbody>
                          </table>
                        </div>
                     </SectionCard>
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'archives' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8 pb-12"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-natural-sidebar text-white rounded-3xl flex items-center justify-center shadow-lg shadow-natural-sidebar/20">
                    <History size={24} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-natural-sidebar">الأرشيف والسجلات</h2>
                    <p className="text-natural-secondary font-medium">سجلات الدورات المكتملة والمشتركين السابقين</p>
                  </div>
                </div>

                <SectionCard title="أرشيف الدورات التدريبية" icon={BookOpen}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px] font-bold text-natural-sidebar" dir="rtl">
                      <thead className="bg-natural-bg/50">
                        <tr className="border-b border-natural-sidebar/5">
                          <th className="p-4 text-right">الدورة</th>
                          <th className="p-4 text-center">المدربة</th>
                          <th className="p-4 text-center">المتدربين</th>
                          <th className="p-4 text-center">إجمالي الدخل</th>
                          <th className="p-4 text-center">صافي الربح</th>
                          <th className="p-4 text-center">التاريخ</th>
                          <th className="p-4 text-center">الإجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-natural-sidebar/5">
                        {courses.filter(c => c.status === 'completed').length === 0 ? (
                          <tr><td colSpan={7} className="p-8 text-center text-natural-secondary italic text-xs">لا يوجد دورات مكتملة حالياً</td></tr>
                        ) : (
                          courses.filter(c => c.status === 'completed').map(c => {
                            const ct = trainees.filter(t => t.courseId === c.id || t.courseId === c.title);
                            const traineeInc = ct.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
                            const extraInc = parseFloat(c.extraIncome || '0') || 0;
                            const finalIncome = traineeInc + extraInc;
                            const totalExp = (parseFloat(c.cost || '0') || 0) + (parseFloat(c.extraExpenses || '0') || 0);
                            const net = finalIncome - totalExp;

                            return (
                              <tr key={c.id} className="hover:bg-natural-bg/10 transition-colors">
                                <td className="p-4 font-black">{c.title}</td>
                                <td className="p-4 text-center text-natural-secondary">{c.instructor}</td>
                                <td className="p-4 text-center">{ct.length}</td>
                                <td className="p-4 text-center text-natural-accent">{finalIncome.toLocaleString()} ر.س</td>
                                <td className="p-4 text-center font-black text-green-600">{net.toLocaleString()} ر.س</td>
                                <td className="p-4 text-center text-[10px] text-natural-secondary">{c.startDate}</td>
                                <td className="p-4 text-center">
                                  <button 
                                    onClick={() => setSelectedReportCourse(c)}
                                    className="p-2 bg-natural-sidebar/5 text-natural-sidebar rounded-xl hover:bg-natural-accent hover:text-white transition-all shadow-sm"
                                  >
                                    <Icons.FileText size={16} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>

                <SectionCard title="سجل المشتركين السابقين" icon={Users}>
                   <div className="overflow-x-auto">
                    <table className="w-full text-[12px] font-bold text-natural-sidebar" dir="rtl">
                      <thead className="bg-natural-bg/50">
                        <tr className="border-b border-natural-sidebar/5">
                          <th className="p-4 text-right">المشترك</th>
                          <th className="p-4 text-center">المعلمة</th>
                          <th className="p-4 text-center">تاريخ الانتهاء</th>
                          <th className="p-4 text-center">المبلغ</th>
                          <th className="p-4 text-center">طريقة الدفع</th>
                          <th className="p-4 text-center">الإجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-natural-sidebar/5">
                        {members.filter(m => m.status === 'expired').length === 0 ? (
                          <tr><td colSpan={6} className="p-8 text-center text-natural-secondary italic text-xs">لا يوجد مشتركين منتهين حالياً</td></tr>
                        ) : (
                          members.filter(m => m.status === 'expired').map(m => (
                            <tr key={m.id} className="hover:bg-natural-bg/10 transition-colors">
                              <td className="p-4">
                                <p className="font-black">{m.name}</p>
                                <p className="text-[10px] text-natural-secondary">{m.phone}</p>
                              </td>
                              <td className="p-4 text-center text-natural-secondary">{m.teacherName}</td>
                              <td className="p-4 text-center text-red-500">{m.endDate}</td>
                              <td className="p-4 text-center">{m.price} ر.س</td>
                              <td className="p-4 text-center">
                                <span className={`px-3 py-1 rounded-full text-[10px] ${m.paymentMethod === 'كاش' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                                  {m.paymentMethod}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <button 
                                  onClick={() => setEditingMemberStats(m)}
                                  className="p-2 bg-natural-sidebar/5 text-natural-sidebar rounded-xl hover:bg-natural-accent hover:text-white transition-all shadow-sm"
                                >
                                  <Icons.BarChart size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              </motion.div>
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
                              {(member.name || '')[0]}
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
                                    {(member.name || '')[0]}
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

          {/* Course Report Modal */}
          <AnimatePresence>
            {selectedReportCourse && (
              <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-natural-sidebar/50 backdrop-blur-md">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-white w-full max-w-6xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-natural-border"
                >
                  <div className="bg-natural-sidebar p-6 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-natural-accent">
                        <DynamicIcon name={selectedReportCourse.icon || 'BookOpen'} size={20} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black">التقرير الختامي لدورة: {selectedReportCourse.title}</h3>
                        <p className="text-[10px] text-white/60 font-bold">هذه البيانات محفوظة بشكل دائم في قاعدة البيانات</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedReportCourse(null)} 
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <Icons.X size={24} />
                    </button>
                  </div>

                  <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar" dir="rtl">
                    {(() => {
                        const course = selectedReportCourse;
                        const ct = trainees.filter(t => t.courseId === course.id || t.courseId === course.title);
                        const courseBasePrice = parseFloat(course.price) || 0;
                        const traineeInc = ct.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
                        const potentialTotal = ct.length * courseBasePrice;
                        const totalDiscount = potentialTotal - traineeInc;
                        const extraInc = parseFloat(course.extraIncome || '0');
                        const finalIncome = traineeInc + extraInc;
                        const totalExp = (parseFloat(course.cost) || 0) + (parseFloat(course.extraExpenses || '0'));
                        const net = finalIncome - totalExp;
                        const progress = course.capacity > 0 ? (ct.length / course.capacity) * 100 : 0;

                        return (
                          <div className="space-y-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                               <div className="bg-natural-bg/50 p-5 rounded-3xl border border-natural-border">
                                 <p className="text-[10px] font-black text-natural-secondary mb-1">العدد الإجمالي</p>
                                 <p className="text-2xl font-black text-natural-sidebar">{ct.length} <span className="text-[10px] text-natural-secondary">متدرب</span></p>
                               </div>
                               <div className="bg-natural-bg/50 p-5 rounded-3xl border border-natural-border">
                                 <p className="text-[10px] font-black text-natural-secondary mb-1">نسبة الإشغال</p>
                                 <p className="text-2xl font-black text-natural-sidebar">{Math.round(progress)}%</p>
                               </div>
                               <div className="bg-natural-bg/50 p-5 rounded-3xl border border-natural-border">
                                 <p className="text-[10px] font-black text-natural-secondary mb-1">إجمالي الدخل</p>
                                 <p className="text-2xl font-black text-natural-sidebar">{finalIncome.toLocaleString()} <span className="text-[10px] text-natural-secondary">ر.س</span></p>
                               </div>
                               <div className="bg-natural-bg/50 p-5 rounded-3xl border border-natural-border">
                                 <p className="text-[10px] font-black text-natural-secondary mb-1">صافي الربح</p>
                                 <div className="flex items-center gap-2">
                                   <p className={`text-2xl font-black ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{net.toLocaleString()} <span className="text-[10px] text-natural-secondary">ر.س</span></p>
                                 </div>
                               </div>
                            </div>

                            <div className="rounded-3xl border border-natural-sidebar/10 overflow-hidden shadow-sm">
                                <div className="bg-natural-sidebar/5 p-4 border-b border-natural-sidebar/5">
                                    <h4 className="font-black text-natural-sidebar text-sm flex items-center gap-2">
                                        <Icons.TrendingUp size={16} className="text-natural-accent" />
                                        الملخص المالي التفصيلي
                                    </h4>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-right">
                                    <thead>
                                      <tr className="bg-natural-sidebar/10 text-natural-sidebar text-[10px] uppercase font-black">
                                        <th className="p-4 border-l border-natural-sidebar/5">العدد</th>
                                        <th className="p-4 border-l border-natural-sidebar/5">السعر</th>
                                        <th className="p-4 border-l border-natural-sidebar/5">الإجمالي</th>
                                        <th className="p-4 border-l border-natural-sidebar/5">الخصم</th>
                                        <th className="p-4 border-l border-natural-sidebar/5">دخول المتدربين</th>
                                        <th className="p-4 border-l border-natural-sidebar/5">إجمالي المصاريف</th>
                                        <th className="p-4 border-l border-natural-sidebar/5">إجمالي الربح</th>
                                        <th className="p-4 border-l border-natural-sidebar/5">صافي الربح</th>
                                        <th className="p-4 border-l border-natural-sidebar/5">للجمعية %</th>
                                        <th className="p-4 border-l border-natural-sidebar/5">المستحق للجمعية</th>
                                        <th className="p-4 border-l border-natural-sidebar/5">للمدربة %</th>
                                        <th className="p-4">المستحق للمدربة</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-natural-sidebar/5 text-[11px] font-bold">
                                      <tr>
                                        <td className="p-4 border-l border-natural-sidebar/5 text-center">{ct.length}</td>
                                        <td className="p-4 border-l border-natural-sidebar/5 text-center">{courseBasePrice.toLocaleString()}</td>
                                        <td className="p-4 border-l border-natural-sidebar/5 text-center">{potentialTotal.toLocaleString()}</td>
                                        <td className="p-4 border-l border-natural-sidebar/5 text-center text-red-500">-{totalDiscount.toLocaleString()}</td>
                                        <td className="p-4 border-l border-natural-sidebar/5 text-center font-black">{traineeInc.toLocaleString()}</td>
                                        <td className="p-4 border-l border-natural-sidebar/5 text-center text-red-600">{totalExp.toLocaleString()}</td>
                                        <td className="p-4 border-l border-natural-sidebar/5 text-center text-natural-accent">{(finalIncome).toLocaleString()}</td>
                                        <td className="p-4 border-l border-natural-sidebar/5 text-center font-black text-green-600">{net.toLocaleString()}</td>
                                        <td className="p-4 border-l border-natural-sidebar/5 text-center text-natural-secondary">{course.associationPercentage || '30'}%</td>
                                        <td className="p-4 border-l border-natural-sidebar/5 text-center font-black">
                                          {(net > 0 ? (net * (parseFloat(course.associationPercentage || '30') / 100)) : 0).toLocaleString()}
                                        </td>
                                        <td className="p-4 border-l border-natural-sidebar/5 text-center text-natural-secondary">{100 - parseFloat(course.associationPercentage || '30')}%</td>
                                        <td className="p-4 text-center font-black text-natural-sidebar">
                                          {(net > 0 ? (net * ((100 - parseFloat(course.associationPercentage || '30')) / 100)) : 0).toLocaleString()}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6">
                                <button 
                                  onClick={() => {
                                      setSelectedAccountingCourseId(selectedReportCourse.id);
                                      setView('courses_accounting');
                                      setSelectedReportCourse(null);
                                  }}
                                  className="bg-natural-accent text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-natural-accent/20 flex items-center gap-2 hover:scale-105 transition-all text-sm"
                                >
                                    <Icons.ArrowLeft size={16} />
                                    الانتقال للمحاسبة الكاملة
                                </button>
                                <button 
                                  onClick={() => setSelectedReportCourse(null)}
                                  className="bg-natural-bg text-natural-sidebar px-8 py-3 rounded-2xl font-black hover:bg-natural-border transition-all text-sm"
                                >
                                  إغلاق التقارير
                                </button>
                            </div>
                          </div>
                        );
                    })()}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Course Details Modal */}
          <AnimatePresence>
            {detailsCourse && (
              <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-natural-sidebar/40 backdrop-blur-md">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-natural-border"
                >
                  <div className="bg-natural-sidebar p-8 text-white relative">
                    <button 
                      onClick={() => setDetailsCourse(null)} 
                      className="absolute left-8 top-8 p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <X size={24} />
                    </button>
                    <div className="flex flex-col items-center text-center">
                      <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center mb-4">
                        <Icons.BookOpen size={40} className="text-natural-accent" />
                      </div>
                      <h3 className="text-3xl font-black mb-2">{detailsCourse.title}</h3>
                      <div className="flex items-center gap-2 text-white/80 font-bold">
                        <Icons.User size={18} className="text-natural-accent" />
                        <span>المدربة: {detailsCourse.instructor}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 space-y-8" dir="rtl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-natural-bg/50 rounded-2xl border border-natural-border flex flex-col items-center text-center">
                        <Icons.Calendar size={20} className="text-natural-sidebar mb-2" />
                        <p className="text-[10px] text-natural-secondary font-black mb-1">تاريخ البدء</p>
                        <p className="font-bold text-natural-sidebar">{detailsCourse.startDate}</p>
                      </div>
                      <div className="p-4 bg-natural-bg/50 rounded-2xl border border-natural-border flex flex-col items-center text-center">
                        <Icons.Clock size={20} className="text-natural-sidebar mb-2" />
                        <p className="text-[10px] text-natural-secondary font-black mb-1">المدة التدريبية</p>
                        <p className="font-bold text-natural-sidebar">{detailsCourse.duration || detailsCourse.endDate || 'غير محددة'}</p>
                      </div>
                      <div className="p-4 bg-natural-bg/50 rounded-2xl border border-natural-border flex flex-col items-center text-center">
                        <Icons.Tag size={20} className="text-natural-sidebar mb-2" />
                        <p className="text-[10px] text-natural-secondary font-black mb-1">سعر الدورة</p>
                        <p className="font-bold text-natural-accent">{detailsCourse.price} ر.س</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-natural-sidebar">
                        <Icons.FileText size={18} />
                        <h4 className="font-black">وصف وتفاصيل الدورة</h4>
                      </div>
                      <div className="bg-natural-bg p-6 rounded-3xl border border-natural-sidebar/5 min-h-[120px] text-natural-sidebar leading-loose font-medium shadow-inner shadow-black/5">
                        {detailsCourse.description || 'لم يتم إضافة وصف لهذه الدورة حتى الآن.'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-4">
                      <div className="flex items-center gap-4 p-4 rounded-3xl bg-gray-50 border border-gray-100">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                          <Icons.Users size={20} className="text-natural-sidebar" />
                        </div>
                        <div>
                          <p className="text-[10px] text-natural-secondary font-black">المقاعد المكتملة</p>
                          <p className="text-xl font-black text-natural-sidebar">{detailsCourse.enrolledCount} / {detailsCourse.capacity}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 rounded-3xl bg-gray-50 border border-gray-100">
                        <div className={`w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm`}>
                          <div className={`w-3 h-3 rounded-full animate-pulse ${
                            detailsCourse.status === 'active' ? 'bg-green-500' : detailsCourse.status === 'upcoming' ? 'bg-blue-500' : 'bg-gray-400'
                          }`} />
                        </div>
                        <div>
                          <p className="text-[10px] text-natural-secondary font-black">حالة الدورة</p>
                          <p className="text-lg font-black text-natural-sidebar">
                            {detailsCourse.status === 'active' ? 'نشطة حالياً' : detailsCourse.status === 'upcoming' ? 'قريباً' : 'مكتملة'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setDetailsCourse(null)}
                      className="w-full bg-natural-sidebar text-white py-5 rounded-[2rem] font-black hover:bg-natural-accent transition-all shadow-xl shadow-natural-sidebar/20 flex items-center justify-center gap-3"
                    >
                      إغلاق نافذة التفاصيل
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

          {/* Edit Trainee Modal */}
          <AnimatePresence>
            {editingTrainee && (
              <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-natural-sidebar/40 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-natural-border overflow-hidden"
                  dir="rtl"
                >
                  <div className="bg-natural-sidebar p-6 text-white flex justify-between items-center">
                    <h3 className="text-xl font-bold">تعديل بيانات المتدرب</h3>
                    <button onClick={() => setEditingTrainee(null)}><Icons.X size={24} /></button>
                  </div>
                  <form onSubmit={handleUpdateTrainee} className="p-8 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-natural-secondary px-1">الاسم الثلاثي</label>
                        <input 
                          required
                          type="text" 
                          value={editingTrainee.fullName}
                          onChange={e => setEditingTrainee({...editingTrainee, fullName: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-natural-border focus:border-natural-accent outline-none text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-natural-secondary px-1">رقم الجوال</label>
                        <input 
                          type="tel" 
                          value={editingTrainee.motherPhone}
                          onChange={e => setEditingTrainee({...editingTrainee, motherPhone: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-natural-border focus:border-natural-accent outline-none text-sm font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-natural-secondary px-1">المدة</label>
                        <input 
                          type="text" 
                          value={editingTrainee.duration}
                          onChange={e => setEditingTrainee({...editingTrainee, duration: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-natural-border focus:border-natural-accent outline-none text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-natural-secondary px-1">المبلغ</label>
                        <input 
                          type="number" 
                          value={editingTrainee.amount}
                          onChange={e => setEditingTrainee({...editingTrainee, amount: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-natural-border focus:border-natural-accent outline-none text-sm font-bold"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-natural-secondary px-1">طريقة الدفع</label>
                        <select 
                          value={editingTrainee.paymentMethod}
                          onChange={e => setEditingTrainee({...editingTrainee, paymentMethod: e.target.value as any})}
                          className="w-full px-4 py-2.5 rounded-xl border border-natural-border focus:border-natural-accent outline-none text-sm"
                        >
                          <option value="كاش">كاش</option>
                          <option value="تحويل">تحويل</option>
                          <option value="لم يتم الدفع">لم يتم الدفع</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-natural-secondary px-1">تاريخ التسجيل</label>
                        <input 
                          type="date" 
                          value={editingTrainee.date}
                          onChange={e => setEditingTrainee({...editingTrainee, date: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-natural-border focus:border-natural-accent outline-none text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-natural-secondary px-1">ملاحظات</label>
                      <textarea 
                        value={editingTrainee.notes}
                        onChange={e => setEditingTrainee({...editingTrainee, notes: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl border border-natural-border focus:border-natural-accent outline-none text-sm"
                        rows={2}
                      />
                    </div>
                    <button 
                      type="submit"
                      className="w-full bg-natural-accent text-white py-4 rounded-2xl font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-natural-accent/20 mt-4"
                    >
                      حفظ التعديلات
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Delete Trainee Confirmation Modal */}
          <AnimatePresence>
            {traineeToDelete && (
              <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-red-900/20 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white w-full max-sm rounded-[32px] p-8 shadow-2xl border border-red-100 text-center"
                  dir="rtl"
                >
                  <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trash2 size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-natural-sidebar mb-2">تأكيد حذف المتدرب</h3>
                  <p className="text-natural-secondary mb-8">هل أنت متأكد من حذف المتدرب <span className="font-bold text-red-500">{traineeToDelete.fullName}</span>؟</p>
                  
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => {
                        deleteTrainee(traineeToDelete);
                        setTraineeToDelete(null);
                      }}
                      className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                    >
                      نعم، احذف المتدرب
                    </button>
                    <button 
                      onClick={() => setTraineeToDelete(null)}
                      className="w-full bg-natural-bg text-natural-sidebar py-4 rounded-2xl font-bold hover:bg-natural-border transition-all"
                    >
                      إلغاء
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Edit Member Modal */}
          <AnimatePresence>
            {editingMember && (
              <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-natural-sidebar/40 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-natural-border overflow-hidden flex flex-col max-h-[90vh]"
                  dir="rtl"
                >
                  <div className="bg-natural-sidebar p-6 text-white flex justify-between items-center shrink-0">
                    <h3 className="text-xl font-bold font-black">تعديل بيانات المشترك</h3>
                    <button onClick={() => setEditingMember(null)} className="hover:rotate-90 transition-all"><Icons.X size={24} /></button>
                  </div>
                  <form onSubmit={handleUpdateMember} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-natural-sidebar px-1">اسم المشترك</label>
                        <input 
                          required
                          type="text" 
                          value={editingMember.name}
                          onChange={e => setEditingMember({...editingMember, name: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-natural-sidebar px-1">رقم الهاتف</label>
                        <input 
                          type="tel" 
                          value={editingMember.phone}
                          onChange={e => setEditingMember({...editingMember, phone: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all font-mono"
                        />
                      </div>
                    </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-natural-sidebar px-1">تاريخ البدء</label>
                          <input 
                            required
                            type="date" 
                            value={editingMember.startDate}
                            onChange={e => {
                              const start = e.target.value;
                              let newEnd = editingMember.endDate;
                              if (start && editingMember.subscriptionDays) {
                                try {
                                  const d = new Date(start);
                                  d.setDate(d.getDate() + (editingMember.subscriptionDays || 0));
                                  if (!isNaN(d.getTime())) {
                                    newEnd = d.toISOString().split('T')[0];
                                  }
                                } catch(err) {}
                              }
                              setEditingMember({...editingMember, startDate: start, endDate: newEnd});
                            }}
                            className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-natural-sidebar px-1">مدة الاشتراك (أيام)</label>
                          <input 
                            type="number" 
                            value={editingMember.subscriptionDays || ''}
                            onChange={e => {
                              const days = parseInt(e.target.value) || 0;
                              let newEnd = editingMember.endDate;
                              if (editingMember.startDate) {
                                try {
                                  const d = new Date(editingMember.startDate);
                                  d.setDate(d.getDate() + days);
                                  if (!isNaN(d.getTime())) {
                                    newEnd = d.toISOString().split('T')[0];
                                  }
                                } catch(err) {}
                              }
                              setEditingMember({...editingMember, subscriptionDays: days, endDate: newEnd});
                            }}
                            className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all font-bold"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-natural-sidebar px-1">تاريخ الانتهاء</label>
                        <input 
                          required
                          type="date" 
                          value={editingMember.endDate}
                          onChange={e => setEditingMember({...editingMember, endDate: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all"
                        />
                      </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-natural-sidebar px-1">الصف</label>
                        <input 
                          type="text" 
                          value={editingMember.grade}
                          onChange={e => setEditingMember({...editingMember, grade: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-natural-sidebar px-1">المعلمة</label>
                        <input 
                          list="teachersList"
                          value={editingMember.teacherName}
                          onChange={e => setEditingMember({...editingMember, teacherName: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-natural-sidebar px-1">رصيد التعويض</label>
                        <input 
                          type="number" 
                          value={editingMember.compensationSessions}
                          onChange={e => setEditingMember({...editingMember, compensationSessions: Number(e.target.value)})}
                          className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-natural-sidebar px-1">السعر</label>
                        <input 
                          type="number" 
                          value={editingMember.price}
                          onChange={e => setEditingMember({...editingMember, price: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-natural-sidebar px-1">المبلغ المدفوع</label>
                        <input 
                          type="number" 
                          value={editingMember.paidAmount}
                          onChange={e => setEditingMember({...editingMember, paidAmount: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all font-bold text-natural-success"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-natural-sidebar px-1">الحالة</label>
                        <select 
                          value={editingMember.status}
                          onChange={e => setEditingMember({...editingMember, status: e.target.value as any})}
                          className="w-full px-4 py-3 rounded-xl border border-natural-border focus:border-natural-accent outline-none transition-all"
                        >
                          <option value="active">نشط</option>
                          <option value="expired">منتهي</option>
                        </select>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-natural-sidebar text-white py-4 rounded-2xl font-bold hover:bg-natural-accent transition-all shadow-xl shadow-natural-sidebar/20 mt-4"
                    >
                      حفظ التعديلات
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Delete Member Confirmation Modal */}
          <AnimatePresence>
            {memberToDelete && (
              <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-red-900/20 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-red-100 text-center"
                  dir="rtl"
                >
                  <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trash2 size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-natural-sidebar mb-2">تأكيد حذف المشترك</h3>
                  <p className="text-natural-secondary mb-8">هل أنت متأكد من حذف المشترك <span className="font-bold text-red-500">{memberToDelete.name}</span>؟</p>
                  
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={async () => {
                        await deleteMember(memberToDelete.id);
                        setMemberToDelete(null);
                      }}
                      className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                    >
                      نعم، احذف المشترك
                    </button>
                    <button 
                      onClick={() => setMemberToDelete(null)}
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
                    {isResettingPassword ? (
                      <div className="space-y-4">
                        <div className="relative">
                          <input 
                            type="text" 
                            placeholder="كلمة المرور الجديدة"
                            className="w-full px-5 py-4 bg-natural-bg border border-natural-border focus:border-natural-accent rounded-2xl outline-none text-center font-bold transition-all"
                            value={newPasswordInput}
                            onChange={e => setNewPasswordInput(e.target.value)}
                          />
                        </div>
                        <button 
                          onClick={handleResetPassword}
                          className="w-full bg-natural-accent text-white py-4 rounded-2xl font-bold hover:bg-opacity-90 transition-all shadow-xl shadow-natural-accent/20"
                        >
                          تعيين كلمة المرور
                        </button>
                        <button 
                          onClick={() => {
                            setIsResettingPassword(false);
                            setNewPasswordInput('');
                          }}
                          className="w-full text-natural-secondary py-2 text-sm font-bold hover:text-natural-sidebar transition-colors"
                        >
                          رجوع
                        </button>
                      </div>
                    ) : (
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
                        
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => setIsResettingPassword(true)}
                            className="w-full text-natural-accent py-2 text-xs font-bold hover:underline transition-all"
                          >
                            نسيت كلمة المرور؟ تعيين كلمة مرور جديدة
                          </button>
                          
                          <button 
                            onClick={() => {
                              setIsPasswordModalOpen(false);
                              setPasswordInput('');
                              setPasswordError(false);
                              setIsResettingPassword(false);
                            }}
                            className="w-full text-natural-secondary py-2 text-sm font-bold hover:text-natural-sidebar transition-colors"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    )}
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

function AccountantView({ members, trainees, settings, setSettings, showTotalAmount, setIsPasswordModalOpen, teacherAttendance, markTeacherAttendance, deleteTeacherAttendance }: any) {
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

  const calculateAssocProfit = (teacher: string) => {
    const teacherMembers = members.filter((m: any) => m.teacherName === teacher);
    const total = teacherMembers.reduce((acc: number, curr: any) => acc + (Number(curr.price) || 0), 0);
    const config = financials[teacher] || { base: total, percentage: 0, extra: 0 };
    const baseToUse = config.base !== undefined ? config.base : total;
    const teacherProfit = (baseToUse * (config.percentage / 100)) + Number(config.extra);
    return baseToUse - teacherProfit;
  };

  const totalTeacherProfits = teachers.reduce((acc: number, t: string) => acc + calculateTeacherProfit(t), 0);
  const totalExpected = members.reduce((acc: number, curr: any) => acc + (Number(curr.price) || 0), 0);
  const totalAssocProfit = teachers.reduce((acc: number, t: string) => acc + calculateAssocProfit(t), 0);

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
        <div className="p-6 border-b border-natural-border bg-natural-bg/30 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="font-bold text-lg text-natural-sidebar">تقرير المحاسبة المالية</h3>
            <p className="text-xs text-natural-secondary mt-1">توزيع النسب والمستحقات المالية للمعلمين والجمعية</p>
          </div>
          <AddTeacherInput 
            value={newTeacherName}
            onChange={setNewTeacherName}
            onAdd={handleAddTeacher}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-natural-bg/50 border-b border-natural-border">
              <tr>
                <th className="p-4 text-xs font-bold text-natural-sidebar">المعلم/ة</th>
                <th className="p-4 text-xs font-bold text-natural-sidebar text-center">التحضير</th>
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
                const assocProfit = baseToUse - teacherProfit;

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
                          onClick={async () => {
                            if (confirm(`هل أنت متأكد من حذف المعلم/ة ${teacher}؟`)) {
                              const updatedTeachers = (settings.teachers || []).filter((t: string) => t !== teacher);
                              setSettings({ ...settings, teachers: updatedTeachers });
                              await updateDoc(doc(db, 'settings', 'global'), { teachers: updatedTeachers });
                            }
                          }}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="حذف"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => markTeacherAttendance(teacher, 'حاضر')}
                            className={`w-6 h-6 rounded flex items-center justify-center transition-all ${teacherAttendance.find((a: any) => a.teacherName === teacher && a.date === new Date().toISOString().split('T')[0])?.status === 'حاضر' ? 'bg-green-500 text-white' : 'bg-natural-bg text-natural-secondary hover:bg-green-100'}`}
                            title="حاضر"
                          >
                            <Check size={12} />
                          </button>
                          <button 
                            onClick={() => markTeacherAttendance(teacher, 'غائب')}
                            className={`w-6 h-6 rounded flex items-center justify-center transition-all ${teacherAttendance.find((a: any) => a.teacherName === teacher && a.date === new Date().toISOString().split('T')[0])?.status === 'غائب' ? 'bg-red-500 text-white' : 'bg-natural-bg text-natural-secondary hover:bg-red-100'}`}
                            title="غائب"
                          >
                            <X size={12} />
                          </button>
                          <button 
                            onClick={() => markTeacherAttendance(teacher, 'غائب بي تعويض')}
                            className={`w-6 h-6 rounded flex items-center justify-center transition-all ${teacherAttendance.find((a: any) => a.teacherName === teacher && a.date === new Date().toISOString().split('T')[0])?.status === 'غائب بي تعويض' ? 'bg-amber-500 text-white' : 'bg-natural-bg text-natural-secondary hover:bg-amber-100'}`}
                            title="غائب بي تعويض"
                          >
                            <RefreshCw size={12} />
                          </button>
                        </div>
                        {teacherAttendance.find((a: any) => a.teacherName === teacher && a.date === new Date().toISOString().split('T')[0]) && (
                          <button 
                            onClick={() => deleteTeacherAttendance(teacher)}
                            className="text-[8px] text-red-400 hover:text-red-600 font-bold"
                          >
                            حذف
                          </button>
                        )}
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

function AddTeacherInput({ value, onChange, onAdd }: any) {
  const handleAdd = () => {
    if (value.trim()) {
      onAdd(value.trim());
      onChange('');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 md:w-64">
        <input 
          type="text" 
          placeholder="إضافة معلم/ة جديد..." 
          className="w-full text-xs p-2.5 pr-9 border border-natural-border rounded-xl focus:ring-1 focus:ring-natural-accent outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Icons.UserPlus size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-natural-secondary" />
      </div>
      <button 
        onClick={handleAdd}
        className="bg-natural-accent text-white px-4 py-2.5 rounded-xl hover:bg-opacity-90 transition-all font-bold text-xs shadow-sm hover:shadow-md active:scale-95"
      >
        إضافة
      </button>
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

function TeacherAttendanceView({ teachers, attendance, markAttendance, deleteTeacherAttendance, onAddTeacher }: any) {
  const today = new Date().toISOString().split('T')[0];
  const formattedDate = new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const [newTeacherInputLocal, setNewTeacherInputLocal] = useState('');
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-3xl border border-natural-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-natural-border bg-natural-bg/30 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="font-bold text-lg text-natural-sidebar">تحضير المعلمين</h3>
            <p className="text-xs text-natural-secondary mt-1">{formattedDate}</p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <AddTeacherInput 
              value={newTeacherInputLocal}
              onChange={setNewTeacherInputLocal}
              onAdd={onAddTeacher}
            />
            <div className="bg-natural-accent/10 px-4 py-3 rounded-2xl hidden lg:block">
              <span className="text-natural-accent font-bold text-xs">اليوم: {new Date().toLocaleDateString('ar-SA', { weekday: 'long' })}</span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right" dir="rtl">
            <thead className="bg-natural-bg/50 border-b border-natural-border">
              <tr>
                <th className="p-4 text-xs font-bold text-natural-sidebar">المعلم/ة</th>
                <th className="p-4 text-xs font-bold text-natural-sidebar text-center">الحالة الحالية</th>
                <th className="p-4 text-xs font-bold text-natural-sidebar text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-natural-bg">
              {teachers.map((teacher: string) => {
                const record = attendance.find((a: any) => a.teacherName === teacher && a.date === today);
                const status = record?.status;

                const getStatusColor = (s: string) => {
                  switch(s) {
                    case 'حاضر': return 'bg-green-100 text-green-600 border-green-200';
                    case 'غائب': return 'bg-red-100 text-red-600 border-red-200';
                    case 'غائب بي تعويض': return 'bg-amber-100 text-amber-600 border-amber-200';
                    default: return 'bg-gray-100 text-gray-400 border-gray-200';
                  }
                };

                return (
                  <tr key={teacher} className="hover:bg-natural-bg/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-natural-accent/10 rounded-xl flex items-center justify-center text-natural-accent">
                          <Icons.User size={20} />
                        </div>
                        <span className="font-bold text-natural-sidebar text-md">{teacher}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className={`inline-flex items-center px-4 py-1.5 rounded-full border text-xs font-bold ${getStatusColor(status || '')}`}>
                          {status || 'لم يتم التحضير'}
                        </div>
                        {status && (
                          <button
                            onClick={() => deleteTeacherAttendance(teacher)}
                            className="text-[10px] text-red-400 hover:text-red-600 font-bold transition-colors flex items-center gap-1"
                          >
                            <Trash2 size={10} />
                            حذف الحالة
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => markAttendance(teacher, 'حاضر')}
                          className={`flex-1 max-w-[100px] py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${status === 'حاضر' ? 'bg-green-500 text-white shadow-lg' : 'bg-natural-bg text-natural-secondary hover:bg-green-50 border border-natural-border'}`}
                        >
                          <Check size={14} />
                          حاضر
                        </button>
                        <button
                          onClick={() => markAttendance(teacher, 'غائب')}
                          className={`flex-1 max-w-[100px] py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${status === 'غائب' ? 'bg-red-500 text-white shadow-lg' : 'bg-natural-bg text-natural-secondary hover:bg-red-50 border border-natural-border'}`}
                        >
                          <X size={14} />
                          غائب
                        </button>
                        <button
                          onClick={() => markAttendance(teacher, 'غائب بي تعويض')}
                          className={`flex-1 max-w-[120px] py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${status === 'غائب بي تعويض' ? 'bg-amber-500 text-white shadow-lg' : 'bg-natural-bg text-natural-secondary hover:bg-amber-50 border border-natural-border'}`}
                        >
                          <RefreshCw size={14} />
                          بي تعويض
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-natural-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-natural-border bg-natural-bg/30">
          <h3 className="font-bold text-lg text-natural-sidebar">سجل الحضور والغياب للمعلمين</h3>
          <p className="text-xs text-natural-secondary mt-1">عرض السجلات السابقة للحضور والغياب والتعويض</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right" dir="rtl">
            <thead className="bg-natural-bg/50 border-b border-natural-border">
              <tr>
                <th className="p-4 text-xs font-bold text-natural-sidebar">المعلم/ة</th>
                <th className="p-4 text-xs font-bold text-natural-sidebar">التاريخ</th>
                <th className="p-4 text-xs font-bold text-natural-sidebar text-center">الحالة</th>
                <th className="p-4 text-xs font-bold text-natural-sidebar text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-natural-bg">
              {[...attendance].sort((a: any, b: any) => b.date.localeCompare(a.date)).map((record: any) => (
                <tr key={record.id} className="hover:bg-natural-bg/20 transition-colors">
                  <td className="p-4">
                    <span className="font-bold text-natural-sidebar text-sm">{record.teacherName}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-xs text-natural-secondary">{record.date}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full border text-[10px] font-bold ${
                      record.status === 'حاضر' ? 'bg-green-50 text-green-600 border-green-100' : 
                      record.status === 'غائب' ? 'bg-red-50 text-red-600 border-red-100' : 
                      'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="p-4 text-left">
                    <button
                      onClick={() => deleteTeacherAttendance(record.teacherName, record.date)}
                      className="text-red-400 hover:text-red-600 p-1 transition-colors"
                      title="حذف السجل"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {attendance.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-natural-secondary italic">لا يوجد سجلات حضور حالياً.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
