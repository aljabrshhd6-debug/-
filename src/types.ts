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
}

export interface Member {
  id: string;
  name: string;
  phone: string;
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
  paymentMethod?: 'كاش' | 'حوالة' | 'لم يتم الدفع';
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
  description?: string;
}

export interface Trainee {
  id: string;
  courseId: string;
  fullName: string;
  motherPhone: string;
  duration: string;
  amount: string;
  paymentMethod: 'كاش' | 'حوالة' | 'لم يتم الدفع';
  date: string;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  date: string;
  status: 'present' | 'absent' | 'absent_compensated' | 'compensated';
}

