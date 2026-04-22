import React, { useState, useRef, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Save, 
  History, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  FileText,
  Truck,
  Building2,
  Lock,
  Zap,
  ShieldCheck,
  ChevronDown,
  Download,
  Check,
  Eye,
  Eraser,
  PenTool,
  Clock8,
  Camera,
  MapPin,
  Flame,
  Wind,
  Activity,
  HardDrive
} from 'lucide-react';
import { 
  WarehouseChecklist as IWarehouseChecklist, 
  NightPatrollingChecklist as IPatrolLog,
  SafetyMonitoringChecklist as ISafetyCheck,
  SurpriseVisitChecklist,
  DailyMonitoringChecklist,
  UserProfile, 
  UserRole 
} from '../types';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const renderSection = (title: string, icon: React.ReactNode) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
      {icon}
    </div>
    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">{title}</h3>
  </div>
);

interface SectionCheckboxProps {
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
  remarks?: string;
  onRemarksChange?: (val: string) => void;
  timestamp?: string;
  disabled?: boolean;
  extraInputLabel?: string;
  extraInputValue?: string;
  onExtraInputChange?: (val: string) => void;
}

const SectionCheckbox = ({ 
  label, 
  value, 
  onChange, 
  remarks, 
  onRemarksChange,
  timestamp,
  disabled = false,
  extraInputLabel,
  extraInputValue,
  onExtraInputChange
}: SectionCheckboxProps) => (
  <div className="flex flex-col gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
    <div className="flex items-center justify-between">
      <div className="flex flex-col">
        <span className="text-sm font-bold text-slate-700">{label}</span>
        {timestamp && <span className="text-[9px] font-medium text-slate-400 italic">Stamped: {timestamp}</span>}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(true)}
          className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            value ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-white text-slate-400 border border-slate-200 hover:border-emerald-200'
          } ${disabled ? 'cursor-not-allowed opacity-80' : ''}`}
        >
          True
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(false)}
          className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            !value ? 'bg-rose-500 text-white shadow-lg shadow-rose-100' : 'bg-white text-slate-400 border border-slate-200 hover:border-rose-200'
          } ${disabled ? 'cursor-not-allowed opacity-80' : ''}`}
        >
          False
        </button>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {onExtraInputChange && (
        <div className="flex flex-col gap-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">{extraInputLabel}</label>
          <input
            placeholder="..."
            readOnly={disabled}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
            value={extraInputValue}
            onChange={(e) => onExtraInputChange(e.target.value)}
          />
        </div>
      )}
      {onRemarksChange && (
        <div className="flex flex-col gap-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Remarks</label>
          <input
            placeholder="Remarks..."
            readOnly={disabled}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
            value={remarks}
            onChange={(e) => onRemarksChange(e.target.value)}
          />
        </div>
      )}
    </div>
  </div>
);

interface WarehouseChecklistProps {
  checklists: IWarehouseChecklist[];
  patrolLogs: IPatrolLog[];
  safetyChecks: ISafetyCheck[];
  surpriseVisits: SurpriseVisitChecklist[];
  dailyMonitoring: DailyMonitoringChecklist[];
  onSave: (checklist: Omit<IWarehouseChecklist, 'id'>) => void;
  onUpdate: (id: string, checklist: Partial<IWarehouseChecklist>) => void;
  onSavePatrol: (log: Omit<IPatrolLog, 'id'>) => void;
  onUpdatePatrol: (id: string, log: Partial<IPatrolLog>) => void;
  onSaveSafety: (check: Omit<ISafetyCheck, 'id'>) => void;
  onUpdateSafety: (id: string, check: Partial<ISafetyCheck>) => void;
  onSaveSurprise: (visit: Omit<SurpriseVisitChecklist, 'id'>) => void;
  onUpdateSurprise: (id: string, visit: Partial<SurpriseVisitChecklist>) => void;
  onSaveDaily: (check: Omit<DailyMonitoringChecklist, 'id'>) => void;
  onUpdateDaily: (id: string, check: Partial<DailyMonitoringChecklist>) => void;
  currentUser: UserProfile;
}

const initialPatrolRounds = [
  { title: '1st Round', time_range: '01:00 - 01:30' },
  { title: '2nd Round', time_range: '01:45 - 02:15' },
  { title: '3rd Round', time_range: '02:30 - 03:00' },
  { title: '4th Round', time_range: '03:15 - 03:45' },
  { title: '5th Round', time_range: '04:00 - 04:30' },
  { title: '6th Round', time_range: '04:45 - 05:15' },
].map((r, i) => ({
  id: `r${i+1}`,
  title: r.title,
  time_range: r.time_range,
  checkpoints: [
    { camera_no: '01', location: 'Office / WH Main Gate' },
    { camera_no: '02', location: 'A- Warehouse & Exit Door Check' },
    { camera_no: '03', location: 'B- Warehouse & Exit Door Check' },
    { camera_no: '04', location: 'C- Warehouse & Exit Door Check' },
    { camera_no: '05', location: 'D- Warehouse & Exit Door Check' },
    { camera_no: '06', location: 'All WH Loading Area Check' },
    { camera_no: '07', location: 'Pump Room Check' },
    { camera_no: '08', location: 'Electric Room Check' },
    { camera_no: '09', location: 'Out Side pantry check' },
    { camera_no: '10', location: 'Back yard Check' },
  ].map(cp => ({ ...cp, actual_time: '', guard_name: '', signature: '', timestamp: '' }))
}));

