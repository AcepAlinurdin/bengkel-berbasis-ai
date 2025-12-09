import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, icon: Icon, actions }: PageHeaderProps) {
  return (
    <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Icon size={32} />
        </div>
        <div className="text-center md:text-left">
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
            <p className="text-slate-500 text-sm">{subtitle}</p>
        </div>
      </div>
      <div className="flex gap-3 items-center">{actions}</div>
    </div>
  );
}