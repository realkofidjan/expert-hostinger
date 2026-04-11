import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const TIMEOUT_MS = 10 * 60 * 1000;   // 10 minutes
const WARN_BEFORE = 60 * 1000;       // warn 1 minute before logout

export const useInactivityLogout = () => {
  const navigate = useNavigate();
  const logoutTimer = useRef(null);
  const warnTimer = useRef(null);
  const warnToastId = useRef(null);

  useEffect(() => {
    const clearTimers = () => {
      clearTimeout(logoutTimer.current);
      clearTimeout(warnTimer.current);
      if (warnToastId.current) {
        toast.dismiss(warnToastId.current);
        warnToastId.current = null;
      }
    };

    const reset = () => {
      clearTimers();

      warnTimer.current = setTimeout(() => {
        warnToastId.current = toast.warning(
          'You will be logged out in 1 minute due to inactivity.',
          { autoClose: WARN_BEFORE, toastId: 'inactivity-warn' }
        );
      }, TIMEOUT_MS - WARN_BEFORE);

      logoutTimer.current = setTimeout(() => {
        clearTimers();
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        toast.dismiss();
        toast.info('You were logged out due to inactivity.');
        navigate('/admin/login');
      }, TIMEOUT_MS);
    };

    const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      clearTimers();
      EVENTS.forEach(e => window.removeEventListener(e, reset));
    };
  }, [navigate]);
};
