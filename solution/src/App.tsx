import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './features/auth/LoginPage';
import { RequireAuth } from './features/auth/RequireAuth';
import { LoadDetailsPage } from './features/loads/LoadDetailsPage';
import { LoadsPage } from './features/loads/LoadsPage';

const App = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<RequireAuth />}>
      <Route element={<AppLayout />}>
        <Route path="/loads" element={<LoadsPage />} />
        <Route path="/loads/:id" element={<LoadDetailsPage />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/loads" replace />} />
  </Routes>
);

export default App;
