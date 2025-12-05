import React from 'react';
import { ChevronLeft, Plus, Minus, Search, Calendar, Clock, X, Check } from 'lucide-react';

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-4 ${className} ${onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}>
    {children}
  </div>
);

// --- Buttons ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const base = "font-semibold rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-primary-500 text-white shadow-primary-200 shadow-lg active:bg-primary-600",
    secondary: "bg-emerald-500 text-white shadow-emerald-200 shadow-lg active:bg-emerald-600",
    danger: "bg-red-500 text-white shadow-red-200 shadow-lg active:bg-red-600",
    outline: "border-2 border-primary-500 text-primary-600 bg-transparent active:bg-primary-50",
    ghost: "bg-transparent text-slate-600 active:bg-slate-100",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-3 text-base",
    lg: "px-6 py-4 text-lg w-full",
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const FAB: React.FC<{ icon: React.ReactNode; onClick: () => void; color?: string; label?: string }> = ({ icon, onClick, color = 'bg-primary-500', label }) => (
  <button onClick={onClick} className={`${color} text-white p-4 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform`}>
    {icon}
    {label && <span className="ml-2 font-bold">{label}</span>}
  </button>
);

// --- Inputs ---
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string, icon?: React.ReactNode }> = ({ label, icon, className = '', ...props }) => (
  <div className="w-full mb-4">
    {label && <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{label}</label>}
    <div className="relative">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
      <input 
        className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors ${icon ? 'pl-10' : ''} ${className}`}
        {...props}
      />
    </div>
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({ label, children, className = '', ...props }) => (
  <div className="w-full mb-4">
    {label && <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{label}</label>}
    <div className="relative">
      <select 
        className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white appearance-none ${className}`}
        {...props}
      >
        {children}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
        <ChevronLeft className="w-4 h-4 -rotate-90 text-slate-400" />
      </div>
    </div>
  </div>
);

// --- Badge ---
export const Badge: React.FC<{ children: React.ReactNode; color?: 'green' | 'red' | 'blue' | 'gray' }> = ({ children, color = 'gray' }) => {
  const colors = {
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    gray: "bg-slate-100 text-slate-600",
  };
  return <span className={`${colors[color]} px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide`}>{children}</span>;
}

// --- Header ---
export const Header: React.FC<{ title: string; onBack?: () => void; actions?: React.ReactNode }> = ({ title, onBack, actions }) => (
  <div className="bg-white px-4 py-3 flex items-center shadow-sm sticky top-0 z-10 border-b border-slate-100">
    {onBack && (
      <button onClick={onBack} className="mr-3 p-2 rounded-full hover:bg-slate-100 active:bg-slate-200">
        <ChevronLeft className="w-6 h-6 text-slate-700" />
      </button>
    )}
    <h1 className="text-xl font-bold text-slate-800 flex-1">{title}</h1>
    {actions && <div className="flex gap-2">{actions}</div>}
  </div>
);
