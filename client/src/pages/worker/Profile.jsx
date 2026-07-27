import { Link } from 'react-router-dom';
import { PlaceholderPage } from '../../components/PlaceholderPage.jsx';

export default function Profile() {
  return (
    <div>
      <PlaceholderPage title="Profile" description="Profile editing arrives in Phase 8." />
      <div className="flex flex-wrap gap-3 justify-center text-sm font-semibold text-gs-teal-600">
        <Link to="/worker/services" className="min-h-[48px] flex items-center px-3">
          My Services
        </Link>
        <Link to="/worker/areas" className="min-h-[48px] flex items-center px-3">
          My Areas
        </Link>
        <Link to="/worker/reviews" className="min-h-[48px] flex items-center px-3">
          My Reviews
        </Link>
      </div>
    </div>
  );
}
