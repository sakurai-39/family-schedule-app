export interface Household {
  householdId: string;
  members: string[];
  createdAt: Date;
  inviteCode: string | null;
  inviteCodeExpiresAt: Date | null;
}

export const HOUSEHOLD_MAX_MEMBERS = 2;
export const INVITE_CODE_LENGTH = 6;
export const INVITE_CODE_EXPIRY_HOURS = 24;
