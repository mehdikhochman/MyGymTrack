'use client';

import { useActionState, useState } from 'react';
import Submit from './Submit';

type Field = { name: string; label: string; type?: string; autoComplete?: string; value?: string };
type Props = {
  action: (prev: string | undefined, fd: FormData) => Promise<string | undefined>;
  fields: Field[];
  submit: string;
  pending: string;
};

// Small form for the account pages: shows the action's message (error or confirmation) under the fields.
export default function AuthForm({ action, fields, submit, pending }: Props) {
  const [message, run] = useActionState(action, undefined);
  // React resets a form after its action: keep what was typed (except passwords) for the next try.
  const [values, setValues] = useState<Record<string, string>>({});
  return (
    <form action={run} className="stack">
      {fields.map((f) => f.type === 'hidden' ? (
        <input key={f.name} type="hidden" name={f.name} value={f.value} />
      ) : (
        <label key={f.name} className="field">
          {f.label}
          <input name={f.name} type={f.type ?? 'text'} autoComplete={f.autoComplete} required
            {...(f.type !== 'password' && { value: values[f.name] ?? '', onChange: (e) => setValues({ ...values, [f.name]: e.target.value }) })}
            minLength={f.type === 'password' && f.autoComplete === 'new-password' ? 8 : undefined} />
        </label>
      ))}
      {message && <p className={message.startsWith('Si un compte') ? 'ok' : 'error'} role="alert">{message}</p>}
      <Submit className="primary big" pendingText={pending}>{submit}</Submit>
    </form>
  );
}
