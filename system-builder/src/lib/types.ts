export type UserRole = 'organizer' | 'event_management' | 'ict_admin' | 'catering_support' | 'admin_finance' | 'leadership' | 'system_admin';

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  created_at?: string;
}

export type BookingStatus = 'reserved' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';

export type VenueType = 'Cinema' | 'Theatre/Auditorium' | 'Meeting' | 'Boardroom' | 'Lounge' | 'Refreshment';

export interface Venue {
  id: string;
  name: string;
  type: VenueType;
  capacity: number | null;
  bestFor: string;
  price: number | null;
  image?: string | null;
}

export interface TechnicalService {
  id: string;
  name: string;
  price: number;
}

export interface SupportService {
  id: string;
  name: string;
  price: number;
}

export interface DailySchedule {
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
}

export interface Booking {
  id: string;
  userId: string | null;
  venueId: string;
  venueName?: string;
  eventTitle: string;
  eventDescription: string;
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  dailySchedules?: DailySchedule[];
  participantCount: number;
  status: BookingStatus;
  technicalServices: string[];
  supportServices: string[];
  letterAttachment?: string;
  ictAcknowledged?: boolean;
  cateringAcknowledged?: boolean;
  createdAt: string;
  rejectionReason?: string;
  venueDailyRate?: number;
  serviceFees?: number;
  totalPrice?: number;
}
