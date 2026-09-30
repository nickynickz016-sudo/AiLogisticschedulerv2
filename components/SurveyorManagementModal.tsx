import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Edit2, Trash2, RotateCcw, Check, User, 
  Shield, CheckCircle2, AlertCircle, Info, Sparkles, Building2
} from 'lucide-react';
import { AssignableSurveyor, BranchCode, BRANCHES, Survey } from '../types';
import { 
  getBranchSurveyors, 
  saveBranchSurveyors, 
  resetBranchSurveyors, 
  DEFAULT_BRANCH_SURVEYORS 
} from '../utils/surveyors';

interface SurveyorManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBranch?: BranchCode;
  surveys?: Survey[];
  onSurveyorsUpdated: (branch: BranchCode, updated: AssignableSurveyor[]) => void;
}

export const SurveyorManagementModal: React.FC<SurveyorManagementModalProps> = ({
  isOpen,
  onClose,
  activeBranch = 'UAE',
  surveys = [],
  onSurveyorsUpdated
}) => {
  const [selectedBranch, setSelectedBranch] = useState<BranchCode>(activeBranch);
  const [surveyorList, setSurveyorList] = useState<AssignableSurveyor[]>([]);
  
  // Add / Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formId, setFormId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync list when selectedBranch or modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedBranch(activeBranch);
      loadBranch(activeBranch);
    }
  }, [isOpen, activeBranch]);

  const loadBranch = (b: BranchCode) => {
    const list = getBranchSurveyors(b);
    setSurveyorList(list);
    resetForm();
  };

  const handleBranchTabChange = (b: BranchCode) => {
    setSelectedBranch(b);
    loadBranch(b);
    setErrorMessage('');
    setSuccessMessage('');
    setDeleteConfirmId(null);
    setShowResetConfirm(false);
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormName('');
    setFormId('');
    setErrorMessage('');
    setDeleteConfirmId(null);
  };

  const handleStartEdit = (s: AssignableSurveyor) => {
    setIsEditing(true);
    setEditingId(s.id);
    setFormName(s.name);
    setFormId(s.id);
    setErrorMessage('');
    setSuccessMessage('');
    setDeleteConfirmId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    // Auto-generate ID if left empty
    let cleanId = formId.trim().toUpperCase();
    if (!cleanId && cleanName) {
      const prefix = selectedBranch === 'KSA' ? 'KSA-SD' : selectedBranch === 'QATAR' ? 'QAT-SD' : 'OPS-';
      cleanId = `${prefix}${surveyorList.length + 1}`;
    }

    if (!cleanName) {
      setErrorMessage('Surveyor / SD name is required.');
      return;
    }
    if (!cleanId) {
      setErrorMessage('Employee ID or code is required.');
      return;
    }

    let nextList: AssignableSurveyor[];

    if (isEditing && editingId) {
      // Check for duplicate ID on another surveyor
      if (surveyorList.some(s => s.id === cleanId && s.id !== editingId)) {
        setErrorMessage(`Surveyor with ID "${cleanId}" already exists.`);
        return;
      }
      nextList = surveyorList.map(s => {
        if (s.id === editingId) {
          return { ...s, id: cleanId, name: cleanName, branch: selectedBranch };
        }
        return s;
      });
      setSuccessMessage(`Updated "${cleanName}" (${cleanId}) for ${BRANCHES[selectedBranch]?.name || selectedBranch}.`);
    } else {
      // New Surveyor
      if (surveyorList.some(s => s.id === cleanId)) {
        setErrorMessage(`Surveyor with ID "${cleanId}" already exists.`);
        return;
      }
      if (surveyorList.some(s => s.name.toLowerCase() === cleanName.toLowerCase())) {
        setErrorMessage(`Surveyor named "${cleanName}" already exists for this branch.`);
        return;
      }

      const newSurveyor: AssignableSurveyor = {
        id: cleanId,
        name: cleanName,
        branch: selectedBranch
      };
      nextList = [...surveyorList, newSurveyor];
      setSuccessMessage(`Added new SD "${cleanName}" (${cleanId}) for ${BRANCHES[selectedBranch]?.name || selectedBranch}.`);
    }

    setSurveyorList(nextList);
    await saveBranchSurveyors(selectedBranch, nextList);
    onSurveyorsUpdated(selectedBranch, nextList);
    resetForm();
  };

  const handleRequestDelete = (id: string) => {
    if (surveyorList.length <= 1) {
      setErrorMessage('You must keep at least 1 SD / Surveyor configured for this hub.');
      return;
    }
    setDeleteConfirmId(id);
    setErrorMessage('');
  };

  const handleConfirmDelete = async (id: string, name: string) => {
    const nextList = surveyorList.filter(s => s.id !== id);
    setSurveyorList(nextList);
    await saveBranchSurveyors(selectedBranch, nextList);
    onSurveyorsUpdated(selectedBranch, nextList);
    setSuccessMessage(`Removed "${name}" from ${BRANCHES[selectedBranch]?.name || selectedBranch}.`);
    setDeleteConfirmId(null);
    if (editingId === id) resetForm();
  };

  const handleConfirmResetDefaults = async () => {
    const defaults = await resetBranchSurveyors(selectedBranch);
    setSurveyorList(defaults);
    onSurveyorsUpdated(selectedBranch, defaults);
    resetForm();
    setShowResetConfirm(false);
    setSuccessMessage(`Reset ${BRANCHES[selectedBranch]?.name || selectedBranch} SD team to system defaults.`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-100">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                Manage SDs / Surveyors
                <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Branch Aware
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Configure assignable Survey Directors / Surveyors for UAE, KSA, and Qatar
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Branch Selector Tabs */}
        <div className="px-6 pt-4 pb-2 bg-white border-b border-slate-100">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {(['UAE', 'KSA', 'QATAR'] as BranchCode[]).map(b => (
              <button
                key={b}
                type="button"
                onClick={() => handleBranchTabChange(b)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  selectedBranch === b
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className="text-base">{BRANCHES[b]?.flag}</span>
                <span>{BRANCHES[b]?.name} ({b})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Messages */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Add / Edit Form Card */}
          <form onSubmit={handleSave} className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                {isEditing ? <Edit2 className="w-3.5 h-3.5 text-indigo-600" /> : <Plus className="w-3.5 h-3.5 text-indigo-600" />}
                {isEditing ? `Edit Surveyor (${editingId})` : `Add Surveyor to ${BRANCHES[selectedBranch]?.name}`}
              </h4>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[10px] font-bold text-indigo-600 hover:underline"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Surveyor / SD Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tariq Mansoor, Roxanne, etc."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Employee ID / Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. OPS-101, KSA-SD1, QAT-SD1"
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400 uppercase"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                {isEditing ? 'Update Surveyor' : 'Add to Team'}
              </button>
            </div>
          </form>

          {/* Current Branch SD List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>{BRANCHES[selectedBranch]?.flag}</span>
                <span>Configured SDs for {BRANCHES[selectedBranch]?.name} ({surveyorList.length})</span>
              </h4>
              {showResetConfirm ? (
                <div className="flex items-center gap-2 animate-in fade-in">
                  <span className="text-[10px] text-amber-700 font-bold">Reset SDs to defaults?</span>
                  <button
                    type="button"
                    onClick={handleConfirmResetDefaults}
                    className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 hover:bg-amber-100"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Restore default surveyors for this branch"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Defaults
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs">
              {surveyorList.map((surveyor) => {
                // Check if this surveyor has active surveys
                const assignedCount = surveys.filter(s => 
                  s.surveyor_name.toLowerCase() === surveyor.name.toLowerCase() &&
                  (s.branch ? s.branch === selectedBranch : true)
                ).length;

                const isConfirmingThis = deleteConfirmId === surveyor.id;

                return (
                  <div 
                    key={surveyor.id} 
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0">
                        {surveyor.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 truncate">
                          {surveyor.name}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-2">
                          <span>ID: {surveyor.id}</span>
                          <span>•</span>
                          <span>{assignedCount} surveys assigned</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isConfirmingThis ? (
                        <div className="flex items-center gap-1.5 bg-rose-50 px-2 py-1 rounded-xl border border-rose-200 animate-in fade-in">
                          <span className="text-[10px] font-bold text-rose-700">Remove?</span>
                          <button
                            type="button"
                            onClick={() => handleConfirmDelete(surveyor.id, surveyor.name)}
                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[10px] font-black uppercase transition-colors"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-[10px] font-black uppercase transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(surveyor)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Edit SD details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequestDelete(surveyor.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete SD from this hub"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span className="text-[11px] text-slate-400">
            Changes take effect immediately across Survey Tracker and Terminal Hub.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
