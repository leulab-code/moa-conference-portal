import { useApp } from '@/lib/app-context';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, AreaChart, Area } from 'recharts';
import {
  Calendar, Building2, Users, TrendingUp, CheckCircle2, ListFilter, Zap, ArrowRight,
  ShieldAlert, DollarSign, Clock, Activity, AlertTriangle, ChevronLeft, ChevronRight,
  Banknote, BarChart3, CalendarCheck, Target,
  Star, X as CloseIcon, Building, Mail, Phone, Clock3, AlertCircle, XCircle, FileText, User
} from 'lucide-react';
import { format, addDays, differenceInDays, isToday, isFuture, isPast, parseISO } from 'date-fns';
import { Booking, BookingStatus } from '@/lib/types';
import { ETH_MONTHS } from '@/components/ui/ethiopian-calendar';
import { EthDateTime } from 'ethiopian-calendar-date-converter';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

function ScrollReveal({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const currentRef = ref.current;
    if (currentRef) observer.observe(currentRef);
    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// Derive short month names from the full names
const ETH_MONTHS_SHORT = ETH_MONTHS.map(m => m.substring(0, 3));

const COLORS = ['#268053', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
const STATUS_COLORS: Record<string, string> = {
  approved: '#10b981',   // Emerald
  confirmed: '#268053',  // Dark Green
  override: '#8b5cf6',   // Violet
  reserved: '#f59e0b',   // Amber (Pending)
  rejected: '#ef4444',   // Red
  cancelled: '#94a3b8',  // Slate
  completed: '#3b82f6',  // Blue
};

const getEthDateString = (gregStr: string) => {
  if (!gregStr) return '';
  try {
    const [y, m, d] = gregStr.split('-').map(Number);
    const gDate = new Date(y, m - 1, d, 12, 0, 0); 
    const ethDate = EthDateTime.fromEuropeanDate(gDate);
    return `${ETH_MONTHS[ethDate.month - 1]} ${ethDate.date}, ${ethDate.year}`;
  } catch {
    return gregStr;
  }
};

function StatusBadge({ status }: { status: BookingStatus }) {
  const configs: Record<string, { color: string, bg: string, border: string, icon: any, label: string }> = {
    reserved: { label: 'Pending Approval', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: <Clock3 size={14} /> },
    approved: { label: 'Awaiting Payment', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: <Clock size={14} /> },
    confirmed: { label: 'Confirmed (Paid)', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <CheckCircle2 size={14} /> },
    override: { label: 'VIP Override', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', icon: <Star size={14} /> },
    rejected: { label: 'Rejected', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', icon: <XCircle size={14} /> },
    cancelled: { label: 'Cancelled', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', icon: <AlertCircle size={14} /> },
    completed: { label: 'Completed', color: 'text-slate-800', bg: 'bg-slate-200', border: 'border-slate-400', icon: <CheckCircle2 size={14} /> },
  };
  const cfg = configs[status] || configs.reserved;
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${cfg.bg} ${cfg.color} ${cfg.border} shadow-sm`}>
      {cfg.icon}
      {cfg.label}
    </div>
  );
}

function EventDetailsModal({ booking, onClose }: { booking: Booking, onClose: () => void }) {
  const { venues, technicalServices, supportServices } = useApp();
  const venue = venues.find(v => v.id === booking.venueId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="relative h-40 shrink-0">
           <div className="absolute inset-0 bg-gradient-to-br from-[#1b4332] to-[#268053]" />
           <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '24px 24px' }} />
           <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md flex items-center justify-center transition-all z-10">
             <CloseIcon size={20} />
           </button>
           <div className="absolute bottom-6 left-8 z-10">
              <StatusBadge status={booking.status as BookingStatus} />
              <h2 className="text-3xl font-serif font-black text-white mt-3 tracking-tight drop-shadow-sm uppercase line-clamp-1">{booking.eventTitle}</h2>
           </div>
        </div>
        <div className="flex-1 overflow-y-auto p-8 font-sans custom-scrollbar">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="space-y-6">
               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Event Date & Time</label>
                  <div className="space-y-3">
                     <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-[#268053]"><Calendar size={20} /></div>
                        <div>
                           <p className="text-sm font-black text-slate-900 leading-none mb-1">
                              {booking.startDate === booking.endDate ? getEthDateString(booking.startDate) : `${getEthDateString(booking.startDate).split(',')[0]} — ${getEthDateString(booking.endDate)}`}
                           </p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Booking Duration</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-[#268053]"><Clock size={20} /></div>
                        <div>
                           <p className="text-sm font-black text-slate-900 leading-none mb-1">{booking.startTime} - {booking.endTime}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Access Schedule</p>
                        </div>
                     </div>
                  </div>
               </div>
               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Venue & Capacity</label>
                  <div className="flex items-start gap-4">
                     <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0"><Building size={20} /></div>
                     <div>
                        <p className="text-base font-black text-slate-900 leading-tight mb-2 uppercase tracking-tight">{venue?.name || 'Unknown Venue'}</p>
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-xs"><Users size={14} className="text-[#268053]" /><span>{booking.participantCount} Expected Guests</span></div>
                     </div>
                  </div>
               </div>
            </div>
            <div className="space-y-6">
               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Organizer Contact</label>
                  <div className="space-y-3 bg-slate-50 p-5 rounded-xl border border-slate-100">
                     <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-slate-400"><User size={14} /></div>
                        <span className="text-sm font-bold text-slate-700">{booking.organizerName}</span>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-slate-400"><Mail size={14} /></div>
                        <span className="text-xs font-semibold text-slate-500">{booking.organizerEmail}</span>
                     </div>
                     {booking.organizerPhone && (
                       <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-slate-400"><Phone size={14} /></div>
                          <span className="text-xs font-semibold text-slate-500">{booking.organizerPhone}</span>
                       </div>
                     )}
                  </div>
               </div>
               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Event Overview</label>
                 <div className="bg-[#f8fafc] p-4 rounded-xl border border-slate-100 h-28 overflow-y-auto custom-scrollbar">
                   <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                     {booking.eventDescription ? `"${booking.eventDescription}"` : 'No description provided.'}
                   </p>
                 </div>
               </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Requested Services</label>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {(!booking.technicalServices?.length && !booking.supportServices?.length) ? (
                    <p className="text-slate-400 italic text-sm">No extra services requested.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {booking.technicalServices?.map(id => {
                        const s = technicalServices.find(x => x.id === id);
                        return s ? <span key={id} className="inline-flex px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 text-[10px] font-bold shadow-sm">{s.name}</span> : null;
                      })}
                      {booking.supportServices?.map(id => {
                        const s = supportServices.find(x => x.id === id);
                        return s ? <span key={id} className="inline-flex px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 text-[10px] font-bold shadow-sm">{s.name}</span> : null;
                      })}
                    </div>
                  )}
                </div>
              </div>
              {booking.letterAttachment && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Attachment</label>
                  <a href={booking.letterAttachment} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-emerald-100 flex items-center justify-center text-[#268053]"><FileText size={16} /></div>
                      <div>
                        <p className="font-bold text-[#268053] text-xs">Official Request Letter</p>
                        <p className="text-[10px] text-emerald-600">View PDF Document</p>
                      </div>
                    </div>
                  </a>
                </div>
              )}
              <div className="bg-slate-900 rounded-xl p-4 text-white shadow-lg relative overflow-hidden">
                 <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
                 <p className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-1 relative z-10">Total Valuation</p>
                 <p className="text-2xl font-black text-white relative z-10">{booking.totalPrice?.toFixed(2)} ETB</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0 flex justify-end">
           <button onClick={onClose} className="px-8 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm">Close Modal</button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { bookings, venues, technicalServices, supportServices } = useApp();
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);

  // ─── REAL TODAY ─────────────────────────────────────────────
  const today = useMemo(() => new Date(), []);
  const todayStr = format(today, 'yyyy-MM-dd');

  // ─── CORE METRICS ──────────────────────────────────────────
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const pendingCount  = bookings.filter(b => b.status === 'reserved').length;
  const completedCount = bookings.filter(b => b.status === 'completed').length;
  const rejectedCount = bookings.filter(b => b.status === 'rejected' || b.status === 'cancelled').length;
  const activeBookings = bookings.filter(b => ['confirmed', 'reserved'].includes(b.status));
  const totalParticipants = activeBookings.reduce((s, b) => s + (b.participantCount || 0), 0);

  // ─── 1. REVENUE ANALYTICS ─────────────────────────────────
  const confirmedRevenue = bookings
    .filter(b => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
  const pendingRevenue = bookings
    .filter(b => b.status === 'reserved')
    .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
  const totalProjectedRevenue = confirmedRevenue + pendingRevenue;

  // ─── 2. TODAY'S OCCUPANCY ──────────────────────────────────
  const todayBookings = bookings.filter(b => {
    if (b.status === 'cancelled' || b.status === 'rejected') return false;
    // Check if today falls within start/end range
    if (b.startDate <= todayStr && b.endDate >= todayStr) return true;
    // Also check daily schedules
    if (b.dailySchedules?.some(ds => ds.date === todayStr)) return true;
    return false;
  });

  const todayOccupiedVenues = new Set(todayBookings.map(b => b.venueId));
  const availableVenues = venues.filter(v => v.status !== 'out_of_order');
  const occupancyRate = availableVenues.length > 0
    ? Math.round((todayOccupiedVenues.size / availableVenues.length) * 100)
    : 0;

  // ─── 3. CONFLICT DETECTION ─────────────────────────────────
  const conflicts = useMemo(() => {
    return activeBookings.filter((b1, i) =>
      activeBookings.some((b2, j) =>
        i !== j &&
        b1.venueId === b2.venueId &&
        b1.startDate === b2.startDate &&
        ((b1.startTime >= b2.startTime && b1.startTime < b2.endTime) ||
         (b2.startTime >= b1.startTime && b2.startTime < b1.endTime))
      )
    );
  }, [activeBookings]);

  // ─── 4. BOOKING STATUS DISTRIBUTION ────────────────────────
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach(b => {
      counts[b.status] = (counts[b.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: STATUS_COLORS[name] || '#94a3b8'
    }));
  }, [bookings]);

  // ─── 5. WEEKLY FORECAST (next 7 days) ─────────────────────
  const forecastData = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = addDays(today, i + 1);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayName = format(d, 'EEE');
      const count = bookings.filter(b =>
        b.startDate <= dateStr && b.endDate >= dateStr &&
        ['confirmed', 'reserved'].includes(b.status)
      ).length;
      return { name: dayName, date: dateStr, count };
    });
  }, [bookings, today]);

  // ─── 6. SERVICE DEMAND ─────────────────────────────────────
  const serviceDemandData = useMemo(() => {
    const allServiceIds = [
      ...bookings.flatMap(b => b.technicalServices || []),
      ...bookings.flatMap(b => b.supportServices || [])
    ];
    const serviceCounts: Record<string, number> = {};
    allServiceIds.forEach(id => {
      const service = [...technicalServices, ...supportServices].find(s => s.id === id);
      if (service) {
        serviceCounts[service.name] = (serviceCounts[service.name] || 0) + 1;
      }
    });
    return Object.entries(serviceCounts)
      .map(([name, value]) => ({ name: name.length > 18 ? name.substring(0, 16) + '…' : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [bookings, technicalServices, supportServices]);

  // ─── 7. VENUE USAGE RANKING ────────────────────────────────
  const venueUsage = useMemo(() => {
    return venues
      .map(v => ({
        name: v.name.split(' ').slice(0, 2).join(' '),
        fullName: v.name,
        bookings: bookings.filter(b => b.venueId === v.id && !['cancelled', 'rejected'].includes(b.status)).length,
        capacity: v.capacity || 0,
        type: v.type,
      }))
      .filter(v => v.bookings > 0)
      .sort((a, b) => b.bookings - a.bookings);
  }, [venues, bookings]);

  // ─── 8. MONTHLY TREND (last 6 months simulation) ──────────
  const monthlyTrend = useMemo(() => {
    const todayGreg = new Date();
    const todayEth = EthDateTime.fromEuropeanDate(todayGreg);
    
    const months: { name: string; bookings: number; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      let targetYear = todayEth.year;
      let targetMonth = todayEth.month - i;
      while (targetMonth <= 0) {
        targetMonth += 13;
        targetYear -= 1;
      }
      
      // First day of target Ethiopian month
      const startEth = new EthDateTime(targetYear, targetMonth, 1, 12, 0, 0);
      const startGreg = startEth.toEuropeanDate();
      
      // Last day of target Ethiopian month
      const daysInMonth = targetMonth === 13 ? (targetYear % 4 === 3 ? 6 : 5) : 30;
      const endEth = new EthDateTime(targetYear, targetMonth, daysInMonth, 12, 0, 0);
      const endGreg = endEth.toEuropeanDate();
      
      const startStr = format(startGreg, 'yyyy-MM-dd');
      const endStr = format(endGreg, 'yyyy-MM-dd');
      
      const monthBookings = bookings.filter(b => 
        b.startDate >= startStr && b.startDate <= endStr && 
        !['cancelled', 'rejected'].includes(b.status)
      );
      
      months.push({
        name: ETH_MONTHS_SHORT[targetMonth - 1],
        bookings: monthBookings.length,
        revenue: monthBookings.reduce((s, b) => s + (b.totalPrice || 0), 0),
      });
    }
    return months;
  }, [bookings]);

  // ─── 9. RESOURCE BOTTLENECK ────────────────────────────────
  const resourceInventory: Record<string, number> = {
    'LED Screen / Display': 2, 'Livestreaming': 1,
    'Video Conferencing': 2, 'Photography': 1
  };

  const bottleneckAlerts = useMemo(() => {
    return Object.entries(resourceInventory).map(([name, limit]) => {
      const datesWithUsage = Array.from(new Set(activeBookings.map(b => b.startDate)));
      const peakUsage = datesWithUsage.reduce((max, date) => {
        const dailyUsage = activeBookings.filter(b =>
          b.startDate === date &&
          ([...b.technicalServices, ...b.supportServices].some(sid =>
            [...technicalServices, ...supportServices].find(s => s.id === sid)?.name === name
          ))
        ).length;
        return Math.max(max, dailyUsage);
      }, 0);
      return peakUsage > limit ? { name, peakUsage, limit } : null;
    }).filter(Boolean);
  }, [activeBookings, technicalServices, supportServices]);

  // ─── 10. PRIORITY EVENTS (Next 7 days) ─────────────────────
  const priorityEvents = useMemo(() => {
    const sevenDaysOut = format(addDays(today, 7), 'yyyy-MM-dd');
    return bookings.filter(b => {
      return b.startDate >= todayStr && b.startDate <= sevenDaysOut && ['confirmed', 'reserved'].includes(b.status);
    }).sort((a, b) => a.startDate.localeCompare(b.startDate) || a.startTime.localeCompare(b.startTime));
  }, [bookings, todayStr]);

  // Pagination for Priority Events
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const totalPages = Math.ceil(priorityEvents.length / itemsPerPage);

  const paginatedPriority = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return priorityEvents.slice(start, start + itemsPerPage);
  }, [priorityEvents, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [priorityEvents.length]);

  // ─── 11. STAFFING RECOMMENDATIONS ──────────────────────────
  const staffing = useMemo(() => ({
    ushers: Math.max(1, Math.ceil(totalParticipants / 60)),
    security: Math.max(1, Math.ceil(totalParticipants / 150)),
    tech: totalParticipants > 200 ? 2 : 1,
  }), [totalParticipants]);

  // ─── UTILITY: Ethiopian Date Parts ─────────────────────────
  const getEthParts = (gregStr: string) => {
    try {
      const [y, m, d] = gregStr.split('-').map(Number);
      const ethDate = EthDateTime.fromEuropeanDate(new Date(y, m - 1, d, 12));
      return { month: ETH_MONTHS_SHORT[ethDate.month - 1], day: ethDate.date };
    } catch {
      return { month: '???', day: '??' };
    }
  };

  const getEthDateFull = (gregStr: string) => {
    try {
      const [y, m, d] = gregStr.split('-').map(Number);
      const ethDate = EthDateTime.fromEuropeanDate(new Date(y, m - 1, d, 12));
      return `${ETH_MONTHS[ethDate.month - 1]} ${ethDate.date}, ${ethDate.year}`;
    } catch {
      return gregStr;
    }
  };

  // ─── TOP-LEVEL STAT CARDS ──────────────────────────────────
  const stats = [
    { label: 'Confirmed Events', value: confirmedCount, icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />, bg: 'bg-[#112a1f]', border: 'border-emerald-500/20', sub: `${completedCount} completed` },
    { label: 'Projected Revenue', value: `ETB ${totalProjectedRevenue.toLocaleString()}`, icon: <Banknote className="w-6 h-6 text-emerald-400" />, bg: 'bg-[#0d2818]', border: 'border-emerald-500/20', sub: `ETB ${confirmedRevenue.toLocaleString()} confirmed` },
    { label: 'Action Required', value: pendingCount, icon: <ListFilter className="w-6 h-6 text-amber-400" />, bg: 'bg-[#1e1b10]', border: 'border-amber-500/20', sub: `${conflicts.length} conflicts` },
    { label: "Today's Occupancy", value: `${occupancyRate}%`, icon: <Target className="w-6 h-6 text-sky-400" />, bg: 'bg-[#082f49]', border: 'border-sky-500/20', sub: `${todayOccupiedVenues.size}/${availableVenues.length} venues` },
  ];

  // ─── CUSTOM TOOLTIP ────────────────────────────────────────
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#111827]/95 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl">
          <p className="font-bold text-white mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} className="text-[#2ed18a] font-black text-sm">
              {p.value} {p.dataKey === 'count' ? 'Events' : p.dataKey === 'revenue' ? 'ETB' : p.dataKey === 'bookings' ? 'Bookings' : 'Requests'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="pb-12">
      
      {activeBooking && <EventDetailsModal booking={activeBooking} onClose={() => setActiveBooking(null)} />}

      {/* Header */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">Analytics Dashboard</h1>
          <p className="text-slate-500 mt-2 font-medium">Real-time overview of conference center operations — <span className="text-[#268053] font-bold">{getEthDateFull(todayStr)}</span></p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white px-4 py-2 border border-slate-200 rounded-lg shadow-sm text-sm font-bold text-slate-700 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500 animate-pulse" /> Live
          </div>
          <div className="bg-white px-4 py-2 border border-slate-200 rounded-lg shadow-sm text-sm font-bold text-slate-700 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#268053]" /> {bookings.length} Total Bookings
          </div>
        </div>
      </div>

      {/* ═══ TOP LEVEL METRIC CARDS ═══ */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {stats.map((s, i) => (
          <ScrollReveal key={s.label} delay={100 * i}>
            <div
              className={`${s.bg} h-full rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-b-4 ${s.border} hover:-translate-y-2 hover:shadow-2xl transition-all duration-500 relative overflow-hidden group cursor-default`}
            >
              <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/5 group-hover:bg-white/10 transition-all duration-700 pointer-events-none blur-2xl" />
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform duration-500">
                  {s.icon}
                </div>
                {((s.label === 'Action Required') && typeof s.value === 'number' && s.value > 0) && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                )}
              </div>
              <div className="relative z-10">
                <p className="text-3xl font-black text-white tracking-tight mb-1">{s.value}</p>
                <p className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase">{s.label}</p>
                <p className="text-[10px] font-bold text-white/25 mt-2">{s.sub}</p>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>

      {/* ═══ ROW 2: WEEKLY FORECAST + MONTHLY TREND ═══ */}
      <div className="grid gap-8 lg:grid-cols-7 mb-8">

        {/* Weekly Forecast Chart */}
        <ScrollReveal className="lg:col-span-4" delay={200}>
          <div className="bg-white rounded-3xl p-8 shadow-[0_40px_80px_rgba(0,0,0,0.03)] border border-slate-100 h-full">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#268053] flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight font-serif">7-Day Load Forecast</h3>
                <p className="text-sm text-slate-500 font-medium">Predicted event volume for the upcoming week</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#268053]"></div><span className="text-[9px] font-black uppercase text-slate-400">Normal</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></div><span className="text-[9px] font-black uppercase text-slate-400">High</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></div><span className="text-[9px] font-black uppercase text-slate-400">Peak</span></div>
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} dy={10} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#268053" radius={[8, 8, 0, 0]} barSize={36} animationBegin={500}>
                  {forecastData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.count >= 3 ? '#ef4444' : entry.count >= 2 ? '#f59e0b' : '#268053'} fillOpacity={0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          </div>
        </ScrollReveal>

        {/* Monthly Booking Trend */}
        <ScrollReveal className="lg:col-span-3" delay={300}>
          <div className="bg-white rounded-3xl p-8 shadow-[0_40px_80px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col h-full">
          <div className="mb-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight font-serif">Monthly Trend</h3>
              <p className="text-sm text-slate-500 font-medium">Booking frequency (Ethiopian months)</p>
            </div>
          </div>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#268053" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#268053" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} dy={10} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="bookings" stroke="#268053" strokeWidth={3} fill="url(#colorBookings)" animationBegin={600} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          </div>
        </ScrollReveal>
      </div>

      {/* ═══ ROW 3: STATUS DISTRIBUTION + SERVICE DEMAND + RESOURCE ALERTS ═══ */}
      <div className="grid gap-8 lg:grid-cols-3 mb-8">

        {/* Booking Status Distribution */}
        <ScrollReveal delay={400}>
          <div className="bg-white rounded-3xl p-8 shadow-[0_40px_80px_rgba(0,0,0,0.03)] border border-slate-100 h-full">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight font-serif">Status Overview</h3>
              <p className="text-xs text-slate-500 font-medium">{bookings.length} total bookings</p>
            </div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {statusDistribution.map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }}></div>
                <span className="text-[10px] font-bold text-slate-600 truncate">{s.name} ({s.value})</span>
              </div>
            ))}
          </div>
          </div>
        </ScrollReveal>

        {/* Service Demand */}
        <ScrollReveal delay={500}>
          <div className="bg-white rounded-3xl p-8 shadow-[0_40px_80px_rgba(0,0,0,0.03)] border border-slate-100 h-full">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight font-serif">Service Demand</h3>
              <p className="text-xs text-slate-500 font-medium">Most requested resources</p>
            </div>
          </div>
          {serviceDemandData.length === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-center opacity-40">
              <Zap className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">No service data</p>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {serviceDemandData.map((s, i) => {
                const maxVal = serviceDemandData[0]?.value || 1;
                const percent = Math.round((s.value / maxVal) * 100);
                return (
                  <ScrollReveal key={s.name} delay={100 * i}>
                    <div>
                      <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1.5">
                        <span className="truncate mr-4">{s.name}</span>
                        <span className="shrink-0">{s.value}×</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${percent}%`, backgroundColor: COLORS[i % COLORS.length] }}
                        ></div>
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          )}
          </div>
        </ScrollReveal>

        {/* Resource Alerts + Staffing */}
        <ScrollReveal delay={600}>
          <div className="bg-white rounded-3xl p-8 shadow-[0_40px_80px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col h-full">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight font-serif">Alerts & Staffing</h3>
              <p className="text-xs text-slate-500 font-medium">Resource bottlenecks & recommendations</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto mb-4">
            {conflicts.length > 0 && (
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <p className="text-sm font-black text-red-900">{conflicts.length} Scheduling Conflicts</p>
                </div>
                <p className="text-[10px] font-bold text-red-600">Overlapping venue bookings detected</p>
              </div>
            )}
            {(bottleneckAlerts as any[]).map((a: any) => (
              <div key={a.name} className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-amber-900">{a.name}</p>
                  <p className="text-[10px] font-bold text-amber-600 uppercase">Peak: {a.peakUsage} / Limit: {a.limit}</p>
                </div>
                <span className="text-xs font-black text-amber-800 bg-amber-100 px-2 py-1 rounded-lg">-{a.peakUsage - a.limit}</span>
              </div>
            ))}
            {conflicts.length === 0 && bottleneckAlerts.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                <p className="text-xs font-black uppercase tracking-widest">All Systems OK</p>
              </div>
            )}
          </div>

          <div className="pt-5 border-t border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Staffing Recommendation</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <p className="text-lg font-black text-slate-800 leading-none">{staffing.ushers}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Ushers</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <p className="text-lg font-black text-slate-800 leading-none">{staffing.security}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Security</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <p className="text-lg font-black text-slate-800 leading-none">{staffing.tech}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Tech Staff</p>
              </div>
            </div>
          </div>
          </div>
        </ScrollReveal>
      </div>

      {/* ═══ ROW 4: UPCOMING EVENTS LIST ═══ */}
      <div className="bg-white rounded-3xl p-8 shadow-[0_40px_80px_rgba(0,0,0,0.03)] border border-slate-100 mb-8" style={{ animation: 'fade-in-up 0.6s cubic-bezier(0.16,1,0.3,1) 900ms both' }}>
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#268053] flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight font-serif">Upcoming 7 Days: Operational Focus</h3>
              <p className="text-sm text-slate-500 font-medium">Events requiring room setup and team coordination</p>
            </div>
          </div>
          <span onClick={() => window.location.hash = '#/calendar'} className="text-[11px] font-black uppercase text-[#268053] tracking-widest flex items-center gap-2 cursor-pointer hover:underline">
            {priorityEvents.length} Events <ArrowRight className="w-4 h-4" />
          </span>
        </div>

        {priorityEvents.length === 0 ? (
          <div className="py-20 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
            <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-400">No events scheduled in the next 7 days.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {paginatedPriority.map(b => {
                const venue = venues.find(v => v.id === b.venueId);
                const isUrgent = b.status === 'reserved';
                const eth = getEthParts(b.startDate);
                const isConflict = conflicts.some(c => c.id === b.id);
                const daysAway = differenceInDays(new Date(b.startDate), today);
                const daysLabel = daysAway === 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : `${daysAway}d away`;

                return (
                  <div key={b.id} onClick={(e) => { e.stopPropagation(); setActiveBooking(b); }} className={`flex items-center gap-5 p-5 rounded-2xl transition-all duration-300 group cursor-pointer border ${isConflict ? 'bg-red-50/50 border-red-100 hover:border-red-200' : 'bg-[#f8fafc] border-transparent hover:bg-white hover:shadow-xl hover:border-emerald-100'}`}>
                    <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border-b-4 ${isUrgent ? 'bg-amber-100 text-amber-600 border-amber-500/20' : 'bg-emerald-100 text-emerald-600 border-emerald-500/20'}`}>
                      <span className="text-[9px] font-black uppercase leading-none mb-0.5">{eth.month}</span>
                      <span className="text-xl font-black leading-none">{eth.day}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-black text-slate-900 group-hover:text-[#268053] transition-colors truncate text-sm">{b.eventTitle}</p>
                        {isUrgent && <span className="px-2 py-0.5 bg-amber-500 text-white text-[8px] font-black rounded-full animate-pulse shrink-0">PENDING</span>}
                        {isConflict && <span className="px-2 py-0.5 bg-red-600 text-white text-[8px] font-black rounded-full shrink-0">CONFLICT</span>}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                          <Building2 className="w-3 h-3" /> {venue?.name || 'Unknown'}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                          <Users className="w-3 h-3" /> {b.participantCount} pax
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                          <Clock className="w-3 h-3" /> {b.startTime}–{b.endTime}
                        </div>
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end shrink-0">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${daysAway === 0 ? 'bg-red-100 text-red-700' : daysAway <= 2 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                        {daysLabel}
                      </span>
                      {b.totalPrice ? (
                        <span className="text-[10px] font-bold text-emerald-600 mt-1">ETB {b.totalPrice.toLocaleString()}</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 mt-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Showing <span className="text-slate-900">{Math.min(priorityEvents.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(priorityEvents.length, currentPage * itemsPerPage)}</span> of {priorityEvents.length}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-lg h-8 w-8 p-0 border-slate-200 text-slate-500 hover:text-[#268053] hover:border-[#268053]/50 disabled:opacity-30 transition-all shadow-sm">
                    <ChevronLeft size={14} />
                  </Button>
                  {[...Array(totalPages)].map((_, i) => (
                    <Button key={i + 1} variant="outline" size="sm" onClick={() => setCurrentPage(i + 1)} className={`rounded-lg h-8 w-8 p-0 text-[10px] font-black transition-all ${currentPage === i + 1 ? "bg-[#268053] text-white border-transparent shadow-md" : "border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-white"}`}>
                      {i + 1}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-lg h-8 w-8 p-0 border-slate-200 text-slate-500 hover:text-[#268053] hover:border-[#268053]/50 disabled:opacity-30 transition-all shadow-sm">
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ ROW 5: VENUE POPULARITY + CAPACITY ═══ */}
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="bg-white rounded-3xl p-8 shadow-[0_40px_80px_rgba(0,0,0,0.03)] border border-slate-100" style={{ animation: 'fade-in-up 0.6s cubic-bezier(0.16,1,0.3,1) 1000ms both' }}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#268053] flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight font-serif">Venue Popularity</h3>
              <p className="text-xs text-slate-500 font-medium">Booking distribution across halls</p>
            </div>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={venueUsage} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="bookings">
                  {venueUsage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {venueUsage.slice(0, 6).map((v, i) => (
              <div key={v.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                <span className="text-[10px] font-bold text-slate-600 truncate">{v.name} ({v.bookings})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Capacity & Scaling */}
        <div className="bg-[#0f172a] rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col justify-center" style={{ animation: 'fade-in-up 0.6s cubic-bezier(0.16,1,0.3,1) 1100ms both' }}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <h3 className="text-2xl font-serif font-bold text-white">Venue Utilization</h3>
              <p className="text-slate-400 text-sm mt-1">Real-time occupancy across all halls</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-emerald-400">{occupancyRate}%</p>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Today's Rate</p>
            </div>
          </div>

          <div className="space-y-5 relative z-10">
            {venues.filter(v => v.status !== 'out_of_order').slice(0, 5).map(venue => {
              const venueBookingCount = bookings.filter(b =>
                b.venueId === venue.id &&
                b.startDate <= todayStr && b.endDate >= todayStr &&
                ['confirmed', 'reserved'].includes(b.status)
              ).length;
              const isOccupied = venueBookingCount > 0;
              return (
                <div key={venue.id}>
                  <div className="flex justify-between text-[10px] font-black uppercase mb-1.5">
                    <span className="text-slate-400 truncate mr-4">{venue.name}</span>
                    <span className={isOccupied ? 'text-amber-400' : 'text-emerald-400'}>
                      {isOccupied ? `${venueBookingCount} Event${venueBookingCount > 1 ? 's' : ''}` : 'Available'}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${isOccupied ? 'bg-amber-500' : 'bg-emerald-500/30'}`}
                      style={{ width: isOccupied ? '100%' : '10%' }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Today's Revenue Summary */}
          <div className="mt-8 pt-6 border-t border-white/5 relative z-10 grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
              <p className="text-xl font-black text-white mb-0.5">ETB {confirmedRevenue.toLocaleString()}</p>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Confirmed Revenue</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
              <p className="text-xl font-black text-amber-400 mb-0.5">ETB {pendingRevenue.toLocaleString()}</p>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pending Revenue</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
