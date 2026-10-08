export function getSriLankaDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
}
