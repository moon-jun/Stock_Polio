import React from 'react';
import { AuthProvider } from '../auth/AuthProvider';
import { MainPage } from './MainPage';
import './styles.css';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainPage />
    </AuthProvider>
  );
};

export default App;
