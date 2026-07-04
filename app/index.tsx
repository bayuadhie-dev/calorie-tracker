import React from 'react';
import { Redirect } from 'expo-router';
import { useProfileStore } from '../src/store/useProfileStore';

export default function Index() {
  const { profile } = useProfileStore();

  if (!profile) {
    // Redirect to onboarding if profile is not configured
    return <Redirect href="/(onboarding)/step-1-biodata" />;
  }

  // Redirect to dashboard if profile exists
  return <Redirect href="/(tabs)/dashboard" />;
}
