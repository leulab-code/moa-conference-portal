import { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/lib/app-context';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ChevronDown, ChevronUp, Clock, XCircle, Users, MapPin, Calendar,
  FileText, Activity, Trash2, Star, CreditCard, User, Mail, Phone,
  CheckCircle2, AlertTriangle, Building2, ChevronLeft, ChevronRight, Filter, X
} from 'lucide-react';
import { ETH_MONTHS } from '@/components/ui/ethiopian-calendar';
import { EthDateTime } from 'ethiopian-calendar-date-converter';
import { Booking } from '@/lib/types';

const statusStyles: Record<string, { bg: string, text: string, label: string, dot: string }> = {
  reserved: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending Review', dot: 'bg-amber-500' },
  approved: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Awaiting Payment', dot: 'bg-blue-500' },
  confirmed: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Confirmed (Paid)', dot: 'bg-emerald-500' },
  override: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'VIP Override', dot: 'bg-purple-500' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', label: 'Rejected', dot: 'bg-red-500' },
  cancelled: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Cancelled', dot: 'bg-slate-400' },
  completed: { bg: 'bg-slate-800', text: 'text-white', label: 'Completed', dot: 'bg-white' },
};

type TabFilter = 'pending' | 'payment' | 'confirmed' | 'rejected' | 'all';

// --- ETHIOPIAN DATE CONVERTER ---
const toEthDateString = (gStr: string | undefined | null) => {
  if (!gStr) return 'TBD';
  try {
    const [y, m, d] = gStr.split('T')[0].split('-').map(Number);
    const gDate = new Date(y, m - 1, d, 12, 0, 0);
    const ethDate = EthDateTime.fromEuropeanDate(gDate);
    return `${ETH_MONTHS[ethDate.month - 1]} ${ethDate.date}, ${ethDate.year}`;
  } catch {
    return gStr;
  }
};

