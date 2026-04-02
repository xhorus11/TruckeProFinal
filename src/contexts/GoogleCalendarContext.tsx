import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

interface GoogleCalendarContextType {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  fetchEvents: () => Promise<any[]>;
  createEvent: (event: any) => Promise<any>;
  updateEvent: (eventId: string, event: any) => Promise<any>;
}

const GoogleCalendarContext = createContext<GoogleCalendarContextType | undefined>(undefined);

export const GoogleCalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('google_access_token'));

  useEffect(() => {
    if (accessToken) {
      localStorage.setItem('google_access_token', accessToken);
    } else {
      localStorage.removeItem('google_access_token');
    }
  }, [accessToken]);

  const fetchEvents = async () => {
    if (!accessToken) return [];
    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response.status === 401) {
        setAccessToken(null);
        return [];
      }
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }
  };

  const createEvent = async (event: any) => {
    if (!accessToken) return null;
    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
      return await response.json();
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return null;
    }
  };

  const updateEvent = async (eventId: string, event: any) => {
    if (!accessToken) return null;
    try {
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
      return await response.json();
    } catch (error) {
      console.error('Error updating calendar event:', error);
      return null;
    }
  };

  return (
    <GoogleCalendarContext.Provider value={{ accessToken, setAccessToken, fetchEvents, createEvent, updateEvent }}>
      {children}
    </GoogleCalendarContext.Provider>
  );
};

export const useGoogleCalendar = () => {
  const context = useContext(GoogleCalendarContext);
  if (context === undefined) {
    throw new Error('useGoogleCalendar must be used within a GoogleCalendarProvider');
  }
  return context;
};
