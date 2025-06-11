import React, { createContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Platform } from 'react-native';
import { googleAuthConfig } from '@/config/auth';
import { loginAsGuest } from '@/services/authService';
import { router } from 'expo-router';

WebBrowser.maybeCompleteAuthSession();

export type User = {
  userId: string;
  username: string;
  token: string;
  role?: string;
};

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: () => Promise<void>;
  loginGuest: () => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  login: async () => {},
  loginGuest: async () => {},
  logout: async () => {},
});

type AuthProviderProps = {
  children: ReactNode;
};

// Helper functions for storage operations
const storeData = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const getData = async (key: string) => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  } else {
    return await SecureStore.getItemAsync(key);
  }
};

const removeData = async (key: string) => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: googleAuthConfig.androidClientId,
    iosClientId: googleAuthConfig.iosClientId,
    webClientId: googleAuthConfig.webClientId,
    expoClientId: googleAuthConfig.expoClientId,
  });

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const userDataString = await getData('user');
        
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          setUser(userData);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Failed to restore authentication state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      
      // Here you would normally make an API call to your backend with the Google token
      // For this example, we'll simulate a successful login
      const mockUser = {
        userId: 'google_user_123',
        username: 'Google User',
        token: authentication?.accessToken || '',
        role: 'user'
      };
      
      handleSuccessfulLogin(mockUser);
    }
  }, [response]);

  const handleSuccessfulLogin = async (userData: User) => {
    try {
      await storeData('user', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
      setLoginError(null);
    } catch (error) {
      console.error('Error saving auth data:', error);
      setLoginError('Failed to save authentication data');
    }
  };

  const login = async () => {
    try {
      setLoginError(null);
      await promptAsync();
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Failed to login with Google');
    }
  };

  const loginGuest = async () => {
    try {
      setIsLoading(true);
      setLoginError(null);
      const response = await loginAsGuest();
      
      if (response.success) {
        const userData = {
          userId: response.userId,
          username: response.username,
          token: response.token,
          role: 'guest'
        };
        
        await handleSuccessfulLogin(userData);
      } else {
        throw new Error('Guest login failed');
      }
    } catch (error) {
      console.error('Guest login error:', error);
      setLoginError('Failed to login as guest');
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await removeData('user');
      setUser(null);
      setIsAuthenticated(false);
      setLoginError(null);
      
      // Force navigation to the root route
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        loginGuest,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};