import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  BaseClientSideWebPart,
  IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneDropdown,
  PropertyPaneToggle
} from '@microsoft/sp-webpart-base';

import { CyberdyneDashboard } from './components/CyberdyneDashboard';
import { ICyberdyneDashboardProps } from './components/ICyberdyneDashboardProps';

export interface ICyberdyneDashboardWebPartProps {
  companyName: string;
  globalSubtitle: string;
  pageHeadline: string;
  accentColor: string;
  glowIntensity: 'low' | 'medium' | 'high';
  heroTitle: string;
  heroSubtitle: string;
  heroCtaText: string;
  heroCtaUrl: string;
  heroBgImage: string;
  showDirectory: boolean;
  showTrendingTopics: boolean;
  showEvents: boolean;
}

export default class CyberdyneDashboardWebPart extends BaseClientSideWebPart<ICyberdyneDashboardWebPartProps> {
  public render(): void {
    // Automatically retrieve authenticated user info from SharePoint Page Context
    const currentUserName = this.context.pageContext?.user?.displayName || 'A. REED';
    const currentUserEmail = this.context.pageContext?.user?.email || '';
    
    // User profile photo fallback or SharePoint Mysite UserPhoto handler
    const userPhotoUrl = currentUserEmail
      ? `/_layouts/15/userphoto.aspx?size=M&accountname=${encodeURIComponent(currentUserEmail)}`
      : undefined;

    const element: React.ReactElement<ICyberdyneDashboardProps> = React.createElement(
      CyberdyneDashboard,
      {
        companyName: this.properties.companyName || 'CYBERDYNE SOLUTIONS',
        globalSubtitle: this.properties.globalSubtitle || 'Global Intranet',
        pageHeadline: this.properties.pageHeadline || 'ShairePoint Intranet',
        accentColor: this.properties.accentColor || '#ff1e3c',
        glowIntensity: this.properties.glowIntensity || 'high',
        userName: currentUserName,
        userTitle: 'Senior Data Analyst',
        userAvatarUrl: userPhotoUrl,
        heroTitle: this.properties.heroTitle || 'QUANTUM SHIFT: PHASE 4 INITIATION',
        heroSubtitle:
          this.properties.heroSubtitle ||
          'Access Project Orion Datastreams. Update clearance level 7 required.',
        heroCtaText: this.properties.heroCtaText || 'PROJECT OVERVIEW',
        heroCtaUrl: this.properties.heroCtaUrl || '#project-overview',
        heroBgImage:
          this.properties.heroBgImage ||
          'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1600&q=80',
        showDirectory: this.properties.showDirectory !== false,
        showTrendingTopics: this.properties.showTrendingTopics !== false,
        showEvents: this.properties.showEvents !== false,
        onSearch: (q: string) => {
          // Can redirect to SharePoint Search Center or open modal
          const searchUrl = `${this.context.pageContext.web.absoluteUrl}/_layouts/15/search.aspx?q=${encodeURIComponent(
            q
          )}`;
          window.location.href = searchUrl;
        }
      }
    );

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
          header: {
            description: 'Customize Cyberdyne HUD Theme, Colors, and Layout Widgets'
          },
          groups: [
            {
              groupName: 'Theme & HUD Accents',
              groupFields: [
                PropertyPaneTextField('accentColor', {
                  label: 'Neon Accent Color (Hex)',
                  value: '#ff1e3c'
                }),
                PropertyPaneDropdown('glowIntensity', {
                  label: 'Ambient Glow Intensity',
                  options: [
                    { key: 'low', text: 'Low / Subtle' },
                    { key: 'medium', text: 'Medium / Balanced' },
                    { key: 'high', text: 'High / Neon Cyberpunk' }
                  ],
                  selectedKey: 'high'
                })
              ]
            },
            {
              groupName: 'Branding & Navigation',
              groupFields: [
                PropertyPaneTextField('companyName', {
                  label: 'Company / Org Name'
                }),
                PropertyPaneTextField('globalSubtitle', {
                  label: 'Global Subtitle'
                }),
                PropertyPaneTextField('pageHeadline', {
                  label: 'Page Headline'
                })
              ]
            },
            {
              groupName: 'Hero Banner Carousel',
              groupFields: [
                PropertyPaneTextField('heroTitle', {
                  label: 'Hero Title'
                }),
                PropertyPaneTextField('heroSubtitle', {
                  label: 'Hero Subtitle',
                  multiline: true
                }),
                PropertyPaneTextField('heroCtaText', {
                  label: 'Button CTA Text'
                }),
                PropertyPaneTextField('heroCtaUrl', {
                  label: 'Button CTA Target URL'
                }),
                PropertyPaneTextField('heroBgImage', {
                  label: 'Background Image URL'
                })
              ]
            },
            {
              groupName: 'Dashboard Widgets',
              groupFields: [
                PropertyPaneToggle('showEvents', {
                  label: 'Show Upcoming Events'
                }),
                PropertyPaneToggle('showTrendingTopics', {
                  label: 'Show Trending Topics'
                }),
                PropertyPaneToggle('showDirectory', {
                  label: 'Show Directory Card'
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
