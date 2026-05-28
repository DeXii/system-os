import { EQUIPMENT_FORBIDDEN } from '../rules/equipment.rules';

export function exerciseIdAllowed(
  exerciseId: string,
  allowedIds: string[] | undefined
): boolean {
  if (!allowedIds?.length) return true;
  return allowedIds.includes(exerciseId);
}

export function payloadUsesForbiddenEquipment(payload: Record<string, unknown>): boolean {
  const text = JSON.stringify(payload).toLowerCase();
  return EQUIPMENT_FORBIDDEN.some((f) => text.includes(f.replace(/_/g, ' ')) || text.includes(f));
}
