import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// Create Auth context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Configure axios to use the token in headers
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  // Load user data on mount
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get('/auth/me');
        setCurrentUser(res.data.user);
      } catch (err) {
        console.error('Error loading user:', err);
        // If token is invalid, clear it
        if (err.response && err.response.status === 401) {
          setToken(null);
        }
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  // Login function
  const login = async (email, password) => {
    try {
      setError('');
      const res = await axios.post('/auth/login', { email, password });
      setToken(res.data.token);
      setCurrentUser(res.data.user);
      return res.data.user;
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Login failed');
      throw err;
    }
  };

  // Register function
  const register = async (username, email, password) => {
    try {
      setError('');
      const res = await axios.post('/auth/register', { username, email, password });
      setToken(res.data.token);
      setCurrentUser(res.data.user);
      return res.data.user;
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || 'Registration failed');
      throw err;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await axios.get('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setToken(null);
      setCurrentUser(null);
    }
  };

  // Refresh token function
  const refreshToken = async () => {
    try {
      const res = await axios.post('/auth/refresh-token');
      setToken(res.data.token);
      return res.data.token;
    } catch (err) {
      console.error('Token refresh error:', err);
      setToken(null);
      setCurrentUser(null);
      throw err;
    }
  };

  const value = {
    currentUser,
    token,
    loading,
    error,
    login,
    register,
    logout,
    refreshToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 