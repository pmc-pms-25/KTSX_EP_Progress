import { MotionConfig } from 'motion/react';
import { createHashRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import { engineeringModule } from './modules/engineering/module';
import { procurementModule } from './modules/procurement/module';
import { PackageDrawer } from './ui/package/PackageDrawer';
import { AppShell } from './ui/shell/AppShell';
import { LegacyRedirect } from './ui/shell/LegacyRedirect';
import { ModuleRoute } from './ui/shell/ModuleRoute';
import { NotFound } from './ui/states/NotFound';

/** Hash routing: works from any static host path without server rewrites. Module pages load lazily. */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      // Until the index page exists, the root (and old links) go to Procurement.
      { index: true, element: <LegacyRedirect /> },
      { path: 'discipline/:name', element: <LegacyRedirect /> },
      {
        path: 'procurement',
        element: <ModuleRoute module={procurementModule} overlay={<PackageDrawer />} />,
        children: [
          { index: true, lazy: () => import('./ui/overview/OverviewPage').then((m) => ({ Component: m.OverviewPage })) },
          { path: 'discipline/:name', lazy: () => import('./ui/discipline/DisciplinePage').then((m) => ({ Component: m.DisciplinePage })) },
        ],
      },
      {
        path: 'engineering',
        element: <ModuleRoute module={engineeringModule} />,
        children: [{ index: true, lazy: () => import('./ui/engineering/EngineeringPage').then((m) => ({ Component: m.EngineeringPage })) }],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
];

const router = createHashRouter(routes);

export function App() {
  return (
    // Motion follows the OS "reduce motion" setting for every animated component.
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  );
}
