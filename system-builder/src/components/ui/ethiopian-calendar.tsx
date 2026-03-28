import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EthDateTime } from "ethiopian-calendar-date-converter";
import { isSameDay, isBefore, isWithinInterval } from "date-fns";

export const ETH_MONTHS = ["Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yakatit", "Magabit", "Miyazya", "Ginbot", "Sene", "Hamle", "Nehasse", "Pagume"];
const ETH_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface EthiopianCalendarProps {
  selected?: { from?: Date; to?: Date };
  onSelect?: (range: { from?: Date; to?: Date }) => void;
  bookedDates?: Date[];
  pendingDates?: Date[]; // <-- ADDED THIS!
  disabled?: (date: Date) => boolean;
}

export function EthiopianCalendar({ 
  selected, 
  onSelect, 
  bookedDates = [], 
  pendingDates = [], // <-- ADDED THIS!
  disabled 
}: EthiopianCalendarProps) {
  const today = EthDateTime.now();
  const [view, setView] = useState({ year: today.year, month: today.month });
  
  const prevMonth = () => setView(v => v.month === 1 ? { year: v.year - 1, month: 13 } : { ...v, month: v.month - 1 });
  const nextMonth = () => setView(v => v.month === 13 ? { year: v.year + 1, month: 1 } : { ...v, month: v.month + 1 });

  // Ethiopian months are 30 days, except Pagume (5 days, or 6 in leap years)
  const daysInMonth = view.month === 13 ? (view.year % 4 === 3 ? 6 : 5) : 30;
  
  // Calculate which day of the week the month starts on to offset the grid
  const firstDayGreg = new EthDateTime(view.year, view.month, 1, 0, 0, 0).toEuropeanDate();
  const startOffset = firstDayGreg.getDay() === 0 ? 6 : firstDayGreg.getDay() - 1;

  const renderDays = () => {
    const blanks = Array.from({ length: startOffset }, (_, i) => <div key={`blank-${i}`} className="w-9 h-9" />);
    
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const gregDate = new EthDateTime(view.year, view.month, day, 0, 0, 0).toEuropeanDate();
      
      // Set hours to exactly noon (12:00) so timezone shifts NEVER push it to the previous day
      gregDate.setHours(12, 0, 0, 0);
      
      const isDisabled = disabled ? disabled(gregDate) : false;
      const isBooked = bookedDates.some(b => isSameDay(new Date(b), gregDate));
      
      // NEW: Check if the date is pending (awaiting payment)
      const isPending = pendingDates.some(p => isSameDay(new Date(p), gregDate));
      
      const isSelectedFrom = selected?.from && isSameDay(selected.from, gregDate);
      const isSelectedTo = selected?.to && isSameDay(selected.to, gregDate);
      const isBetween = selected?.from && selected?.to && isWithinInterval(gregDate, { start: selected.from, end: selected.to });
      
      let className = "w-9 h-9 flex items-center justify-center text-sm rounded-md transition-all box-border ";
      
      if (isBooked) {
        className += "bg-red-100 text-red-600 font-bold line-through cursor-not-allowed";
      } else if (isDisabled) {
        className += "text-slate-300 cursor-not-allowed";
      } else if (isSelectedFrom || isSelectedTo) {
        className += "bg-[#268053] text-white font-bold cursor-pointer shadow-md";
      } else if (isBetween) {
        className += "bg-emerald-50 text-emerald-900 cursor-pointer";
      } else if (isPending) {
        // BEAUTIFUL DASHED GREY FOR PENDING DATES (Still clickable!)
        className += "bg-slate-50 text-slate-500 border-2 border-dashed border-slate-300 hover:bg-slate-200 hover:border-slate-400 cursor-pointer font-bold";
      } else {
        className += "hover:bg-slate-100 cursor-pointer text-slate-700";
      }

      return (
        <div 
          key={day} 
          className={className}
          onClick={() => {
             // We block clicks on 'isBooked', but we ALLOW clicks on 'isPending' so the user can snatch it!
             if (isBooked || isDisabled) return;
             if (!selected?.from || (selected?.from && selected?.to)) {
                onSelect?.({ from: gregDate, to: undefined });
             } else {
                if (isBefore(gregDate, selected.from)) {
                   onSelect?.({ from: gregDate, to: selected.from });
                } else {
                   onSelect?.({ from: selected.from, to: gregDate });
                }
             }
          }}
        >
          {day}
        </div>
      );
    });

    return [...blanks, ...days];
  };

  return (
    <div className="p-5 bg-white rounded-2xl shadow-sm border border-slate-100 w-fit select-none">
       <div className="flex items-center justify-between mb-6">
         <button onClick={prevMonth} type="button" className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
           <ChevronLeft className="w-5 h-5 text-slate-600" />
         </button>
         
         <div className="font-black text-[15px] text-slate-800 tracking-tight">
           {ETH_MONTHS[view.month - 1]} {view.year}
         </div>

         <button onClick={nextMonth} type="button" className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
           <ChevronRight className="w-5 h-5 text-slate-600" />
         </button>
       </div>
       <div className="grid grid-cols-7 gap-1.5 mb-3 text-center">
         {ETH_DAYS.map(d => <div key={d} className="w-9 text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>)}
       </div>
       <div className="grid grid-cols-7 gap-1.5">
         {renderDays()}
       </div>

       {/* NEW: Handy legend at the bottom so users know what the colors mean! */}
       <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap justify-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-400">
         <div className="flex items-center gap-1.5">
           <div className="w-3 h-3 rounded-[3px] bg-red-100 border border-red-200"></div> Paid
         </div>
         <div className="flex items-center gap-1.5">
           <div className="w-3 h-3 rounded-[3px] bg-slate-50 border-2 border-dashed border-slate-300"></div> Pending
         </div>
         <div className="flex items-center gap-1.5">
           <div className="w-3 h-3 rounded-[3px] bg-[#268053]"></div> Selected
         </div>
       </div>
    </div>
  );
}