import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-[12px] sm:text-sm font-bold text-slate-700">{label}</label>}
      <input
        className={`block w-full max-w-full min-w-0 appearance-none box-border px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-elleo-purple focus:border-transparent transition-shadow text-[16px] sm:text-sm h-[42px] ${className}`}
        {...props}
      />
    </div>
  );
};