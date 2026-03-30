import { useState, useEffect } from 'react';
import { 
  ArrowRight, ChevronLeft, ChevronRight, Building, CheckCircle2, Building2, Users,
  X, Calendar as CalendarIcon, Clock, User, Mail, Phone, Info, Tag, CalendarCheck, AlertTriangle 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp, API_BASE, mapBooking } from '@/lib/app-context';
import { format, isSameDay, isAfter, isBefore, parseISO } from 'date-fns';
import { EthDateTime } from 'ethiopian-calendar-date-converter';
import { ETH_MONTHS } from '@/components/ui/ethiopian-calendar';
import moaLogo from '@/assets/moa-logo.png';
import heroImage from '@/assets/landing page image.jpg';
import { Booking } from '@/lib/types';

// Helper to display Gregorian date strings (YYYY-MM-DD) as Ethiopian dates
const getEthDateString = (gregStr: string) => {
  if (!gregStr) return '';
  try {
    const [y, m, d] = gregStr.split('-').map(Number);
    // Use noon to avoid timezone slippage
    const gDate = new Date(y, m - 1, d, 12, 0, 0); 
    const ethDate = EthDateTime.fromEuropeanDate(gDate);
    return `${ETH_MONTHS[ethDate.month - 1]} ${ethDate.date}, ${ethDate.year}`;
  } catch {
    return gregStr;
  }
};

// Simple helper for full Ethiopian date (e.g. "Meskerem 1")
const getFullEthDate = (gregStr: string) => {
  if (!gregStr) return '';
  try {
    const [y, m, d] = gregStr.split('-').map(Number);
    const gDate = new Date(y, m - 1, d, 12, 0, 0); 
    const ethDate = EthDateTime.fromEuropeanDate(gDate);
    return `${ETH_MONTHS[ethDate.month - 1]} ${ethDate.date}`;
  } catch {
    return gregStr;
  }
};

// Helper: 24h to strictly Ethiopian Local Time (6 hours difference)
const formatEthTime = (timeStr: string) => {
  if (!timeStr) return '';
  try {
    const [hStr, m] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    
    // Ethiopian Local Time
    // 6 AM is 12:00, 7 AM is 1:00, etc.
    let ethHr = h >= 6 ? h - 6 : h + 6;
    if (ethHr > 12) ethHr -= 12;
    if (ethHr === 0) ethHr = 12;
    
    return `${ethHr}:${m}`;
  } catch {
    return timeStr;
  }
};

// Abstract images for different venue types
const getVenueImage = (type: string) => {
  const images: Record<string, string> = {
    'Cinema': 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&q=80&w=800',
    'Theatre/Auditorium': 'https://images.unsplash.com/photo-1507676184212-d0330a15183c?auto=format&fit=crop&q=80&w=800',
    'Meeting': 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800',
    'Boardroom': 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=800',
    'Lounge': 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&q=80&w=800',
  };
  return images[type] || `https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=800`;
};

interface EventDetailsModalProps {
  booking: Booking;
  venueName?: string;
  onClose: () => void;
}

function EventDetailsModal({ booking, venueName, onClose }: EventDetailsModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-slate-100 flex flex-col">
        <div className="relative h-32 shrink-0 bg-gradient-to-r from-emerald-600 to-emerald-800 p-8 flex items-end">
           <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all">
             <X size={20} />
           </button>
           <h2 className="text-2xl font-black text-white uppercase tracking-tight truncate">{booking.eventTitle}</h2>
        </div>
        <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ethiopian Date</p>
                 <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <CalendarIcon size={14} className="text-emerald-600" />
                    <span className="text-sm">{getEthDateString(booking.startDate)}</span>
                 </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Time</p>
                 <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <Clock size={14} className="text-emerald-600" />
                    <span className="text-sm">{formatEthTime(booking.startTime)} - {formatEthTime(booking.endTime)} (Local-Time)</span>
                 </div>
              </div>
           </div>
           
           <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 flex items-start gap-4">
              <Building2 size={20} className="text-emerald-600 shrink-0 mt-1" />
              <div>
                 <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Facility Name</p>
                 <p className="text-base font-black text-slate-900 leading-tight uppercase">{venueName}</p>
              </div>
           </div>

           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Event Summary</p>
              <p className="text-sm font-medium text-slate-600 leading-relaxed bg-slate-50 p-5 rounded-2xl italic border border-slate-100">
                 "{booking.eventDescription || 'No detailed description provided for this session.'}"
              </p>
           </div>
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
           <button onClick={onClose} className="px-10 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-100 transition-all uppercase tracking-widest">
             Close Briefing
           </button>
        </div>
      </div>
    </div>
  );
}

