export type MemberStatus = 'active' | 'expired' | 'pending';

export interface IconMapping {
  activeMember: string;
  expiredMember: string;
  present: string;
  absent: string;
  compensation: string;
}

export interface AppSettings {
  icons: IconMapping;
  financialPassword?: string;
  teachers?: string[];
}

export interface Member {
  id: string;
  name: string;
  phone?: string;
  startDate: string;
  endDate: string;
  status: MemberStatus;
  sessionsCount: number;
  attendedCount: number;
  absentCount: number;
  compensationSessions: number;
  grade?: string;
  subjects?: string;
  price?: string;
  paidAmount?: string;
  paymentMethod?: 'كاش' | 'تحويل' | 'لم يتم الدفع';
  paymentDate?: string;
  subscriptionDays?: number;
  teacherName?: string;
}

export interface Course {
  id: string;
  title: string;
  instructor: string;
  startDate: string;
  endDate: string;
  capacity: number;
  enrolledCount: number;
  status: 'active' | 'upcoming' | 'completed';
  price: string;
  duration?: string;
  description?: string;
  cost?: string;
  associationPercentage?: string;
  isSettled?: boolean;
  extraIncome?: string;
  extraExpenses?: string;
  icon?: string;
}

export interface Trainee {
  id: string;
  courseId: string;
  fullName: string;
  motherPhone?: string;
  duration: string;
  amount: string;
  paymentMethod: 'كاش' | 'تحويل' | 'لم يتم الدفع';
  date: string;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  date: string;
  status: 'present' | 'absent' | 'absent_compensated' | 'compensated';
}

export interface TeacherAttendance {
  id: string;
  teacherName: string;
  date: string;
  status: 'حاضر' | 'غائب' | 'غائب بي تعويض';
}

