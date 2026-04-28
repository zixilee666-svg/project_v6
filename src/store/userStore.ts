import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CitationFormat } from '@/types';

interface NotificationSettings {
  newPapers: boolean;
  readingReminders: boolean;
  projectUpdates: boolean;
  pointsChange: boolean;
}

interface UserSettingsState {
  citationFormat: CitationFormat;
  notifications: NotificationSettings;
  setCitationFormat: (format: CitationFormat) => void;
  setNotification: (key: keyof NotificationSettings, value: boolean) => void;
  resetSettings: () => void;
}

const defaultNotifications: NotificationSettings = {
  newPapers: true,
  readingReminders: true,
  projectUpdates: true,
  pointsChange: true,
};

export const useSettingsStore = create<UserSettingsState>()(
  persist(
    (set) => ({
      citationFormat: 'bibtex',
      notifications: { ...defaultNotifications },

      setCitationFormat: (format) => set({ citationFormat: format }),

      setNotification: (key, value) =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            [key]: value,
          },
        })),

      resetSettings: () =>
        set({
          citationFormat: 'bibtex',
          notifications: { ...defaultNotifications },
        }),
    }),
    {
      name: 'joan_academic_settings',
    }
  )
);
