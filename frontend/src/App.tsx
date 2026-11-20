import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { MoviesPage } from './pages/MoviesPage';
import { RewatchPlanPage } from './pages/RewatchPlanPage';
import { BookingPage } from './pages/BookingPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 overflow-x-hidden">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 md:pb-12">
          <Routes>
            <Route path="/" element={<MoviesPage />} />
            <Route path="/movies" element={<MoviesPage />} />
            <Route path="/rewatch" element={<RewatchPlanPage />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="hidden md:block border-t border-slate-900/90 py-6 text-center text-xs text-slate-500 bg-slate-950">
          Doomsday Ready &copy; {new Date().getFullYear()} — MCU Rewatch Planner &amp; Cinema Watch-Party Group Booking
        </footer>
      </div>
    </BrowserRouter>
  );
};

export default App;
