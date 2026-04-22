export const STUDIO_EXAMPLES = [
  {
    id: '1',
    title: 'Cyberpunk Tokyo',
    description: 'A neon-drenched rainy night in Shibuya, hyper-realistic reflections.',
    thumbnail: 'https://picsum.photos/seed/cyberpunk/800/450',
    prompt: 'A cinematic wide shot of a rainy night in Tokyo, neon lights reflecting in puddles, futuristic cars passing by.'
  },
  {
    id: '2',
    title: 'Golden Forest',
    description: 'A majestic white owl flying through a sun-drenched autumn forest.',
    thumbnail: 'https://picsum.photos/seed/forest/800/450',
    prompt: 'Close up of a white owl flying through a golden forest at sunset, light rays breaking through the canopy.'
  },
  {
    id: '3',
    title: 'Space Transit',
    description: 'An astronaut floating through a vibrant nebula with cosmic dust.',
    thumbnail: 'https://picsum.photos/seed/space/800/450',
    prompt: 'An astronaut in a white suit floating through a colorful blue and purple nebula, cosmic particles shimmering.'
  }
];

export const ART_STYLES = [
  { id: 'cinematic', label: 'Realistic / واقعي', icon: '🎥' },
  { id: 'anime', label: 'Anime / أنيمي', icon: '🎌' },
  { id: 'impressionist', label: 'Impressionist / انطباعي', icon: '🎨' },
  { id: '3d', label: '3D Render / ثلاثي الأبعاد', icon: '🧊' }
];

export const MOODS = [
  { id: 'happy', label: 'Happy / سعيد', icon: '😊' },
  { id: 'dramatic', label: 'Dramatic / درامي', icon: '🎭' },
  { id: 'calm', label: 'Calm / هادئ', icon: '🌊' },
  { id: 'suspense', label: 'Suspense / تشويق', icon: '🕵️' }
];

