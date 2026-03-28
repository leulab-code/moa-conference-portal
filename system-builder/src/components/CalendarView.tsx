import { useState, useMemo } from 'react';
import { useApp } from '@/lib/app-context';
import { format, parseISO } from 'date-fns';
import { Booking, BookingStatus } from '@/lib/types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, MapPin, User, CheckCircle2, Clock, Star, Info, X as CloseIcon, Building, Mail, Phone, Clock3, AlertCircle, XCircle, FileText, MonitorSmartphone, AlignLeft, Users } from 'lucide-react';
import { ETH_MONTHS } from '@/components/ui/ethiopian-calendar';
import { EthDateTime } from 'ethiopian-calendar-date-converter';

const ETH_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

// --- Modal Components ---

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
        
        {/* Modal Header */}
        <div className="relative h-40 shrink-0">
           <div className="absolute inset-0 bg-gradient-to-br from-[#1b4332] to-[#268053]" />
           <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '24px 24px' }} />
           
           <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md flex items-center justify-center transition-all z-10">
             <CloseIcon size={20} />
           </button>

           <div className="absolute bottom-6 left-8 z-10">
              <StatusBadge status={booking.status} />
              <h2 className="text-3xl font-serif font-black text-white mt-3 tracking-tight drop-shadow-sm uppercase line-clamp-1">{booking.eventTitle}</h2>
           </div>
        </div>

        {/* Modal Content - Expanded Details */}
        <div className="flex-1 overflow-y-auto p-8 font-sans custom-scrollbar">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Column 1: Core Info */}
            <div className="space-y-6">
               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Event Date & Time</label>
                  <div className="space-y-3">
                     <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-[#268053]"><CalendarIcon size={20} /></div>
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

            {/* Column 2: Organizer & Description */}
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

            {/* Column 3: Services & Attachments */}
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Requested Services</label>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {(!booking.technicalServices?.length && !booking.supportServices?.length) ? (
                    <p className="text-slate-400 italic text-sm">No extra services requested.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {booking.technicalServices.map(id => {
                        const s = technicalServices.find(x => x.id === id);
                        return s ? <span key={id} className="inline-flex px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 text-[10px] font-bold shadow-sm">{s.name}</span> : null;
                      })}
                      {booking.supportServices.map(id => {
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

// --- Main View ---

export default function CalendarView() {
  const { bookings, venues } = useApp();
  const [selectedVenue, setSelectedVenue] = useState<string>('all');
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  
  const today = EthDateTime.now();
  const [view, setView] = useState({ year: today.year, month: today.month });

  const prevMonth = () => setView(v => v.month === 1 ? { year: v.year - 1, month: 13 } : { ...v, month: v.month - 1 });
  const nextMonth = () => setView(v => v.month === 13 ? { year: v.year + 1, month: 1 } : { ...v, month: v.month + 1 });

  // Calculate grid layout
  const daysInMonth = view.month === 13 ? (view.year % 4 === 3 ? 6 : 5) : 30;
  const firstDayGreg = new EthDateTime(view.year, view.month, 1, 12, 0, 0).toEuropeanDate();
  const startOffset = firstDayGreg.getDay() === 0 ? 6 : firstDayGreg.getDay() - 1; 

  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
     const day = i + 1;
     const gregDate = new EthDateTime(view.year, view.month, day, 12, 0, 0).toEuropeanDate();
     return { day, gregDate };
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'reserved': return 'bg-amber-50 text-amber-900 border-amber-200 border-l-amber-500';
      case 'approved': return 'bg-blue-50 text-blue-900 border-blue-200 border-l-blue-500';
      case 'confirmed': return 'bg-emerald-50 text-emerald-900 border-emerald-200 border-l-[#268053]';
      case 'override': return 'bg-purple-50 text-purple-900 border-purple-200 border-l-purple-500';
      default: return 'bg-slate-50 text-slate-900 border-slate-200 border-l-slate-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'reserved': return <Clock size={10} className="shrink-0 text-amber-600" />;
      case 'override': return <Star size={10} className="shrink-0 text-purple-600" />;
      case 'approved': return <Clock size={10} className="shrink-0 text-blue-600" />;
      default: return <CheckCircle2 size={10} className="shrink-0 text-emerald-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'reserved': return 'Pending';
      case 'approved': return 'Wait Pay';
      case 'confirmed': return 'Paid';
      case 'override': return 'VIP';
      default: return status;
    }
  };

  return (
    <div className="pb-12" style={{ animation: 'fade-in-up 0.6s cubic-bezier(0.16,1,0.3,1) both' }}>
      
      {activeBooking && (
        <EventDetailsModal 
          booking={activeBooking} 
          onClose={() => setActiveBooking(null)} 
        />
      )}

      {/* Header Area */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-serif font-black text-slate-900 tracking-tight flex items-center gap-3">
             <CalendarIcon className="w-8 h-8 text-[#268053]" /> Master Schedule
          </h1>
          <p className="text-slate-500 font-medium mt-2">Full Ethiopian Calendar grid viewing all pending and confirmed events.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-wider bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <span className="flex items-center gap-1.5 text-amber-700"><span className="w-2.5 h-2.5 rounded bg-amber-500" /> Pending</span>
            <span className="flex items-center gap-1.5 text-blue-700"><span className="w-2.5 h-2.5 rounded bg-blue-500" /> Wait Pay</span>
            <span className="flex items-center gap-1.5 text-emerald-700"><span className="w-2.5 h-2.5 rounded bg-[#268053]" /> Paid</span>
            <span className="flex items-center gap-1.5 text-purple-700"><span className="w-2.5 h-2.5 rounded bg-purple-500" /> VIP</span>
          </div>

          <div className="relative group w-full sm:w-auto">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#268053]" />
            <select
              value={selectedVenue}
              onChange={e => setSelectedVenue(e.target.value)}
              className="w-full sm:w-48 text-sm font-bold text-slate-700 border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 bg-white shadow-sm focus:outline-none focus:border-[#268053] appearance-none cursor-pointer"
            >
              <option value="all">All Venues</option>
              {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Massive Calendar Grid */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        
        {/* Navigation Bar */}
        <div className="bg-[#111827] text-white px-6 py-4 flex items-center justify-between">
          <button onClick={prevMonth} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
            <ChevronLeft size={24} />
          </button>
          
          <h2 className="text-2xl font-black tracking-widest uppercase">
             {ETH_MONTHS[view.month - 1]} {view.year}
          </h2>
          
          <button onClick={nextMonth} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {ETH_DAYS.map(d => (
            <div key={d} className="text-center py-3 text-xs font-black text-slate-500 uppercase tracking-widest border-r border-slate-200 last:border-0">
               {d}
            </div>
          ))}
        </div>

        {/* The Grid Boxes */}
        <div className="grid grid-cols-7 bg-slate-200 gap-px">
          
          {/* Empty offset padding */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[160px] bg-[#f8fafc]/80" />
          ))}
          
          {calendarDays.map(({ day, gregDate }) => {
             const dateStr = format(gregDate, 'yyyy-MM-dd');
             
             // Find bookings for this box
             const dayBookings = bookings.filter(b => {
                let matchesDate = b.startDate <= dateStr && b.endDate >= dateStr;
                if (b.dailySchedules?.length) matchesDate = b.dailySchedules.some(s => s.date === dateStr);
                const matchVenue = selectedVenue === 'all' || b.venueId.toString() === selectedVenue;
                const validStatus = ['reserved', 'approved', 'confirmed', 'override', 'completed'].includes(b.status);
                return matchesDate && matchVenue && validStatus;
             });

             return (
               <div key={day} className="min-h-[160px] bg-white p-2 flex flex-col transition-colors group">
                 <div className="flex justify-end mb-2">
                   <span className="text-sm font-black text-slate-400 group-hover:text-slate-800 transition-colors">{day}</span>
                 </div>
                 
                 <div className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar pr-1">
                   {dayBookings.map(b => (
                      <div 
                        key={b.id} 
                        // ADDED e.stopPropagation() to prevent any click issues
                        onClick={(e) => { e.stopPropagation(); setActiveBooking(b); }}
                        className={`px-2 py-1.5 rounded border border-l-[4px] shadow-sm flex flex-col gap-0.5 cursor-pointer hover:-translate-y-px hover:shadow-md transition-all ${getStatusColor(b.status)}`}
                      >
                         <div className="flex items-center justify-between gap-1 font-black text-[10px] uppercase tracking-wider opacity-80">
                            <span className="flex items-center gap-1">
                              {getStatusIcon(b.status)}
                              {getStatusText(b.status)}
                            </span>
                         </div>
                         <div className="flex items-center gap-1 font-bold text-xs truncate">
                            <User size={10} className="shrink-0 opacity-60" />
                            <span className="truncate">{b.organizerName}</span>
                         </div>
                         <div className="text-[10px] font-medium truncate opacity-90 pl-3.5">
                            {b.eventTitle}
                         </div>
                      </div>
                   ))}
                 </div>
               </div>
             );
          })}
        </div>
      </div>
      
    </div>
  );
}