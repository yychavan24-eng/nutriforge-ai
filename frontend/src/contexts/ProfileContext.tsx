import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ProfileData } from '../types';
import { api } from '../services/api';

export type { ProfileData };

export const defaultProfile: ProfileData = {
  age: '',
  height: '',
  weight: '',
  activityLevel: 'moderate',
  goal: 'muscle_gain',
  dietaryPreference: 'no_preference',
  restrictions: '',
  priorities: ['protein', 'calories'],
  daily_targets: {
    calories: 2200,
    protein: 140,
    carbohydrates: 250,
    total_sugar: 40,
    added_sugar: 25,
    total_fat: 70,
    sodium: 2000,
    fibre: 30
  }
};

interface ProfileContextType {
  profile: ProfileData;
  setProfile: (profile: ProfileData) => void;
  isLoading: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<ProfileData>(() => {
    try {
      const saved = localStorage.getItem('nutriforge_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultProfile,
          ...parsed,
          daily_targets: {
            ...defaultProfile.daily_targets,
            ...(parsed.daily_targets || {})
          }
        };
      }
    } catch (e) {
      console.error('Error reading profile from localStorage', e);
    }
    return defaultProfile;
  });

  const [isLoading, setIsLoading] = useState(false);

  // Sync with backend on initial load if available
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    api.getProfile()
      .then(res => {
        if (isMounted && res.data) {
          // If local storage has data, keep local changes; otherwise sync backend
          const saved = localStorage.getItem('nutriforge_profile');
          if (!saved && res.data.goal) {
            setProfileState({
              ...defaultProfile,
              ...res.data,
              daily_targets: {
                ...defaultProfile.daily_targets,
                ...(res.data.daily_targets || {})
              }
            });
          }
        }
      })
      .catch(() => {
        // Silent fallback to local profile if backend is starting or offline
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setProfile = (newProfile: ProfileData) => {
    setProfileState(newProfile);
    try {
      localStorage.setItem('nutriforge_profile', JSON.stringify(newProfile));
    } catch (e) {
      console.error('Failed to save profile to localStorage', e);
    }

    // Persist to backend
    api.saveProfile(newProfile).catch(err => {
      console.warn('Backend profile sync note:', err.message);
    });
  };

  return (
    <ProfileContext.Provider value={{ profile, setProfile, isLoading }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
