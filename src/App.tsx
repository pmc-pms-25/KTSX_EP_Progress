import { createHashRouter, RouterProvider } from 'react-router-dom';
import { DisciplinePage } from './ui/discipline/DisciplinePage';
import { OverviewPage } from './ui/overview/OverviewPage';
import { AppShell } from './ui/shell/AppShell';

/** Hash routing: works from any static host path without server rewrites. */
export const routes = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'discipline/:name', element: <DisciplinePage /> },
    ],
  },
];

const router = createHashRouter(routes);

export function App() {
  return <RouterProvider router={router} />;
}
