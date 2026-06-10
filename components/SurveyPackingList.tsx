import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardCheck, Plus, Search, Calendar, MapPin, User, 
  Clock, CheckCircle2, AlertTriangle, Info, X, Save, 
  Trash2, Edit3, Camera, Upload, Check, ClipboardList, 
  Lock, Unlock, RefreshCw, Barcode, FileSpreadsheet, Archive, 
  ChevronRight, ArrowUpRight, Shield, Download, UserCheck, Eye, Sparkles
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabaseClient';
import { UserProfile, UserRole } from '../types';

// Preset lists for common room household items
const ROOM_PRESETS: Record<string, string[]> = {
  'Living Room': ['Sofa', 'TV Screen', 'Coffee Table', 'Cabinet', 'Rug', 'Lamp', 'Side Table', 'Bookshelf', 'Armchair'],
  'Bedroom': ['Bed Frame', 'Mattress', 'Wardrobe', 'Dressing Table', 'Side Table', 'Chest of Drawers', 'Mirror', 'Blanket Chest'],
  'Kitchen': ['Refrigerator', 'Microwave', 'Oven', 'Dining Set', 'Dishwasher', 'Blender', 'Kitchen Cabinet', 'Gas Stove'],
  'Dining Room': ['Dining Table', 'Dining Chairs (Set)', 'Buffet / Sideboard', 'Chandelier', 'Wine Rack', 'Display Case'],
  'Bathroom': ['Mirror', 'Bath Shelf / Rack', 'Laundry Basket', 'Storage Cabinet', 'Organizer Trolley'],
  'Storage Room': ['Ironing Board', 'Storage Box', 'Vacuum Cleaner', 'Drying Rack', 'Foldable Shelves'],
  'Garage': ['Bicycle', 'Tool Box', 'Storage Rack', 'Car Jack', 'Ladders', 'Lawn Mower'],
  'Balcony': ['Patio Chairs', 'Patio Table', 'Plant Pots', 'Sun Lounger'],
  'Office': ['Desk', 'Chair', 'Printer', 'Monitor', 'Filing Cabinet', 'Bookshelves', 'Shredder'],
  'Other': ['Luggage Bag', 'Carton Boxes (Assorted)', 'Safe Deposit Box', 'Piano', 'Wall Paintings / Frames']
};

export const ALLOWED_SURVEYORS = [
  'Ops-104',
  'Ops-201',
  'Ops-202',
  'Ops-204',
  'Ops-205',
  'ASH-001',
  'WI06172'
];

export const SUGGESTED_CBM_MAP: Record<string, number> = {
  'Sofa': 1.5,
  'TV Screen': 0.3,
  'Coffee Table': 0.4,
  'Cabinet': 1.0,
  'Rug': 0.2,
  'Lamp': 0.1,
  'Side Table': 0.2,
  'Bookshelf': 0.8,
  'Armchair': 0.6,
  'Bed Frame': 1.2,
  'Mattress': 0.9,
  'Wardrobe': 1.8,
  'Dressing Table': 0.7,
  'Chest of Drawers': 0.6,
  'Mirror': 0.15,
  'Blanket Chest': 0.4,
  'Refrigerator': 1.2,
  'Microwave': 0.1,
  'Oven': 0.5,
  'Dining Set': 1.6,
  'Dishwasher': 0.5,
  'Blender': 0.05,
  'Kitchen Cabinet': 0.9,
  'Gas Stove': 0.4,
  'Dining Table': 1.0,
  'Dining Chairs (Set)': 0.8,
  'Buffet / Sideboard': 1.1,
  'Chandelier': 0.3,
  'Wine Rack': 0.3,
  'Display Case': 1.2,
  'Bath Shelf / Rack': 0.15,
  'Laundry Basket': 0.1,
  'Storage Cabinet': 0.8,
  'Organizer Trolley': 0.15,
  'Ironing Board': 0.1,
  'Storage Box': 0.15,
  'Vacuum Cleaner': 0.15,
  'Drying Rack': 0.1,
  'Foldable Shelves': 0.25,
  'Bicycle': 0.5,
  'Tool Box': 0.1,
  'Storage Rack': 0.4,
  'Car Jack': 0.05,
  'Ladders': 0.2,
  'Lawn Mower': 0.6,
  'Patio Chairs': 0.25,
  'Patio Table': 0.5,
  'Plant Pots': 0.08,
  'Sun Lounger': 0.35,
  'Desk': 0.8,
  'Chair': 0.15,
  'Printer': 0.12,
  'Monitor': 0.08,
  'Filing Cabinet': 0.6,
  'Shredder': 0.05,
  'Luggage Bag': 0.2,
  'Carton Boxes (Assorted)': 0.12,
  'Safe Deposit Box': 0.3,
  'Piano': 2.2,
  'Wall Paintings / Frames': 0.05
};

interface SurveyItem {
  id: string;
  name: string;
  quantity: number;
  cbm?: number; // Cubic meters per unit item
  remarks: string;
  isFragile: boolean;
  specialHandling: string;
  photos: string[]; // Base64 or object URLs
  packages?: string[]; // allocated PKG-001, PKG-002, etc.
}

interface SurveyRoom {
  id: string;
  name: string;
  description: string;
  items: SurveyItem[];
  photos: string[];
}

interface DetailedSurveyPacking {
  id: string;
  clientName: string;
  surveyorName: string;
  destinationCity: string;
  destinationCountry: string;
  status: 'Pending' | 'Survey Completed' | 'Packing List Completed' | 'Delivered';
  rooms: SurveyRoom[];
  photos: string[]; // general photos
  
  // Preloaded shipper & logistics parameters
  surveyType?: string;
  enquiryNumber?: string;
  shipmentMode?: string;
  surveyTrackerStatus?: string;
  packingDate?: string;
  removalDate?: string;
  startTime?: string;
  endTime?: string;
  emailId?: string;
  
  // Client Declaration
  clientDeclarationSigned: boolean;
  clientSignatureName: string;
  clientSignatureUrl: string; // Base64 URL
  clientSignatureTimestamp: string;
  
  // 4 Post-Packing Signatures
  supervisorSignatureName?: string;
  supervisorSignatureUrl?: string; // Base64
  supervisorSignatureTimestamp?: string;
  
  originClientSignatureName?: string;
  originClientSignatureUrl?: string; // Base64
  originClientSignatureTimestamp?: string;
  
  destinationClientSignatureName?: string;
  destinationClientSignatureUrl?: string; // Base64
  destinationClientSignatureTimestamp?: string;
  
  destinationAgentSignatureName?: string;
  destinationAgentSignatureUrl?: string; // Base64
  destinationAgentSignatureTimestamp?: string;

  created_at: string;
  updated_at: string;
  created_by_id: string;
}

interface AuditLog {
  id: string;
  surveyId: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
}

interface SurveyPackingListProps {
  currentUser: UserProfile;
  preloadSurveyData?: any;
  onClearPreloadSurveyData?: () => void;
  logo?: string;
}

// Inline canvas component for reliable signature capture
interface SignaturePadProps {
  title: string;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ title, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.strokeStyle = '#0f172a'; // Slate 900
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    let clientX = 0, clientY = 0;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0, clientY = 0;
    
    if ('touches' in e) {
      if (e.cancelable) e.preventDefault();
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xl w-full max-w-md space-y-4">
        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">{title}</h4>
        
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 relative">
          <canvas
            ref={canvasRef}
            width={400}
            height={180}
            className="w-full h-[180px] touch-none cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
        
        <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-wide">
          <span>Draw inside the canvas</span>
          <button type="button" onClick={clearCanvas} className="text-[#E31E24] hover:underline">Clear Area</button>
        </div>
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 px-3 border border-slate-200 text-slate-500 rounded-xl text-[10px] font-bold uppercase transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveSignature}
            disabled={!hasDrawn}
            className={`flex-1 py-2 px-3 text-white rounded-xl text-[10px] font-black uppercase transition ${
              hasDrawn ? 'bg-slate-900 hover:bg-slate-800' : 'bg-slate-200 cursor-not-allowed text-slate-400'
            }`}
          >
            Confirm & Save
          </button>
        </div>
      </div>
    </div>
  );
};