export default function ManageBookings() {
  const { bookings, updateBookingStatus, cancelBooking, venues, technicalServices, supportServices } = useApp();
  const [activeTab, setActiveTab] = useState<TabFilter>('payment');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // NEW: Filtering State
  const [filterVenue, setFilterVenue] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterVenue, filterDate]); // Reset to page 1 when any filter changes

  const [clashWarning, setClashWarning] = useState<{ isOpen: boolean, clashingBooking: Booking | null, attemptedAction?: { id: string, status: string } }>({ isOpen: false, clashingBooking: null });

  // 1. First apply Venue and Date filters
  const baseFilteredBookings = bookings.filter(b => {
    // Venue Filter
    let venueMatch = true;
    if (filterVenue !== 'all') {
      const bVenue = b.venue || b.venueId;
      venueMatch = String(bVenue) === String(filterVenue);
    }

    // Date Filter (Checks if filterDate falls within start and end date)
    let dateMatch = true;
    if (filterDate) {
      const start = b.start_date || b.startDate;
      const end = b.end_date || b.endDate;
      if (start && end) {
        dateMatch = filterDate >= start && filterDate <= end;
      } else {
        dateMatch = false;
      }
    }

    return venueMatch && dateMatch;
  });

  // 2. Calculate dynamic counts based on the filtered results
  const counts = {
    pending: baseFilteredBookings.filter(b => b.status === 'reserved').length,
    payment: baseFilteredBookings.filter(b => b.status === 'approved').length,
    confirmed: baseFilteredBookings.filter(b => ['confirmed', 'override', 'completed'].includes(b.status)).length,
    rejected: baseFilteredBookings.filter(b => ['rejected', 'cancelled'].includes(b.status)).length,
    all: baseFilteredBookings.length,
  };

  // 3. Finally, apply the Tab (Status) filter for display
  const finalFilteredBookings = baseFilteredBookings.filter(b => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return b.status === 'reserved';
    if (activeTab === 'payment') return b.status === 'approved';
    if (activeTab === 'confirmed') return ['confirmed', 'override', 'completed'].includes(b.status);
    if (activeTab === 'rejected') return ['rejected', 'cancelled'].includes(b.status);
    return true;
  });

  const totalPages = Math.ceil(finalFilteredBookings.length / itemsPerPage);

  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return finalFilteredBookings.slice(start, start + itemsPerPage);
  }, [finalFilteredBookings, currentPage]);

  const handleStatusChange = async (id: string, status: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const targetBooking = bookings.find(b => String(b.id) === String(id));

    // CLASH ENGINE
    if (targetBooking && ['confirmed', 'override'].includes(status)) {
      const clashingBooking = bookings.find(other => {
        if (String(other.id) === String(targetBooking.id)) return false;

        const tVenue = targetBooking.venue || targetBooking.venueId;
        const oVenue = other.venue || other.venueId;
        if (String(oVenue) !== String(tVenue)) return false;

        if (!['confirmed', 'override', 'completed'].includes(other.status)) return false;

        const tStartD = targetBooking.start_date || targetBooking.startDate;
        const tEndD = targetBooking.end_date || targetBooking.endDate;
        const oStartD = other.start_date || other.startDate;
        const oEndD = other.end_date || other.endDate;

        const datesOverlap = tStartD <= oEndD && tEndD >= oStartD;
        if (!datesOverlap) return false;

        const tSched = targetBooking.daily_schedules || targetBooking.dailySchedules;
        const oSched = other.daily_schedules || other.dailySchedules;

        const myStart = tSched?.[0]?.startTime || targetBooking.start_time || targetBooking.startTime || '00:00';
        const myEnd = tSched?.[0]?.endTime || targetBooking.end_time || targetBooking.endTime || '23:59';
        const otherStart = oSched?.[0]?.startTime || other.start_time || other.startTime || '00:00';
        const otherEnd = oSched?.[0]?.endTime || other.end_time || other.endTime || '23:59';

        return myStart < otherEnd && myEnd > otherStart;
      });

      if (clashingBooking) {
        setClashWarning({ isOpen: true, clashingBooking, attemptedAction: { id, status } });
        return;
      }
    }

    let msg = `Change status to ${status}?`;
    if (status === 'override') msg = 'Apply VIP Override? This bypasses standard payment checks.';
    if (status === 'confirmed') msg = 'Confirm that payment has been received?';

    if (confirm(msg)) {
      try {
        await updateBookingStatus(id, status as any);
      } catch (err) {
        toast.error("Failed to update status.");
      }
    }
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('Permanently delete/cancel this booking?')) {
      cancelBooking(id);
    }
  };

  const handleInitReject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRejectingId(id);
    setExpandedId(id);
    setRejectReason('');
  };

  const handleConfirmReject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!rejectReason.trim()) return toast.error('Please provide a reason');
    updateBookingStatus(id, 'rejected', rejectReason.trim());
    setRejectingId(null);
  };

  return (
    <div className="max-w-6xl mx-auto pb-16 animate-in fade-in duration-500">

      {/* Clash Warning Popup */}
      {clashWarning.isOpen && clashWarning.clashingBooking && (() => {
        const cBooking = clashWarning.clashingBooking;
        const cOrgName = cBooking.organizer_name || cBooking.organizerName || cBooking.name || 'Unknown Organizer';
        const cTitle = cBooking.event_title || cBooking.eventTitle || cBooking.title || 'Untitled Event';
        const cStartD = cBooking.start_date || cBooking.startDate || '';
        const cEndD = cBooking.end_date || cBooking.endDate || '';
        const cSched = cBooking.daily_schedules || cBooking.dailySchedules;
        const cTimeStart = cSched?.[0]?.startTime || cBooking.start_time || cBooking.startTime || '00:00';
        const cTimeEnd = cSched?.[0]?.endTime || cBooking.end_time || cBooking.endTime || '23:59';

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setClashWarning({ isOpen: false, clashingBooking: null })}>
            <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-8" onClick={e => e.stopPropagation()}>
              <div className="w-20 h-20 bg-red-50 border-4 border-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={36} />
              </div>
              <h2 className="text-3xl font-serif font-black text-center text-slate-800 mb-2 tracking-tight">Scheduling Clash!</h2>
              <p className="text-center text-slate-500 font-medium mb-8 leading-relaxed px-4">
                You cannot confirm this request because the venue is already PAID FOR by someone else during this exact time.
              </p>

              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8 shadow-inner">
                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Already Confirmed By</p>
                <p className="text-xl font-bold text-red-900">{cOrgName}</p>
                <p className="text-sm font-medium text-red-700/80 mt-1 italic">"{cTitle}"</p>

                <div className="mt-4 pt-4 border-t border-red-200 flex flex-col gap-2 text-sm font-bold text-red-800">
                  <span className="flex items-center gap-2"><Calendar size={16} className="text-red-500" />
                    {cStartD === cEndD ? toEthDateString(cStartD) : `${toEthDateString(cStartD).split(',')[0]} - ${toEthDateString(cEndD)}`}
                  </span>
                  <span className="flex items-center gap-2"><Clock size={16} className="text-red-500" />
                    {cTimeStart} to {cTimeEnd}
                  </span>
                </div>
              </div>

              {clashWarning.attemptedAction?.status === 'override' ? (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-red-600 text-center px-4">
                    Continuing with a VIP Override will <span className="underline uppercase font-black">automatically cancel</span> the existing booking.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" className="flex-1 font-bold h-12" onClick={() => setClashWarning({ isOpen: false, clashingBooking: null })}>Cancel</Button>
                    <Button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold h-12 shadow-md" onClick={() => {
                      updateBookingStatus(clashWarning.attemptedAction!.id, 'override');
                      setClashWarning({ isOpen: false, clashingBooking: null });
                    }}><Star className="w-4 h-4 mr-2" /> Force VIP Override</Button>
                  </div>
                </div>
              ) : (
                <Button className="w-full bg-[#111827] hover:bg-slate-800 text-white font-black py-6 rounded-xl shadow-xl uppercase tracking-widest" onClick={() => setClashWarning({ isOpen: false, clashingBooking: null })}>
                  Dismiss & Review Calendar
                </Button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <Activity className="w-8 h-8 text-[#268053]" /> Manage Bookings
        </h1>
        <p className="text-muted-foreground mt-2">Verify payments on pending requests, or apply VIP overrides.</p>
      </div>

      {/* NEW: Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-500">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-bold uppercase tracking-widest">Filters</span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          
          <div className="relative w-full sm:w-auto">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={filterVenue}
              onChange={e => setFilterVenue(e.target.value)}
              className="w-full sm:w-48 pl-9 pr-8 py-2.5 text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#268053]/20 focus:border-[#268053] appearance-none cursor-pointer transition-all"
            >
              <option value="all">All Venues</option>
              {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>

          <div className="relative w-full sm:w-auto">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="w-full sm:w-48 pl-9 pr-4 py-2.5 text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#268053]/20 focus:border-[#268053] transition-all cursor-pointer"
            />
          </div>

          {(filterVenue !== 'all' || filterDate !== '') && (
            <Button 
              variant="ghost" 
              onClick={() => { setFilterVenue('all'); setFilterDate(''); }}
              className="w-full sm:w-auto text-rose-500 hover:text-rose-700 hover:bg-rose-50 font-bold px-3 h-10"
            >
              <X className="w-4 h-4 mr-1.5" /> Clear
            </Button>
          )}

        </div>
      </div>

      {/* Tab Filters (Status) */}
      <div className="flex overflow-x-auto pb-2 mb-6 border-b border-slate-200 hide-scrollbar">
        {(['payment', 'pending', 'confirmed', 'rejected', 'all'] as TabFilter[]).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setExpandedId(null); setRejectingId(null); }}
            className={`whitespace-nowrap px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === tab ? 'border-[#268053] text-[#268053]' : 'border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-300'
              }`}
          >
            {tab === 'payment' ? 'Awaiting Payment' :
              tab === 'pending' ? 'Legacy / Review' :
                tab === 'confirmed' ? 'Confirmed & VIP' :
                  tab === 'rejected' ? 'Rejected' : 'All Bookings'}
            <span className={`ml-2 py-0.5 px-2.5 rounded-full text-xs transition-colors ${activeTab === tab ? 'bg-[#268053] text-white' : 'bg-slate-100 text-slate-500'
              }`}>
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Admin Booking List */}
      <div className="space-y-4">
        {paginatedBookings.length === 0 ? (
           <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-16 text-center text-slate-500">
              <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="font-bold">No bookings found for these filters.</p>
              <p className="text-sm">Try clearing your filters or changing the status tab.</p>
           </div>
        ) : paginatedBookings.map((b, i) => {

          // Standardization
          const safeId = String(b.id);
          const title = b.event_title || b.eventTitle || b.title || 'Untitled Event';
          const orgName = b.organizer_name || b.organizerName || b.name || b.full_name || 'Unknown Organizer';
          const orgEmail = b.organizer_email || b.organizerEmail || b.email || 'No Email';
          const orgPhone = b.organizer_phone || b.organizerPhone || b.phone || 'No Phone Number';
          const orgOrg = b.organization || b.organizer_organization || b.organizerOrganization || b.company || 'No Organization Listed';
          const desc = b.event_description || b.eventDescription || b.description || 'No description provided.';
          const pax = b.participant_count || b.participantCount || b.pax || 0;

          const startDate = b.start_date || b.startDate || '';
          const endDate = b.end_date || b.endDate || '';
          const attachment = b.letter_attachment || b.letterAttachment || b.attachment;

          // Smart Venue Lookup
          const venueId = b.venue || b.venueId;
          const venue = venues.find(v => String(v.id) === String(venueId));
          const venueName = venue?.name || b.venue_name || b.venueName || 'Unknown Venue';

          // Financials
          const grandTotal = b.totalPrice || b.total_price || 0;

          // Services requested
          const techIds = b.technical_services || b.technicalServices || [];
          const suppIds = b.support_services || b.supportServices || [];
          const allRequestedServices: { id: string, name: string, isUnavailable: boolean, type: 'tech' | 'supp' }[] = [];
          
          techIds.forEach((id: any) => {
            const s = technicalServices.find(t => String(t.id) === String(id));
            if (s) {
              allRequestedServices.push({ 
                id: String(id), 
                name: s.name, 
                isUnavailable: (b.unavailableTechnicalServices || []).includes(String(id)),
                type: 'tech'
              });
            }
          });
          suppIds.forEach((id: any) => {
            const s = supportServices.find(t => String(t.id) === String(id));
            if (s) {
              allRequestedServices.push({ 
                id: String(id), 
                name: s.name, 
                isUnavailable: (b.unavailableSupportServices || []).includes(String(id)),
                type: 'supp'
              });
            }
          });

          const isExpanded = expandedId === safeId;
          const isRejecting = rejectingId === safeId;
          const style = statusStyles[b.status] || statusStyles.reserved;

          const hasTechnicalConflict = b.ictAcknowledged && allRequestedServices.some(s => s.type === 'tech' && s.isUnavailable);
          const hasCateringConflict = b.cateringAcknowledged && allRequestedServices.some(s => s.type === 'supp' && s.isUnavailable);
          const hasAnyConflict = hasTechnicalConflict || hasCateringConflict;

          // Price adjustment for unavailable services
          let unavailableDeduction = 0;
          allRequestedServices.forEach(s => {
            const isShownAsUnavailable = s.isUnavailable && (s.type === 'tech' ? b.ictAcknowledged : b.cateringAcknowledged);
            if (isShownAsUnavailable) {
              const fullService = (s.type === 'tech' ? technicalServices : supportServices).find(x => String(x.id) === s.id);
              if (fullService) unavailableDeduction += parseFloat(fullService.price || 0);
            }
          });
          const adjustedTotal = Math.max(0, grandTotal - unavailableDeduction);

          return (
            <div key={safeId} className={`bg-white border rounded-xl overflow-hidden transition-all duration-200 ${isExpanded ? 'shadow-lg border-[#268053]/50 ring-2 ring-[#268053]/20 my-6' : 'shadow-sm hover:shadow-md'}`}>

              {/* TOP HEADER */}
              <div className={`p-5 sm:p-6 cursor-pointer group ${isExpanded ? 'bg-slate-50/50' : ''}`} onClick={() => !isRejecting && setExpandedId(isExpanded ? null : safeId)}>
                <div className="flex flex-col lg:flex-row gap-5 lg:items-center justify-between">

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest ${style.bg} ${style.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse`}></span> {style.label}
                        {hasAnyConflict && (
                          <>
                            <span className="w-1 h-3 border-l border-current/20 ml-1"></span>
                            <span className="text-red-600 font-black ml-1 uppercase tracking-tighter">Unavailable Resources</span>
                          </>
                        )}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-[#268053] transition-colors">{title}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600 font-medium">
                      <div className="flex items-center gap-1.5 shrink-0"><MapPin className="w-4 h-4 text-slate-400" /><span>{venueName}</span></div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>
                          {startDate === endDate
                            ? toEthDateString(startDate)
                            : `From ${toEthDateString(startDate).split(',')[0]} to ${toEthDateString(endDate)}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0"><User className="w-4 h-4 text-slate-400" /><span>{orgName}</span></div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    {/* Approve / VIP / Reject Buttons */}
                    {['reserved', 'approved'].includes(b.status) && !isRejecting && (
                      <>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm" onClick={(e) => handleStatusChange(safeId, 'confirmed', e)}>
                          <CreditCard className="w-4 h-4 mr-2" /> Confirm Paid
                        </Button>
                        <Button className="bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-sm" onClick={(e) => handleStatusChange(safeId, 'override', e)}>
                          <Star className="w-4 h-4 mr-2" /> VIP Override
                        </Button>
                        <Button variant="outline" className="text-red-600 hover:bg-red-50 border-red-200" onClick={(e) => handleInitReject(safeId, e)}>
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {['confirmed', 'override'].includes(b.status) && (
                      <Button variant="outline" className="text-slate-700 border-slate-300 font-bold" onClick={(e) => handleStatusChange(safeId, 'completed', e)}>
                        Mark Completed
                      </Button>
                    )}
                    <ChevronDown className={`w-5 h-5 text-slate-400 ml-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>

              {/* EXPANDED RICH DETAILS AREA */}
              {isExpanded && (
                <div className="border-t-2 border-slate-100 bg-white p-8 cursor-default animate-in fade-in slide-in-from-top-4 duration-300" onClick={(e) => e.stopPropagation()}>

                  {isRejecting && (
                    <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
                      <h4 className="font-bold text-red-900 mb-3 flex items-center gap-2"><XCircle className="w-5 h-5" /> Reason for Rejection</h4>
                      <textarea autoFocus value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="w-full text-sm border border-red-200 rounded-lg p-4 shadow-inner resize-none focus:outline-none focus:ring-2 focus:ring-red-500" rows={3} placeholder="Please provide the exact reason why this is rejected. The user will see this." />
                      <div className="flex justify-end gap-3 mt-4">
                        <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setRejectingId(null); }}>Cancel</Button>
                        <Button variant="destructive" onClick={(e) => handleConfirmReject(safeId, e)}>Confirm Rejection</Button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* COLUMN 1: Organizer Details */}
                    <div className="space-y-6">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Organizer Details</p>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center text-slate-400"><User size={16} /></div>
                            <span className="font-bold text-slate-800">{orgName}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center text-slate-400"><Building2 size={16} /></div>
                            <span className="text-sm font-medium text-slate-600">{orgOrg}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center text-slate-400"><Mail size={16} /></div>
                            <span className="text-sm font-medium text-slate-600">{orgEmail}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center text-slate-400"><Phone size={16} /></div>
                            <span className="text-sm font-medium text-slate-600">{orgPhone}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Event Description</p>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 h-32 overflow-y-auto custom-scrollbar">
                          <p className={`text-sm leading-relaxed ${desc === 'No description provided.' ? 'text-slate-400 italic font-medium' : 'text-slate-600 font-bold'}`}>{desc}</p>
                        </div>
                      </div>
                    </div>

                    {/* COLUMN 2: Services & Documents */}
                    <div className="space-y-6">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Requested Resources</p>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
                          {allRequestedServices.length === 0 ? (
                            <p className="text-slate-400 italic text-sm font-bold">No extra services requested.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {allRequestedServices.map((s, idx) => {
                                const isShownAsUnavailable = s.isUnavailable && (s.type === 'tech' ? b.ictAcknowledged : b.cateringAcknowledged);
                                return (
                                  <span key={idx} className={`px-2.5 py-1 rounded-md text-[11px] font-bold shadow-sm border transition-all ${isShownAsUnavailable ? 'bg-red-50 border-red-200 text-red-700 ring-2 ring-red-100 animate-in zoom-in-95' : 'bg-white border-slate-200 text-slate-700'}`}>
                                    {s.name}
                                    {isShownAsUnavailable && <span className="ml-1.5 text-[9px] font-black uppercase text-red-500">Unavailable</span>}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {attachment && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Official Documents</p>
                          <a href={attachment} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors group">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-[#268053]"><FileText size={20} /></div>
                              <div>
                                <p className="font-bold text-[#268053] text-sm">Request Letter</p>
                                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">View PDF Document</p>
                              </div>
                            </div>
                          </a>
                        </div>
                      )}
                    </div>

                    {/* COLUMN 3: Financials & Pax */}
                    <div className="space-y-6">
                      <div className="bg-[#268053] border border-[#1a5a3a] rounded-2xl p-6 shadow-lg relative overflow-hidden text-white">
                        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                        <p className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-4 relative z-10">Total Valuation</p>
                        <div className="flex flex-col mb-4 relative z-10">
                          <p className="text-4xl font-black">ETB {Number(adjustedTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                          {unavailableDeduction > 0 && (
                            <span className="text-[10px] font-black text-rose-300 uppercase tracking-widest mt-1">
                              (-{unavailableDeduction.toFixed(2)} Deduction for Unavailable Services)
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col gap-1 border-t border-white/10 pt-4 relative z-10">
                          <div className="flex justify-between text-xs font-medium text-emerald-100">
                            <span>Payment Status:</span>
                            <span className="font-bold">{b.status === 'confirmed' ? 'PAID' : b.status === 'override' ? 'WAIVED' : 'PENDING'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Attendees Expected</p>
                          <p className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <Users className={`w-5 h-5 ${pax > (venue?.capacity || Infinity) ? 'text-red-500' : 'text-[#268053]'}`} />
                            <span className={pax > (venue?.capacity || Infinity) ? 'text-red-600' : ''}>{pax}</span>
                            <span className="text-sm font-bold text-slate-400">/ {venue?.capacity || '∞'} Max</span>
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Admin Delete Action */}
                  <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end">
                    <Button variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 font-bold px-6 py-5" onClick={(e) => handleDelete(safeId, e)}>
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Booking Record
                    </Button>
                  </div>

                </div>
              )}
            </div>
          );
        })}

        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white px-6 py-4 rounded-xl border border-slate-200 mt-6 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Showing <span className="text-slate-900">{Math.min(finalFilteredBookings.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(finalFilteredBookings.length, currentPage * itemsPerPage)}</span> of {finalFilteredBookings.length}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="rounded-lg h-9 w-9 p-0 border-slate-200 text-slate-500 hover:text-[#268053] hover:border-[#268053]/50 disabled:opacity-30 transition-all shadow-sm"
              >
                <ChevronLeft size={16} />
              </Button>
              {[...Array(totalPages)].map((_, i) => (
                <Button
                  key={i + 1}
                  variant={currentPage === i + 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(i + 1)}
                  className={`rounded-lg h-9 w-9 p-0 font-bold text-xs transition-all ${currentPage === i + 1
                      ? "bg-[#268053] text-white hover:bg-[#1b5e3a] border-transparent shadow-lg"
                      : "border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="rounded-lg h-9 w-9 p-0 border-slate-200 text-slate-500 hover:text-[#268053] hover:border-[#268053]/50 disabled:opacity-30 transition-all shadow-sm"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}