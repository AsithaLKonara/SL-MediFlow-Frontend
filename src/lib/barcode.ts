export function get10DigitBarcode(str: string): string {
  if (!str) return "0000000000";
  // If it's already exactly 10 digits, return it
  if (/^\d{10}$/.test(str)) return str;

  // Extract all digits from the string
  const digits = str.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.substring(0, 10);
  }

  // Hash the string deterministically to a 10-digit number
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; 
  }
  
  // Convert hash to absolute string and pad with pseudo-random digits based on string length
  let hashStr = Math.abs(hash).toString();
  while (hashStr.length < 10) {
    hashStr += (str.length % 10).toString();
  }
  
  return hashStr.substring(0, 10);
}
