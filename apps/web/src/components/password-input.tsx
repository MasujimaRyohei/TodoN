'use client';

import { useState } from 'react';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

export function PasswordInput({ className = '', ...props }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="todon-password-field">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`todon-input todon-password-input ${className}`.trim()}
      />
      <button
        type="button"
        className="todon-password-toggle"
        aria-label={visible ? 'パスワードを非表示' : 'パスワードを表示'}
        aria-pressed={visible}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? '非表示' : '表示'}
      </button>
    </div>
  );
}
