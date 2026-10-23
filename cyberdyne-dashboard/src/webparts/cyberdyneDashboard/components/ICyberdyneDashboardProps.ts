export interface INewsItem {
  id: string;
  title: string;
  tag: string;
  dateOrAgo: string;
  url: string;
}

export interface IQuickLink {
  id: string;
  label: string;
  url: string;
}

export interface IEventItem {
  id: string;
  title: string;
  dateStr: string;
  timeStr: string;
  url?: string;
}

export interface ICyberdyneDashboardProps {
  companyName: string;
  globalSubtitle: string;
  pageHeadline: string;
  accentColor: string;
  glowIntensity: 'low' | 'medium' | 'high';
  userName: string;
  userTitle: string;
  userAvatarUrl?: string;

  heroTitle: string;
  heroSubtitle: string;
  heroCtaText: string;
  heroCtaUrl: string;
  heroBgImage: string;

  showDirectory: boolean;
  showTrendingTopics: boolean;
  showEvents: boolean;

  onSearch?: (query: string) => void;
}
