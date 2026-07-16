import { Navigate, Route, Routes } from 'react-router-dom';

/**
 * Route shell — replace the placeholders with your implementation.
 *
 * Expected routes:
 *   /login       login form
 *   /loads       loads board (auth-only)
 *   /loads/:id   load details (auth-only)
 */

const LoginPlaceholder = () => (
  <main className="page">
    <h1>Login</h1>
    <p>TODO: login form (see task description, section 1).</p>
  </main>
);

const LoadsPlaceholder = () => (
  <main className="page">
    <h1>Loads board</h1>
    <p>TODO: paginated, filterable loads list (section 2).</p>
  </main>
);

const LoadDetailsPlaceholder = () => (
  <main className="page">
    <h1>Load details</h1>
    <p>TODO: load details with rate breakdown and booking (sections 3–5).</p>
  </main>
);

const App = () => (
  <Routes>
    <Route path="/login" element={<LoginPlaceholder />} />
    <Route path="/loads" element={<LoadsPlaceholder />} />
    <Route path="/loads/:id" element={<LoadDetailsPlaceholder />} />
    <Route path="*" element={<Navigate to="/loads" replace />} />
  </Routes>
);

export default App;
