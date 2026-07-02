import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { routes } from './app.routes';
// Added HttpClient provider import
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // onSameUrlNavigation: 'reload' makes clicking a sidebar link to the
    // page you're already on still fire a NavigationEnd event, so pages
    // like Templates can re-fetch fresh data instead of doing nothing.
    provideRouter(routes, withRouterConfig({ onSameUrlNavigation: 'reload' })),
    provideHttpClient() // AuthService is allowed to make API calls
  ]
};