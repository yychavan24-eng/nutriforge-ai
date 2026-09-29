import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Scan from './pages/Scan';
import Products from './pages/Products';
import ProductAnalysis from './pages/ProductAnalysis';
import Compare from './pages/Compare';
import Assistant from './pages/Assistant';
import History from './pages/History';
import Recheck from './pages/Recheck';
import { ProfileProvider } from './contexts/ProfileContext';

function App() {
  return (
    <ProfileProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="scan" element={<Scan />} />
            <Route path="products" element={<Products />} />
            <Route path="products/:id" element={<ProductAnalysis />} />
            <Route path="compare" element={<Compare />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="history" element={<History />} />
            <Route path="recheck" element={<Recheck />} />
          </Route>
        </Routes>
      </Router>
    </ProfileProvider>
  );
}

export default App;
