// types.ts

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  isoDate: string; // ✅ Dodaj to vrstico
  content: string;
  contentSnippet: string;
  source: string;
  image: string;
}
