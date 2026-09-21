import { Navigate, useLocation, useParams } from 'react-router-dom';
import { procurementModule } from '../../modules/procurement/module';
import { migrateLegacyParams } from './legacyUrl';

/** `#/` and `#/discipline/:name` from before the module shell; `#/` becomes the index page later. */
export function LegacyRedirect() {
  const { name } = useParams();
  const { search } = useLocation();
  const query = migrateLegacyParams(new URLSearchParams(search)).toString();
  const base = procurementModule.path;
  const pathname = name === undefined ? base : `${base}/discipline/${encodeURIComponent(name)}`;
  return <Navigate replace to={{ pathname, search: query ? `?${query}` : '' }} />;
}
