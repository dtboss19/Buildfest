import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { ShelterPage } from './pages/ShelterPage';
import { FoodRescuePage } from './pages/FoodRescuePage';
import { FoodRescueNewPage } from './pages/FoodRescueNewPage';
import { CommunityPage } from './pages/CommunityPage';
import { CommunityChatPage } from './pages/CommunityChatPage';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="profile/:userId" element={<ProfilePage />} />
            <Route path="shelter/:id" element={<ShelterPage />} />
            <Route path="food-rescue" element={<FoodRescuePage />} />
            <Route path="food-rescue/new" element={<FoodRescueNewPage />} />
            <Route path="community" element={<CommunityPage />} />
            <Route path="community/chat" element={<CommunityChatPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
