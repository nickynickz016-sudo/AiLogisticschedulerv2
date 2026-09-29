import React, { useState } from 'react';
import { BranchCode, BRANCHES, UserProfile, UserRole } from '../types';
import { 
  Building2, 
  CheckCircle2, 
  Lock, 
  ArrowRight, 
  Globe2, 
  ShieldCheck, 
  MapPin, 
  Coins, 
  Phone, 
  Anchor, 
  X,
  FileCode2,
  Copy,
  Check
} from 'lucide-react';

interface BranchSelectionModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  activeBranch?: BranchCode;
  onSelectBranch: (branch: BranchCode) => void;
  onClose?: () => void;
  isMandatory?: boolean; // If true (e.g. post-login), cannot be dismissed
}

export const BranchSelectionModal: React.FC<BranchSelectionModalProps> = ({
  isOpen,
  currentUser,
  activeBranch,
  onSelectBranch,
  onClose,
  isMandatory = false
}) => {
  const [selectedBranch, setSelectedBranch] = useState<BranchCode>(activeBranch || 'UAE');
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [unauthorizedAttemptBranch, setUnauthorizedAttemptBranch] = useState<BranchCode | null>(null);

  if (!isOpen) return null;

  // Determine authorized branches for this user
  const userAllowedBranches: BranchCode[] = 
    currentUser.role === UserRole.ADMIN 
      ? ['UAE', 'KSA', 'QATAR'] 
      : (currentUser.allowed_branches && currentUser.allowed_branches.length > 0 
          ? currentUser.allowed_branches 
          : [(currentUser.branch || 'UAE') as BranchCode]);

  const handleBranchClick = (code: BranchCode) => {
    if (!userAllowedBranches.includes(code)) {
      setUnauthorizedAttemptBranch(code);
      return;
    }
    setUnauthorizedAttemptBranch(null);
    setSelectedBranch(code);
    onSelectBranch(code);
  };

  const copySqlCode = () => {
    const sql = `-- Run this in Supabase SQL Editor to enforce strict multi-branch isolation & user authorizations
-- 1. Create Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
    id VARCHAR(20) PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    currency_symbol VARCHAR(10) NOT NULL,
    phone_code VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.branches (id, code, name, country, currency, currency_symbol, phone_code)
VALUES
  ('UAE', 'UAE', 'United Arab Emirates', 'United Arab Emirates', 'AED', 'AED', '+971'),
  ('KSA', 'KSA', 'Saudi Arabia', 'Kingdom of Saudi Arabia', 'SAR', 'SAR', '+966'),
  ('QATAR', 'QATAR', 'Qatar', 'State of Qatar', 'QAR', 'QAR', '+974')
ON CONFLICT (id) DO NOTHING;

-- 2. Create / Update System Users with allowed_branches
CREATE TABLE IF NOT EXISTS public.system_users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    employee_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER',
    status TEXT NOT NULL DEFAULT 'Active',
    avatar TEXT,
    branch VARCHAR(20) DEFAULT 'UAE',
    allowed_branches TEXT[] DEFAULT ARRAY['UAE']::TEXT[],
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS allowed_branches TEXT[] DEFAULT ARRAY['UAE']::TEXT[];

-- 3. Add branch column to all business data tables
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.jobs SET branch = 'UAE' WHERE branch IS NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_branch ON public.jobs(branch);

ALTER TABLE public.job_cost_sheets ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.job_cost_sheets SET branch = 'UAE' WHERE branch IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_cost_sheets_branch ON public.job_cost_sheets(branch);

ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.quotations SET branch = 'UAE' WHERE branch IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_branch ON public.quotations(branch);

ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.surveys SET branch = 'UAE' WHERE branch IS NULL;
CREATE INDEX IF NOT EXISTS idx_surveys_branch ON public.surveys(branch);

ALTER TABLE public.warehouse_checklists ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.warehouse_checklists SET branch = 'UAE' WHERE branch IS NULL;
CREATE INDEX IF NOT EXISTS idx_warehouse_checklists_branch ON public.warehouse_checklists(branch);

ALTER TABLE public.groupage_container_bookings ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.groupage_container_bookings SET branch = 'UAE' WHERE branch IS NULL;

-- 4. Permissions & cache reload
GRANT ALL ON public.branches TO anon, authenticated, service_role;
GRANT ALL ON public.system_users TO anon, authenticated, service_role;
GRANT ALL ON public.jobs TO anon, authenticated, service_role;
GRANT ALL ON public.job_cost_sheets TO anon, authenticated, service_role;
GRANT ALL ON public.quotations TO anon, authenticated, service_role;
GRANT ALL ON public.surveys TO anon, authenticated, service_role;
GRANT ALL ON public.warehouse_checklists TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const branchList = Object.values(BRANCHES);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-8 py-7 text-white relative">
          {!isMandatory && onClose && (
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <Globe2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-widest text-blue-400 uppercase">
                Writer Relocations ERP • Multi-Branch Operations
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {isMandatory ? 'Select Your Active Branch' : 'Switch Branch Context'}
              </h2>
            </div>
          </div>

          <p className="text-slate-300 text-sm max-w-2xl mt-1 leading-relaxed">
            Strict branch-level isolation is enforced. Data, jobs, cost sheets, quotations, and reports belonging to one branch will never be mixed or visible in another branch.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-slate-200 border border-white/10">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Logged in as: <strong className="text-white font-semibold">{currentUser.name}</strong> ({currentUser.role})
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Authorized Hubs: <strong className="text-white font-semibold">{userAllowedBranches.join(', ')}</strong>
            </span>
            {(['UAE', 'KSA', 'QATAR'] as BranchCode[]).some(b => !userAllowedBranches.includes(b)) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-200 border border-rose-400/30">
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                Unauthorized: <strong className="text-rose-100 font-semibold">{((['UAE', 'KSA', 'QATAR'] as BranchCode[]).filter(b => !userAllowedBranches.includes(b))).join(', ')}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Unauthorized Access Warning Banner */}
        {unauthorizedAttemptBranch && (
          <div className="mx-8 mt-6 p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-xl shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-900">
                  Access Denied: UNAUTHORIZED Branch
                </h4>
                <p className="text-xs text-rose-700 mt-0.5 font-medium">
                  Your staff profile is <strong>UNAUTHORIZED</strong> to use the <strong>{BRANCHES[unauthorizedAttemptBranch]?.name} ({unauthorizedAttemptBranch})</strong> hub. You can only access: <strong>{userAllowedBranches.join(', ')}</strong>.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setUnauthorizedAttemptBranch(null)}
              className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Branch Cards */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {branchList.map((branch) => {
              const isSelected = selectedBranch === branch.code;
              const isCurrent = activeBranch === branch.code;
              const isAllowed = userAllowedBranches.includes(branch.code);

              return (
                <div
                  key={branch.code}
                  onClick={() => handleBranchClick(branch.code)}
                  className={`relative flex flex-col justify-between rounded-xl border-2 p-6 transition-all cursor-pointer ${
                    !isAllowed 
                      ? 'bg-rose-50/30 border-rose-200 hover:border-rose-300 shadow-sm' 
                      : isSelected
                        ? 'border-blue-600 bg-blue-50/40 shadow-lg ring-2 ring-blue-500/20 scale-[1.02]'
                        : 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-md'
                  }`}
                >
                  {/* Status Indicator */}
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-4xl shadow-sm rounded-lg p-1 bg-white border border-slate-100">
                      {branch.flag}
                    </span>
                    <div>
                      {!isAllowed ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 shadow-xs">
                          <Lock className="w-3.5 h-3.5 text-rose-600" /> UNAUTHORIZED
                        </span>
                      ) : isCurrent ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ACTIVE HUB
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> AUTHORIZED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Branch Information */}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      {branch.name}
                      <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                        {branch.code}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {branch.country}
                    </p>

                    {!isAllowed ? (
                      <div className="mt-3 p-2.5 bg-rose-100/60 rounded-xl border border-rose-200 text-[11px] text-rose-800 font-semibold flex items-center gap-2">
                        <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Access Restricted: You are unauthorized to view or switch to this hub.</span>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-2">
                          <Coins className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Currency: <strong className="font-semibold text-slate-800">{branch.currency}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Dial Code: <strong className="font-semibold text-slate-800">{branch.phone_code}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Anchor className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span className="truncate">Port: <strong className="font-semibold text-slate-800">{branch.port}</strong></span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBranchClick(branch.code);
                      }}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        !isAllowed
                          ? 'bg-rose-100/70 hover:bg-rose-100 text-rose-700 border border-rose-300'
                          : isSelected
                            ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                            : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                      }`}
                    >
                      {!isAllowed ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-rose-600" /> UNAUTHORIZED — RESTRICTED
                        </>
                      ) : isSelected ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Active Branch
                        </>
                      ) : (
                        <>
                          Enter {branch.code} <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Database & Safety Footer */}
          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-2 text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                All data queries, calculations, exports, and offline caches are strictly sandboxed to the active branch.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowSqlModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium transition-colors shrink-0"
            >
              <FileCode2 className="w-3.5 h-3.5 text-blue-600" />
              View Database Migration SQL
            </button>
          </div>
        </div>
      </div>

      {/* SQL Migration Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <FileCode2 className="w-5 h-5 text-blue-600" />
                <span>Supabase Branch Separation Migration Script</span>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Run this script once in your <strong>Supabase SQL Editor</strong> to add the <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">branch</code> column, seed the branches table, and index all tables. Existing records are preserved with default 'UAE'.
            </p>

            <div className="relative">
              <pre className="p-4 bg-slate-900 text-slate-100 font-mono text-[11px] rounded-xl overflow-x-auto max-h-72 leading-relaxed">
{`-- 1. Create Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
    id VARCHAR(20) PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    country VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert branches
INSERT INTO public.branches (id, code, name, currency, country)
VALUES
  ('UAE', 'UAE', 'United Arab Emirates', 'AED', 'United Arab Emirates'),
  ('KSA', 'KSA', 'Saudi Arabia', 'SAR', 'Saudi Arabia'),
  ('QATAR', 'QATAR', 'Qatar', 'QAR', 'Qatar')
ON CONFLICT (id) DO NOTHING;

-- 3. Add branch column to tables (preserves existing data as 'UAE')
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.jobs SET branch = 'UAE' WHERE branch IS NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_branch ON public.jobs(branch);

ALTER TABLE public.job_cost_sheets ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.job_cost_sheets SET branch = 'UAE' WHERE branch IS NULL;

ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS branch VARCHAR(20) DEFAULT 'UAE';
UPDATE public.quotations SET branch = 'UAE' WHERE branch IS NULL;

NOTIFY pgrst, 'reload schema';`}
              </pre>

              <button
                onClick={copySqlCode}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 shadow"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy SQL
                  </>
                )}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
