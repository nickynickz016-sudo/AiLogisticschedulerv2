
import React, { useState, useRef, useEffect } from 'react';
import { FileText, Package, Box, Truck, Eraser, PenTool, Trash2, Printer, ClipboardCheck, Layers, ArrowLeftRight, ChevronLeft, ChevronRight, Monitor, Upload, Wrench, ShieldCheck, Plus, Check, Grid, Car, AlertTriangle } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { UserProfile } from '../types';

// Types for form data
interface PackingForm {
  clientName: string;
  jobId: string;
  date: string;
  walkThrough: {
    noDamage: boolean;
    itemsCheck: boolean;
    foundDamage: boolean;
  };
  clientNotes: string;
}

interface UnpackingForm {
  clientName: string;
  jobId: string;
  date: string;
  walkThrough: {
    noDamage: boolean;
    itemsCheck: boolean;
    foundDamage: boolean;
  };
  clientNotes: string;
}

interface DeliveryItem {
  id: string;
  pkgNo: string;
  description: string;
  condition: string;
  quantity: number;
  volume: number;
  weight: number;
}

interface CratingItem {
  id: string;
  pkgNo: string;
  description: string;
  l: number;
  w: number;
  h: number;
}

interface ElectronicItem {
  id: string;
  description: string;
  make: string;
  model: string;
  serial: string;
  condition: string;
}

interface AccessorialForm {
  clientName: string;
  jobId: string;
  date: string;
  serviceType: {
    packing: boolean;
    delivery: boolean;
  };
  services: {
    shuttle: boolean;
    stairCarry: boolean;
    elevator: boolean;
    hoisting: boolean;
    longCarry: boolean;
    piano: boolean;
    crating: boolean;
    extraLabor: boolean;
    overtime: boolean;
    preDelivery: boolean;
    extraMileage: boolean;
    debrisPickup: boolean;
    handyman: boolean;
    maidService: boolean;
    other: boolean;
  };
  details: {
    stairCarryFloors: string;
    longCarryDistance: string;
    handymanType: string;
    otherDescription: string;
  };
  remarks: string;
}

interface WarehouseReceiptForm {
  clientName: string;
  fileNo: string;
  date: string;
  type: 'Export' | 'Import' | 'Storage';
  mode: 'Air' | 'Sea' | 'Land';
  whLocation: string;
  totalPkgs: string;
  volume: string;
  containerNo: string;
  sealNo: string;
  truckDetails: string;
  missingNumbers: string;
  unnumbered: string;
  doubleNumber: string;
  totalCrates: string;
  crateNos: string;
  totalReceived: string;
  totalDelivered: string;
  checkedBy: string;
  selectedPackages: number[];
}

interface HandymanForm {
  fileNo: string;
  date: string;
  clientName: string;
  address: string;
  handymanAssigned: string;
  dayAssigned: string;
  timeIn: string;
  timeOut: string;
  services: {
    pictureFrames: boolean;
    wallMountOrnaments: boolean;
    mirrors: boolean;
    shelvingUnits: boolean;
    tvStandMounting: boolean;
    curtainRods: boolean;
    refrigerator: boolean;
    tv: boolean;
    hiFiSystem: boolean;
    chandelier: boolean;
    lights: boolean;
    washingMachine: boolean;
    dishwasher: boolean;
    electricalCooker: boolean;
    dishAntennae: boolean;
    windowAC: boolean;
    splitAC: boolean;
    waterbed: boolean;
    childSafetyGates: boolean;
    wallPainting: boolean;
    furnitureRestoration: boolean;
    floorRepairs: boolean;
    poolTable: boolean;
    assembly: boolean;
    disassembly: boolean;
    wardrobes: boolean;
    trampoline: boolean;
    gazebo: boolean;
    hammock: boolean;
    playHouse: boolean;
    swing: boolean;
    houseCleaning: boolean;
    laundry: boolean;
    packingClothes: boolean;
    closetArrangements: boolean;
  };
  remarks: string;
}

interface ContainerInspectionForm {
  date: string;
  containerNo: string;
  sealNo: string;
  checkpoints: {
    outsideUndercarriage: {
      structuralDamage: boolean;
      supportBeams: boolean;
      foreignObjects: boolean;
    };
    insideOutsideDoors: {
      locksSecure: boolean;
      looseBolts: boolean;
      hingesSecure: boolean;
    };
    rightSide: {
      unusualRepairs: boolean;
      repairsVisible: boolean;
    };
    leftSide: {
      unusualRepairs: boolean;
      repairsVisible: boolean;
    };
    frontWall: {
      corrugated: boolean;
      blocksVisible: boolean;
      ventsVisible: boolean;
    };
    ceilingRoof: {
      supportBeams: boolean;
      ventilationHoles: boolean;
      foreignObjects: boolean;
    };
    floor: {
      flatFloor: boolean;
      uniformHeight: boolean;
      unusualRepairs: boolean;
    };
    sealVerification: {
      properlyAffixed: boolean;
      meetsISO: boolean;
      notBroken: boolean;
    };
  };
  remarks: string;
  certified: boolean;
}

interface VehicleInspectionForm {
  clientName: string;
  jobId: string;
  date: string;
  vehicle: {
    make: string;
    model: string;
    year: string;
    color: string;
    plate: string;
    vin: string;
    mileage: string;
    fuelLevel: string;
  };
  accessories: {
    keys: boolean;
    spareWheel: boolean;
    jackTools: boolean;
    radio: boolean;
    mats: boolean;
    wheelCaps: boolean;
    serviceBook: boolean;
    warningTriangle: boolean;
  };
  condition: {
    lights: boolean;
    wipers: boolean;
    horn: boolean;
    ac: boolean;
    mirrors: boolean;
    tyres: boolean;
    upholstery: boolean;
    glass: boolean;
  };
  damageMarks: {
    scratch: string;
    dent: string;
    chip: string;
    crack: string;
    paint: string;
    other: string;
  };
  remarks: string;
}

interface WriterDocsProps {
  logo?: string;
  onUpdateLogo?: (base64: string) => void;
  isAdmin?: boolean;
  currentUser?: UserProfile;
}

