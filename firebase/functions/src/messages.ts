export const GOOD_MORNING_MESSAGES = [
  "Collingclean here, wsg, chore check.",
  "Collingclean here w the daily chore drop.",
  "It's Collingclean, quick house mission incoming.",
  "Collingclean checking in, ur task just landed.",
  "Morning gang, Collingclean here w a chore on deck.",
  "Collingclean on the line, house duty is calling.",
  "Collingclean here, time to keep the spot valid.",
  "It's Collingclean, the crib needs a quick reset.",
  "Collingclean checking in w a chore ping. Lock in.",
  "Collingclean here, handle this jawn real quick.",
  "Wsg, Collingclean here w a tiny task and real impact.",
  "Collingclean here, the chore rotation tapped u in.",
  "It's Collingclean, keep the crib crispy.",
  "Morning, Collingclean here w house points up for grabs.",
  "Collingclean checking in, task dropped. Do ur thing.",
  "Wsp, Collingclean here, the spot needs u.",
  "Collingclean here w a quick cleanup play.",
  "It's Collingclean, today's chore just spawned.",
  "Morning, Collingclean here. Roommate duties are live.",
  "Collingclean checking in w a chore check. Keep it solid.",
  "Wsg, Collingclean here in clean-house mode.",
  "Collingclean here, one household W is available.",
  "It's Collingclean: small task, big respect.",
  "Morning, Collingclean here. Run this chore real quick.",
  "Collingclean checking in, task on deck, gang.",
  "Wsp, Collingclean here, the crib wants order.",
  "Collingclean here. Aight, handle business.",
  "It's Collingclean w a quick domestic side quest.",
  "Morning, Collingclean here. The chore rotation says lock in.",
  "Collingclean checking in w a house ping. Keep it tidy.",
  "Wsg, Collingclean here. Today's task is live.",
  "Collingclean here, don't let the crib get cooked.",
  "It's Collingclean, tidy move incoming.",
  "Morning, Collingclean here w a quick chore jawn.",
  "Collingclean checking in w a chore alert. Make it clean.",
  "Wsp, Collingclean here. Household admin time.",
  "Collingclean here, keep the peace and clear this.",
  "It's Collingclean: one task between u and glory.",
  "Morning, Collingclean here. The clean streak needs u.",
  "Collingclean checking in, task arrived. No stress.",
] as const;

export const INVALID_COMPLETION_MESSAGES = [
  "Reply Y when the chore is handled or S to skip it.",
  "Aight, send Y when that jawn is done or S to skip.",
  "Reply Y to complete the chore or S to skip it, gang.",
  "Send Y when u cleared it, or S if u need to skip.",
  "Bet, I need Y for handled or S for skipped.",
] as const;

export const SKIPPED_MESSAGES = [
  "Aight, skipped and recorded.",
  "Say less, that chore is marked skipped.",
  "Skip logged. The rotation keeps moving.",
] as const;

export const NO_OPEN_REMINDER_MESSAGES = [
  "I got no open chore for this number rn.",
  "No active chore found for u, gang.",
  "Nothing open on my side for this number.",
  "I do not see a chore to close rn.",
  "No live chore found, u might already be clear.",
] as const;

export const THANK_YOU_MESSAGES = [
  "Aight, logged. Thanks.",
  "Bet, chore complete.",
  "Good looks, appreciate it.",
  "Say less, got it.",
  "Aight, that's handled.",
  "Got u, marked complete.",
  "Thanks for handling it.",
  "Bet, we're good.",
  "Good looks, that helps.",
  "Logged, appreciate u.",
  "Aight, all done.",
  "Got it, thanks.",
  "Bet, that jawn is done.",
  "Thanks, just logged it.",
  "Good looks, chore cleared.",
  "Aight, marked as done.",
  "Say less, chore handled.",
  "Got u, thanks for doing it.",
  "Bet, saved.",
  "Thanks, that's taken care of.",
  "Aight, u are all set.",
  "Good looks, we're clear.",
  "Logged. Thanks, gang.",
  "Bet, got that down.",
  "Appreciate it, fr.",
  "Aight, task complete.",
  "Say less, that's done.",
  "Good looks, got it logged.",
  "Bet, appreciate u handling it.",
  "Aight, we can cross that off.",
  "Got it. Thanks for the update.",
  "Logged, good looks.",
  "Thanks, that one's done.",
  "Bet, all taken care of.",
  "Aight, got it marked.",
  "Good looks, that's complete.",
  "Say less, we're good.",
  "Got u, chore's done.",
  "Appreciate u, logged.",
  "Aight, done and saved.",
] as const;

export function goodMorningMessage(): string {
  return randomItem(GOOD_MORNING_MESSAGES);
}

export function thankYouMessage(): string {
  return randomItem(THANK_YOU_MESSAGES);
}

export function invalidCompletionMessage(): string {
  return randomItem(INVALID_COMPLETION_MESSAGES);
}

export function noOpenReminderMessage(): string {
  return randomItem(NO_OPEN_REMINDER_MESSAGES);
}

export function skippedMessage(): string {
  return randomItem(SKIPPED_MESSAGES);
}

function randomItem(items: readonly string[]): string {
  return items[Math.floor(Math.random() * items.length)];
}
