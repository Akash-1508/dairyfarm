import React, { useState, useEffect } from 'react';
import { StatusBar, useColorScheme, ActivityIndicator, View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DashboardScreen from './src/pages/dashboard/DashboardScreen';
import AnimalScreen from './src/pages/animals/AnimalScreen';
import MilkScreen from './src/pages/milk/MilkScreen';
import CharaScreen from './src/pages/chara/CharaScreen';
import ProfitLossScreen from './src/pages/reports/ProfitLossScreen';
import MilkSalesReportScreen from './src/pages/reports/MilkSalesReportScreen';
import BuyerScreen from './src/pages/buyers/BuyerScreen';
import SellerScreen from './src/pages/sellers/SellerScreen';
import AddAdminScreen from './src/pages/admin/AddAdminScreen';
import AdminListScreen from './src/pages/admin/AdminListScreen';
import LoginScreen from './src/pages/auth/LoginScreen';
import SignupScreen from './src/pages/auth/SignupScreen';
import ForgotPasswordScreen from './src/pages/auth/ForgotPasswordScreen';
import { authService } from './src/services/auth/authService';
import { setOnTokenExpired } from './src/services/api/apiClient';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('Login/Signup');
  const [isLoading, setIsLoading] = useState(true);

  const handleTokenExpired = async () => {
    console.log('[App] Token expired, redirecting to login');
    try {
      await authService.logout();
    } catch (error) {
      console.error('[App] Error during token expiry logout:', error);
    }
    setIsAuthenticated(false);
    setCurrentScreen('Login/Signup');
  };

  // Set up token expiry callback
  useEffect(() => {
    setOnTokenExpired(handleTokenExpired);
  }, []);

  // Check for saved authentication on app start
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await authService.checkAuthToken();
        if (token) {
          // Token exists, user is authenticated
          setIsAuthenticated(true);
          setCurrentScreen('Dashboard');
          console.log('[App] Auto-login successful');
        } else {
          // No token, show login screen
          setIsAuthenticated(false);
          setCurrentScreen('Login/Signup');
          console.log('[App] No saved token, showing login');
        }
      } catch (error) {
        console.error('[App] Error checking auth:', error);
        setIsAuthenticated(false);
        setCurrentScreen('Login/Signup');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const navigateToScreen = (screen) => {
    // Protected screens - only accessible after login
    const protectedScreens = ['Dashboard', 'Animals', 'Milk', 'Chara', 'Profit/Loss', 'Milk Sales Report', 'Buyer', 'Seller', 'Admin List', 'Add Admin'];
    
    // If trying to access protected screen without login, redirect to login
    if (protectedScreens.includes(screen) && !isAuthenticated) {
      setCurrentScreen('Login/Signup');
      return;
    }
    
    // Allow navigation to login/signup/forgot password screens always
    if (screen === 'Login/Signup' || screen === 'Signup' || screen === 'ForgotPassword') {
      setCurrentScreen(screen);
      return;
    }
    
    setCurrentScreen(screen);
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setCurrentScreen('Dashboard');
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    setIsAuthenticated(false);
    setCurrentScreen('Login/Signup');
  };

  const renderScreen = () => {
    // If not authenticated, only show login/signup screens
    if (!isAuthenticated) {
      switch (currentScreen) {
        case 'Signup':
          return <SignupScreen onNavigate={navigateToScreen} />;
        case 'ForgotPassword':
          return <ForgotPasswordScreen onNavigate={navigateToScreen} />;
        case 'Login/Signup':
        default:
          return <LoginScreen onNavigate={navigateToScreen} onLoginSuccess={handleLoginSuccess} />;
      }
    }

    // If authenticated, show all screens
    switch (currentScreen) {
      case 'Dashboard':
        return <DashboardScreen onNavigate={navigateToScreen} onLogout={handleLogout} />;
      case 'Animals':
        return <AnimalScreen onNavigate={navigateToScreen} onLogout={handleLogout} />;
      case 'Milk':
        return <MilkScreen onNavigate={navigateToScreen} onLogout={handleLogout} />;
      case 'Chara':
        return <CharaScreen onNavigate={navigateToScreen} onLogout={handleLogout} />;
      case 'Profit/Loss':
        return <ProfitLossScreen onNavigate={navigateToScreen} onLogout={handleLogout} />;
      case 'Milk Sales Report':
        return <MilkSalesReportScreen onNavigate={navigateToScreen} onLogout={handleLogout} />;
      case 'Buyer':
        return <BuyerScreen onNavigate={navigateToScreen} onLogout={handleLogout} />;
      case 'Seller':
        return <SellerScreen onNavigate={navigateToScreen} onLogout={handleLogout} />;
      case 'Admin List':
        return <AdminListScreen onNavigate={navigateToScreen} onLogout={handleLogout} />;
      case 'Add Admin':
        return <AddAdminScreen onNavigate={navigateToScreen} onLogout={handleLogout} />;
      case 'Login/Signup':
        return <LoginScreen onNavigate={navigateToScreen} onLoginSuccess={handleLoginSuccess} />;
      case 'Signup':
        return <SignupScreen onNavigate={navigateToScreen} />;
      default:
        return <DashboardScreen onNavigate={navigateToScreen} onLogout={handleLogout} />;
    }
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f7f6' }}>
          <ActivityIndicator size="large" color="#1f6b5b" />
          <Text style={{ marginTop: 16, color: '#556d73', fontSize: 14 }}>Loading...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      {renderScreen()}
    </SafeAreaProvider>
  );
}

export default App;

