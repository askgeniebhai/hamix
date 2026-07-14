import React from 'react';
import { twMerge } from 'tailwind-merge';

export const GlassCard = ({ children, className, hover = true }) => {
  return (
    <div className={twMerge(
      'glass p-8',
      hover && 'glass-hover',
      className
    )}>
      {children}
    </div>
  );
};
