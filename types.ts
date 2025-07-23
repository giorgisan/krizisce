// types.ts

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  source: string;
  image: string; // <--- Dodano to!
}