export const WarehouseChecklist: React.FC<WarehouseChecklistProps> = ({ 
  checklists, 
  patrolLogs,
  safetyChecks,
  surpriseVisits,
  dailyMonitoring,
  onSave,
  onUpdate,
  onSavePatrol,
  onUpdatePatrol,
  onSaveSafety,
  onUpdateSafety,
  onSaveSurprise,
  onUpdateSurprise,
  onSaveDaily,
  onUpdateDaily,
  currentUser 
}) => {
  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'approval'>('new');
  const [moduleType, setModuleType] = useState<'closing' | 'patrolling' | 'safety' | 'surprise' | 'daily'>('closing');
  const [selectedChecklist, setSelectedChecklist] = useState<IWarehouseChecklist | null>(null);
  const [selectedPatrol, setSelectedPatrol] = useState<IPatrolLog | null>(null);
  const [selectedSafety, setSelectedSafety] = useState<ISafetyCheck | null>(null);
  const [selectedSurprise, setSelectedSurprise] = useState<SurpriseVisitChecklist | null>(null);
  const [selectedDaily, setSelectedDaily] = useState<DailyMonitoringChecklist | null>(null);
  const [declineComments, setDeclineComments] = useState('');
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  
  const sigPadSecurity = useRef<SignatureCanvas>(null);
  const sigPadAdmin = useRef<SignatureCanvas>(null);
  const sigPadWarehouse = useRef<SignatureCanvas>(null);

  const initialPatrolForm = {
    date: new Date().toISOString().split('T')[0],
    location: 'Dubai',
    status: 'Pending Approval' as const,
    rounds: initialPatrolRounds,
    unusual_observation: '',
    security_guard_name: currentUser.name,
    security_guard_signature: '',
    field_timestamps: {},
  };

  const initialClosingForm = {
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    status: 'Pending Approval' as const,
    office_locked: { status: false, remarks: '', timestamp: '' },
    lights_off: { status: false, remarks: '', timestamp: '' },
    emergency_exits_locked: { status: false, remarks: '', timestamp: '' },
    warehouse_sections: {
      A: { status: false, lights_off: false, biometric_working: false, fans_off: false, time: '', remarks: '', timestamp: '' },
      B: { status: false, lights_off: false, biometric_working: false, fans_off: false, time: '', remarks: '', timestamp: '' },
      C: { status: false, lights_off: false, biometric_working: false, fans_off: false, time: '', remarks: '', timestamp: '' },
      D: { status: false, lights_off: false, biometric_working: false, fans_off: false, time: '', remarks: '', timestamp: '' },
    },
    no_personal_belongings: false,
    no_personal_belongings_timestamp: '',
    water_taps_closed: false,
    water_taps_closed_timestamp: '',
    round_taken: false,
    round_taken_timestamp: '',
    lights_operational: false,
    lights_operational_timestamp: '',
    vehicles_bikes: 0,
    vehicles_bikes_timestamp: '',
    vehicles_4wheelers: 0,
    vehicles_4wheelers_timestamp: '',
    last_person_name: '',
    last_person_name_timestamp: '',
    last_person_time: '',
    main_gate_locked_time: '',
    main_gate_locked_time_timestamp: '',
    observations: '',
    observations_timestamp: '',
    security_guard_name: currentUser.name,
    security_guard_signature: '',
  };

  const initialSafetyForm = {
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    location: 'Dubai',
    status: 'Pending Approval' as const,
    hydrant_tank_full: { status: false, litres: '', remarks: '' },
    hydrant_indicator_working: { status: false, remarks: '' },
    hydrant_hose_reel_healthy: { status: false, count: '', remarks: '' },
    hydrant_power_supply: { status: false, remarks: '' },
    hydrant_pumps_auto: { status: false, remarks: '' },
    hydrant_valves_on: { status: false, remarks: '' },
    hydrant_no_leakage: { status: false, remarks: '' },
    hydrant_pressure_gauge: { status: false, kg: '', remarks: '' },
    hydrant_pump_room_clean: { status: false, remarks: '' },
    sprinkler_pressure_gauge: { status: false, kg: '', remarks: '' },
    sprinkler_main_valve_on: { status: false, remarks: '' },
    detection_power_supply: { status: false, remarks: '' },
    detection_panels_healthy: { status: false, remarks: '' },
    cctv_images_clear: { status: false, camera_count: '', remarks: '' },
    cctv_dvr1_backup: { status: false, from: '', to: '', days: '', remarks: '' },
    cctv_dvr2_backup: { status: false, from: '', to: '', days: '', remarks: '' },
    gas_control_panel_healthy: { status: false, remarks: '' },
    gas_abort_switch_accessible: { status: false, remarks: '' },
    gas_pressure_gauge_green: { status: false, remarks: '' },
    biometric_operational: { status: false, total_devices: '', remarks: '' },
    emergency_exit_signage: { status: false, remarks: '' },
    security_guard_name: currentUser.name,
    security_guard_signature: '',
    field_timestamps: {},
  };

  const initialSurpriseForm = {
    date: new Date().toISOString().split('T')[0],
    in_time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    exit_time: '',
    check_conducted_by: currentUser.name,
    name_of_facility: 'Warehouse DXB',
    status: 'Pending Approval' as const,
    main_gate_guard_name: '',
    main_gate_guard_alert: false,
    main_gate_response_time: '',
    main_gate_locked: false,
    main_gate_ask_id: false,
    main_gate_guard_uniform: false,
    main_gate_entry_registered: false,
    bms_guard_name: '',
    bms_guard_alert: false,
    bms_guard_uniform: false,
    bms_cctv_functioning: false,
    bms_fire_alarm_status: 'Normal' as const,
    bms_fire_pumps_auto: false,
    docs_log_book_checked: false,
    docs_closing_updated: false,
    docs_safety_updated: false,
    docs_patrolling_followed: false,
    facility_gates_locked: false,
    facility_storage_locked: false,
    facility_temp_room_locked: false,
    facility_emergency_exits: 'Locked' as const,
    facility_computers_off: false,
    facility_round_completed: false,
    facility_no_personal_belongings: false,
    facility_temp_reading: '',
    facility_external_vehicles: '',
    facility_windows_shut: false,
    lighting_all_on: false,
    lighting_dim_areas: '',
    lighting_defective_points: '',
    activities_staff_on_duty: '',
    activities_reporting_head: '',
    activities_ops_areas: '',
    activities_general_behavior: '',
    activities_last_person_name: '',
    comments: '',
    security_guard_name: '',
    security_guard_signature: '',
    field_timestamps: {},
  };

  const initialDailyForm = {
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    location: 'Dubai',
    status: 'Pending Approval' as const,
    perimeter_clean: false,
    gates_functioning: false,
    external_lighting_ok: false,
    parking_organized: false,
    aisles_clear: false,
    floor_clean: false,
    waste_bins_cleared: false,
    pest_control_sighting: false,
    forklifts_checked: false,
    racking_visual_inspect: false,
    charging_station_safe: false,
    scanners_operational: false,
    staff_ppe_compliance: false,
    first_aid_accessible: false,
    emergency_exits_clear: false,
    no_smoking_enforced: false,
    pallets_stacked_safely: false,
    hazmat_stored_properly: false,
    temp_sensitive_monitored: false,
    security_guard_name: currentUser.name,
    security_guard_signature: '',
    field_timestamps: {},
  };

  const [form, setForm] = useState<Omit<IWarehouseChecklist, 'id' | 'created_at' | 'submitted_by'>>(initialClosingForm);
  const [patrolForm, setPatrolForm] = useState<Omit<IPatrolLog, 'id' | 'created_at' | 'submitted_by'>>(initialPatrolForm);
  const [safetyForm, setSafetyForm] = useState<Omit<ISafetyCheck, 'id' | 'created_at' | 'submitted_by'>>(initialSafetyForm);
  const [surpriseForm, setSurpriseForm] = useState<Omit<SurpriseVisitChecklist, 'id' | 'created_at' | 'submitted_by'>>(initialSurpriseForm);
  const [dailyForm, setDailyForm] = useState<Omit<DailyMonitoringChecklist, 'id' | 'created_at' | 'submitted_by'>>(initialDailyForm);

  const getTimestamp = () => {
    const now = new Date();
    return now.toLocaleString('en-AE', { 
      timeZone: 'Asia/Dubai',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const handleFieldChange = (field: string, value: any) => {
    const timestamp = getTimestamp();
    setForm(prev => {
      const updated = { 
        ...prev, 
        [field]: value,
        field_timestamps: { ...prev.field_timestamps, [field]: timestamp }
      };
      // For backward compatibility / existing specific fields
      if (['observations', 'no_personal_belongings', 'water_taps_closed', 'round_taken', 'lights_operational', 'vehicles_bikes', 'vehicles_4wheelers', 'last_person_name', 'main_gate_locked_time'].includes(field)) {
        (updated as any)[`${field}_timestamp`] = timestamp;
      }
      return updated;
    });
  };

  const handleSectionChange = (section: keyof typeof form.warehouse_sections, field: string, value: any) => {
    setForm(prev => ({
      ...prev,
      warehouse_sections: {
        ...prev.warehouse_sections,
        [section]: { 
          ...prev.warehouse_sections[section], 
          [field]: value,
          timestamp: getTimestamp() // This covers both "status" (lock icon) and individual checkboxes
        }
      }
    }));
  };

  const handleSafetyFieldChange = (field: keyof Omit<ISafetyCheck, 'id' | 'created_at' | 'submitted_by' | 'field_timestamps'>, value: any, nestedKey?: string) => {
    const timestamp = getTimestamp();
    setSafetyForm(prev => {
      const currentVal = prev[field];
      let updatedVal: any;

      if (nestedKey && typeof currentVal === 'object' && currentVal !== null) {
        updatedVal = { ...currentVal, [nestedKey]: value, timestamp };
      } else {
        updatedVal = value;
      }

      return {
        ...prev,
        [field]: updatedVal,
        field_timestamps: { ...prev.field_timestamps, [field as string]: timestamp }
      };
    });
  };

  const handleSurpriseFieldChange = (field: keyof Omit<SurpriseVisitChecklist, 'id' | 'created_at' | 'submitted_by' | 'field_timestamps'>, value: any) => {
    const timestamp = getTimestamp();
    setSurpriseForm(prev => ({
      ...prev,
      [field]: value,
      field_timestamps: { ...prev.field_timestamps, [field as string]: timestamp }
    }));
  };

  const handlePatrolFieldChange = (field: keyof Omit<IPatrolLog, 'id' | 'created_at' | 'submitted_by' | 'field_timestamps'>, value: any) => {
    const timestamp = getTimestamp();
    setPatrolForm(prev => ({
      ...prev,
      [field]: value,
      field_timestamps: { ...prev.field_timestamps, [field as string]: timestamp }
    }));
  };

  const handlePatrolCheckpointChange = (roundId: string, cameraNo: string) => {
    const timestamp = getTimestamp();
    const shortTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    
    setPatrolForm(prev => ({
      ...prev,
      rounds: prev.rounds.map(r => r.id === roundId ? {
        ...r,
        checkpoints: r.checkpoints.map(cp => cp.camera_no === cameraNo ? {
          ...cp,
          actual_time: shortTime,
          guard_name: currentUser.name,
          timestamp
        } : cp)
      } : r),
      field_timestamps: { ...prev.field_timestamps, [`checkpoint_${roundId}_${cameraNo}`]: timestamp }
    }));
  };

  const handleDailyFieldChange = (field: keyof Omit<DailyMonitoringChecklist, 'id' | 'created_at' | 'submitted_by' | 'field_timestamps'>, value: any) => {
    const timestamp = getTimestamp();
    setDailyForm(prev => ({
      ...prev,
      [field]: value,
      field_timestamps: { ...prev.field_timestamps, [field as string]: timestamp }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sigPadSecurity.current?.isEmpty()) {
      alert("Security Guard signature is required");
      return;
    }

    const signature = sigPadSecurity.current?.toDataURL('image/png');
    
    if (moduleType === 'closing') {
      onSave({
        ...form,
        security_guard_signature: signature,
        created_at: Date.now(),
        submitted_by: currentUser.name
      });
      setForm(initialClosingForm);
    } else if (moduleType === 'patrolling') {
      onSavePatrol({
        ...patrolForm,
        security_guard_signature: signature,
        created_at: Date.now(),
        submitted_by: currentUser.name
      });
      setPatrolForm(initialPatrolForm);
    } else if (moduleType === 'safety') {
      onSaveSafety({
        ...safetyForm,
        security_guard_signature: signature,
        created_at: Date.now(),
        submitted_by: currentUser.name
      });
      setSafetyForm(initialSafetyForm);
    } else if (moduleType === 'surprise') {
      onSaveSurprise({
        ...surpriseForm,
        security_guard_signature: signature,
        created_at: Date.now(),
        submitted_by: currentUser.name
      });
      setSurpriseForm(initialSurpriseForm);
    } else if (moduleType === 'daily') {
      onSaveDaily({
        ...dailyForm,
        security_guard_signature: signature,
        created_at: Date.now(),
        submitted_by: currentUser.name
      });
      setDailyForm(initialDailyForm);
    }
    
    sigPadSecurity.current?.clear();
    setActiveTab('history');
  };

  const handleApprove = async () => {
    const adminSig = sigPadAdmin.current?.isEmpty() ? null : sigPadAdmin.current?.toDataURL('image/png');
    const warehouseSig = sigPadWarehouse.current?.isEmpty() ? null : sigPadWarehouse.current?.toDataURL('image/png');

    if (moduleType === 'closing' && selectedChecklist) {
      onUpdate(selectedChecklist.id, {
        status: 'Approved',
        admin_incharge_name: currentUser.name,
        admin_incharge_signature: adminSig || undefined,
        warehouse_incharge_name: currentUser.name,
        warehouse_incharge_signature: warehouseSig || undefined,
        approved_at: Date.now(),
        approved_by: currentUser.name
      });
      setSelectedChecklist(null);
    } else if (moduleType === 'patrolling' && selectedPatrol) {
      onUpdatePatrol(selectedPatrol.id, {
        status: 'Approved',
        admin_incharge_name: currentUser.name,
        admin_incharge_signature: adminSig || undefined,
        warehouse_incharge_name: currentUser.name,
        warehouse_incharge_signature: warehouseSig || undefined,
        approved_at: Date.now(),
        approved_by: currentUser.name
      });
      setSelectedPatrol(null);
    } else if (moduleType === 'safety' && selectedSafety) {
      onUpdateSafety(selectedSafety.id, {
        status: 'Approved',
        admin_incharge_name: currentUser.name,
        admin_incharge_signature: adminSig || undefined,
        warehouse_incharge_name: currentUser.name,
        warehouse_incharge_signature: warehouseSig || undefined,
        approved_at: Date.now(),
        approved_by: currentUser.name
      });
      setSelectedSafety(null);
    } else if (moduleType === 'surprise' && selectedSurprise) {
      onUpdateSurprise(selectedSurprise.id, {
        status: 'Approved',
        admin_incharge_name: currentUser.name,
        admin_incharge_signature: adminSig || undefined,
        warehouse_incharge_name: currentUser.name,
        warehouse_incharge_signature: warehouseSig || undefined,
        approved_at: Date.now(),
        approved_by: currentUser.name
      });
      setSelectedSurprise(null);
    } else if (moduleType === 'daily' && selectedDaily) {
      onUpdateDaily(selectedDaily.id, {
        status: 'Approved',
        admin_incharge_name: currentUser.name,
        admin_incharge_signature: adminSig || undefined,
        warehouse_incharge_name: currentUser.name,
        warehouse_incharge_signature: warehouseSig || undefined,
        approved_at: Date.now(),
        approved_by: currentUser.name
      });
      setSelectedDaily(null);
    }

    setActiveTab('history');
  };

  const handleDecline = () => {
    if (!declineComments.trim()) {
      alert("Please provide comments for declining");
      return;
    }

    if (moduleType === 'closing' && selectedChecklist) {
      onUpdate(selectedChecklist.id, {
        status: 'Declined',
        declined_at: Date.now(),
        declined_by: currentUser.name,
        decline_comments: declineComments
      });
      setSelectedChecklist(null);
    } else if (moduleType === 'patrolling' && selectedPatrol) {
      onUpdatePatrol(selectedPatrol.id, {
        status: 'Declined',
        declined_at: Date.now(),
        declined_by: currentUser.name,
        decline_comments: declineComments
      });
      setSelectedPatrol(null);
    } else if (moduleType === 'safety' && selectedSafety) {
      onUpdateSafety(selectedSafety.id, {
        status: 'Declined',
        declined_at: Date.now(),
        declined_by: currentUser.name,
        decline_comments: declineComments
      });
      setSelectedSafety(null);
    } else if (moduleType === 'surprise' && selectedSurprise) {
      onUpdateSurprise(selectedSurprise.id, {
        status: 'Declined',
        declined_at: Date.now(),
        declined_by: currentUser.name,
        decline_comments: declineComments
      });
      setSelectedSurprise(null);
    } else if (moduleType === 'daily' && selectedDaily) {
      onUpdateDaily(selectedDaily.id, {
        status: 'Declined',
        declined_at: Date.now(),
        declined_by: currentUser.name,
        decline_comments: declineComments
      });
      setSelectedDaily(null);
    }

    setDeclineComments('');
    setShowDeclineForm(false);
    setActiveTab('history');
  };

  const handleReset = () => {
    if (moduleType === 'closing') setForm(initialClosingForm);
    else if (moduleType === 'patrolling') setPatrolForm(initialPatrolForm);
    else if (moduleType === 'safety') setSafetyForm(initialSafetyForm);
    else if (moduleType === 'surprise') setSurpriseForm(initialSurpriseForm);
    else if (moduleType === 'daily') setDailyForm(initialDailyForm);
    sigPadSecurity.current?.clear();
  };

  const downloadPDF = async (id: string, name: string) => {
    const element = document.getElementById(id);
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${name}.pdf`);
  };

  const isOpsAdmin = currentUser.employee_id === 'OPS-ADMIN-01';
  const isKarthik = currentUser.name.toLowerCase().includes('karthik') || isOpsAdmin;
  const canApprove = (module: string) => {
    if (module === 'safety' || module === 'surprise') return isKarthik;
    return currentUser.role === UserRole.ADMIN || isOpsAdmin;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 pointer-events-auto">
      {/* Module Switcher */}
      <div className="flex bg-slate-100 p-1.5 rounded-[2rem] w-fit mb-8 border border-slate-200">
        <button
          onClick={() => { setModuleType('closing'); setActiveTab('new'); }}
          className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
            moduleType === 'closing' ? 'bg-white text-blue-600 shadow-xl shadow-blue-100 border border-blue-50' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Closing Checklist 9.3
        </button>
        <button
          onClick={() => { setModuleType('patrolling'); setActiveTab('new'); }}
          className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
            moduleType === 'patrolling' ? 'bg-white text-blue-600 shadow-xl shadow-blue-100 border border-blue-50' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Patrolling Checklist 8.1
        </button>
        <button
          onClick={() => { setModuleType('safety'); setActiveTab('new'); }}
          className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
            moduleType === 'safety' ? 'bg-white text-blue-600 shadow-xl shadow-blue-100 border border-blue-50' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Flame className="w-4 h-4" />
          Safety Monitoring
        </button>
        <button
          onClick={() => { setModuleType('surprise'); setActiveTab('new'); }}
          className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
            moduleType === 'surprise' ? 'bg-white text-blue-600 shadow-xl shadow-blue-100 border border-blue-50' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Activity className="w-4 h-4" />
          Surprise Visit 11.1
        </button>
        <button
          onClick={() => { setModuleType('daily'); setActiveTab('new'); }}
          className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
            moduleType === 'daily' ? 'bg-white text-blue-600 shadow-xl shadow-blue-100 border border-blue-50' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          Daily Monitoring 10.1
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-100">
              {moduleType === 'closing' ? <ClipboardCheck className="w-6 h-6" /> : 
               moduleType === 'patrolling' ? <Clock8 className="w-6 h-6" /> : 
               moduleType === 'safety' ? <Flame className="w-6 h-6" /> :
               <Activity className="w-6 h-6" />}
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {moduleType === 'closing' ? 'Warehouse Closing' : 
               moduleType === 'patrolling' ? 'Night Patrolling' : 
               moduleType === 'safety' ? 'Safety Monitoring' :
               'Surprised Night Visit'}
            </h1>
          </div>
          <p className="text-slate-500 font-medium ml-1">
            {moduleType === 'closing' ? 'Daily closing verification and security rounds' : 
             moduleType === 'patrolling' ? 'Scheduled facility patrolling and camera verification' :
             moduleType === 'safety' ? 'Safety systems and fire protection monitoring' :
             'Suprise facility inspection to verify security alertness and protocols'}
          </p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('new')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              activeTab === 'new' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            New
          </button>
          <button
            onClick={() => setActiveTab('approval')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all relative ${
              activeTab === 'approval' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Approval Pool
            {(
              checklists.filter(c => c.status === 'Pending Approval').length +
              patrolLogs.filter(p => p.status === 'Pending Approval').length +
              safetyChecks.filter(s => s.status === 'Pending Approval').length +
              surpriseVisits.filter(s => s.status === 'Pending Approval').length
            ) > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                {
                  checklists.filter(c => c.status === 'Pending Approval').length +
                  patrolLogs.filter(p => p.status === 'Pending Approval').length +
                  safetyChecks.filter(s => s.status === 'Pending Approval').length +
                  surpriseVisits.filter(s => s.status === 'Pending Approval').length
                }
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            Archive
          </button>
        </div>
      </div>

      {activeTab === 'new' && moduleType === 'closing' && (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Checklist Date (Auto)</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input readOnly className="w-full pl-12 pr-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500 cursor-not-allowed" value={form.date} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Checklist Time (Auto)</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input readOnly className="w-full pl-12 pr-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500 cursor-not-allowed" value={form.time} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
              {renderSection("Office & Support Rooms", <Building2 className="w-5 h-5" />)}
              <div className="space-y-4">
                <SectionCheckbox
                  label="Office, Server, Conference, CRC 1 & 2, Store, Electrical and DG Panel Rooms locked"
                  value={form.office_locked.status}
                  onChange={(val) => setForm({...form, office_locked: {...form.office_locked, status: val, timestamp: getTimestamp()}})}
                  remarks={form.office_locked.remarks}
                  onRemarksChange={(val) => setForm({...form, office_locked: {...form.office_locked, remarks: val}})}
                  timestamp={form.office_locked.timestamp}
                />
                <SectionCheckbox
                  label="All lights, Computers and other equipment's are off"
                  value={form.lights_off.status}
                  onChange={(val) => setForm({...form, lights_off: {...form.lights_off, status: val, timestamp: getTimestamp()}, field_timestamps: { ...form.field_timestamps, lights_off: getTimestamp() }})}
                  remarks={form.lights_off.remarks}
                  onRemarksChange={(val) => setForm({...form, lights_off: {...form.lights_off, remarks: val}, field_timestamps: { ...form.field_timestamps, lights_off_remarks: getTimestamp() }})}
                  timestamp={form.lights_off.timestamp}
                />
                <SectionCheckbox
                  label="All Emergency Exits are locked properly"
                  value={form.emergency_exits_locked.status}
                  onChange={(val) => setForm({...form, emergency_exits_locked: {...form.emergency_exits_locked, status: val, timestamp: getTimestamp()}, field_timestamps: { ...form.field_timestamps, emergency_exits_locked: getTimestamp() }})}
                  remarks={form.emergency_exits_locked.remarks}
                  onRemarksChange={(val) => setForm({...form, emergency_exits_locked: {...form.emergency_exits_locked, remarks: val}, field_timestamps: { ...form.field_timestamps, emergency_exits_locked_remarks: getTimestamp() }})}
                  timestamp={form.emergency_exits_locked.timestamp}
                />
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
              {renderSection("General Warehouse Rounds", <ShieldCheck className="w-5 h-5" />)}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SectionCheckbox 
                  label="No personal belongings found" 
                  value={form.no_personal_belongings} 
                  onChange={(val) => handleFieldChange('no_personal_belongings', val)} 
                  timestamp={form.no_personal_belongings_timestamp}
                />
                <SectionCheckbox 
                  label="Water Taps in Toilets closed" 
                  value={form.water_taps_closed} 
                  onChange={(val) => handleFieldChange('water_taps_closed', val)} 
                  timestamp={form.water_taps_closed_timestamp}
                />
                <SectionCheckbox 
                  label="Round around Warehouse taken" 
                  value={form.round_taken} 
                  onChange={(val) => handleFieldChange('round_taken', val)} 
                  timestamp={form.round_taken_timestamp}
                />
                <SectionCheckbox 
                  label="Lights around Warehouse operational" 
                  value={form.lights_operational} 
                  onChange={(val) => handleFieldChange('lights_operational', val)} 
                  timestamp={form.lights_operational_timestamp}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
            {renderSection("Warehouse Phases Details", <Zap className="w-5 h-5" />)}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(['A', 'B', 'C', 'D'] as const).map(section => (
                <div key={section} className="p-6 bg-slate-50 border border-slate-200 rounded-[2rem] space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-black text-slate-800">Section {section}</h4>
                    <button
                      type="button"
                      onClick={() => handleSectionChange(section, 'status', !form.warehouse_sections[section].status)}
                      className={`p-2 rounded-xl transition-all ${form.warehouse_sections[section].status ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}
                    >
                      <Lock className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Lights Off</span>
                      <input type="checkbox" checked={form.warehouse_sections[section].lights_off} onChange={(e) => handleSectionChange(section, 'lights_off', e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Bio Metric</span>
                      <input type="checkbox" checked={form.warehouse_sections[section].biometric_working} onChange={(e) => handleSectionChange(section, 'biometric_working', e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Fans Off</span>
                      <input type="checkbox" checked={form.warehouse_sections[section].fans_off} onChange={(e) => handleSectionChange(section, 'fans_off', e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                    </label>
                    <div className="pt-2">
                       <input type="time" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold" value={form.warehouse_sections[section].time} onChange={(e) => handleSectionChange(section, 'time', e.target.value)} />
                    </div>
                    {form.warehouse_sections[section].timestamp && (
                      <p className="text-[8px] font-medium text-slate-400 italic mt-1 text-center">Last Updated: {form.warehouse_sections[section].timestamp}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
              {renderSection("Vehicles & Last Exit", <Truck className="w-5 h-5" />)}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex flex-col gap-1">
                  <input type="number" placeholder="Bikes" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={form.vehicles_bikes} onChange={(e) => handleFieldChange('vehicles_bikes', parseInt(e.target.value) || 0)} />
                  {form.field_timestamps?.vehicles_bikes && <span className="text-[7px] text-slate-400 ml-1 italic">Stamped: {form.field_timestamps.vehicles_bikes}</span>}
                </div>
                <div className="flex flex-col gap-1">
                  <input type="number" placeholder="4-Wheelers" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={form.vehicles_4wheelers} onChange={(e) => handleFieldChange('vehicles_4wheelers', parseInt(e.target.value) || 0)} />
                  {form.field_timestamps?.vehicles_4wheelers && <span className="text-[7px] text-slate-400 ml-1 italic">Stamped: {form.field_timestamps.vehicles_4wheelers}</span>}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <input type="text" placeholder="Last Person Leaving" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={form.last_person_name} onChange={(e) => handleFieldChange('last_person_name', e.target.value)} />
                  {form.field_timestamps?.last_person_name && <span className="text-[7px] text-slate-400 ml-1 italic">Stamped: {form.field_timestamps.last_person_name}</span>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <input type="time" placeholder="Exit Time" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={form.last_person_time} onChange={(e) => handleFieldChange('last_person_time', e.target.value)} />
                    {form.field_timestamps?.last_person_time && <span className="text-[7px] text-slate-400 ml-1 italic">Stamped: {form.field_timestamps.last_person_time}</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <input type="time" placeholder="Gate Lock Time" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={form.main_gate_locked_time} onChange={(e) => handleFieldChange('main_gate_locked_time', e.target.value)} />
                    {form.field_timestamps?.main_gate_locked_time && <span className="text-[7px] text-slate-400 ml-1 italic">Stamped: {form.field_timestamps.main_gate_locked_time}</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
              {renderSection("Observations & Signature", <PenTool className="w-5 h-5" />)}
              <div className="mb-4">
                <textarea rows={2} placeholder="Observations..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={form.observations} onChange={(e) => handleFieldChange('observations', e.target.value)} />
                {form.observations_timestamp && <span className="text-[10px] font-medium text-slate-400 italic ml-2">Stamped: {form.observations_timestamp}</span>}
              </div>
              <div className="space-y-4">
                <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 relative">
                  <span className="text-[10px] font-bold text-slate-400 uppercase absolute top-2 left-4">Security Guard Signature</span>
                  <div className="bg-white rounded-xl mt-6 overflow-hidden border border-slate-100">
                    <SignatureCanvas penColor='black' canvasProps={{className: 'w-full h-32'}} ref={sigPadSecurity} />
                  </div>
                  <button type="button" onClick={() => sigPadSecurity.current?.clear()} className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-rose-500 transition-all"><Eraser className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pb-12">
            <button type="button" onClick={handleReset} className="px-8 py-5 border-2 border-slate-200 text-slate-400 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">Reset Form</button>
            <button type="submit" className="px-12 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl active:scale-95 transition-all">Submit For Approval</button>
          </div>
        </form>
      )}

      {activeTab === 'new' && moduleType === 'patrolling' && (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Patrol Date (Auto)</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input readOnly className="w-full pl-12 pr-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500 cursor-not-allowed" value={patrolForm.date} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input readOnly className="w-full pl-12 pr-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500 cursor-not-allowed" value={patrolForm.location} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-12">
            {patrolForm.rounds.map((round) => (
              <div key={round.id} className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden">
                <div className="px-8 py-5 bg-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-500 rounded-xl"><Clock8 className="w-5 h-5 text-white" /></div>
                    <div>
                      <h3 className="text-white text-lg font-black tracking-tight">{round.title}</h3>
                      <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Window: {round.time_range}</p>
                    </div>
                  </div>
                </div>
                <div className="p-8">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <th className="px-4 py-4 text-left">Camera</th>
                          <th className="px-4 py-4 text-left">Location</th>
                          <th className="px-4 py-4 text-left">Actual Time</th>
                          <th className="px-4 py-4 text-left">Guard Name</th>
                          <th className="px-4 py-4 text-right">Verification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {round.checkpoints.map((cp, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-all">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <Camera className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs font-black text-slate-800">{cp.camera_no}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-xs font-bold text-slate-600">{cp.location}</span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-xs font-black text-blue-600 font-mono">{cp.actual_time || '--:--'}</span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-xs font-bold text-slate-500">{cp.guard_name || '---'}</span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              {cp.actual_time ? (
                                <div className="flex flex-col items-end gap-1">
                                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase">
                                    <Check className="w-3 h-3" /> Signed
                                  </div>
                                  {cp.timestamp && <span className="text-[7px] text-slate-400 italic">Stamped: {cp.timestamp}</span>}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handlePatrolCheckpointChange(round.id, cp.camera_no)}
                                  className="px-4 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                                >
                                  Sign Check
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
            {renderSection("Final Observations & Submission", <PenTool className="w-5 h-5" />)}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unusual Observation during night round</label>
                <div className="flex flex-col gap-1">
                  <textarea 
                    rows={4} 
                    placeholder="Record any unusual activity or camera maintenance issues..." 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" 
                    value={patrolForm.unusual_observation} 
                    onChange={(e) => handlePatrolFieldChange('unusual_observation', e.target.value)} 
                  />
                  {patrolForm.field_timestamps?.unusual_observation && <span className="text-[7px] text-slate-400 ml-1 italic">Stamped: {patrolForm.field_timestamps.unusual_observation}</span>}
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 relative">
                  <span className="text-[10px] font-bold text-slate-400 uppercase absolute top-2 left-4">Security Guard Final Signature</span>
                  <div className="bg-white rounded-xl mt-6 overflow-hidden border border-slate-100">
                    <SignatureCanvas penColor='black' canvasProps={{className: 'w-full h-32'}} ref={sigPadSecurity} />
                  </div>
                  <button type="button" onClick={() => sigPadSecurity.current?.clear()} className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-rose-500 transition-all"><Eraser className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pb-12">
            <button type="button" onClick={handleReset} className="px-8 py-5 border-2 border-slate-200 text-slate-400 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">Reset Form</button>
            <button type="submit" className="px-12 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl active:scale-95 transition-all">Submit For Approval</button>
          </div>
        </form>
      )}

      {activeTab === 'new' && moduleType === 'safety' && (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Audit Date (Auto)</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input readOnly className="w-full pl-12 pr-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500 cursor-not-allowed" value={safetyForm.date} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Audit Time (Auto)</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input readOnly className="w-full pl-12 pr-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500 cursor-not-allowed" value={safetyForm.time} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input readOnly className="w-full pl-12 pr-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500 cursor-not-allowed" value={safetyForm.location} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
              {renderSection("01 FIRE HYDRANT SYSTEM", <Flame className="w-5 h-5" />)}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SectionCheckbox
                  label="Fire water tank is full"
                  value={safetyForm.hydrant_tank_full.status}
                  onChange={(val) => handleSafetyFieldChange('hydrant_tank_full', val, 'status')}
                  extraInputLabel="Available Litre"
                  extraInputValue={safetyForm.hydrant_tank_full.litres}
                  onExtraInputChange={(val) => handleSafetyFieldChange('hydrant_tank_full', val, 'litres')}
                  remarks={safetyForm.hydrant_tank_full.remarks}
                  onRemarksChange={(val) => handleSafetyFieldChange('hydrant_tank_full', val, 'remarks')}
                  timestamp={safetyForm.hydrant_tank_full.timestamp || safetyForm.field_timestamps?.hydrant_tank_full}
                />
                <SectionCheckbox
                  label="All internal & external hose reel healthy"
                  value={safetyForm.hydrant_hose_reel_healthy.status}
                  onChange={(val) => handleSafetyFieldChange('hydrant_hose_reel_healthy', val, 'status')}
                  extraInputLabel="Total Hose Reels"
                  extraInputValue={safetyForm.hydrant_hose_reel_healthy.count}
                  onExtraInputChange={(val) => handleSafetyFieldChange('hydrant_hose_reel_healthy', val, 'count')}
                  remarks={safetyForm.hydrant_hose_reel_healthy.remarks}
                  onRemarksChange={(val) => handleSafetyFieldChange('hydrant_hose_reel_healthy', val, 'remarks')}
                  timestamp={safetyForm.hydrant_hose_reel_healthy.timestamp || safetyForm.field_timestamps?.hydrant_hose_reel_healthy}
                />
                <SectionCheckbox
                  label="Power supply is available in the panels"
                  value={safetyForm.hydrant_power_supply.status}
                  onChange={(val) => handleSafetyFieldChange('hydrant_power_supply', val, 'status')}
                  remarks={safetyForm.hydrant_power_supply.remarks}
                  onRemarksChange={(val) => handleSafetyFieldChange('hydrant_power_supply', val, 'remarks')}
                  timestamp={safetyForm.hydrant_power_supply.timestamp || safetyForm.field_timestamps?.hydrant_power_supply}
                />
                <SectionCheckbox
                  label="Fire pumps are in AUTO MODE"
                  value={safetyForm.hydrant_pumps_auto.status}
                  onChange={(val) => handleSafetyFieldChange('hydrant_pumps_auto', val, 'status')}
                  remarks={safetyForm.hydrant_pumps_auto.remarks}
                  onRemarksChange={(val) => handleSafetyFieldChange('hydrant_pumps_auto', val, 'remarks')}
                  timestamp={safetyForm.hydrant_pumps_auto.timestamp || safetyForm.field_timestamps?.hydrant_pumps_auto}
                />
                <SectionCheckbox
                  label="Valves are in ON position"
                  value={safetyForm.hydrant_valves_on.status}
                  onChange={(val) => handleSafetyFieldChange('hydrant_valves_on', val, 'status')}
                  remarks={safetyForm.hydrant_valves_on.remarks}
                  onRemarksChange={(val) => handleSafetyFieldChange('hydrant_valves_on', val, 'remarks')}
                  timestamp={safetyForm.hydrant_valves_on.timestamp || safetyForm.field_timestamps?.hydrant_valves_on}
                />
                <SectionCheckbox
                  label="No leakage from the gland, valves, joints etc."
                  value={safetyForm.hydrant_no_leakage.status}
                  onChange={(val) => handleSafetyFieldChange('hydrant_no_leakage', val, 'status')}
                  remarks={safetyForm.hydrant_no_leakage.remarks}
                  onRemarksChange={(val) => handleSafetyFieldChange('hydrant_no_leakage', val, 'remarks')}
                  timestamp={safetyForm.hydrant_no_leakage.timestamp || safetyForm.field_timestamps?.hydrant_no_leakage}
                />
                <SectionCheckbox
                  label="Pressure gauge indicates standard level"
                  value={safetyForm.hydrant_pressure_gauge.status}
                  onChange={(val) => handleSafetyFieldChange('hydrant_pressure_gauge', val, 'status')}
                  extraInputLabel="KG Pressure"
                  extraInputValue={safetyForm.hydrant_pressure_gauge.kg}
                  onExtraInputChange={(val) => handleSafetyFieldChange('hydrant_pressure_gauge', val, 'kg')}
                  remarks={safetyForm.hydrant_pressure_gauge.remarks}
                  onRemarksChange={(val) => handleSafetyFieldChange('hydrant_pressure_gauge', val, 'remarks')}
                  timestamp={safetyForm.hydrant_pressure_gauge.timestamp || safetyForm.field_timestamps?.hydrant_pressure_gauge}
                />
                <SectionCheckbox
                  label="Pump room is neat, clean and dry"
                  value={safetyForm.hydrant_pump_room_clean.status}
                  onChange={(val) => handleSafetyFieldChange('hydrant_pump_room_clean', val, 'status')}
                  remarks={safetyForm.hydrant_pump_room_clean.remarks}
                  onRemarksChange={(val) => handleSafetyFieldChange('hydrant_pump_room_clean', val, 'remarks')}
                  timestamp={safetyForm.hydrant_pump_room_clean.timestamp || safetyForm.field_timestamps?.hydrant_pump_room_clean}
                />
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
              {renderSection("02 SPRINKLER SYSTEM", <Wind className="w-5 h-5" />)}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SectionCheckbox
                  label="Pressure gauge indicates standard pressure"
                  value={safetyForm.sprinkler_pressure_gauge.status}
                  onChange={(val) => handleSafetyFieldChange('sprinkler_pressure_gauge', val, 'status')}
                  extraInputLabel="KG Pressure"
                  extraInputValue={safetyForm.sprinkler_pressure_gauge.kg}
                  onExtraInputChange={(val) => handleSafetyFieldChange('sprinkler_pressure_gauge', val, 'kg')}
                  remarks={safetyForm.sprinkler_pressure_gauge.remarks}
                  onRemarksChange={(val) => handleSafetyFieldChange('sprinkler_pressure_gauge', val, 'remarks')}
                  timestamp={safetyForm.sprinkler_pressure_gauge.timestamp || safetyForm.field_timestamps?.sprinkler_pressure_gauge}
                />
                <SectionCheckbox
                  label="Main valve is in ON position"
                  value={safetyForm.sprinkler_main_valve_on.status}
                  onChange={(val) => handleSafetyFieldChange('sprinkler_main_valve_on', val, 'status')}
                  remarks={safetyForm.sprinkler_main_valve_on.remarks}
                  onRemarksChange={(val) => handleSafetyFieldChange('sprinkler_main_valve_on', val, 'remarks')}
                  timestamp={safetyForm.sprinkler_main_valve_on.timestamp || safetyForm.field_timestamps?.sprinkler_main_valve_on}
                />
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
              {renderSection("03 FIRE DETECTION SYSTEM", <Activity className="w-5 h-5" />)}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SectionCheckbox
                  label="Power supply is available in Panels"
                  value={safetyForm.detection_power_supply.status}
                  onChange={(val) => handleSafetyFieldChange('detection_power_supply', val, 'status')}
                  remarks={safetyForm.detection_power_supply.remarks}
                  onRemarksChange={(val) => handleSafetyFieldChange('detection_power_supply', val, 'remarks')}
                  timestamp={safetyForm.detection_power_supply.timestamp || safetyForm.field_timestamps?.detection_power_supply}
                />
                <SectionCheckbox
                  label="Fire Alarm Panels are in healthy condition"
                  value={safetyForm.detection_panels_healthy.status}
                  onChange={(val) => handleSafetyFieldChange('detection_panels_healthy', val, 'status')}
                  remarks={safetyForm.detection_panels_healthy.remarks}
                  onRemarksChange={(val) => handleSafetyFieldChange('detection_panels_healthy', val, 'remarks')}
                  timestamp={safetyForm.detection_panels_healthy.timestamp || safetyForm.field_timestamps?.detection_panels_healthy}
                />
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
              {renderSection("04 CCTV", <Camera className="w-5 h-5" />)}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SectionCheckbox
                  label="Images of all cameras are clear"
                  value={safetyForm.cctv_images_clear.status}
                  onChange={(val) => handleSafetyFieldChange('cctv_images_clear', val, 'status')}
                  extraInputLabel="Total Camera Count"
                  extraInputValue={safetyForm.cctv_images_clear.camera_count}
                  onExtraInputChange={(val) => handleSafetyFieldChange('cctv_images_clear', val, 'camera_count')}
                  remarks={safetyForm.cctv_images_clear.remarks}
                  onRemarksChange={(val) => handleSafetyFieldChange('cctv_images_clear', val, 'remarks')}
                  timestamp={safetyForm.cctv_images_clear.timestamp || safetyForm.field_timestamps?.cctv_images_clear}
                />
                <SectionCheckbox
                  label="DVR-I Backup verification"
                  value={safetyForm.cctv_dvr1_backup.status}
                  onChange={(val) => handleSafetyFieldChange('cctv_dvr1_backup', val, 'status')}
                  extraInputLabel="Days Count"
                  extraInputValue={safetyForm.cctv_dvr1_backup.days}
                  onExtraInputChange={(val) => handleSafetyFieldChange('cctv_dvr1_backup', val, 'days')}
                  remarks={safetyForm.cctv_dvr1_backup.remarks}
                  onRemarksChange={(val) => handleSafetyFieldChange('cctv_dvr1_backup', val, 'remarks')}
                  timestamp={safetyForm.cctv_dvr1_backup.timestamp || safetyForm.field_timestamps?.cctv_dvr1_backup}
                />
                <SectionCheckbox
                  label="DVR-II Backup verification"
                  value={safetyForm.cctv_dvr2_backup.status}
                  onChange={(val) => handleSafetyFieldChange('cctv_dvr2_backup', val, 'status')}
                  extraInputLabel="Days Count"
                  extraInputValue={safetyForm.cctv_dvr2_backup.days}
                  onExtraInputChange={(val) => handleSafetyFieldChange('cctv_dvr2_backup', val, 'days')}
                  remarks={safetyForm.cctv_dvr2_backup.remarks}
                  onRemarksChange={(val) => handleSafetyFieldChange('cctv_dvr2_backup', val, 'remarks')}
                  timestamp={safetyForm.cctv_dvr2_backup.timestamp || safetyForm.field_timestamps?.cctv_dvr2_backup}
                />
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
              {renderSection("05 GAS SUPPRESSION (FM-200)", <HardDrive className="w-5 h-5" />)}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SectionCheckbox
                  label="Control panel healthy"
                  value={safetyForm.gas_control_panel_healthy.status}
                  onChange={(val) => handleSafetyFieldChange('gas_control_panel_healthy', val, 'status')}
                  remarks={safetyForm.gas_control_panel_healthy.remarks}
                  onRemarksChange={(val) => handleSafetyFieldChange('gas_control_panel_healthy', val, 'remarks')}
                  timestamp={safetyForm.gas_control_panel_healthy.timestamp || safetyForm.field_timestamps?.gas_control_panel_healthy}
                />
                <SectionCheckbox
                  label="Manual & Abort switches accessible"
                  value={safetyForm.gas_abort_switch_accessible.status}
                  onChange={(val) => handleSafetyFieldChange('gas_abort_switch_accessible', val, 'status')}
                  remarks={safetyForm.gas_abort_switch_accessible.remarks}
                  onRemarksChange={(val) => handleSafetyFieldChange('gas_abort_switch_accessible', val, 'remarks')}
                  timestamp={safetyForm.gas_abort_switch_accessible.timestamp || safetyForm.field_timestamps?.gas_abort_switch_accessible}
                />
                <SectionCheckbox
                  label="Pressure gauge in green zone"
                  value={safetyForm.gas_pressure_gauge_green.status}
                  onChange={(val) => handleSafetyFieldChange('gas_pressure_gauge_green', val, 'status')}
                  remarks={safetyForm.gas_pressure_gauge_green.remarks}
                  onRemarksChange={(val) => handleSafetyFieldChange('gas_pressure_gauge_green', val, 'remarks')}
                  timestamp={safetyForm.gas_pressure_gauge_green.timestamp || safetyForm.field_timestamps?.gas_pressure_gauge_green}
                />
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
              {renderSection("06 BIOMETRIC", <ShieldCheck className="w-5 h-5" />)}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SectionCheckbox
                  label="Biometric System is operational"
                  value={safetyForm.biometric_operational.status}
                  onChange={(val) => handleSafetyFieldChange('biometric_operational', val, 'status')}
                  extraInputLabel="Total Devices"
                  extraInputValue={safetyForm.biometric_operational.total_devices}
                  onExtraInputChange={(val) => handleSafetyFieldChange('biometric_operational', val, 'total_devices')}
                  remarks={safetyForm.biometric_operational.remarks}
                  onRemarksChange={(val) => handleSafetyFieldChange('biometric_operational', val, 'remarks')}
                  timestamp={safetyForm.biometric_operational.timestamp || safetyForm.field_timestamps?.biometric_operational}
                />
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
              {renderSection("07 EMERGENCY EXIT", <MapPin className="w-5 h-5" />)}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SectionCheckbox
                  label="All emergency 'EXIT' signage working"
                  value={safetyForm.emergency_exit_signage.status}
                  onChange={(val) => handleSafetyFieldChange('emergency_exit_signage', val, 'status')}
                  remarks={safetyForm.emergency_exit_signage.remarks}
                  onRemarksChange={(val) => handleSafetyFieldChange('emergency_exit_signage', val, 'remarks')}
                  timestamp={safetyForm.emergency_exit_signage.timestamp || safetyForm.field_timestamps?.emergency_exit_signage}
                />
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
              {renderSection("Final Sign-Off", <PenTool className="w-5 h-5" />)}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                  <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 relative">
                    <span className="text-[10px] font-bold text-slate-400 uppercase absolute top-2 left-4">Security Guard Signature</span>
                    <div className="bg-white rounded-xl mt-6 overflow-hidden border border-slate-100">
                      <SignatureCanvas penColor='black' canvasProps={{className: 'w-full h-32'}} ref={sigPadSecurity} />
                    </div>
                    <button type="button" onClick={() => sigPadSecurity.current?.clear()} className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-rose-500 transition-all"><Eraser className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pb-12">
            <button type="button" onClick={handleReset} className="px-8 py-5 border-2 border-slate-200 text-slate-400 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">Reset Form</button>
            <button type="submit" className="px-12 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl active:scale-95 transition-all">Submit Safety Audit</button>
          </div>
        </form>
      )}

      {activeTab === 'new' && moduleType === 'surprise' && (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Check Date</label>
                <input type="date" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={surpriseForm.date} onChange={(e) => handleSurpriseFieldChange('date', e.target.value)} />
                {surpriseForm.field_timestamps?.date && <span className="text-[7px] text-slate-400 ml-1 italic">Stamped: {surpriseForm.field_timestamps.date}</span>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">IN Time</label>
                <input type="time" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={surpriseForm.in_time} onChange={(e) => handleSurpriseFieldChange('in_time', e.target.value)} />
                {surpriseForm.field_timestamps?.in_time && <span className="text-[7px] text-slate-400 ml-1 italic">Stamped: {surpriseForm.field_timestamps.in_time}</span>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Exit Time</label>
                <input type="time" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={surpriseForm.exit_time} onChange={(e) => handleSurpriseFieldChange('exit_time', e.target.value)} />
                {surpriseForm.field_timestamps?.exit_time && <span className="text-[7px] text-slate-400 ml-1 italic">Stamped: {surpriseForm.field_timestamps.exit_time}</span>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Facility Name</label>
                <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={surpriseForm.name_of_facility} onChange={(e) => handleSurpriseFieldChange('name_of_facility', e.target.value)} />
                {surpriseForm.field_timestamps?.name_of_facility && <span className="text-[7px] text-slate-400 ml-1 italic">Stamped: {surpriseForm.field_timestamps.name_of_facility}</span>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 1 Security Check - Main Gate */}
            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
              {renderSection("1. Security Check - Main Gate", <Building2 className="w-5 h-5" />)}
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Guard Name @ Main Gate</label>
                  <input className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" value={surpriseForm.main_gate_guard_name} onChange={(e) => handleSurpriseFieldChange('main_gate_guard_name', e.target.value)} />
                  {surpriseForm.field_timestamps?.main_gate_guard_name && <span className="text-[7px] text-slate-400 ml-1 italic">Stamped: {surpriseForm.field_timestamps.main_gate_guard_name}</span>}
                </div>
                <SectionCheckbox label="Was Security Guard Alert?" value={surpriseForm.main_gate_guard_alert} onChange={(val) => handleSurpriseFieldChange('main_gate_guard_alert', val)} timestamp={surpriseForm.field_timestamps?.main_gate_guard_alert} />
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Response Time (Presence at gate)</label>
                  <input className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" value={surpriseForm.main_gate_response_time} onChange={(e) => handleSurpriseFieldChange('main_gate_response_time', e.target.value)} />
                  {surpriseForm.field_timestamps?.main_gate_response_time && <span className="text-[7px] text-slate-400 ml-1 italic">Stamped: {surpriseForm.field_timestamps.main_gate_response_time}</span>}
                </div>
                <SectionCheckbox label="Was the Main Gate Locked?" value={surpriseForm.main_gate_locked} onChange={(val) => handleSurpriseFieldChange('main_gate_locked', val)} timestamp={surpriseForm.field_timestamps?.main_gate_locked} />
                <SectionCheckbox label="Ask for ID prior to opening gate?" value={surpriseForm.main_gate_ask_id} onChange={(val) => handleSurpriseFieldChange('main_gate_ask_id', val)} timestamp={surpriseForm.field_timestamps?.main_gate_ask_id} />
                <SectionCheckbox label="Was Security Guard in Uniform?" value={surpriseForm.main_gate_guard_uniform} onChange={(val) => handleSurpriseFieldChange('main_gate_guard_uniform', val)} timestamp={surpriseForm.field_timestamps?.main_gate_guard_uniform} />
                <SectionCheckbox label="Gate entry registered?" value={surpriseForm.main_gate_entry_registered} onChange={(val) => handleSurpriseFieldChange('main_gate_entry_registered', val)} timestamp={surpriseForm.field_timestamps?.main_gate_entry_registered} />
              </div>
            </div>

            {/* 2 Security Check - BMS Cabin */}
            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
              {renderSection("2. Security Check - BMS Cabin", <HardDrive className="w-5 h-5" />)}
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Guard Name @ BMS Cabin</label>
                  <input className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" value={surpriseForm.bms_guard_name} onChange={(e) => handleSurpriseFieldChange('bms_guard_name', e.target.value)} />
                  {surpriseForm.field_timestamps?.bms_guard_name && <span className="text-[7px] text-slate-400 ml-1 italic">Stamped: {surpriseForm.field_timestamps.bms_guard_name}</span>}
                </div>
                <SectionCheckbox label="Was Security Guard Alert?" value={surpriseForm.bms_guard_alert} onChange={(val) => handleSurpriseFieldChange('bms_guard_alert', val)} timestamp={surpriseForm.field_timestamps?.bms_guard_alert} />
                <SectionCheckbox label="Was Security Guard in Uniform?" value={surpriseForm.bms_guard_uniform} onChange={(val) => handleSurpriseFieldChange('bms_guard_uniform', val)} timestamp={surpriseForm.field_timestamps?.bms_guard_uniform} />
                <SectionCheckbox label="Were the CCTV's monitor functioning?" value={surpriseForm.bms_cctv_functioning} onChange={(val) => handleSurpriseFieldChange('bms_cctv_functioning', val)} timestamp={surpriseForm.field_timestamps?.bms_cctv_functioning} />
                <div className="flex flex-col gap-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">Fire Alarm Status</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => handleSurpriseFieldChange('bms_fire_alarm_status', 'Normal')} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${surpriseForm.bms_fire_alarm_status === 'Normal' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>Normal</button>
                      <button type="button" onClick={() => handleSurpriseFieldChange('bms_fire_alarm_status', 'Fault')} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${surpriseForm.bms_fire_alarm_status === 'Fault' ? 'bg-rose-500 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>Fault</button>
                    </div>
                  </div>
                  {surpriseForm.field_timestamps?.bms_fire_alarm_status && <span className="text-[9px] font-medium text-slate-400 italic">Stamped: {surpriseForm.field_timestamps.bms_fire_alarm_status}</span>}
                </div>
                <SectionCheckbox label="Fire Pumps in Auto mode?" value={surpriseForm.bms_fire_pumps_auto} onChange={(val) => handleSurpriseFieldChange('bms_fire_pumps_auto', val)} timestamp={surpriseForm.field_timestamps?.bms_fire_pumps_auto} />
              </div>
            </div>
          </div>

          {/* 3 Documents & 4 Facility Checks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
              {renderSection("3. Documents & Checklists", <FileText className="w-5 h-5" />)}
              <div className="space-y-4">
                <SectionCheckbox label="Security Log Book fresh entry made?" value={surpriseForm.docs_log_book_checked} onChange={(val) => handleSurpriseFieldChange('docs_log_book_checked', val)} timestamp={surpriseForm.field_timestamps?.docs_log_book_checked} />
                <SectionCheckbox label="Is Closing checklist updated?" value={surpriseForm.docs_closing_updated} onChange={(val) => handleSurpriseFieldChange('docs_closing_updated', val)} timestamp={surpriseForm.field_timestamps?.docs_closing_updated} />
                <SectionCheckbox label="Is Safety Monitoring checklist updated?" value={surpriseForm.docs_safety_updated} onChange={(val) => handleSurpriseFieldChange('docs_safety_updated', val)} timestamp={surpriseForm.field_timestamps?.docs_safety_updated} />
                <SectionCheckbox label="Is Patrolling checklist followed?" value={surpriseForm.docs_patrolling_followed} onChange={(val) => handleSurpriseFieldChange('docs_patrolling_followed', val)} timestamp={surpriseForm.field_timestamps?.docs_patrolling_followed} />
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
              {renderSection("4. Facility Security Checks", <ShieldCheck className="w-5 h-5" />)}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SectionCheckbox label="All gates of premises locked?" value={surpriseForm.facility_gates_locked} onChange={(val) => handleSurpriseFieldChange('facility_gates_locked', val)} timestamp={surpriseForm.field_timestamps?.facility_gates_locked} />
                <SectionCheckbox label="Main entries to storage locked?" value={surpriseForm.facility_storage_locked} onChange={(val) => handleSurpriseFieldChange('facility_storage_locked', val)} timestamp={surpriseForm.field_timestamps?.facility_storage_locked} />
                <SectionCheckbox label="Temperature control room locked?" value={surpriseForm.facility_temp_room_locked} onChange={(val) => handleSurpriseFieldChange('facility_temp_room_locked', val)} timestamp={surpriseForm.field_timestamps?.facility_temp_room_locked} />
                <div className="flex flex-col gap-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">Emergency Exit Doors</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => handleSurpriseFieldChange('facility_emergency_exits', 'Locked')} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${surpriseForm.facility_emergency_exits === 'Locked' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>Locked</button>
                      <button type="button" onClick={() => handleSurpriseFieldChange('facility_emergency_exits', 'Open')} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${surpriseForm.facility_emergency_exits === 'Open' ? 'bg-rose-500 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>Open</button>
                    </div>
                  </div>
                  {surpriseForm.field_timestamps?.facility_emergency_exits && <span className="text-[9px] font-medium text-slate-400 italic">Stamped: {surpriseForm.field_timestamps.facility_emergency_exits}</span>}
                </div>
                <SectionCheckbox label="All computers switched off?" value={surpriseForm.facility_computers_off} onChange={(val) => handleSurpriseFieldChange('facility_computers_off', val)} timestamp={surpriseForm.field_timestamps?.facility_computers_off} />
                <SectionCheckbox label="Taken round of entire periphery?" value={surpriseForm.facility_round_completed} onChange={(val) => handleSurpriseFieldChange('facility_round_completed', val)} timestamp={surpriseForm.field_timestamps?.facility_round_completed} />
                <SectionCheckbox label="No personal belongings left?" value={surpriseForm.facility_no_personal_belongings} onChange={(val) => handleSurpriseFieldChange('facility_no_personal_belongings', val)} timestamp={surpriseForm.field_timestamps?.facility_no_personal_belongings} />
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Temperature Reading</label>
                  <input className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" value={surpriseForm.facility_temp_reading} onChange={(e) => handleSurpriseFieldChange('facility_temp_reading', e.target.value)} />
                  {surpriseForm.field_timestamps?.facility_temp_reading && <span className="text-[7px] text-slate-400 ml-1 italic">Stamped: {surpriseForm.field_timestamps.facility_temp_reading}</span>}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">External Vehicles Count</label>
                  <input className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" value={surpriseForm.facility_external_vehicles} onChange={(e) => handleSurpriseFieldChange('facility_external_vehicles', e.target.value)} />
                  {surpriseForm.field_timestamps?.facility_external_vehicles && <span className="text-[7px] text-slate-400 ml-1 italic">Stamped: {surpriseForm.field_timestamps.facility_external_vehicles}</span>}
                </div>
                <SectionCheckbox label="All windows shut properly?" value={surpriseForm.facility_windows_shut} onChange={(val) => handleSurpriseFieldChange('facility_windows_shut', val)} timestamp={surpriseForm.field_timestamps?.facility_windows_shut} />
              </div>
            </div>
          </div>

          {/* 5 Lighting & 6 Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
              {renderSection("5. Compound Lighting", <Zap className="w-5 h-5" />)}
              <div className="space-y-4">
                <SectionCheckbox label="All Lights are ON?" value={surpriseForm.lighting_all_on} onChange={(val) => handleSurpriseFieldChange('lighting_all_on', val)} timestamp={surpriseForm.field_timestamps?.lighting_all_on} />
                <div className="flex flex-col gap-1">
                  <textarea rows={2} placeholder="Areas with no light/dim light..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={surpriseForm.lighting_dim_areas} onChange={(e) => handleSurpriseFieldChange('lighting_dim_areas', e.target.value)} />
                  {surpriseForm.field_timestamps?.lighting_dim_areas && <span className="text-[7px] text-slate-400 ml-1 italic">Stamped: {surpriseForm.field_timestamps.lighting_dim_areas}</span>}
                </div>
                <div className="flex flex-col gap-1">
                  <textarea rows={2} placeholder="Defective Lights observed..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={surpriseForm.lighting_defective_points} onChange={(e) => handleSurpriseFieldChange('lighting_defective_points', e.target.value)} />
                  {surpriseForm.field_timestamps?.lighting_defective_points && <span className="text-[7px] text-slate-400 ml-1 italic">Stamped: {surpriseForm.field_timestamps.lighting_defective_points}</span>}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
              {renderSection("6. Facility Activities", <Activity className="w-5 h-5" />)}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <input placeholder="Staff on Duty..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={surpriseForm.activities_staff_on_duty} onChange={(e) => handleSurpriseFieldChange('activities_staff_on_duty', e.target.value)} />
                    {surpriseForm.field_timestamps?.activities_staff_on_duty && <span className="text-[7px] text-slate-400 ml-1 italic">Stamped: {surpriseForm.field_timestamps.activities_staff_on_duty}</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <input placeholder="Reporting Head..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={surpriseForm.activities_reporting_head} onChange={(e) => handleSurpriseFieldChange('activities_reporting_head', e.target.value)} />
                    {surpriseForm.field_timestamps?.activities_reporting_head && <span className="text-[7px] text-slate-400 ml-1 italic">Stamped: {surpriseForm.field_timestamps.activities_reporting_head}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <input placeholder="Areas occupied by Operations..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={surpriseForm.activities_ops_areas} onChange={(e) => handleSurpriseFieldChange('activities_ops_areas', e.target.value)} />
                  {surpriseForm.field_timestamps?.activities_ops_areas && <span className="text-[7px] text-slate-400 ml-1 italic">Stamped: {surpriseForm.field_timestamps.activities_ops_areas}</span>}
                </div>
                <div className="flex flex-col gap-1">
                  <textarea placeholder="General Behaviors (Lazing, Asleep, etc)..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={surpriseForm.activities_general_behavior} onChange={(e) => handleSurpriseFieldChange('activities_general_behavior', e.target.value)} />
                  {surpriseForm.field_timestamps?.activities_general_behavior && <span className="text-[7px] text-slate-400 ml-1 italic">Stamped: {surpriseForm.field_timestamps.activities_general_behavior}</span>}
                </div>
                <div className="flex flex-col gap-1">
                  <input placeholder="Name of last person leaving..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={surpriseForm.activities_last_person_name} onChange={(e) => handleSurpriseFieldChange('activities_last_person_name', e.target.value)} />
                  {surpriseForm.field_timestamps?.activities_last_person_name && <span className="text-[7px] text-slate-400 ml-1 italic">Stamped: {surpriseForm.field_timestamps.activities_last_person_name}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
            {renderSection("7. Comments & Sign-Off", <PenTool className="w-5 h-5" />)}
            <div className="flex flex-col gap-1 mb-8">
              <textarea rows={3} placeholder="Additional comments if any..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={surpriseForm.comments} onChange={(e) => handleSurpriseFieldChange('comments', e.target.value)} />
              {surpriseForm.field_timestamps?.comments && <span className="text-[7px] text-slate-400 ml-1 italic">Stamped: {surpriseForm.field_timestamps.comments}</span>}
            </div>
            
            <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 relative">
              <span className="text-[10px] font-bold text-slate-400 uppercase absolute top-2 left-4">Security Guard Signature (Acknowledged)</span>
              <div className="bg-white rounded-xl mt-6 overflow-hidden border border-slate-100">
                <SignatureCanvas penColor='black' canvasProps={{className: 'w-full h-32'}} ref={sigPadSecurity} />
              </div>
              <button type="button" onClick={() => sigPadSecurity.current?.clear()} className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-rose-500 transition-all"><Eraser className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex justify-between items-center pb-12">
            <button type="button" onClick={handleReset} className="px-8 py-5 border-2 border-slate-200 text-slate-400 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">Reset Form</button>
            <button type="submit" className="px-12 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl active:scale-95 transition-all">Submit Surprise Visit Report</button>
          </div>
        </form>
      )}

      {activeTab === 'new' && moduleType === 'daily' && (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date (Auto)</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input readOnly className="w-full pl-12 pr-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500 cursor-not-allowed" value={dailyForm.date} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Time (Auto)</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input readOnly className="w-full pl-12 pr-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500 cursor-not-allowed" value={dailyForm.time} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={dailyForm.location} onChange={(e) => handleDailyFieldChange('location', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 1. Exterior & Perimeter */}
            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
              {renderSection("1. Facility Exterior & Perimeter", <Truck className="w-5 h-5" />)}
              <div className="space-y-4">
                <SectionCheckbox label="Perimeter surroundings clean?" value={dailyForm.perimeter_clean} onChange={(val) => handleDailyFieldChange('perimeter_clean', val)} timestamp={dailyForm.field_timestamps?.perimeter_clean} />
                <SectionCheckbox label="Gates & Barriers functioning?" value={dailyForm.gates_functioning} onChange={(val) => handleDailyFieldChange('gates_functioning', val)} timestamp={dailyForm.field_timestamps?.gates_functioning} />
                <SectionCheckbox label="External lighting operational?" value={dailyForm.external_lighting_ok} onChange={(val) => handleDailyFieldChange('external_lighting_ok', val)} timestamp={dailyForm.field_timestamps?.external_lighting_ok} />
                <SectionCheckbox label="Vehicle parking organized?" value={dailyForm.parking_organized} onChange={(val) => handleDailyFieldChange('parking_organized', val)} timestamp={dailyForm.field_timestamps?.parking_organized} />
              </div>
            </div>

            {/* 2. Interior Cleanliness */}
            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
              {renderSection("2. Interior Cleanliness & Hygiene", <CheckCircle2 className="w-5 h-5" />)}
              <div className="space-y-4">
                <SectionCheckbox label="Operational aisles clear?" value={dailyForm.aisles_clear} onChange={(val) => handleDailyFieldChange('aisles_clear', val)} timestamp={dailyForm.field_timestamps?.aisles_clear} />
                <SectionCheckbox label="Floor swept and clean?" value={dailyForm.floor_clean} onChange={(val) => handleDailyFieldChange('floor_clean', val)} timestamp={dailyForm.field_timestamps?.floor_clean} />
                <SectionCheckbox label="Waste bins cleared?" value={dailyForm.waste_bins_cleared} onChange={(val) => handleDailyFieldChange('waste_bins_cleared', val)} timestamp={dailyForm.field_timestamps?.waste_bins_cleared} />
                <SectionCheckbox label="No pest sightings?" value={dailyForm.pest_control_sighting} onChange={(val) => handleDailyFieldChange('pest_control_sighting', val)} timestamp={dailyForm.field_timestamps?.pest_control_sighting} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 3. Equipment & Tools */}
            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
              {renderSection("3. Equipment & Tools", <HardDrive className="w-5 h-5" />)}
              <div className="space-y-4">
                <SectionCheckbox label="Forklifts/MHE checked?" value={dailyForm.forklifts_checked} onChange={(val) => handleDailyFieldChange('forklifts_checked', val)} timestamp={dailyForm.field_timestamps?.forklifts_checked} />
                <SectionCheckbox label="Racking visual inspection OK?" value={dailyForm.racking_visual_inspect} onChange={(val) => handleDailyFieldChange('racking_visual_inspect', val)} timestamp={dailyForm.field_timestamps?.racking_visual_inspect} />
                <SectionCheckbox label="Charging station safe?" value={dailyForm.charging_station_safe} onChange={(val) => handleDailyFieldChange('charging_station_safe', val)} timestamp={dailyForm.field_timestamps?.charging_station_safe} />
                <SectionCheckbox label="Scanners operational?" value={dailyForm.scanners_operational} onChange={(val) => handleDailyFieldChange('scanners_operational', val)} timestamp={dailyForm.field_timestamps?.scanners_operational} />
              </div>
            </div>

            {/* 4. Staff & Safety */}
            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
              {renderSection("4. Staff & Safety Compliance", <ShieldCheck className="w-5 h-5" />)}
              <div className="space-y-4">
                <SectionCheckbox label="Staff wearing proper PPE?" value={dailyForm.staff_ppe_compliance} onChange={(val) => handleDailyFieldChange('staff_ppe_compliance', val)} timestamp={dailyForm.field_timestamps?.staff_ppe_compliance} />
                <SectionCheckbox label="First Aid kit accessible?" value={dailyForm.first_aid_accessible} onChange={(val) => handleDailyFieldChange('first_aid_accessible', val)} timestamp={dailyForm.field_timestamps?.first_aid_accessible} />
                <SectionCheckbox label="Emergency exits clear?" value={dailyForm.emergency_exits_clear} onChange={(val) => handleDailyFieldChange('emergency_exits_clear', val)} timestamp={dailyForm.field_timestamps?.emergency_exits_clear} />
                <SectionCheckbox label="No smoking rules enforced?" value={dailyForm.no_smoking_enforced} onChange={(val) => handleDailyFieldChange('no_smoking_enforced', val)} timestamp={dailyForm.field_timestamps?.no_smoking_enforced} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
            {renderSection("5. Inventory & Operations", <Activity className="w-5 h-5" />)}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SectionCheckbox label="Pallets stacked safely?" value={dailyForm.pallets_stacked_safely} onChange={(val) => handleDailyFieldChange('pallets_stacked_safely', val)} timestamp={dailyForm.field_timestamps?.pallets_stacked_safely} />
              <SectionCheckbox label="Hazmat stored properly?" value={dailyForm.hazmat_stored_properly} onChange={(val) => handleDailyFieldChange('hazmat_stored_properly', val)} timestamp={dailyForm.field_timestamps?.hazmat_stored_properly} />
              <SectionCheckbox label="Temp sensitive monitoring OK?" value={dailyForm.temp_sensitive_monitored} onChange={(val) => handleDailyFieldChange('temp_sensitive_monitored', val)} timestamp={dailyForm.field_timestamps?.temp_sensitive_monitored} />
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8">
            {renderSection("Sign-Off", <PenTool className="w-5 h-5" />)}
            <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 relative">
              <span className="text-[10px] font-bold text-slate-400 uppercase absolute top-2 left-4">Security Guard Signature</span>
              <div className="bg-white rounded-xl mt-6 overflow-hidden border border-slate-100">
                <SignatureCanvas penColor='black' canvasProps={{className: 'w-full h-32'}} ref={sigPadSecurity} />
              </div>
              <button type="button" onClick={() => sigPadSecurity.current?.clear()} className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-rose-500 transition-all"><Eraser className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex justify-between items-center pb-12">
            <button type="button" onClick={handleReset} className="px-8 py-5 border-2 border-slate-200 text-slate-400 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">Reset Form</button>
            <button type="submit" className="px-12 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl active:scale-95 transition-all">Submit Daily Monitoring 10.1</button>
          </div>
        </form>
      )}

      {activeTab === 'approval' && (
        <div className="space-y-6">
          {(
            checklists.filter(c => c.status === 'Pending Approval').length +
            patrolLogs.filter(p => p.status === 'Pending Approval').length +
            safetyChecks.filter(s => s.status === 'Pending Approval').length +
            surpriseVisits.filter(s => s.status === 'Pending Approval').length
          ) === 0 ? (
            <div className="bg-white py-20 rounded-[2rem] border border-slate-200 text-center">
              <CheckCircle2 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest">No pending approvals found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                ...checklists.filter(c => c.status === 'Pending Approval').map(c => ({ item: c, type: 'closing' })),
                ...patrolLogs.filter(c => c.status === 'Pending Approval').map(c => ({ item: c, type: 'patrolling' })),
                ...safetyChecks.filter(c => c.status === 'Pending Approval').map(c => ({ item: c, type: 'safety' })),
                ...surpriseVisits.filter(c => c.status === 'Pending Approval').map(c => ({ item: c, type: 'surprise' }))
              ].sort((a, b) => b.item.created_at - a.item.created_at).map(({ item: cl, type }) => (
                <div key={cl.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter ${
                          type === 'closing' ? 'bg-blue-100 text-blue-600' :
                          type === 'patrolling' ? 'bg-purple-100 text-purple-600' :
                          type === 'safety' ? 'bg-orange-100 text-orange-600' :
                          'bg-indigo-100 text-indigo-600'
                        }`}>
                          {type === 'closing' ? 'Closing 9.3' : 
                           type === 'patrolling' ? 'Night Patrol' : 
                           type === 'safety' ? 'Safety' : 
                           'Surprise Visit'}
                        </span>
                      </div>
                      <h4 className="font-black text-slate-800 text-lg">{cl.date}</h4>
                      <p className="text-xs text-slate-500 font-bold">
                        {type === 'closing' ? (cl as IWarehouseChecklist).time : 
                         type === 'patrolling' ? (cl as IPatrolLog).location : 
                         type === 'safety' ? (cl as ISafetyCheck).time :
                         (cl as SurpriseVisitChecklist).in_time} • {cl.submitted_by}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[9px] font-black uppercase rounded-full">Pending</span>
                  </div>
                  <button 
                    onClick={() => { 
                      setModuleType(type as any); // Switch module context to view the right modal
                      if (type === 'closing') setSelectedChecklist(cl as IWarehouseChecklist); 
                      else if (type === 'patrolling') setSelectedPatrol(cl as IPatrolLog);
                      else if (type === 'safety') setSelectedSafety(cl as ISafetyCheck);
                      else setSelectedSurprise(cl as SurpriseVisitChecklist);
                    }}
                    className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                      canApprove(type) 
                        ? 'bg-slate-900 text-white hover:bg-slate-800' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                    disabled={!canApprove(type)}
                  >
                    {canApprove(type) ? 'View & Sign' : 'Restricted to Karthik'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-5 text-left">Date / Info</th>
                <th className="px-6 py-5 text-left">Submitted By</th>
                <th className="px-6 py-5 text-left">Status</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(moduleType === 'closing' ? checklists : 
                moduleType === 'patrolling' ? patrolLogs : 
                moduleType === 'safety' ? safetyChecks :
                moduleType === 'daily' ? dailyMonitoring :
                surpriseVisits).map(cl => (
                <tr key={cl.id} className="hover:bg-slate-50 transition-all">
                  <td className="px-6 py-5">
                    <p className="text-sm font-black text-slate-800">{cl.date}</p>
                    <p className="text-[10px] font-bold text-slate-400">
                      {moduleType === 'closing' ? (cl as IWarehouseChecklist).time : 
                       moduleType === 'patrolling' ? (cl as IPatrolLog).location : 
                       moduleType === 'safety' ? (cl as ISafetyCheck).time :
                       moduleType === 'daily' ? (cl as DailyMonitoringChecklist).time :
                       (cl as SurpriseVisitChecklist).in_time}
                    </p>
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-slate-600">{cl.submitted_by}</td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase w-fit ${
                        cl.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : 
                        cl.status === 'Declined' ? 'bg-rose-50 text-rose-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {cl.status}
                      </span>
                      {cl.status === 'Declined' && cl.decline_comments && (
                        <p className="text-[9px] text-rose-400 font-bold italic line-clamp-1" title={cl.decline_comments}>
                          Reason: {cl.decline_comments}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right space-x-2">
                    <button 
                      onClick={() => {
                        if (moduleType === 'closing') setSelectedChecklist(cl as IWarehouseChecklist);
                        else if (moduleType === 'patrolling') setSelectedPatrol(cl as IPatrolLog);
                        else if (moduleType === 'safety') setSelectedSafety(cl as ISafetyCheck);
                        else if (moduleType === 'daily') setSelectedDaily(cl as DailyMonitoringChecklist);
                        else setSelectedSurprise(cl as SurpriseVisitChecklist);
                      }} 
                      className="p-2 text-slate-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => downloadPDF(
                        moduleType === 'closing' ? `checklist-pdf-${cl.id}` : 
                        moduleType === 'patrolling' ? `patrol-pdf-${cl.id}` :
                        moduleType === 'safety' ? `safety-pdf-${cl.id}` :
                        moduleType === 'daily' ? `daily-pdf-${cl.id}` :
                        `surprise-pdf-${cl.id}`,
                        moduleType === 'closing' ? `Closing_Checklist_${cl.date}` : 
                        moduleType === 'patrolling' ? `Night_Patrol_${cl.date}` :
                        moduleType === 'safety' ? `Safety_Audit_${cl.date}` :
                        moduleType === 'daily' ? `Daily_Monitoring_${cl.date}` :
                        `Surprise_Visit_${cl.date}`
                      )} 
                      className="p-2 text-slate-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL VIEW / SIGN - CLOSING */}
      {selectedChecklist && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
               <div>
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Closing Checklist 9.3</h2>
                 <p className="text-[10px] font-bold text-slate-400 uppercase">Integrity Stamped Review</p>
               </div>
               <div className="flex items-center gap-3">
                 <button onClick={() => downloadPDF(`checklist-pdf-${selectedChecklist.id}`, `Closing_Checklist_${selectedChecklist.date}`)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100">
                   <Download className="w-4 h-4" /> PDF
                 </button>
                 <button onClick={() => setSelectedChecklist(null)} className="p-2.5 text-slate-400 hover:text-slate-600"><XCircle className="w-6 h-6" /></button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
               <div id={`checklist-pdf-${selectedChecklist.id}`} className="space-y-8 bg-white p-4">
                  <div className="flex justify-between items-end border-b-4 border-slate-900 pb-6 mb-8">
                     <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">WRITER</h1>
                        <p className="text-xs font-black text-[#E31E24] uppercase tracking-[0.4em]">Relocations</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Checklist Status</p>
                        <p className={`text-lg font-black uppercase ${selectedChecklist.status === 'Approved' ? 'text-emerald-500' : 'text-amber-500'}`}>{selectedChecklist.status}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-12 text-sm">
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date & Time</p>
                        <p className="font-bold text-slate-800">{selectedChecklist.date} @ {selectedChecklist.time}</p>
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Submitted By</p>
                        <p className="font-bold text-slate-800">{selectedChecklist.submitted_by}</p>
                     </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-2xl">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Core Room Checks</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         {[
                           { label: "Rooms Locked", val: selectedChecklist.office_locked },
                           { label: "Lights Off", val: selectedChecklist.lights_off },
                           { label: "Emergency Exits", val: selectedChecklist.emergency_exits_locked }
                         ].map(item => (
                           <div key={item.label} className="p-4 bg-white rounded-xl border border-slate-200">
                             <div className="flex items-center gap-2 mb-2">
                               {item.val.status ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                               <span className="text-xs font-bold text-slate-700">{item.label}</span>
                             </div>
                             <p className="text-[9px] text-slate-400 italic">Stamp: {item.val.timestamp || 'N/A'}</p>
                             {item.val.remarks && <p className="text-[10px] mt-1 font-medium text-slate-500">"{item.val.remarks}"</p>}
                           </div>
                         ))}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">General Warehouse Checks</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                         {[
                           { label: "Personal Belongings", val: selectedChecklist.no_personal_belongings, ts: selectedChecklist.no_personal_belongings_timestamp },
                           { label: "Water Taps", val: selectedChecklist.water_taps_closed, ts: selectedChecklist.water_taps_closed_timestamp },
                           { label: "Warehouse Round", val: selectedChecklist.round_taken, ts: selectedChecklist.round_taken_timestamp },
                           { label: "Lights Operational", val: selectedChecklist.lights_operational, ts: selectedChecklist.lights_operational_timestamp }
                         ].map(item => (
                           <div key={item.label} className="p-4 bg-white rounded-xl border border-slate-200">
                             <div className="flex items-center gap-2 mb-2">
                               {item.val ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                               <span className="text-[10px] font-bold text-slate-700">{item.label}</span>
                             </div>
                             <p className="text-[8px] text-slate-400 italic">Stamp: {item.ts || 'N/A'}</p>
                           </div>
                         ))}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Phase Details</h4>
                      <div className="grid grid-cols-4 gap-4">
                        {Object.entries(selectedChecklist.warehouse_sections).map(([name, data]) => (
                           <div key={name} className="p-4 bg-white rounded-xl border border-slate-200">
                             <div className="flex items-center justify-between mb-3">
                               <span className="text-sm font-black text-slate-800">Section {name}</span>
                               {data.status ? <Lock className="w-3.5 h-3.5 text-emerald-500" /> : <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />}
                             </div>
                             <div className="space-y-1.5 border-t border-slate-50 pt-2">
                               <p className="text-[9px] font-bold text-slate-400 flex justify-between">LIGHTS: <span className={data.lights_off ? 'text-emerald-600' : 'text-slate-400'}>{data.lights_off ? 'OFF' : 'ON'}</span></p>
                               <p className="text-[9px] font-bold text-slate-400 flex justify-between">BIO: <span className={data.biometric_working ? 'text-emerald-600' : 'text-slate-400'}>{data.biometric_working ? 'YES' : 'NO'}</span></p>
                               <p className="text-[9px] font-bold text-slate-400 flex justify-between">FANS: <span className={data.fans_off ? 'text-emerald-600' : 'text-slate-400'}>{data.fans_off ? 'OFF' : 'ON'}</span></p>
                               <p className="text-[8px] text-slate-300 italic mt-1 font-medium">{data.timestamp || 'N/A'}</p>
                             </div>
                           </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                       <div className="bg-slate-50 p-6 rounded-2xl">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Vehicles Overnight</h4>
                          <div className="flex gap-8">
                             <div>
                               <span className="text-[9px] font-bold text-slate-400 block">BIKES</span>
                               <p className="text-xl font-black">{selectedChecklist.vehicles_bikes}</p>
                               <p className="text-[8px] text-slate-400 italic">Stamp: {selectedChecklist.vehicles_bikes_timestamp || 'N/A'}</p>
                             </div>
                             <div>
                               <span className="text-[9px] font-bold text-slate-400 block">4-WHEELERS</span>
                               <p className="text-xl font-black">{selectedChecklist.vehicles_4wheelers}</p>
                               <p className="text-[8px] text-slate-400 italic">Stamp: {selectedChecklist.vehicles_4wheelers_timestamp || 'N/A'}</p>
                             </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-slate-200">
                             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Exit Details</h4>
                             <p className="text-xs font-bold text-slate-700">LAST PERSON: {selectedChecklist.last_person_name || 'N/A'}</p>
                             <p className="text-[8px] text-slate-400 italic mb-2">Stamp: {selectedChecklist.last_person_name_timestamp || 'N/A'}</p>
                             <p className="text-xs font-bold text-slate-700 uppercase">Gate Locked: {selectedChecklist.main_gate_locked_time || 'N/A'}</p>
                             <p className="text-[8px] text-slate-400 italic">Stamp: {selectedChecklist.main_gate_locked_time_timestamp || 'N/A'}</p>
                          </div>
                       </div>
                       <div className="bg-slate-50 p-6 rounded-2xl">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Observations</h4>
                          <p className="text-xs font-bold text-slate-700 italic">"{selectedChecklist.observations || 'No additional observations recorded'}"</p>
                          {selectedChecklist.observations_timestamp && <p className="text-[8px] text-slate-400 mt-2 font-black uppercase">Stamped: {selectedChecklist.observations_timestamp}</p>}
                       </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 pt-8">
                       <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">Security Guard</p>
                          <p className="text-xs font-black text-slate-800">{selectedChecklist.security_guard_name}</p>
                          {selectedChecklist.security_guard_signature && <img src={selectedChecklist.security_guard_signature} className="h-16 border rounded bg-white" alt="signature" />}
                       </div>
                       <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">Admin Incharge</p>
                          <p className="text-xs font-black text-slate-800">{selectedChecklist.admin_incharge_name || '-- Pending --'}</p>
                          {selectedChecklist.admin_incharge_signature && <img src={selectedChecklist.admin_incharge_signature} className="h-16 border rounded bg-white" alt="signature" />}
                       </div>
                       <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">Warehouse Incharge</p>
                          <p className="text-xs font-black text-slate-800">{selectedChecklist.warehouse_incharge_name || '-- Pending --'}</p>
                          {selectedChecklist.warehouse_incharge_signature && <img src={selectedChecklist.warehouse_incharge_signature} className="h-16 border rounded bg-white" alt="signature" />}
                       </div>
                    </div>
                  </div>
               </div>

               {/* APPROVAL ACTIONS */}
               {selectedChecklist.status === 'Pending Approval' && isOpsAdmin && (
                 <div className="mt-12 p-8 bg-slate-900 rounded-[2.5rem] border border-slate-700 shadow-2xl">
                   <div className="flex items-center gap-4 mb-8">
                     <div className="p-3 bg-blue-500 rounded-2xl"><ShieldCheck className="w-6 h-6 text-white" /></div>
                     <div>
                       <h3 className="text-white text-xl font-black">Digital Affirmation</h3>
                       <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Sign specifically as Administrator and Warehouse Incharge</p>
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-8 mb-8">
                      <div className="space-y-4">
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin Incharge Sig (Karthik)</span>
                           <button onClick={() => sigPadAdmin.current?.clear()} className="text-[9px] font-black text-rose-500 uppercase">Clear</button>
                         </div>
                         <div className="bg-white rounded-2xl overflow-hidden h-32"><SignatureCanvas penColor='black' canvasProps={{className: 'w-full h-full'}} ref={sigPadAdmin} /></div>
                      </div>
                      <div className="space-y-4">
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Warehouse Incharge Sig (Karthik)</span>
                           <button onClick={() => sigPadWarehouse.current?.clear()} className="text-[9px] font-black text-rose-500 uppercase">Clear</button>
                         </div>
                         <div className="bg-white rounded-2xl overflow-hidden h-32"><SignatureCanvas penColor='black' canvasProps={{className: 'w-full h-full'}} ref={sigPadWarehouse} /></div>
                      </div>
                   </div>

                   <button onClick={handleApprove} className="w-full py-5 bg-blue-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20 mb-4">
                     Authorize & Finalize Checklist
                   </button>
                   
                   <div className="pt-6 border-t border-slate-700">
                     {!showDeclineForm ? (
                       <button onClick={() => setShowDeclineForm(true)} className="w-full py-4 border-2 border-rose-500/30 text-rose-500 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-rose-500/10 transition-all">
                         Decline This Report
                       </button>
                     ) : (
                       <div className="space-y-4 animate-in slide-in-from-top-4">
                         <textarea 
                           className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white text-sm" 
                           placeholder="Reason for declining..." 
                           value={declineComments}
                           onChange={(e) => setDeclineComments(e.target.value)}
                         />
                         <div className="flex gap-4">
                           <button onClick={handleDecline} className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">Confirm Decline</button>
                           <button onClick={() => setShowDeclineForm(false)} className="px-6 py-3 border border-slate-700 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
                         </div>
                       </div>
                     )}
                   </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL VIEW / SIGN - SAFETY */}
      {selectedSafety && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
               <div>
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Safety Monitoring Audit</h2>
                 <p className="text-[10px] font-bold text-slate-400 uppercase">Weekly/Daily Safety Verification</p>
               </div>
               <div className="flex items-center gap-3">
                 <button onClick={() => downloadPDF(`safety-pdf-${selectedSafety.id}`, `Safety_Audit_${selectedSafety.date}`)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100">
                   <Download className="w-4 h-4" /> PDF
                 </button>
                 <button onClick={() => setSelectedSafety(null)} className="p-2.5 text-slate-400 hover:text-slate-600"><XCircle className="w-6 h-6" /></button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
               <div id={`safety-pdf-${selectedSafety.id}`} className="space-y-12 bg-white p-4">
                  <div className="flex justify-between items-end border-b-4 border-slate-900 pb-6 mb-8">
                     <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">WRITER</h1>
                        <p className="text-xs font-black text-[#E31E24] uppercase tracking-[0.4em]">Relocations</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Audit Status</p>
                        <p className={`text-lg font-black uppercase ${selectedSafety.status === 'Approved' ? 'text-emerald-500' : selectedSafety.status === 'Declined' ? 'text-rose-500' : 'text-amber-500'}`}>{selectedSafety.status}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-12 text-sm mb-8">
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date & Time</p>
                        <p className="font-bold text-slate-800">{selectedSafety.date} @ {selectedSafety.time}</p>
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Location</p>
                        <p className="font-bold text-slate-800">{selectedSafety.location}</p>
                     </div>
                  </div>

                  <div className="space-y-8">
                    {[
                      { title: "Fire Hydrant System", icon: <Flame />, checks: [
                        { label: "Tank Full", val: selectedSafety.hydrant_tank_full },
                        { label: "Hose Reels Healthy", val: selectedSafety.hydrant_hose_reel_healthy },
                        { label: "Power Supply", val: selectedSafety.hydrant_power_supply },
                        { label: "Pumps Auto", val: selectedSafety.hydrant_pumps_auto },
                        { label: "Valves ON", val: selectedSafety.hydrant_valves_on },
                        { label: "No Leakage", val: selectedSafety.hydrant_no_leakage },
                        { label: "Standard Pressure", val: selectedSafety.hydrant_pressure_gauge },
                        { label: "Pump Room Clean", val: selectedSafety.hydrant_pump_room_clean }
                      ]},
                      { title: "Sprinkler System", icon: <Wind />, checks: [
                        { label: "Standard Pressure", val: selectedSafety.sprinkler_pressure_gauge },
                        { label: "Main Valve ON", val: selectedSafety.sprinkler_main_valve_on }
                      ]},
                      { title: "Fire Detection System", icon: <Activity />, checks: [
                        { label: "Power Supply", val: selectedSafety.detection_power_supply },
                        { label: "Panels Healthy", val: selectedSafety.detection_panels_healthy }
                      ]},
                      { title: "CCTV", icon: <Camera />, checks: [
                        { label: "Cameras Clear", val: selectedSafety.cctv_images_clear },
                        { label: "DVR-I Backup", val: selectedSafety.cctv_dvr1_backup },
                        { label: "DVR-II Backup", val: selectedSafety.cctv_dvr2_backup }
                      ]},
                      { title: "Gas Suppression", icon: <HardDrive />, checks: [
                        { label: "Control Panel Healthy", val: selectedSafety.gas_control_panel_healthy },
                        { label: "Abort Switches Accessible", val: selectedSafety.gas_abort_switch_accessible },
                        { label: "Pressure Green", val: selectedSafety.gas_pressure_gauge_green }
                      ]},
                      { title: "Biometric", icon: <ShieldCheck />, checks: [
                        { label: "System Operational", val: selectedSafety.biometric_operational }
                      ]},
                      { title: "Emergency Exit", icon: <MapPin />, checks: [
                        { label: "Signage Working", val: selectedSafety.emergency_exit_signage }
                      ]}
                    ].map((section, idx) => (
                      <div key={idx} className="bg-slate-50 p-6 rounded-2xl">
                        <div className="flex items-center gap-3 mb-6">
                           <div className="p-2 bg-slate-900 rounded-lg text-white">
                             {React.cloneElement(section.icon as React.ReactElement<any>, { className: 'w-4 h-4' })}
                           </div>
                           <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">{section.title}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {section.checks.map((check, cidx) => (
                            <div key={cidx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight">{check.label}</span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${check.val.status ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                  {check.val.status ? 'YES' : 'NO'}
                                </span>
                              </div>
                              <div className="space-y-1">
                                {Object.entries(check.val).map(([key, value]) => {
                                  if (['status', 'remarks'].includes(key)) return null;
                                  return (
                                    <p key={key} className="text-[9px] font-black text-blue-600 flex justify-between">
                                      <span className="uppercase">{key.replace('_', ' ')}:</span>
                                      <span>{value as string}</span>
                                    </p>
                                  );
                                })}
                                {check.val.remarks && <p className="text-[9px] text-slate-400 italic mt-2 border-t pt-1">"{check.val.remarks}"</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-12 pt-12">
                     <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">Investigator (Security)</p>
                        <p className="text-xs font-black text-slate-800">{selectedSafety.submitted_by}</p>
                        {selectedSafety.security_guard_signature && <img src={selectedSafety.security_guard_signature} className="h-16 border rounded bg-white" alt="signature" />}
                     </div>
                     <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">Admin Incharge</p>
                        <p className="text-xs font-black text-slate-800">{selectedSafety.admin_incharge_name || '-- Pending --'}</p>
                        {selectedSafety.admin_incharge_signature && <img src={selectedSafety.admin_incharge_signature} className="h-16 border rounded bg-white" alt="signature" />}
                     </div>
                     <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">Warehouse Incharge</p>
                        <p className="text-xs font-black text-slate-800">{selectedSafety.warehouse_incharge_name || '-- Pending --'}</p>
                        {selectedSafety.warehouse_incharge_signature && <img src={selectedSafety.warehouse_incharge_signature} className="h-16 border rounded bg-white" alt="signature" />}
                     </div>
                  </div>
               </div>

               {/* APPROVAL ACTIONS - SAFETY */}
               {selectedSafety.status === 'Pending Approval' && canApprove('safety') && (
                 <div className="mt-12 p-8 bg-slate-900 rounded-[2.5rem] border border-slate-700 shadow-2xl">
                   <div className="flex items-center gap-4 mb-8">
                     <div className="p-3 bg-blue-500 rounded-2xl"><ShieldCheck className="w-6 h-6 text-white" /></div>
                     <div>
                       <h3 className="text-white text-xl font-black">Safety Affirmation</h3>
                       <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Verify fire & security systems health and sign</p>
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-8 mb-8">
                      <div className="space-y-4">
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin Incharge Sig (Karthik)</span>
                           <button onClick={() => sigPadAdmin.current?.clear()} className="text-[9px] font-black text-rose-500 uppercase">Clear</button>
                         </div>
                         <div className="bg-white rounded-2xl overflow-hidden h-32"><SignatureCanvas penColor='black' canvasProps={{className: 'w-full h-full'}} ref={sigPadAdmin} /></div>
                      </div>
                      <div className="space-y-4">
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Warehouse Incharge Sig (Karthik)</span>
                           <button onClick={() => sigPadWarehouse.current?.clear()} className="text-[9px] font-black text-rose-500 uppercase">Clear</button>
                         </div>
                         <div className="bg-white rounded-2xl overflow-hidden h-32"><SignatureCanvas penColor='black' canvasProps={{className: 'w-full h-full'}} ref={sigPadWarehouse} /></div>
                      </div>
                   </div>

                   <button onClick={handleApprove} className="w-full py-5 bg-blue-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20 mb-4">
                     Authorize & Finalize Safety Audit
                   </button>

                   <div className="pt-6 border-t border-slate-700">
                     {!showDeclineForm ? (
                       <button onClick={() => setShowDeclineForm(true)} className="w-full py-4 border-2 border-rose-500/30 text-rose-500 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-rose-500/10 transition-all">
                         Decline This Audit
                       </button>
                     ) : (
                       <div className="space-y-4 animate-in slide-in-from-top-4">
                         <textarea 
                           className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white text-sm" 
                           placeholder="Reason for declining..." 
                           value={declineComments}
                           onChange={(e) => setDeclineComments(e.target.value)}
                         />
                         <div className="flex gap-4">
                           <button onClick={handleDecline} className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">Confirm Decline</button>
                           <button onClick={() => setShowDeclineForm(false)} className="px-6 py-3 border border-slate-700 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
                         </div>
                       </div>
                     )}
                   </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL VIEW / SIGN - SURPRISE */}
      {selectedSurprise && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
               <div>
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Surprise Night Visit Report</h2>
                 <p className="text-[10px] font-bold text-slate-400 uppercase">External Unannounced Facility Inspection</p>
               </div>
               <div className="flex items-center gap-3">
                 <button onClick={() => downloadPDF(`surprise-pdf-${selectedSurprise.id}`, `Surprise_Visit_${selectedSurprise.date}`)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100">
                   <Download className="w-4 h-4" /> PDF
                 </button>
                 <button onClick={() => setSelectedSurprise(null)} className="p-2.5 text-slate-400 hover:text-slate-600"><XCircle className="w-6 h-6" /></button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
               <div id={`surprise-pdf-${selectedSurprise.id}`} className="space-y-12 bg-white p-4">
                  <div className="flex justify-between items-end border-b-4 border-slate-900 pb-6 mb-8">
                     <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">WRITER</h1>
                        <p className="text-xs font-black text-[#E31E24] uppercase tracking-[0.4em]">Relocations</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Report Status</p>
                        <p className={`text-lg font-black uppercase ${selectedSurprise.status === 'Approved' ? 'text-emerald-500' : selectedSurprise.status === 'Declined' ? 'text-rose-500' : 'text-amber-500'}`}>{selectedSurprise.status}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-sm mb-8">
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</p>
                        <p className="font-bold text-slate-800">{selectedSurprise.date}</p>
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">IN / EXIT Time</p>
                        <p className="font-bold text-slate-800">{selectedSurprise.in_time} - {selectedSurprise.exit_time || '--'}</p>
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Conducted By</p>
                        <p className="font-bold text-slate-800">{selectedSurprise.check_conducted_by}</p>
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Facility</p>
                        <p className="font-bold text-slate-800">{selectedSurprise.name_of_facility}</p>
                     </div>
                  </div>

                  <div className="space-y-8">
                    {/* Security Check View */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-slate-50 p-6 rounded-2xl">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2"><Building2 className="w-4 h-4" /> 1. Main Gate Security</h3>
                        <div className="space-y-3">
                          <p className="flex justify-between text-xs font-bold border-b border-slate-200 pb-2"><span>Guard Name:</span> <span className="text-blue-600">{selectedSurprise.main_gate_guard_name}</span></p>
                          <p className="flex justify-between text-xs font-bold border-b border-slate-200 pb-2"><span>Alertness:</span> <span className={selectedSurprise.main_gate_guard_alert ? 'text-emerald-500' : 'text-rose-500'}>{selectedSurprise.main_gate_guard_alert ? 'ALERT' : 'ASLEEP/INATTENTIVE'}</span></p>
                          <p className="flex justify-between text-xs font-bold border-b border-slate-200 pb-2"><span>Response Time:</span> <span className="text-blue-600">{selectedSurprise.main_gate_response_time}</span></p>
                          <p className="flex justify-between text-xs font-bold border-b border-slate-200 pb-2"><span>Gate Locked:</span> <span>{selectedSurprise.main_gate_locked ? 'YES' : 'NO'}</span></p>
                          <p className="flex justify-between text-xs font-bold border-b border-slate-200 pb-2"><span>Asked for ID:</span> <span>{selectedSurprise.main_gate_ask_id ? 'YES' : 'NO'}</span></p>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-2xl">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2"><HardDrive className="w-4 h-4" /> 2. BMS Cabin Security</h3>
                        <div className="space-y-3">
                          <p className="flex justify-between text-xs font-bold border-b border-slate-200 pb-2"><span>Guard Name:</span> <span className="text-blue-600">{selectedSurprise.bms_guard_name}</span></p>
                          <p className="flex justify-between text-xs font-bold border-b border-slate-200 pb-2"><span>CCTV Functioning:</span> <span>{selectedSurprise.bms_cctv_functioning ? 'YES' : 'NO'}</span></p>
                          <p className="flex justify-between text-xs font-bold border-b border-slate-200 pb-2"><span>Fire Alarm:</span> <span className={selectedSurprise.bms_fire_alarm_status === 'Normal' ? 'text-emerald-500' : 'text-rose-500'}>{selectedSurprise.bms_fire_alarm_status}</span></p>
                          <p className="flex justify-between text-xs font-bold border-b border-slate-200 pb-2"><span>Fire Pumps Auto:</span> <span>{selectedSurprise.bms_fire_pumps_auto ? 'YES' : 'NO'}</span></p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="bg-slate-50 p-6 rounded-2xl">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2"><FileText className="w-4 h-4" /> 3. Documents</h3>
                        <div className="grid grid-cols-2 gap-4">
                           <div className={`p-3 rounded-xl border ${selectedSurprise.docs_log_book_checked ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'} text-[10px] font-black uppercase text-center`}>Log Book Checked</div>
                           <div className={`p-3 rounded-xl border ${selectedSurprise.docs_closing_updated ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'} text-[10px] font-black uppercase text-center`}>Closing updated</div>
                           <div className={`p-3 rounded-xl border ${selectedSurprise.docs_safety_updated ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'} text-[10px] font-black uppercase text-center`}>Safety updated</div>
                           <div className={`p-3 rounded-xl border ${selectedSurprise.docs_patrolling_followed ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'} text-[10px] font-black uppercase text-center`}>Patrol followed</div>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-2xl">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2"><MapPin className="w-4 h-4" /> 4. Facility Checks</h3>
                        <div className="space-y-2">
                           <div className="flex flex-wrap gap-2 text-[8px] font-black uppercase">
                              <span className={`px-2 py-1 rounded ${selectedSurprise.facility_gates_locked ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>Gates Locked</span>
                              <span className={`px-2 py-1 rounded ${selectedSurprise.facility_storage_locked ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>Storage Locked</span>
                              <span className={`px-2 py-1 rounded ${selectedSurprise.facility_temp_room_locked ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>Temp Room Locked</span>
                              <span className={`px-2 py-1 rounded ${selectedSurprise.facility_computers_off ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>Computers Off</span>
                              <span className={`px-2 py-1 rounded ${selectedSurprise.facility_windows_shut ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>Windows Shut</span>
                           </div>
                           <p className="text-xs font-bold text-slate-700 mt-4">Temp Reading: <span className="text-blue-600">{selectedSurprise.facility_temp_reading}</span></p>
                           <p className="text-xs font-bold text-slate-700">Ext. Vehicles: <span className="text-blue-600">{selectedSurprise.facility_external_vehicles || 'None'}</span></p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2"><Zap className="w-4 h-4" /> 5. Lighting & 6. Activities</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lighting Details</p>
                           <p className="text-xs font-bold">All Lights On: <span className={selectedSurprise.lighting_all_on ? 'text-emerald-600' : 'text-rose-600'}>{selectedSurprise.lighting_all_on ? 'YES' : 'NO'}</span></p>
                           {selectedSurprise.lighting_dim_areas && <p className="p-3 bg-white rounded-xl text-xs italic text-slate-500 border border-slate-200">Dim: {selectedSurprise.lighting_dim_areas}</p>}
                           {selectedSurprise.lighting_defective_points && <p className="p-3 bg-white rounded-xl text-xs italic text-slate-500 border border-slate-200">Defective: {selectedSurprise.lighting_defective_points}</p>}
                        </div>
                        <div className="space-y-4">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Activities</p>
                           <div className="text-xs font-bold space-y-1">
                              <p>Staff on Duty: <span className="text-blue-600">{selectedSurprise.activities_staff_on_duty}</span></p>
                              <p>Reporting Head: <span className="text-blue-600">{selectedSurprise.activities_reporting_head}</span></p>
                              <p>Last Person Leaving: <span className="text-emerald-600">{selectedSurprise.activities_last_person_name}</span></p>
                           </div>
                           {selectedSurprise.activities_general_behavior && <p className="p-3 bg-white rounded-xl text-xs italic text-slate-500 border border-slate-200">Behavior: {selectedSurprise.activities_general_behavior}</p>}
                        </div>
                      </div>
                    </div>

                    {selectedSurprise.comments && (
                      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                        <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-4">Inspection Comments</h3>
                        <p className="text-sm font-medium text-blue-800 italic">"{selectedSurprise.comments}"</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-12 pt-12">
                     <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">Inspected By</p>
                        <p className="text-xs font-black text-slate-800">{selectedSurprise.check_conducted_by}</p>
                        {selectedSurprise.security_guard_signature && <img src={selectedSurprise.security_guard_signature} className="h-16 border rounded bg-white" alt="signature" />}
                     </div>
                     <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">Admin Incharge</p>
                        <p className="text-xs font-black text-slate-800">{selectedSurprise.admin_incharge_name || '-- Pending --'}</p>
                        {selectedSurprise.admin_incharge_signature && <img src={selectedSurprise.admin_incharge_signature} className="h-16 border rounded bg-white" alt="signature" />}
                     </div>
                     <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">Warehouse Incharge</p>
                        <p className="text-xs font-black text-slate-800">{selectedSurprise.warehouse_incharge_name || '-- Pending --'}</p>
                        {selectedSurprise.warehouse_incharge_signature && <img src={selectedSurprise.warehouse_incharge_signature} className="h-16 border rounded bg-white" alt="signature" />}
                     </div>
                  </div>
               </div>

               {/* APPROVAL ACTIONS - SURPRISE */}
               {selectedSurprise.status === 'Pending Approval' && canApprove('surprise') && (
                 <div className="mt-12 p-8 bg-slate-900 rounded-[2.5rem] border border-slate-700 shadow-2xl">
                   <div className="flex items-center gap-4 mb-8">
                     <div className="p-3 bg-blue-500 rounded-2xl"><ShieldCheck className="w-6 h-6 text-white" /></div>
                     <div>
                       <h3 className="text-white text-xl font-black">Audit Authorization</h3>
                       <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Verify surprise visit findings and authorize report</p>
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-8 mb-8">
                      <div className="space-y-4">
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin Incharge Sig</span>
                           <button onClick={() => sigPadAdmin.current?.clear()} className="text-[9px] font-black text-rose-500 uppercase">Clear</button>
                         </div>
                         <div className="bg-white rounded-2xl overflow-hidden h-32"><SignatureCanvas penColor='black' canvasProps={{className: 'w-full h-full'}} ref={sigPadAdmin} /></div>
                      </div>
                      <div className="space-y-4">
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Warehouse Incharge Sig</span>
                           <button onClick={() => sigPadWarehouse.current?.clear()} className="text-[9px] font-black text-rose-500 uppercase">Clear</button>
                         </div>
                         <div className="bg-white rounded-2xl overflow-hidden h-32"><SignatureCanvas penColor='black' canvasProps={{className: 'w-full h-full'}} ref={sigPadWarehouse} /></div>
                      </div>
                   </div>

                   <button onClick={handleApprove} className="w-full py-5 bg-blue-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20 mb-4">
                     Authorize & Finalize Surprise Visit Report
                   </button>

                   <div className="pt-6 border-t border-slate-700">
                     {!showDeclineForm ? (
                       <button onClick={() => setShowDeclineForm(true)} className="w-full py-4 border-2 border-rose-500/30 text-rose-500 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-rose-500/10 transition-all">
                         Decline This Report
                       </button>
                     ) : (
                       <div className="space-y-4 animate-in slide-in-from-top-4">
                         <textarea 
                           className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white text-sm" 
                           placeholder="Reason for declining..." 
                           value={declineComments}
                           onChange={(e) => setDeclineComments(e.target.value)}
                         />
                         <div className="flex gap-4">
                           <button onClick={handleDecline} className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">Confirm Decline</button>
                           <button onClick={() => setShowDeclineForm(false)} className="px-6 py-3 border border-slate-700 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
                         </div>
                       </div>
                     )}
                   </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL VIEW / SIGN - PATROLLING */}
      {selectedPatrol && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
               <div>
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Night Patrolling Log 8.1</h2>
                 <p className="text-[10px] font-bold text-slate-400 uppercase">6-Round Security Verification</p>
               </div>
               <div className="flex items-center gap-3">
                 <button onClick={() => downloadPDF(`patrol-pdf-${selectedPatrol.id}`, `Night_Patrol_${selectedPatrol.date}`)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100">
                   <Download className="w-4 h-4" /> PDF
                 </button>
                 <button onClick={() => setSelectedPatrol(null)} className="p-2.5 text-slate-400 hover:text-slate-600"><XCircle className="w-6 h-6" /></button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
               <div id={`patrol-pdf-${selectedPatrol.id}`} className="space-y-12 bg-white p-4">
                  <div className="flex justify-between items-end border-b-4 border-slate-900 pb-6 mb-8">
                     <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">WRITER</h1>
                        <p className="text-xs font-black text-[#E31E24] uppercase tracking-[0.4em]">Relocations</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Patrol Status</p>
                        <p className={`text-lg font-black uppercase ${selectedPatrol.status === 'Approved' ? 'text-emerald-500' : selectedPatrol.status === 'Declined' ? 'text-rose-500' : 'text-amber-500'}`}>{selectedPatrol.status}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-12 text-sm mb-8">
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</p>
                        <p className="font-bold text-slate-800">{selectedPatrol.date}</p>
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Location</p>
                        <p className="font-bold text-slate-800">{selectedPatrol.location}</p>
                     </div>
                  </div>

                  <div className="space-y-16">
                    {selectedPatrol.rounds.map((round) => (
                      <div key={round.id} className="space-y-4">
                        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
                           <Clock8 className="w-5 h-5 text-blue-600" />
                           <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{round.title} ({round.time_range})</h3>
                        </div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-[9px] font-black text-slate-400 uppercase border-b">
                              <th className="px-2 py-3 text-left">Cam</th>
                              <th className="px-2 py-3 text-left">Location</th>
                              <th className="px-2 py-3 text-left">Time</th>
                              <th className="px-2 py-3 text-left">Guard</th>
                              <th className="px-2 py-3 text-right">Stamp</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {round.checkpoints.map((cp, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-2 py-3 font-bold">{cp.camera_no}</td>
                                <td className="px-2 py-3 text-slate-600">{cp.location}</td>
                                <td className="px-2 py-3 font-black text-blue-600 font-mono">{cp.actual_time || '--:--'}</td>
                                <td className="px-2 py-3 text-slate-500">{cp.guard_name || 'N/A'}</td>
                                <td className="px-2 py-3 text-right text-[8px] text-slate-300 italic">{cp.timestamp || 'Not verified'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-50 p-8 rounded-[2rem] mt-12">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Unusual Observations</h4>
                     <p className="text-xs font-bold text-slate-700 italic">"{selectedPatrol.unusual_observation || 'No unusual observations recorded during rounds'}"</p>
                  </div>

                  <div className="grid grid-cols-3 gap-12 pt-12">
                     <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">Security Guard</p>
                        <p className="text-xs font-black text-slate-800">{selectedPatrol.security_guard_name}</p>
                        {selectedPatrol.security_guard_signature && <img src={selectedPatrol.security_guard_signature} className="h-16 border rounded bg-white" alt="signature" />}
                     </div>
                     <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">Admin Incharge</p>
                        <p className="text-xs font-black text-slate-800">{selectedPatrol.admin_incharge_name || '-- Pending --'}</p>
                        {selectedPatrol.admin_incharge_signature && <img src={selectedPatrol.admin_incharge_signature} className="h-16 border rounded bg-white" alt="signature" />}
                     </div>
                     <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">Warehouse Incharge</p>
                        <p className="text-xs font-black text-slate-800">{selectedPatrol.warehouse_incharge_name || '-- Pending --'}</p>
                        {selectedPatrol.warehouse_incharge_signature && <img src={selectedPatrol.warehouse_incharge_signature} className="h-16 border rounded bg-white" alt="signature" />}
                     </div>
                  </div>
               </div>

               {/* APPROVAL ACTIONS - PATROL */}
               {selectedPatrol.status === 'Pending Approval' && isOpsAdmin && (
                 <div className="mt-12 p-8 bg-slate-900 rounded-[2.5rem] border border-slate-700 shadow-2xl">
                   <div className="flex items-center gap-4 mb-8">
                     <div className="p-3 bg-blue-500 rounded-2xl"><ShieldCheck className="w-6 h-6 text-white" /></div>
                     <div>
                       <h3 className="text-white text-xl font-black">Authorized Sign-Off</h3>
                       <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Verify 6-round patrolling integrity and sign</p>
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-8 mb-8">
                      <div className="space-y-4">
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin Incharge Sig (Karthik)</span>
                           <button onClick={() => sigPadAdmin.current?.clear()} className="text-[9px] font-black text-rose-500 uppercase">Clear</button>
                         </div>
                         <div className="bg-white rounded-2xl overflow-hidden h-32"><SignatureCanvas penColor='black' canvasProps={{className: 'w-full h-full'}} ref={sigPadAdmin} /></div>
                      </div>
                      <div className="space-y-4">
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Warehouse Incharge Sig (Karthik)</span>
                           <button onClick={() => sigPadWarehouse.current?.clear()} className="text-[9px] font-black text-rose-500 uppercase">Clear</button>
                         </div>
                         <div className="bg-white rounded-2xl overflow-hidden h-32"><SignatureCanvas penColor='black' canvasProps={{className: 'w-full h-full'}} ref={sigPadWarehouse} /></div>
                      </div>
                   </div>

                   <button onClick={handleApprove} className="w-full py-5 bg-blue-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20 mb-4">
                     Authorize & Finalize Patrol Log
                   </button>

                   <div className="pt-6 border-t border-slate-700">
                     {!showDeclineForm ? (
                       <button onClick={() => setShowDeclineForm(true)} className="w-full py-4 border-2 border-rose-500/30 text-rose-500 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-rose-500/10 transition-all">
                         Decline This Patrol
                       </button>
                     ) : (
                       <div className="space-y-4 animate-in slide-in-from-top-4">
                         <textarea 
                           className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white text-sm" 
                           placeholder="Reason for declining..." 
                           value={declineComments}
                           onChange={(e) => setDeclineComments(e.target.value)}
                         />
                         <div className="flex gap-4">
                           <button onClick={handleDecline} className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">Confirm Decline</button>
                           <button onClick={() => setShowDeclineForm(false)} className="px-6 py-3 border border-slate-700 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
                         </div>
                       </div>
                     )}
                   </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
      {/* MODAL VIEW / SIGN - DAILY */}
      {selectedDaily && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
               <div>
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Daily Monitoring 10.1</h2>
                 <p className="text-[10px] font-bold text-slate-400 uppercase">Integrity Stamped Review</p>
               </div>
               <div className="flex items-center gap-3">
                 <button onClick={() => downloadPDF(`daily-pdf-${selectedDaily.id}`, `Daily_Monitoring_${selectedDaily.date}`)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100">
                   <Download className="w-4 h-4" /> PDF
                 </button>
                 <button onClick={() => setSelectedDaily(null)} className="p-2.5 text-slate-400 hover:text-slate-600"><XCircle className="w-6 h-6" /></button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
               <div id={`daily-pdf-${selectedDaily.id}`} className="space-y-12 bg-white p-4">
                  <div className="flex justify-between items-end border-b-4 border-slate-900 pb-6 mb-8">
                     <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">WRITER</h1>
                        <p className="text-xs font-black text-[#E31E24] uppercase tracking-[0.4em]">Relocations</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Report Status</p>
                        <p className={`text-lg font-black uppercase ${selectedDaily.status === 'Approved' ? 'text-emerald-500' : selectedDaily.status === 'Declined' ? 'text-rose-500' : 'text-amber-500'}`}>{selectedDaily.status}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-12 text-sm mb-8">
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date & Time</p>
                        <p className="font-bold text-slate-800">{selectedDaily.date} @ {selectedDaily.time}</p>
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Location</p>
                        <p className="font-bold text-slate-800">{selectedDaily.location}</p>
                     </div>
                  </div>

                  <div className="space-y-8">
                    {[
                      { title: "Facility Exterior", checks: [
                        { label: "Perimeter Surroundings", val: selectedDaily.perimeter_clean, ts: selectedDaily.field_timestamps?.perimeter_clean },
                        { label: "Gates & Barriers", val: selectedDaily.gates_functioning, ts: selectedDaily.field_timestamps?.gates_functioning },
                        { label: "External Lighting", val: selectedDaily.external_lighting_ok, ts: selectedDaily.field_timestamps?.external_lighting_ok },
                        { label: "Parking Organization", val: selectedDaily.parking_organized, ts: selectedDaily.field_timestamps?.parking_organized }
                      ]},
                      { title: "Interior Hygiene", checks: [
                        { label: "Operational Aisles", val: selectedDaily.aisles_clear, ts: selectedDaily.field_timestamps?.aisles_clear },
                        { label: "Floor Cleanliness", val: selectedDaily.floor_clean, ts: selectedDaily.field_timestamps?.floor_clean },
                        { label: "Waste Bins", val: selectedDaily.waste_bins_cleared, ts: selectedDaily.field_timestamps?.waste_bins_cleared },
                        { label: "Pest Sightings", val: selectedDaily.pest_control_sighting, ts: selectedDaily.field_timestamps?.pest_control_sighting }
                      ]},
                      { title: "Equipment & Tools", checks: [
                        { label: "Forklifts/MHE", val: selectedDaily.forklifts_checked, ts: selectedDaily.field_timestamps?.forklifts_checked },
                        { label: "Racking Visual", val: selectedDaily.racking_visual_inspect, ts: selectedDaily.field_timestamps?.racking_visual_inspect },
                        { label: "Charging Station", val: selectedDaily.charging_station_safe, ts: selectedDaily.field_timestamps?.charging_station_safe },
                        { label: "Scanners Operational", val: selectedDaily.scanners_operational, ts: selectedDaily.field_timestamps?.scanners_operational }
                      ]},
                      { title: "Staff & Safety", checks: [
                        { label: "Staff PPE", val: selectedDaily.staff_ppe_compliance, ts: selectedDaily.field_timestamps?.staff_ppe_compliance },
                        { label: "First Aid Kit", val: selectedDaily.first_aid_accessible, ts: selectedDaily.field_timestamps?.first_aid_accessible },
                        { label: "Emergency Exits", val: selectedDaily.emergency_exits_clear, ts: selectedDaily.field_timestamps?.emergency_exits_clear },
                        { label: "No Smoking", val: selectedDaily.no_smoking_enforced, ts: selectedDaily.field_timestamps?.no_smoking_enforced }
                      ]},
                      { title: "Operations", checks: [
                        { label: "Pallets Stacked", val: selectedDaily.pallets_stacked_safely, ts: selectedDaily.field_timestamps?.pallets_stacked_safely },
                        { label: "Hazmat Storage", val: selectedDaily.hazmat_stored_properly, ts: selectedDaily.field_timestamps?.hazmat_stored_properly },
                        { label: "Temp Monitoring", val: selectedDaily.temp_sensitive_monitored, ts: selectedDaily.field_timestamps?.temp_sensitive_monitored }
                      ]}
                    ].map((section, idx) => (
                      <div key={idx} className="bg-slate-50 p-6 rounded-2xl">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{section.title}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                           {section.checks.map(check => (
                             <div key={check.label} className="bg-white p-3 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-2 mb-1">
                                  {check.val ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-rose-500" />}
                                  <span className="text-[9px] font-bold text-slate-700">{check.label}</span>
                                </div>
                                <p className="text-[7px] text-slate-400 italic">TS: {check.ts || 'N/A'}</p>
                             </div>
                           ))}
                        </div>
                      </div>
                    ))}

                    <div className="grid grid-cols-3 gap-6 pt-12 border-t-2 border-slate-100">
                       <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">Security Guard</p>
                          <p className="text-xs font-black text-slate-800">{selectedDaily.security_guard_name}</p>
                          {selectedDaily.security_guard_signature && <img src={selectedDaily.security_guard_signature} className="h-16 border rounded bg-white" alt="signature" referrerPolicy="no-referrer" />}
                       </div>
                       <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">Admin Incharge</p>
                          <p className="text-xs font-black text-slate-800">{selectedDaily.admin_incharge_name || '-- Pending --'}</p>
                          {selectedDaily.admin_incharge_signature && <img src={selectedDaily.admin_incharge_signature} className="h-16 border rounded bg-white" alt="signature" referrerPolicy="no-referrer" />}
                       </div>
                       <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">Warehouse Incharge</p>
                          <p className="text-xs font-black text-slate-800">{selectedDaily.warehouse_incharge_name || '-- Pending --'}</p>
                          {selectedDaily.warehouse_incharge_signature && <img src={selectedDaily.warehouse_incharge_signature} className="h-16 border rounded bg-white" alt="signature" referrerPolicy="no-referrer" />}
                       </div>
                    </div>
                  </div>
               </div>

               {/* APPROVAL ACTIONS */}
               {selectedDaily.status === 'Pending Approval' && canApprove('daily') && (
                 <div className="mt-12 p-8 bg-slate-900 rounded-[2.5rem] border border-slate-700 shadow-2xl">
                   <div className="flex items-center gap-4 mb-8">
                     <div className="p-3 bg-blue-500 rounded-2xl"><ShieldCheck className="w-6 h-6 text-white" /></div>
                     <div>
                       <h3 className="text-white text-xl font-black">Digital Affirmation</h3>
                       <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Authorize Daily Monitoring Report 10.1</p>
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-8 mb-8">
                      <div className="space-y-4">
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin Incharge Sig</span>
                           <button onClick={() => sigPadAdmin.current?.clear()} className="text-[9px] font-black text-rose-500 uppercase">Clear</button>
                         </div>
                         <div className="bg-white rounded-2xl overflow-hidden h-32"><SignatureCanvas penColor='black' canvasProps={{className: 'w-full h-full'}} ref={sigPadAdmin} /></div>
                      </div>
                      <div className="space-y-4">
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Warehouse Incharge Sig</span>
                           <button onClick={() => sigPadWarehouse.current?.clear()} className="text-[9px] font-black text-rose-500 uppercase">Clear</button>
                         </div>
                         <div className="bg-white rounded-2xl overflow-hidden h-32"><SignatureCanvas penColor='black' canvasProps={{className: 'w-full h-full'}} ref={sigPadWarehouse} /></div>
                      </div>
                   </div>

                   <button onClick={handleApprove} className="w-full py-5 bg-blue-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20 mb-4">
                     Authorize & Finalize Checklist
                   </button>
                   
                   <div className="pt-6 border-t border-slate-700">
                     {!showDeclineForm ? (
                       <button onClick={() => setShowDeclineForm(true)} className="w-full py-4 border-2 border-rose-500/30 text-rose-500 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-rose-500/10 transition-all">
                         Decline This Report
                       </button>
                     ) : (
                       <div className="space-y-4 animate-in slide-in-from-top-4">
                         <textarea 
                           className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white text-sm" 
                           placeholder="Reason for declining..." 
                           value={declineComments}
                           onChange={(e) => setDeclineComments(e.target.value)}
                         />
                         <div className="flex gap-4">
                           <button onClick={handleDecline} className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">Confirm Decline</button>
                           <button onClick={() => setShowDeclineForm(false)} className="px-6 py-3 border border-slate-700 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
                         </div>
                       </div>
                     )}
                   </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
