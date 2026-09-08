import React, { HTMLAttributes, forwardRef } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = '', variant = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';
    
    const variants = {
      default: 'border-transparent bg-blue-600 text-white hover:bg-blue-700',
      secondary: 'border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200',
      destructive: 'border-transparent bg-red-600 text-white hover:bg-red-700',
      outline: 'text-gray-950 border-gray-200',
      success: 'border-transparent bg-green-600 text-white hover:bg-green-700',
      warning: 'border-transparent bg-yellow-500 text-white hover:bg-yellow-600',
    };

    const combinedClassName = `${baseStyles} ${variants[variant]} ${className}`;

    return (
      <div ref={ref} className={combinedClassName} {...props} />
    );
  }
);
Badge.displayName = 'Badge';

export { Badge };
