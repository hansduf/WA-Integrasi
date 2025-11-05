"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import InfoModal from './InfoModal';

export default function SessionExpiredModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  // Listen for session expired events
  useEffect(() => {
    const handleSessionExpired = (event: CustomEvent) => {
      setMessage(event.detail.message);
      setIsOpen(true);
    };

    window.addEventListener('sessionExpired', handleSessionExpired as EventListener);

    return () => {
      window.removeEventListener('sessionExpired', handleSessionExpired as EventListener);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Redirect to login after modal closes
    router.push('/login');
  };

  return (
    <InfoModal
      open={isOpen}
      title="Session Expired"
      message={message || 'Your session has expired. You have been logged out from another device.'}
      okLabel="Go to Login"
      type="warning"
      onOk={handleClose}
    />
  );
}
