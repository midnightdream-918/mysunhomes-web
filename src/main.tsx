import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';

import { OverlayHost } from '@/components/ui';
import { AppShell } from '@/layout/AppShell';
import AccessPage from '@/pages/Access';
import AnnouncementsPage from '@/pages/Announcements';
import ApartmentsPage from '@/pages/Apartments';
import ApprovalsPage from '@/pages/Approvals';
import BillingPage from '@/pages/Billing';
import ComplaintsPage from '@/pages/Complaints';
import DashboardPage from '@/pages/Dashboard';
import FacilitiesPage from '@/pages/Facilities';
import LoginPage from '@/pages/Login';
import ReportsPage from '@/pages/Reports';
import ServicesPage from '@/pages/Services';
import StaffPage from '@/pages/Staff';
import VehiclesPage from '@/pages/Vehicles';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="apartments" element={<ApartmentsPage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="access" element={<AccessPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="facilities" element={<FacilitiesPage />} />
          <Route path="complaints" element={<ComplaintsPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Route>
      </Routes>
      <OverlayHost />
    </BrowserRouter>
  </StrictMode>,
);
