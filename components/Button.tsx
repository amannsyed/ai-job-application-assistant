
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ children, className, variant = 'primary', ...props }) => {
  const baseStyle = "rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-150 ease-in-out transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  let variantStyle = '';
  if (variant === 'primary') {
    variantStyle = "bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white focus:ring-sky-500";
  } else if (variant === 'secondary') {
    variantStyle = "bg-slate-600 hover:bg-slate-500 text-slate-100 focus:ring-slate-500";
  }

  return (
    <button
      className={`${baseStyle} ${variantStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
