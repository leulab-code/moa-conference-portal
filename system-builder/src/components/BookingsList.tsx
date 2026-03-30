import { useState } from 'react';
import { useApp, API_BASE } from '@/lib/app-context';
import { toast } from 'sonner';
import { 
  Calendar, 
  MapPin, 
  Plus, 
  CalendarX2, 
  CheckCircle2,
  Clock3,
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
  Lock,
  Ticket,
  Users,
  Phone,
  AlignLeft,
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ETH_MONTHS } from '@/components/ui/ethiopian-calendar';
import { EthDateTime } from 'ethiopian-calendar-date-converter';

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

// --- SECURE 24-HOUR VISUAL LOCK CHECK ---
const isWithin24Hours = (startDate: string, startTime?: string) => {
  if (!startDate) return false;
  try {
    const d = startDate.split('T')[0];
    const t = startTime || '08:00:00';
    const eventDate = new Date(`${d}T${t}`);
    const diff = (eventDate.getTime() - Date.now()) / (1000 * 3600);
    return diff > 0 && diff < 24;
  } catch { return false; }
};

export default function BookingsList() {
  const { bookings = [], user, cancelBooking, token } = useApp();

  // States for Edit Modal
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [editForm, setEditForm] = useState({ event_title: '', event_description: '', participant_count: 0, organizer_phone: '' });

  // SECURE FILTER: Only show bookings that belong to the logged-in user!
  const myBookings = bookings.filter(b => 
    b.organizerEmail === user?.email || 
    String(b.user) === String(user?.id) || 
    b.organizer_email === user?.email // Fallback for raw API data
  );

  const getStatusConfig = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
      case 'completed':
        return { color: 'text-emerald-700', bg: 'bg-emerald-100', icon: <CheckCircle2 size={16} />, label: 'Confirmed' };
      case 'approved':
        return { color: 'text-amber-700', bg: 'bg-amber-100', icon: <Clock3 size={16} />, label: 'Pending Approval' };
      case 'rejected':
      case 'cancelled':
        return { color: 'text-red-700', bg: 'bg-red-100', icon: <XCircle size={16} />, label: status.charAt(0).toUpperCase() + status.slice(1) };
      case 'override':
        return { color: 'text-purple-700', bg: 'bg-purple-100', icon: <AlertCircle size={16} />, label: 'VIP Override' };
      default:
        return { color: 'text-slate-700', bg: 'bg-slate-100', icon: <Clock3 size={16} />, label: status || 'Pending' };
    }
  };

  // FIXED: Back to your working hash routing!
  const navigateToNewBooking = () => {
    window.location.hash = 'new-booking'; 
  };

  // --- ACTIONS ---
  const handleCancel = async (id: string) => {
    if (confirm('Are you certain you wish to cancel this booking? This action cannot be undone.')) {
      if (cancelBooking) cancelBooking(id); // Use context method if available
      toast.success('Your booking has been successfully cancelled.');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleOpenEdit = (b: any) => {
    setEditingBooking(b);
    setEditForm({
      event_title: b.eventTitle || b.event_title || b.title || '',
      event_description: b.eventDescription || b.event_description || b.description || '',
      participant_count: b.participantCount || b.participant_count || b.pax || 0,
      organizer_phone: b.organizerPhone || b.organizer_phone || b.phone || '',
    });
  };

  const handleSaveEdit = async () => {
    try {
      const res = await fetch(`${API_BASE}/bookings/public_edit/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Token ${token}` } : {}) },
        body: JSON.stringify({ ref_id: editingBooking.id, ...editForm })
      });
      if(res.ok) {
        toast.success("Booking modifications saved successfully!");
        setEditingBooking(null);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error("Failed to save changes. Please try again.");
      }
    } catch(err) {
      toast.error("Network error while trying to save.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500 relative">
      
      {/* EDIT MODAL POPUP */}
      {editingBooking && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-8">
              <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <Edit className="text-[#268053]" /> Modify Booking Details
              </h2>
              <p className="text-xs font-bold text-slate-500 mb-6">To change your event Date or Venue, you must cancel this booking and submit a new request to prevent calendar conflicts.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block"><Ticket size={12} className="inline mr-1"/> Event Title</label>
                  <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-[#268053] outline-none" value={editForm.event_title} onChange={e => setEditForm({...editForm, event_title: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block"><Users size={12} className="inline mr-1"/> Participants</label>
                    <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-[#268053] outline-none" value={editForm.participant_count} onChange={e => setEditForm({...editForm, participant_count: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block"><Phone size={12} className="inline mr-1"/> Contact Phone</label>
                    <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-[#268053] outline-none" value={editForm.organizer_phone} onChange={e => setEditForm({...editForm, organizer_phone: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block"><AlignLeft size={12} className="inline mr-1"/> Detailed Description</label>
                  <textarea rows={4} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:ring-2 focus:ring-[#268053] resize-none outline-none" value={editForm.event_description} onChange={e => setEditForm({...editForm, event_description: e.target.value})} />
                </div>
              </div>

              <div className="flex gap-4 mt-8 pt-6 border-t border-slate-100">
                  <Button variant="outline" className="flex-1 font-bold h-12 border-slate-300" onClick={() => setEditingBooking(null)}>Cancel</Button>
                  <Button className="flex-1 bg-[#268053] hover:bg-[#1b4332] text-white font-bold h-12 shadow-glow" onClick={handleSaveEdit}><Save size={16} className="mr-2"/> Save Changes</Button>
              </div>
           </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <Calendar className="w-8 h-8 text-[#268053]" /> My Bookings
          </h1>
          <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest">
            Manage and track your facility requests
          </p>
        </div>
        
        {/* FIXED: Back to Button with onClick */}
        <Button 
          onClick={navigateToNewBooking} 
          className="h-14 px-8 bg-gradient-to-r from-[#1b5e3a] to-[#268053] hover:from-[#15472c] hover:to-[#1b5e3a] text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-emerald-900/20 transition-all hover:-translate-y-1 flex items-center gap-2"
        >
          <Plus size={20} /> Book a Venue
        </Button>
      </div>

      {/* EMPTY STATE */}
      {myBookings.length === 0 ? (
        <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-16 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <CalendarX2 className="w-12 h-12 text-slate-300" />
          </div>
          <h2 className="text-2xl font-black text-slate-700 mb-2 uppercase tracking-tight">No Bookings Found</h2>
          <p className="text-slate-500 font-bold mb-8 max-w-md">
            You haven't requested any venues yet. Click the button below to start your first facility reservation.
          </p>
          {/* FIXED: Back to Button with onClick */}
          <Button 
            onClick={navigateToNewBooking} 
            className="h-14 px-10 bg-[#268053] hover:bg-[#1b5e3a] text-white rounded-xl font-black uppercase tracking-widest shadow-lg transition-all hover:-translate-y-1 flex items-center gap-2"
          >
            <Plus size={20} /> Start New Booking
          </Button>
        </div>
      ) : (
        /* LIST STATE */
        <div className="grid gap-6">
          {myBookings.map((booking) => {
            const statusConfig = getStatusConfig(booking.status);
            
            const startDate = booking.startDate || booking.start_date;
            const endDate = booking.endDate || booking.end_date;
            const startTime = booking.startTime || booking.start_time;
            
            // Lock Check!
            const isLocked = isWithin24Hours(startDate, startTime) && ['confirmed', 'approved', 'reserved'].includes(booking.status?.toLowerCase());
            
            return (
              <div 
                key={booking.id} 
                className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row items-start justify-between gap-6 hover:shadow-lg transition-all"
              >
                <div className="flex-1 space-y-4 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-md border border-slate-100">
                      REF: MOA-BKG-{booking.id}
                    </span>
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest w-fit ${statusConfig.bg} ${statusConfig.color}`}>
                      {statusConfig.icon} {statusConfig.label}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">
                      {booking.eventTitle || booking.event_title || 'Untitled Event'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                        <MapPin size={14} className="text-slate-400"/> {booking.venue_name || booking.venueName || 'Venue TBD'}
                      </span>
                      
                      {/* ETHIOPIAN DATES RENDERED HERE */}
                      <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-100">
                        <Calendar size={14} className="text-emerald-500"/> 
                        {startDate === endDate 
                          ? toEthDateString(startDate) 
                          : `${toEthDateString(startDate).split(',')[0]} - ${toEthDateString(endDate)}`}
                      </span>
                      
                      <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                        <Users size={14} className="text-slate-400"/> {booking.participantCount || booking.participant_count || booking.pax || 0} Pax
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end justify-between h-full gap-4 w-full md:w-auto border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                  
                  {/* Total Price */}
                  {(booking.totalPrice !== undefined || booking.total_price !== undefined) && (
                    <div className="text-left md:text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Total</p>
                      <p className="text-xl font-black text-slate-800 tracking-tighter">
                        ETB {parseFloat(booking.totalPrice || booking.total_price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </p>
                    </div>
                  )}

                  {/* ACTION BUTTONS (Edit/Cancel) */}
                  {['reserved', 'approved', 'confirmed'].includes(booking.status?.toLowerCase()) && (
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                      {isLocked ? (
                         <div className="flex items-center justify-center gap-2 text-amber-700 bg-amber-50 px-4 py-2.5 rounded-xl border border-amber-200 w-full">
                           <Lock size={14} /> <span className="text-xs font-bold">Locked (Under 24h)</span>
                         </div>
                      ) : (
                        <div className="flex gap-2 w-full md:w-auto">
                          {/* THE EDIT BUTTON IS NOW ALWAYS VISIBLE UNTIL 24 HOURS BEFORE! */}
                          <Button 
                            variant="outline" 
                            className="flex-1 md:flex-none border-slate-300 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 font-bold" 
                            onClick={() => handleOpenEdit(booking)}
                          >
                            <Edit size={14} className="mr-2" /> Edit
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            className="flex-1 md:flex-none bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 font-bold" 
                            onClick={() => handleCancel(String(booking.id))}
                          >
                            <Trash2 size={14} className="mr-2" /> Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Read Only State for Completed/Rejected */}
                  {!['reserved', 'approved', 'confirmed'].includes(booking.status?.toLowerCase()) && (
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-auto">Record Finalized</p>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}