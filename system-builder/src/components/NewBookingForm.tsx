import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/lib/app-context';
import { DailySchedule } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Users, CheckCircle2, Paperclip, Eraser, Sparkles, Receipt, Building2, ShieldAlert, MonitorSmartphone, Coffee, AlertTriangle, Lock } from 'lucide-react';
import { EthiopianCalendar, ETH_MONTHS } from '@/components/ui/ethiopian-calendar';
import { EthDateTime } from 'ethiopian-calendar-date-converter';

const steps = [
  { num: 1, label: 'DETAILS' },
  { num: 2, label: 'VENUE' },
  { num: 3, label: 'SERVICES' },
  { num: 4, label: 'FINISH' },
];

const timeToMinutes = (timeStr: string | undefined) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export default function NewBookingForm({ onComplete, hideHero = false }: { onComplete: () => void, hideHero?: boolean }) {
  const { bookings = [], venues = [], addBooking, user, technicalServices = [], supportServices = [], token } = useApp();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [submittedBookingId, setSubmittedBookingId] = useState<string | null>(null);
  
  // --- NEW: Read venueId from the URL on initial load ---
  const initialVenueId = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
      return params.get('venueId') || hashParams.get('venueId') || '';
    } catch {
      return '';
    }
  }, []);

  const [form, setForm] = useState({
    venueId: initialVenueId,
    eventTitle: '', eventDescription: '', 
    organizerName: user?.name || '', 
    organizerOrganization: '', 
    organizerEmail: user?.email || '', 
    organizerPhone: user?.phone || '',
    startDate: '', endDate: '', participantCount: '', 
    technicalServices: [] as string[], supportServices: [] as string[],
    dailySchedules: [] as DailySchedule[], letterAttachment: null as File | null,
  });

  useEffect(() => {
    if (user?.name && !form.organizerName) {
      setForm(prev => ({
        ...prev,
        organizerName: user.name,
        organizerEmail: user.email || '',
        organizerPhone: user.phone || ''
      }));
    }
  }, [user]);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getEthDateString = (gregStr: string) => {
    if (!gregStr) return '';
    try {
      const [y, m, d] = gregStr.split('-').map(Number);
      const gDate = new Date(y, m - 1, d, 12, 0, 0); 
      const ethDate = EthDateTime.fromEuropeanDate(gDate);
      return `${ETH_MONTHS[ethDate.month - 1]} ${ethDate.date}, ${ethDate.year}`;
    } catch { return gregStr; }
  };

  const selectedVenue = venues?.find(v => v.id?.toString() === form.venueId?.toString());

  const isServiceIncluded = (type: 'technicalServices' | 'supportServices', serviceId: string) => {
    if (!selectedVenue || type === 'supportServices') return false;
    const includedIds = (selectedVenue.technicalServices || selectedVenue.technical_services || selectedVenue.includedServices || selectedVenue.included_services || []);
    return includedIds.map(String).includes(String(serviceId));
  };

  const existingSchedules = useMemo(() => {
    if (!form.venueId) return [];
    const vBookings = bookings?.filter(b => 
      b.venueId?.toString() === form.venueId?.toString() && 
      ['reserved', 'approved', 'confirmed', 'override', 'completed'].includes(b.status?.toLowerCase() || '')
    );
    
    const schedules: { date: string, start: string, end: string, isHard: boolean }[] = [];
    vBookings?.forEach(b => {
      const isHard = ['confirmed', 'override', 'completed'].includes(b.status?.toLowerCase() || '');
      
      if (b.dailySchedules && b.dailySchedules.length > 0) {
        b.dailySchedules.forEach((ds: any) => schedules.push({ date: ds.date, start: ds.startTime, end: ds.endTime, isHard }));
      } else if (b.startDate && b.endDate) {
        try {
          const s = parseISO(b.startDate), e = parseISO(b.endDate);
          if (s <= e) eachDayOfInterval({start: s, end: e}).forEach(d => {
            schedules.push({ date: format(d, 'yyyy-MM-dd'), start: b.startTime || '01:00', end: b.endTime || '12:00', isHard });
          });
        } catch {}
      }
    });
    return schedules;
  }, [bookings, form.venueId]);

  const hardBookedDates = useMemo(() => existingSchedules.filter(s => s.isHard).map(s => parseISO(s.date)), [existingSchedules]);
  const softBookedDates = useMemo(() => existingSchedules.filter(s => !s.isHard).map(s => parseISO(s.date)), [existingSchedules]);

  const dailyConflicts = useMemo(() => {
    const issues: { date: string, type: 'hard_overlap' | 'soft_overlap' | 'cleaning', msg: string }[] = [];
    
    form.dailySchedules?.forEach(newSched => {
      const dayExisting = existingSchedules.filter(ex => ex.date === newSched.date);
      
      const nStart = timeToMinutes(newSched.startTime || '01:00');
      const nEnd = timeToMinutes(newSched.endTime || '12:00');
      
      let hasHard = false;
      let hasSoft = false;
      let cleanMsg = '';

      dayExisting.forEach(ex => {
        const eStart = timeToMinutes(ex.start);
        const eEnd = timeToMinutes(ex.end);
        
        if (nStart < eEnd && nEnd > eStart) {
          if (ex.isHard) hasHard = true;
          else hasSoft = true;
        } else {
          const gapAfter = nStart - eEnd;
          const gapBefore = eStart - nEnd;
          if (gapAfter >= 0 && gapAfter < 60) cleanMsg = `1-Hour Cleaning Gap required after ${ex.end}`;
          else if (gapBefore >= 0 && gapBefore < 60) cleanMsg = `1-Hour Cleaning Gap required before ${ex.start}`;
        }
      });

      if (hasHard || (newSched.allDay && dayExisting.some(ex => ex.isHard))) {
         issues.push({ date: newSched.date, type: 'hard_overlap', msg: 'Unavailable (Already Confirmed/Paid)' });
      } else if (hasSoft || (newSched.allDay && dayExisting.some(ex => !ex.isHard))) {
         issues.push({ date: newSched.date, type: 'soft_overlap', msg: 'Unpaid Pending Request Exists (First to pay secures slot)' });
      } else if (cleanMsg) {
         issues.push({ date: newSched.date, type: 'cleaning', msg: cleanMsg });
      }
    });
    return issues;
  }, [form.dailySchedules, existingSchedules]);

  useEffect(() => {
    if (form.startDate && form.endDate && form.endDate >= form.startDate) {
      const dates = [];
      const [sy, sm, sd] = form.startDate.split('-').map(Number);
      const [ey, em, ed] = form.endDate.split('-').map(Number);
      let cur = new Date(sy, sm - 1, sd, 12, 0, 0); 
      const end = new Date(ey, em - 1, ed, 12, 0, 0); 
      while (cur <= end && dates.length < 30) {
        dates.push(format(cur, 'yyyy-MM-dd'));
        cur.setDate(cur.getDate() + 1);
      }
      setForm(prev => ({
        ...prev,
        dailySchedules: dates.map(d => prev.dailySchedules?.find(s => s.date === d) || { date: d, startTime: '01:00', endTime: '12:00', allDay: false })
      }));
    }
  }, [form.startDate, form.endDate]);

  const updateSchedule = (index: number, field: keyof DailySchedule, value: string | boolean) => {
    setForm(prev => {
      const news = [...prev.dailySchedules];
      news[index] = { ...news[index], [field]: value };
      return { ...prev, dailySchedules: news };
    });
  };

  const vPrice = parseFloat(selectedVenue?.price || selectedVenue?.daily_rate || selectedVenue?.cost || 0);
  const venueTotal = vPrice * (form.dailySchedules?.length || 1);
  
  const techFee = form.technicalServices.reduce((sum, id) => {
    const s = technicalServices.find(x => x.id?.toString() === id?.toString());
    return s ? sum + parseFloat(s.price || 0) : sum;
  }, 0);
  const suppFee = form.supportServices.reduce((sum, id) => {
    const s = supportServices.find(x => x.id?.toString() === id?.toString());
    return s ? sum + parseFloat(s.price || 0) : sum;
  }, 0);
  const serviceFee = techFee + suppFee;

  const validateStep = (step: number) => {
    const errs: Record<string, string> = {};
    if (step === 1) {
      if (!form.organizerName?.trim()) errs.organizerName = 'Required';
      if (!form.eventTitle?.trim()) errs.eventTitle = 'Required';
      if (!form.organizerPhone?.trim() || form.organizerPhone.trim() === '+251') errs.organizerPhone = 'Required';
    } else if (step === 2) {
      if (!form.venueId) errs.venueId = 'Select a venue';
      if (!form.startDate) errs.startDate = 'Required';
      if (selectedVenue && parseInt(form.participantCount) > selectedVenue.capacity) {
        errs.participantCount = `Capacity exceeded (Max: ${selectedVenue.capacity})`;
      }
      if (dailyConflicts.some(c => c.type === 'hard_overlap' || c.type === 'cleaning')) {
        errs.rangeConflict = 'Please resolve hard time conflicts below.';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const generateHourOptions = () => Array.from({ length: 13 }, (_, i) => {
    const h = (i).toString().padStart(2, '0') + ':00'; 
    return <option key={h} value={h}>{h}</option>;
  });

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const finalTotal = venueTotal + serviceFee;

      const payload = {
        ...form, 
        status: 'approved',
        name: form.organizerName,
        full_name: form.organizerName,
        organizer_name: form.organizerName,
        organizerName: form.organizerName,
        email: form.organizerEmail,
        contact_email: form.organizerEmail,
        organizer_email: form.organizerEmail,
        organizerEmail: form.organizerEmail,
        phone: form.organizerPhone,
        contact_phone: form.organizerPhone,
        organizer_phone: form.organizerPhone,
        organization: form.organizerOrganization,
        organizer_organization: form.organizerOrganization,
        totalPrice: finalTotal,
        total_price: finalTotal,
        venueId: form.venueId,
        venue: form.venueId,
        eventTitle: form.eventTitle,
        event_title: form.eventTitle,
        eventDescription: form.eventDescription,
        event_description: form.eventDescription,
        startDate: form.startDate,
        start_date: form.startDate,
        endDate: form.endDate,
        end_date: form.endDate,
        participantCount: parseInt(form.participantCount) || 0,
        participant_count: parseInt(form.participantCount) || 0,
        technicalServices: form.technicalServices,
        technical_services: form.technicalServices,
        supportServices: form.supportServices,
        support_services: form.supportServices,
      };

      const data = await addBooking(payload);
      setSubmittedBookingId(data.id || 'SUCCESS');
    } catch { 
      toast.error('Submit failed. Please try again.'); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleService = (type: 'technicalServices' | 'supportServices', id: string) => {
    const strId = id.toString();
    setForm(prev => ({ ...prev, [type]: prev[type].includes(strId) ? prev[type].filter(s => s !== strId) : [...prev[type], strId] }));
  };

  const inputClass = (f: string) => `w-full text-sm border-2 rounded-xl px-4 py-3 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all focus:ring-4 focus:ring-[#268053]/10 outline-none ${errors[f] ? 'border-red-300 focus:border-red-400 bg-red-50/20' : 'border-slate-100 focus:border-[#268053]'}`;

  const isPaxExceeded = selectedVenue && parseInt(form.participantCount) > selectedVenue.capacity;

  if (submittedBookingId) {
    const isGuest = !token;

    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 text-center">
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 md:p-12 border border-slate-100 max-w-lg w-full relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#1b5e3a] to-[#268053]" />
           <CheckCircle2 className="w-24 h-24 text-emerald-500 mx-auto mb-6 animate-in zoom-in duration-500 drop-shadow-sm" />
           <h2 className="text-4xl font-black text-slate-800 mb-2 uppercase tracking-tight">Request Submitted!</h2>
           
           <p className="text-slate-500 font-bold text-sm mb-6 leading-relaxed px-4">
             Your slot is reserved under <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Awaiting Payment</span>.<br/> First to pay secures the venue!
           </p>

           {/* --- NEW: VIP OVERRIDE NOTICE --- */}
           <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 text-left flex gap-3 shadow-inner">
             <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
             <div>
               <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-1">Important Policy Notice</p>
               <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                 As a state facility, high-level Ministerial and VIP events hold supreme priority. Your booking may be subject to overriding or cancellation (with full refund) even after payment is confirmed.
               </p>
             </div>
           </div>

           <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-5 mb-10 shadow-inner">
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Your Tracking Reference</p>
             <p className="text-3xl font-black text-[#268053] tracking-wider select-all cursor-text mb-1">
               MOA-BKG-{submittedBookingId}
             </p>
             {isGuest && (
               <p className="text-[11px] font-bold text-amber-600 mt-3 animate-pulse bg-amber-50 py-1.5 rounded-lg">
                 ⚠️ Please copy and save this ID to track your request.
               </p>
             )}
           </div>

           <Button onClick={onComplete} className="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl transition-all hover:-translate-y-1 hover:scale-[1.02]">
             {isGuest ? 'Track Your Status' : 'Return to Dashboard'}
           </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#f8fafc] ${hideHero ? '' : '-mt-8 -mx-4'}`}>
      {!hideHero && (
        <div className="bg-gradient-to-b from-[#0f241a] to-[#153a29] pt-24 pb-28 text-center px-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
          <CalendarIcon className="w-16 h-16 text-emerald-400 mx-auto mb-6 opacity-80" />
          <h1 className="text-5xl font-black text-white uppercase tracking-tighter drop-shadow-lg">Facility Reservation</h1>
        </div>
      )}
      <div className="max-w-4xl mx-auto px-4 -mt-16 mb-20 relative z-10">
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-12 border border-slate-100/50 backdrop-blur-xl">
          
          <div className="relative flex justify-center items-center gap-4 sm:gap-12 mb-12">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -z-10 rounded-full" />
            {steps.map((s) => (
              <div key={s.num} className="flex flex-col items-center gap-3 bg-white px-2 cursor-pointer" onClick={() => currentStep > s.num && setCurrentStep(s.num)}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-black transition-all duration-300 shadow-sm ${currentStep === s.num ? 'bg-gradient-to-br from-[#268053] to-[#1b5e3a] text-white scale-110 shadow-emerald-500/30' : currentStep > s.num ? 'bg-emerald-50 text-[#268053] border-2 border-emerald-200' : 'bg-slate-50 text-slate-300 border-2 border-slate-100'}`}>{s.num}</div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${currentStep === s.num ? 'text-[#268053]' : currentStep > s.num ? 'text-slate-600' : 'text-slate-300'}`}>{s.label}</span>
              </div>
            ))}
          </div>

          {currentStep === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-black uppercase mb-2 block tracking-widest">Full Name *</label>
                  <input value={form.organizerName} onChange={e => setForm(p => ({ ...p, organizerName: e.target.value }))} className={inputClass('organizerName')} placeholder="e.g. Abebe Kebede" />
                  {errors.organizerName && <p className="text-xs text-red-500 mt-1 font-bold">{errors.organizerName}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium text-black uppercase mb-2 block tracking-widest">Organization *</label>
                  <input value={form.organizerOrganization} onChange={e => setForm(p => ({ ...p, organizerOrganization: e.target.value }))} className={inputClass('organizerOrganization')} placeholder="Organization Name" />
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-black uppercase mb-2 block tracking-widest">Official Email *</label>
                  <input type="email" value={form.organizerEmail} onChange={e => setForm(p => ({ ...p, organizerEmail: e.target.value }))} className={inputClass('organizerEmail')} placeholder="name@domain.com" />
                </div>
                <div>
                  <label className="text-xs font-medium text-black uppercase mb-2 block tracking-widest">Phone Number *</label>
                  <div className="flex">
                    <div className="flex items-center justify-center px-4 bg-slate-100 border-2 border-r-0 border-slate-100 rounded-l-xl text-slate-700 font-bold text-sm">
                      🇪🇹 +251
                    </div>
                    <input 
                      value={form.organizerPhone.startsWith('+251') ? form.organizerPhone.substring(4).trim() : form.organizerPhone} 
                      onChange={e => setForm(p => ({ ...p, organizerPhone: '+251 ' + e.target.value.replace(/^\+251\s*/, '') }))} 
                      className={inputClass('organizerPhone').replace('rounded-xl', 'rounded-r-xl rounded-l-none')} 
                      placeholder="911 23 45 67" 
                    />
                  </div>
                  {errors.organizerPhone && <p className="text-xs text-red-500 mt-1 font-bold">{errors.organizerPhone}</p>}
                </div>
              </div>
              <hr className="border-slate-100" />
              <div>
                <label className="text-xs font-medium text-black uppercase mb-2 block tracking-widest">Event Title *</label>
                <input value={form.eventTitle} onChange={e => setForm(p => ({ ...p, eventTitle: e.target.value }))} className={inputClass('eventTitle')} placeholder="Annual Review Meeting 2026" />
                {errors.eventTitle && <p className="text-xs text-red-500 mt-1 font-bold">{errors.eventTitle}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-black uppercase mb-2 block tracking-widest">Description</label>
                <textarea rows={3} value={form.eventDescription} onChange={e => setForm(p => ({ ...p, eventDescription: e.target.value }))} className={inputClass('eventDescription')} placeholder="Briefly describe the purpose of this booking..." />
              </div>
              <Button onClick={() => validateStep(1) && setCurrentStep(2)} className="w-full h-14 bg-gradient-to-r from-[#1b5e3a] to-[#268053] hover:from-[#15472c] hover:to-[#1b5e3a] text-white rounded-xl font-black tracking-widest uppercase shadow-xl shadow-emerald-900/20 transition-all hover:-translate-y-1">CONTINUE TO VENUE</Button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="grid sm:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                <div>
                  <label className="text-xs font-medium text-black uppercase block mb-2 tracking-widest flex items-center gap-2"><Building2 size={14}/> Venue Selection *</label>
                <select value={form.venueId} onChange={e => setForm(p => ({ ...p, venueId: e.target.value }))} className={inputClass('venueId')}>
                  <option value="">Select a hall...</option>
                  {venues?.map(v => (
                    <option 
                      key={v.id} 
                      value={v.id} 
                      disabled={v.status === 'out_of_order'}
                      className={v.status === 'out_of_order' ? 'text-red-500 font-bold bg-red-50' : ''}
                    >
                      {v.name} (Max: {v.capacity}) {v.status === 'out_of_order' ? ' ❌ [OUT OF ORDER]' : ''}
                    </option>
                  ))}
                </select>
                </div>
                <div>
                  <label className={`text-xs font-medium uppercase block mb-2 tracking-widest flex items-center gap-2 transition-colors ${isPaxExceeded ? 'text-red-500 animate-pulse' : 'text-black'}`}>
                    <Users size={14}/> 
                    Expected Pax * {isPaxExceeded && <span className="text-[9px] bg-red-100 px-2 py-0.5 rounded text-red-700 ml-auto font-bold">Exceeds {selectedVenue?.capacity} limit!</span>}
                  </label>
                  <input type="number" value={form.participantCount} onChange={e => setForm(p => ({ ...p, participantCount: e.target.value }))} className={`${inputClass('participantCount')} ${isPaxExceeded ? 'border-red-400 bg-red-50 text-red-900 ring-4 ring-red-500/20' : ''}`} placeholder="Number of attendees" />
                </div>
              </div>

              <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 flex flex-col md:flex-row gap-8 shadow-sm">
                <div className="bg-slate-50/80 p-4 rounded-2xl flex justify-center border border-slate-100">
                  <EthiopianCalendar 
                    selected={{ from: form.startDate ? parseISO(form.startDate) : undefined, to: form.endDate ? parseISO(form.endDate) : undefined }} 
                    onSelect={(r) => setForm(p => ({ ...p, startDate: r?.from ? format(r.from, 'yyyy-MM-dd') : '', endDate: r?.to ? format(r.to, 'yyyy-MM-dd') : '' }))} 
                    bookedDates={hardBookedDates}
                    pendingDates={softBookedDates}
                  />
                </div>
                <div className="flex-1 space-y-4 flex flex-col justify-center">
                  <div className="p-4 border-2 border-slate-100 rounded-xl bg-white text-sm font-black uppercase tracking-widest flex justify-between items-center shadow-sm"><span className="text-slate-300">START</span> <span className="text-[#268053]">{form.startDate ? getEthDateString(form.startDate) : '---'}</span></div>
                  <div className="p-4 border-2 border-slate-100 rounded-xl bg-white text-sm font-black uppercase tracking-widest flex justify-between items-center shadow-sm"><span className="text-slate-300">END</span> <span className="text-[#268053]">{form.endDate ? getEthDateString(form.endDate) : '---'}</span></div>
                  {errors.rangeConflict && (
                    <div className="bg-red-50 border-2 border-red-200 p-3 rounded-xl text-center shadow-inner animate-in pop-in">
                       <p className="text-xs text-red-700 font-black uppercase tracking-widest flex items-center justify-center gap-2"><ShieldAlert size={14}/> Please resolve time conflicts below</p>
                    </div>
                  )}
                </div>
              </div>

              {form.dailySchedules?.length > 0 && (
                <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <p className="text-xs font-medium text-black uppercase tracking-widest mb-2">Time Adjustments per Day</p>
                  {form.dailySchedules.map((s, idx) => {
                    const conflict = dailyConflicts.find(c => c.date === s.date);
                    return (
                      <div key={s.date} className={`flex flex-col border-2 p-4 rounded-xl transition-all shadow-sm ${conflict ? (conflict.type === 'hard_overlap' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200') : 'bg-white border-slate-100 hover:border-emerald-200'}`}>
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                          <span className="text-[11px] font-black uppercase text-slate-600 tracking-widest flex items-center gap-2"><Clock size={14} className="text-emerald-500"/> {getEthDateString(s.date)}</span>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input type="checkbox" checked={s.allDay || false} onChange={e => updateSchedule(idx, 'allDay', e.target.checked)} className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500" />
                              <span className="text-[10px] font-black uppercase text-slate-500">All Day</span>
                            </label>
                            {!s.allDay ? (
                              <div className="flex items-center gap-2">
                                <select value={s.startTime?.substring(0, 5)} onChange={e => updateSchedule(idx, 'startTime', e.target.value)} className="bg-slate-50 border border-slate-200 text-xs font-bold p-1.5 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20">{generateHourOptions()}</select>
                                <span className="text-[10px] text-slate-300 font-black">TO</span>
                                <select value={s.endTime?.substring(0, 5)} onChange={e => updateSchedule(idx, 'endTime', e.target.value)} className="bg-slate-50 border border-slate-200 text-xs font-bold p-1.5 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20">{generateHourOptions()}</select>
                              </div>
                            ) : (
                              <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-3 py-1 rounded-md uppercase tracking-widest">Full Day Locked</span>
                            )}
                          </div>
                        </div>

                        {conflict && (
                          <div className="mt-3 pt-3 border-t border-slate-200/50 flex items-center gap-2 animate-in fade-in">
                            {conflict.type === 'hard_overlap' ? <ShieldAlert size={14} className="text-red-500" /> : <AlertTriangle size={14} className="text-amber-500" />}
                            <p className={`text-[10px] font-black uppercase tracking-widest ${conflict.type === 'hard_overlap' ? 'text-red-600' : 'text-amber-600'}`}>{conflict.msg}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-between pt-6 border-t border-slate-100">
                <button onClick={() => setCurrentStep(1)} className="font-black text-slate-400 hover:text-slate-600 uppercase text-xs tracking-widest transition-colors">Back</button>
                <Button onClick={() => validateStep(2) && setCurrentStep(3)} className="px-12 h-14 bg-gradient-to-r from-[#1b5e3a] to-[#268053] hover:from-[#15472c] hover:to-[#1b5e3a] text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-emerald-900/20 transition-all hover:-translate-y-1">CONTINUE TO SERVICES</Button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="grid md:grid-cols-2 gap-10">
                {['Technical', 'Hospitality'].map((l, i) => {
                  const list = i === 0 ? technicalServices : supportServices;
                  const formList = i === 0 ? form.technicalServices : form.supportServices;
                  const type = i === 0 ? 'technicalServices' : 'supportServices';
                  
                  return (
                    <div key={l} className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                      <p className="text-xs font-medium text-black uppercase mb-4 tracking-widest flex items-center gap-2">
                        {i === 0 ? <MonitorSmartphone className="text-blue-500"/> : <Coffee className="text-amber-500"/>} 
                        {l} Support
                      </p>
                      <div className="grid gap-3">
                        {list && list.length > 0 ? (
                          list.map(s => {
                            const isIncluded = isServiceIncluded(type, s.id?.toString());
                            const isSelected = formList.includes(s.id?.toString());
                            
                            return (
                              <div 
                                key={s.id} 
                                onClick={() => !isIncluded && toggleService(type, s.id?.toString())} 
                                className={`p-4 border-2 rounded-xl flex justify-between items-center transition-all duration-300 ${
                                  isIncluded
                                    ? 'border-emerald-200 bg-emerald-50/40 opacity-90 cursor-not-allowed'
                                    : isSelected 
                                      ? 'border-[#268053] bg-emerald-50/50 shadow-md shadow-emerald-500/10 scale-[1.02] cursor-pointer' 
                                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isIncluded || isSelected ? 'bg-[#268053] border-[#268053]' : 'border-slate-300'}`}>
                                    {(isIncluded || isSelected) && <CheckCircle2 className="w-3 h-3 text-white" />}
                                  </div>
                                  <span className={`text-xs font-bold uppercase tracking-tight ${isIncluded || isSelected ? 'text-emerald-900' : 'text-slate-600'}`}>
                                    {s.name}
                                  </span>
                                </div>
                                
                                {isIncluded ? (
                                  <span className="flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md uppercase tracking-widest">
                                    <Lock size={10} /> Included
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100">
                                    ETB {s.price || 0}
                                  </span>
                                )}
                              </div>
                            )
                          })
                        ) : (
                          <div className="text-[10px] font-bold text-slate-400 italic py-4 flex items-center gap-2 animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" />
                            Checking available services...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div onClick={() => document.getElementById('contract-upload')?.click()} className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center cursor-pointer bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 transition-all group shadow-inner">
                <input id="contract-upload" type="file" className="hidden" accept=".pdf" onChange={(e) => e.target.files?.[0] && setForm(p => ({ ...p, letterAttachment: e.target.files![0] }))} />
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
                  <Paperclip className="w-8 h-8 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                </div>
                <p className="text-sm font-black text-slate-600 uppercase tracking-widest">{form.letterAttachment ? form.letterAttachment.name : 'Attach Official Request (PDF)'}</p>
                <p className="text-xs font-medium text-black mt-2 uppercase tracking-widest">Required for external organizers</p>
              </div>
              <div className="flex justify-between pt-6 border-t border-slate-100">
                <button onClick={() => setCurrentStep(2)} className="font-black text-slate-400 hover:text-slate-600 uppercase text-xs tracking-widest transition-colors">Back</button>
                <Button onClick={() => setCurrentStep(4)} className="px-12 h-14 bg-gradient-to-r from-[#1b5e3a] to-[#268053] hover:from-[#15472c] hover:to-[#1b5e3a] text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-emerald-900/20 transition-all hover:-translate-y-1">FINAL REVIEW</Button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="grid lg:grid-cols-3 gap-8">
                
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl border-2 border-dashed border-slate-200 shadow-sm relative">
                  <div className="absolute -top-3 -left-3 w-6 h-6 bg-[#f8fafc] rounded-full border-r-2 border-b-2 border-slate-200" />
                  <div className="absolute -top-3 -right-3 w-6 h-6 bg-[#f8fafc] rounded-full border-l-2 border-b-2 border-slate-200" />
                  <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-[#f8fafc] rounded-full border-r-2 border-t-2 border-slate-200" />
                  <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-[#f8fafc] rounded-full border-l-2 border-t-2 border-slate-200" />
                  
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b-2 border-dashed border-slate-100 pb-4 mb-6 flex items-center gap-2"><Receipt size={14}/> OFFICIAL RECAP</p>
                  
                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest"><span className="text-slate-400">Venue:</span><span className="text-slate-800 bg-slate-100 px-3 py-1 rounded-md">{selectedVenue?.name}</span></div>
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest"><span className="text-slate-400">Dates:</span><span className="text-slate-800">{getEthDateString(form.startDate)} - {getEthDateString(form.endDate)}</span></div>
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest"><span className="text-slate-400">Pax:</span><span className="text-[#268053] bg-emerald-50 px-3 py-1 rounded-md">{form.participantCount} Guests</span></div>
                  </div>

                  <div className="pt-6 border-t-2 border-dashed border-slate-100">
                     <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Requested Enhancements</p>
                     
                     <div className="flex flex-wrap gap-2">
                        {form.technicalServices.length === 0 && form.supportServices.length === 0 ? <span className="text-xs italic text-slate-400">No extra services selected.</span> : null}
                        
                        {form.technicalServices.map(id => {
                          const s = technicalServices.find(x => x.id?.toString() === id?.toString());
                          return <span key={`tech-${id}`} className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-[10px] font-black uppercase tracking-tight rounded-lg text-blue-700 shadow-sm">{s?.name}</span>
                        })}

                        {form.supportServices.map(id => {
                          const s = supportServices.find(x => x.id?.toString() === id?.toString());
                          return <span key={`supp-${id}`} className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-[10px] font-black uppercase tracking-tight rounded-lg text-amber-700 shadow-sm">{s?.name}</span>
                        })}
                     </div>
                  </div>
                </div>

                <div className="bg-gradient-to-b from-[#0f241a] to-[#153a29] rounded-3xl p-8 text-white flex flex-col justify-center shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
                   <p className="text-[10px] font-black text-emerald-400 uppercase mb-8 tracking-widest flex items-center gap-2"><Sparkles size={14}/> QUOTATION</p>
                   
                   <div className="space-y-4 mb-8 opacity-80 text-xs font-bold uppercase tracking-widest">
                     <div className="flex justify-between border-b border-white/10 pb-4"><span>Venue ({form.dailySchedules?.length || 1}d)</span><span>{venueTotal.toFixed(2)}</span></div>
                     <div className="flex justify-between border-b border-white/10 pb-4"><span>Services</span><span>{serviceFee.toFixed(2)}</span></div>
                   </div>
                   
                   <div className="mt-auto pt-4 flex flex-col items-end gap-1">
                     <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">ESTIMATED TOTAL</span>
                     <span className="text-4xl font-black text-white tracking-tighter drop-shadow-md">ETB {(venueTotal + serviceFee).toLocaleString()}</span>
                   </div>
                </div>
              </div>
              
              <div className="mt-12 flex justify-between pt-6 border-t border-slate-100">
                <button onClick={() => setCurrentStep(3)} className="font-black text-slate-400 hover:text-slate-600 uppercase text-xs tracking-widest transition-colors">Back</button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  className="px-16 h-16 bg-gradient-to-r from-[#1b5e3a] to-[#268053] hover:from-[#15472c] hover:to-[#1b5e3a] text-white text-lg rounded-2xl font-black shadow-2xl shadow-emerald-900/30 uppercase tracking-widest transition-all hover:-translate-y-1 hover:scale-105 active:scale-95 disabled:opacity-75 disabled:pointer-events-none disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:from-[#268053] disabled:to-[#268053]"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-3">
                      <div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
                      SUBMITTING...
                    </span>
                  ) : 'SUBMIT REQUEST'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}