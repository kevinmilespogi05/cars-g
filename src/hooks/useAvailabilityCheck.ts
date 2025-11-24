import { useState, useEffect, useCallback } from 'react';
import { config } from '../lib/config';
import { isValidEmail } from '../lib/utils';

interface AvailabilityState {
  isChecking: boolean;
  isAvailable: boolean | null;
  message: string;
}

export function useAvailabilityCheck(
  value: string,
  type: 'username' | 'email',
  delay: number = 500
): AvailabilityState {
  const [state, setState] = useState<AvailabilityState>({
    isChecking: false,
    isAvailable: null,
    message: ''
  });

  const checkAvailability = useCallback(async (checkValue: string) => {
    if (!checkValue || checkValue.length < 3) {
      setState({
        isChecking: false,
        isAvailable: null,
        message: ''
      });
      return;
    }

    // Validate format before checking
    if (type === 'email') {
      if (!isValidEmail(checkValue)) {
        setState({
          isChecking: false,
          isAvailable: false,
          message: 'Invalid email format'
        });
        return;
      }
    } else if (type === 'username') {
      const alphanumericRegex = /^[a-zA-Z0-9]+$/;
      if (!alphanumericRegex.test(checkValue)) {
        setState({
          isChecking: false,
          isAvailable: false,
          message: 'Username must be alphanumeric'
        });
        return;
      }
    }

    setState(prev => ({ ...prev, isChecking: true }));

    try {
      const apiUrl = config.api.baseUrl;
      const response = await fetch(`${apiUrl}/api/auth/check-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          value: checkValue
        })
      });

      const data = await response.json();

      if (response.ok) {
        setState({
          isChecking: false,
          isAvailable: data.available,
          message: data.available 
            ? `${type === 'email' ? 'Email' : 'Username'} is available!` 
            : data.message || `${type === 'email' ? 'Email' : 'Username'} is already taken`
        });
      } else {
        setState({
          isChecking: false,
          isAvailable: false,
          message: data.message || 'Could not verify availability'
        });
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      setState({
        isChecking: false,
        isAvailable: null,
        message: 'Unable to check availability'
      });
    }
  }, [type]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkAvailability(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay, checkAvailability]);

  return state;
}

