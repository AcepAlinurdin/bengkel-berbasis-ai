"use client";
import { Wrench } from 'lucide-react';

export default function MechanicStatus({ mechanics, tickets }: { mechanics: any[], tickets: any[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
      {mechanics.map((mech) => {
        const currentJob = tickets.find(t => t.mechanic_id === mech.id && t.status === 'processing');
        return (
          <div key={mech.id} className={`p-4 rounded-xl border flex flex-col gap-2 transition-all shadow-sm ${currentJob ? 'bg-white border-blue-300 ring-2 ring-blue-50' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-full ${currentJob ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                <Wrench size={20} />
              </div>
              <div>
                <h4 className={`font-bold ${currentJob ? 'text-slate-800' : 'text-slate-500'}`}>{mech.name}</h4>
                <p className="text-xs text-slate-500">{currentJob ? 'Sedang Bekerja' : 'Menunggu Order...'}</p>
              </div>
            </div>
            
            {currentJob && (
                <div className="bg-blue-50 p-2 rounded-lg flex items-center justify-between mt-1 border border-blue-100">
                    <span className="text-xs text-blue-600 font-medium">Mengerjakan:</span>
                    <span className="font-black text-blue-700 text-lg">A-{currentJob.no_antrian}</span>
                </div>
            )}
          </div>
        );
      })}
      
      {mechanics.length === 0 && (
          <div className="col-span-full text-center p-6 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              Belum ada mekanik terdaftar.
          </div>
      )}
    </div>
  );
}