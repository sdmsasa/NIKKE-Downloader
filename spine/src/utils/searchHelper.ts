/**
 * Smart Search Helper for Korean/English/ID multi-attribute searching
 */

export function getSearchVariants(rawQuery: string): string[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  const variants = new Set<string>();
  variants.add(query);
  variants.add(query.replace(/\s+/g, '')); // Space-removed

  // Handle Korean '디' IME prefix typo before English words (e.g. '디 iesel' -> 'diesel', '디 elta' -> 'delta', '디 : Killer Wife' -> 'd: killer wife')
  if (query.startsWith('디 ') || query.startsWith('디')) {
    const stripped = query.replace(/^디\s*/, '');
    if (stripped) {
      variants.add(`d ${stripped}`);
      variants.add(`d${stripped}`);
      variants.add(stripped);
    } else {
      variants.add('d');
    }
  }

  // Handle Korean '케이' IME prefix (e.g. '케이 undercover' -> 'k undercover')
  if (query.startsWith('케이 ') || query.startsWith('케이')) {
    const stripped = query.replace(/^케이\s*/, '');
    if (stripped) {
      variants.add(`k ${stripped}`);
      variants.add(`k${stripped}`);
    } else {
      variants.add('k');
    }
  }

  // Handle 2B phonetic
  if (query === '투비' || query === '투 비') {
    variants.add('2b');
  }

  return Array.from(variants);
}

export function matchSearchQuery(
  item: { id: string; name: string; displayName?: string; krName?: string; subInfo?: string },
  queryVariants: string[]
): boolean {
  if (queryVariants.length === 0) return true;

  const sanitize = (s: string) => s.toLowerCase().replace(/[:()_\-\s]/g, '');

  const idLower = item.id.toLowerCase();
  const nameLower = item.name.toLowerCase();
  const nameNoSpace = nameLower.replace(/\s+/g, '');
  const nameSanitized = sanitize(item.name);
  
  const displayLower = (item.displayName || item.krName || '').toLowerCase();
  const displayNoSpace = displayLower.replace(/\s+/g, '');
  const displaySanitized = sanitize(displayLower);

  const subInfoLower = (item.subInfo || '').toLowerCase();
  const subInfoNoSpace = subInfoLower.replace(/\s+/g, '');
  const subInfoSanitized = sanitize(subInfoLower);

  return queryVariants.some((q) => {
    const qSanitized = sanitize(q);
    return (
      idLower.includes(q) ||
      nameLower.includes(q) ||
      nameNoSpace.includes(q) ||
      (nameSanitized && qSanitized && nameSanitized.includes(qSanitized)) ||
      displayLower.includes(q) ||
      displayNoSpace.includes(q) ||
      (displaySanitized && qSanitized && displaySanitized.includes(qSanitized)) ||
      subInfoLower.includes(q) ||
      subInfoNoSpace.includes(q) ||
      (subInfoSanitized && qSanitized && subInfoSanitized.includes(qSanitized))
    );
  });
}
