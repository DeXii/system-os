export interface GlossaryCacheEntry {
  id: string;
  term: string;
  text: string;
  source: 'dict' | 'ai';
  updatedAt: string;
}
