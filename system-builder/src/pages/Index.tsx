import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '@/lib/app-context';
import AppShell from '@/components/AppShell';
import CalendarView from '@/components/CalendarView';
import VenuesPage from '@/components/VenuesPage';
import NewBookingForm from '@/components/NewBookingForm';
import MyBookings from '@/components/BookingsList'; 
import ManageBookings from '@/components/ManageBookings';
import Dashboard from '@/components/Dashboard';
import UserManagement from '@/components/UserManagement';
import VIPBookingForm from '@/components/VIPBookingForm';
import ManageServices from '@/components/ManageServices';
import VenueOperations from '@/components/VenueOperations'; // <-- Added this import!
import EmailTemplateManager from '@/components/MessageCenter';

function AppContent() {
  const { role, token } = useApp();
  
  const defaultPage = 
    !token ? 'vip-booking' : 
    ['system_admin', 'event_management', 'admin_finance', 'leadership'].includes(role) ? 'dashboard' : 
    'calendar';
    
  const [page, setPage] = useState(defaultPage);

  if (!token && !['calendar', 'venues', 'new-booking', 'vip-booking'].includes(page)) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    const handleHash = () => {
      const hashWithQuery = window.location.hash.replace('#/', '').replace('#', '');
      const [hash] = hashWithQuery.split('?');
      
      // Added 'venue-operations' to the list of valid pages!
      const validPages = [
        'dashboard', 'calendar', 'venues', 'new-booking', 'vip-booking', 
        'my-bookings', 'manage-bookings', 'user-management', 'manage-services', 
        'venue-operations' // <-- Added here
      ];
      
      if (validPages.includes(hash)) {
        setPage(hash);
      }
    };

    handleHash(); 
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard onNavigate={setPage} />;
      case 'calendar': return <CalendarView />;
      case 'venues': return <VenuesPage />;
      case 'new-booking': return <NewBookingForm onComplete={() => setPage('my-bookings')} />;
      case 'vip-booking': return <VIPBookingForm onComplete={() => setPage('my-bookings')} />;
      case 'my-bookings': return <MyBookings />;
      case 'manage-bookings': return <ManageBookings />;
      case 'user-management': return <UserManagement />;
      case 'manage-services': return <ManageServices />;
      case 'venue-operations': return <VenueOperations />;
      case 'message-center': return <EmailTemplateManager />; // <-- Added this case!
      default: return !token ? <VIPBookingForm onComplete={() => setPage('my-bookings')} /> : <Dashboard onNavigate={setPage} />;
    }
  };

  return (
    <AppShell currentPage={page} onNavigate={setPage}>
      {renderPage()}
    </AppShell>
  );
}

export default function Index() {
  return <AppContent />;
}