import React from 'react';
import { DailyReviewView } from '../components/Views/DailyReviewView';

const ReviewPage: React.FC = () => {
  return (
    <div className="page-container animate-fade-in">
      <DailyReviewView />
    </div>
  );
};

export default ReviewPage;
