import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import './App.css';

// Components
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import VideoChat from './components/VideoChat/VideoChat';
import Home from './components/Home/Home';
import Header from './components/Layout/Header';

function App() {
  const { currentUser, loading } = useAuth();

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (loading) return <div className="loading">Loading...</div>;
    
    if (!currentUser) {
      return <Navigate to="/login" />;
    }
    
    return children;
  };

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/meeting/:roomId" element={
            <ProtectedRoute>
              <VideoChat />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default App; 