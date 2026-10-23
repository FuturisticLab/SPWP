export type GlowIntensity = 'low' | 'medium' | 'high';

export interface IHeroSlide {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaUrl: string;
  imageUrl: string;
}

export interface INewsItem {
  title: string;
  tag?: string;
  meta: string;
  url: string;
}

export interface IQuickLink {
  label: string;
  url: string;
}

export interface IEventItem {
  title: string;
  when: string;
  url: string;
}

export interface ICyberdyneDashboardProps {
  companyName: string;
  globalSubtitle: string;
  pageHeadline: string;
  accentColor: string;
  glowIntensity: GlowIntensity;

  userDisplayName: string;
  userTitle: string;
  userPhotoUrl: string;

  slides: IHeroSlide[];
  news: INewsItem[];
  quickLinks: IQuickLink[];
  events: IEventItem[];
  topics: string[];

  showEvents: boolean;
  showTrendingTopics: boolean;
  showDirectory: boolean;
  showHeaderAndFooter: boolean;

  directoryUrl: string;
  onSearch: (query: string) => void;
}
