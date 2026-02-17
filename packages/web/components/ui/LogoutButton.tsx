'use client';

import { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface LogoutButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
}

export default function LogoutButton({
  variant = 'secondary',
  className = '',
  showIcon = true,
  children,
}: LogoutButtonProps) {
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    await logout();
    setIsLoading(false);
  };

  const baseClasses = 'btn';
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          {showIcon && <LogOut className="w-5 h-5" />}
          {children || 'Log Out'}
        </>
      )}
    </button>
  );
}
