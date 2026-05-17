import { TITLE_MAX_LENGTH, MEMO_MAX_LENGTH, ScheduledItemDraft } from '../types/CalendarItem';
import { DISPLAY_NAME_MAX_LENGTH } from '../types/User';
import { INVITE_CODE_LENGTH } from '../types/Household';
import { isValidTaskTargetPeriod } from './taskTargetPeriod';

export type ValidationResult = { ok: true } | { ok: false; reason: string };

export function validateDisplayName(value: string): ValidationResult {
  if (value.length === 0) return { ok: false, reason: '呼び名を入力してください' };
  if (value.length > DISPLAY_NAME_MAX_LENGTH) {
    return { ok: false, reason: `${DISPLAY_NAME_MAX_LENGTH}文字以内で入力してください` };
  }
  return { ok: true };
}

export function validateTitle(value: string): ValidationResult {
  if (value.length === 0) return { ok: false, reason: 'タイトルを入力してください' };
  if (value.length > TITLE_MAX_LENGTH) {
    return { ok: false, reason: `${TITLE_MAX_LENGTH}文字以内で入力してください` };
  }
  return { ok: true };
}

export function validateMemo(value: string): ValidationResult {
  if (value.length > MEMO_MAX_LENGTH) {
    return { ok: false, reason: `${MEMO_MAX_LENGTH}文字以内で入力してください` };
  }
  return { ok: true };
}

export function validateInviteCode(value: string): ValidationResult {
  if (value.length !== INVITE_CODE_LENGTH) {
    return { ok: false, reason: `${INVITE_CODE_LENGTH}桁の数字を入力してください` };
  }
  if (!/^\d+$/.test(value)) {
    return { ok: false, reason: '数字のみで入力してください' };
  }
  return { ok: true };
}

export function normalizeInviteCodeInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, INVITE_CODE_LENGTH);
}

// Strip dangerous control chars (U+0000-U+001F) but preserve \t (0x09), \n (0x0A), \r (0x0D)
const CONTROL_CHAR_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;

export function sanitizeText(value: string): string {
  return value.replace(CONTROL_CHAR_PATTERN, '');
}

export function isValidScheduledItem(draft: ScheduledItemDraft): boolean {
  if (!draft.title || draft.title.length === 0) return false;
  if (draft.title.length > TITLE_MAX_LENGTH) return false;
  if (!draft.assignee) return false;

  if (draft.type === 'event') {
    if (!draft.startAt) return false;
  }
  if (draft.type === 'task') {
    if (draft.dueAt !== null && !(draft.dueAt instanceof Date)) return false;
    if (draft.dueAt !== null && draft.targetPeriod !== null) return false;
    if (!isValidTaskTargetPeriod(draft.targetPeriod)) return false;
  }
  return true;
}