export const SurveyPackingList: React.FC<SurveyPackingListProps> = ({ 
  currentUser,
  preloadSurveyData,
  onClearPreloadSurveyData,
  logo
}) => {
  // Simulator Role State (keeps detect user default, allows override)
  const [activeRole, setActiveRole] = useState<string>(() => {
    return currentUser.role === UserRole.ADMIN ? 'Admin' : 'Surveyor';
  });

  // Allowed Surveyor State defaults to the logged-in user's name
  const [selectedSurveyor, setSelectedSurveyor] = useState<string>(() => currentUser.name || 'Ops-104');
  
  // Custom & master list household items
  const [householdItems, setHouseholdItems] = useState<string[]>([]);
  const [dbCbmMap, setDbCbmMap] = useState<Record<string, number>>({});
  const [customWrittenSaveCheck, setCustomWrittenSaveCheck] = useState<boolean>(true);

  // States for capturing client drawn signature when in draft creation mode
  const [draftClientSignatureUrl, setDraftClientSignatureUrl] = useState<string>('');
  const [draftClientDeclarationSigned, setDraftClientDeclarationSigned] = useState<boolean>(false);

  // State arrays loaded from Supabase / localStorage
  const [records, setRecords] = useState<DetailedSurveyPacking[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const safeAlert = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 5000);
    try {
      window.alert(msg);
    } catch (e) {
      console.warn("Native alert failed, shown via Toast:", msg, e);
    }
  };

  // Currently opened / editable record
  const [activeRecord, setActiveRecord] = useState<DetailedSurveyPacking | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isEditingSurvey, setIsEditingSurvey] = useState(false);

  // Form states for Surveyor Work Flow
  const [clientName, setClientName] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [surveyPhotoFiles, setSurveyPhotoFiles] = useState<string[]>([]);

  // New preloaded/copied logistics fields
  const [surveyType, setSurveyType] = useState('Physical');
  const [enquiryNumber, setEnquiryNumber] = useState('');
  const [shipmentMode, setShipmentMode] = useState('Export');
  const [surveyTrackerStatus, setSurveyTrackerStatus] = useState('Pending');
  const [packingDate, setPackingDate] = useState('');
  const [removalDate, setRemovalDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [emailId, setEmailId] = useState('');

  // Handle preloaded Survey Tracker allocation trigger "Go survey"
  useEffect(() => {
    if (preloadSurveyData) {
      setClientName(preloadSurveyData.shipper_name || '');
      setDestinationCity(preloadSurveyData.location || '');
      setDestinationCountry('');
      
      setSurveyType(preloadSurveyData.survey_type || 'Physical');
      setEnquiryNumber(preloadSurveyData.enquiry_number || '');
      setShipmentMode(preloadSurveyData.mode || 'Export');
      setSurveyTrackerStatus(preloadSurveyData.status || 'Pending');
      setPackingDate(preloadSurveyData.survey_date || '');
      setRemovalDate(preloadSurveyData.survey_date || '');
      setStartTime(preloadSurveyData.start_time || '09:00');
      setEndTime(preloadSurveyData.end_time || '10:00');
      if (Array.isArray(preloadSurveyData.client_emails)) {
        setEmailId(preloadSurveyData.client_emails.join(', '));
      } else if (preloadSurveyData.client_emails) {
        setEmailId(preloadSurveyData.client_emails);
      } else {
        setEmailId('');
      }

      setRooms([]);
      setSurveyPhotoFiles([]);
      setDraftClientDeclarationSigned(false);
      setDraftClientSignatureUrl('');
      setIsCreatingNew(true);
      setIsEditingSurvey(true);
      setActiveRecord(null);

      if (onClearPreloadSurveyData) {
        onClearPreloadSurveyData();
      }
    }
  }, [preloadSurveyData, onClearPreloadSurveyData]);

  // Room Builder forms
  const [rooms, setRooms] = useState<SurveyRoom[]>([]);
  const [selectedPresetRoom, setSelectedPresetRoom] = useState('Living Room');
  const [roomDescription, setRoomDescription] = useState('');

  // Item builder forms
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemCbm, setItemCbm] = useState<number>(0.2);
  const [itemRemarks, setItemRemarks] = useState('');
  const [isFragile, setIsFragile] = useState(false);
  const [specialHandling, setSpecialHandling] = useState('');
  const [itemPhotos, setItemPhotos] = useState<string[]>([]);

  // Signature Pad state triggers
  const [signatureModal, setSignatureModal] = useState<{
    type: 'client-declaration' | 'supervisor' | 'origin-client' | 'destination-client' | 'destination-agent';
    title: string;
    recordId: string;
  } | null>(null);

  // Error messaging for duplicate validation
  const [duplicateValidationError, setDuplicateValidationError] = useState<string | null>(null);

  // Real Camera with local device permissions and Supabase storage uploads
  const [cameraActive, setCameraActive] = useState<{
    type: 'survey' | 'room' | 'item';
    roomId?: string;
  } | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string | null>(null);

  // Upload to Supabase bucket file or blob with fallback
  const uploadToSupabaseStorage = async (fileOrBlob: File | Blob): Promise<string> => {
    const fileExt = fileOrBlob.type.split('/')[1] || 'jpeg';
    const fileName = `survey_${Date.now()}_${Math.floor(Math.random() * 100000)}.${fileExt}`;
    const filePath = `photos/${fileName}`;

    setUploadProgressMsg("Uploading photo to storage bucket...");
    try {
      // Attempt uploading to 'survey-photos' bucket
      const { data, error } = await supabase.storage
        .from('survey-photos')
        .upload(filePath, fileOrBlob, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from('survey-photos')
        .getPublicUrl(filePath);

      setUploadProgressMsg(null);
      return publicUrlData.publicUrl;
    } catch (err: any) {
      console.warn("Supabase storage bucket upload failed, using local fallback base64. Error:", err?.message || err);
      setUploadProgressMsg("Direct upload unavailable, generating local preview...");
      
      const fileUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(fileOrBlob);
      });
      setUploadProgressMsg(null);
      return fileUrl;
    }
  };

  const handleOpenCam = async (type: 'survey' | 'room' | 'item', roomId?: string) => {
    setCameraActive({ type, roomId });
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      setCameraStream(stream);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError(
        err.name === 'NotAllowedError' 
          ? "Camera permission denied. Please allow camera and try again." 
          : `Camera failed to start: ${err.message || err}`
      );
    }
  };

  const handleCloseCam = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    setCameraStream(null);
    setCameraActive(null);
    setCameraError(null);
  };

  const handleCapturePhoto = async () => {
    if (!videoRef.current || !cameraActive) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const imageUrl = await uploadToSupabaseStorage(blob);
        
        const { type, roomId } = cameraActive;
        if (type === 'survey') {
          setSurveyPhotoFiles(prev => [...prev, imageUrl]);
        } else if (type === 'room' && roomId) {
          setRooms(prev => prev.map(r => r.id === roomId ? { ...r, photos: [...r.photos, imageUrl] } : r));
        } else if (type === 'item') {
          setItemPhotos(prev => [...prev, imageUrl]);
        }

        handleCloseCam();
      }, 'image/jpeg', 0.85);

    } catch (err) {
      console.error("Capture capture error:", err);
    }
  };

  // Dynamic Map of item name -> suggested CBM fetched from database & static presets
  const getSuggestedCbm = (name: string): number => {
    const trimmed = name.trim();
    // 1. Check database-specific mappings
    if (dbCbmMap[trimmed] !== undefined) {
      return dbCbmMap[trimmed];
    }
    const matchedDbKey = Object.keys(dbCbmMap).find(k => k.toLowerCase() === trimmed.toLowerCase());
    if (matchedDbKey) {
      return dbCbmMap[matchedDbKey];
    }
    
    // 2. Check static SUGGESTED_CBM_MAP mappings
    if (SUGGESTED_CBM_MAP[trimmed] !== undefined) {
      return SUGGESTED_CBM_MAP[trimmed];
    }
    const matchedStaticKey = Object.keys(SUGGESTED_CBM_MAP).find(k => k.toLowerCase() === trimmed.toLowerCase());
    if (matchedStaticKey) {
      return SUGGESTED_CBM_MAP[matchedStaticKey];
    }
    
    return 0.20; // Default standard fallback
  };

  // Dynamic master list of household items
  const fetchHouseholdItems = async () => {
    const defaults = Array.from(new Set(Object.values(ROOM_PRESETS).flat()));
    try {
      let fetchedRows: any[] = [];
      
      // 1. Attempt fetching both name and suggested_cbm
      let { data, error } = await supabase
        .from('master_household_items')
        .select('name, suggested_cbm')
        .order('name');
      
      if (!error && data) {
        fetchedRows = data;
      }
      
      // 2. Fall back to name-only if column is missing
      if (error) {
        console.warn("Retrying fetch with 'name'-only column as suggested_cbm might not exist yet...");
        const fallbackRes = await supabase
          .from('master_household_items')
          .select('name')
          .order('name');
        fetchedRows = fallbackRes.data || [];
        if (fallbackRes.error) throw fallbackRes.error;
      }
      
      if (fetchedRows.length > 0) {
        const fetchedNames = fetchedRows.map((d: any) => d.name);
        const merged = Array.from(new Set([...defaults, ...fetchedNames]));
        setHouseholdItems(merged.sort());

        // Map database CBM definitions
        const newDbMap: Record<string, number> = {};
        fetchedRows.forEach((d: any) => {
          if (d.name && d.suggested_cbm !== undefined && d.suggested_cbm !== null) {
            newDbMap[d.name] = parseFloat(d.suggested_cbm);
          }
        });
        setDbCbmMap(newDbMap);
      } else {
        const savedCustom = localStorage.getItem('writer_custom_household_items');
        if (savedCustom) {
          const parsed = JSON.parse(savedCustom);
          const merged = Array.from(new Set([...defaults, ...parsed]));
          setHouseholdItems(merged.sort());
        } else {
          setHouseholdItems(defaults.sort());
        }
      }
    } catch (e) {
      console.warn("Could not load from DB master_household_items, using local storage + defaults:", e);
      const savedCustom = localStorage.getItem('writer_custom_household_items');
      let parsed = [];
      if (savedCustom) {
        try { parsed = JSON.parse(savedCustom); } catch(_) {}
      }
      const merged = Array.from(new Set([...defaults, ...parsed]));
      setHouseholdItems(merged.sort());
    }
  };

  const saveNewCustomItem = async (customName: string, customCbm: number = 0.20) => {
    const trimmed = customName.trim();
    if (!trimmed) return;

    // Update local state catalog & DB mapping
    const updated = Array.from(new Set([...householdItems, trimmed])).sort();
    setHouseholdItems(updated);
    setDbCbmMap(prev => ({ ...prev, [trimmed]: customCbm }));

    // Save in local storage fallback
    try {
      const savedCustom = localStorage.getItem('writer_custom_household_items');
      let parsed: string[] = [];
      if (savedCustom) {
        try { parsed = JSON.parse(savedCustom); } catch(_) {}
      }
      parsed.push(trimmed);
      localStorage.setItem('writer_custom_household_items', JSON.stringify(Array.from(new Set(parsed))));
    } catch (err) {
      console.warn("Local storage custom save failure:", err);
    }

    // Save/Upsert to Supabase master_household_items
    try {
      const { error } = await supabase
        .from('master_household_items')
        .upsert([{ name: trimmed, suggested_cbm: customCbm } as any], { onConflict: 'name' });
      
      if (error) {
        console.warn("Supabase master_household_items upsert with suggested_cbm failed, trying name-only fallback:", error.message);
        // Fall back to name-only column
        const { error: fallbackErr } = await supabase
          .from('master_household_items')
          .upsert([{ name: trimmed } as any], { onConflict: 'name' });
        if (fallbackErr) {
          console.warn("Supabase master_household_items write fully failed:", fallbackErr.message);
        }
      } else {
        console.log("Successfully saved custom item to Supabase master list with CBM:", trimmed, customCbm);
      }
    } catch (err) {
      console.warn("Supabase save operation exception:", err);
    }
  };

  // Load baseline demo data on first-ever load
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Fetch master item catalog in parallel
      await fetchHouseholdItems();

      // 1. Fetch records from Supabase packing_lists Table
      const { data, error } = await supabase
        .from('packing_lists')
        .select('*')
        .order('created_at', { ascending: false });

      let parsedRecords: DetailedSurveyPacking[] = [];
      
      if (data && data.length > 0) {
        // Hydrate records where client contains key survey indicator, or filter
        data.forEach((row: any) => {
          if (row.data && row.data.rooms) {
            parsedRecords.push({
              id: row.id,
              clientName: row.client || row.data.clientName || 'Private Client',
              surveyorName: row.data.surveyorName || row.created_by || 'Surveyor Agent',
              destinationCity: row.data.destinationCity || 'Dubai',
              destinationCountry: row.data.destinationCountry || 'UAE',
              status: row.data.status || 'Pending',
              rooms: row.data.rooms || [],
              photos: row.data.photos || [],
              
              // Logistics parameters
              surveyType: row.data.surveyType || 'Physical',
              enquiryNumber: row.data.enquiryNumber || row.data.enq_number || '',
              shipmentMode: row.data.shipmentMode || 'Export',
              surveyTrackerStatus: row.data.surveyTrackerStatus || 'Pending',
              packingDate: row.data.packingDate || '',
              removalDate: row.data.removalDate || '',
              startTime: row.data.startTime || '09:00',
              endTime: row.data.endTime || '10:00',
              emailId: row.data.emailId || '',

              clientDeclarationSigned: !!row.data.clientDeclarationSigned,
              clientSignatureName: row.data.clientSignatureName || '',
              clientSignatureUrl: row.data.clientSignatureUrl || '',
              clientSignatureTimestamp: row.data.clientSignatureTimestamp || '',
              supervisorSignatureName: row.data.supervisorSignatureName,
              supervisorSignatureUrl: row.data.supervisorSignatureUrl,
              supervisorSignatureTimestamp: row.data.supervisorSignatureTimestamp,
              originClientSignatureName: row.data.originClientSignatureName,
              originClientSignatureUrl: row.data.originClientSignatureUrl,
              originClientSignatureTimestamp: row.data.originClientSignatureTimestamp,
              destinationClientSignatureName: row.data.destinationClientSignatureName,
              destinationClientSignatureUrl: row.data.destinationClientSignatureUrl,
              destinationClientSignatureTimestamp: row.data.destinationClientSignatureTimestamp,
              destinationAgentSignatureName: row.data.destinationAgentSignatureName,
              destinationAgentSignatureUrl: row.data.destinationAgentSignatureUrl,
              destinationAgentSignatureTimestamp: row.data.destinationAgentSignatureTimestamp,
              created_at: row.created_at || new Date().toISOString(),
              updated_at: row.updated_at || new Date().toISOString(),
              created_by_id: row.created_by || 'system'
            });
          }
        });
      }

      // 2. Fetch or load from local storage backup
      const localBackups = localStorage.getItem('writer_survey_packing_lists_v1');
      let finalRecords = [...parsedRecords];
      
      if (localBackups) {
        try {
          const parsedLocal = JSON.parse(localBackups);
          if (Array.isArray(parsedLocal)) {
            // Merge local entries not already synced to database, excluding old demo IDs
            parsedLocal.forEach(localItem => {
              if (localItem.id !== 'SRV-MOVE-90812' && localItem.id !== 'SRV-MOVE-44102') {
                if (!finalRecords.some(r => r.id === localItem.id)) {
                  finalRecords.push(localItem);
                }
              }
            });
          }
        } catch (err) {
          console.warn("Local storage parse failure:", err);
        }
      }

      setRecords(finalRecords);

      // Load audit logs
      const savedLogs = localStorage.getItem('writer_survey_packing_audit_v1');
      if (savedLogs) {
        setAuditLogs(JSON.parse(savedLogs));
      } else {
        setAuditLogs([]);
      }
    } catch (err) {
      console.error("Failed loading survey packing records:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Save survey & logs utility
  const saveAndSyncRecords = async (updatedRecords: DetailedSurveyPacking[], payloadLog?: Omit<AuditLog, 'id'>) => {
    setRecords(updatedRecords);
    localStorage.setItem('writer_survey_packing_lists_v1', JSON.stringify(updatedRecords));
    
    // Save to Supabase
    if (activeRecord) {
      try {
        const target = updatedRecords.find(r => r.id === activeRecord.id);
        if (target) {
          const { error } = await supabase
            .from('packing_lists')
            .upsert({
              id: target.id,
              client: target.clientName,
              job_no: `JOB-${target.id.split('-')[2] || 'MOVE'}`,
              data: target,
              created_by: target.surveyorName,
              updated_at: new Date().toISOString()
            });

          if (error) {
            console.warn("Supabase upsert failure, continuing with local storage:", error.message);
          }
        }
      } catch (err) {
        console.warn("Supabase integration error, saved locally:", err);
      }
    }

    if (payloadLog) {
      const newLogObj: AuditLog = {
        ...payloadLog,
        id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      };
      const newLogsList = [newLogObj, ...auditLogs];
      setAuditLogs(newLogsList);
      localStorage.setItem('writer_survey_packing_audit_v1', JSON.stringify(newLogsList));
      
      // Notify inside topbar
      if (typeof window !== 'undefined' && (window as any).addNotification) {
        (window as any).addNotification(payloadLog.action, 'info');
      }
    }
  };

  // Create survey trigger
  const handleAddNewSurvey = () => {
    setClientName('');
    setDestinationCity('');
    setDestinationCountry('');
    setRooms([]);
    setSurveyPhotoFiles([]);
    setSurveyType('Physical');
    setEnquiryNumber('');
    setShipmentMode('Export');
    setSurveyTrackerStatus('Pending');
    setPackingDate('');
    setRemovalDate('');
    setStartTime('09:00');
    setEndTime('10:00');
    setEmailId('');
    setDraftClientDeclarationSigned(false);
    setDraftClientSignatureUrl('');
    setIsCreatingNew(true);
    setIsEditingSurvey(true);
    setActiveRecord(null);
  };

  // Add Room to draft
  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPresetRoom) return;

    const newRoom: SurveyRoom = {
      id: `room-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: selectedPresetRoom,
      description: roomDescription,
      items: [],
      photos: []
    };

    setRooms(prev => [...prev, newRoom]);
    setRoomDescription('');
    
    // Auto active room
    setActiveRoomId(newRoom.id);
  };

  // Remove room
  const handleRemoveRoom = (roomId: string) => {
    setRooms(prev => prev.filter(r => r.id !== roomId));
    if (activeRoomId === roomId) {
      setActiveRoomId(null);
    }
  };

  // Add Item to a specific room
  const handleAddItemToRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedItemName = itemName.trim();
    if (!activeRoomId || !trimmedItemName) return;

    // If save box was checked, add/update catalog & Supabase CBM suggestions
    if (customWrittenSaveCheck) {
      saveNewCustomItem(trimmedItemName, itemCbm);
    }

    const newItem: SurveyItem = {
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: trimmedItemName,
      quantity: Math.max(1, itemQty),
      cbm: itemCbm,
      remarks: itemRemarks,
      isFragile: isFragile,
      specialHandling: specialHandling,
      photos: [...itemPhotos]
    };

    setRooms(prev => prev.map(room => {
      if (room.id === activeRoomId) {
        return {
          ...room,
          items: [...room.items, newItem]
        };
      }
      return room;
    }));

    // Reset fields
    setItemName('');
    setItemQty(1);
    setItemCbm(0.2);
    setItemRemarks('');
    setIsFragile(false);
    setSpecialHandling('');
    setItemPhotos([]);
  };

  // Remove item
  const handleRemoveItem = (roomId: string, itemId: string) => {
    setRooms(prev => prev.map(room => {
      if (room.id === roomId) {
        return {
          ...room,
          items: room.items.filter(it => it.id !== itemId)
        };
      }
      return room;
    }));
  };

  // Image upload triggers
  const handleUploadFile = async (type: 'survey' | 'room' | 'item', roomId?: string, e?: React.ChangeEvent<HTMLInputElement>) => {
    const file = e?.target.files?.[0];
    if (!file) return;

    try {
      const publicUrl = await uploadToSupabaseStorage(file);
      if (type === 'survey') {
        setSurveyPhotoFiles(prev => [...prev, publicUrl]);
      } else if (type === 'room' && roomId) {
        setRooms(prev => prev.map(r => r.id === roomId ? { ...r, photos: [...r.photos, publicUrl] } : r));
      } else if (type === 'item') {
        setItemPhotos(prev => [...prev, publicUrl]);
      }
    } catch (err) {
      console.error("Failed uploading image:", err);
    }
  };

  // Simulated device snap tool
  const handleSimulateCustomSnap = (type: 'survey' | 'room' | 'item', roomId?: string) => {
    // Elegant system mockup patterns
    const placeholders = [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&auto=format&fit=crop&q=80', // living
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=300&auto=format&fit=crop&q=80', // bedroom
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=300&auto=format&fit=crop&q=80', // kitchen
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=300&auto=format&fit=crop&q=80'  // office
    ];
    const assetUrl = placeholders[Math.floor(Math.random() * placeholders.length)];

    if (type === 'survey') {
      setSurveyPhotoFiles(prev => [...prev, assetUrl]);
    } else if (type === 'room' && roomId) {
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, photos: [...r.photos, assetUrl] } : r));
    } else if (type === 'item') {
      setItemPhotos(prev => [...prev, assetUrl]);
    }
  };

  // Surveyor signature save
  const triggerClientDeclarationSignature = () => {
    if (!clientName.trim()) {
      safeAlert("Please enter client's name prior to signing declaration.");
      return;
    }
    setSignatureModal({
      type: 'client-declaration',
      title: 'Client Electronic Signature & Declaration',
      recordId: 'draft'
    });
  };

  // Submit/Complete Surveyor Form
  const triggerSaveCompletedSurveyDraft = () => {
    if (!clientName.trim() || !destinationCity.trim()) {
      safeAlert("Client Details and Destination fields are required.");
      return;
    }
    if (rooms.length === 0) {
      safeAlert("Survey must contain at least one Room item lists.");
      return;
    }

    const srvId = activeRecord ? activeRecord.id : `SRV-MOVE-${Math.floor(10000 + Math.random() * 90000)}`;
    
    // Default to the draft drawn signature info if a new record is created
    let declSigned = draftClientDeclarationSigned;
    let nameSig = clientName;
    let sigUrl = draftClientSignatureUrl;
    let sigTime = draftClientSignatureUrl ? new Date().toISOString() : '';

    if (activeRecord) {
      declSigned = activeRecord.clientDeclarationSigned;
      nameSig = activeRecord.clientSignatureName;
      sigUrl = activeRecord.clientSignatureUrl;
      sigTime = activeRecord.clientSignatureTimestamp;
    }

    const payload: DetailedSurveyPacking = {
      id: srvId,
      clientName: clientName.trim(),
      surveyorName: activeRecord?.surveyorName || selectedSurveyor,
      destinationCity: destinationCity.trim(),
      destinationCountry: destinationCountry.trim(),
      status: 'Survey Completed', // When surveyor saves status = Survey Completed
      rooms: rooms,
      photos: surveyPhotoFiles,
      clientDeclarationSigned: declSigned,
      clientSignatureName: nameSig,
      clientSignatureUrl: sigUrl,
      clientSignatureTimestamp: sigTime,
      created_at: activeRecord ? activeRecord.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by_id: activeRecord ? activeRecord.created_by_id : currentUser.id,

      // Logistics parameters
      surveyType,
      enquiryNumber: enquiryNumber.trim(),
      shipmentMode,
      surveyTrackerStatus,
      packingDate,
      removalDate,
      startTime,
      endTime,
      emailId: emailId.trim()
    };

    const nextRecordsList = activeRecord 
      ? records.map(r => r.id === activeRecord.id ? payload : r)
      : [payload, ...records];

    saveAndSyncRecords(nextRecordsList, {
      surveyId: srvId,
      timestamp: new Date().toISOString(),
      user: currentUser.name,
      role: 'Surveyor',
      action: `Locked Move Survey ${srvId} and updated status to Completed. Sent notification to OPS-106.`
    });

    // Reset view
    setIsCreatingNew(false);
    setIsEditingSurvey(false);
    setActiveRecord(null);
    setDraftClientDeclarationSigned(false);
    setDraftClientSignatureUrl('');
    safeAlert(`Survey details synced successfully! Status set to "Survey Completed". Review accessible in OPS-106 Dashboard.`);
  };

  // Real-time package duplicate verification rules
  const monitorPackageCodesForDuplicates = (tempRooms: SurveyRoom[]) => {
    const counts: Record<string, number> = {};
    let duplicates: string[] = [];

    tempRooms.forEach(r => {
      r.items.forEach(it => {
        if (it.packages) {
          it.packages.forEach(pkg => {
            const raw = pkg.trim().toUpperCase();
            if (raw) {
              counts[raw] = (counts[raw] || 0) + 1;
              if (counts[raw] > 1 && !duplicates.includes(raw)) {
                duplicates.push(raw);
              }
            }
          });
        }
      });
    });

    if (duplicates.length > 0) {
      setDuplicateValidationError(`Duplicate package number detected: "${duplicates.join(', ')}". Please use a unique package number.`);
      return false;
    } else {
      setDuplicateValidationError(null);
      return true;
    }
  };

  // Package Allocator: auto-generate strings
  const handleAutoPackageAllocate = (roomId: string, itemId: string, qtyNeeded: number) => {
    // Generate pkg numbers sequentially PKG-XXX
    // Let's count existing allocated packages to generate sequentially beautifully
    let startInt = 1;
    rooms.forEach(r => {
      r.items.forEach(it => {
        if (it.packages) {
          it.packages.forEach(p => {
            const match = p.match(/PKG-(\d+)/i);
            if (match) {
              const num = parseInt(match[1]);
              if (num >= startInt) startInt = num + 1;
            }
          });
        }
      });
    });

    const list: string[] = [];
    for (let idx = 0; idx < qtyNeeded; idx++) {
      const str = `PKG-${String(startInt + idx).padStart(3, '0')}`;
      list.push(str);
    }

    const updatedRooms = rooms.map(rc => {
      if (rc.id === roomId) {
        return {
          ...rc,
          items: rc.items.map(item => {
            if (item.id === itemId) {
              return { ...item, packages: list };
            }
            return item;
          })
        };
      }
      return rc;
    });

    setRooms(updatedRooms);
    monitorPackageCodesForDuplicates(updatedRooms);
  };

  // Manual package number updates
  const handleManualPackageNoUpdate = (roomId: string, itemId: string, pkgIndex: number, newValue: string) => {
    const updatedRooms = rooms.map(rc => {
      if (rc.id === roomId) {
        return {
          ...rc,
          items: rc.items.map(item => {
            if (item.id === itemId && item.packages) {
              const copy = [...item.packages];
              copy[pkgIndex] = newValue.trim().toUpperCase();
              return { ...item, packages: copy };
            }
            return item;
          })
        };
      }
      return rc;
    });

    setRooms(updatedRooms);
    monitorPackageCodesForDuplicates(updatedRooms);
  };

  // Validate duplicate and confirm packing list
  const handleCompleteOPSAllocation = () => {
    if (!activeRecord) return;
    
    // Perform real-time cross checks first
    const clean = monitorPackageCodesForDuplicates(rooms);
    if (!clean) {
      safeAlert("Save Blocked: Duplicate package numbers exist inside your active inventory list.");
      return;
    }

    // Verify all items have packages allocated
    let missingPackages = false;
    rooms.forEach(r => {
      r.items.forEach(it => {
        if (!it.packages || it.packages.length === 0) {
          missingPackages = true;
        }
      });
    });

    if (missingPackages) {
      safeAlert("Alert: Some inventory items do not have packages allocated. Finalizing the manifest anyway.");
    }

    const payload: DetailedSurveyPacking = {
      ...activeRecord,
      status: 'Packing List Completed', // Update status to Packing List Completed
      rooms: rooms,
      updated_at: new Date().toISOString()
    };

    const nextRecordsList = records.map(r => r.id === activeRecord.id ? payload : r);
    
    saveAndSyncRecords(nextRecordsList, {
      surveyId: activeRecord.id,
      timestamp: new Date().toISOString(),
      user: currentUser.name,
      role: 'OPS-106',
      action: `Finalized Package Allocation for ${activeRecord.id}. Updated status to Packing List Completed.`
    });

    setActiveRecord(null);
    setIsEditingSurvey(false);
    safeAlert("Packing List status finalized! Status set to 'Packing List Completed'. Ready for four-way verification signatures.");
  };

  // Electronic signatures pad handlers
  const handleOpenSignaturePad = (type: typeof signatureModal extends { type: infer T } ? T : any, title: string, id: string) => {
    setSignatureModal({ type, title, recordId: id });
  };

  const handleApplySignaturePadValue = (base64Data: string) => {
    if (!signatureModal) return;
    
    const dateStamp = new Date().toISOString();

    if (signatureModal.recordId === 'draft') {
      if (signatureModal.type === 'client-declaration') {
        setDraftClientDeclarationSigned(true);
        setDraftClientSignatureUrl(base64Data);
        safeAlert("Drawn Client Signature captured and approved successfully!");
      }
      setSignatureModal(null);
      return;
    }

    if (!activeRecord) return;
    
    let payload = { ...activeRecord };

    if (signatureModal.type === 'client-declaration') {
      payload.clientDeclarationSigned = true;
      payload.clientSignatureName = clientName || activeRecord.clientName;
      payload.clientSignatureUrl = base64Data;
      payload.clientSignatureTimestamp = dateStamp;
      
      // Update local states
      setClientName(payload.clientSignatureName);
    } else if (signatureModal.type === 'supervisor') {
      payload.supervisorSignatureName = currentUser.name;
      payload.supervisorSignatureUrl = base64Data;
      payload.supervisorSignatureTimestamp = dateStamp;
    } else if (signatureModal.type === 'origin-client') {
      payload.originClientSignatureName = activeRecord.clientName;
      payload.originClientSignatureUrl = base64Data;
      payload.originClientSignatureTimestamp = dateStamp;
    } else if (signatureModal.type === 'destination-client') {
      payload.destinationClientSignatureName = activeRecord.clientName;
      payload.destinationClientSignatureUrl = base64Data;
      payload.destinationClientSignatureTimestamp = dateStamp;
      
      // If destination client signs, the move is completed successfully!
      payload.status = 'Delivered';
    } else if (signatureModal.type === 'destination-agent') {
      payload.destinationAgentSignatureName = 'Destination Agent Agent';
      payload.destinationAgentSignatureUrl = base64Data;
      payload.destinationAgentSignatureTimestamp = dateStamp;
    }

    const nextRecordsList = records.map(r => r.id === activeRecord.id ? payload : r);
    
    saveAndSyncRecords(nextRecordsList, {
      surveyId: activeRecord.id,
      timestamp: dateStamp,
      user: currentUser.name,
      role: activeRole,
      action: `Applied Digital Signature (${signatureModal.type}) to Shipment ${activeRecord.id}.`
    });

    setActiveRecord(payload);
    setSignatureModal(null);
    safeAlert("Electronic signature stamp appended beautifully with UTC timeline.");
  };

  // Reopen locked survey rule
  const handleReopenSurvey = (survey: DetailedSurveyPacking) => {
    if (activeRole !== 'Admin' && activeRole !== 'Supervisor') {
      safeAlert("Unauthorized: Only authorized Supervisors or Administrators can unlock completed surveys.");
      return;
    }

    const payload: DetailedSurveyPacking = {
      ...survey,
      status: 'Pending', // back to pending surveyor state
      updated_at: new Date().toISOString()
    };

    const nextRecordsList = records.map(r => r.id === survey.id ? payload : r);
    saveAndSyncRecords(nextRecordsList, {
      surveyId: survey.id,
      timestamp: new Date().toISOString(),
      user: currentUser.name,
      role: activeRole,
      action: `Unlocked record ${survey.id} and set status to Pending for modification.`
    });

    safeAlert(`Shipment ${survey.id} unlocked successfully! Surveyor can now edit items and details.`);
  };

  // Export PDF Manifest matching user's Premium requirements
  const runExportPDFManifest = (item: DetailedSurveyPacking) => {
    // Standard A4 page: 210 x 297 mm
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Helper colors - Luxury Slate & Charcoal Theme (NO Red!)
    const companyColor = [30, 41, 59];       // Slate 800 (Clean core tone)
    const darkSlateColor = [15, 23, 42];     // Slate 900 (Deep contrast tone)
    const lightSlateColor = [248, 250, 252]; // Slate 50 (Very soft bg card)
    const borderColor = [226, 232, 240];    // Slate 200 (Clean border lines)
    const textColor = [71, 85, 105];         // Slate 600 (Softer body typography)

    // Header drawing function with exact 1-inch left & right margins (25.4mm)
    const drawPageHeader = () => {
      // Top elegant accent line
      doc.setFillColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
      doc.rect(0, 0, 210, 4, 'F');
      
      // Handle Company Logo
      if (logo) {
        try {
          const imgProps = doc.getImageProperties(logo);
          const limitHeight = 11; // 11mm is extremely elegant and clean
          const limitWidth = (imgProps.width * limitHeight) / imgProps.height;
          // Render logo inside 1-inch left margin beautifully
          doc.addImage(logo, 'PNG', 25.4, 8, limitWidth, limitHeight);
        } catch (e) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
          doc.text("WRITER RELOCATIONS", 25.4, 15);
        }
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
        doc.text("WRITER RELOCATIONS", 25.4, 15);
      }

      // Premium Header labels on the right margin (184.6mm)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("PREMIUM PACKING LIST & MOVE MANIFEST", 184.6, 15, { align: 'right' });

      // Clean slim line separating header from page content (25.4 to 184.6)
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.3);
      doc.line(25.4, 23, 184.6, 23);

      // Reset default color
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    };

    // Footer drawing function with updated GCC brand text & consistent 1-inch bottom margin
    const drawPageFooter = (pageNo: number, totalPages: number) => {
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.3);
      doc.line(25.4, 271.6, 184.6, 271.6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("Writer Relocations GCC", 25.4, 277);
      doc.text(`Page ${pageNo} of ${totalPages}`, 184.6, 277, { align: 'right' });
    };

    // Aggregate values
    const itemsCount = item.rooms.reduce((sum, r) => sum + r.items.length, 0);
    const packagesCount = item.rooms.reduce((sum, r) => 
      sum + r.items.reduce((pSum, it) => pSum + (it.packages?.length || 0), 0)
    , 0);
    const totalCbm = item.rooms.reduce((sum, r) => 
      sum + r.items.reduce((pSum, it) => pSum + (it.quantity * (it.cbm !== undefined ? it.cbm : 0.2)), 0)
    , 0);

    // Initial page header setup
    drawPageHeader();

    // --- MAIN TITLE BLOCK ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
    doc.text("Relocation Inventory Manifest", 25.4, 33);
    
    // Balanced deep-slate underline
    doc.setDrawColor(companyColor[0], companyColor[1], companyColor[2]);
    doc.setLineWidth(0.6);
    doc.line(25.4, 36, 100, 36);

    // File ID & Timestamp with balanced fonts & aligned right to 184.6mm
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(companyColor[0], companyColor[1], companyColor[2]);
    doc.text(`SURVEY FILE ID: ${item.id}`, 184.6, 33, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${new Date().toISOString().slice(0, 10)}`, 184.6, 37, { align: 'right' });

    // --- METRICS GRID CARD (exact 159.2mm width starting at 25.4mm) ---
    doc.setFillColor(lightSlateColor[0], lightSlateColor[1], lightSlateColor[2]);
    doc.roundedRect(25.4, 43, 159.2, 48, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
    doc.text("CLIENT & SHIPMENT IDENTIFIERS", 30.4, 49);
    doc.text("LOGISTICS PARAMETERS", 115, 49);

    // Divider boundaries inside card
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.line(30.4, 51, 100, 51);
    doc.line(115, 51, 179.2, 51);

    // Parameterized line-by-line printer with auto truncation and wrapping safeguards
    const printRow = (label: string, value: string | undefined, xLabel: number, xValue: number, y: number, maxChars: number) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(label, xLabel, y);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
      const cleanValue = value ? String(value).trim() : 'N/A';
      const truncated = cleanValue.length > maxChars ? cleanValue.slice(0, maxChars - 3) + '...' : cleanValue;
      doc.text(truncated, xValue, y);
    };

    // Details Grid Layout - Columns
    printRow("Client Name:", item.clientName, 30.4, 63, 56, 28);
    printRow("Destination City:", item.destinationCity, 30.4, 63, 61, 28);
    printRow("Country:", item.destinationCountry, 30.4, 63, 66, 28);
    printRow("Email Address:", item.emailId, 30.4, 63, 71, 28);
    printRow("Current Status:", item.status, 30.4, 63, 76, 28);

    printRow("Enquiry Number:", item.enquiryNumber, 115, 145, 56, 25);
    printRow("Shipment Mode:", item.shipmentMode, 115, 145, 61, 25);
    printRow("Survey Type:", item.surveyType, 115, 145, 66, 25);
    printRow("Packing Date:", item.packingDate, 115, 145, 71, 25);
    printRow("Schedule Window:", item.startTime ? `${item.startTime} - ${item.endTime}` : 'N/A', 115, 145, 76, 25);
    printRow("Surveyor Agent:", item.surveyorName, 115, 145, 81, 25);

    // --- QUICK METRIC BENTO BOXES (Precisely aligned to 159.2mm print area) ---
    const boxWidth = 49.7;
    const gap = 5;

    // Total rooms
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.roundedRect(25.4, 96, boxWidth, 16, 1.2, 1.2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("TOTAL ROOMS", 25.4 + 3, 101);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
    doc.text(String(item.rooms.length), 25.4 + 3, 108);

    // Total Packages bound
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(25.4 + boxWidth + gap, 96, boxWidth, 16, 1.2, 1.2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("PACKAGES BOUND", 25.4 + boxWidth + gap + 3, 101);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]); // CLEAN SLATE
    doc.text(String(packagesCount), 25.4 + boxWidth + gap + 3, 108);

    // Total Volume
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(25.4 + (boxWidth + gap) * 2, 96, boxWidth, 16, 1.2, 1.2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("ESTIMATED VOLUME", 25.4 + (boxWidth + gap) * 2 + 3, 101);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
    doc.text(`${totalCbm.toFixed(2)} m³`, 25.4 + (boxWidth + gap) * 2 + 3, 108);

    // --- PACKING ITEMS TABLE ---
    const tableHeaders = [['Room Name', 'Item Description', 'Qty', 'Fragile', 'Special Handling / Remarks', 'Allocated Packages']];
    const tableBody: any[] = [];

    item.rooms.forEach(r => {
      r.items.forEach(it => {
        const pkgs = (it.packages && it.packages.length > 0) ? it.packages.join(', ') : 'Pending allocation';
        const notes = [
          it.specialHandling ? `Special: ${it.specialHandling}` : '',
          it.remarks ? `Remarks: ${it.remarks}` : ''
        ].filter(Boolean).join(' | ');
        
        tableBody.push([
          r.name,
          it.name,
          it.quantity,
          it.isFragile ? 'YES' : 'NO',
          notes || 'None',
          pkgs
        ]);
      });
    });

    autoTable(doc, {
      head: tableHeaders,
      body: tableBody,
      startY: 118,
      margin: { left: 25.4, right: 25.4 },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        valign: 'middle',
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [15, 23, 42], // Slate-900 theme
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 28, fontStyle: 'bold' },
        1: { cellWidth: 32 },
        2: { cellWidth: 10, halign: 'center' },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 42 },
        5: { cellWidth: 32.2, fontStyle: 'bold' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    // --- SIGNATURES FLOOR ---
    const finalTableY = (doc as any).lastAutoTable?.finalY || 120;
    
    // Check if vertical content requires a dedicated page to prevent crowding or footer overlap
    if (finalTableY > 140) {
      doc.addPage();
      drawPageHeader();
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
      doc.text("Official Client Acknowledgements & Signatures", 25.4, 34);
      doc.setDrawColor(companyColor[0], companyColor[1], companyColor[2]);
      doc.setLineWidth(0.6);
      doc.line(25.4, 37, 100, 37);
      
      renderSignatureCards(doc, item, 43);
    } else {
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.4);
      doc.line(25.4, finalTableY + 8, 184.6, finalTableY + 8);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(darkSlateColor[0], darkSlateColor[1], darkSlateColor[2]);
      doc.text("Participant Acknowledgements & Affirmations", 25.4, finalTableY + 15);
      
      renderSignatureCards(doc, item, finalTableY + 22);
    }

    // Dynamic pagination tagging
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawPageFooter(i, totalPages);
    }

    // Trigger local download
    doc.save(`WRITER-Premium-Move-Manifest-${item.clientName.replace(/\s+/g, '_')}-${item.id}.pdf`);
  };

  const renderSignatureCards = (doc: jsPDF, item: DetailedSurveyPacking, startY: number) => {
    // Elegant stamp drawer matching 1-inch margins
    const drawStampBox = (x: number, y: number, title: string, name: string, date: string, signatureBase64?: string) => {
      const cardWidth = 74.6;
      const cardHeight = 34;

      // Container Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240); // Slate-200 border
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');

      // Title SubHeader Bar (Premium Slate-900 look)
      doc.setFillColor(15, 23, 42); 
      doc.roundedRect(x, y, cardWidth, 5.5, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text(title.toUpperCase(), x + 3.5, y + 4);

      // Label fields
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("Signatory Name:", x + 4, y + 10.5);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      
      // Auto-wrap/split long signatory names to prevent overrunning on subsequent lines
      const cleanName = name || 'Pending Handover';
      const nameLines = doc.splitTextToSize(cleanName, 34);
      doc.text(nameLines[0] || '', x + 4, y + 13.5);
      if (nameLines[1]) {
        doc.text(nameLines[1], x + 4, y + 16.5);
      }

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("UTCTimestamp Code:", x + 4, y + 21);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);

      // Auto-wrap/split timestamp as well to match beautifully
      const displayDate = date ? date.slice(0, 19).replace('T', ' ') : 'Pending Stamp';
      const dateLines = doc.splitTextToSize(displayDate, 34);
      doc.text(dateLines[0] || '', x + 4, y + 24);
      if (dateLines[1]) {
        doc.text(dateLines[1], x + 4, y + 27);
      }

      // Embedded Canvas Drawing Box
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x + 40.5, y + 8, 30, 22, 1, 1, 'FD');

      if (signatureBase64 && signatureBase64.length > 25) {
        try {
          doc.addImage(signatureBase64, 'PNG', x + 41, y + 9, 29, 20);
        } catch (e) {
          doc.setFont('helvetica', 'oblique');
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.text("Digital Sign Approved", x + 42, y + 20);
        }
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(203, 213, 225); // Slate-300
        doc.text("UNAVAILABLE", x + 46, y + 20);
      }
    };

    // Card 1: Client Confirmation
    drawStampBox(25.4, startY, "1. Client Survey Confirmation", item.clientSignatureName || item.clientName, item.clientSignatureTimestamp, item.clientSignatureUrl);
    // Card 2: Operations Approve Stamp (Aligned perfectly to the 184.6mm right boundary)
    drawStampBox(110, startY, "2. Supervisor Approve Lock", item.supervisorSignatureName || "Operations Manager Staff", item.supervisorSignatureTimestamp || '', item.supervisorSignatureUrl);

    // Card 3: Client Origin Packed Deliver
    drawStampBox(25.4, startY + 39, "3. Origin Handover Client Sign", item.originClientSignatureName || "Origin Deliver Agent", item.originClientSignatureTimestamp || '', item.originClientSignatureUrl);
    // Card 4: Recipient Receipt Sign
    drawStampBox(110, startY + 39, "4. Delivery Destination Client Receipt", item.destinationClientSignatureName || "Destination Assignee Customer", item.destinationClientSignatureTimestamp || '', item.destinationClientSignatureUrl);

    // Card 5: Destination Handover Agent
    drawStampBox(25.4, startY + 78, "5. Handover Destination Agent Courier", item.destinationAgentSignatureName || "Staff Relocations Agent", item.destinationAgentSignatureTimestamp || '', item.destinationAgentSignatureUrl);
  };

  // Export spreadsheet matching user's Excel requirements
  const runExportExcelManifest = (item: DetailedSurveyPacking) => {
    let csvContent = "\uFEFF"; // Unicode BOM for excel
    
    // CSV Header row
    csvContent += "Move Inventory Manifest & Packing List\n";
    csvContent += `Survey ID,${item.id}\n`;
    csvContent += `Client Name,${item.clientName}\n`;
    csvContent += `Surveyor Name,${item.surveyorName}\n`;
    csvContent += `Destination,${item.destinationCity} (${item.destinationCountry})\n`;
    csvContent += `Status,${item.status}\n`;
    csvContent += `Created Date,${item.created_at}\n\n`;
    
    csvContent += "Room,Item Name,Quantity,Fragile,Special Handling,Remarks,Allocated Packages\n";

    item.rooms.forEach(r => {
      r.items.forEach(it => {
        const pkgs = it.packages ? it.packages.join(' | ') : 'N/A';
        csvContent += `"${r.name}","${it.name}",${it.quantity},${it.isFragile ? 'YES' : 'NO'},"${it.specialHandling.replace(/"/g, '""') || 'None'}","${it.remarks.replace(/"/g, '""') || 'None'}","${pkgs}"\n`;
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `WRITER-Relocations-${item.clientName.replace(/\s+/g, '_')}-PackingList.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filters application
  const filteredRecords = records.filter(rec => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = 
      rec.clientName.toLowerCase().includes(term) ||
      rec.id.toLowerCase().includes(term) ||
      rec.destinationCity.toLowerCase().includes(term) ||
      rec.destinationCountry.toLowerCase().includes(term) ||
      rec.surveyorName.toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'All' || rec.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // KPI calculations
  const totalSurveys = records.length;
  const pendingSurveys = records.filter(r => r.status === 'Pending').length;
  const completedPackingLists = records.filter(r => r.status === 'Packing List Completed' || r.status === 'Delivered').length;
  const pendingSignatures = records.filter(r => {
    if (r.status !== 'Packing List Completed') return false;
    // Check if any of supervisor or client/origin is missing
    return !(r.supervisorSignatureUrl && r.originClientSignatureUrl);
  }).length;
  const deliveredShipments = records.filter(r => r.status === 'Delivered').length;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8 space-y-6">
      
      {/* Simulation / Testing Header Hub */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-5 md:p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-rose-500/90 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-2 inline-block">
            M&R Relocation Suite
          </span>
          <h2 className="text-xl md:text-2xl font-black tracking-tight leading-none mb-1">
            Survey / Packing List Module
          </h2>
          <p className="text-slate-300 text-[11px] font-medium leading-relaxed max-w-xl">
            Streamlined system mapping Move Surveyors, OPS-106 pack managers, physical signatures, and automatic package allocators.
          </p>
        </div>

        {/* Dynamic simulator switches */}
        <div className="bg-slate-800/80 border border-slate-700/60 p-3 rounded-2xl shrink-0 w-full md:w-auto">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-rose-500" /> Simulate Testing Role:
          </p>
          <div className="grid grid-cols-4 gap-1 sm:flex">
            {['Surveyor', 'OPS-106', 'Supervisor', 'Admin'].map(role => (
              <button
                key={role}
                onClick={() => {
                  setActiveRole(role);
                  setActiveRecord(null);
                  setIsCreatingNew(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeRole === role 
                    ? 'bg-white text-slate-900 shadow-md font-extrabold' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          {activeRole === 'Surveyor' && (
            <div className="mt-2.5 flex items-center justify-between gap-1.5 animate-fade-in bg-slate-900/40 p-1.5 rounded-lg border border-slate-700/50">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-300">Acting Surveyor:</span>
              <span className="text-[10px] font-black text-rose-400 bg-rose-950/40 border border-rose-900/40 px-2.5 py-1 rounded">
                {currentUser.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* KPI METRIC CARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 md:gap-4.5">
        <div className="bg-white rounded-2xl border border-slate-100 p-4.5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">Total Surveys</p>
            <p className="text-lg font-black text-slate-900 leading-none">{totalSurveys}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4.5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">Pending Surveys</p>
            <p className="text-lg font-black text-amber-700 leading-none">{pendingSurveys}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4.5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">Completed Packing</p>
            <p className="text-lg font-black text-emerald-800 leading-none">{completedPackingLists}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4.5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">Pending Signatures</p>
            <p className="text-lg font-black text-orange-700 leading-none">{pendingSignatures}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4.5 shadow-sm flex items-center gap-3 col-span-2 lg:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">Delivered Goods</p>
            <p className="text-lg font-black text-indigo-800 leading-none">{deliveredShipments}</p>
          </div>
        </div>
      </div>

      {/* PRIMARY WORKSPACE: VIEW ROUTING */}
      {!activeRecord && !isCreatingNew ? (
        // DASHBOARD DIRECTORY LISTING
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5 mb-5">
              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Submitted Survey File</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Search relative customer move surveys and ongoing allocation sheets.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <div className="relative flex-1 sm:flex-initial min-w-[200px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search client, city, ID..."
                    className="w-full text-xs font-semibold pl-10 pr-4 py-2 border rounded-xl bg-slate-50 outline-none focus:ring-1 focus:ring-slate-400"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs font-black uppercase tracking-wide border py-2 px-3 bg-white rounded-xl outline-none text-slate-700 focus:ring-1 focus:ring-slate-400 shadow-sm"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending Surveyor</option>
                  <option value="Survey Completed">Survey Completed</option>
                  <option value="Packing List Completed">Packing Completed</option>
                  <option value="Delivered">Delivered</option>
                </select>

                {(activeRole === 'Surveyor' || activeRole === 'Admin') && (
                  <button
                    onClick={handleAddNewSurvey}
                    className="py-2.5 px-4 bg-[#E31E24] hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Create survey
                  </button>
                )}
              </div>
            </div>

            {/* Records List Table / Cards */}
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Loading moving surveys files...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs font-medium border border-dashed rounded-2xl">
                No active survey and packing lists matched search criteria.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRecords.map(item => {
                  const itemsCount = item.rooms.reduce((sum, r) => sum + r.items.length, 0);
                  const packagesCount = item.rooms.reduce((sum, r) => 
                    sum + r.items.reduce((pSum, it) => pSum + (it.packages?.length || 0), 0)
                  , 0);

                  return (
                    <div 
                      key={item.id}
                      className="p-5 rounded-2xl border border-slate-100 hover:border-slate-200 bg-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all"
                    >
                      <div className="space-y-1.5 max-w-xl">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-[10px] font-black font-mono text-slate-450 bg-slate-100 px-2 py-0.5 rounded">
                            {item.id}
                          </span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                            item.status === 'Pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            item.status === 'Survey Completed' ? 'bg-sky-100 text-sky-800 border border-sky-200' :
                            item.status === 'Packing List Completed' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                            'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {item.status} ({item.status === 'Pending' ? 'Surveyor Assign' : item.status === 'Survey Completed' ? 'OPS allocation pending' : item.status === 'Packing List Completed' ? 'Pending Signatures' : 'Delivery Handed Over'})
                          </span>
                        </div>

                        <h5 className="font-extrabold text-slate-900 text-sm">{item.clientName}</h5>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500 font-semibold font-mono">
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> Destination: <strong className="text-slate-700">{item.destinationCity}, {item.destinationCountry}</strong></span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" /> Surveyor Assigned: <span className="text-slate-650">{item.surveyorName}</span></span>
                        </div>

                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold bg-slate-50 p-2.5 rounded-xl border border-slate-100/60 max-w-md">
                          <div>Rooms Count: <strong className="text-slate-700">{item.rooms.length}</strong></div>
                          <span>|</span>
                          <div>Inventory Items: <strong className="text-slate-700">{itemsCount} units</strong></div>
                          <span>|</span>
                          <div>Packages Bound: <strong className="text-[#E31E24]">{packagesCount || 'Pending OPS'}</strong></div>
                        </div>
                      </div>

                      {/* Action trigger columns */}
                      <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap justify-end">
                        <button
                          onClick={() => runExportExcelManifest(item)}
                          className="px-3.5 py-2 hover:bg-emerald-50 text-emerald-800 border border-emerald-200 hover:border-emerald-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 shadow-sm"
                          title="Download Packing Excel Report"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel
                        </button>
                        <button
                          onClick={() => runExportPDFManifest(item)}
                          className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 hover:border-rose-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 shadow-sm"
                          title="Download Packing PDF Report"
                        >
                          <Download className="w-3.5 h-3.5 text-rose-600" /> PDF Report
                        </button>                         {/* View or edit depending on role context */}
                        <button
                          onClick={() => {
                            setActiveRecord(item);
                            setRooms(item.rooms);
                            setClientName(item.clientName);
                            setDestinationCity(item.destinationCity);
                            setDestinationCountry(item.destinationCountry);
                            setSurveyPhotoFiles(item.photos);
                            
                            // Hydrate logistics parameter fields
                            setSurveyType(item.surveyType || 'Physical');
                            setEnquiryNumber(item.enquiryNumber || '');
                            setShipmentMode(item.shipmentMode || 'Export');
                            setSurveyTrackerStatus(item.surveyTrackerStatus || 'Pending');
                            setPackingDate(item.packingDate || '');
                            setRemovalDate(item.removalDate || '');
                            setStartTime(item.startTime || '09:00');
                            setEndTime(item.endTime || '10:00');
                            setEmailId(item.emailId || '');

                            setIsEditingSurvey(false);
                            setDuplicateValidationError(null);
                          }}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Record
                        </button>

                        {/* Surveyor action edit */}
                        {item.status === 'Pending' && activeRole === 'Surveyor' && (
                          <button
                            onClick={() => {
                              setActiveRecord(item);
                              setRooms(item.rooms);
                              setClientName(item.clientName);
                              setDestinationCity(item.destinationCity);
                              setDestinationCountry(item.destinationCountry);
                              setSurveyPhotoFiles(item.photos);

                              // Hydrate logistics parameter fields
                              setSurveyType(item.surveyType || 'Physical');
                              setEnquiryNumber(item.enquiryNumber || '');
                              setShipmentMode(item.shipmentMode || 'Export');
                              setSurveyTrackerStatus(item.surveyTrackerStatus || 'Pending');
                              setPackingDate(item.packingDate || '');
                              setRemovalDate(item.removalDate || '');
                              setStartTime(item.startTime || '09:00');
                              setEndTime(item.endTime || '10:00');
                              setEmailId(item.emailId || '');

                              setIsEditingSurvey(true);
                              setIsCreatingNew(false);
                              setDuplicateValidationError(null);
                            }}
                            className="px-4 py-2 bg-[#E31E24] hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
                          >
                            Edit items
                          </button>
                        )}

                        {/* OPS manager packaging allocation trigger */}
                        {item.status === 'Survey Completed' && activeRole === 'OPS-106' && (
                          <button
                            onClick={() => {
                              setActiveRecord(item);
                              // Auto-populate packages based on inventory qty to prevent uninitialized empty lists
                              const initializedRooms = (item.rooms || []).map(r => ({
                                ...r,
                                items: (r.items || []).map(it => {
                                  if (!it.packages || it.packages.length === 0) {
                                    const qty = it.quantity || 1;
                                    const list: string[] = [];
                                    for (let idx = 0; idx < qty; idx++) {
                                      list.push(`PKG-${String(idx + 1).padStart(3, '0')}`);
                                    }
                                    return { ...it, packages: list };
                                  }
                                  return it;
                                })
                              }));
                              setRooms(initializedRooms);
                              setIsEditingSurvey(false);
                              setDuplicateValidationError(null);
                            }}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1"
                          >
                            <Barcode className="w-3.5 h-3.5" /> Allocate Packing
                          </button>
                        )}

                        {/* Reopen Action for authorized Admin/Supervisor */}
                        {(item.status === 'Survey Completed' || item.status === 'Packing List Completed') && (activeRole === 'Supervisor' || activeRole === 'Admin') && (
                          <button
                            onClick={() => handleReopenSurvey(item)}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1"
                            title="Reopen for Surveyor modification"
                          >
                            <Unlock className="w-3.5 h-3.5" /> Reopen
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Audit Logs Trail Tracker Panel */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-1.5"><Shield className="w-4 h-4 text-[#E31E24]" /> M&R Relocation Audit Trail Trail</h4>
            <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
              {auditLogs.map(log => (
                <div key={log.id} className="text-[10px] p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-600 flex justify-between gap-4 font-mono">
                  <span className="font-bold">{log.timestamp.split('T')[0] || log.timestamp} - <strong className="text-indigo-600">[{log.role}]</strong> {log.action}</span>
                  <span className="text-slate-400 shrink-0 font-bold">{log.user}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : isEditingSurvey ? (
        // SURVEYOR ACTIVE CREATOR / EDITING COMPONENT
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
              {activeRecord ? `Edit Move Survey: ${activeRecord.id}` : "Step 1: Create Relocation Survey Form"}
            </h3>
            <button
              onClick={() => {
                setIsCreatingNew(false);
                setIsEditingSurvey(false);
                setActiveRecord(null);
              }}
              className="text-xs font-bold uppercase text-slate-500 hover:text-slate-800 px-3 py-1.5 bg-slate-100 rounded-lg"
            >
              Back to List
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* GENERAL SURVEY INFO & ROOM ADDER */}
            <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4 h-fit">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#E31E24] border-b pb-2 mb-2">Customer & Destination</h4>
              
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Client Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Al-Maktoum"
                  className="w-full text-xs font-bold border rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 bg-slate-50"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Assigned Surveyor</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  className="w-full text-xs font-black border rounded-lg p-2.5 outline-none text-slate-500 bg-slate-100 select-none cursor-not-allowed border-slate-200"
                  value={activeRecord ? activeRecord.surveyorName : currentUser.name}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Dest. City *</label>
                  <input
                    type="text"
                    placeholder="e.g. London"
                    className="w-full text-xs font-semibold border rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-slate-400 text-slate-805 bg-slate-50"
                    value={destinationCity}
                    onChange={(e) => setDestinationCity(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Dest. Country *</label>
                  <input
                    type="text"
                    placeholder="e.g. United Kingdom"
                    className="w-full text-xs font-semibold border rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-slate-400 text-slate-805 bg-slate-50"
                    value={destinationCountry}
                    onChange={(e) => setDestinationCountry(e.target.value)}
                  />
                </div>
              </div>

              {/* SHIPPERS ADDITIONAL LOGISTICS FIELDS */}
              <div className="border-t pt-3 space-y-2.5">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#E31E24] mb-1">Shipper Logistics Parameters</h4>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Enquiry Number</label>
                    <input
                      type="text"
                      placeholder="e.g. ENQ-5324"
                      className="w-full text-xs font-semibold border rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 bg-slate-50"
                      value={enquiryNumber}
                      onChange={(e) => setEnquiryNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Survey Type</label>
                    <select
                      className="w-full text-xs font-bold border rounded-lg p-2.5 outline-none text-slate-700 bg-white"
                      value={surveyType}
                      onChange={(e) => setSurveyType(e.target.value)}
                    >
                      <option value="Physical">Physical</option>
                      <option value="Whatsapp">Whatsapp</option>
                      <option value="Video Call">Video Call</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Shipment Mode</label>
                    <select
                      className="w-full text-xs font-bold border rounded-lg p-2.5 outline-none text-slate-700 bg-white"
                      value={shipmentMode}
                      onChange={(e) => setShipmentMode(e.target.value)}
                    >
                      <option value="Export">Export</option>
                      <option value="Import">Import</option>
                      <option value="Domestic">Domestic</option>
                      <option value="Storage">Storage</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Tracker Status</label>
                    <select
                      className="w-full text-xs font-bold border rounded-lg p-2.5 outline-none text-slate-700 bg-white"
                      value={surveyTrackerStatus}
                      onChange={(e) => setSurveyTrackerStatus(e.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Booked">Booked</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Packing Date</label>
                    <input
                      type="date"
                      className="w-full text-xs font-semibold border rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 bg-slate-50"
                      value={packingDate}
                      onChange={(e) => setPackingDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Removal Date</label>
                    <input
                      type="date"
                      className="w-full text-xs font-semibold border rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 bg-slate-50"
                      value={removalDate}
                      onChange={(e) => setRemovalDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Start Time</label>
                    <input
                      type="time"
                      className="w-full text-xs font-semibold border rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 bg-slate-50"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">End Time</label>
                    <input
                      type="time"
                      className="w-full text-xs font-semibold border rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 bg-slate-50"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Email ID</label>
                  <input
                    type="email"
                    placeholder="e.g. shipper@example.com"
                    className="w-full text-xs font-semibold border rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 bg-slate-50"
                    value={emailId}
                    onChange={(e) => setEmailId(e.target.value)}
                  />
                </div>
              </div>

              <div className="border-t pt-2 mt-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-2">Add Household Room</h4>
                
                <form onSubmit={handleAddRoom} className="space-y-2">
                  <select
                    value={selectedPresetRoom}
                    onChange={(e) => setSelectedPresetRoom(e.target.value)}
                    className="w-full text-xs font-bold border rounded-lg p-2.5 outline-none text-slate-700 bg-white"
                  >
                    {Object.keys(ROOM_PRESETS).map(preset => (
                      <option key={preset} value={preset}>{preset}</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Specific notes (e.g. 'Master Hallway')"
                    className="w-full text-xs font-medium border rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-slate-400 text-slate-700 bg-slate-50"
                    value={roomDescription}
                    onChange={(e) => setRoomDescription(e.target.value)}
                  />

                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Initialize Room
                  </button>
                </form>
              </div>

              {/* Photos Capture Component to Overall Survey */}
              <div className="border-t pt-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-2">Overall Survey Photos</h4>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => handleOpenCam('survey')}
                    className="flex-1 py-1.5 px-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-black rounded-lg flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Camera className="w-3.5 h-3.5 text-rose-600" /> Live Device Cam
                  </button>
                  <label className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black rounded-lg text-center cursor-pointer flex items-center justify-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" /> Upload Photo
                    <input type="file" accept="image/*" onChange={(e) => handleUploadFile('survey', undefined, e)} className="hidden" />
                  </label>
                </div>
                <div className="flex flex-wrap gap-1">
                  {surveyPhotoFiles.map((p, i) => (
                    <div key={i} className="relative w-12 h-12 rounded border overflow-hidden">
                      <img src={p} alt="item" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setSurveyPhotoFiles(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0.5 right-0.5 bg-black/60 rounded-full text-white p-0.5"><X className="w-2.5 h-2.5" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CENTRAL WORKSPACE: ACTUALLY ADDING HOUSEHOLD ITEMS TO ROOMS */}
            <div className="md:col-span-2 space-y-4">
              
              {/* Rooms Map Panel */}
              <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#E31E24]">Rooms Inventory List Setup</h4>
                
                {rooms.length === 0 ? (
                  <div className="py-12 border-2 border-dashed rounded-2xl text-center text-slate-400 text-xs font-medium">
                    No residential rooms added yet. Select a room at the left sidebar to start document mapping!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Visual Tab Selections */}
                    <div className="flex flex-wrap gap-1.5 border-b pb-2">
                      {rooms.map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setActiveRoomId(r.id)}
                          className={`py-1.5 px-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                            activeRoomId === r.id
                              ? 'bg-[#E31E24] text-white shadow'
                              : 'bg-slate-100 hover:bg-slate-150 text-slate-600'
                          }`}
                        >
                          {r.name}
                        </button>
                      ))}
                    </div>

                    {/* Active room builder forms */}
                    {(() => {
                      const activeRoom = rooms.find(r => r.id === activeRoomId);
                      if (!activeRoom) return <p className="text-xs text-slate-400">Select a room tab above to add items.</p>;

                      return (
                        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4 animate-fade-in">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h5 className="text-[11px] font-black uppercase text-indigo-700 tracking-wide">Configure: {activeRoom.name}</h5>
                              <p className="text-[10px] text-slate-400 italic font-semibold">{activeRoom.description || 'No custom description'}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveRoom(activeRoom.id)}
                              className="text-[10px] font-semibold text-rose-500 hover:text-rose-700 uppercase"
                            >
                              Remove Room
                            </button>
                          </div>

                          {/* Predefined item details catalog selector */}
                          <div className="space-y-1.5 p-3.5 bg-indigo-50/45 rounded-2xl border border-indigo-100">
                            <label className="text-[9px] font-black text-indigo-900 uppercase tracking-widest block flex justify-between items-center">
                              <span>Available Household Master Item Catalog</span>
                              <span className="text-[8px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-mono font-bold">
                                {householdItems.length} items
                              </span>
                            </label>
                            
                            <select
                              value={householdItems.includes(itemName) ? itemName : ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  setItemName(val);
                                  const suggested = getSuggestedCbm(val);
                                  setItemCbm(suggested);
                                }
                              }}
                              className="w-full text-xs font-bold border border-slate-200 rounded-lg p-2 text-slate-800 bg-white focus:ring-1 focus:ring-indigo-400"
                            >
                              <option value="">-- Dropdown selections (Click to populate name and suggested CBM) --</option>
                              {householdItems.map(presetItem => {
                                const subCbm = getSuggestedCbm(presetItem);
                                return (
                                  <option key={presetItem} value={presetItem}>
                                    {presetItem} ({subCbm} CBM)
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          {/* Quick item adder inline form */}
                          <form onSubmit={handleAddItemToRoom} className="p-3 bg-white border border-slate-150 rounded-xl space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1 col-span-2 sm:col-span-1">
                                <div className="flex justify-between items-center">
                                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Item Category / Name *</label>
                                  {itemName.trim() && !householdItems.some(item => item.toLowerCase() === itemName.trim().toLowerCase()) && (
                                    <span className="text-[8px] font-black text-indigo-700 bg-indigo-100/80 px-1 rounded animate-pulse">Custom Item</span>
                                  )}
                                </div>
                                <input
                                  required
                                  type="text"
                                  placeholder="e.g. Sofa, TV, Bed Frame"
                                  className="w-full text-xs font-bold border rounded-lg p-2 bg-slate-50 outline-none"
                                  value={itemName}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setItemName(val);
                                    const suggested = getSuggestedCbm(val);
                                    if (suggested !== 0.20) {
                                      setItemCbm(suggested);
                                    }
                                  }}
                                />
                                
                                {itemName.trim() && !householdItems.some(item => item.toLowerCase() === itemName.trim().toLowerCase()) && (
                                  <label className="flex items-center gap-1 cursor-pointer text-[8px] font-black uppercase text-indigo-700 mt-1.5">
                                    <input
                                      type="checkbox"
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                                      checked={customWrittenSaveCheck}
                                      onChange={(e) => setCustomWrittenSaveCheck(e.target.checked)}
                                    />
                                    <span>Save to system database master catalog</span>
                                  </label>
                                )}
                              </div>

                              <div className="space-y-1 col-span-2 sm:col-span-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Quantity *</label>
                                <input
                                  required
                                  type="number"
                                  min={1}
                                  className="w-full text-xs font-bold border rounded-lg p-2 bg-slate-50 outline-none"
                                  value={itemQty}
                                  onChange={(e) => setItemQty(parseInt(e.target.value) || 1)}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pb-1">
                              <div className="space-y-1 col-span-2 sm:col-span-1">
                                <label className="text-[8px] font-black text-[#E31E24] uppercase tracking-widest block">Unit CBM (Volume) *</label>
                                <div className="relative">
                                  <input
                                    required
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    className="w-full text-xs font-black border border-indigo-200 rounded-lg p-2 bg-white text-indigo-900 outline-none focus:ring-1 focus:ring-indigo-400"
                                    value={itemCbm}
                                    onChange={(e) => setItemCbm(parseFloat(e.target.value) || 0.1)}
                                  />
                                  <span className="absolute right-3 top-2.5 text-[9px] text-indigo-500 font-mono font-bold">m³</span>
                                </div>
                              </div>

                              <div className="space-y-1 col-span-2 sm:col-span-1 bg-indigo-50 border border-indigo-100 p-2.5 rounded-xl flex flex-col justify-center">
                                <p className="text-[8.5px] font-black text-indigo-700 uppercase tracking-widest leading-none">Total Item volume</p>
                                <p className="text-sm font-black text-indigo-950 font-mono mt-0.5">
                                  {(itemQty * itemCbm).toFixed(2)} m³ <span className="text-[9px] font-normal text-slate-500">({itemQty} × {itemCbm} CBM)</span>
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Remarks / Condition Details</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Left armrest slightly worn. No scratches."
                                  className="w-full text-xs font-medium border rounded-lg p-2 bg-slate-50 outline-none"
                                  value={itemRemarks}
                                  onChange={(e) => setItemRemarks(e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Special Handling Specs</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Needs double bubble wrapping"
                                  className="w-full text-xs font-medium border rounded-lg p-2 bg-slate-50 outline-none"
                                  value={specialHandling}
                                  onChange={(e) => setSpecialHandling(e.target.value)}
                                />
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-black uppercase text-amber-700">
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-300 text-amber-600 focus:ring-none"
                                  checked={isFragile}
                                  onChange={(e) => setIsFragile(e.target.checked)}
                                />
                                Fragile Item (requires careful box packing)
                              </label>

                              {/* Item specific upload camera */}
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenCam('item')}
                                  className="p-1 px-2 border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-[9px] font-bold text-rose-700 rounded flex items-center gap-1 transition-all"
                                >
                                  <Camera className="w-3 h-3 text-rose-600" /> Device Cam
                                </button>
                                <label className="p-1 px-2 border border-slate-200 bg-slate-55 hover:bg-slate-100 text-[9px] font-bold text-slate-700 rounded flex items-center gap-1 cursor-pointer transition-all">
                                  <Upload className="w-3 h-3 text-slate-500" /> Upload File
                                  <input type="file" accept="image/*" onChange={(e) => handleUploadFile('item', undefined, e)} className="hidden" />
                                </label>
                                <button
                                  type="submit"
                                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase"
                                >
                                  Add to Inventory
                                </button>
                              </div>
                            </div>

                            {/* Item Photo List preview draft */}
                            {itemPhotos.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {itemPhotos.map((p, i) => (
                                  <div key={i} className="relative w-8 h-8 rounded border overflow-hidden">
                                    <img src={p} alt="item" className="w-full h-full object-cover" />
                                    <button type="button" onClick={() => setItemPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-black/60 rounded text-white p-0.5 text-[8px]"><X className="w-2" /></button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </form>

                          {/* Existing items inside the room */}
                          <div className="space-y-1.5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Current Room Item Listing({activeRoom.items.length})</p>
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                              {activeRoom.items.map(it => {
                                const singleCbm = it.cbm !== undefined ? it.cbm : 0.20;
                                const totalCbm = it.quantity * singleCbm;
                                return (
                                  <div key={it.id} className="p-3 bg-white rounded-xl border border-slate-150 flex justify-between gap-2.5 items-start text-xs font-semibold">
                                    <div className="space-y-1">
                                      <p className="font-extrabold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                        <span>{it.name}</span>
                                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-neutral-600 font-mono">Qty: {it.quantity}</span>
                                        <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-bold" title="Cubic Meters Volume">
                                          {totalCbm.toFixed(2)} m³ <span className="text-[8px] font-normal text-slate-400">({it.quantity} × {singleCbm} CBM)</span>
                                        </span>
                                        {it.isFragile && (
                                          <span className="text-[8px] font-black uppercase text-amber-700 border border-amber-200 bg-amber-50 px-1.5 py-0.5 rounded-full">Fragile</span>
                                        )}
                                      </p>
                                      {it.remarks && <p className="text-[10px] text-slate-500 font-medium">Remarks: <span className="italic">{it.remarks}</span></p>}
                                      {it.specialHandling && <p className="text-[10px] text-indigo-700 font-medium">Special: <span className="italic">{it.specialHandling}</span></p>}
                                    </div>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(activeRoom.id, it.id)}
                                    className="p-1 hover:bg-red-50 text-red-400 hover:text-red-700 rounded transition"
                                    title="Delete Item"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* LOCK SURVEY & ELECTRONIC SIGNPAD PANEL */}
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-2">Client Signature Declaration</h4>
                
                <p className="text-stone-500 text-[11px] leading-relaxed font-semibold">
                  Declaration confirmation require: <br />
                  <span className="text-stone-705 italic font-bold">"I confirm that all items I want packed and moved have been shown to the Surveyor and included in this survey."</span>
                </p>

                {activeRecord?.clientDeclarationSigned || draftClientDeclarationSigned ? (
                  <div className="flex gap-4 items-center flex-wrap bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="w-16 h-12 bg-white rounded border flex items-center justify-center p-1.5 shrink-0 select-none">
                      {activeRecord?.clientSignatureUrl || draftClientSignatureUrl ? (
                        <img src={activeRecord?.clientSignatureUrl || draftClientSignatureUrl} alt="sig" className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-[9px] font-black text-[#E31E24] uppercase tracking-widest">Signed</div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">Client Signature Confirmed</p>
                      <p className="text-[10px] font-bold text-slate-400 font-mono">Date: {activeRecord?.clientSignatureTimestamp?.substring(0, 16).replace('T', ' ') || new Date().toISOString().substring(0, 16).replace('T', ' ')} UTC</p>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={triggerClientDeclarationSignature}
                    className="py-3 px-5 border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all w-fit"
                  >
                    <Edit3 className="w-4 h-4 text-[#E31E24]" /> Sign Declaration with Finger
                  </button>
                )}

                <div className="flex justify-end gap-2.5 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNew(false);
                      setIsEditingSurvey(false);
                      setActiveRecord(null);
                    }}
                    className="px-5 py-2.5 text-slate-500 hover:bg-slate-100 text-xs font-bold uppercase rounded-xl transition"
                  >
                    Cancel Draft
                  </button>
                  <button
                    type="button"
                    onClick={triggerSaveCompletedSurveyDraft}
                    className="px-6 py-2.5 bg-[#E31E24] hover:bg-rose-700 text-white text-xs font-black uppercase rounded-xl shadow-sm tracking-wider flex items-center gap-1.5 transition-all"
                  >
                    <Save className="w-4 h-4" /> Save & Notify OPS-106
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // ACTIVE DETAIL RECORD REVIEW (OPS ALLOCATION OR FOURWAY SIGNING OVERLAYS)
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-3xl border border-slate-100 shadow-sm gap-2">
            <div>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full mb-1 inline-block ${
                activeRecord.status === 'Pending' ? 'bg-amber-100 text-amber-800 border' :
                activeRecord.status === 'Survey Completed' ? 'bg-sky-100 text-sky-800 border' :
                'bg-emerald-105 text-emerald-800 border'
              }`}>
                {activeRecord.status}
              </span>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">{activeRecord.clientName}'s Relocation Inventory Manifest</h3>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => runExportExcelManifest(activeRecord)}
                className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-850 border border-emerald-200 text-[10px] font-extrabold rounded-xl uppercase tracking-wider flex items-center gap-1 transition-all shadow-sm shrink-0"
                title="Download spreadsheet report"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Excel
              </button>

              <button
                onClick={() => runExportPDFManifest(activeRecord)}
                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-850 border border-rose-200 text-[10px] font-extrabold rounded-xl uppercase tracking-wider flex items-center gap-1 transition-all shadow-sm shrink-0"
                title="Download premium PDF manifest"
              >
                <Download className="w-4 h-4 text-rose-600" /> PDF Report
              </button>
              
              <button
                onClick={() => {
                  setActiveRecord(null);
                  setIsEditingSurvey(false);
                }}
                className="text-xs font-bold uppercase text-slate-500 hover:text-slate-800 px-3 py-1.5 bg-slate-50 border rounded-lg"
              >
                Close View
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* RECORD BRIEF SPECS */}
            <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4 h-fit">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#E31E24] border-b pb-2">Shipment Summary</h4>
              
              <div className="space-y-1.5 text-xs text-slate-600 font-semibold">
                <p className="flex justify-between border-b pb-1"><span>Survey File ID:</span><strong className="text-slate-800 font-mono">{activeRecord.id}</strong></p>
                {activeRecord.enquiryNumber && <p className="flex justify-between border-b pb-1"><span>Enquiry Number:</span><strong className="text-slate-800 font-mono">{activeRecord.enquiryNumber}</strong></p>}
                <p className="flex justify-between border-b pb-1"><span>Client Name:</span><strong className="text-slate-800">{activeRecord.clientName}</strong></p>
                {activeRecord.emailId && <p className="flex justify-between border-b pb-1"><span>Client Email:</span><strong className="text-slate-800 text-[10px] break-all">{activeRecord.emailId}</strong></p>}
                <p className="flex justify-between border-b pb-1"><span>Destination Country:</span><strong className="text-slate-800">{activeRecord.destinationCountry || 'N/A'}</strong></p>
                <p className="flex justify-between border-b pb-1"><span>Destination City:</span><strong className="text-slate-800">{activeRecord.destinationCity}</strong></p>
                <p className="flex justify-between border-b pb-1"><span>Assigned Agent:</span><strong className="text-slate-850">{activeRecord.surveyorName}</strong></p>
                {activeRecord.surveyType && <p className="flex justify-between border-b pb-1"><span>Survey Type:</span><strong className="text-slate-850">{activeRecord.surveyType}</strong></p>}
                {activeRecord.shipmentMode && <p className="flex justify-between border-b pb-1"><span>Shipment Mode:</span><strong className="text-slate-850">{activeRecord.shipmentMode}</strong></p>}
                {activeRecord.packingDate && <p className="flex justify-between border-b pb-1"><span>Packing Date:</span><strong className="text-slate-850 font-mono">{activeRecord.packingDate}</strong></p>}
                {activeRecord.removalDate && <p className="flex justify-between border-b pb-1"><span>Removal Date:</span><strong className="text-slate-850 font-mono">{activeRecord.removalDate}</strong></p>}
                {activeRecord.startTime && <p className="flex justify-between border-b pb-1"><span>Schedule Window:</span><strong className="text-slate-850 font-mono">{activeRecord.startTime} - {activeRecord.endTime}</strong></p>}
                <p className="flex justify-between"><span>Status Code:</span><strong className="text-blue-700">{activeRecord.status}</strong></p>
              </div>

              {activeRecord.clientDeclarationSigned && (
                <div className="pt-2 bg-slate-50 p-3 rounded-xl border border-dashed text-[10px] space-y-2">
                  <p className="text-slate-400 font-black uppercase">Client Origin Witness Declaration</p>
                  <p className="text-slate-600 font-semibold italic">"I confirm that all items I want packed and moved have been shown to the Surveyor..."</p>
                  <div className="flex gap-2 items-center">
                    <div className="w-12 h-8 bg-white border rounded">
                      {activeRecord.clientSignatureUrl && <img src={activeRecord.clientSignatureUrl} alt="sig" className="w-full h-full object-contain" />}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-800 leading-none">{activeRecord.clientSignatureName}</p>
                      <p className="text-[8px] text-slate-400 font-mono mt-0.5">{activeRecord.clientSignatureTimestamp?.substring(0, 16).replace('T', ' ')} UTC</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* MAIN MANIFEST & PACKING SHEET REVIEW / INVENTORY */}
            <div className="lg:col-span-2 space-y-4">
              
              {/* If status = 'Survey Completed' AND simulator is OPS-106 - Render Package Allocation Sheet! */}
              {activeRecord.status === 'Survey Completed' && activeRole === 'OPS-106' ? (
                <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#E31E24]">OPS-106 Package Allocator</h4>
                      <p className="text-[10px] text-slate-400 font-mono">Allocate physical boxes and sequence tags for packing manifest validation.</p>
                    </div>
                  </div>

                  {duplicateValidationError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-[10px] font-black flex items-center gap-1.5 uppercase tracking-wide">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {duplicateValidationError}
                    </div>
                  )}

                  <div className="space-y-4">
                    {rooms.map(rc => {
                      if (rc.items.length === 0) return null;
                      return (
                        <div key={rc.id} className="p-3.5 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3">
                          <p className="text-[10px] font-black text-indigo-805 uppercase tracking-wider">{rc.name} items</p>
                          
                          <div className="space-y-2.5">
                            {rc.items.map(it => (
                              <div key={it.id} className="p-3 bg-white rounded-xl border border-slate-150 text-xs flex flex-col md:flex-row justify-between gap-4">
                                <div className="space-y-1 max-w-sm">
                                  <p className="font-extrabold text-slate-800 flex items-center gap-1.5">
                                    {it.name} <span className="text-[10px] font-bold text-slate-400 font-mono">Qty: {it.quantity}</span>
                                    {it.isFragile && <span className="text-[8px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200 px-1.5 rounded-full">Fragile</span>}
                                  </p>
                                  {it.remarks && <p className="text-[10px] text-slate-500 font-medium italic">Remarks: {it.remarks}</p>}
                                  {it.specialHandling && <p className="text-[10px] text-indigo-600 font-medium font-mono">Requirement: {it.specialHandling}</p>}
                                </div>

                                {/* PKG allocator interface */}
                                <div className="space-y-2 shrink-0 md:text-right">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Set Packages Count *</label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min={1}
                                      placeholder="Packages"
                                      value={it.packages ? it.packages.length : 1}
                                      onChange={(e) => handleAutoPackageAllocate(rc.id, it.id, Math.max(1, parseInt(e.target.value) || 1))}
                                      className="w-20 text-xs font-black border rounded p-1.5 text-slate-800 bg-slate-50 text-center outline-none"
                                    />
                                    <span className="text-[9px] font-black text-slate-400 uppercase">PKG</span>
                                  </div>

                                  {/* Code sequencing listing boxes */}
                                  {it.packages && it.packages.length > 0 && (
                                    <div className="mt-2 text-left space-y-1">
                                      <p className="text-[8px] font-black text-slate-450 uppercase tracking-widest">Manual sequencing overrides</p>
                                      <div className="flex flex-wrap gap-1.5 max-w-sm">
                                        {it.packages.map((pkgNo, pIdx) => {
                                          const rawDigits = pkgNo.replace(/^PKG-/i, '');
                                          return (
                                            <div key={pIdx} className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 px-1.5 rounded-lg shadow-sm">
                                              <span className="text-[9px] font-black text-slate-450 font-mono">PKG-</span>
                                              <input
                                                type="text"
                                                className="w-10 font-mono text-[10px] text-slate-800 font-extrabold bg-white text-center rounded border border-slate-200 p-0.5 focus:outline-none focus:ring-1 focus:ring-red-450"
                                                value={rawDigits}
                                                maxLength={6}
                                                placeholder={String(pIdx + 1).padStart(3, '0')}
                                                onChange={(e) => {
                                                  const val = e.target.value.toUpperCase();
                                                  handleManualPackageNoUpdate(rc.id, it.id, pIdx, val ? `PKG-${val}` : '');
                                                }}
                                                onBlur={(e) => {
                                                  const val = e.target.value.trim().toUpperCase();
                                                  if (/^\d+$/.test(val)) {
                                                    const padded = val.padStart(3, '0');
                                                    handleManualPackageNoUpdate(rc.id, it.id, pIdx, `PKG-${padded}`);
                                                  }
                                                }}
                                              />
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleCompleteOPSAllocation}
                      className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow"
                    >
                      Complete & Unlock Packing status
                    </button>
                  </div>
                </div>
              ) : (
                // STANDARD DISPLAY ROOM BY ROOM PACKING DATA
                <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#E31E24] border-b pb-2">Room Inventory & Package Allocation Manifest</h4>
                  
                  <div className="space-y-4">
                    {activeRecord.rooms.map(room => (
                      <div key={room.id} className="p-4 rounded-2xl border border-slate-150/60 bg-slate-50/50 space-y-2">
                        <div className="flex justify-between items-center">
                          <h5 className="text-[11px] font-black uppercase text-slate-900">{room.name}</h5>
                          <span className="text-[9px] text-slate-400 font-mono italic">{room.description || 'No custom notes'}</span>
                        </div>

                        {/* List items displays with package sequencing labels */}
                        <div className="space-y-2 pt-2">
                          {room.items.length === 0 ? (
                            <p className="text-[10px] text-slate-400 italic">No inventory recorded for this room.</p>
                          ) : (
                            room.items.map(it => (
                              <div key={it.id} className="p-3 bg-white border border-slate-105 rounded-xl shadow-xs text-xs flex justify-between gap-3 flex-wrap">
                                <div className="space-y-0.5">
                                  <p className="font-extrabold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                    {it.name} <span className="bg-slate-100 text-slate-700 font-mono px-1.5 py-0.5 rounded leading-none text-[10px]">Qty: {it.quantity}</span>
                                    {it.isFragile && <span className="text-[8px] font-black uppercase tracking-wide text-amber-500 bg-amber-50 border border-amber-100 px-1.5 rounded-full">Fragile</span>}
                                  </p>
                                  {it.remarks && <p className="text-[10px] text-slate-500 font-semibold italic">Remarks: {it.remarks}</p>}
                                  {it.specialHandling && <p className="text-[10px] text-indigo-700 font-bold">Special Care: {it.specialHandling}</p>}
                                </div>

                                {/* Sequential allocation boxes codes */}
                                <div className="flex flex-wrap items-center gap-1.5 max-w-xs justify-end">
                                  {it.packages && it.packages.length > 0 ? (
                                    it.packages.map(pkg => (
                                      <span key={pkg} className="text-[9px] font-black font-mono text-[#E31E24] bg-red-50/65 border border-red-150 px-2 py-0.5 rounded flex items-center gap-0.5 shadow-xs">
                                        <Barcode className="w-3 h-3 text-[#E31E24]" /> {pkg}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-400 italic">No package serial codes allocated</span>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* POST-ALLOCATION SIGNATURES SECTIONS */}
              {activeRecord.status === 'Packing List Completed' || activeRecord.status === 'Delivered' ? (
                <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-indigo-700 border-b pb-2">Relocation Multi-Party Verification Signals</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* 1. Supervisor sign panel */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 space-y-3">
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-wide flex items-center gap-1">
                        <UserCheck className="w-4 h-4 text-[#E31E24]" /> 1. Supervisor Approval Sign
                      </p>
                      {activeRecord.supervisorSignatureUrl ? (
                        <div className="bg-white p-2 rounded-xl flex items-center gap-2 border">
                          <img src={activeRecord.supervisorSignatureUrl} alt="sig" className="w-12 h-8 object-contain shrink-0 bg-slate-50" />
                          <div className="text-[10px] font-bold text-slate-500 font-mono">
                            <p className="text-slate-800 leading-none">{activeRecord.supervisorSignatureName}</p>
                            <span className="mt-0.5 block">{activeRecord.supervisorSignatureTimestamp?.substring(0, 16).replace('T', ' ')} UTC</span>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenSignaturePad('supervisor', 'Supervisor Packing Sheet approval signature', activeRecord.id)}
                          className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm"
                        >
                          Sign to Approve
                        </button>
                      )}
                    </div>

                    {/* 2. Origin client packed goods confirm sign */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 space-y-3">
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-wide flex items-center gap-1">
                        <UserCheck className="w-4 h-4 text-emerald-600" /> 2. Client Packed Goods Origin Confirm
                      </p>
                      {activeRecord.originClientSignatureUrl ? (
                        <div className="bg-white p-2 rounded-xl flex items-center gap-2 border">
                          <img src={activeRecord.originClientSignatureUrl} alt="sig" className="w-12 h-8 object-contain shrink-0 bg-slate-50" />
                          <div className="text-[10px] font-bold text-slate-500 font-mono">
                            <p className="text-slate-800 leading-none">{activeRecord.originClientSignatureName}</p>
                            <span className="mt-0.5 block">{activeRecord.originClientSignatureTimestamp?.substring(0, 16).replace('T', ' ')} UTC</span>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenSignaturePad('origin-client', 'Clientpacked goods inventory confirm signature', activeRecord.id)}
                          className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm"
                        >
                          Apply Client Packed Confirm
                        </button>
                      )}
                    </div>

                    {/* 3. Client signature (destination receipt) */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 space-y-3">
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-wide flex items-center gap-1">
                        <UserCheck className="w-4 h-4 text-orange-500" /> 3. Destination Client Receipt Confirm
                      </p>
                      {activeRecord.destinationClientSignatureUrl ? (
                        <div className="bg-white p-2 rounded-xl flex items-center gap-2 border">
                          <img src={activeRecord.destinationClientSignatureUrl} alt="sig" className="w-12 h-8 object-contain shrink-0 bg-slate-50" />
                          <div className="text-[10px] font-bold text-slate-500 font-mono">
                            <p className="text-slate-800 leading-none">{activeRecord.destinationClientSignatureName}</p>
                            <span className="mt-0.5 block">{activeRecord.destinationClientSignatureTimestamp?.substring(0, 16).replace('T', ' ')} UTC</span>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenSignaturePad('destination-client', 'Client destination receipt confirm signature', activeRecord.id)}
                          className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm"
                        >
                          Sign Delivery Receipt
                        </button>
                      )}
                    </div>

                    {/* 4. Destination agent handover sign */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 space-y-3">
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-wide flex items-center gap-1">
                        <UserCheck className="w-4 h-4 text-blue-500" /> 4. Destination Agent Transfer Sign
                      </p>
                      {activeRecord.destinationAgentSignatureUrl ? (
                        <div className="bg-white p-2 rounded-xl flex items-center gap-2 border">
                          <img src={activeRecord.destinationAgentSignatureUrl} alt="sig" className="w-12 h-8 object-contain shrink-0 bg-slate-50" />
                          <div className="text-[10px] font-bold text-slate-500 font-mono">
                            <p className="text-slate-800 leading-none">{activeRecord.destinationAgentSignatureName}</p>
                            <span className="mt-0.5 block">{activeRecord.destinationAgentSignatureTimestamp?.substring(0, 16).replace('T', ' ')} UTC</span>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenSignaturePad('destination-agent', 'Destination agent handover confirm signature', activeRecord.id)}
                          className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm"
                        >
                          Confirm Transfer Sign
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              ) : null}

            </div>
          </div>
        </div>
      )}

      {/* Embedded Signature Pad Modals Overlay */}
      {signatureModal && (
        <SignaturePad
          title={signatureModal.title}
          onSave={handleApplySignaturePadValue}
          onCancel={() => setSignatureModal(null)}
        />
      )}

      {/* Real Device Device Camera Active Viewfinder Overlay */}
      {cameraActive && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl w-full max-w-md flex flex-col items-center">
            
            <div className="w-full bg-slate-950 p-4 border-b border-slate-800/60 flex justify-between items-center text-white">
              <span className="text-xs font-black uppercase tracking-widest text-[#E31E24] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                Surveyor Camera Viewfinder
              </span>
              <button 
                type="button" 
                onClick={handleCloseCam} 
                className="text-slate-400 hover:text-white transition p-1 hover:bg-slate-850 rounded-lg text-xs"
              >
                Close Cam
              </button>
            </div>

            <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
              
              {/* Optional Camera Overlay Frame Indicator Guides */}
              <div className="absolute inset-4 border border-white/15 pointer-events-none rounded-xl flex items-center justify-center">
                <div className="w-6 h-6 border-t-2 border-l-2 border-[#E31E24] absolute top-0 left-0"></div>
                <div className="w-6 h-6 border-t-2 border-r-2 border-[#E31E24] absolute top-0 right-0"></div>
                <div className="w-6 h-6 border-b-2 border-l-2 border-[#E31E24] absolute bottom-0 left-0"></div>
                <div className="w-6 h-6 border-b-2 border-r-2 border-[#E31E24] absolute bottom-0 right-0"></div>
              </div>
            </div>

            <div className="w-full bg-slate-950 p-4 border-t border-slate-800/60 flex flex-col items-center gap-3">
              <p className="text-[10px] font-semibold text-slate-400 text-center uppercase tracking-widest leading-none">
                Align relocation asset, then press capture
              </p>

              <div className="flex gap-2.5 w-full">
                <button
                  type="button"
                  onClick={handleCloseCam}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 active:bg-slate-900 text-[10px] font-black uppercase text-slate-300 rounded-xl border border-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  className="flex-1 py-2.5 bg-[#E31E24] hover:bg-red-705 active:bg-red-800 text-[10px] font-black uppercase text-white rounded-xl shadow-lg shadow-red-950/40 transition flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-4 h-4" /> Take Picture
                </button>
              </div>

              {uploadProgressMsg && (
                <div className="w-full text-center py-1.5 px-3 bg-red-950/45 border border-red-900/40 rounded-lg text-[9px] font-black text-rose-300 font-mono tracking-widest uppercase animate-pulse">
                  {uploadProgressMsg}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-slate-905 border border-slate-800 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in-up">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping shrink-0" />
          <p className="text-xs font-semibold leading-relaxed text-left">{toastMessage}</p>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-wider ml-auto font-mono pl-2"
          >
            Dismiss
          </button>
        </div>
      )}

    </div>
  );
};
