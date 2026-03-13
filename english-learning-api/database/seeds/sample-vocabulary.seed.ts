import { DataSource } from 'typeorm';
import { Vocabulary } from '../../src/vocabulary/entities/vocabulary.entity';

export async function seedVocabulary(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(Vocabulary);

  const words: Partial<Vocabulary>[] = [
    { word: 'hello', phonetic: '/həˈloʊ/', meaning_ko: '안녕하세요', pos: 'interjection', example_en: 'Hello, how are you?', example_ko: '안녕하세요, 어떠세요?', difficulty: 1 },
    { word: 'thank', phonetic: '/θæŋk/', meaning_ko: '감사하다', pos: 'verb', example_en: 'Thank you for your help.', example_ko: '도와주셔서 감사합니다.', difficulty: 1 },
    { word: 'water', phonetic: '/ˈwɔːtər/', meaning_ko: '물', pos: 'noun', example_en: 'Can I have some water?', example_ko: '물 좀 주시겠어요?', difficulty: 1 },
    { word: 'friend', phonetic: '/frɛnd/', meaning_ko: '친구', pos: 'noun', example_en: 'She is my best friend.', example_ko: '그녀는 내 가장 친한 친구입니다.', difficulty: 1 },
    { word: 'happy', phonetic: '/ˈhæpi/', meaning_ko: '행복한', pos: 'adjective', example_en: 'I am very happy today.', example_ko: '오늘 매우 행복합니다.', difficulty: 1 },
    { word: 'beautiful', phonetic: '/ˈbjuːtɪfəl/', meaning_ko: '아름다운', pos: 'adjective', example_en: 'What a beautiful sunset!', example_ko: '정말 아름다운 일몰이네요!', difficulty: 2 },
    { word: 'important', phonetic: '/ɪmˈpɔːrtənt/', meaning_ko: '중요한', pos: 'adjective', example_en: 'This is very important.', example_ko: '이것은 매우 중요합니다.', difficulty: 2 },
    { word: 'understand', phonetic: '/ˌʌndərˈstænd/', meaning_ko: '이해하다', pos: 'verb', example_en: 'Do you understand me?', example_ko: '제 말을 이해하시나요?', difficulty: 2 },
    { word: 'practice', phonetic: '/ˈpræktɪs/', meaning_ko: '연습하다', pos: 'verb', example_en: 'Practice makes perfect.', example_ko: '연습이 완벽을 만듭니다.', difficulty: 2 },
    { word: 'different', phonetic: '/ˈdɪfərənt/', meaning_ko: '다른', pos: 'adjective', example_en: 'They have different opinions.', example_ko: '그들은 다른 의견을 가지고 있습니다.', difficulty: 2 },
    { word: 'experience', phonetic: '/ɪkˈspɪriəns/', meaning_ko: '경험', pos: 'noun', example_en: 'It was a great experience.', example_ko: '정말 좋은 경험이었습니다.', difficulty: 3 },
    { word: 'opportunity', phonetic: '/ˌɑːpərˈtuːnəti/', meaning_ko: '기회', pos: 'noun', example_en: 'This is a great opportunity.', example_ko: '이것은 좋은 기회입니다.', difficulty: 3 },
    { word: 'environment', phonetic: '/ɪnˈvaɪrənmənt/', meaning_ko: '환경', pos: 'noun', example_en: 'We must protect the environment.', example_ko: '우리는 환경을 보호해야 합니다.', difficulty: 3 },
    { word: 'communicate', phonetic: '/kəˈmjuːnɪkeɪt/', meaning_ko: '소통하다', pos: 'verb', example_en: 'We need to communicate better.', example_ko: '우리는 더 잘 소통해야 합니다.', difficulty: 3 },
    { word: 'knowledge', phonetic: '/ˈnɑːlɪdʒ/', meaning_ko: '지식', pos: 'noun', example_en: 'Knowledge is power.', example_ko: '지식은 힘입니다.', difficulty: 3 },
    { word: 'accomplish', phonetic: '/əˈkɑːmplɪʃ/', meaning_ko: '달성하다', pos: 'verb', example_en: 'She accomplished her goal.', example_ko: '그녀는 목표를 달성했습니다.', difficulty: 4 },
    { word: 'consequence', phonetic: '/ˈkɑːnsɪkwɛns/', meaning_ko: '결과', pos: 'noun', example_en: 'Every action has consequences.', example_ko: '모든 행동에는 결과가 있습니다.', difficulty: 4 },
    { word: 'perseverance', phonetic: '/ˌpɜːrsəˈvɪrəns/', meaning_ko: '인내', pos: 'noun', example_en: 'Success requires perseverance.', example_ko: '성공에는 인내가 필요합니다.', difficulty: 4 },
    { word: 'enthusiasm', phonetic: '/ɪnˈθuːziæzəm/', meaning_ko: '열정', pos: 'noun', example_en: 'He showed great enthusiasm.', example_ko: '그는 큰 열정을 보였습니다.', difficulty: 4 },
    { word: 'inevitable', phonetic: '/ɪnˈɛvɪtəbl/', meaning_ko: '불가피한', pos: 'adjective', example_en: 'Change is inevitable.', example_ko: '변화는 불가피합니다.', difficulty: 5 },
  ];

  for (const word of words) {
    const exists = await repo.findOne({ where: { word: word.word!, pos: word.pos! } });
    if (!exists) {
      await repo.save(repo.create(word));
    }
  }

  console.log(`Seeded ${words.length} vocabulary words`);
}
