import { db, dateKeyDaysAgo } from '../db';
import type { ContactProfile, InfluenceEntry } from '../domain/types';

export async function getContactsSummary(): Promise<{
  total: number;
  withRecentInteraction7d: number;
  needingDebrief: ContactProfile[];
}> {
  const contacts = await db.contacts.toArray();
  const since = dateKeyDaysAgo(6);
  const entries = await db.influenceEntries.where('date').aboveOrEqual(since).toArray();
  const contactIdsWithActivity = new Set(
    entries.filter((e) => e.contactId).map((e) => e.contactId!)
  );

  const needingDebrief: ContactProfile[] = [];
  const since14 = dateKeyDaysAgo(13);

  for (const c of contacts) {
    const recent = await db.influenceEntries
      .where('date')
      .aboveOrEqual(since14)
      .filter((e) => e.contactId === c.id)
      .toArray();
    const hasObservation = recent.some((e) => e.type === 'observation' || e.type === 'debrief');
    const hasMi = recent.some((e) => e.type === 'mi');
    if ((hasMi || recent.length > 0) && !hasObservation && contacts.length > 0) {
      needingDebrief.push(c);
    }
  }

  return {
    total: contacts.length,
    withRecentInteraction7d: contactIdsWithActivity.size,
    needingDebrief: needingDebrief.slice(0, 5),
  };
}

export async function getContactWithHistory(contactId: string): Promise<{
  contact: ContactProfile | undefined;
  entries: InfluenceEntry[];
}> {
  const contact = await db.contacts.get(contactId);
  const entries = await db.influenceEntries
    .filter((e) => e.contactId === contactId)
    .toArray();
  entries.sort((a, b) => b.date.localeCompare(a.date));
  return { contact, entries: entries.slice(0, 12) };
}

export async function getActiveContactsForContext(limit = 8): Promise<ContactProfile[]> {
  const contacts = await db.contacts.orderBy('updatedAt').reverse().limit(limit).toArray();
  return contacts;
}
