import ItineraryPlanner from '../components/ItineraryPlanner';
import PlanViewer from '../components/PlanViewer';
import MapSection from '../components/MapSection';

const PlannerPage = () => (
  <div className="page grid">
    <div className="grid-span-2">
      <ItineraryPlanner />
      <PlanViewer />
    </div>
    <MapSection />
  </div>
);

export default PlannerPage;
