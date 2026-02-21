import React from 'react';
import './AnonymousToggle.css';

interface AnonymousToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  label?: string;
}

export function AnonymousToggle({
  checked,
  onChange,
  disabled = false,
  id,
  label = 'Post anonymously',
}: AnonymousToggleProps) {
  const inputId = id ?? `anon-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <label className="anonymous-toggle" htmlFor={inputId}>
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="anonymous-toggle-input"
      />
      <span className="anonymous-toggle-label">{label}</span>
      <span className="anonymous-toggle-hint">Shows as &quot;Anonymous Community Member&quot;</span>
    </label>
  );
}
