import React, { createContext, useContext, useState } from 'react';

export type ProfileData = {
  age: string;
  height: string;
  weight: string;
  activityLevel: string;
  goal: string;
  dietaryPreference: string;
  restrictions: string;
  priorities: string[];
};

const defaultProfile: ProfileData = {
  age: '',
  height: '',
  weight: '',
  activityLevel: 'moderate',
  goal: 'muscle_gain',
  dietaryPreference: 'no_preference',
  restrictions: '',
  priorities: ['protein', 'calories']
};

interface ProfileContextType {
  profile: ProfileData;
  setProfile: (profile: ProfileData) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<ProfileData>(() => {
    const saved = localStorage.getItem('nutriforge_profile');
    return saved ? JSON.parse(saved) : defaultProfile;
  });

  const setProfile = (newProfile: ProfileData) => {
    setProfileState(newProfile);
    localStorage.setItem('nutriforge_profile', JSON.stringify(newProfile));
  };

  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>
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
