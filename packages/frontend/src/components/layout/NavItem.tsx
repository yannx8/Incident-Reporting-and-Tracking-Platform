import React from 'react';
import { useNavigate } from 'react-router-dom';

export function NavItem({ to, icon, text, active }: { to: string; icon: React.ReactNode; text: string; active: boolean }) {
  const nav = useNavigate();
  return (
    <button className={`nav-item${active ? ' nav-active' : ''}`} onClick={() => nav(to)}>
      {React.cloneElement(icon as React.ReactElement, { size: 18, strokeWidth: active ? 2.3 : 1.8 })}
      <span>{text}</span>
    </button>
  );
}
