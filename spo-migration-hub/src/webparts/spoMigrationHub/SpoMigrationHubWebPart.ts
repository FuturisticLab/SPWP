import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version, DisplayMode } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneDropdown
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import SpoMigrationHub from './components/SpoMigrationHub';
import type {
  ISpoMigrationHubProps,
  EnvironmentProfileKey
} from './components/ISpoMigrationHubProps';

export interface ISpoMigrationHubWebPartProps {
  defaultEnvironment: EnvironmentProfileKey;
  defaultTargetSiteUrl: string;
  defaultTargetLibrary: string;
  defaultReplacementChar: string;
  defaultTenantDomain: string;
}

export default class SpoMigrationHubWebPart extends BaseClientSideWebPart<ISpoMigrationHubWebPartProps> {
  public render(): void {
    const webUrl = this.context.pageContext.web.absoluteUrl;
    const webTitle = this.context.pageContext.web.title;
    const spUser = this.context.pageContext.user;

    const element: React.ReactElement<ISpoMigrationHubProps> = React.createElement(
      SpoMigrationHub,
      {
        spHttpClient: this.context.spHttpClient,
        currentWebUrl: webUrl,
        currentWebTitle: webTitle || 'SharePoint Site',
        userDisplayName: spUser.displayName || 'Migration Administrator',
        userEmail: spUser.email || spUser.loginName || '',
        defaultEnvironment: this.properties.defaultEnvironment || 'Development',
        defaultTargetSiteUrl: this.properties.defaultTargetSiteUrl || webUrl,
        defaultTargetLibrary: this.properties.defaultTargetLibrary || 'Documents',
        defaultReplacementChar: this.properties.defaultReplacementChar || '_',
        defaultTenantDomain: this.properties.defaultTenantDomain || 'contoso.onmicrosoft.com',
        isEditMode: this.displayMode === DisplayMode.Edit
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
            description:
              'Configure default environment profile and target SharePoint Online parameters for the Migration Manager & Readiness Hub.'
          },
          groups: [
            {
              groupName: 'Default Environment & Target Settings',
              groupFields: [
                PropertyPaneDropdown('defaultEnvironment', {
                  label: 'Default Target Environment Profile',
                  selectedKey: this.properties.defaultEnvironment || 'Development',
                  options: [
                    { key: 'Development', text: 'Development (50 MB / 260 chars)' },
                    { key: 'Test / QA', text: 'Test / QA (500 MB / 300 chars)' },
                    { key: 'Staging / Pre-Prod', text: 'Staging / Pre-Prod (5 GB / 350 chars)' },
                    { key: 'Production', text: 'Production (250 GB / 400 chars)' }
                  ]
                }),
                PropertyPaneTextField('defaultTargetSiteUrl', {
                  label: 'Default Target SharePoint Site URL',
                  description: 'Leave blank to automatically use the current SharePoint site URL.'
                }),
                PropertyPaneTextField('defaultTargetLibrary', {
                  label: 'Default Target Document Library',
                  description: 'Example: Documents or Shared Documents'
                }),
                PropertyPaneTextField('defaultReplacementChar', {
                  label: 'Default Invalid Character Replacement',
                  description: 'Single safe character (default: _)'
                }),
                PropertyPaneTextField('defaultTenantDomain', {
                  label: 'Default M365 Entra ID Domain',
                  description: 'Used when generating UserMapping.csv (e.g. contoso.onmicrosoft.com)'
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