export const VOICES = [
  // Arabic - Male - Child
  { id: 'ar-m-y-1', label: 'زيد (طفل عربي)', category: 'Arabic', age: 'Child', gender: 'Male' },
  { id: 'ar-m-y-2', label: 'عمر (طفل عربي)', category: 'Arabic', age: 'Child', gender: 'Male' },
  { id: 'ar-m-y-3', label: 'ياسين (طفل عربي)', category: 'Arabic', age: 'Child', gender: 'Male' },
  { id: 'ar-m-y-4', label: 'جاد (طفل عربي)', category: 'Arabic', age: 'Child', gender: 'Male' },
  { id: 'ar-m-y-5', label: 'ريان (طفل عربي)', category: 'Arabic', age: 'Child', gender: 'Male' },
  // Arabic - Female - Child
  { id: 'ar-f-y-1', label: 'ليان (طفلة عربية)', category: 'Arabic', age: 'Child', gender: 'Female' },
  { id: 'ar-f-y-2', label: 'سارة (طفلة عربية)', category: 'Arabic', age: 'Child', gender: 'Female' },
  { id: 'ar-f-y-3', label: 'ديما (طفلة عربية)', category: 'Arabic', age: 'Child', gender: 'Female' },
  { id: 'ar-f-y-4', label: 'نور (طفلة عربية)', category: 'Arabic', age: 'Child', gender: 'Female' },
  { id: 'ar-f-y-5', label: 'حلا (طفلة عربية)', category: 'Arabic', age: 'Child', gender: 'Female' },
  // Arabic - Male - Adult
  { id: 'ar-m-a-1', label: 'أحمد (رجل عربي - عميق)', category: 'Arabic', age: 'Adult', gender: 'Male' },
  { id: 'ar-m-a-2', label: 'كريم (رجل عربي - هادئ)', category: 'Arabic', age: 'Adult', gender: 'Male' },
  { id: 'ar-m-a-3', label: 'خالد (رجل عربي - قوي)', category: 'Arabic', age: 'Adult', gender: 'Male' },
  { id: 'ar-m-a-4', label: 'سامر (رجل عربي)', category: 'Arabic', age: 'Adult', gender: 'Male' },
  { id: 'ar-m-a-5', label: 'يوسف (رجل عربي)', category: 'Arabic', age: 'Adult', gender: 'Male' },
  // Arabic - Female - Adult
  { id: 'ar-f-a-1', label: 'مريم (سيدة عربية)', category: 'Arabic', age: 'Adult', gender: 'Female' },
  { id: 'ar-f-a-2', label: 'لينا (سيدة عربية - رقيق)', category: 'Arabic', age: 'Adult', gender: 'Female' },
  { id: 'ar-f-a-3', label: 'منى (سيدة عربية)', category: 'Arabic', age: 'Adult', gender: 'Female' },
  { id: 'ar-f-a-4', label: 'سلمى (سيدة عربية)', category: 'Arabic', age: 'Adult', gender: 'Female' },
  { id: 'ar-f-a-5', label: 'هدى (سيدة عربية)', category: 'Arabic', age: 'Adult', gender: 'Female' },
  // Arabic - Male - Old
  { id: 'ar-m-o-1', label: 'أبو أحمد (ختيار عربي)', category: 'Arabic', age: 'Elderly', gender: 'Male' },
  { id: 'ar-m-o-2', label: 'الجد محمود (ختيار عربي)', category: 'Arabic', age: 'Elderly', gender: 'Male' },
  { id: 'ar-m-o-3', label: 'أبو إبراهيم (ختيار عربي)', category: 'Arabic', age: 'Elderly', gender: 'Male' },
  { id: 'ar-m-o-4', label: 'أبو عيسى (ختيار عربي)', category: 'Arabic', age: 'Elderly', gender: 'Male' },
  { id: 'ar-m-o-5', label: 'الخال صالح (ختيار عربي)', category: 'Arabic', age: 'Elderly', gender: 'Male' },
  // Arabic - Female - Old
  { id: 'ar-f-o-1', label: 'أم خالد (ختيارة عربية)', category: 'Arabic', age: 'Elderly', gender: 'Female' },
  { id: 'ar-f-o-2', label: 'الجدة فاطمة (ختيارة عربية)', category: 'Arabic', age: 'Elderly', gender: 'Female' },
  { id: 'ar-f-o-3', label: 'أم سعيد (ختيارة عربية)', category: 'Arabic', age: 'Elderly', gender: 'Female' },
  { id: 'ar-f-o-4', label: 'أم يوسف (ختيارة عربية)', category: 'Arabic', age: 'Elderly', gender: 'Female' },
  { id: 'ar-f-o-5', label: 'الخالة صفية (ختيارة عربية)', category: 'Arabic', age: 'Elderly', gender: 'Female' },
  // Foreign - Male - Child
  { id: 'en-m-y-1', label: 'Timmy (Boy)', category: 'Foreign', age: 'Child', gender: 'Male' },
  { id: 'en-m-y-2', label: 'Leo (Boy)', category: 'Foreign', age: 'Child', gender: 'Male' },
  { id: 'en-m-y-3', label: 'Lucas (Boy)', category: 'Foreign', age: 'Child', gender: 'Male' },
  { id: 'en-m-y-4', label: 'Noah (Boy)', category: 'Foreign', age: 'Child', gender: 'Male' },
  { id: 'en-m-y-5', label: 'Jack (Boy)', category: 'Foreign', age: 'Child', gender: 'Male' },
  // Foreign - Female - Child
  { id: 'en-f-y-1', label: 'Lily (Girl)', category: 'Foreign', age: 'Child', gender: 'Female' },
  { id: 'en-f-y-2', label: 'Mia (Girl)', category: 'Foreign', age: 'Child', gender: 'Female' },
  { id: 'en-f-y-3', label: 'Ava (Girl)', category: 'Foreign', age: 'Child', gender: 'Female' },
  { id: 'en-f-y-4', label: 'Chloe (Girl)', category: 'Foreign', age: 'Child', gender: 'Female' },
  { id: 'en-f-y-5', label: 'Sophie (Girl)', category: 'Foreign', age: 'Child', gender: 'Female' },
  // Foreign - Male - Adult
  { id: 'en-m-a-1', label: 'John (Narrator)', category: 'Foreign', age: 'Adult', gender: 'Male' },
  { id: 'en-m-a-2', label: 'Michael (Man)', category: 'Foreign', age: 'Adult', gender: 'Male' },
  { id: 'en-m-a-3', label: 'Robert (Deep Man)', category: 'Foreign', age: 'Adult', gender: 'Male' },
  { id: 'en-m-a-4', label: 'David (Man)', category: 'Foreign', age: 'Adult', gender: 'Male' },
  { id: 'en-m-a-5', label: 'William (Man)', category: 'Foreign', age: 'Adult', gender: 'Male' },
  // Foreign - Female - Adult
  { id: 'en-f-a-1', label: 'Emma (Woman)', category: 'Foreign', age: 'Adult', gender: 'Female' },
  { id: 'en-f-a-2', label: 'Olivia (Woman)', category: 'Foreign', age: 'Adult', gender: 'Female' },
  { id: 'en-f-a-3', label: 'Sophia (Woman)', category: 'Foreign', age: 'Adult', gender: 'Female' },
  { id: 'en-f-a-4', label: 'Isabella (Woman)', category: 'Foreign', age: 'Adult', gender: 'Female' },
  { id: 'en-f-a-5', label: 'Grace (Woman)', category: 'Foreign', age: 'Adult', gender: 'Female' },
  // Foreign - Male - Old
  { id: 'en-m-o-1', label: 'Arthur (Elderly Man)', category: 'Foreign', age: 'Elderly', gender: 'Male' },
  { id: 'en-m-o-2', label: 'Grandpa Joe', category: 'Foreign', age: 'Elderly', gender: 'Male' },
  { id: 'en-m-o-3', label: 'Henry (Elderly Man)', category: 'Foreign', age: 'Elderly', gender: 'Male' },
  { id: 'en-m-o-4', label: 'Edward (Elderly Man)', category: 'Foreign', age: 'Elderly', gender: 'Male' },
  { id: 'en-m-o-5', label: 'Charles (Elderly Man)', category: 'Foreign', age: 'Elderly', gender: 'Male' },
  // Foreign - Female - Old
  { id: 'en-f-o-1', label: 'Rose (Elderly Woman)', category: 'Foreign', age: 'Elderly', gender: 'Female' },
  { id: 'en-f-o-2', label: 'Martha (Elderly Woman)', category: 'Foreign', age: 'Elderly', gender: 'Female' },
  { id: 'en-f-o-3', label: 'Elizabeth (Elderly Woman)', category: 'Foreign', age: 'Elderly', gender: 'Female' },
  { id: 'en-f-o-4', label: 'Margaret (Elderly Woman)', category: 'Foreign', age: 'Elderly', gender: 'Female' },
  { id: 'en-f-o-5', label: 'Helen (Elderly Woman)', category: 'Foreign', age: 'Elderly', gender: 'Female' }
];

export const LOADING_MESSAGES = [
  "Architecting scene geometry...",
  "Synthesizing light and shadows...",
  "Generating temporal coherence...",
  "Rendering cinematic textures...",
  "Dreaming the motion...",
  "Finalizing visual storytelling..."
];
