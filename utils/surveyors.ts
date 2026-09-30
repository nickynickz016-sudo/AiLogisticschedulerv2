import { AssignableSurveyor, BranchCode } from '../types';
import { safeLocalStorage } from '../utils';
import { supabase } from '../supabaseClient';

export const DEFAULT_BRANCH_SURVEYORS: Record<BranchCode, AssignableSurveyor[]> = {
  UAE: [
    { id: 'OPS-101', name: 'Roxanne', branch: 'UAE' },
    { id: 'OPS-102', name: 'Poonam', branch: 'UAE' },
    { id: 'OPS-103', name: 'Divya', branch: 'UAE' },
    { id: 'OPS-204', name: 'Allen', branch: 'UAE' },
    { id: 'OPS-205', name: 'Daryl', branch: 'UAE' }
  ],
  KSA: [
    { id: 'KSA-SD1', name: 'Tariq Mansoor', branch: 'KSA' },
    { id: 'KSA-SD2', name: 'Sultan Al-Harbi', branch: 'KSA' },
    { id: 'KSA-SD3', name: 'Fahad Al-Otaibi', branch: 'KSA' },
    { id: 'KSA-SD4', name: 'Omar Al-Ghamdi', branch: 'KSA' }
  ],
  QATAR: [
    { id: 'QAT-SD1', name: 'Rashid Al-Kuwari', branch: 'QATAR' },
    { id: 'QAT-SD2', name: 'Mansoor Al-Hajri', branch: 'QATAR' },
    { id: 'QAT-SD3', name: 'Hamad Al-Thani', branch: 'QATAR' },
    { id: 'QAT-SD4', name: 'Salem Al-Marri', branch: 'QATAR' }
  ]
};

const STORAGE_KEY_PREFIX = 'writer_branch_surveyors_';

export const getBranchSurveyors = (branch: BranchCode = 'UAE'): AssignableSurveyor[] => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${branch}`;
    const saved = safeLocalStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading branch surveyors from storage:', err);
  }
  return DEFAULT_BRANCH_SURVEYORS[branch] || DEFAULT_BRANCH_SURVEYORS.UAE;
};

export const saveBranchSurveyors = async (branch: BranchCode, surveyors: AssignableSurveyor[]) => {
  const key = `${STORAGE_KEY_PREFIX}${branch}`;
  safeLocalStorage.setItem(key, JSON.stringify(surveyors));

  // Dispatch browser event for immediate reactivity across open tabs/components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('branch_surveyors_updated', {
      detail: { branch, surveyors }
    }));
  }

  // Sync to Supabase system_settings so changes persist across devices & users
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('daily_job_limits')
      .eq('id', 1)
      .single();

    const currentLimits = data?.daily_job_limits || {};
    const updatedSurveyorMap = {
      ...(currentLimits.__branch_surveyors || {}),
      [branch]: surveyors
    };

    await supabase
      .from('system_settings')
      .update({
        daily_job_limits: {
          ...currentLimits,
          __branch_surveyors: updatedSurveyorMap
        }
      })
      .eq('id', 1);
  } catch (err) {
    console.warn('Could not sync branch surveyors to Supabase:', err);
  }
};

export const resetBranchSurveyors = async (branch: BranchCode): Promise<AssignableSurveyor[]> => {
  const defaults = DEFAULT_BRANCH_SURVEYORS[branch] || DEFAULT_BRANCH_SURVEYORS.UAE;
  await saveBranchSurveyors(branch, defaults);
  return defaults;
};

export const subscribeToBranchSurveyors = (
  callback: (branch: BranchCode, surveyors: AssignableSurveyor[]) => void
): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<{ branch: BranchCode; surveyors: AssignableSurveyor[] }>;
    if (customEvent.detail) {
      callback(customEvent.detail.branch, customEvent.detail.surveyors);
    }
  };
  window.addEventListener('branch_surveyors_updated', handler);
  return () => window.removeEventListener('branch_surveyors_updated', handler);
};

