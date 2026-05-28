import { useEffect, useState } from 'react';
import { db } from '@/core/db';
import type { ContactProfile } from '@/core/domain/types';

interface Props {
  value: string;
  onChange: (contactId: string) => void;
  allowEmpty?: boolean;
}

export function ContactSelect({ value, onChange, allowEmpty = true }: Props) {
  const [contacts, setContacts] = useState<ContactProfile[]>([]);

  useEffect(() => {
    db.contacts.orderBy('codename').toArray().then(setContacts);
  }, []);

  return (
    <select
      className="select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {allowEmpty && <option value="">— без контакта —</option>}
      {contacts.map((c) => (
        <option key={c.id} value={c.id}>
          {c.codename}
          {c.role ? ` · ${c.role}` : ''}
        </option>
      ))}
    </select>
  );
}
