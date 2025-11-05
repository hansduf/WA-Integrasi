'use client';

import ProtectedRoute from '../components/ProtectedRoute';
import HomeContent from '../components/home';

export default function HomePage() {
  return (
    <ProtectedRoute>
      <HomeContent />
    </ProtectedRoute>
  );
}
