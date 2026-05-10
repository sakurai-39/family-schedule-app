import { AssigneeValue } from '../types/CalendarItem';

export type AssigneeRole = 'self' | 'partner' | 'whoever';

export type AssigneeRoleSet = ReadonlySet<AssigneeRole>;

export function deriveRoleSet(
  value: AssigneeValue | null,
  selfId: string,
  partnerId: string | null
): AssigneeRoleSet {
  const roles = new Set<AssigneeRole>();
  if (value === null) return roles;
  if (value === 'whoever') {
    roles.add('whoever');
    return roles;
  }
  if (value === 'both') {
    roles.add('self');
    roles.add('partner');
    return roles;
  }
  if (value === selfId) {
    roles.add('self');
    return roles;
  }
  if (partnerId && value === partnerId) {
    roles.add('partner');
    return roles;
  }
  return roles;
}

export function resolveAssigneeValue(
  roles: AssigneeRoleSet,
  selfId: string,
  partnerId: string | null
): AssigneeValue | null {
  if (roles.has('whoever')) return 'whoever';
  const hasSelf = roles.has('self');
  const hasPartner = roles.has('partner');
  if (hasSelf && hasPartner) return 'both';
  if (hasSelf) return selfId;
  if (hasPartner && partnerId) return partnerId;
  return null;
}

export function toggleRole(current: AssigneeRoleSet, role: AssigneeRole): AssigneeRoleSet {
  const next = new Set(current);
  if (role === 'whoever') {
    if (next.has('whoever')) {
      next.delete('whoever');
    } else {
      next.clear();
      next.add('whoever');
    }
    return next;
  }
  next.delete('whoever');
  if (next.has(role)) {
    next.delete(role);
  } else {
    next.add(role);
  }
  return next;
}
