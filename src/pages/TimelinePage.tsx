import React from 'react';
import { TodayOverview } from '../components/Layout/TodayOverview';
import { Timeline } from '../components/Timeline/Timeline';

const TimelinePage: React.FC = () => {
  return (
    <div className="page-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
      <TodayOverview />
      <Timeline />
    </div>
  );
};

export default TimelinePage;
