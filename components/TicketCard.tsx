"use client";
import { User, Clock, Bot, CheckCircle, PauseCircle, Play, Trash2, XCircle } from 'lucide-react';

export default function TicketCard({ item, isAdmin = false, onAction, onCancel, onDelete, assignedMechanicName }: any) {
  
  // Warna Status yang lebih soft untuk Light Mode
  const statusStyles: any = {
    processing: 'border-l-4 border-blue-500 bg-white shadow-md ring-1 ring-blue-100',
    waiting_part: 'border-l-4 border-purple-500 bg-purple-50/50 shadow-md',
    done: 'border-l-4 border-emerald-500 bg-white opacity-80 grayscale-[0.5]',
    pending: 'border-l-4 border-orange-400 bg-orange-50/50',
    waiting: 'border-l-4 border-slate-300 bg-white',
    cancelled: 'border-l-4 border-red-300 bg-red-50 opacity-60'
  };

  const badgeStyles: any = {
    processing: 'bg-blue-100 text-blue-700',
    waiting_part: 'bg-purple-100 text-purple-700',
    done: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-orange-100 text-orange-700',
    waiting: 'bg-slate-100 text-slate-600',
    cancelled: 'bg-red-100 text-red-600'
  };

  const statusLabel: any = {
    processing: 'DIKERJAKAN', waiting_part: 'TUNGGU PART', done: 'SELESAI',
    pending: 'PENDING', waiting: 'MENUNGGU', cancelled: 'BATAL'
  };

  return (
    <div className={`p-5 rounded-xl transition-all duration-300 ${statusStyles[item.status] || 'bg-white border border-slate-200'}`}>
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        
        {/* NOMOR ANTRIAN */}
        <div className="flex flex-row sm:flex-col items-center justify-center bg-slate-50 p-3 rounded-lg border border-slate-200 w-full sm:w-auto sm:min-w-[80px]">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Antrian</span>
          <span className="text-3xl font-black text-slate-700">A-{String(item.no_antrian).padStart(3, '0')}</span>
        </div>

        {/* INFO UTAMA */}
        <div className="flex-1 w-full">
           <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <User size={18} className="text-slate-400"/> {item.costumer_name}
                </h3>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${badgeStyles[item.status]}`}>
                    {statusLabel[item.status]}
                </span>
           </div>

           {/* Mekanik Badge */}
           {assignedMechanicName && (
               <div className="mt-1 text-xs font-medium text-blue-600 bg-blue-50 w-fit px-2 py-0.5 rounded border border-blue-100">
                   🔧 {assignedMechanicName}
               </div>
           )}

           <p className="text-slate-600 mt-2 text-sm bg-slate-50 p-2 rounded border border-slate-100 italic">"{item.issue}"</p>
           
           <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
             <span className="flex items-center gap-1 text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded"><Bot size={14}/> {item.ai_analysis || '-'}</span>
             <span className="flex items-center gap-1"><Clock size={14}/> ± {item.estimated_mins} Mins</span>
           </div>
        </div>

        {/* TOMBOL AKSI ADMIN */}
        {isAdmin && (
          <div className="flex flex-col gap-2 w-full sm:w-auto sm:min-w-[140px] pt-4 sm:pt-0 sm:pl-4 sm:border-l border-slate-100">
            {item.status === 'processing' && (
              <>
                <button onClick={() => onAction(item.id, 'done')} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-bold shadow-sm transition">
                  <CheckCircle size={16}/> SELESAI
                </button>
                <button onClick={() => onAction(item.id, 'pending')} className="bg-orange-400 hover:bg-orange-500 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-bold shadow-sm transition">
                  <PauseCircle size={16}/> PENDING
                </button>
              </>
            )}
            {(item.status === 'pending' || item.status === 'waiting_part') && (
              <button onClick={() => onAction(item.id, 'resume')} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-bold shadow-sm animate-pulse transition">
                <Play size={16}/> LANJUT
              </button>
            )}
            {item.status !== 'done' && item.status !== 'cancelled' && (
                <button onClick={() => onCancel(item.id)} className="border border-red-200 text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition">
                    <XCircle size={16}/> BATALKAN
                </button>
            )}
            {['waiting', 'done', 'cancelled'].includes(item.status) && (
              <button onClick={() => onDelete(item.id)} className="bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-500 p-2 rounded-lg flex justify-center w-full transition">
                <Trash2 size={18}/>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}