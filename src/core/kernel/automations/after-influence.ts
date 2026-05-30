import { db, uid } from '../../db';
import type { ContactProfile, InfluenceEntry, Operation } from '../../domain/types';
import { TASK_KEYS } from '@/content/task-keys';
import {
  updateInfluenceParamsFromEntry,
  updateInfluenceParamsFromOperationOutcome,
} from '../../engines/influence-params';
import { emitKernel, emitOsRefresh } from '../../events/event-bus';
import { afterFactWrite } from '../pipeline';
import { completeInfluencePractice } from '../commands/complete';

export async function afterContactSave(
  contact: Omit<ContactProfile, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<ContactProfile> {
  const now = new Date().toISOString();
  let row: ContactProfile;
  if (contact.id) {
    const existing = await db.contacts.get(contact.id);
    row = {
      ...(existing ?? { createdAt: now }),
      ...contact,
      id: contact.id,
      codename: contact.codename,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
  } else {
    row = { ...contact, id: uid(), createdAt: now, updatedAt: now };
  }
  await db.contacts.put(row);
  await afterFactWrite({ type: 'READINESS_INVALIDATED', reason: 'influence_contact' });
  await emitKernel('influence', `Досье: ${row.codename}`, 'success');
  emitOsRefresh();
  return row;
}

export async function afterOperationSave(
  op: Omit<Operation, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<Operation> {
  const now = new Date().toISOString();
  const row: Operation = op.id
    ? { ...(await db.operations.get(op.id))!, ...op, id: op.id, updatedAt: now }
    : {
        ...op,
        id: uid(),
        contactIds: op.contactIds ?? [],
        linkedScenarioIds: op.linkedScenarioIds ?? [],
        linkedDecisionIds: op.linkedDecisionIds ?? [],
        createdAt: now,
        updatedAt: now,
      };
  await db.operations.put(row);
  await afterFactWrite({ type: 'READINESS_INVALIDATED', reason: 'influence_operation' });
  if (row.status === 'won') {
    await updateInfluenceParamsFromOperationOutcome(true);
  } else if (row.status === 'lost') {
    await updateInfluenceParamsFromOperationOutcome(false);
  }
  await emitKernel('influence', `Операция: ${row.title.slice(0, 40)}`, 'success');
  emitOsRefresh();
  return row;
}

async function logInfluenceEntry(
  row: InfluenceEntry,
  taskKey: string,
  message: string
): Promise<InfluenceEntry> {
  await db.influenceEntries.add(row);
  await updateInfluenceParamsFromEntry(row);
  await afterFactWrite({
    type: 'INFLUENCE_LOGGED',
    date: row.date,
    entryId: row.id,
    influenceType: row.type,
  });
  await completeInfluencePractice(taskKey, message, row.date);
  return row;
}

export async function afterMiEntryComplete(
  entry: Omit<InfluenceEntry, 'id'>
): Promise<InfluenceEntry> {
  return logInfluenceEntry(
    { ...entry, id: uid(), type: 'mi' },
    TASK_KEYS.influenceMi,
    `MI (OARS): ${(entry.situation ?? entry.context ?? '').slice(0, 40)}`
  );
}

export async function afterNudgeEntryComplete(
  entry: Omit<InfluenceEntry, 'id'>
): Promise<InfluenceEntry> {
  return logInfluenceEntry(
    { ...entry, id: uid(), type: 'nudge' },
    TASK_KEYS.influenceNudge,
    `Nudge (${entry.nudgeType ?? 'default'}): ${(entry.context ?? '').slice(0, 40)}`
  );
}

export async function afterBiasEntryComplete(
  entry: Omit<InfluenceEntry, 'id'>
): Promise<InfluenceEntry> {
  return logInfluenceEntry(
    { ...entry, id: uid(), type: 'bias' },
    'influence.bias',
    `Bias: ${entry.biasName ?? 'искажение'}`
  );
}

export async function afterProtocolComplete(
  entry: Omit<InfluenceEntry, 'id'>
): Promise<InfluenceEntry> {
  return logInfluenceEntry(
    { ...entry, id: uid(), type: 'protocol' },
    TASK_KEYS.influenceProtocol,
    'Influence Protocol — тактика класса'
  );
}

export async function afterObservationComplete(
  entry: Omit<InfluenceEntry, 'id'>
): Promise<InfluenceEntry> {
  const row: InfluenceEntry = {
    ...entry,
    id: uid(),
    type: entry.type === 'debrief' ? 'debrief' : 'observation',
  };
  return logInfluenceEntry(
    row,
    TASK_KEYS.influenceObservation,
    `${row.type === 'debrief' ? 'Debrief' : 'Наблюдение'}: ${(row.context ?? row.situation ?? '').slice(0, 40)}`
  );
}
