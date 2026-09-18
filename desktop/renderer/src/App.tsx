import React, { useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppRoutes } from './routes';
import { useAuthStore } from './store/authStore';
import { useApplicationStore } from './store/applicationStore';
import { useCompanyStore } from './store/companyStore';

export const App: React.FC = () => {
  const { checkAuth } = useAuthStore();
  const { fetchInitialData } = useApplicationStore();
  const { fetchCompany } = useCompanyStore();

  useEffect(() => {
    checkAuth();
    fetchInitialData();
    fetchCompany();
  }, [checkAuth, fetchInitialData, fetchCompany]);

  return (
    <ErrorBoundary>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </ErrorBoundary>
  );
};
