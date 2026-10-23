import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneDropdown,
  PropertyPaneToggle,
  PropertyPaneLabel
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { SPHttpClient, type SPHttpClientResponse } from '@microsoft/sp-http';

import CyberdyneDashboard from './components/CyberdyneDashboard';
import type {
  ICyberdyneDashboardProps,
  GlowIntensity,
  IHeroSlide,
  INewsItem,
  IQuickLink,
  IEventItem
} from './components/ICyberdyneDashboardProps';

export interface ICyberdyneDashboardWebPartProps {
  companyName: string;
  globalSubtitle: string;
  pageHeadline: string;
  accentColor: string;
  glowIntensity: GlowIntensity;
  showHeaderAndFooter: boolean;
  showEvents: boolean;
  showTrendingTopics: boolean;
  showDirectory: boolean;
  directoryUrl: string;
  slidesText: string;
  newsText: string;
  quickLinksText: string;
  eventsText: string;
  topicsText: string;
}

/** Splits multi-line "a | b | c" text into trimmed field arrays, skipping blank lines. */
function parseRows(text: string | undefined): string[][] {
  return (text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split('|').map((f) => f.trim()));
}

export default class CyberdyneDashboardWebPart extends BaseClientSideWebPart<ICyberdyneDashboardWebPartProps> {
  private _jobTitle: string = '';

  protected async onInit(): Promise<void> {
    await super.onInit();
    // Current user's job title from their SharePoint profile. Uses the signed-in
    // user's own permissions; no extra API approvals are required.
    try {
      const url = `${this.context.pageContext.web.absoluteUrl}/_api/SP.UserProfiles.PeopleManager/GetMyProperties?$select=Title`;
      const res: SPHttpClientResponse = await this.context.spHttpClient.get(url, SPHttpClient.configurations.v1);
      if (res.ok) {
        const json: { Title?: string } = await res.json();
        this._jobTitle = json.Title || '';
      }
    } catch {
      // Profile service unavailable – the title line is simply hidden.
    }
  }

  public render(): void {
    const p = this.properties;
    const webUrl = this.context.pageContext.web.absoluteUrl;
    const user = this.context.pageContext.user;

    const slides: IHeroSlide[] = parseRows(p.slidesText).map((f) => ({
      title: f[0] || '',
      subtitle: f[1] || '',
      ctaText: f[2] || '',
      ctaUrl: f[3] || '#',
      imageUrl: f[4] || ''
    }));

    const news: INewsItem[] = parseRows(p.newsText).map((f) => ({
      title: f[0] || '',
      tag: f[1] || undefined,
      meta: f[2] || '',
      url: f[3] || '#'
    }));

    const quickLinks: IQuickLink[] = parseRows(p.quickLinksText).map((f) => ({ label: f[0] || '', url: f[1] || '#' }));
    const events: IEventItem[] = parseRows(p.eventsText).map((f) => ({ title: f[0] || '', when: f[1] || '', url: f[2] || '#' }));
    const topics: string[] = (p.topicsText || '').split(',').map((t) => t.trim()).filter(Boolean);

    const element: React.ReactElement<ICyberdyneDashboardProps> = React.createElement(CyberdyneDashboard, {
      companyName: p.companyName || 'CYBERDYNE SOLUTIONS',
      globalSubtitle: p.globalSubtitle || '',
      pageHeadline: p.pageHeadline || '',
      accentColor: p.accentColor || '#ff1e3c',
      glowIntensity: p.glowIntensity || 'high',
      userDisplayName: user.displayName,
      userTitle: this._jobTitle,
      userPhotoUrl: `${webUrl}/_layouts/15/userphoto.aspx?size=M&accountname=${encodeURIComponent(user.loginName || user.email)}`,
      slides,
      news,
      quickLinks,
      events,
      topics,
      showHeaderAndFooter: p.showHeaderAndFooter !== false,
      showEvents: p.showEvents !== false,
      showTrendingTopics: p.showTrendingTopics !== false,
      showDirectory: p.showDirectory !== false,
      directoryUrl: p.directoryUrl || `${webUrl}/_layouts/15/search.aspx/people`,
      onSearch: (q: string) => {
        window.location.href = `${webUrl}/_layouts/15/search.aspx?q=${encodeURIComponent(q)}`;
      }
    });

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: { description: 'Theme, branding and layout' },
          groups: [
            {
              groupName: 'Theme',
              groupFields: [
                PropertyPaneTextField('accentColor', {
                  label: 'Accent / glow color (hex)',
                  description: 'e.g. #ff1e3c (red), #00e5ff (cyan), #39ff14 (green)',
                  onGetErrorMessage: (v: string) =>
                    /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test((v || '').trim()) ? '' : 'Enter a hex color like #ff1e3c'
                }),
                PropertyPaneDropdown('glowIntensity', {
                  label: 'Glow intensity',
                  options: [
                    { key: 'low', text: 'Low' },
                    { key: 'medium', text: 'Medium' },
                    { key: 'high', text: 'High' }
                  ]
                })
              ]
            },
            {
              groupName: 'Branding',
              groupFields: [
                PropertyPaneTextField('companyName', { label: 'Company name' }),
                PropertyPaneTextField('globalSubtitle', { label: 'Header subtitle' }),
                PropertyPaneTextField('pageHeadline', { label: 'Page headline' })
              ]
            },
            {
              groupName: 'Layout',
              groupFields: [
                PropertyPaneToggle('showHeaderAndFooter', {
                  label: 'Show built-in header & footer',
                  onText: 'On (best for full-page app pages)',
                  offText: 'Off (best inside a normal page)'
                }),
                PropertyPaneToggle('showEvents', { label: 'Upcoming events card' }),
                PropertyPaneToggle('showTrendingTopics', { label: 'Trending topics card' }),
                PropertyPaneToggle('showDirectory', { label: 'Directory card' }),
                PropertyPaneTextField('directoryUrl', {
                  label: 'Directory link',
                  description: 'Leave blank to use SharePoint people search'
                })
              ]
            }
          ]
        },
        {
          header: { description: 'Content — one item per line, fields separated by |' },
          groups: [
            {
              groupName: 'Hero carousel',
              groupFields: [
                PropertyPaneLabel('slidesHelp', { text: 'Title | Subtitle | Button text | Button URL | Image URL' }),
                PropertyPaneTextField('slidesText', { label: 'Slides', multiline: true, rows: 6 })
              ]
            },
            {
              groupName: 'Latest network news',
              groupFields: [
                PropertyPaneLabel('newsHelp', { text: 'Headline | Tag (optional) | Date text | URL' }),
                PropertyPaneTextField('newsText', { label: 'News items', multiline: true, rows: 5 })
              ]
            },
            {
              groupName: 'Quick access',
              groupFields: [
                PropertyPaneLabel('linksHelp', { text: 'Label | URL' }),
                PropertyPaneTextField('quickLinksText', { label: 'Buttons', multiline: true, rows: 4 })
              ]
            },
            {
              groupName: 'Events & topics',
              groupFields: [
                PropertyPaneLabel('eventsHelp', { text: 'Event: Title | When | URL' }),
                PropertyPaneTextField('eventsText', { label: 'Events', multiline: true, rows: 3 }),
                PropertyPaneTextField('topicsText', { label: 'Trending topics (comma separated)' })
              ]
            }
          ]
        }
      ]
    };
  }
}
