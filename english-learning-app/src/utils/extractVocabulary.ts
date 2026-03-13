// Common English stop words to filter out
const STOP_WORDS = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your',
  'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her',
  'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs',
  'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if',
  'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with',
  'about', 'against', 'between', 'through', 'during', 'before', 'after', 'above',
  'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under',
  'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
  'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's',
  't', 'can', 'will', 'just', 'don', 'should', 'now', 'd', 'll', 'm', 'o', 're',
  've', 'y', 'ain', 'aren', 'couldn', 'didn', 'doesn', 'hadn', 'hasn', 'haven',
  'isn', 'ma', 'mightn', 'mustn', 'needn', 'shan', 'shouldn', 'wasn', 'weren',
  'won', 'wouldn', 'gonna', 'gotta', 'wanna', 'yeah', 'oh', 'um', 'uh', 'like',
  'okay', 'ok', 'well', 'right', 'got', 'get', 'go', 'going', 'went', 'come',
  'came', 'say', 'said', 'tell', 'told', 'know', 'knew', 'think', 'thought',
  'make', 'made', 'take', 'took', 'see', 'saw', 'look', 'looked', 'want',
  'wanted', 'give', 'gave', 'use', 'used', 'would', 'could', 'also', 'back',
  'even', 'still', 'way', 'really', 'thing', 'things', 'much', 'let', 'put',
  'into', 'something', 'those', 'every', 'been', 'one', 'two', 'first',
  'new', 'good', 'great', 'big', 'long', 'little', 'man', 'day', 'time',
  'people', 'lot', 'actually', 'already', 'always', 'another', 'around',
  'away', 'maybe', 'never', 'yes', 'no', 'hey', 'hi', 'hello', 'bye',
  'please', 'thank', 'thanks', 'sorry', 'music',
  // Contractions (base forms)
  'dont', 'doesnt', 'didnt', 'cant', 'wont', 'wouldnt', 'couldnt', 'shouldnt',
  'isnt', 'arent', 'wasnt', 'werent', 'hasnt', 'havent', 'hadnt',
  'thats', 'whats', 'heres', 'theres', 'lets', 'youre', 'theyre', 'were',
  'youve', 'theyve', 'weve', 'youll', 'theyll', 'well', 'shell', 'hell',
  'its', 'ive', 'hes', 'shes', 'theres',
]);

export interface ExtractedWord {
  word: string;
  count: number;
  sentences: string[]; // example sentences from captions
}

/**
 * Clean a text by removing all non-letter characters except spaces.
 * Handles curly quotes, em-dashes, ellipsis, and other special characters.
 */
function cleanText(text: string): string {
  return text
    // Replace curly/smart quotes and apostrophes with nothing
    .replace(/[\u2018\u2019\u201C\u201D\u0060\u00B4]/g, '')
    // Replace straight apostrophes too
    .replace(/['']/g, '')
    // Replace all remaining non-letter, non-space characters
    .replace(/[^a-zA-Z\s]/g, '')
    .toLowerCase();
}

export function extractVocabulary(
  captionTexts: string[],
  minLength = 4,
  maxWords = 50,
): ExtractedWord[] {
  const wordMap = new Map<string, { count: number; sentences: Set<string> }>();

  for (const text of captionTexts) {
    const cleaned = cleanText(text);
    const words = cleaned.split(/\s+/).filter(Boolean);

    for (const w of words) {
      if (w.length < minLength) continue;
      if (STOP_WORDS.has(w)) continue;
      if (/^\d+$/.test(w)) continue;

      const existing = wordMap.get(w);
      if (existing) {
        existing.count++;
        if (existing.sentences.size < 2) existing.sentences.add(text);
      } else {
        wordMap.set(w, { count: 1, sentences: new Set([text]) });
      }
    }
  }

  return Array.from(wordMap.entries())
    .map(([word, { count, sentences }]) => ({
      word,
      count,
      sentences: Array.from(sentences),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxWords);
}
