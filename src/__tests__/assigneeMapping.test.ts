import {
  AssigneeRole,
  deriveRoleSet,
  resolveAssigneeValue,
  toggleRole,
} from '../utils/assigneeMapping';

const SELF_ID = 'user-self';
const PARTNER_ID = 'user-partner';

function asSet(roles: AssigneeRole[]): ReadonlySet<AssigneeRole> {
  return new Set(roles);
}

describe('deriveRoleSet', () => {
  it('returns empty set for null', () => {
    expect(Array.from(deriveRoleSet(null, SELF_ID, PARTNER_ID))).toEqual([]);
  });

  it('maps selfId to {self}', () => {
    expect(Array.from(deriveRoleSet(SELF_ID, SELF_ID, PARTNER_ID))).toEqual(['self']);
  });

  it('maps partnerId to {partner}', () => {
    expect(Array.from(deriveRoleSet(PARTNER_ID, SELF_ID, PARTNER_ID))).toEqual(['partner']);
  });

  it("maps 'both' to {self, partner}", () => {
    expect(Array.from(deriveRoleSet('both', SELF_ID, PARTNER_ID)).sort()).toEqual([
      'partner',
      'self',
    ]);
  });

  it("maps 'whoever' to {whoever}", () => {
    expect(Array.from(deriveRoleSet('whoever', SELF_ID, PARTNER_ID))).toEqual(['whoever']);
  });

  it('returns empty set for unknown userId', () => {
    expect(Array.from(deriveRoleSet('user-unknown', SELF_ID, PARTNER_ID))).toEqual([]);
  });

  it('returns empty set when partnerId is null and value matches no one', () => {
    expect(Array.from(deriveRoleSet(PARTNER_ID, SELF_ID, null))).toEqual([]);
  });
});

describe('resolveAssigneeValue', () => {
  it('returns null for empty set', () => {
    expect(resolveAssigneeValue(asSet([]), SELF_ID, PARTNER_ID)).toBeNull();
  });

  it('returns selfId for {self}', () => {
    expect(resolveAssigneeValue(asSet(['self']), SELF_ID, PARTNER_ID)).toBe(SELF_ID);
  });

  it('returns partnerId for {partner}', () => {
    expect(resolveAssigneeValue(asSet(['partner']), SELF_ID, PARTNER_ID)).toBe(PARTNER_ID);
  });

  it("returns 'both' for {self, partner}", () => {
    expect(resolveAssigneeValue(asSet(['self', 'partner']), SELF_ID, PARTNER_ID)).toBe('both');
  });

  it("returns 'whoever' for {whoever}", () => {
    expect(resolveAssigneeValue(asSet(['whoever']), SELF_ID, PARTNER_ID)).toBe('whoever');
  });

  it("prioritizes 'whoever' over self/partner if both somehow present", () => {
    expect(resolveAssigneeValue(asSet(['whoever', 'self']), SELF_ID, PARTNER_ID)).toBe('whoever');
  });

  it('returns null when partner role is set but partnerId is null', () => {
    expect(resolveAssigneeValue(asSet(['partner']), SELF_ID, null)).toBeNull();
  });
});

describe('toggleRole', () => {
  it('adds self to empty set', () => {
    const next = toggleRole(asSet([]), 'self');
    expect(Array.from(next)).toEqual(['self']);
  });

  it('removes self when already in set', () => {
    const next = toggleRole(asSet(['self']), 'self');
    expect(Array.from(next)).toEqual([]);
  });

  it('adds partner to {self} producing {self, partner}', () => {
    const next = toggleRole(asSet(['self']), 'partner');
    expect(Array.from(next).sort()).toEqual(['partner', 'self']);
  });

  it("clears self/partner when 'whoever' is toggled on", () => {
    const next = toggleRole(asSet(['self', 'partner']), 'whoever');
    expect(Array.from(next)).toEqual(['whoever']);
  });

  it("removes 'whoever' when toggled again (empty set)", () => {
    const next = toggleRole(asSet(['whoever']), 'whoever');
    expect(Array.from(next)).toEqual([]);
  });

  it("removes 'whoever' when self is toggled on", () => {
    const next = toggleRole(asSet(['whoever']), 'self');
    expect(Array.from(next)).toEqual(['self']);
  });

  it("removes 'whoever' when partner is toggled on", () => {
    const next = toggleRole(asSet(['whoever']), 'partner');
    expect(Array.from(next)).toEqual(['partner']);
  });

  it('does not mutate the input set', () => {
    const input = asSet(['self']);
    toggleRole(input, 'partner');
    expect(Array.from(input)).toEqual(['self']);
  });
});

describe('round-trip mapping', () => {
  it('selfId → roles → selfId', () => {
    const roles = deriveRoleSet(SELF_ID, SELF_ID, PARTNER_ID);
    expect(resolveAssigneeValue(roles, SELF_ID, PARTNER_ID)).toBe(SELF_ID);
  });

  it("'both' → roles → 'both'", () => {
    const roles = deriveRoleSet('both', SELF_ID, PARTNER_ID);
    expect(resolveAssigneeValue(roles, SELF_ID, PARTNER_ID)).toBe('both');
  });

  it("'whoever' → roles → 'whoever'", () => {
    const roles = deriveRoleSet('whoever', SELF_ID, PARTNER_ID);
    expect(resolveAssigneeValue(roles, SELF_ID, PARTNER_ID)).toBe('whoever');
  });

  it('partnerId → roles → partnerId', () => {
    const roles = deriveRoleSet(PARTNER_ID, SELF_ID, PARTNER_ID);
    expect(resolveAssigneeValue(roles, SELF_ID, PARTNER_ID)).toBe(PARTNER_ID);
  });
});
