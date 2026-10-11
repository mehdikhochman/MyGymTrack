'use client';

import { useFormStatus } from 'react-dom';

// Submit button that disables itself while its form's action runs.
type Props = { children: React.ReactNode; className?: string; pendingText?: string; confirm?: string };

export default function Submit({ children, className, pendingText, confirm }: Props) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} onClick={(e) => confirm && !window.confirm(confirm) && e.preventDefault()}>
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