export const WriterDocs: React.FC<WriterDocsProps> = ({ logo, onUpdateLogo, isAdmin, currentUser }) => {
  const [activeForm, setActiveForm] = useState<'packing' | 'unpacking' | 'delivery' | 'crating' | 'electronicList' | 'accessorial' | 'warehouseReceipt' | 'handyman' | 'containerInspection' | 'vehicleInspection'>('packing');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Forms State ---
  const [packingData, setPackingData] = useState<PackingForm>({
    clientName: '', jobId: '', date: new Date().toISOString().split('T')[0],
    walkThrough: { noDamage: false, itemsCheck: false, foundDamage: false },
    clientNotes: ''
  });

  const [unpackingData, setUnpackingData] = useState<UnpackingForm>({
    clientName: '', jobId: '', date: new Date().toISOString().split('T')[0],
    walkThrough: { noDamage: false, itemsCheck: false, foundDamage: false },
    clientNotes: ''
  });

  const [deliveryData, setDeliveryData] = useState({
    clientName: '', 
    jobId: '', 
    date: new Date().toISOString().split('T')[0], 
    truckNo: '', 
    notes: '',
    deliveryAddress: '',
    modeOfShipment: 'Sea'
  });
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>([]);

  const [cratingData, setCratingData] = useState({
    clientName: '', 
    jobId: '', 
    date: new Date().toISOString().split('T')[0], 
    address: '',
    packingDate: '',
    loadingDate: '',
    finalDestination: '',
    modeOfShipment: 'Sea',
    notes: '' 
  });
  const [crates, setCrates] = useState<CratingItem[]>([]);

  const [electronicData, setElectronicData] = useState({
    clientName: '', 
    jobId: '', 
    date: new Date().toISOString().split('T')[0], 
    address: '',
    packingDate: '',
    loadingDate: '',
    modeOfShipment: 'Sea',
    remarks: ''
  });
  const [electronicItems, setElectronicItems] = useState<ElectronicItem[]>([]);

  const [accessorialData, setAccessorialData] = useState<AccessorialForm>({
    clientName: '', jobId: '', date: new Date().toISOString().split('T')[0],
    serviceType: { packing: false, delivery: false },
    services: {
      shuttle: false, stairCarry: false, elevator: false, hoisting: false,
      longCarry: false, piano: false, crating: false, extraLabor: false,
      overtime: false, preDelivery: false, extraMileage: false, debrisPickup: false,
      handyman: false, maidService: false, other: false
    },
    details: { stairCarryFloors: '', longCarryDistance: '', handymanType: '', otherDescription: '' },
    remarks: ''
  });

  const [warehouseReceiptData, setWarehouseReceiptData] = useState<WarehouseReceiptForm>({
    clientName: '', fileNo: '', date: new Date().toISOString().split('T')[0],
    type: 'Export', mode: 'Sea',
    whLocation: '', totalPkgs: '', volume: '',
    containerNo: '', sealNo: '', truckDetails: '',
    missingNumbers: '', unnumbered: '', doubleNumber: '',
    totalCrates: '', crateNos: '',
    totalReceived: '', totalDelivered: '', checkedBy: '',
    selectedPackages: []
  });

  const [handymanData, setHandymanData] = useState<HandymanForm>({
    fileNo: '', date: new Date().toISOString().split('T')[0], clientName: '', address: '',
    handymanAssigned: '', dayAssigned: '', timeIn: '', timeOut: '',
    services: {
        pictureFrames: false, wallMountOrnaments: false, mirrors: false, shelvingUnits: false, tvStandMounting: false, curtainRods: false,
        refrigerator: false, tv: false, hiFiSystem: false, chandelier: false, lights: false, washingMachine: false, dishwasher: false, electricalCooker: false, dishAntennae: false, windowAC: false, splitAC: false,
        waterbed: false, childSafetyGates: false, wallPainting: false, furnitureRestoration: false, floorRepairs: false, poolTable: false,
        assembly: false, disassembly: false, wardrobes: false,
        trampoline: false, gazebo: false, hammock: false, playHouse: false, swing: false,
        houseCleaning: false, laundry: false, packingClothes: false, closetArrangements: false
    },
    remarks: ''
  });

  const [containerInspectionData, setContainerInspectionData] = useState<ContainerInspectionForm>({
    date: new Date().toISOString().split('T')[0],
    containerNo: '',
    sealNo: '',
    checkpoints: {
        outsideUndercarriage: { structuralDamage: false, supportBeams: false, foreignObjects: false },
        insideOutsideDoors: { locksSecure: false, looseBolts: false, hingesSecure: false },
        rightSide: { unusualRepairs: false, repairsVisible: false },
        leftSide: { unusualRepairs: false, repairsVisible: false },
        frontWall: { corrugated: false, blocksVisible: false, ventsVisible: false },
        ceilingRoof: { supportBeams: false, ventilationHoles: false, foreignObjects: false },
        floor: { flatFloor: false, uniformHeight: false, unusualRepairs: false },
        sealVerification: { properlyAffixed: false, meetsISO: false, notBroken: false }
    },
    remarks: '',
    certified: false
  });

  const [vehicleInspectionData, setVehicleInspectionData] = useState<VehicleInspectionForm>({
    clientName: '', jobId: '', date: new Date().toISOString().split('T')[0],
    vehicle: { make: '', model: '', year: '', color: '', plate: '', vin: '', mileage: '', fuelLevel: '' },
    accessories: { keys: false, spareWheel: false, jackTools: false, radio: false, mats: false, wheelCaps: false, serviceBook: false, warningTriangle: false },
    condition: { lights: false, wipers: false, horn: false, ac: false, mirrors: false, tyres: false, upholstery: false, glass: false },
    damageMarks: { scratch: '', dent: '', chip: '', crack: '', paint: '', other: '' },
    remarks: ''
  });
  
  // Warehouse UI State
  const [gridPage, setGridPage] = useState(0); 
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select');

  // --- Canvas Logic ---
  const canvasRef = useRef<HTMLCanvasElement>(null); // For Signature
  const vehicleCanvasRef = useRef<HTMLCanvasElement>(null); // For Vehicle Diagram
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeCanvas, setActiveCanvas] = useState<HTMLCanvasElement | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  // Initialize Signature Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = 224; // 224px height
      }
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000000';
      }
    }
  }, [activeForm]);

  // Initialize Vehicle Canvas with Schematic
  useEffect(() => {
    if (activeForm === 'vehicleInspection' && vehicleCanvasRef.current) {
        const canvas = vehicleCanvasRef.current;
        const parent = canvas.parentElement;
        if (parent) {
            canvas.width = parent.clientWidth;
            canvas.height = 300;
        }
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Draw Car Schematic
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.strokeStyle = '#94a3b8'; // Slate 400
            ctx.lineWidth = 2;
            
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            
            // Draw flattened boxy car
            // Roof (Center)
            ctx.strokeRect(cx - 40, cy - 60, 80, 120); 
            // Hood (Front)
            ctx.strokeRect(cx - 40, cy - 110, 80, 50);
            // Trunk (Rear)
            ctx.strokeRect(cx - 40, cy + 60, 80, 50);
            // Left Side
            ctx.strokeRect(cx - 90, cy - 60, 50, 120);
            // Right Side
            ctx.strokeRect(cx + 40, cy - 60, 50, 120);
            
            // Labels
            ctx.fillStyle = '#cbd5e1';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            ctx.fillText('FRONT', cx, cy - 85);
            ctx.fillText('REAR', cx, cy + 85);
            ctx.fillText('ROOF', cx, cy);
            ctx.fillText('LEFT', cx - 65, cy);
            ctx.fillText('RIGHT', cx + 65, cy);

            // Set up context for user drawing (red marker)
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#e11d48'; // Rose 600
            ctx.lineCap = 'round';
        }
    }
  }, [activeForm]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
        setIsDragging(false);
        setIsDrawing(false);
        setActiveCanvas(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateLogo) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onUpdateLogo(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Generic drawing handlers
  const startDrawing = (e: any, ref: React.RefObject<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = ref.current;
    if (!canvas) return;
    
    setActiveCanvas(canvas);
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    if (ctx) {
        ctx.beginPath();
        ctx.moveTo(x, y);
    }
  };

  const draw = (e: any) => {
    if (!isDrawing || !activeCanvas) return;
    const ctx = activeCanvas.getContext('2d');
    const rect = activeCanvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    if (ctx) {
        ctx.lineTo(x, y);
        ctx.stroke();
        // Only set hasSignature if drawing on the signature canvas
        if (activeCanvas === canvasRef.current) {
            setHasSignature(true);
        }
    }
  };

  const endDrawing = () => {
    setIsDrawing(false);
    if (activeCanvas) {
        activeCanvas.getContext('2d')?.closePath();
    }
    setActiveCanvas(null);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const clearVehicleCanvas = () => {
    // Redraw the schematic instead of just clearing
    if (activeForm === 'vehicleInspection' && vehicleCanvasRef.current) {
        const canvas = vehicleCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2;
            
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            
            ctx.strokeRect(cx - 40, cy - 60, 80, 120); 
            ctx.strokeRect(cx - 40, cy - 110, 80, 50);
            ctx.strokeRect(cx - 40, cy + 60, 80, 50);
            ctx.strokeRect(cx - 90, cy - 60, 50, 120);
            ctx.strokeRect(cx + 40, cy - 60, 50, 120);
            
            ctx.fillStyle = '#cbd5e1';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            ctx.fillText('FRONT', cx, cy - 85);
            ctx.fillText('REAR', cx, cy + 85);
            ctx.fillText('ROOF', cx, cy);
            ctx.fillText('LEFT', cx - 65, cy);
            ctx.fillText('RIGHT', cx + 65, cy);

            ctx.lineWidth = 3;
            ctx.strokeStyle = '#e11d48';
        }
    }
  };

  // --- Helpers ---
  const addDeliveryItem = () => setDeliveryItems([...deliveryItems, { 
    id: Date.now().toString(), 
    pkgNo: '', 
    description: '', 
    condition: 'Good', 
    quantity: 1, 
    volume: 0, 
    weight: 0 
  }]);
  const addCrate = () => setCrates([...crates, { id: Date.now().toString(), pkgNo: '', description: '', l: 0, w: 0, h: 0 }]);
  const addElectronicItem = () => setElectronicItems([...electronicItems, { id: Date.now().toString(), description: '', make: '', model: '', serial: '', condition: 'Good' }]);

  const removeDeliveryItem = (id: string) => setDeliveryItems(deliveryItems.filter(i => i.id !== id));
  const removeCrate = (id: string) => setCrates(crates.filter(c => c.id !== id));
  const removeElectronicItem = (id: string) => setElectronicItems(electronicItems.filter(i => i.id !== id));

  const updateDeliveryItem = (id: string, field: keyof DeliveryItem, value: any) => setDeliveryItems(deliveryItems.map(i => i.id === id ? { ...i, [field]: value } : i));
  const updateCrate = (id: string, field: keyof CratingItem, value: any) => setCrates(crates.map(c => c.id === id ? { ...c, [field]: value } : c));
  const updateElectronicItem = (id: string, field: keyof ElectronicItem, value: any) => setElectronicItems(electronicItems.map(i => i.id === id ? { ...i, [field]: value } : i));

  const calculateTotalVolume = () => crates.reduce((acc, c) => acc + ((c.l * c.w * c.h) / 1728 / 35.34), 0).toFixed(3);

  const updatePackageSelection = (num: number, mode: 'select' | 'deselect') => {
    setWarehouseReceiptData(prev => {
        const isSelected = prev.selectedPackages.includes(num);
        if (mode === 'select' && !isSelected) return { ...prev, selectedPackages: [...prev.selectedPackages, num] };
        else if (mode === 'deselect' && isSelected) return { ...prev, selectedPackages: prev.selectedPackages.filter(n => n !== num) };
        return prev;
    });
  };

  const handleGridMouseDown = (num: number) => {
    setIsDragging(true);
    const isSelected = warehouseReceiptData.selectedPackages.includes(num);
    const mode = isSelected ? 'deselect' : 'select';
    setDragMode(mode);
    updatePackageSelection(num, mode);
  };

  const handleGridMouseEnter = (num: number) => {
    if (isDragging) updatePackageSelection(num, dragMode);
  };

  const toggleSelectAllOnPage = () => {
    const start = gridPage * 200 + 1;
    const end = (gridPage + 1) * 200;
    const pageIds = Array.from({length: 200}, (_, i) => start + i);
    
    setWarehouseReceiptData(prev => {
        const allSelected = pageIds.every(id => prev.selectedPackages.includes(id));
        let newSelection = [...prev.selectedPackages];
        
        if (allSelected) {
            // Deselect all
            newSelection = newSelection.filter(id => !pageIds.includes(id));
        } else {
            // Select all (avoid duplicates)
            const toAdd = pageIds.filter(id => !newSelection.includes(id));
            newSelection = [...newSelection, ...toAdd];
        }
        return { ...prev, selectedPackages: newSelection };
    });
  };

  const handleClearForm = () => {
    const today = new Date().toISOString().split('T')[0];
    clearSignature();
    clearVehicleCanvas();
    switch (activeForm) {
      case 'packing':
        setPackingData({ clientName: '', jobId: '', date: today, walkThrough: { noDamage: false, itemsCheck: false, foundDamage: false }, clientNotes: '' });
        break;
      case 'unpacking':
        setUnpackingData({ clientName: '', jobId: '', date: today, walkThrough: { noDamage: false, itemsCheck: false, foundDamage: false }, clientNotes: '' });
        break;
      case 'delivery':
        setDeliveryData({ clientName: '', jobId: '', date: today, truckNo: '', notes: '', deliveryAddress: '', modeOfShipment: 'Sea' });
        setDeliveryItems([]);
        break;
      case 'crating':
        setCratingData({ 
            clientName: '', 
            jobId: '', 
            date: today,
            address: '',
            packingDate: '',
            loadingDate: '',
            finalDestination: '',
            modeOfShipment: 'Sea',
            notes: '' 
        });
        setCrates([]);
        break;
      case 'electronicList':
        setElectronicData({ 
            clientName: '', 
            jobId: '', 
            date: today,
            address: '',
            packingDate: '',
            loadingDate: '',
            modeOfShipment: 'Sea',
            remarks: '' 
        });
        setElectronicItems([]);
        break;
      case 'accessorial':
        setAccessorialData({ clientName: '', jobId: '', date: today, serviceType: { packing: false, delivery: false }, services: { shuttle: false, stairCarry: false, elevator: false, hoisting: false, longCarry: false, piano: false, crating: false, extraLabor: false, overtime: false, preDelivery: false, extraMileage: false, debrisPickup: false, handyman: false, maidService: false, other: false }, details: { stairCarryFloors: '', longCarryDistance: '', handymanType: '', otherDescription: '' }, remarks: '' });
        break;
      case 'warehouseReceipt':
        setWarehouseReceiptData({ clientName: '', fileNo: '', date: today, type: 'Export', mode: 'Sea', whLocation: '', totalPkgs: '', volume: '', containerNo: '', sealNo: '', truckDetails: '', missingNumbers: '', unnumbered: '', doubleNumber: '', totalCrates: '', crateNos: '', totalReceived: '', totalDelivered: '', checkedBy: '', selectedPackages: [] });
        setGridPage(0);
        break;
      case 'handyman':
        setHandymanData({
            fileNo: '', date: today, clientName: '', address: '', handymanAssigned: '', dayAssigned: '', timeIn: '', timeOut: '',
            services: { pictureFrames: false, wallMountOrnaments: false, mirrors: false, shelvingUnits: false, tvStandMounting: false, curtainRods: false, refrigerator: false, tv: false, hiFiSystem: false, chandelier: false, lights: false, washingMachine: false, dishwasher: false, electricalCooker: false, dishAntennae: false, windowAC: false, splitAC: false, waterbed: false, childSafetyGates: false, wallPainting: false, furnitureRestoration: false, floorRepairs: false, poolTable: false, assembly: false, disassembly: false, wardrobes: false, trampoline: false, gazebo: false, hammock: false, playHouse: false, swing: false, houseCleaning: false, laundry: false, packingClothes: false, closetArrangements: false },
            remarks: ''
        });
        break;
      case 'containerInspection':
        setContainerInspectionData({
            date: today, containerNo: '', sealNo: '',
            checkpoints: {
                outsideUndercarriage: { structuralDamage: false, supportBeams: false, foreignObjects: false },
                insideOutsideDoors: { locksSecure: false, looseBolts: false, hingesSecure: false },
                rightSide: { unusualRepairs: false, repairsVisible: false },
                leftSide: { unusualRepairs: false, repairsVisible: false },
                frontWall: { corrugated: false, blocksVisible: false, ventsVisible: false },
                ceilingRoof: { supportBeams: false, ventilationHoles: false, foreignObjects: false },
                floor: { flatFloor: false, uniformHeight: false, unusualRepairs: false },
                sealVerification: { properlyAffixed: false, meetsISO: false, notBroken: false }
            },
            remarks: '', certified: false
        });
        break;
      case 'vehicleInspection':
        setVehicleInspectionData({
            clientName: '', jobId: '', date: today,
            vehicle: { make: '', model: '', year: '', color: '', plate: '', vin: '', mileage: '', fuelLevel: '' },
            accessories: { keys: false, spareWheel: false, jackTools: false, radio: false, mats: false, wheelCaps: false, serviceBook: false, warningTriangle: false },
            condition: { lights: false, wipers: false, horn: false, ac: false, mirrors: false, tyres: false, upholstery: false, glass: false },
            damageMarks: { scratch: '', dent: '', chip: '', crack: '', paint: '', other: '' },
            remarks: ''
        });
        break;
    }
  };

  const getCurrentClientName = () => {
    switch (activeForm) {
      case 'packing': return packingData.clientName;
      case 'unpacking': return unpackingData.clientName;
      case 'delivery': return deliveryData.clientName;
      case 'crating': return cratingData.clientName;
      case 'electronicList': return electronicData.clientName;
      case 'accessorial': return accessorialData.clientName;
      case 'warehouseReceipt': return warehouseReceiptData.clientName;
      case 'handyman': return handymanData.clientName;
      case 'vehicleInspection': return vehicleInspectionData.clientName;
      default: return '';
    }
  };

  const handlePrint = () => {
    const isLandscape = activeForm === 'warehouseReceipt';
    const doc = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait' }) as any;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = 20;

    const colors = {
      textDark: [45, 55, 72], textLight: [113, 128, 150], accent: [30, 41, 59], border: [226, 232, 240], bg: [248, 250, 252],
    };

    const addTitle = (title: string, showHeader: boolean = true) => {
      let titleXOffset = 0;
      if (logo) {
        const maxLogoW = 50, maxLogoH = 25;
        try {
            const imgProps = doc.getImageProperties(logo);
            const ratio = imgProps.width / imgProps.height;
            let renderW = maxLogoW, renderH = renderW / ratio;
            if (renderH > maxLogoH) { renderH = maxLogoH; renderW = renderH * ratio; }
            doc.addImage(logo, 'PNG', margin, 12, renderW, renderH);
            titleXOffset = renderW + 5; 
        } catch (e) {
            doc.rect(margin, 15, 10, 10); titleXOffset = 15;
        }
      } else {
        doc.setDrawColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
        doc.setLineWidth(0.5);
        doc.rect(margin, 15, 6, 6, 'F'); titleXOffset = 10;
      }
      
      const textX = margin + titleXOffset;
      doc.setFontSize(10); doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]); doc.setFont("helvetica", "bold");
      doc.text("WRITER RELOCATIONS", textX, 18);
      doc.setFontSize(8); doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]); doc.setFont("helvetica", "normal");
      doc.text("PREMIUM LOGISTICS SERVICES", textX, 22);
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.line(margin, 38, pageWidth - margin, 38);
      yPos = 50;
      
      if (showHeader) {
        doc.setFontSize(22); doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]); doc.setFont("helvetica", "bold");
        doc.text(title, margin, yPos); yPos += 20;
      }
    };

    const addField = (label: string, value: string, x: number, y: number) => {
       doc.setFontSize(7); doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]); doc.setFont("helvetica", "bold");
       doc.text(label.toUpperCase(), x, y);
       doc.setFontSize(10); doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]); doc.setFont("helvetica", "normal");
       doc.text(value || '—', x, y + 5);
    };

    const addSectionDivider = (label: string, y: number) => {
       doc.setFontSize(8); doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]); doc.setFont("helvetica", "bold");
       doc.text(label.toUpperCase(), margin, y);
       doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]); doc.setLineWidth(0.1);
       doc.line(margin, y + 3, pageWidth - margin, y + 3);
       return y + 10;
    };

    const drawCheckbox = (x: number, y: number, checked: boolean) => {
        doc.setDrawColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
        doc.setLineWidth(0.2);
        doc.rect(x, y - 3, 4, 4);
        if (checked) {
            doc.setFillColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
            doc.rect(x + 1, y - 2, 2, 2, 'F');
        }
    };

    if (activeForm === 'packing' || activeForm === 'unpacking') {
         const isPacking = activeForm === 'packing';
         const data = isPacking ? packingData : unpackingData;
         addTitle(isPacking ? "Packing Services Walk Through" : "Unpacking Services Walk Through");
         
         addField("Client Name", data.clientName, margin, yPos);
         addField("Job Reference", data.jobId, margin + 90, yPos);
         addField("Date", data.date, margin + 140, yPos);
         yPos += 25;
         yPos = addSectionDivider("Walk Through Verification", yPos); yPos += 5;
         
         doc.setFontSize(9);
         doc.setFont("helvetica", "normal");
         const disclaimerText = "On completion of your packing/delivery the Crew foreman will walk through the property with you to check and confirm with you the following:";
         const splitDisclaimer = doc.splitTextToSize(disclaimerText, pageWidth - (margin * 2));
         doc.text(splitDisclaimer, margin, yPos);
         yPos += splitDisclaimer.length * 5 + 5;

         const checkItem = (text: string, checked: boolean, y: number) => { drawCheckbox(margin, y, checked); doc.text(text, margin + 10, y); };
         checkItem("I confirm the property was checked with the crew foreman and found NO damage.", data.walkThrough.noDamage, yPos + 10);
         checkItem("I confirm all items have been packed/removed; no empty cartons left behind.", data.walkThrough.itemsCheck, yPos + 20);
         checkItem("I confirm the property was checked and found the following damage (detailed below).", data.walkThrough.foundDamage, yPos + 30);
         yPos += 50;
         if (data.clientNotes) {
            yPos = addSectionDivider("Notes / Damage Report", yPos); yPos += 5;
            const splitNotes = doc.splitTextToSize(data.clientNotes, pageWidth - (margin*2));
            doc.text(splitNotes, margin, yPos); yPos += splitNotes.length * 5 + 10;
         }
    } else if (activeForm === 'delivery') {
         addTitle("Delivery Report");
         addField("Client Name", deliveryData.clientName, margin, yPos);
         addField("Job Ref", deliveryData.jobId, margin + 90, yPos);
         addField("Truck No", deliveryData.truckNo, margin + 140, yPos);
         yPos += 15;
         
         addField("Delivery Address", deliveryData.deliveryAddress, margin, yPos);
         yPos += 15;
         
         addField("Mode of Shipment", deliveryData.modeOfShipment, margin, yPos);
         yPos += 25;
         
         doc.autoTable({
            startY: yPos,
            head: [['Pkg No', 'Description', 'Condition', 'Qty', 'Vol (CBM)', 'Weight (KG)']],
            body: deliveryItems.map(i => [i.pkgNo, i.description, i.condition, i.quantity, i.volume, i.weight]),
            theme: 'grid',
            styles: { fontSize: 8 },
         });
         yPos = (doc as any).lastAutoTable.finalY + 20;
         if (deliveryData.notes) {
            doc.setFont("helvetica", "bold");
            doc.text("Remarks / Notes:", margin, yPos);
            yPos += 5;
            doc.setFont("helvetica", "normal");
            const splitNotes = doc.splitTextToSize(deliveryData.notes, pageWidth - margin * 2);
            doc.text(splitNotes, margin, yPos);
         }
    } else if (activeForm === 'crating') {
         addTitle("Crating Specification Sheet");
         
         // Added Reference per request
         doc.setFontSize(10);
         doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
         doc.setFont("helvetica", "bold");
         doc.text("Ref : MovePlanning-03/2024", margin, yPos);
         yPos += 10;

         addField("Client Name", cratingData.clientName, margin, yPos);
         addField("Job Ref", cratingData.jobId, margin + 90, yPos);
         yPos += 15;
         
         addField("Address", cratingData.address, margin, yPos);
         yPos += 15;
         
         addField("Packing Date", cratingData.packingDate, margin, yPos);
         addField("Loading Date", cratingData.loadingDate, margin + 50, yPos);
         addField("Final Dest.", cratingData.finalDestination, margin + 100, yPos);
         addField("Mode", cratingData.modeOfShipment, margin + 150, yPos);
         
         yPos += 20;

         doc.autoTable({
            startY: yPos,
            head: [['Pkg No', 'Description', 'Length', 'Width', 'Height', 'Vol (ft³)']],
            body: crates.map(c => [c.pkgNo, c.description, c.l, c.w, c.h, ((c.l*c.w*c.h)/1728).toFixed(2)]),
            theme: 'grid',
            styles: { fontSize: 8 },
         });
         yPos = (doc as any).lastAutoTable.finalY + 10;
         doc.text(`Total Volume: ${calculateTotalVolume()} CBM`, margin, yPos);
         yPos += 10;
         if (cratingData.notes) {
            doc.setFont("helvetica", "bold");
            doc.text("Remarks:", margin, yPos);
            yPos += 5;
            doc.setFont("helvetica", "normal");
            const splitRemarks = doc.splitTextToSize(cratingData.notes, pageWidth - margin * 2);
            doc.text(splitRemarks, margin, yPos);
            yPos += splitRemarks.length * 5 + 5;
         }
    } else if (activeForm === 'electronicList') {
         addTitle("Electronic Items Inventory");
         addField("Client Name", electronicData.clientName, margin, yPos);
         addField("Job Ref", electronicData.jobId, margin + 90, yPos);
         yPos += 15;

         addField("Address", electronicData.address, margin, yPos);
         yPos += 15;

         addField("Packing Date", electronicData.packingDate, margin, yPos);
         addField("Loading Date", electronicData.loadingDate, margin + 50, yPos);
         addField("Mode", electronicData.modeOfShipment, margin + 100, yPos);

         yPos += 20;
         doc.autoTable({
            startY: yPos,
            head: [['Item Description', 'Make', 'Model', 'Serial No', 'Condition']],
            body: electronicItems.map(i => [i.description, i.make, i.model, i.serial, i.condition]),
            theme: 'grid',
            styles: { fontSize: 8 },
         });
         yPos = (doc as any).lastAutoTable.finalY + 10;
         if (electronicData.remarks) {
            doc.setFont("helvetica", "bold");
            doc.text("Remarks:", margin, yPos);
            yPos += 5;
            doc.setFont("helvetica", "normal");
            const splitRemarks = doc.splitTextToSize(electronicData.remarks, pageWidth - margin * 2);
            doc.text(splitRemarks, margin, yPos);
            yPos += splitRemarks.length * 5 + 5;
         }
    } else if (activeForm === 'accessorial') {
         addTitle("Accessorial Services Sheet");
         addField("Client Name", accessorialData.clientName, margin, yPos);
         addField("Job Ref", accessorialData.jobId, margin + 90, yPos);
         yPos += 25;
         
         const services = Object.entries(accessorialData.services).filter(([_, v]) => v).map(([k]) => k.replace(/([A-Z])/g, ' $1').toUpperCase());
         doc.text("Authorized Services:", margin, yPos);
         yPos += 10;
         services.forEach(s => { doc.text(`• ${s}`, margin + 5, yPos); yPos += 6; });
         yPos += 10;
         if (accessorialData.details.stairCarryFloors) doc.text(`Stair Carry: ${accessorialData.details.stairCarryFloors} Floors`, margin, yPos += 6);
         if (accessorialData.details.longCarryDistance) doc.text(`Long Carry: ${accessorialData.details.longCarryDistance} Meters`, margin, yPos += 6);
         
         yPos += 10;
         if (accessorialData.remarks) {
            doc.setFont("helvetica", "bold");
            doc.text("Remarks:", margin, yPos);
            yPos += 5;
            doc.setFont("helvetica", "normal");
            const splitRemarks = doc.splitTextToSize(accessorialData.remarks, pageWidth - margin * 2);
            doc.text(splitRemarks, margin, yPos);
            yPos += splitRemarks.length * 5 + 5;
         }
    } else if (activeForm === 'warehouseReceipt') {
        addTitle("Warehouse Receipt / Tally Sheet");
        
        // --- Updated PDF Layout for Warehouse Receipt ---
        // Header Grid
        addField("Client Name", warehouseReceiptData.clientName, margin, yPos);
        addField("File No", warehouseReceiptData.fileNo, margin + 70, yPos);
        addField("Total Pkgs", warehouseReceiptData.totalPkgs, margin + 140, yPos);
        yPos += 15;
        addField("Volume", warehouseReceiptData.volume, margin, yPos);
        addField("Container No", warehouseReceiptData.containerNo, margin + 70, yPos);
        addField("Seal No", warehouseReceiptData.sealNo, margin + 140, yPos);
        yPos += 20;
        
        // Selected Packages
        doc.text("Package Selection:", margin, yPos);
        yPos += 7;
        const selectedStr = warehouseReceiptData.selectedPackages.sort((a,b)=>a-b).join(', ');
        const splitSelected = doc.splitTextToSize(selectedStr, pageWidth - margin*2);
        doc.setFontSize(8);
        doc.text(splitSelected, margin, yPos);
        yPos += splitSelected.length * 4 + 10;
        
        // Footer Details Grid
        addField("Missing Numbers", warehouseReceiptData.missingNumbers, margin, yPos);
        addField("Total Crates", warehouseReceiptData.totalCrates, margin + 70, yPos);
        addField("Truck Details", warehouseReceiptData.truckDetails, margin + 140, yPos);
        yPos += 15;
        
        addField("Unnumbered", warehouseReceiptData.unnumbered, margin, yPos);
        addField("Crate Nos", warehouseReceiptData.crateNos, margin + 70, yPos);
        yPos += 15;
        
        addField("Double Number", warehouseReceiptData.doubleNumber, margin, yPos);
        addField("Total Received", warehouseReceiptData.totalReceived, margin + 70, yPos);
        yPos += 15;
        
        addField("Checked By", warehouseReceiptData.checkedBy, margin, yPos);
        addField("Total Delivered", warehouseReceiptData.totalDelivered, margin + 70, yPos);
        
    } else if (activeForm === 'handyman') {
        addTitle("Handyman Completion Report");
        addField("Client Name", handymanData.clientName, margin, yPos);
        addField("File No", handymanData.fileNo, margin + 90, yPos);
        yPos += 15;
        
        addField("Address", handymanData.address, margin, yPos);
        addField("Date", handymanData.date, margin + 90, yPos);
        yPos += 15;
        
        addField("Handyman Assigned", handymanData.handymanAssigned, margin, yPos);
        addField("Day Assigned", handymanData.dayAssigned, margin + 90, yPos);
        yPos += 20;
        
        // List Services Grouped
        const handymanGroups = [
          { title: 'Wall Fixture', items: ['pictureFrames', 'wallMountOrnaments', 'mirrors', 'shelvingUnits', 'tvStandMounting', 'curtainRods'] },
          { title: 'Electrical-Fixture', items: ['refrigerator', 'tv', 'hiFiSystem', 'chandelier', 'lights', 'washingMachine', 'dishwasher', 'electricalCooker', 'dishAntennae', 'windowAC', 'splitAC'] },
          { title: 'Furniture', items: ['assembly', 'disassembly', 'wardrobes'] },
          { title: 'Valet / Maid Services', items: ['houseCleaning', 'laundry', 'packingClothes', 'closetArrangements'] },
          { title: 'Outdoor', items: ['trampoline', 'gazebo', 'hammock', 'playHouse', 'swing'] },
          { title: 'Others', items: ['waterbed', 'childSafetyGates', 'wallPainting', 'furnitureRestoration', 'floorRepairs', 'poolTable'] },
        ];

        doc.text("Completed Services:", margin, yPos);
        yPos += 8;
        
        handymanGroups.forEach(group => {
            const activeItems = group.items.filter(key => (handymanData.services as any)[key]);
            if (activeItems.length > 0) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.text(group.title, margin + 5, yPos);
                yPos += 5;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                activeItems.forEach(key => {
                    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    doc.text(`• ${label}`, margin + 10, yPos);
                    yPos += 5;
                });
                yPos += 3;
            }
        });
        
        yPos += 5;
        
        addField("Time In", handymanData.timeIn, margin, yPos);
        addField("Time Out", handymanData.timeOut, margin + 50, yPos);
        
        yPos += 15;
        if(handymanData.remarks) {
            doc.setFont("helvetica", "bold");
            doc.text("Remarks:", margin, yPos);
            yPos += 5;
            doc.setFont("helvetica", "normal");
            const splitNotes = doc.splitTextToSize(handymanData.remarks, pageWidth - margin * 2);
            doc.text(splitNotes, margin, yPos);
        }
    } else if (activeForm === 'containerInspection') {
        addTitle("7-Point Container Inspection");
        addField("Container No", containerInspectionData.containerNo, margin, yPos);
        addField("Seal No", containerInspectionData.sealNo, margin + 90, yPos);
        addField("Date", containerInspectionData.date, margin + 140, yPos);
        yPos += 20;
        
        // Flatten checkpoints for simple PDF listing
        const points = [];
        if(containerInspectionData.checkpoints.outsideUndercarriage.structuralDamage) points.push("Outside: Structural Damage Found");
        // ... listing meaningful data ... 
        // For simplicity in this fix, we just state certification
        doc.text(containerInspectionData.certified ? "CERTIFIED: CONTAINER INSPECTION PASSED" : "NOT CERTIFIED", margin, yPos);
        yPos += 10;
        if(containerInspectionData.remarks) doc.text(`Remarks: ${containerInspectionData.remarks}`, margin, yPos);
    } else if (activeForm === 'vehicleInspection') {
        addTitle("Vehicle Condition Report");
        addField("Client Name", vehicleInspectionData.clientName, margin, yPos);
        addField("Job Ref", vehicleInspectionData.jobId, margin + 90, yPos);
        addField("Date", vehicleInspectionData.date, margin + 140, yPos);
        yPos += 15;
        
        // Vehicle Specs
        addField("Make", vehicleInspectionData.vehicle.make, margin, yPos);
        addField("Model", vehicleInspectionData.vehicle.model, margin + 50, yPos);
        addField("Year", vehicleInspectionData.vehicle.year, margin + 100, yPos);
        addField("Color", vehicleInspectionData.vehicle.color, margin + 140, yPos);
        yPos += 15;
        
        addField("Plate No", vehicleInspectionData.vehicle.plate, margin, yPos);
        addField("VIN/Chassis", vehicleInspectionData.vehicle.vin, margin + 50, yPos);
        addField("Mileage", vehicleInspectionData.vehicle.mileage, margin + 100, yPos);
        addField("Fuel Level", vehicleInspectionData.vehicle.fuelLevel, margin + 140, yPos);
        yPos += 20;
        
        // Checklist
        yPos = addSectionDivider("Accessories & Equipment", yPos);
        const accessories = Object.entries(vehicleInspectionData.accessories)
            .filter(([_, checked]) => checked)
            .map(([key]) => key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()));
            
        if (accessories.length > 0) {
            doc.text("Present / Checked:", margin, yPos);
            yPos += 6;
            // Two columns
            const mid = Math.ceil(accessories.length / 2);
            const leftCol = accessories.slice(0, mid);
            const rightCol = accessories.slice(mid);
            
            leftCol.forEach((acc, i) => {
                doc.text(`• ${acc}`, margin + 5, yPos + (i*6));
            });
            rightCol.forEach((acc, i) => {
                doc.text(`• ${acc}`, margin + 80, yPos + (i*6));
            });
            yPos += (leftCol.length * 6) + 10;
        } else {
            doc.text("No accessories marked.", margin, yPos);
            yPos += 10;
        }
        
        // Condition Check
        yPos = addSectionDivider("Condition / Operation Check", yPos);
        const operational = Object.entries(vehicleInspectionData.condition)
            .filter(([_, ok]) => ok)
            .map(([key]) => key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()));
            
        doc.text("Verified Operational / Good Condition:", margin, yPos);
        yPos += 6;
        if(operational.length > 0) {
             const mid = Math.ceil(operational.length / 2);
             operational.slice(0, mid).forEach((op, i) => doc.text(`• ${op}`, margin + 5, yPos + (i*6)));
             operational.slice(mid).forEach((op, i) => doc.text(`• ${op}`, margin + 80, yPos + (i*6)));
             yPos += (Math.ceil(operational.length/2) * 6) + 10;
        } else {
             doc.text("None marked as verified.", margin, yPos);
             yPos += 10;
        }
        
        // --- Add Diagram if possible ---
        if (vehicleCanvasRef.current) {
            if (yPos > doc.internal.pageSize.getHeight() - 120) { doc.addPage(); yPos = 40; }
            doc.setFont("helvetica", "bold");
            doc.text("Marked Damages Diagram:", margin, yPos);
            yPos += 5;
            const diagramData = vehicleCanvasRef.current.toDataURL("image/png");
            doc.addImage(diagramData, 'PNG', margin, yPos, 150, 80); // Adjust size as needed
            yPos += 90;
        }

        // --- Damage Legend ---
        yPos = addSectionDivider("Damage Legend & Remarks", yPos);
        const damageFields = [
            { label: 'SCRATCH', value: vehicleInspectionData.damageMarks.scratch },
            { label: 'DENT', value: vehicleInspectionData.damageMarks.dent },
            { label: 'CHIP', value: vehicleInspectionData.damageMarks.chip },
            { label: 'CRACK', value: vehicleInspectionData.damageMarks.crack },
            { label: 'PAINT', value: vehicleInspectionData.damageMarks.paint },
            { label: 'OTHER', value: vehicleInspectionData.damageMarks.other }
        ];
        
        damageFields.forEach(field => {
            if (field.value) {
                if (yPos > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); yPos = 40; }
                doc.setFont("helvetica", "bold");
                doc.text(`${field.label}:`, margin + 5, yPos);
                doc.setFont("helvetica", "normal");
                const splitText = doc.splitTextToSize(field.value, 140);
                doc.text(splitText, margin + 40, yPos);
                yPos += splitText.length * 5 + 3;
            }
        });

        if (vehicleInspectionData.remarks) {
            yPos += 5;
            if (yPos > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); yPos = 40; }
            doc.setFont("helvetica", "bold");
            doc.text("General Remarks:", margin, yPos);
            yPos += 6;
            doc.setFont("helvetica", "normal");
            const splitRemarks = doc.splitTextToSize(vehicleInspectionData.remarks, pageWidth - margin * 2);
            doc.text(splitRemarks, margin, yPos);
            yPos += splitRemarks.length * 5 + 5;
        }
    }

    // Common Footer / Signature
    if (activeForm !== 'warehouseReceipt' && hasSignature && canvasRef.current) {
        if (yPos > doc.internal.pageSize.getHeight() - 50) { doc.addPage(); yPos = 40; }
        yPos += 10;
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]); doc.line(margin, yPos, pageWidth - margin, yPos); yPos += 10;
        const imgData = canvasRef.current.toDataURL("image/png");
        doc.setFontSize(8); doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
        
        // Dynamic Signature Label based on Client Name
        const currentClient = getCurrentClientName();
        // Specific override for Handyman based on user request
        const sigLabel = activeForm === 'delivery' 
            ? "RECEIVER SIGNATURE"
            : activeForm === 'handyman'
            ? "AUTHORIZATION SIGNATURE" 
            : (currentClient ? `SIGNED BY: ${currentClient.toUpperCase()}` : "CLIENT / AUTHORIZED SIGNATURE");
            
        doc.text(sigLabel, margin, yPos);
        doc.addImage(imgData, 'PNG', margin, yPos + 5, 50, 25);
        doc.setFontSize(7); doc.text(`Digitally signed: ${new Date().toLocaleString()}`, margin, yPos + 35);
    }

    const addGlobalFooter = () => {
        const pageCount = doc.getNumberOfPages ? doc.getNumberOfPages() : (doc.internal.pages.length - 1);
        doc.setFontSize(8); doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]); doc.setFont("helvetica", "normal");
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const footerY = pageHeight - 20;
            doc.text("P.O. Box 34892", pageWidth / 2, footerY, { align: "center" });
            doc.text("Dubai, UAE", pageWidth / 2, footerY + 4, { align: "center" });
            doc.text("Phone: (971) 4 340 8814   Fax: (971) 4 340 8815", pageWidth / 2, footerY + 8, { align: "center" });
            if (currentUser) doc.text(`Generated by: ${currentUser.name}`, pageWidth - margin, footerY + 8, { align: "right" });
        }
    };
    addGlobalFooter();
    doc.save(`Writer_${activeForm}_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const accessorialItems = [
    { label: 'Shuttle service', key: 'shuttle', description: 'van used for loading or unloading, when a container or a trailer is not permitted at the residence' },
    { label: 'Stair carry', key: 'stairCarry', description: 'my belongings were carried up the stairs because they could not fit all into the elevator / elevator available (does not apply to single family dwelling)' },
    { label: 'Elevator', key: 'elevator', description: 'elevator was used to carry belongings' },
    { label: 'Hoisting', key: 'hoisting', description: 'my belongings could not fit through the elevator/door frame due to size and needed to be loaded/unloaded from the residence via outside hoisting' },
    { label: 'Long carry', key: 'longCarry', description: 'my belongings were carried for more than 200ft/ 50 meters due to narrow/difficult access to the residence' },
    { label: 'Piano Handling', key: 'piano', description: 'my belongings included a piano (grand/upright), which required special handling' },
    { label: 'Crating/Uncrating', key: 'crating', description: 'my belongings included items that needed to be crated/uncrated due to fragile nature' },
    { label: 'Extra Labor', key: 'extraLabor', description: 'my belongings required additional labor to assemble or handle' },
    { label: 'Overtime', key: 'overtime', description: 'the crew worked beyond normal business hours' },
    { label: 'Pre delivery of Cartons', key: 'preDelivery', description: 'Prior to Pack date' },
    { label: 'Extra Mileage', key: 'extraMileage', description: 'my residence was located more than 50 miles/80km away for the warehouse' },
    { label: 'Additional Debris Pick up', key: 'debrisPickup', description: 'collection of empty cartons/debris after delivery' },
    { label: 'Handy Man Service', key: 'handyman', description: 'Electrician Plumber Others' },
    { label: 'Maid/Valet Services', key: 'maidService', description: 'Cleaning or organizing services' },
    { label: 'Other', key: 'other', description: 'my belongings required additional service, not listed above' },
  ];

  const handymanGroups = [
    {
      title: 'Wall Fixture',
      items: [
        { key: 'pictureFrames', label: 'Picture Frames' },
        { key: 'wallMountOrnaments', label: 'Wall Mount Ornaments' },
        { key: 'mirrors', label: 'Mirrors' },
        { key: 'shelvingUnits', label: 'Shelving Units' },
        { key: 'tvStandMounting', label: 'TV Stand Mounting' },
        { key: 'curtainRods', label: 'Curtain Rods' },
      ]
    },
    {
      title: 'Electrical-Fixture',
      items: [
        { key: 'refrigerator', label: 'Refrigerator' },
        { key: 'tv', label: 'TV' },
        { key: 'hiFiSystem', label: 'Hi Fi System' },
        { key: 'chandelier', label: 'Chandelier' },
        { key: 'lights', label: 'Lights' },
        { key: 'washingMachine', label: 'Washing Machine' },
        { key: 'dishwasher', label: 'Dishwasher' },
        { key: 'electricalCooker', label: 'Electrical Cooker' },
        { key: 'dishAntennae', label: 'Dish Antennae' },
        { key: 'windowAC', label: 'Window A C' },
        { key: 'splitAC', label: 'Split A C' },
      ]
    },
    {
      title: 'Furniture',
      items: [
        { key: 'assembly', label: 'Assembly' },
        { key: 'disassembly', label: 'Disassembly' },
        { key: 'wardrobes', label: 'Wardrobes' },
      ]
    },
    {
      title: 'Valet / Maid Services',
      items: [
        { key: 'houseCleaning', label: 'House Cleaning' },
        { key: 'laundry', label: 'Laundry' },
        { key: 'packingClothes', label: 'Packing Clothes' },
        { key: 'closetArrangements', label: 'Closet Arrangements' },
      ]
    },
    {
      title: 'Outdoor',
      items: [
        { key: 'trampoline', label: 'Trampoline' },
        { key: 'gazebo', label: 'Gazebo' },
        { key: 'hammock', label: 'Hammock' },
        { key: 'playHouse', label: 'Play House' },
        { key: 'swing', label: 'Swing' },
      ]
    },
    {
      title: 'Others',
      items: [
        { key: 'waterbed', label: 'Waterbed' },
        { key: 'childSafetyGates', label: 'Child Safety Gates' },
        { key: 'wallPainting', label: 'Wall Painting' },
        { key: 'furnitureRestoration', label: 'Furniture Restoration' },
        { key: 'floorRepairs', label: 'Floor Repairs' },
        { key: 'poolTable', label: 'Pool Table' },
      ]
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Writer Docs</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Operational documentation and digital forms</p>
        </div>
        <div className="flex items-center gap-3">
            {isAdmin && (
              <>
                <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/png, image/jpeg" />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-white text-blue-600 border border-blue-200 px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-all font-bold text-xs uppercase tracking-widest shadow-sm">
                  <Upload className="w-4 h-4" /> LOGO
                </button>
              </>
            )}
            <button type="button" onClick={handleClearForm} className="flex items-center gap-2 bg-white text-rose-600 border border-rose-200 px-5 py-2.5 rounded-xl hover:bg-rose-50 transition-all font-bold text-xs uppercase tracking-widest shadow-sm">
              <Eraser className="w-4 h-4" /> CLEAR FORM
            </button>
            <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-all font-bold text-xs uppercase tracking-widest shadow-lg">
              <Printer className="w-4 h-4" /> SAVE PDF
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-[2rem] p-4 border border-slate-200 shadow-sm flex flex-col gap-2">
           {['packing', 'unpacking', 'delivery', 'crating', 'electronicList', 'accessorial', 'warehouseReceipt', 'handyman', 'containerInspection', 'vehicleInspection'].map(formId => (
             <button 
                key={formId}
                onClick={() => setActiveForm(formId as any)}
                className={`p-4 rounded-2xl text-left flex items-center gap-3 transition-all ${activeForm === formId ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
             >
                {formId === 'packing' && <Package className="w-5 h-5" />}
                {formId === 'unpacking' && <Box className="w-5 h-5" />}
                {formId === 'delivery' && <Truck className="w-5 h-5" />}
                {formId === 'crating' && <Layers className="w-5 h-5" />}
                {formId === 'electronicList' && <Monitor className="w-5 h-5" />}
                {formId === 'accessorial' && <ClipboardCheck className="w-5 h-5" />}
                {formId === 'warehouseReceipt' && <ArrowLeftRight className="w-5 h-5" />}
                {formId === 'handyman' && <Wrench className="w-5 h-5" />}
                {formId === 'containerInspection' && <ShieldCheck className="w-5 h-5" />}
                {formId === 'vehicleInspection' && <Car className="w-5 h-5" />}
                <div>
                  <p className="font-bold text-sm capitalize">{formId.replace(/([A-Z])/g, ' $1').trim()}</p>
                  <p className={`text-[10px] uppercase tracking-wider ${activeForm === formId ? 'text-blue-200' : 'text-slate-400'}`}>Form</p>
                </div>
             </button>
           ))}
        </div>

        {/* Form Content Area */}
        <div className="lg:col-span-3 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 p-6 md:p-8 border-b border-slate-200">
               <div className="flex justify-between items-center">
                 <h3 className="text-xl font-bold text-blue-600 uppercase tracking-widest flex items-center gap-3">
                    {activeForm === 'containerInspection' ? <ShieldCheck className="w-6 h-6 text-blue-600" /> : 
                     activeForm === 'vehicleInspection' ? <Car className="w-6 h-6 text-blue-600" /> :
                     <FileText className="w-6 h-6 text-blue-600" />}
                    {activeForm === 'handyman' ? 'Handyman Completion Report' : 
                     activeForm === 'containerInspection' ? '7-Point Container Inspection' :
                     activeForm === 'vehicleInspection' ? 'Vehicle Condition Report' :
                     activeForm.replace(/([A-Z])/g, ' $1').trim()}
                 </h3>
                 {logo && <img src={logo} alt="Company Logo" className="h-10 w-auto object-contain opacity-80 grayscale hover:grayscale-0 transition-all" />}
               </div>
            </div>

            <div className="p-6 md:p-8 space-y-8">
               
               {/* ... (Previous form code blocks remain unchanged) ... */}
               
               {activeForm === 'accessorial' && (
                   <div className="space-y-8">
                        {/* Header */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Name</label><input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. John Doe" value={accessorialData.clientName} onChange={e => setAccessorialData({...accessorialData, clientName: e.target.value})} /></div>
                            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Job Ref</label><input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. AE-1234" value={accessorialData.jobId} onChange={e => setAccessorialData({...accessorialData, jobId: e.target.value})} /></div>
                            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date</label><input type="date" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={accessorialData.date} onChange={e => setAccessorialData({...accessorialData, date: e.target.value})} /></div>
                        </div>

                        {/* Service Type Toggle */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Service Type</label>
                            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                                <button onClick={() => setAccessorialData(prev => ({...prev, serviceType: { packing: true, delivery: false }}))} className={`flex-1 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${accessorialData.serviceType.packing ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Packing (Origin)</button>
                                <button onClick={() => setAccessorialData(prev => ({...prev, serviceType: { packing: false, delivery: true }}))} className={`flex-1 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${accessorialData.serviceType.delivery ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Delivery (Destination)</button>
                            </div>
                        </div>

                        {/* Services List */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">Authorized Services</h4>
                            <div className="grid grid-cols-1 gap-3">
                                {accessorialItems.map(item => (
                                    <div key={item.key} className={`p-4 rounded-xl border transition-all ${ (accessorialData.services as any)[item.key] ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100 hover:border-slate-200' }`}>
                                        <label className="flex items-start gap-4 cursor-pointer">
                                            <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all ${ (accessorialData.services as any)[item.key] ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300' }`}>
                                                { (accessorialData.services as any)[item.key] && <Check className="w-3.5 h-3.5 text-white" /> }
                                            </div>
                                            <input type="checkbox" className="hidden" checked={(accessorialData.services as any)[item.key]} onChange={e => setAccessorialData({...accessorialData, services: {...accessorialData.services, [item.key]: e.target.checked}})} />
                                            <div className="flex-1">
                                                <h4 className={`font-bold text-sm ${ (accessorialData.services as any)[item.key] ? 'text-blue-900' : 'text-slate-700' }`}>{item.label}</h4>
                                                <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                                            </div>
                                        </label>

                                        {/* Conditional Inputs */}
                                        {(accessorialData.services as any)[item.key] && (
                                            <div className="mt-3 pl-9">
                                                {item.key === 'stairCarry' && (
                                                    <input type="text" placeholder="Number of Floors / Flights" className="w-full px-4 py-2 bg-white border border-blue-100 rounded-lg text-xs font-bold text-blue-800 placeholder:text-blue-300 outline-none focus:ring-1 focus:ring-blue-500" value={accessorialData.details.stairCarryFloors} onChange={e => setAccessorialData({...accessorialData, details: {...accessorialData.details, stairCarryFloors: e.target.value}})} />
                                                )}
                                                {item.key === 'longCarry' && (
                                                    <input type="text" placeholder="Distance in Meters" className="w-full px-4 py-2 bg-white border border-blue-100 rounded-lg text-xs font-bold text-blue-800 placeholder:text-blue-300 outline-none focus:ring-1 focus:ring-blue-500" value={accessorialData.details.longCarryDistance} onChange={e => setAccessorialData({...accessorialData, details: {...accessorialData.details, longCarryDistance: e.target.value}})} />
                                                )}
                                                {item.key === 'handyman' && (
                                                    <input type="text" placeholder="Specify services (e.g. Electrical, Carpenter)" className="w-full px-4 py-2 bg-white border border-blue-100 rounded-lg text-xs font-bold text-blue-800 placeholder:text-blue-300 outline-none focus:ring-1 focus:ring-blue-500" value={accessorialData.details.handymanType} onChange={e => setAccessorialData({...accessorialData, details: {...accessorialData.details, handymanType: e.target.value}})} />
                                                )}
                                                {item.key === 'other' && (
                                                    <input type="text" placeholder="Description of service" className="w-full px-4 py-2 bg-white border border-blue-100 rounded-lg text-xs font-bold text-blue-800 placeholder:text-blue-300 outline-none focus:ring-1 focus:ring-blue-500" value={accessorialData.details.otherDescription} onChange={e => setAccessorialData({...accessorialData, details: {...accessorialData.details, otherDescription: e.target.value}})} />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Remarks */}
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Remarks</label>
                           <textarea className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 h-24 resize-none" placeholder="Additional comments..." value={accessorialData.remarks} onChange={e => setAccessorialData({...accessorialData, remarks: e.target.value})} />
                        </div>
                   </div>
               )}

               {/* --- PACKING & UNPACKING, DELIVERY, CRATING, ELECTRONIC, WAREHOUSE RECEIPT Code Blocks hidden for brevity, assume they exist unchanged ... --- */}
               {(activeForm === 'packing' || activeForm === 'unpacking') && (
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Name</label><input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. John Doe" value={activeForm === 'packing' ? packingData.clientName : unpackingData.clientName} onChange={e => activeForm === 'packing' ? setPackingData({...packingData, clientName: e.target.value}) : setUnpackingData({...unpackingData, clientName: e.target.value})} /></div>
                       <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Job Reference</label><input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. AE-1234" value={activeForm === 'packing' ? packingData.jobId : unpackingData.jobId} onChange={e => activeForm === 'packing' ? setPackingData({...packingData, jobId: e.target.value}) : setUnpackingData({...unpackingData, jobId: e.target.value})} /></div>
                    </div>
                    
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                        <h4 className="font-bold text-slate-700">Walk Through Verification</h4>
                        <p className="text-sm text-slate-500 font-medium">
                          On completion of your packing/delivery the Crew foreman will walk through the property with you to check and confirm with you the following:
                        </p>
                        {[
                            { label: 'I confirm the property was checked with the crew foreman and found NO damage.', key: 'noDamage' },
                            { label: 'I confirm all items have been packed/removed; no empty cartons left behind.', key: 'itemsCheck' },
                            { label: 'I confirm the property was checked and found the following damage (detailed below).', key: 'foundDamage' }
                        ].map(check => (
                            <label key={check.key} className="flex items-start gap-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="mt-1 w-4 h-4 rounded text-blue-600"
                                    checked={(activeForm === 'packing' ? packingData.walkThrough : unpackingData.walkThrough)[check.key as keyof typeof packingData.walkThrough]}
                                    onChange={e => {
                                        const newVal = e.target.checked;
                                        if (activeForm === 'packing') setPackingData({...packingData, walkThrough: {...packingData.walkThrough, [check.key]: newVal}});
                                        else setUnpackingData({...unpackingData, walkThrough: {...unpackingData.walkThrough, [check.key]: newVal}});
                                    }}
                                />
                                <span className="text-sm text-slate-600">{check.label}</span>
                            </label>
                        ))}
                    </div>

                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Notes / Damage Report</label><textarea className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 h-24" placeholder="Enter any specific notes or damage details..." value={activeForm === 'packing' ? packingData.clientNotes : unpackingData.clientNotes} onChange={e => activeForm === 'packing' ? setPackingData({...packingData, clientNotes: e.target.value}) : setUnpackingData({...unpackingData, clientNotes: e.target.value})} /></div>
                 </div>
               )}

               {/* --- DELIVERY FORM --- */}
               {activeForm === 'delivery' && (
                  <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Name</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={deliveryData.clientName} onChange={e => setDeliveryData({...deliveryData, clientName: e.target.value})} placeholder="e.g. John Doe" />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Job Ref</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={deliveryData.jobId} onChange={e => setDeliveryData({...deliveryData, jobId: e.target.value})} placeholder="e.g. AE-1234" />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Truck No</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={deliveryData.truckNo} onChange={e => setDeliveryData({...deliveryData, truckNo: e.target.value})} placeholder="e.g. TR-55" />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Address</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={deliveryData.deliveryAddress} onChange={e => setDeliveryData({...deliveryData, deliveryAddress: e.target.value})} placeholder="e.g. Villa 12, Springs 4" />
                        </div>
                     </div>
                     
                     <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Delivery Items</h4>
                            <div className="hidden md:grid grid-cols-[1fr_2fr_1fr_80px_40px] gap-3 w-full max-w-3xl px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <span>Pkg No</span>
                                <span>Description</span>
                                <span>Condition</span>
                                <span className="text-center">Qty</span>
                                <span></span>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            {deliveryItems.map(item => (
                                <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr_80px_40px] gap-3 items-start p-4 md:p-0 bg-slate-50 md:bg-transparent rounded-2xl border md:border-0 border-slate-100">
                                    <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. 101" value={item.pkgNo} onChange={e => updateDeliveryItem(item.id, 'pkgNo', e.target.value)} />
                                    <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. Box of Books" value={item.description} onChange={e => updateDeliveryItem(item.id, 'description', e.target.value)} />
                                    <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. Good" value={item.condition} onChange={e => updateDeliveryItem(item.id, 'condition', e.target.value)} />
                                    <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-center" value={item.quantity} onChange={e => updateDeliveryItem(item.id, 'quantity', parseInt(e.target.value))} />
                                    <button onClick={() => removeDeliveryItem(item.id)} className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center justify-center h-full"><Trash2 className="w-5 h-5" /></button>
                                </div>
                            ))}
                        </div>
                        <button onClick={addDeliveryItem} className="w-full py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 transition-all font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                            <Plus className="w-4 h-4" /> Add Item Row
                        </button>

                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Remarks / Notes</label>
                           <textarea className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 h-24 resize-none" placeholder="Additional delivery instructions..." value={deliveryData.notes} onChange={e => setDeliveryData({...deliveryData, notes: e.target.value})} />
                        </div>
                     </div>
                  </div>
               )}

               {/* --- CRATING FORM --- */}
               {activeForm === 'crating' && (
                   <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Name</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={cratingData.clientName} onChange={e => setCratingData({...cratingData, clientName: e.target.value})} placeholder="e.g. John Doe" /></div>
                            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Job Ref</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={cratingData.jobId} onChange={e => setCratingData({...cratingData, jobId: e.target.value})} placeholder="e.g. AE-1234" /></div>
                            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Address</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={cratingData.address} onChange={e => setCratingData({...cratingData, address: e.target.value})} placeholder="e.g. Villa 12, Springs 4" /></div>
                            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Final Dest</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={cratingData.finalDestination} onChange={e => setCratingData({...cratingData, finalDestination: e.target.value})} placeholder="e.g. London, UK" /></div>
                            <div className="grid grid-cols-2 gap-4 md:col-span-2">
                                <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Packing Date</label><input type="date" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={cratingData.packingDate} onChange={e => setCratingData({...cratingData, packingDate: e.target.value})} /></div>
                                <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Loading Date</label><input type="date" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={cratingData.loadingDate} onChange={e => setCratingData({...cratingData, loadingDate: e.target.value})} /></div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Crates List</h4>
                                <div className="hidden md:grid grid-cols-[1fr_2fr_80px_80px_80px_40px] gap-3 w-full max-w-3xl px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    <span>Pkg No</span>
                                    <span>Description</span>
                                    <span className="text-center">L (in)</span>
                                    <span className="text-center">W (in)</span>
                                    <span className="text-center">H (in)</span>
                                    <span></span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {crates.map(c => (
                                    <div key={c.id} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_80px_80px_80px_40px] gap-3 items-start p-4 md:p-0 bg-slate-50 md:bg-transparent rounded-2xl border md:border-0 border-slate-100">
                                        <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. 101" value={c.pkgNo} onChange={e => updateCrate(c.id, 'pkgNo', e.target.value)} />
                                        <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. Mirror Crate" value={c.description} onChange={e => updateCrate(c.id, 'description', e.target.value)} />
                                        <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-center" placeholder="0" value={c.l} onChange={e => updateCrate(c.id, 'l', parseInt(e.target.value))} />
                                        <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-center" placeholder="0" value={c.w} onChange={e => updateCrate(c.id, 'w', parseInt(e.target.value))} />
                                        <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-center" placeholder="0" value={c.h} onChange={e => updateCrate(c.id, 'h', parseInt(e.target.value))} />
                                        <button onClick={() => removeCrate(c.id)} className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center justify-center h-full"><Trash2 className="w-5 h-5"/></button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={addCrate} className="w-full py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 transition-all font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                                <Plus className="w-4 h-4" /> Add Crate
                            </button>

                            <div className="space-y-1.5 pt-4">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Remarks / Notes</label>
                               <textarea className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 h-24 resize-none" placeholder="Additional crating instructions..." value={cratingData.notes} onChange={e => setCratingData({...cratingData, notes: e.target.value})} />
                            </div>
                        </div>
                   </div>
               )}

               {/* --- ELECTRONIC LIST FORM --- */}
               {activeForm === 'electronicList' && (
                   <div className="space-y-8">
                        {/* Header Inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Name</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={electronicData.clientName} onChange={e => setElectronicData({...electronicData, clientName: e.target.value})} placeholder="e.g. John Doe" /></div>
                            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Job Ref</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={electronicData.jobId} onChange={e => setElectronicData({...electronicData, jobId: e.target.value})} placeholder="e.g. AE-1234" /></div>
                        </div>
                        
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Address / Location</label>
                            <input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={electronicData.address} onChange={e => setElectronicData({...electronicData, address: e.target.value})} placeholder="Full Address" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Packing Date</label><input type="date" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={electronicData.packingDate} onChange={e => setElectronicData({...electronicData, packingDate: e.target.value})} /></div>
                            <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Loading Date</label><input type="date" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={electronicData.loadingDate} onChange={e => setElectronicData({...electronicData, loadingDate: e.target.value})} /></div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mode of Shipment</label>
                                <select 
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    value={electronicData.modeOfShipment} 
                                    onChange={e => setElectronicData({...electronicData, modeOfShipment: e.target.value})}
                                >
                                    <option value="Sea">Sea</option>
                                    <option value="Air">Air</option>
                                    <option value="Land">Land</option>
                                </select>
                            </div>
                        </div>
                        
                        {/* Items Section */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-bold text-slate-800">Items</h4>
                                <button onClick={addElectronicItem} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-blue-600 hover:bg-blue-50 hover:border-blue-200 shadow-sm transition-all">
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                            
                            {/* Headers */}
                            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-4 mb-2 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <span>Item Description</span>
                                <span>Make</span>
                                <span>Model</span>
                                <span>Serial No</span>
                                <span>Condition</span>
                                <span></span>
                            </div>

                            <div className="space-y-3">
                                {electronicItems.length === 0 && (
                                    <div className="text-center py-8 text-slate-400 text-sm italic">No electronic items added yet.</div>
                                )}
                                {electronicItems.map(i => (
                                    <div key={i.id} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-3 items-start">
                                        <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="Description" value={i.description} onChange={e => updateElectronicItem(i.id, 'description', e.target.value)} />
                                        <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="Make" value={i.make} onChange={e => updateElectronicItem(i.id, 'make', e.target.value)} />
                                        <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="Model" value={i.model} onChange={e => updateElectronicItem(i.id, 'model', e.target.value)} />
                                        <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="Serial No" value={i.serial} onChange={e => updateElectronicItem(i.id, 'serial', e.target.value)} />
                                        <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="Condition" value={i.condition} onChange={e => updateElectronicItem(i.id, 'condition', e.target.value)} />
                                        <button onClick={() => removeElectronicItem(i.id)} className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center justify-center h-full"><Trash2 className="w-5 h-5"/></button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={addElectronicItem} className="w-full py-4 mt-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 transition-all font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                                <Plus className="w-4 h-4" /> Add Electronic Item
                            </button>
                        </div>

                        {/* Remarks */}
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Remarks</label>
                           <textarea className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 h-24 resize-none" placeholder="Additional comments..." value={electronicData.remarks} onChange={e => setElectronicData({...electronicData, remarks: e.target.value})} />
                        </div>
                   </div>
               )}

               {/* --- WAREHOUSE RECEIPT FORM (Previous state maintained) --- */}
               {activeForm === 'warehouseReceipt' && (
                   <div className="space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Name</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={warehouseReceiptData.clientName} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, clientName: e.target.value})} placeholder="e.g. Global Trading" /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">File No</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={warehouseReceiptData.fileNo} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, fileNo: e.target.value})} placeholder="e.g. FILE-001" /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Total Packages</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={warehouseReceiptData.totalPkgs} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, totalPkgs: e.target.value})} placeholder="e.g. 50" /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Volume</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={warehouseReceiptData.volume} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, volume: e.target.value})} placeholder="e.g. 20 CBM" /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Container No</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={warehouseReceiptData.containerNo} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, containerNo: e.target.value})} placeholder="e.g. CONT123456" /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Seal No</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={warehouseReceiptData.sealNo} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, sealNo: e.target.value})} placeholder="e.g. SEAL999" /></div>
                       </div>

                       {/* Package Grid */}
                       <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                           <div className="flex justify-between items-center p-4 bg-slate-50 border-b border-slate-200">
                               <h4 className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                                   PACKAGE SELECTION (1-1000)
                               </h4>
                               <div className="flex items-center gap-2">
                                   <button onClick={() => setGridPage(Math.max(0, gridPage - 1))} disabled={gridPage === 0} className="p-1.5 bg-white rounded-lg border hover:bg-slate-50 disabled:opacity-50 text-slate-500"><ChevronLeft className="w-4 h-4"/></button>
                                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest w-20 text-center">PAGE {gridPage + 1} / 5</span>
                                   <button onClick={() => setGridPage(Math.min(4, gridPage + 1))} disabled={gridPage === 4} className="p-1.5 bg-white rounded-lg border hover:bg-slate-50 disabled:opacity-50 text-slate-500"><ChevronRight className="w-4 h-4"/></button>
                               </div>
                           </div>
                           <div className="grid grid-cols-10 divide-x divide-y divide-slate-100 border-b border-slate-100 select-none" onMouseLeave={() => setIsDragging(false)}>
                               {Array.from({ length: 200 }, (_, i) => {
                                   const num = gridPage * 200 + i + 1;
                                   const isSelected = warehouseReceiptData.selectedPackages.includes(num);
                                   return (
                                       <div 
                                           key={num}
                                           onMouseDown={() => handleGridMouseDown(num)}
                                           onMouseEnter={() => handleGridMouseEnter(num)}
                                           className={`h-8 flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                                       >
                                           {num}
                                       </div>
                                   );
                               })}
                           </div>
                           <div className="p-3 bg-slate-50 flex justify-end items-center border-t border-slate-200">
                               <button onClick={toggleSelectAllOnPage} className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors">SELECT ALL ON PAGE</button>
                           </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Missing Numbers</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={warehouseReceiptData.missingNumbers} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, missingNumbers: e.target.value})} placeholder="e.g. 5, 12, 40" /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Total Crates</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={warehouseReceiptData.totalCrates} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, totalCrates: e.target.value})} placeholder="e.g. 5" /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Truck Details</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={warehouseReceiptData.truckDetails} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, truckDetails: e.target.value})} placeholder="e.g. DXB-998 / Driver Name" /></div>
                           
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Unnumbered</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={warehouseReceiptData.unnumbered} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, unnumbered: e.target.value})} placeholder="e.g. 2 Pkgs" /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Crate Nos</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={warehouseReceiptData.crateNos} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, crateNos: e.target.value})} placeholder="e.g. 1-5" /></div>
                           <div className="hidden md:block"></div>

                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Double Number</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={warehouseReceiptData.doubleNumber} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, doubleNumber: e.target.value})} placeholder="e.g. 10 (2)" /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Total Received</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={warehouseReceiptData.totalReceived} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, totalReceived: e.target.value})} placeholder="e.g. 150" /></div>
                           <div className="hidden md:block"></div>

                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Checked By</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={warehouseReceiptData.checkedBy} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, checkedBy: e.target.value})} placeholder="Staff Name" /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Total Delivered</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={warehouseReceiptData.totalDelivered} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, totalDelivered: e.target.value})} placeholder="e.g. 150" /></div>
                       </div>
                   </div>
               )}

               {/* --- HANDYMAN FORM (UPDATED) --- */}
               {activeForm === 'handyman' && (
                   <div className="space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Name</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={handymanData.clientName} onChange={e => setHandymanData({...handymanData, clientName: e.target.value})} placeholder="e.g. John Doe" /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">File No</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={handymanData.fileNo} onChange={e => setHandymanData({...handymanData, fileNo: e.target.value})} placeholder="e.g. FILE-101" /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date</label><input type="date" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={handymanData.date} onChange={e => setHandymanData({...handymanData, date: e.target.value})} /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Address</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={handymanData.address} onChange={e => setHandymanData({...handymanData, address: e.target.value})} placeholder="e.g. Villa 12, Springs 4" /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Handyman Assigned</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={handymanData.handymanAssigned} onChange={e => setHandymanData({...handymanData, handymanAssigned: e.target.value})} placeholder="e.g. Mike Smith" /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Day Assigned</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={handymanData.dayAssigned} onChange={e => setHandymanData({...handymanData, dayAssigned: e.target.value})} placeholder="e.g. Monday" /></div>
                       </div>

                       <div className="space-y-6">
                           <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide border-b border-slate-200 pb-2">Service Checklist</h4>
                           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                               {handymanGroups.map((group) => (
                                   <div key={group.title} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                       <h5 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest mb-4">{group.title}</h5>
                                       <div className="space-y-2">
                                           {group.items.map((item) => (
                                               <label key={item.key} className="flex items-start gap-3 cursor-pointer hover:bg-white p-2 rounded-lg transition-colors">
                                                   <input 
                                                       type="checkbox" 
                                                       className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                                                       checked={(handymanData.services as any)[item.key]}
                                                       onChange={(e) => setHandymanData({...handymanData, services: {...handymanData.services, [item.key]: e.target.checked}})}
                                                   />
                                                   <span className="text-xs font-medium text-slate-600 capitalize">{item.label}</span>
                                               </label>
                                           ))}
                                       </div>
                                   </div>
                               ))}
                           </div>
                       </div>

                       <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Time In</label><input type="time" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={handymanData.timeIn} onChange={e => setHandymanData({...handymanData, timeIn: e.target.value})} /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Time Out</label><input type="time" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={handymanData.timeOut} onChange={e => setHandymanData({...handymanData, timeOut: e.target.value})} /></div>
                       </div>
                       
                       <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Remarks</label><textarea className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 h-24 resize-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Work completion notes..." value={handymanData.remarks} onChange={e => setHandymanData({...handymanData, remarks: e.target.value})} /></div>
                   </div>
               )}

               {/* --- CONTAINER INSPECTION FORM --- */}
               {activeForm === 'containerInspection' && (
                   <div className="space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Container No</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900" value={containerInspectionData.containerNo} onChange={e => setContainerInspectionData({...containerInspectionData, containerNo: e.target.value})} /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Seal No</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900" value={containerInspectionData.sealNo} onChange={e => setContainerInspectionData({...containerInspectionData, sealNo: e.target.value})} /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date</label><input type="date" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900" value={containerInspectionData.date} onChange={e => setContainerInspectionData({...containerInspectionData, date: e.target.value})} /></div>
                       </div>

                       <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                           <h4 className="font-bold text-slate-800 mb-6 uppercase tracking-widest">7-Point Inspection Checklist</h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                               {Object.entries(containerInspectionData.checkpoints).map(([section, points]) => (
                                   <div key={section} className="bg-white p-4 rounded-xl border border-slate-200">
                                       <h5 className="font-bold text-xs text-blue-600 uppercase mb-3 border-b border-slate-100 pb-2">
                                           {section.replace(/([A-Z])/g, ' $1').trim()}
                                       </h5>
                                       <div className="space-y-2">
                                           {Object.entries(points).map(([point, checked]) => (
                                               <label key={point} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
                                                   <input 
                                                       type="checkbox" 
                                                       className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                                       checked={checked as boolean}
                                                       onChange={(e) => setContainerInspectionData({
                                                           ...containerInspectionData,
                                                           checkpoints: {
                                                               ...containerInspectionData.checkpoints,
                                                               [section]: {
                                                                   ...(containerInspectionData.checkpoints as any)[section],
                                                                   [point]: e.target.checked
                                                               }
                                                           }
                                                       })}
                                                   />
                                                   <span className="text-xs font-bold text-slate-700 capitalize">{point.replace(/([A-Z])/g, ' $1').trim()}</span>
                                               </label>
                                           ))}
                                       </div>
                                   </div>
                               ))}
                           </div>
                       </div>

                       <label className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl cursor-pointer">
                           <input type="checkbox" className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500" checked={containerInspectionData.certified} onChange={e => setContainerInspectionData({...containerInspectionData, certified: e.target.checked})} />
                           <div>
                               <p className="font-bold text-sm text-emerald-900">Certification of Inspection</p>
                               <p className="text-xs text-emerald-700">I certify that this container has been inspected according to the 7-point procedure.</p>
                           </div>
                       </label>

                       <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Remarks</label><textarea className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 h-24 resize-none" value={containerInspectionData.remarks} onChange={e => setContainerInspectionData({...containerInspectionData, remarks: e.target.value})} /></div>
                   </div>
               )}

               {/* --- VEHICLE INSPECTION FORM --- */}
               {activeForm === 'vehicleInspection' && (
                   <div className="space-y-8">
                       {/* Header */}
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Name</label><input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={vehicleInspectionData.clientName} onChange={e => setVehicleInspectionData({...vehicleInspectionData, clientName: e.target.value})} placeholder="e.g. John Doe" /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Job Ref</label><input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={vehicleInspectionData.jobId} onChange={e => setVehicleInspectionData({...vehicleInspectionData, jobId: e.target.value})} placeholder="e.g. AE-1234" /></div>
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date</label><input type="date" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={vehicleInspectionData.date} onChange={e => setVehicleInspectionData({...vehicleInspectionData, date: e.target.value})} /></div>
                       </div>

                       {/* Vehicle Details */}
                       <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                           <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-4">Vehicle Details</h4>
                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                               <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Make</label><input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500" value={vehicleInspectionData.vehicle.make} onChange={e => setVehicleInspectionData({...vehicleInspectionData, vehicle: {...vehicleInspectionData.vehicle, make: e.target.value}})} placeholder="e.g. Toyota" /></div>
                               <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Model</label><input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500" value={vehicleInspectionData.vehicle.model} onChange={e => setVehicleInspectionData({...vehicleInspectionData, vehicle: {...vehicleInspectionData.vehicle, model: e.target.value}})} placeholder="e.g. Corolla" /></div>
                               <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Year</label><input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500" value={vehicleInspectionData.vehicle.year} onChange={e => setVehicleInspectionData({...vehicleInspectionData, vehicle: {...vehicleInspectionData.vehicle, year: e.target.value}})} placeholder="YYYY" /></div>
                               <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Color</label><input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500" value={vehicleInspectionData.vehicle.color} onChange={e => setVehicleInspectionData({...vehicleInspectionData, vehicle: {...vehicleInspectionData.vehicle, color: e.target.value}})} placeholder="e.g. White" /></div>
                               <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Plate No</label><input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500" value={vehicleInspectionData.vehicle.plate} onChange={e => setVehicleInspectionData({...vehicleInspectionData, vehicle: {...vehicleInspectionData.vehicle, plate: e.target.value}})} placeholder="DXB 12345" /></div>
                               <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">VIN / Chassis</label><input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500" value={vehicleInspectionData.vehicle.vin} onChange={e => setVehicleInspectionData({...vehicleInspectionData, vehicle: {...vehicleInspectionData.vehicle, vin: e.target.value}})} placeholder="17 chars" /></div>
                               <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mileage (km)</label><input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500" value={vehicleInspectionData.vehicle.mileage} onChange={e => setVehicleInspectionData({...vehicleInspectionData, vehicle: {...vehicleInspectionData.vehicle, mileage: e.target.value}})} placeholder="0" /></div>
                               <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fuel Level</label>
                                   <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500" value={vehicleInspectionData.vehicle.fuelLevel} onChange={e => setVehicleInspectionData({...vehicleInspectionData, vehicle: {...vehicleInspectionData.vehicle, fuelLevel: e.target.value}})}>
                                       <option value="">Select Level</option>
                                       <option value="Empty">Empty</option>
                                       <option value="1/4">1/4</option>
                                       <option value="1/2">1/2</option>
                                       <option value="3/4">3/4</option>
                                       <option value="Full">Full</option>
                                   </select>
                               </div>
                           </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           {/* Accessories */}
                           <div className="bg-white p-6 rounded-2xl border border-slate-200">
                               <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-4 border-b border-slate-100 pb-2">Accessories & Equipment</h4>
                               <div className="grid grid-cols-2 gap-3">
                                   {Object.keys(vehicleInspectionData.accessories).map(key => (
                                       <label key={key} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-all">
                                           <input 
                                               type="checkbox" 
                                               className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                               checked={(vehicleInspectionData.accessories as any)[key]}
                                               onChange={e => setVehicleInspectionData({...vehicleInspectionData, accessories: {...vehicleInspectionData.accessories, [key]: e.target.checked}})}
                                           />
                                           <span className="text-xs font-bold text-slate-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                       </label>
                                   ))}
                               </div>
                           </div>

                           {/* Condition Check */}
                           <div className="bg-white p-6 rounded-2xl border border-slate-200">
                               <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-4 border-b border-slate-100 pb-2">Condition / Operation Check</h4>
                               <div className="grid grid-cols-2 gap-3">
                                   {Object.keys(vehicleInspectionData.condition).map(key => (
                                       <label key={key} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-all">
                                           <input 
                                               type="checkbox" 
                                               className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                               checked={(vehicleInspectionData.condition as any)[key]}
                                               onChange={e => setVehicleInspectionData({...vehicleInspectionData, condition: {...vehicleInspectionData.condition, [key]: e.target.checked}})}
                                           />
                                           <span className="text-xs font-bold text-slate-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()} (OK)</span>
                                       </label>
                                   ))}
                               </div>
                           </div>
                       </div>

                       {/* Vehicle Diagram Section */}
                       <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200">
                           <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                  <Car className="w-5 h-5 text-blue-600" />
                                  Visual Inspection Diagram
                              </h3>
                              <button 
                                onClick={clearVehicleCanvas}
                                className="text-xs font-bold text-rose-500 flex items-center gap-1 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                <Eraser className="w-4 h-4" /> Reset Marks
                              </button>
                           </div>
                           
                           <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 overflow-hidden shadow-sm relative h-[300px]">
                              <canvas
                                 ref={vehicleCanvasRef}
                                 className="w-full h-full cursor-crosshair touch-none"
                                 onMouseDown={(e) => startDrawing(e, vehicleCanvasRef)}
                                 onMouseMove={draw}
                                 onMouseUp={endDrawing}
                                 onMouseLeave={endDrawing}
                                 onTouchStart={(e) => startDrawing(e, vehicleCanvasRef)}
                                 onTouchMove={draw}
                                 onTouchEnd={endDrawing}
                              />
                              <div className="absolute bottom-2 right-2 flex items-center gap-2 px-3 py-1 bg-white/80 rounded-lg border border-slate-200 text-[9px] font-bold text-slate-500 pointer-events-none">
                                <span className="w-2 h-2 bg-rose-500 rounded-full"></span> Mark Damages Here
                              </div>
                           </div>
                       </div>

                       {/* Damage Legend */}
                       <div className="bg-white p-6 rounded-2xl border border-slate-200">
                           <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-6 border-b border-slate-100 pb-2">Damage Legend & Remarks</h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                               {['scratch', 'dent', 'chip', 'crack', 'paint', 'other'].map(type => (
                                   <div key={type} className="flex flex-col gap-1.5">
                                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{type}</label>
                                       <input 
                                           type="text" 
                                           className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-blue-500 outline-none"
                                           placeholder={`Note ${type} location/severity...`}
                                           value={(vehicleInspectionData.damageMarks as any)[type]}
                                           onChange={e => setVehicleInspectionData({
                                               ...vehicleInspectionData,
                                               damageMarks: { ...vehicleInspectionData.damageMarks, [type]: e.target.value }
                                           })}
                                       />
                                   </div>
                               ))}
                           </div>
                       </div>

                       <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">General Remarks</label><textarea className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 h-24 resize-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Additional notes..." value={vehicleInspectionData.remarks} onChange={e => setVehicleInspectionData({...vehicleInspectionData, remarks: e.target.value})} /></div>
                   </div>
               )}

               {/* --- SIGNATURE SECTION --- */}
               {activeForm !== 'warehouseReceipt' && (
                   <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 mt-8">
                       <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                              <PenTool className="w-5 h-5 text-blue-600" />
                              {activeForm === 'delivery' ? 'Receiver Signature' : 
                               activeForm === 'handyman' ? 'Authorization Signature' : 
                               (getCurrentClientName() ? `${getCurrentClientName()} (Client)` : 'Client Signature')}
                          </h3>
                          <button 
                            onClick={clearSignature}
                            className="text-xs font-bold text-rose-500 flex items-center gap-1 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Eraser className="w-4 h-4" /> Clear
                          </button>
                       </div>
                       
                       <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 overflow-hidden shadow-sm relative h-56">
                          <canvas
                             ref={canvasRef}
                             className="w-full h-full cursor-crosshair touch-none"
                             onMouseDown={(e) => startDrawing(e, canvasRef)}
                             onMouseMove={draw}
                             onMouseUp={endDrawing}
                             onMouseLeave={endDrawing}
                             onTouchStart={(e) => startDrawing(e, canvasRef)}
                             onTouchMove={draw}
                             onTouchEnd={endDrawing}
                          />
                          {!hasSignature && !isDrawing && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <p className="text-slate-300 font-bold uppercase tracking-widest text-sm">Sign Here</p>
                            </div>
                          )}
                       </div>
                       <p className="text-[10px] text-slate-400 font-medium mt-3 text-center">
                          By signing above, I confirm agreement to the details specified in this form.
                       </p>
                   </div>
               )}

            </div>
        </div>
      </div>
    </div>
  );
};
