import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ProfileData } from '../types';
import { api } from '../services/api';

export type { ProfileData };

const defaultProfile: ProfileData = {
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
  setProfile: (profile: ProfileData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  reloadProfile: () => Promise<void>;
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

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      const res = await api.getProfile();
      if (res && res.data) {
        const syncedProfile: ProfileData = {
          ...defaultProfile,
          ...res.data,
          daily_targets: {
            ...defaultProfile.daily_targets,
            ...(res.data.daily_targets || {})
          }
        };
        setProfileState(syncedProfile);
        try {
          localStorage.setItem('nutriforge_profile', JSON.stringify(syncedProfile));
        } catch (e) {
          console.error('Failed to sync profile to localStorage', e);
        }
      }
    } catch (err: any) {
      console.warn('Backend profile sync note:', err?.message || err);
      // Keep cached localStorage profile if backend is unreachable
      setError(err?.message || 'Failed to sync profile from server');
    } finally {
      setIsLoading(false);
    }
  };

  // Sync with backend on initial load and keep localStorage fresh
  const reloadProfile = async () => {
    setIsLoading(true);
    setError(null);
    await fetchProfile();
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const setProfile = async (newProfile: ProfileData): Promise<void> => {
    // 1. Immediately update React state for instant UI reaction across all consumers
    setProfileState(newProfile);

    // 2. Immediately cache in localStorage for instant retrieval on refresh/offline
    try {
      localStorage.setItem('nutriforge_profile', JSON.stringify(newProfile));
      localStorage.setItem('nutriforge_profile_configured', 'true');
    } catch (e) {
      console.error('Failed to save profile to localStorage', e);
    }

    // 3. Persist to backend database and synchronize confirmation
    try {
      const res = await api.saveProfile(newProfile);
      if (res && res.data) {
        const confirmedProfile: ProfileData = {
          ...defaultProfile,
          ...res.data,
          daily_targets: {
            ...defaultProfile.daily_targets,
            ...(res.data.daily_targets || {})
          }
        };
        setProfileState(confirmedProfile);
        try {
          localStorage.setItem('nutriforge_profile', JSON.stringify(confirmedProfile));
        } catch (e) {
          console.error('Failed to update localStorage with confirmed profile', e);
        }
      }
    } catch (err: any) {
      console.warn('Backend profile persistence warning:', err?.message || err);
    }
  };

  return (
    <ProfileContext.Provider value={{ profile, setProfile, isLoading, error, reloadProfile }}>
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
