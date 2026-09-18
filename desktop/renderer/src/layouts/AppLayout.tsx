import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { NotificationToastContainer } from '../components/NotificationToast';
import { useApplicationStore } from '../store/applicationStore';

export const AppLayout: React.FC = () => {
  const { fetchInitialData } = useApplicationStore();

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  return (
    <div className="flex h-screen w-screen bg-surface-950 text-slate-100 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-surface-900/30 p-8">
          <Outlet />
        </main>
      </div>
      <NotificationToastContainer />
    </div>
  );
};
