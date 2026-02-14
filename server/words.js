// Word pairs: [crewWord, blurWord] - similar but different (Super Ra)
export const WORD_PAIRS = [
  ['Pizza', 'Pasta'],
  ['Doctor', 'Nurse'],
  ['Beach', 'Pool'],
  ['Coffee', 'Tea'],
  ['Cat', 'Dog'],
  ['Book', 'Movie'],
  ['Sun', 'Moon'],
  ['Car', 'Bus'],
  ['Apple', 'Orange'],
  ['Rain', 'Snow'],
  ['Football', 'Basketball'],
  ['Piano', 'Guitar'],
  ['River', 'Lake'],
  ['Mountain', 'Hill'],
  ['Chair', 'Table'],
  ['Phone', 'Computer'],
  ['Breakfast', 'Lunch'],
  ['Summer', 'Winter'],
  ['Teacher', 'Student'],
  ['Writer', 'Author'],
  ['Singer', 'Actor'],
  ['Camera', 'Photo'],
  ['Hotel', 'Restaurant'],
  ['Train', 'Airplane'],
  ['Shirt', 'Jacket'],
  ['Bread', 'Butter'],
  ['Dance', 'Music'],
  ['Game', 'Sport'],
  ['Flower', 'Tree'],
  ['King', 'Queen'],
  ['Gold', 'Silver'],
  ['Village', 'City'],
  ['Baby', 'Child'],
  ['Brother', 'Sister'],
  ['Morning', 'Evening'],
  ['Kitchen', 'Bathroom'],
  ['Garden', 'Park'],
  ['Bridge', 'Road'],
  ['Key', 'Lock'],
  ['Pen', 'Pencil'],
];

export function getRandomWordPair() {
  return WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
}

// Role counts: crew (same word), blur (different word), blank (no word)
export function suggestRoles(playerCount) {
  if (playerCount <= 2) return { crew: 2, blur: 0, blank: 0 };
  if (playerCount <= 4) return { crew: playerCount - 1, blur: 1, blank: 0 };
  if (playerCount <= 6) return { crew: playerCount - 2, blur: 1, blank: 1 };
  if (playerCount <= 9) return { crew: playerCount - 2, blur: 1, blank: 1 };
  if (playerCount <= 12) return { crew: playerCount - 3, blur: 2, blank: 1 };
  return { crew: playerCount - 4, blur: 2, blank: 2 };
}
