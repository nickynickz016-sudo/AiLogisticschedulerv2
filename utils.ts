export const getUAEToday = (): string => {
  // Returns YYYY-MM-DD in Asia/Dubai timezone
  return new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Dubai', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).format(new Date());
};

export const getUAEDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'Asia/Dubai', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).format(date);
};

export const getCleanJobNo = (id: string): string => {
  if (!id) return '';
  // Split by '#' first (new format: AE-12345#day1-1)
  const hashSplit = id.split('#')[0];
  
  // Handle legacy multi-day format first (AE-12345-D2 or AE-12345-D2-1)
  const clean = hashSplit.replace(/-D\d+(-\d+)?$/i, '');
  
  // For legacy single-day duplicate format like AE-12345-26-1, or any custom format ending in a suffix:
  // We only strip the last numeric suffix if the ID has 4 or more hyphenated parts (e.g. AE-3522-26-1 -> AE-3522-26)
  // This preserves the year suffix "-26" (which results in 3 parts: AE-3522-26)
  const parts = clean.split('-');
  if (parts.length >= 4) {
    const last = parts[parts.length - 1];
    const prev = parts[parts.length - 2];
    if (/^\d+$/.test(last) && /^\d+$/.test(prev)) {
      return parts.slice(0, -1).join('-');
    }
  }
  
  return clean;
};

export const getJobDayNumber = (id: string): number => {
  if (!id) return 1;
  const hashMatch = id.match(/#day(\d+)/i);
  if (hashMatch) return parseInt(hashMatch[1], 10);
  const legacyMatch = id.match(/-D(\d+)/i);
  if (legacyMatch) return parseInt(legacyMatch[1], 10);
  return 1;
};

export const getJobDayLabel = (id: string, duration?: number): string | null => {
  const dayNum = getJobDayNumber(id);
  const hasDaySuffix = id.includes('#day') || id.toLowerCase().includes('-d');
  
  if (hasDaySuffix || (duration && duration > 1)) {
    if (duration && duration > 1) {
      return `Day ${dayNum} of ${duration}`;
    }
    return `Day ${dayNum}`;
  }
  
  return null;
};

const memoryStorage = new Map<string, string>();

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (memoryStorage.has(key)) {
      return memoryStorage.get(key) || null;
    }
    try {
      const val = localStorage.getItem(key);
      if (val !== null) {
        memoryStorage.set(key, val);
      }
      return val;
    } catch (e) {
      console.warn("Storage access denied for key:", key, e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    // Always store in memory fallback to guarantee availability during active session
    memoryStorage.set(key, value);
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("Storage set failed for key:", key, "Attempting to prune old keys to free up space...", e);
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (
            k.startsWith('job_confirmed_') || 
            k.startsWith('survey_lost_reason_') || 
            k.startsWith('survey_alert_sent_') || 
            k.startsWith('notifications_') || 
            k.startsWith('jobs_snapshot_') ||
            k.startsWith('google_calendar_tokens')
          )) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        
        const pruneList = [
          'writer_local_daily_monitoring_data',
          'writer_local_surprise_visits_data',
          'writer_local_safety_checks_data',
          'writer_local_patrol_logs_data',
          'writer_local_checklists_data',
          'writer_local_surveys_data',
          'writer_survey_packing_lists_v1',
          'writer_survey_packing_audit_v1'
        ];
        pruneList.forEach(pk => {
          const stored = localStorage.getItem(pk);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 5) {
                const pruned = parsed.slice(-5);
                localStorage.setItem(pk, JSON.stringify(pruned));
              }
            } catch (_) {}
          }
        });

        localStorage.setItem(key, value);
        console.log("Successfully recovered from QuotaExceededError and saved key:", key);
      } catch (retryError) {
        console.warn("Notice: Storage set failed even after pruning. Stored in memory-only mode for key:", key);
      }
    }
  },
  removeItem: (key: string): void => {
    memoryStorage.delete(key);
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("Storage remove failed for key:", key, e);
    }
  },
  getAllKeys: (): string[] => {
    const keys = new Set<string>(memoryStorage.keys());
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) keys.add(k);
      }
    } catch (e) {
      console.warn("Storage keys iteration failed:", e);
    }
    return Array.from(keys);
  }
};

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      console.warn("SessionStorage access denied for key:", key, e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {
      console.warn("SessionStorage set failed for key:", key, e);
    }
  },
  removeItem: (key: string): void => {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      console.warn("SessionStorage remove failed for key:", key, e);
    }
  }
};
