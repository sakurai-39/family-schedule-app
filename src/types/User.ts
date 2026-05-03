export interface User {
  userId: string;
  displayName: string;
  accountName: string;
  email: string;
  householdId: string | null;
  createdAt: Date;
}

export const DISPLAY_NAME_MAX_LENGTH = 6;
