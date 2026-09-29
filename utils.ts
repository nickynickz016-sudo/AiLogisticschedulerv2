import * as XLSX from 'xlsx';

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

export const formatJobNoForExcel = (id: string): string => {
  if (!id) return '';
  // First strip multi-day, sub-job, hash suffixes
  let clean = getCleanJobNo(id);
  // Strip leading AE- prefix (case-insensitive, with hyphen, underscore or space)
  clean = clean.replace(/^AE[-_ ]?/i, '');
  // Also strip any remaining day/sub suffixes if present (e.g., -D1, -Day 2, #...)
  clean = clean.replace(/[-_]D\d+(-\d+)?$/i, '')
               .replace(/[-_]Day\s*\d+(-\d+)?$/i, '')
               .replace(/#.*$/, '')
               .trim();
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

export const isMultiDayJob = (job: any): boolean => {
  if (!job) return false;
  if (job.duration && job.duration > 1) return true;
  if (job.id && (job.id.includes('#day') || job.id.toLowerCase().includes('-d'))) return true;
  return false;
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

    // Auto-prune activity logs, snapshots, and large arrays before saving to localStorage
    let payload = value;
    if (key.includes('activity_logs') || key.includes('history') || key.includes('archive')) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.length > 20) {
          payload = JSON.stringify(parsed.slice(0, 20));
        }
      } catch (_) {}
    }

    try {
      localStorage.setItem(key, payload);
    } catch (e) {
      // Attempt quota recovery
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
            k.startsWith('google_calendar_tokens') ||
            k.includes('_temp_')
          )) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => {
          try { localStorage.removeItem(k); } catch (_) {}
        });
        
        // Compact known heavy keys
        const pruneList = [
          'writer_activity_logs',
          'writer_quotations',
          'writer_local_daily_monitoring_data',
          'writer_local_surprise_visits_data',
          'writer_local_safety_checks_data',
          'writer_local_patrol_logs_data',
          'writer_local_checklists_data',
          'writer_local_surveys_data'
        ];
        pruneList.forEach(pk => {
          try {
            const stored = localStorage.getItem(pk);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed)) {
                const limit = pk.includes('activity_logs') ? 10 : 3;
                if (parsed.length > limit) {
                  localStorage.setItem(pk, JSON.stringify(parsed.slice(0, limit)));
                }
              }
            }
          } catch (_) {}
        });

        // If target payload is an array, trim more aggressively
        try {
          const parsed = JSON.parse(payload);
          if (Array.isArray(parsed) && parsed.length > 10) {
            payload = JSON.stringify(parsed.slice(0, 10));
          }
        } catch (_) {}

        localStorage.setItem(key, payload);
      } catch (_) {
        // Silently keep in memory storage - session continuity is preserved without warning noise
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

/**
 * Universally downloads a PDF file across all desktop/mobile browsers,
 * iframe environments (such as AI Studio preview or sandboxed portals), and platforms.
 */
export const downloadPdfBlob = (blob: Blob, fileName: string): void => {
  try {
    // 1. IE / legacy Edge msSaveOrOpenBlob
    if (typeof (window.navigator as any)?.msSaveOrOpenBlob === 'function') {
      (window.navigator as any).msSaveOrOpenBlob(blob, fileName);
      return;
    }

    // 2. Standard Blob Object URL via hidden link (without target="_blank" so download attribute isn't suppressed)
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      try {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (_) {}
    }, 2000);
  } catch (err) {
    console.warn('downloadPdfBlob standard trigger failed, attempting FileReader data URL fallback:', err);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const link = document.createElement('a');
        link.href = base64data;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          try { document.body.removeChild(link); } catch (_) {}
        }, 2000);
      };
      reader.readAsDataURL(blob);
    } catch (fallbackErr) {
      console.error('All PDF download mechanisms failed:', fallbackErr);
    }
  }
};

/**
 * Universally downloads an XLSX workbook across all desktop/mobile browsers,
 * iframe environments (such as AI Studio preview or sandboxed portals), and platforms.
 */
export const downloadExcelWorkbook = (wb: XLSX.WorkBook, fileName: string): void => {
  try {
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    // Check for IE / legacy edge msSaveOrOpenBlob
    if (typeof (window.navigator as any)?.msSaveOrOpenBlob === 'function') {
      (window.navigator as any).msSaveOrOpenBlob(blob, fileName);
      return;
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      try {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (e) {
        // ignore cleanup errors
      }
    }, 1500);
  } catch (error) {
    console.warn('Blob Excel download failed, falling back to XLSX.writeFile:', error);
    XLSX.writeFile(wb, fileName);
  }
};

