import { useApp } from '@/lib/app-context';
// Mock venues removed
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { Calendar, Building2, Users, TrendingUp, CheckCircle2, ListFilter, Zap, ArrowRight, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';

const COLORS = ['#268053', '#f59e0b', '#dc2626', '#475569'];

export default function Dashboard() {
  const { bookings, venues, technicalServices, supportServices } = useApp();

  const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'reserved');
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const pendingCount = bookings.filter(b => b.status === 'reserved').length;
  const totalParticipants = activeBookings.reduce((s, b) => s + b.participantCount, 0);

  // 1. Conflict Detection Engine
  const conflicts = activeBookings.filter((b1, i) => 
    activeBookings.some((b2, j) => 
      i !== j && 
      b1.venueId === b2.venueId && 
      b1.startDate === b2.startDate && 
      ((b1.startTime >= b2.startTime && b1.startTime < b2.endTime) || 
       (b2.startTime >= b1.startTime && b2.startTime < b1.endTime))
    )
  );

  // 2. Resource Bottleneck Alerts (Simulated Inventory)
  const resourceInventory: Record<string, number> = {
    'LED Screen / Display': 2,
    'Livestreaming': 1,
    'Video Conferencing': 2,
    'Photography': 1
  };
  
  const bottleneckAlerts = Object.entries(resourceInventory).map(([name, limit]) => {
    // Check if any date has more than 'limit' concurrent requests
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

  // 3. Staffing Recommendations (for high priority list)
  const calculateStaff = (count: number) => ({
    ushers: Math.max(1, Math.ceil(count / 60)),
    security: Math.max(1, Math.ceil(count / 150)),
    tech: count > 200 ? 2 : 1
  });

  // Venue usage logic
  const venueUsage = venues
    .map(v => ({
      name: v.name.split(' ').slice(0, 2).join(' '),
      bookings: bookings.filter(b => b.venueId === v.id && b.status !== 'cancelled' && b.status !== 'rejected').length,
    }))
    .filter(v => v.bookings > 0)
    .sort((a, b) => b.bookings - a.bookings);
  
  // 1. Weekly Forecast Logic (Next 7 Days from March 20, 2026)
  const today = new Date('2026-03-20');
  const forecastData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i + 1); // Start from tomorrow
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const count = bookings.filter(b => b.startDate === dateStr && (b.status === 'confirmed' || b.status === 'reserved')).length;
    return { name: dayName, date: dateStr, count };
  });

  // 2. Service Demand Logic
  const allServiceIds = [...bookings.flatMap(b => b.technicalServices || []), ...bookings.flatMap(b => b.supportServices || [])];
  const serviceCounts: Record<string, number> = {};
  allServiceIds.forEach(id => {
    const service = [...technicalServices, ...supportServices].find(s => s.id === id);
    if (service) {
      serviceCounts[service.name] = (serviceCounts[service.name] || 0) + 1;
    }
  });
  const serviceDemandData = Object.entries(serviceCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // 3. Next 48 Hours Focus
  const fortyEightHoursOut = new Date(today);
  fortyEightHoursOut.setHours(fortyEightHoursOut.getHours() + 48);
  const priorityEvents = bookings.filter(b => {
    const bDate = new Date(b.startDate);
    return bDate >= today && bDate <= fortyEightHoursOut && (b.status === 'confirmed' || b.status === 'reserved');
  }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const stats = [
    { label: 'Confirmed Events', value: confirmedCount, icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />, bg: 'bg-[#112a1f]', border: 'border-emerald-500/20' },
    { label: 'Conflicts Found', value: conflicts.length, icon: <ShieldAlert className={`w-6 h-6 ${conflicts.length > 0 ? 'text-red-400' : 'text-slate-400'}`} />, bg: conflicts.length > 0 ? 'bg-red-950' : 'bg-[#0f172a]', border: conflicts.length > 0 ? 'border-red-500/40' : 'border-white/5' },
    { label: 'Action Required', value: pendingCount, icon: <ListFilter className="w-6 h-6 text-amber-400" />, bg: 'bg-[#1e1b10]', border: 'border-amber-500/20' },
    { label: 'Total Attendees', value: totalParticipants.toLocaleString(), icon: <Users className="w-6 h-6 text-sky-400" />, bg: 'bg-[#082f49]', border: 'border-sky-500/20' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#111827]/95 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl">
          <p className="font-bold text-white mb-1">{label}</p>
          <p className="text-[#2ed18a] font-black text-sm">
            {payload[0].value} {payload[0].name === 'count' ? 'Events' : 'Requests'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="pb-12" style={{ animation: 'fade-in-up 0.6s cubic-bezier(0.16,1,0.3,1) both' }}>
      
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">Analytics Dashboard</h1>
          <p className="text-slate-500 mt-2 font-medium">Real-time overview of conference center utilization and request volume.</p>
        </div>
        <div className="bg-white px-4 py-2 border border-slate-200 rounded-lg shadow-sm text-sm font-bold text-slate-700 flex items-center gap-2">
           <Calendar className="w-4 h-4 text-[#268053]" /> Last 30 Days
        </div>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`${s.bg} rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-b-4 ${s.border} hover:-translate-y-2 hover:shadow-2xl transition-all duration-500 relative overflow-hidden group cursor-default`}
            style={{ animation: `fade-in-up 0.6s cubic-bezier(0.16,1,0.3,1) ${100 * i}ms both` }}
          >
            <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/5 group-hover:bg-white/10 transition-all duration-700 pointer-events-none blur-2xl" />
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform duration-500">
                {s.icon}
              </div>
              {((s.label === 'Action Required' || s.label === 'Conflicts Found') && typeof s.value === 'number' && s.value > 0) && (
                <span className="flex h-2 w-2 relative">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${s.label === 'Conflicts Found' ? 'bg-red-400' : 'bg-amber-400'} opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${s.label === 'Conflicts Found' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                </span>
              )}
            </div>
            <div className="relative z-10">
              <div className="flex items-baseline gap-1">
                <p className="text-4xl font-black text-white tracking-tight mb-1">{s.value}</p>
              </div>
              <p className="text-[10px] font-black text-white/40 tracking-[0.2em] uppercase">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Predictive Planning Row */}
      <div className="grid gap-8 lg:grid-cols-7 mb-8">
        
        {/* Weekly Forecast Chart - 4 columns */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-8 shadow-[0_40px_80px_rgba(0,0,0,0.03)] border border-slate-100" style={{ animation: 'fade-in-up 0.6s cubic-bezier(0.16,1,0.3,1) 400ms both' }}>
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#268053] flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight font-serif">Weekly Load Forecast</h3>
                <p className="text-sm text-slate-500 font-medium">Predicted event volume for the next 7 days</p>
              </div>
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} 
                  dy={10}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="count" 
                  fill="#268053" 
                  radius={[6, 6, 0, 0]} 
                  barSize={32}
                  animationBegin={500}
                >
                  {forecastData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.count >= 3 ? '#ef4444' : entry.count >= 2 ? '#f59e0b' : '#268053'} 
                      fillOpacity={0.9}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 flex items-center gap-6 justify-center">
             <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#268053]"></div><span className="text-[10px] font-black uppercase text-slate-400">Normal</span></div>
             <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div><span className="text-[10px] font-black uppercase text-slate-400">High Load</span></div>
             <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ef4444]"></div><span className="text-[10px] font-black uppercase text-slate-400">Peak Capacity</span></div>
          </div>
        </div>

        {/* Service Demand Breakdown - 3 columns */}
        <div className="lg:col-span-3 bg-white rounded-3xl p-8 shadow-[0_40px_80px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col" style={{ animation: 'fade-in-up 0.6s cubic-bezier(0.16,1,0.3,1) 500ms both' }}>
          <div className="mb-6 flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight font-serif">Resource Bottlenecks</h3>
              <p className="text-sm text-slate-500 font-medium font-medium">Alerts for high-demand services</p>
            </div>
          </div>
          
          <div className="flex-1 space-y-4 overflow-y-auto">
             {bottleneckAlerts.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-center opacity-40 grayscale translate-y-[-20px]">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />
                  <p className="text-xs font-black uppercase tracking-widest">Inventory OK</p>
               </div>
             ) : (
               bottleneckAlerts.map((a: any) => (
                 <div key={a.name} className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center justify-between">
                    <div>
                       <p className="text-sm font-black text-red-900">{a.name}</p>
                       <p className="text-[10px] font-bold text-red-600 uppercase">Peak Demand: {a.peakUsage} units</p>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-black text-red-800 tracking-tighter">SHORTAGE: {a.peakUsage - a.limit}</p>
                    </div>
                 </div>
               ))
             )}
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-100">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Staffing Suggested</p>
             <div className="flex gap-4">
                <div className="flex-1 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                   <p className="text-lg font-black text-slate-800 leading-none">{stats[2].value}</p>
                   <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Ushers</p>
                </div>
                <div className="flex-1 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                   <p className="text-lg font-black text-slate-800 leading-none">{Math.ceil(totalParticipants / 100)}</p>
                   <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Security</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* High Priority Ready List */}
      <div className="bg-white rounded-3xl p-8 shadow-[0_40px_80px_rgba(0,0,0,0.03)] border border-slate-100" style={{ animation: 'fade-in-up 0.6s cubic-bezier(0.16,1,0.3,1) 600ms both' }}>
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight font-serif">Next 48 Hours: Operational Focus</h3>
                <p className="text-sm text-slate-500 font-medium font-medium">Critical events requiring immediate room setup and service mobilization</p>
              </div>
           </div>
           <button className="text-[11px] font-black uppercase text-[#268053] tracking-widest hover:translate-x-1 transition-transform flex items-center gap-2">
              Full Schedule <ArrowRight className="w-4 h-4" />
           </button>
        </div>

        {priorityEvents.length === 0 ? (
          <div className="py-20 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
             <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
             <p className="text-sm font-bold text-slate-400">All spaces prepared. No critical events in the immediate horizon.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {priorityEvents.map(b => {
              const venue = venues.find(v => v.id === b.venueId);
              const isUrgent = b.status === 'reserved';
              return (
                <div key={b.id} className="flex items-center gap-6 p-6 bg-[#f8fafc] hover:bg-white hover:shadow-xl hover:border-emerald-100 border border-transparent rounded-2xl transition-all duration-300 group cursor-pointer">
                  <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border-b-4 ${isUrgent ? 'bg-amber-100 text-amber-600 border-amber-500/20' : 'bg-emerald-100 text-emerald-600 border-emerald-500/20'}`}>
                    <span className="text-[10px] font-black uppercase leading-none mb-1">{format(new Date(b.startDate), 'MMM')}</span>
                    <span className="text-xl font-black leading-none">{format(new Date(b.startDate), 'dd')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-black text-slate-900 group-hover:text-[#268053] transition-colors truncate">{b.eventTitle}</p>
                      {isUrgent && <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded-full animate-pulse">ACTION REQ</span>}
                      {conflicts.some(c => c.id === b.id) && <span className="px-2 py-0.5 bg-red-600 text-white text-[9px] font-black rounded-full">CONFLICT</span>}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                        <Building2 className="w-3.5 h-3.5" /> {venue?.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                        <Users className="w-3.5 h-3.5" /> {b.participantCount} Max
                      </div>
                    </div>
                  </div>
                  <div className="hidden sm:flex flex-col items-end shrink-0">
                    <span className="text-[11px] font-black text-slate-400 tracking-tighter uppercase">{b.startTime} - {b.endTime}</span>
                    <p className="text-[10px] font-bold text-emerald-600 mt-1 uppercase tracking-tighter">Setup Required</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Venue Popularity Row */}
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
         <div className="bg-white rounded-3xl p-8 shadow-[0_40px_80px_rgba(0,0,0,0.03)] border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight font-serif mb-6">Venue Popularity</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={venueUsage}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="bookings"
                  >
                    {venueUsage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
               {venueUsage.slice(0, 4).map((v, i) => (
                 <div key={v.name} className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                   <span className="text-[10px] font-bold text-slate-600 truncate">{v.name} ({v.bookings})</span>
                 </div>
               ))}
            </div>
         </div>
         
         <div className="bg-[#0f172a] rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col justify-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
            <h3 className="text-2xl font-serif font-bold text-white mb-2 relative z-10">Capacity & Scaling</h3>
            <p className="text-slate-400 text-sm mb-8 relative z-10">Venue types currently under high demand.</p>
            
            <div className="space-y-4 relative z-10">
               {Array.from(new Set(venues.map(v => v.type))).slice(0, 3).map(type => {
                 const count = activeBookings.filter(b => venues.find(v => v.id === b.venueId)?.type === type).length;
                 const max = venues.filter(v => v.type === type).length;
                 const percent = max > 0 ? (count / 2) * 100 : 0; // Simple simulation or logic
                 return (
                   <div key={type}>
                      <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1.5">
                         <span>{type}</span>
                         <span>{count} Active</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                         <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (count * 20) + 10)}%` }}></div>
                      </div>
                   </div>
                 );
               })}
            </div>
         </div>
      </div>
    </div>
  );
}