interface ScheduleCarouselProps {
  bookings: Booking[];
  onSelect: (b: Booking) => void;
}

function ScheduleCarousel({ bookings, onSelect }: ScheduleCarouselProps) {
  const [index, setIndex] = useState(0);
  const itemsPerPage = 1;
  const totalPages = Math.ceil(bookings.length / itemsPerPage);
  
  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((prev) => (prev + 1) % totalPages);
  };
  
  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((prev) => (prev - 1 + totalPages) % totalPages);
  };

  useEffect(() => {
    if (totalPages <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % totalPages);
    }, 5000);
    return () => clearInterval(timer);
  }, [totalPages]);

  const pages = [];
  for (let i = 0; i < totalPages; i++) {
    pages.push(bookings.slice(i * itemsPerPage, (i + 1) * itemsPerPage));
  }

  return (
    <div className="relative group/carousel overflow-hidden">
      <div 
        className="flex transition-transform duration-700 ease-out" 
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {pages.map((page, pIdx) => (
          <div key={pIdx} className="w-full shrink-0 space-y-2 px-0.5">
            {page.map((b) => (
              <button 
                key={b.id} 
                onClick={() => onSelect(b)}
                className="w-full flex items-center justify-between bg-slate-50/50 px-3 py-2.5 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all active:scale-[0.98] group/item"
              >
                <span className="text-xs font-bold text-slate-700 group-hover/item:text-emerald-700">{getFullEthDate(b.startDate)}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight group-hover/item:text-emerald-600">{formatEthTime(b.startTime)} - {formatEthTime(b.endTime)} (Local-Time)</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 px-1 relative z-10">
           <div className="flex gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setIndex(i); }}
                  className={`h-1.5 rounded-full transition-all ${i === index ? 'bg-emerald-500 w-4' : 'bg-slate-200 w-1.5'}`}
                />
              ))}
           </div>
           <div className="flex gap-2">
              <button onClick={prev} className="p-1 rounded-lg bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600 transition-colors shadow-sm">
                <ChevronLeft size={14} />
              </button>
              <button onClick={next} className="p-1 rounded-lg bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600 transition-colors shadow-sm">
                <ChevronRight size={14} />
              </button>
           </div>
        </div>
      )}
      
      {bookings.length > 3 && totalPages === 1 && (
         <p className="text-[10px] font-bold text-slate-400 text-center mt-2 uppercase tracking-widest">End of schedule</p>
      )}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { venues, token } = useApp();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);

  useEffect(() => {
    const fetchPublicBookings = async () => {
      try {
        const res = await fetch(`${API_BASE}/bookings/?public=true`);
        const data = await res.json();
        setBookings((data.results || data).map(mapBooking));
      } catch (error) {
        console.error('Failed to fetch public bookings:', error);
      }
    };
    fetchPublicBookings();
  }, []);

  const ACTIVE_STATUSES = ['confirmed', 'approved', 'reserved', 'override'];

  const getVenueStatus = (venueId: string) => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const activeBookings = bookings.filter(b => b.venueId === venueId && ACTIVE_STATUSES.includes(b.status));
    
    for (const b of activeBookings) {
      let todayStartTime: string | null = null;
      let todayEndTime: string | null = null;
      
      // Check daily schedules first for multi-day bookings
      if (b.dailySchedules && b.dailySchedules.length > 0) {
        const ds = b.dailySchedules.find(d => d.date === todayStr);
        if (ds) {
          todayStartTime = ds.allDay ? '00:00' : (ds.startTime || b.startTime);
          todayEndTime = ds.allDay ? '23:59' : (ds.endTime || b.endTime);
        }
      } else if (b.startDate <= todayStr && b.endDate >= todayStr) {
        // Fallback: check if today falls within the booking's date range
        todayStartTime = b.startTime;
        todayEndTime = b.endTime;
      }
      
      if (todayStartTime && todayEndTime) {
        const startTime = parseISO(`${todayStr}T${todayStartTime}`);
        const endTime = parseISO(`${todayStr}T${todayEndTime}`);
        
        if (isAfter(now, startTime) && isBefore(now, endTime)) {
          return { 
            label: `Occupied until ${todayEndTime}`, 
            color: 'bg-rose-500', 
            textColor: 'text-rose-600',
            bgColor: 'bg-rose-50',
            booking: b
          };
        }
        if (isBefore(now, startTime)) {
          return { 
            label: `Booked today at ${todayStartTime}`, 
            color: 'bg-emerald-500',
            textColor: 'text-emerald-700',
            bgColor: 'bg-emerald-50',
            booking: b
          };
        }
      }
    }

    return { 
      label: 'Available Today', 
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      booking: null
    };
  };

  const getUpcomingBookings = (venueId: string) => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const nowTimeStr = format(now, 'HH:mm');
    
    const entries: Booking[] = [];
    const activeBookings = bookings.filter(b => b.venueId === venueId && ACTIVE_STATUSES.includes(b.status));
    
    for (const b of activeBookings) {
      if (b.dailySchedules && b.dailySchedules.length > 0) {
        // Expand each daily schedule into a separate entry with correct date & times
        for (const ds of b.dailySchedules) {
          const schedDate = ds.date;
          const sTime = ds.allDay ? '00:00' : (ds.startTime || b.startTime);
          const eTime = ds.allDay ? '23:59' : (ds.endTime || b.endTime);
          
          // Include if it's a future date, or today but hasn't ended yet
          if (schedDate > todayStr || (schedDate === todayStr && eTime > nowTimeStr)) {
            entries.push({
              ...b,
              startDate: schedDate,
              endDate: schedDate,
              startTime: sTime,
              endTime: eTime,
            });
          }
        }
      } else {
        // Single-day or legacy booking without daily schedules
        if (b.endDate > todayStr || (b.endDate === todayStr && b.endTime > nowTimeStr)) {
          entries.push(b);
        }
      }
    }
    
    return entries.sort((a, b) => 
      a.startDate.localeCompare(b.startDate) || a.startTime.localeCompare(b.startTime)
    );
  };

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden selection:bg-[#268053] selection:text-white">
      
      {activeBooking && (
        <EventDetailsModal 
          booking={activeBooking} 
          venueName={venues.find(v => v.id === activeBooking.venueId)?.name}
          onClose={() => setActiveBooking(null)} 
        />
      )}

      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-slate-100 px-6 py-4 lg:px-12 xl:px-20 w-full sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <img src={moaLogo} alt="MoA Logo" className="w-full h-full object-contain" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-extrabold text-[#111827] leading-none mb-1 tracking-tight">MoA Conference Center</h1>
                <p className="text-[10px] font-bold text-slate-400 leading-none uppercase tracking-tight">Booking Management System</p>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-10">
            <a href="#/venues" onClick={(e) => { e.preventDefault(); navigate('/app#/venues'); }} className="text-[11px] font-black text-[#475569] hover:text-[#268053] transition-colors uppercase tracking-tight whitespace-nowrap">Venues</a>
            <a href="/book" onClick={(e) => { e.preventDefault(); navigate('/book'); }} className="text-[11px] font-black text-[#475569] hover:text-[#268053] transition-colors uppercase tracking-tight whitespace-nowrap">Book a Venue</a>
            <a href="/track" onClick={(e) => { e.preventDefault(); navigate('/track'); }} className="text-[11px] font-black text-[#475569] hover:text-[#268053] transition-colors uppercase tracking-tight whitespace-nowrap">Track Status</a>
            <a href="#/my-bookings" onClick={(e) => { e.preventDefault(); if (token) navigate('/app#/my-bookings'); else navigate('/login'); }} className="text-[11px] font-black text-[#475569] hover:text-[#268053] transition-colors uppercase tracking-tight whitespace-nowrap">My Bookings</a>
            <a href="#/calendar" onClick={(e) => { e.preventDefault(); navigate('/app#/calendar'); }} className="text-[11px] font-black text-[#475569] hover:text-[#268053] transition-colors uppercase tracking-tight whitespace-nowrap">Calendar</a>
            <a href="#/manage-bookings" onClick={(e) => { e.preventDefault(); if (token) navigate('/app#/manage-bookings'); else navigate('/login'); }} className="text-[11px] font-black text-[#475569] hover:text-[#268053] transition-colors uppercase tracking-tight whitespace-nowrap">Admin Panel</a>

          </div>

          <div className="flex items-center gap-4 h-full">
            {token ? (
              <button onClick={() => navigate('/app')} className="px-6 py-2.5 text-xs font-black border border-[#268053] text-[#268053] rounded-full hover:bg-emerald-50 transition-all leading-none h-fit">
                Dashboard
              </button>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="px-6 py-2.5 text-xs font-black border border-[#268053] text-[#268053] rounded-full hover:bg-emerald-50 transition-all leading-none h-fit">
                  Log In
                </button>
                <button onClick={() => navigate('/register')} className="px-6 py-2.5 text-xs font-black bg-[#268053] text-white rounded-full hover:bg-[#1b4332] transition-all shadow-md leading-none h-fit">
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section className="relative w-full overflow-visible min-h-[550px] pb-24 flex flex-col items-center justify-center text-center">
          <div className="absolute inset-0 z-0">
            <img src={heroImage} alt="Professional Conference Hall" className="w-full h-full object-cover grayscale-[0.2]" />
            <div className="absolute inset-0 bg-[#268053]/70 mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#1b4332]/50 via-[#268053]/20 to-[#0f172a]/80" />
          </div>
          
          <div className="relative z-10 max-w-5xl px-6 pt-24 pb-32 flex flex-col items-center">
            <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-white/10 backdrop-blur-lg border border-white/30 rounded-full text-white text-xs font-black uppercase tracking-[0.2em] mb-8 shadow-2xl">
               <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(52,211,153,1)]"></span> Official Venue Booking Portal
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-extrabold text-white leading-[1.15] tracking-tight mb-8 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              Ministry of Agriculture<br />Conference Center
            </h1>
            <p className="text-base md:text-lg text-white/95 font-medium mb-12 max-max-w-2xl leading-relaxed drop-shadow-lg opacity-90 text-center">
              Reserve world-class conference facilities for your official events, ministerial meetings, and institutional gatherings.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <button onClick={() => navigate('/book')} className="w-full sm:w-auto bg-[#da9131] hover:bg-[#c2812c] text-white font-extrabold px-12 py-5 rounded-xl shadow-[0_20px_40px_-15px_rgba(218,145,49,0.5)] transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 text-lg">
                Request a Booking <ArrowRight className="w-6 h-6" />
              </button>
              <button onClick={() => navigate('/app#/calendar')} className="w-full sm:w-auto bg-white/5 backdrop-blur-md border border-white/40 text-white hover:bg-white/10 font-extrabold px-12 py-5 rounded-xl shadow-xl transition-all text-lg">
                View Availability
              </button>
            </div>
          </div>

          <div className="absolute bottom-0 translate-y-1/2 z-20 w-full max-w-5xl px-6 lg:px-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 p-8 rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col items-center text-center group hover:bg-[#268053] transition-all duration-500 border-b-4 border-emerald-500/50">
              <span className="text-white text-4xl font-black mb-2">10</span>
              <span className="text-emerald-100/60 text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-white transition-colors">Venues Available</span>
            </div>
            <div className="bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 p-8 rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col items-center text-center group hover:bg-[#268053] transition-all duration-500 border-b-4 border-emerald-500/50">
              <span className="text-white text-4xl font-black mb-2">600+</span>
              <span className="text-emerald-100/60 text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-white transition-colors">Max Capacity</span>
            </div>
            <div className="bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 p-8 rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col items-center text-center group hover:bg-[#268053] transition-all duration-500 border-b-4 border-emerald-500/50">
              <span className="text-white text-4xl font-black mb-3">23</span>
              <span className="text-emerald-100/60 text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-white transition-colors">Available Services</span>
            </div>
          </div>
        </section>

        <div className="h-24 sm:h-20 bg-white" />

        <section className="bg-[#fcfdfd] py-20 lg:py-24 w-full border-t border-slate-100">
          <div className="max-w-[1600px] mx-auto px-6 lg:px-12 xl:px-20">
             <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
               <div className="max-w-3xl">
                 <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-[#268053] text-[10px] font-black uppercase tracking-widest mb-6">
                    <Building2 className="w-3.5 h-3.5" /> Premium Venues
                 </div>
                 <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-extrabold text-[#111827] tracking-tight leading-tight">
                    Discover Our Premium <br />
                    Conference Halls
                 </h2>
               </div>
               <div className="md:text-right">
                 <p className="text-slate-500 font-medium text-lg max-w-md md:ml-auto leading-relaxed">
                   Tailored environments designed for high-impact meetings, international summits, and strategic state workshops.
                 </p>
               </div>
             </div>

             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
               {venues.map((venue, i) => {
                 const isOutOfOrder = venue.status === 'out_of_order';
                 
                 return (
                   <div key={venue.id} className={`group bg-white rounded-[2rem] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col transition-all duration-500 ease-out relative ${isOutOfOrder ? 'opacity-80 grayscale-[0.5]' : 'hover:shadow-[0_40px_80px_rgba(0,0,0,0.08)] hover:-translate-y-2'}`} style={{ animation: `fade-in-up 0.5s cubic-bezier(0.16,1,0.3,1) ${100 * i}ms both` }}>
                     <div className="relative aspect-[16/10] rounded-[1.5rem] overflow-hidden mb-8 bg-slate-50">
                        <img src={venue.image || getVenueImage(venue.type)} alt={venue.name} className={`w-full h-full object-cover transition-transform duration-1000 ease-out ${isOutOfOrder ? '' : 'group-hover:scale-110 grayscale-[0.1] group-hover:grayscale-0'}`} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        <div className="absolute top-4 right-4 bg-white/40 backdrop-blur-xl border border-white/40 px-4 py-2 rounded-2xl text-xs font-black text-white shadow-xl z-10">
                          {venue.price || '0.00'} ETB/hr
                        </div>

                        {/* OUT OF ORDER BADGE OVERLAY */}
                        {isOutOfOrder && (
                          <div className="absolute inset-0 bg-red-900/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                            <AlertTriangle className="w-12 h-12 text-white mb-2" />
                            <div className="bg-red-600 text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-2xl border-2 border-red-500/50">
                              Currently Out of Order
                            </div>
                          </div>
                        )}

                        {!isOutOfOrder && (
                          <div className="absolute top-4 left-4 z-10">
                            {(() => {
                              const status = getVenueStatus(venue.id);
                              return (
                                <button 
                                  onClick={() => status.booking && setActiveBooking(status.booking)}
                                  className={`flex items-center gap-2 ${status.bgColor} backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full shadow-lg transition-all ${status.booking ? 'hover:scale-105 active:scale-95 cursor-pointer' : 'cursor-default'}`}
                                >
                                  <span className={`w-2 h-2 rounded-full ${status.color} animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.5)]`}></span>
                                  <span className={`text-[10px] font-black uppercase tracking-wider ${status.textColor}`}>{status.label}</span>
                                </button>
                              );
                            })()}
                          </div>
                        )}

                        <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-[10px] font-bold uppercase tracking-wider z-10">
                          <Users className="w-3.5 h-3.5" /> {venue.capacity} Max
                        </div>
                     </div>

                     <div className="px-3 flex-1 flex flex-col relative z-30">
                       <div className="flex items-center justify-between mb-3">
                         <h3 className={`text-2xl font-bold tracking-tight transition-colors ${isOutOfOrder ? 'text-slate-400 line-through' : 'text-[#111827] group-hover:text-[#268053]'}`}>{venue.name}</h3>
                         <div className={`p-2 rounded-xl ${isOutOfOrder ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-[#268053]'}`}>
                           <Building className="w-4 h-4" />
                         </div>
                       </div>
                       <div className="flex items-center gap-2 mb-8">
                         <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none">
                           {venue.type}
                         </span>
                       </div>
                        <div className="mt-auto pt-6 border-t border-slate-50">
                          <div className="flex flex-col mb-6">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#268053] mb-3 leading-none">Upcoming Schedule</span>
                            
                            {(() => {
                                if (isOutOfOrder) return <p className="text-xs font-medium text-slate-400 italic">Schedule unavailable</p>;
                                
                                const upcoming = getUpcomingBookings(venue.id);
                                if (upcoming.length === 0) {
                                  return <p className="text-xs font-medium text-slate-400 italic">No future bookings scheduled</p>;
                                }
                                return (
                                  <ScheduleCarousel 
                                    bookings={upcoming} 
                                    onSelect={(b) => setActiveBooking(b)} 
                                  />
                                );
                            })()}

                          </div>
                          <div className="flex flex-col mb-8">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#268053] mb-2">Ideal Setting For</span>
                            <p className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                              {venue.bestFor}
                            </p>
                          </div>
                          
                          {/* Disable the booking button if out of order */}
                          {isOutOfOrder ? (
                            <button disabled className="w-full py-5 text-sm font-black bg-slate-200 text-slate-400 rounded-2xl shadow-sm flex items-center justify-center gap-2 cursor-not-allowed">
                               Venue Unavailable
                            </button>
                          ) : (
                            <button onClick={() => { if (token) navigate(`/app#/new-booking?venueId=${venue.id}`); else navigate('/login'); }} className="w-full py-5 text-sm font-black bg-[#111827] text-white hover:bg-[#268053] transition-all duration-300 rounded-2xl shadow-xl flex items-center justify-center gap-2 group/btn">
                               Book This Venue <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                          )}
                        </div>
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>
        </section>

        <section className="py-24 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 xl:px-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-serif font-black text-[#111827] mb-4">How It Works</h2>
              <p className="text-slate-500 font-medium">Follow these four simple steps to secure your official ministerial event venue.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
              {[
                { step: '01', title: 'Register Account', desc: 'Create your official Event Organizer profile to access the booking portal.' },
                { step: '02', title: 'Select Venue', desc: 'Browse available halls and check real-time availability for your preferred dates.' },
                { step: '03', title: 'Submit Request', desc: 'Fill out the event details and attach your official request letter for approval.' },
                { step: '04', title: 'Confirmation', desc: 'Receive instant updates as your booking is reviewed and confirmed by management.' },
              ].map((item, i) => (
                <div key={i} className="relative group p-8 rounded-[2rem] bg-slate-50 border border-slate-100 hover:bg-[#268053] hover:border-[#268053] transition-all duration-500">
                   <span className="text-4xl font-black text-emerald-100/50 group-hover:text-white/20 transition-colors absolute top-6 right-8">{item.step}</span>
                   <h4 className="text-xl font-bold text-[#111827] group-hover:text-white mb-3 mt-4">{item.title}</h4>
                   <p className="text-slate-500 group-hover:text-white/80 text-sm font-medium leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="py-24 bg-[#f8fafc] border-y border-slate-200">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6">
                Help Center
              </div>
              <h2 className="text-3xl md:text-4xl font-serif font-black text-[#111827] mb-4">Frequently Asked Questions</h2>
            </div>
            <div className="space-y-4">
              {[
                { q: "Who can book a venue?", a: "The portal is primarily for Ministry of Agriculture events and official partners. External organizations must be registered Event Organizers and have an official invitation or partnership letter." },
                { q: "What documents are required for booking?", a: "An official request letter signed by your organization's head is required. You can upload this directly in the booking form as a PDF or image." },
                { q: "Can I cancel a booking?", a: "Yes, you can cancel your request through 'My Bookings'. However, confirmed or completed bookings require administrative intervention for cancellation." },
                { q: "What technical support is provided?", a: "All venues include high-speed Wi-Fi and basic AV equipment. Advanced ICT support and catering can be requested during the booking process." },
                { q: "When will I receive confirmation?", a: "Management reviews requests within 24-48 business hours. You will receive an email notification as soon as your status is updated." }
              ].map((faq, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-all">
                  <h4 className="text-lg font-bold text-[#111827] mb-4 flex gap-4">
                    <span className="text-emerald-600">Q.</span> {faq.q}
                  </h4>
                  <p className="text-slate-600 text-sm font-medium leading-relaxed pl-8 border-l border-emerald-100">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#0f172a] text-white pt-20 pb-12 px-6 lg:px-12 xl:px-20 mt-0">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 pb-20 border-b border-white/10 mb-20">
            <div className="md:col-span-1">
              <h4 className="text-emerald-400 font-extrabold text-[10px] uppercase tracking-[0.2em] mb-6">Main Headquarters</h4>
              <p className="text-slate-300 text-sm font-medium leading-relaxed">Ministry of Agriculture Area<br />Addis Ababa, Ethiopia<br />P.O. Box 62347</p>
            </div>
            <div>
              <h4 className="text-emerald-400 font-extrabold text-[10px] uppercase tracking-[0.2em] mb-6">Office Hours</h4>
              <p className="text-slate-300 text-sm font-medium leading-relaxed">Mon - Fri: 8:30 AM - 5:30 PM<br />Sat: 9:00 AM - 12:30 PM<br />Sun: Closed</p>
            </div>
            <div>
              <h4 className="text-emerald-400 font-extrabold text-[10px] uppercase tracking-[0.2em] mb-6">ICT Support</h4>
              <p className="text-slate-300 text-sm font-medium leading-relaxed">Email: support@moa.gov.et<br />Phone: +251 11 123 4567<br />Internal: Ext. 405</p>
            </div>
            <div>
              <h4 className="text-emerald-400 font-extrabold text-[10px] uppercase tracking-[0.2em] mb-6">Facility Rental</h4>
              <p className="text-slate-300 text-sm font-medium leading-relaxed">Email: events@moa.gov.et<br />Phone: +251 11 123 8899</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between gap-12 pb-12">
             <div className="max-w-sm">
               <div className="flex items-center gap-4 mb-6">
                 <div className="w-12 h-12 flex items-center justify-center shrink-0">
                   <img src={moaLogo} alt="MoA Logo" className="w-full h-full object-contain grayscale brightness-200" />
                 </div>
                 <h3 className="text-xl font-bold tracking-tight text-white leading-none">MoA Conference Center</h3>
               </div>
               <p className="text-slate-400 text-sm leading-relaxed font-medium">Providing world-class infrastructure for the Ministry of Agriculture of Ethiopia. Digital transformation powered by UNOPS.</p>
             </div>
             <div className="flex items-center gap-6">
                <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-bold">Privacy Policy</a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-bold">Terms of Service</a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-bold">Accessibility</a>
             </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">© {new Date().getFullYear()} MoA Ethiopia. All rights reserved.</p>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Status: Operational</span>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
}