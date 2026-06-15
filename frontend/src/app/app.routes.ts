import { Routes } from '@angular/router';
import { NotFound } from './not-found/not-found';
import { Login } from './pages/login/login';
import { Layout } from './shared/layout/layout';
import { Dashboard } from './pages/dashboard/dashboard';
import { Templates } from './pages/templates/templates';
import { GenerateReport } from './pages/generate-report/generate-report';
import { Archives } from './pages/archives/archives';
import { PdfDesigner } from './pdf-designer/pdf-designer';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: '',
    component: Layout,
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'templates', component: Templates },
      { path: 'generate-report', component: GenerateReport },
      { path: 'archives', component: Archives },
      { path: 'editor', component: PdfDesigner },
    ]
  },
  { path: '**', component: NotFound }
];