"use client";
import { User, Clock, Bot, CheckCircle, PauseCircle, Play, Trash2, XCircle, Wrench, MoreHorizontal, Calendar } from 'lucide-react';

export default function TicketCard({ item, isAdmin = false, onAction, onCancel, onDelete, assignedMechanicName }: any) {
  
  // Konfigurasi Warna Status (Modern Palette)
  const statusConfig: any = {
    processing: {
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-500',
      label: 'SEDANG DIKERJAKAN',
      icon: <Wrench size={14} className="animate-pulse"/>
    },
    waiting_part: {
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-500',
      label: 'MENUNGGU SPAREPART',
      icon: <PauseCircle size={14}/>
    },
    done: {
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-500',
      label: 'SELESAI',
      icon: <CheckCircle size={14}/>
    },
    pending: {
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-500',
      label: 'DITUNDA / PENDING',
      icon: <Clock size={14}/>
    },
    waiting: {
      color: 'text-slate-500',
      bg: 'bg-slate-100',
      border: 'border-slate-400',
      label: 'MENUNGGU ANTRIAN',
      icon: <User size={14}/>
    },
    cancelled: {
      color: 'text-red-500',
      bg: 'bg-red-50',
      border: 'border-red-400',
      label: 'DIBATALKAN',
      icon: <XCircle size={14}/>
    }
  };

  const currentStatus = statusConfig[item.status] || statusConfig.waiting;

  return (
    <div className={`group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden ${item.status === 'done' ? 'opacity-75 grayscale-[0.3] hover:opacity-100 hover:grayscale-0' : ''}`}>
      
      {/* --- STATUS STRIP BAR (Left Accent) --- */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${currentStatus.bg.replace('bg-', 'bg-gradient-to-b from-') + ' to-white'}`}></div>

      <div className="p-5 pl-7">
        {/* HEADER: No Antrian & Status Badge */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Nomor Antrian</span>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter">
              A-<span className="text-4xl">{String(item.no_antrian).padStart(3, '0')}</span>
            </h2>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide flex items-center gap-1.5 border ${currentStatus.bg} ${currentStatus.color} ${currentStatus.border.replace('border-l-4', 'border').replace('border-', 'border-opacity-20 border-')}`}>
             {currentStatus.icon}
             {currentStatus.label}
          </div>
        </div>

        {/* BODY: Customer & Issue */}
        <div className="space-y-3">
            {/* Customer Name */}
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <User size={16} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 text-sm">{item.costumer_name}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1"><Calendar size={10}/> {new Date(item.created_at).toLocaleDateString('id-ID')}</span>
                        {item.estimated_mins && (
                            <span className="flex items-center gap-1 font-medium text-slate-500"><Clock size={10}/> ± {item.estimated_mins} mnt</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Issue Box */}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 relative">
                <div className="absolute top-3 left-3 opacity-10">
                    <Wrench size={40} className="text-slate-800"/>
                </div>
                <p className="text-xs text-slate-600 font-medium relative z-10 line-clamp-2 leading-relaxed">
                    "{item.issue}"
                </p>
                {item.ai_analysis && (
                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-1.5">
                        <Bot size={12} className="text-emerald-500"/>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">AI Analysis:</span>
                        <span className="text-[10px] text-emerald-700 truncate">{item.ai_analysis}</span>
                    </div>
                )}
            </div>

            {/* Mechanic Assigned */}
            {assignedMechanicName ? (
                <div className="flex items-center gap-2 mt-2 bg-blue-50/50 px-3 py-2 rounded-lg border border-blue-100/50">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="text-xs text-slate-500">Mekanik:</span>
                    <span className="text-xs font-bold text-blue-700">{assignedMechanicName}</span>
                </div>
            ) : (
                <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg border border-dashed border-slate-200">
                    <span className="text-xs text-slate-400 italic">Belum ada mekanik</span>
                </div>
            )}
        </div>

        {/* FOOTER: Actions */}
        {isAdmin && (
          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
            
            {/* Tombol Utama (Kiri) */}
            <div className="col-span-2 sm:col-span-1 flex gap-2">
                {item.status === 'processing' ? (
                    <button 
                        onClick={() => onAction(item.id, 'done')} 
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group/btn"
                    >
                        <CheckCircle size={14} className="group-hover/btn:scale-110 transition-transform"/> Selesai
                    </button>
                ) : (item.status === 'pending' || item.status === 'waiting_part') ? (
                    <button 
                        onClick={() => onAction(item.id, 'resume')} 
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
                    >
                        <Play size={14} className="fill-current"/> Lanjut
                    </button>
                ) : item.status === 'waiting' ? (
                     <button className="flex-1 bg-slate-100 text-slate-400 text-xs font-bold py-2 rounded-lg cursor-not-allowed flex items-center justify-center gap-2">
                        Menunggu...
                    </button>
                ) : null}
            </div>

            {/* Tombol Sekunder (Kanan) */}
            <div className="col-span-2 sm:col-span-1 flex gap-2 justify-end">
                 {item.status === 'processing' && (
                    <button onClick={() => onAction(item.id, 'pending')} title="Pending / Tunggu Part" className="w-10 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 rounded-lg flex items-center justify-center transition-colors">
                        <PauseCircle size={16}/>
                    </button>
                 )}
                 
                 {item.status !== 'done' && item.status !== 'cancelled' && (
                    <button onClick={() => onCancel(item.id)} title="Batalkan" className="w-10 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 border border-slate-200 hover:border-red-200 rounded-lg flex items-center justify-center transition-colors">
                        <XCircle size={16}/>
                    </button>
                 )}

                 {['waiting', 'done', 'cancelled'].includes(item.status) && (
                     <button onClick={() => onDelete(item.id)} title="Hapus Permanen" className="w-full sm:w-auto px-4 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg flex items-center justify-center gap-2 transition-colors text-xs font-bold">
                        <Trash2 size={14}/> {['done', 'cancelled'].includes(item.status) ? 'Hapus' : ''}
                    </button>
                 )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}