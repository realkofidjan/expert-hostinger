import React, { createContext, useContext, useState, useCallback } from 'react';
import CustomAlert from '../components/ui/Alert';

const AlertContext = createContext(null);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);

  const showAlert = useCallback((type, title, message, duration = 5000) => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, type, title, message, duration }]);
  }, []);

  const removeAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <div className="fixed top-8 right-6 z-[100] flex flex-col gap-4 w-full max-w-sm pointer-events-none">
        {alerts.map(alert => (
          <div key={alert.id} className="pointer-events-auto">
            <CustomAlert
              type={alert.type}
              title={alert.title}
              message={alert.message}
              duration={alert.duration}
              onClose={() => removeAlert(alert.id)}
            />
          </div>
        ))}
      </div>
    </AlertContext.Provider>
  );
};
