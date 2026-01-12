
import React, { useState, useRef, useEffect } from 'react';
import { FileText, Package, Box, Truck, Eraser, PenTool, Plus, Trash2, Printer, ClipboardCheck, Layers, ArrowLeftRight, ChevronLeft, ChevronRight, CheckSquare, Square, Monitor, Upload, Image as ImageIcon, Wrench, ShieldCheck, PenSquare, Car } from 'lucide-react';
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
  description: string;
  condition: string;
  quantity: number;
}

interface CratingItem {
  id: string;
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
}

interface ContainerInspectionForm {
  date: string;
  containerNo: string;
  sealNo: string;
  inspectedBy: string;
  verifiedBy: string;
  remarks: string;
  points: {
    p1_structuralDamage: boolean;
    p1_supportBeams: boolean;
    p1_foreignObjects: boolean;
    p2_lockingMechanisms: boolean;
    p2_looseBolts: boolean;
    p2_hingesSecure: boolean;
    p3_repairBeams: boolean;
    p3_insideRepairs: boolean;
    p4_repairBeams: boolean;
    p4_insideRepairs: boolean;
    p5_corrugated: boolean;
    p5_interiorBlocks: boolean;
    p5_ventsVisible: boolean;
    p6_supportBeams: boolean;
    p6_ventHoles: boolean;
    p6_foreignObjects: boolean;
    p7_floorFlat: boolean;
    p7_floorUniform: boolean;
    p7_floorRepairs: boolean;
    p8_sealAffixed: boolean;
    p8_sealISO: boolean;
    p8_sealBroken: boolean;
  }
}

interface VehicleConditionForm {
  // Customer Info
  customerName: string; address: string; phone: string;
  dealerName: string; dealerAddress: string; dealerPhone: string;
  // Vehicle Info
  year: string; make: string; model: string; color: string;
  style: string; body: string; vin: string; license: string; mileage: string;
  // Options
  options: Record<string, boolean>;
  // Damage Zones 1-21
  damageZones: Record<string, string>;
  // Interior
  interiorGeneral: 'Clean' | 'Average' | 'Dirty';
  interiorSpecific: Record<string, { good: boolean; worn: boolean; burns: boolean; rips: boolean; stain: boolean }>;
  interiorDash: { dent: boolean; crack: boolean; holes: boolean };
  // Mechanical
  mechanical: {
    engine: 'Smooth' | 'Rough' | 'Knock' | '';
    trans: 'Smooth OK' | 'Slips' | '';
    airBlowsHot: boolean;
    brakes: 'Seems OK' | 'Difficult' | '';
    exhaust: 'Seems OK' | 'Needs Replacement' | '';
    powerMalfunction: { windows: boolean; seats: boolean; locks: boolean; roof: boolean };
    soundInoperative: boolean;
  };
  // Tires
  tires: Record<string, 'Good' | 'Fair' | 'Poor' | ''>;
  spareMissing: boolean;
  // Footer
  carKey: 'Yes' | 'No';
  carDocs: 'Yes' | 'No';
  date: string;
}

interface WriterDocsProps {
  logo?: string;
  onUpdateLogo?: (base64: string) => void;
  isAdmin?: boolean;
  currentUser?: UserProfile;
}

export const WriterDocs: React.FC<WriterDocsProps> = ({ logo, onUpdateLogo, isAdmin, currentUser }) => {
  const [activeForm, setActiveForm] = useState<'packing' | 'unpacking' | 'delivery' | 'crating' | 'electronicList' | 'accessorial' | 'warehouseReceipt' | 'handyman' | 'containerInspection' | 'vehicleCondition'>('packing');
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
    clientName: '', jobId: '', date: new Date().toISOString().split('T')[0], truckNo: '', notes: ''
  });
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>([]);

  const [cratingData, setCratingData] = useState({
    clientName: '', jobId: '', date: new Date().toISOString().split('T')[0], notes: ''
  });
  const [crates, setCrates] = useState<CratingItem[]>([]);

  const [electronicData, setElectronicData] = useState({
    clientName: '', jobId: '', date: new Date().toISOString().split('T')[0]
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
    details: { stairCarryFloors: '', longCarryDistance: '', handymanType: '', otherDescription: '' }
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
    }
  });

  const [containerData, setContainerData] = useState<ContainerInspectionForm>({
    date: new Date().toISOString().split('T')[0], containerNo: '', sealNo: '', inspectedBy: '', verifiedBy: '', remarks: '',
    points: {
      p1_structuralDamage: false, p1_supportBeams: false, p1_foreignObjects: false,
      p2_lockingMechanisms: false, p2_looseBolts: false, p2_hingesSecure: false,
      p3_repairBeams: false, p3_insideRepairs: false,
      p4_repairBeams: false, p4_insideRepairs: false,
      p5_corrugated: false, p5_interiorBlocks: false, p5_ventsVisible: false,
      p6_supportBeams: false, p6_ventHoles: false, p6_foreignObjects: false,
      p7_floorFlat: false, p7_floorUniform: false, p7_floorRepairs: false,
      p8_sealAffixed: false, p8_sealISO: false, p8_sealBroken: false
    }
  });

  const [vehicleConditionData, setVehicleConditionData] = useState<VehicleConditionForm>({
    customerName: '', address: '', phone: '',
    dealerName: '', dealerAddress: '', dealerPhone: '',
    year: '', make: '', model: '', color: '', style: '', body: '', vin: '', license: '', mileage: '',
    options: {
        abs: false, bedliner: false, cruise: false, moonRoof: false, powerWin: false, wideTires: false,
        airCond: false, camperShell: false, customBumper: false, powerLocks: false, roofRack: false, sportWheels: false,
        radio: false, cd: false, leather: false, powerSeats: false, runningBoards: false, stereo: false,
        autoTrans: false, cdChanger: false, luxuryPkg: false, powerSteering: false, rearWindow: false, towPkg: false, tiltWheel: false
    },
    damageZones: Object.fromEntries(Array.from({length: 21}, (_, i) => [(i+1).toString(), ''])),
    interiorGeneral: 'Average',
    interiorSpecific: {
        frontCarpet: { good: false, worn: false, burns: false, rips: false, stain: false },
        rearCarpet: { good: false, worn: false, burns: false, rips: false, stain: false },
        frontSeat: { good: false, worn: false, burns: false, rips: false, stain: false },
        rearSeat: { good: false, worn: false, burns: false, rips: false, stain: false },
        headliner: { good: false, worn: false, burns: false, rips: false, stain: false },
        doorPanels: { good: false, worn: false, burns: false, rips: false, stain: false },
    },
    interiorDash: { dent: false, crack: false, holes: false },
    mechanical: {
        engine: '', trans: '', airBlowsHot: false, brakes: '', exhaust: '',
        powerMalfunction: { windows: false, seats: false, locks: false, roof: false },
        soundInoperative: false
    },
    tires: { rightFront: '', leftFront: '', rightRear: '', leftRear: '', spare: '' },
    spareMissing: false,
    carKey: 'Yes', carDocs: 'Yes', date: new Date().toISOString().split('T')[0]
  });
  
  // Warehouse UI State
  const [gridPage, setGridPage] = useState(0); 
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select');

  // --- Signature Canvas Logic ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = 160;
      }
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000000';
      }
    }
  }, [activeForm]);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
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

  const startDrawing = (e: any) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx?.lineTo(x, y);
    ctx?.stroke();
    setHasSignature(true);
  };

  const endDrawing = () => {
    setIsDrawing(false);
    canvasRef.current?.getContext('2d')?.closePath();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  // --- Helpers ---
  const addDeliveryItem = () => setDeliveryItems([...deliveryItems, { id: Date.now().toString(), description: '', condition: 'Good', quantity: 1 }]);
  const addCrate = () => setCrates([...crates, { id: Date.now().toString(), description: '', l: 0, w: 0, h: 0 }]);
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

  const handleSelectAllCurrentPage = () => {
      const start = gridPage * 200 + 1;
      const end = Math.min((gridPage + 1) * 200, 1000);
      const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      const allSelected = range.every(num => warehouseReceiptData.selectedPackages.includes(num));
      setWarehouseReceiptData(prev => {
          let newSelection = [...prev.selectedPackages];
          if (allSelected) newSelection = newSelection.filter(n => !range.includes(n));
          else newSelection = [...newSelection, ...range.filter(n => !newSelection.includes(n))];
          return { ...prev, selectedPackages: newSelection };
      });
  };

  const handleClearForm = () => {
    const today = new Date().toISOString().split('T')[0];
    clearSignature();
    switch (activeForm) {
      case 'packing':
        setPackingData({ clientName: '', jobId: '', date: today, walkThrough: { noDamage: false, itemsCheck: false, foundDamage: false }, clientNotes: '' });
        break;
      case 'unpacking':
        setUnpackingData({ clientName: '', jobId: '', date: today, walkThrough: { noDamage: false, itemsCheck: false, foundDamage: false }, clientNotes: '' });
        break;
      case 'delivery':
        setDeliveryData({ clientName: '', jobId: '', date: today, truckNo: '', notes: '' });
        setDeliveryItems([]);
        break;
      case 'crating':
        setCratingData({ clientName: '', jobId: '', date: today, notes: '' });
        setCrates([]);
        break;
      case 'electronicList':
        setElectronicData({ clientName: '', jobId: '', date: today });
        setElectronicItems([]);
        break;
      case 'accessorial':
        setAccessorialData({ clientName: '', jobId: '', date: today, serviceType: { packing: false, delivery: false }, services: { shuttle: false, stairCarry: false, elevator: false, hoisting: false, longCarry: false, piano: false, crating: false, extraLabor: false, overtime: false, preDelivery: false, extraMileage: false, debrisPickup: false, handyman: false, maidService: false, other: false }, details: { stairCarryFloors: '', longCarryDistance: '', handymanType: '', otherDescription: '' } });
        break;
      case 'warehouseReceipt':
        setWarehouseReceiptData({ clientName: '', fileNo: '', date: today, type: 'Export', mode: 'Sea', whLocation: '', totalPkgs: '', volume: '', containerNo: '', sealNo: '', truckDetails: '', missingNumbers: '', unnumbered: '', doubleNumber: '', totalCrates: '', crateNos: '', totalReceived: '', totalDelivered: '', checkedBy: '', selectedPackages: [] });
        setGridPage(0);
        break;
      case 'handyman':
        setHandymanData({
            fileNo: '', date: today, clientName: '', address: '', handymanAssigned: '', dayAssigned: '', timeIn: '', timeOut: '',
            services: { pictureFrames: false, wallMountOrnaments: false, mirrors: false, shelvingUnits: false, tvStandMounting: false, curtainRods: false, refrigerator: false, tv: false, hiFiSystem: false, chandelier: false, lights: false, washingMachine: false, dishwasher: false, electricalCooker: false, dishAntennae: false, windowAC: false, splitAC: false, waterbed: false, childSafetyGates: false, wallPainting: false, furnitureRestoration: false, floorRepairs: false, poolTable: false, assembly: false, disassembly: false, wardrobes: false, trampoline: false, gazebo: false, hammock: false, playHouse: false, swing: false, houseCleaning: false, laundry: false, packingClothes: false, closetArrangements: false }
        });
        break;
      case 'containerInspection':
        setContainerData({
            date: today, containerNo: '', sealNo: '', inspectedBy: '', verifiedBy: '', remarks: '',
            points: { p1_structuralDamage: false, p1_supportBeams: false, p1_foreignObjects: false, p2_lockingMechanisms: false, p2_looseBolts: false, p2_hingesSecure: false, p3_repairBeams: false, p3_insideRepairs: false, p4_repairBeams: false, p4_insideRepairs: false, p5_corrugated: false, p5_interiorBlocks: false, p5_ventsVisible: false, p6_supportBeams: false, p6_ventHoles: false, p6_foreignObjects: false, p7_floorFlat: false, p7_floorUniform: false, p7_floorRepairs: false, p8_sealAffixed: false, p8_sealISO: false, p8_sealBroken: false }
        });
        break;
      case 'vehicleCondition':
        setVehicleConditionData({
            customerName: '', address: '', phone: '', dealerName: '', dealerAddress: '', dealerPhone: '',
            year: '', make: '', model: '', color: '', style: '', body: '', vin: '', license: '', mileage: '',
            options: { abs: false, bedliner: false, cruise: false, moonRoof: false, powerWin: false, wideTires: false, airCond: false, camperShell: false, customBumper: false, powerLocks: false, roofRack: false, sportWheels: false, radio: false, cd: false, leather: false, powerSeats: false, runningBoards: false, stereo: false, autoTrans: false, cdChanger: false, luxuryPkg: false, powerSteering: false, rearWindow: false, towPkg: false, tiltWheel: false },
            damageZones: Object.fromEntries(Array.from({length: 21}, (_, i) => [(i+1).toString(), ''])),
            interiorGeneral: 'Average',
            interiorSpecific: { frontCarpet: { good: false, worn: false, burns: false, rips: false, stain: false }, rearCarpet: { good: false, worn: false, burns: false, rips: false, stain: false }, frontSeat: { good: false, worn: false, burns: false, rips: false, stain: false }, rearSeat: { good: false, worn: false, burns: false, rips: false, stain: false }, headliner: { good: false, worn: false, burns: false, rips: false, stain: false }, doorPanels: { good: false, worn: false, burns: false, rips: false, stain: false } },
            interiorDash: { dent: false, crack: false, holes: false },
            mechanical: { engine: '', trans: '', airBlowsHot: false, brakes: '', exhaust: '', powerMalfunction: { windows: false, seats: false, locks: false, roof: false }, soundInoperative: false },
            tires: { rightFront: '', leftFront: '', rightRear: '', leftRear: '', spare: '' }, spareMissing: false, carKey: 'Yes', carDocs: 'Yes', date: today
        });
        break;
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
            doc.addImage(logo, 'PNG', margin, 10, renderW, renderH);
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

    // --- PDF Logic for Each Form ---
    if (activeForm === 'handyman') {
        addTitle("HANDYMAN COMPLETION REPORT");
        addField("File No", handymanData.fileNo, margin, yPos);
        addField("Date", handymanData.date, margin + 90, yPos);
        yPos += 15;
        addField("Client Name", handymanData.clientName, margin, yPos);
        addField("Address", handymanData.address, margin + 90, yPos);
        yPos += 15;
        addField("Assigned Handyman", handymanData.handymanAssigned, margin, yPos);
        addField("Day Assigned", handymanData.dayAssigned, margin + 90, yPos);
        yPos += 25;

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Description of Handyman/Maid service completed on site", margin, yPos);
        yPos += 10;

        const categories = [
            { title: "Wall Fixture", items: [
                { l: "Picture Frames", k: "pictureFrames" }, { l: "Wall mount Ornaments", k: "wallMountOrnaments" },
                { l: "Mirrors", k: "mirrors" }, { l: "Shelving Units", k: "shelvingUnits" },
                { l: "TV Stand Mounting", k: "tvStandMounting" }, { l: "Curtain Rods", k: "curtainRods" }
            ]},
            { title: "Electrical-Fixture", items: [
                { l: "Refrigerator", k: "refrigerator" }, { l: "TV", k: "tv" },
                { l: "HI FI System", k: "hiFiSystem" }, { l: "Chandelier Ceiling Lights", k: "chandelier" },
                { l: "Lights", k: "lights" }, { l: "Washing Machine", k: "washingMachine" },
                { l: "Dishwasher", k: "dishwasher" }, { l: "Electrical Cooker", k: "electricalCooker" },
                { l: "Dish Antennae", k: "dishAntennae" }, { l: "Window AC", k: "windowAC" }, { l: "Split AC", k: "splitAC" }
            ]},
            { title: "Others", items: [
                { l: "Waterbed", k: "waterbed" }, { l: "Child Safety Gates", k: "childSafetyGates" },
                { l: "Wall Painting", k: "wallPainting" }, { l: "Furniture Restoration", k: "furnitureRestoration" },
                { l: "Floor Repairs", k: "floorRepairs" }, { l: "Pool Table", k: "poolTable" }
            ]},
            { title: "Furniture", items: [
                { l: "Assembly", k: "assembly" }, { l: "Disassembly", k: "disassembly" }, { l: "Wardrobes", k: "wardrobes" }
            ]},
            { title: "Valet / Maid Services", items: [
                { l: "House cleaning", k: "houseCleaning" }, { l: "Laundry", k: "laundry" },
                { l: "Packing Personal Clothes", k: "packingClothes" }, { l: "Closet Arrangements", k: "closetArrangements" }
            ]},
            { title: "Outdoor", items: [
                { l: "Trampoline", k: "trampoline" }, { l: "Gazebo", k: "gazebo" },
                { l: "Hammock", k: "hammock" }, { l: "Play House", k: "playHouse" }, { l: "Swing", k: "swing" }
            ]}
        ];

        let colX = margin;
        let colY = yPos;
        let maxHeight = 0;

        categories.forEach((cat, idx) => {
            if (idx % 3 === 0 && idx !== 0) {
                colX = margin;
                colY += maxHeight + 15;
                maxHeight = 0;
            }
            
            let tempY = colY;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text(cat.title, colX, tempY);
            doc.line(colX, tempY+1, colX + 50, tempY+1);
            tempY += 8;
            
            doc.setFont("helvetica", "normal");
            cat.items.forEach(item => {
                const checked = (handymanData.services as any)[item.k];
                drawCheckbox(colX, tempY, checked);
                doc.text(item.l, colX + 6, tempY);
                tempY += 6;
            });
            
            if ((tempY - colY) > maxHeight) maxHeight = tempY - colY;
            colX += 60;
        });

        yPos = colY + maxHeight + 30;
        
        // Footer Inputs
        addField("Time In", handymanData.timeIn, margin, yPos);
        addField("Time Out", handymanData.timeOut, margin, yPos + 15);
    } else if (activeForm === 'containerInspection') {
        addTitle("7- POINT CONTAINER INSPECTION CHECKLIST");
        addField("Date", containerData.date, margin, yPos);
        addField("Container Number", containerData.containerNo, margin + 60, yPos);
        addField("Seal Number", containerData.sealNo, margin + 120, yPos);
        yPos += 25;

        const points = [
            { id: 1, title: "Outside /Under Carriage", checks: [
                { l: "Check for Structural damage (dents, holes, repairs)", k: "p1_structuralDamage" },
                { l: "Support beams are visible", k: "p1_supportBeams" },
                { l: "Ensure no foreign objects are mounted on the container", k: "p1_foreignObjects" }
            ]},
            { id: 2, title: "Inside/Outside Doors", checks: [
                { l: "Ensure locks and locking mechanisms are secure and reliable", k: "p2_lockingMechanisms" },
                { l: "Check for loose bolts", k: "p2_looseBolts" },
                { l: "Ensure hinges are secure and reliable", k: "p2_hingesSecure" }
            ]},
            { id: 3, title: "Right Side", checks: [
                { l: "Look for unusual repairs to structural beams", k: "p3_repairBeams" },
                { l: "Repairs to the inside wall must also be visible on outside", k: "p3_insideRepairs" }
            ]},
            { id: 4, title: "Left Side", checks: [
                { l: "Look for unusual repairs to structural beams", k: "p4_repairBeams" },
                { l: "Repairs to the inside wall must also be visible on outside", k: "p4_insideRepairs" }
            ]},
            { id: 5, title: "Front Wall", checks: [
                { l: "The front wall should be made of corrugated material", k: "p5_corrugated" },
                { l: "Interior blocks in top corners visible. Missing blocks abnormal.", k: "p5_interiorBlocks" },
                { l: "Ensure vents are visible", k: "p5_ventsVisible" }
            ]},
            { id: 6, title: "Ceiling / Roof", checks: [
                { l: "Ensure Support beams are visible", k: "p6_supportBeams" },
                { l: "Ensure ventilation holes are visible and not covered", k: "p6_ventHoles" },
                { l: "Ensure no foreign objects are mounted on the container", k: "p6_foreignObjects" }
            ]},
            { id: 7, title: "Floor", checks: [
                { l: "Ensure the floor of the container is flat", k: "p7_floorFlat" },
                { l: "Ensure the floor is uniform in height", k: "p7_floorUniform" },
                { l: "Look for unusual repairs to the floor", k: "p7_floorRepairs" }
            ]},
            { id: 8, title: "Seal Verification", checks: [
                { l: "Seal properly affixed", k: "p8_sealAffixed" },
                { l: "Seal meets or exceeds Pas ISO17712", k: "p8_sealISO" },
                { l: "Ensure seal is not broken or damaged", k: "p8_sealBroken" }
            ]}
        ];

        let colX = margin;
        let colY = yPos;
        let maxHeight = 0;

        points.forEach((p, idx) => {
            if (idx % 2 === 0 && idx !== 0) {
                colX = margin;
                colY += maxHeight + 10;
                maxHeight = 0;
            } else if (idx % 2 !== 0) {
                colX = margin + 95;
            }

            let tempY = colY;
            doc.setFillColor(240, 240, 240);
            doc.rect(colX, tempY, 90, 6, 'F');
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text(`${p.id}. ${p.title}`, colX + 2, tempY + 4);
            tempY += 10;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            p.checks.forEach(check => {
                const checked = (containerData.points as any)[check.k];
                drawCheckbox(colX + 2, tempY, checked);
                const splitText = doc.splitTextToSize(check.l, 80);
                doc.text(splitText, colX + 8, tempY);
                tempY += splitText.length * 4 + 4;
            });

            if ((tempY - colY) > maxHeight) maxHeight = tempY - colY;
        });

        yPos = colY + maxHeight + 10;
        
        doc.setFont("helvetica", "bold");
        doc.text("Remarks:", margin, yPos);
        yPos += 5;
        doc.setFont("helvetica", "normal");
        const remarksText = doc.splitTextToSize(containerData.remarks || 'None', pageWidth - margin*2);
        doc.text(remarksText, margin, yPos);
        yPos += remarksText.length * 5 + 10;

        doc.setFontSize(7);
        const declaration = "I have visually inspected and verified the condition of the container noted above. I confirmed that the container is structurally sound, weather tight, has no false compartments, and the locking mechanism is in good order and shows no visible signs of being tampered noticed.";
        const decText = doc.splitTextToSize(declaration, pageWidth - margin*2);
        doc.text(decText, margin, yPos);
        yPos += 15;

        addField("Inspected By", containerData.inspectedBy, margin, yPos);
        addField("Verified By", containerData.verifiedBy, margin + 90, yPos);
    } else if (activeForm === 'vehicleCondition') {
        addTitle("Vehicle Condition Report");
        // Header Info
        doc.setFontSize(8);
        doc.text(`Ref: WUAEOPS-WH-18/2022`, pageWidth - margin - 40, 20);

        addField("Customer Name", vehicleConditionData.customerName, margin, yPos);
        addField("Address", vehicleConditionData.address, margin, yPos + 10);
        addField("Phone #", vehicleConditionData.phone, margin, yPos + 20);
        addField("Dealer Name", vehicleConditionData.dealerName, margin, yPos + 30);
        
        const rightCol = margin + 90;
        addField("Vehicle Year", vehicleConditionData.year, rightCol, yPos);
        addField("Make", vehicleConditionData.make, rightCol + 30, yPos);
        addField("Model", vehicleConditionData.model, rightCol + 60, yPos);
        
        addField("Color", vehicleConditionData.color, rightCol, yPos + 10);
        addField("License #", vehicleConditionData.license, rightCol + 40, yPos + 10);
        
        addField("VIN", vehicleConditionData.vin, rightCol, yPos + 20);
        addField("Mileage", vehicleConditionData.mileage, rightCol + 60, yPos + 20);

        yPos += 45;
        
        // Options Grid
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPos, pageWidth - margin*2, 6, 'F');
        doc.setFont("helvetica", "bold");
        doc.text("CHECK OPTIONS INCLUDED ON VEHICLE", margin + 2, yPos + 4);
        yPos += 10;

        const optionsList = [
            { l: 'ABS / Wheel', k: 'abs' }, { l: 'Bedliner', k: 'bedliner' }, { l: 'Cruise Control', k: 'cruise' }, { l: 'Moon/Sun Roof', k: 'moonRoof' }, { l: 'Power Windows', k: 'powerWin' },
            { l: 'Air Cond.', k: 'airCond' }, { l: 'Camper Shell', k: 'camperShell' }, { l: 'Custom Bumper', k: 'customBumper' }, { l: 'Power Door Locks', k: 'powerLocks' }, { l: 'Roof Rack', k: 'roofRack' },
            { l: 'AM-FM Radio', k: 'radio' }, { l: 'C.D.', k: 'cd' }, { l: 'Leather Interior', k: 'leather' }, { l: 'Power Seats', k: 'powerSeats' }, { l: 'Running Boards', k: 'runningBoards' },
            { l: 'Auto. Trans.', k: 'autoTrans' }, { l: 'C.D. Changer', k: 'cdChanger' }, { l: 'Luxury/Sport Pkg.', k: 'luxuryPkg' }, { l: 'Power Steering', k: 'powerSteering' }, { l: 'Rear Sliding Window', k: 'rearWindow' }
        ];

        let optX = margin;
        let optY = yPos;
        optionsList.forEach((opt, idx) => {
            const checked = vehicleConditionData.options[opt.k];
            drawCheckbox(optX, optY, checked);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.text(opt.l, optX + 6, optY);
            optX += 35;
            if ((idx + 1) % 5 === 0) {
                optX = margin;
                optY += 6;
            }
        });
        yPos = optY + 10;

        // Condition Legend
        doc.setFont("helvetica", "bold");
        doc.text("CONDITION OF VEHICLE", margin, yPos);
        yPos += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        const legend = "H - Hairline Scratch   PT - Pitted   T - Torn   B - Bent   GC - Glass Cracked   M - Missing\nSM - Smashed   R - Rusty   CR - Creased   S - Scratched   ST - Stained   DR - Broken   D - Dented";
        doc.text(legend, margin, yPos);
        yPos += 10;

        // Damage Zones Grid (1-21)
        doc.text("Damage Description by Zone:", margin, yPos);
        yPos += 5;
        let zoneX = margin;
        let zoneY = yPos;
        for (let i = 1; i <= 21; i++) {
            doc.rect(zoneX, zoneY, 8, 5);
            doc.setFontSize(6);
            doc.text(i.toString(), zoneX + 1, zoneY + 3);
            doc.setFontSize(8);
            doc.text(vehicleConditionData.damageZones[i.toString()] || '', zoneX + 4, zoneY + 4);
            zoneX += 8.5;
        }
        yPos += 15;

        // Interior & Mechanical Sections
        const leftCol = margin;
        const rightColBase = margin + 90;
        
        // INTERIOR
        doc.setFont("helvetica", "bold");
        doc.text("INTERIOR", leftCol, yPos);
        doc.text("MECHANICAL", rightColBase, yPos);
        yPos += 5;

        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(`General: ${vehicleConditionData.interiorGeneral}`, leftCol + 20, yPos - 5);

        // Interior Grid
        const intHeaders = ['Good', 'Worn', 'Burns', 'Rips', 'Stain'];
        let gridY = yPos + 5;
        
        // Draw Headers
        let hX = leftCol + 25;
        intHeaders.forEach(h => {
            doc.text(h, hX, gridY);
            hX += 10;
        });
        gridY += 5;

        const intRows = [
            {l: 'Front Carpet', k: 'frontCarpet'}, {l: 'Rear Carpet', k: 'rearCarpet'},
            {l: 'Front Seat', k: 'frontSeat'}, {l: 'Rear Seat', k: 'rearSeat'},
            {l: 'Headliner', k: 'headliner'}, {l: 'Door Panels', k: 'doorPanels'}
        ];

        intRows.forEach(row => {
            doc.text(row.l, leftCol, gridY);
            let cX = leftCol + 27;
            ['good', 'worn', 'burns', 'rips', 'stain'].forEach(key => {
                const checked = (vehicleConditionData.interiorSpecific as any)[row.k][key];
                drawCheckbox(cX, gridY, checked);
                cX += 10;
            });
            gridY += 6;
        });
        
        // Dash Row
        doc.text("Dash", leftCol, gridY);
        drawCheckbox(leftCol + 27, gridY, vehicleConditionData.interiorDash.dent); doc.text("Dent", leftCol + 33, gridY);
        drawCheckbox(leftCol + 47, gridY, vehicleConditionData.interiorDash.crack); doc.text("Crack", leftCol + 53, gridY);
        drawCheckbox(leftCol + 67, gridY, vehicleConditionData.interiorDash.holes); doc.text("Holes", leftCol + 73, gridY);

        // MECHANICAL
        let mechY = yPos + 5;
        const mech = vehicleConditionData.mechanical;
        
        const drawMechRow = (label: string, val: string) => {
            doc.text(`${label}: ${val || '-'}`, rightColBase, mechY);
            mechY += 5;
        };
        
        drawMechRow("Engine", mech.engine);
        drawMechRow("Trans/Clutch", mech.trans);
        doc.text("Air Cond:", rightColBase, mechY); drawCheckbox(rightColBase + 20, mechY, mech.airBlowsHot); doc.text("Blows Hot", rightColBase + 26, mechY); mechY += 5;
        drawMechRow("Brakes", mech.brakes);
        drawMechRow("Exhaust", mech.exhaust);
        
        doc.text("Power Malfunction:", rightColBase, mechY); mechY += 5;
        drawCheckbox(rightColBase, mechY, mech.powerMalfunction.windows); doc.text("Windows", rightColBase + 6, mechY);
        drawCheckbox(rightColBase + 25, mechY, mech.powerMalfunction.seats); doc.text("Seats", rightColBase + 31, mechY);
        mechY += 5;
        drawCheckbox(rightColBase, mechY, mech.powerMalfunction.locks); doc.text("Locks", rightColBase + 6, mechY);
        drawCheckbox(rightColBase + 25, mechY, mech.powerMalfunction.roof); doc.text("Roof", rightColBase + 31, mechY);
        mechY += 5;
        
        // Tires Table
        yPos = Math.max(gridY, mechY) + 10;
        doc.autoTable({
            startY: yPos,
            head: [['Tires', 'R Front', 'L Front', 'R Rear', 'L Rear', 'Spare']],
            body: [
                ['Cond', vehicleConditionData.tires.rightFront, vehicleConditionData.tires.leftFront, vehicleConditionData.tires.rightRear, vehicleConditionData.tires.leftRear, vehicleConditionData.tires.spare]
            ],
            margin: { left: margin },
            tableWidth: pageWidth - margin * 2,
            styles: { fontSize: 8 }
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;

        // Footer
        doc.text(`Car Key: ${vehicleConditionData.carKey}`, margin, yPos);
        doc.text(`Documents Received: ${vehicleConditionData.carDocs}`, margin + 60, yPos);
        
    } else {
        // --- Original Forms ---
        if (activeForm === 'packing' || activeForm === 'unpacking') {
             const isPacking = activeForm === 'packing';
             const data = isPacking ? packingData : unpackingData;
             addTitle(isPacking ? "Packing Services Walk Through" : "Unpacking Services Walk Through");
             
             addField("Client Name", data.clientName, margin, yPos);
             addField("Job Reference", data.jobId, margin + 90, yPos);
             addField("Date", data.date, margin + 140, yPos);
             yPos += 25;
             yPos = addSectionDivider("Walk Through Verification", yPos); yPos += 5;
             
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
             yPos += 25;
             
             doc.autoTable({
                startY: yPos,
                head: [['Condition', 'Qty', 'Description']],
                body: deliveryItems.map(i => [i.condition, i.quantity, i.description]),
                theme: 'grid',
                styles: { fontSize: 8 },
             });
             yPos = (doc as any).lastAutoTable.finalY + 20;
             if (deliveryData.notes) {
                doc.text("Notes:", margin, yPos);
                doc.text(deliveryData.notes, margin, yPos + 5);
             }
        } else if (activeForm === 'crating') {
             addTitle("Crating Specification Sheet");
             addField("Client Name", cratingData.clientName, margin, yPos);
             addField("Job Ref", cratingData.jobId, margin + 90, yPos);
             yPos += 25;
             doc.autoTable({
                startY: yPos,
                head: [['Description', 'Length', 'Width', 'Height', 'Vol (ft³)']],
                body: crates.map(c => [c.description, c.l, c.w, c.h, ((c.l*c.w*c.h)/1728).toFixed(2)]),
                theme: 'grid',
                styles: { fontSize: 8 },
             });
             yPos = (doc as any).lastAutoTable.finalY + 10;
             doc.text(`Total Volume: ${calculateTotalVolume()} CBM`, margin, yPos);
        } else if (activeForm === 'electronicList') {
             addTitle("Electronic Items Inventory");
             addField("Client Name", electronicData.clientName, margin, yPos);
             yPos += 25;
             doc.autoTable({
                startY: yPos,
                head: [['Item Description', 'Make', 'Model', 'Serial No', 'Condition']],
                body: electronicItems.map(i => [i.description, i.make, i.model, i.serial, i.condition]),
                theme: 'grid',
                styles: { fontSize: 8 },
             });
        } else if (activeForm === 'accessorial') {
             addTitle("Accessorial Services Sheet");
             addField("Client Name", accessorialData.clientName, margin, yPos);
             yPos += 25;
             
             const services = Object.entries(accessorialData.services).filter(([_, v]) => v).map(([k]) => k.replace(/([A-Z])/g, ' $1').toUpperCase());
             doc.text("Authorized Services:", margin, yPos);
             yPos += 10;
             services.forEach(s => { doc.text(`• ${s}`, margin + 5, yPos); yPos += 6; });
             yPos += 10;
             if (accessorialData.details.stairCarryFloors) doc.text(`Stair Carry: ${accessorialData.details.stairCarryFloors} Floors`, margin, yPos += 6);
             if (accessorialData.details.longCarryDistance) doc.text(`Long Carry: ${accessorialData.details.longCarryDistance} Meters`, margin, yPos += 6);
        } else if (activeForm === 'warehouseReceipt') {
             // Handled by landscape logic if needed, but for now standard portrait fallback or landscape if set
             addTitle("Warehouse Receipt", false);
             doc.setFontSize(14); doc.text("WAREHOUSE RECEIPT", margin, 40);
             doc.setFontSize(10);
             const r = warehouseReceiptData;
             doc.text(`Client: ${r.clientName} | File: ${r.fileNo} | Date: ${r.date}`, margin, 50);
             doc.text(`Pkgs: ${r.totalPkgs} | Vol: ${r.volume} | Ctr: ${r.containerNo}`, margin, 56);
             
             yPos = 70;
             doc.text("Selected Packages:", margin, yPos);
             yPos += 10;
             // Simple list for PDF to save space
             const selectedStr = r.selectedPackages.sort((a,b)=>a-b).join(', ');
             const splitSel = doc.splitTextToSize(selectedStr, pageWidth - margin*2);
             doc.text(splitSel, margin, yPos);
        }
    }

    // Common Footer / Signature
    if (activeForm !== 'warehouseReceipt' && hasSignature && canvasRef.current) {
        if (yPos > doc.internal.pageSize.getHeight() - 50) { doc.addPage(); yPos = 40; }
        yPos += 10;
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]); doc.line(margin, yPos, pageWidth - margin, yPos); yPos += 10;
        const imgData = canvasRef.current.toDataURL("image/png");
        doc.setFontSize(8); doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
        doc.text(activeForm === 'delivery' ? "RECEIVER SIGNATURE" : "CLIENT / AUTHORIZED SIGNATURE", margin, yPos);
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
           {['packing', 'unpacking', 'delivery', 'crating', 'electronicList', 'accessorial', 'warehouseReceipt', 'handyman', 'containerInspection', 'vehicleCondition'].map(formId => (
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
                {formId === 'vehicleCondition' && <Car className="w-5 h-5" />}
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
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                    <FileText className="w-6 h-6 text-blue-600" />
                    {activeForm === 'handyman' ? 'Handyman Completion Report' : 
                     activeForm === 'containerInspection' ? '7-Point Container Inspection' : 
                     activeForm === 'vehicleCondition' ? 'Vehicle Condition Report' :
                     activeForm.replace(/([A-Z])/g, ' $1').trim()}
                 </h3>
                 {logo && <img src={logo} alt="Company Logo" className="h-10 w-auto object-contain opacity-80 grayscale hover:grayscale-0 transition-all" />}
               </div>
            </div>

            <div className="p-6 md:p-8 space-y-8">
               
               {/* --- PACKING & UNPACKING FORM --- */}
               {(activeForm === 'packing' || activeForm === 'unpacking') && (
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client Name</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={activeForm === 'packing' ? packingData.clientName : unpackingData.clientName} onChange={e => activeForm === 'packing' ? setPackingData({...packingData, clientName: e.target.value}) : setUnpackingData({...unpackingData, clientName: e.target.value})} /></div>
                       <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Job Reference</label><input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={activeForm === 'packing' ? packingData.jobId : unpackingData.jobId} onChange={e => activeForm === 'packing' ? setPackingData({...packingData, jobId: e.target.value}) : setUnpackingData({...unpackingData, jobId: e.target.value})} /></div>
                    </div>
                    
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                        <h4 className="font-bold text-slate-700">Walk Through Verification</h4>
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

                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Notes / Damage Report</label><textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-24" value={activeForm === 'packing' ? packingData.clientNotes : unpackingData.clientNotes} onChange={e => activeForm === 'packing' ? setPackingData({...packingData, clientNotes: e.target.value}) : setUnpackingData({...unpackingData, clientNotes: e.target.value})} /></div>
                 </div>
               )}

               {/* --- DELIVERY FORM --- */}
               {activeForm === 'delivery' && (
                   <div className="space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client Name</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={deliveryData.clientName} onChange={e => setDeliveryData({...deliveryData, clientName: e.target.value})} /></div>
                           <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Job Ref</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={deliveryData.jobId} onChange={e => setDeliveryData({...deliveryData, jobId: e.target.value})} /></div>
                           <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Truck No</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={deliveryData.truckNo} onChange={e => setDeliveryData({...deliveryData, truckNo: e.target.value})} /></div>
                       </div>
                       
                       <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                           <div className="flex justify-between items-center mb-4">
                               <h4 className="font-bold text-slate-700">Delivery Items</h4>
                               <button onClick={addDeliveryItem} className="p-2 bg-white text-blue-600 rounded-lg shadow-sm hover:bg-blue-50"><Plus className="w-4 h-4"/></button>
                           </div>
                           <div className="space-y-2">
                               {deliveryItems.map(item => (
                                   <div key={item.id} className="flex gap-2 items-center">
                                       <input className="flex-1 p-2 rounded border border-slate-200 text-sm" placeholder="Description" value={item.description} onChange={e => updateDeliveryItem(item.id, 'description', e.target.value)} />
                                       <select className="w-32 p-2 rounded border border-slate-200 text-sm" value={item.condition} onChange={e => updateDeliveryItem(item.id, 'condition', e.target.value)}>
                                           <option>Good</option><option>Damaged</option><option>Missing</option>
                                       </select>
                                       <input type="number" className="w-20 p-2 rounded border border-slate-200 text-sm" placeholder="Qty" value={item.quantity} onChange={e => updateDeliveryItem(item.id, 'quantity', parseInt(e.target.value))} />
                                       <button onClick={() => removeDeliveryItem(item.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded"><Trash2 className="w-4 h-4"/></button>
                                   </div>
                               ))}
                           </div>
                       </div>
                   </div>
               )}

               {/* --- CRATING FORM --- */}
               {activeForm === 'crating' && (
                   <div className="space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client Name</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={cratingData.clientName} onChange={e => setCratingData({...cratingData, clientName: e.target.value})} /></div>
                           <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Job Ref</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={cratingData.jobId} onChange={e => setCratingData({...cratingData, jobId: e.target.value})} /></div>
                       </div>
                       
                       <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                           <div className="flex justify-between items-center mb-4">
                               <h4 className="font-bold text-slate-700">Crate Dimensions (inches)</h4>
                               <button onClick={addCrate} className="p-2 bg-white text-blue-600 rounded-lg shadow-sm hover:bg-blue-50"><Plus className="w-4 h-4"/></button>
                           </div>
                           <div className="space-y-2">
                               {crates.map(c => (
                                   <div key={c.id} className="flex gap-2 items-center">
                                       <input className="flex-1 p-2 rounded border border-slate-200 text-sm" placeholder="Description" value={c.description} onChange={e => updateCrate(c.id, 'description', e.target.value)} />
                                       <input type="number" className="w-16 p-2 rounded border border-slate-200 text-sm" placeholder="L" value={c.l} onChange={e => updateCrate(c.id, 'l', parseFloat(e.target.value))} />
                                       <input type="number" className="w-16 p-2 rounded border border-slate-200 text-sm" placeholder="W" value={c.w} onChange={e => updateCrate(c.id, 'w', parseFloat(e.target.value))} />
                                       <input type="number" className="w-16 p-2 rounded border border-slate-200 text-sm" placeholder="H" value={c.h} onChange={e => updateCrate(c.id, 'h', parseFloat(e.target.value))} />
                                       <button onClick={() => removeCrate(c.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded"><Trash2 className="w-4 h-4"/></button>
                                   </div>
                               ))}
                           </div>
                           <div className="mt-4 text-right font-bold text-slate-600">
                               Total Volume: {calculateTotalVolume()} CBM
                           </div>
                       </div>
                   </div>
               )}

               {/* --- ELECTRONIC LIST --- */}
               {activeForm === 'electronicList' && (
                   <div className="space-y-6">
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client Name</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={electronicData.clientName} onChange={e => setElectronicData({...electronicData, clientName: e.target.value})} /></div>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                           <div className="flex justify-between items-center mb-4">
                               <h4 className="font-bold text-slate-700">Items</h4>
                               <button onClick={addElectronicItem} className="p-2 bg-white text-blue-600 rounded-lg shadow-sm hover:bg-blue-50"><Plus className="w-4 h-4"/></button>
                           </div>
                           <div className="space-y-2">
                               {electronicItems.map(i => (
                                   <div key={i.id} className="grid grid-cols-5 gap-2 items-center">
                                       <input className="p-2 rounded border border-slate-200 text-sm" placeholder="Desc" value={i.description} onChange={e => updateElectronicItem(i.id, 'description', e.target.value)} />
                                       <input className="p-2 rounded border border-slate-200 text-sm" placeholder="Make" value={i.make} onChange={e => updateElectronicItem(i.id, 'make', e.target.value)} />
                                       <input className="p-2 rounded border border-slate-200 text-sm" placeholder="Model" value={i.model} onChange={e => updateElectronicItem(i.id, 'model', e.target.value)} />
                                       <input className="p-2 rounded border border-slate-200 text-sm" placeholder="Serial" value={i.serial} onChange={e => updateElectronicItem(i.id, 'serial', e.target.value)} />
                                       <button onClick={() => removeElectronicItem(i.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded place-self-center"><Trash2 className="w-4 h-4"/></button>
                                   </div>
                               ))}
                           </div>
                        </div>
                   </div>
               )}

               {/* --- ACCESSORIAL SERVICES --- */}
               {activeForm === 'accessorial' && (
                   <div className="space-y-6">
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client Name</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={accessorialData.clientName} onChange={e => setAccessorialData({...accessorialData, clientName: e.target.value})} /></div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {Object.entries(accessorialData.services).map(([key, val]) => (
                                <label key={key} className={`p-4 rounded-xl border cursor-pointer transition-all ${val ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 rounded text-blue-600"
                                            checked={val} 
                                            onChange={e => setAccessorialData({...accessorialData, services: {...accessorialData.services, [key]: e.target.checked}})}
                                        />
                                        <span className="font-bold text-xs uppercase tracking-wide text-slate-700">{key.replace(/([A-Z])/g, ' $1')}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                   </div>
               )}

               {/* --- WAREHOUSE RECEIPT --- */}
               {activeForm === 'warehouseReceipt' && (
                   <div className="space-y-6">
                       {/* Header inputs */}
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <input className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Client Name" value={warehouseReceiptData.clientName} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, clientName: e.target.value})} />
                           <input className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="File No" value={warehouseReceiptData.fileNo} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, fileNo: e.target.value})} />
                           <input className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Total Pkgs" value={warehouseReceiptData.totalPkgs} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, totalPkgs: e.target.value})} />
                           <input className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Volume" value={warehouseReceiptData.volume} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, volume: e.target.value})} />
                           <input className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Container No" value={warehouseReceiptData.containerNo} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, containerNo: e.target.value})} />
                           <input className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Seal No" value={warehouseReceiptData.sealNo} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, sealNo: e.target.value})} />
                       </div>

                       {/* Number Grid */}
                       <div className="border border-slate-200 rounded-2xl overflow-hidden">
                           <div className="bg-slate-100 p-3 flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                                <span>Package Selection (1-1000)</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setGridPage(Math.max(0, gridPage - 1))} disabled={gridPage===0} className="p-1 hover:bg-slate-200 rounded"><ChevronLeft className="w-4 h-4"/></button>
                                    <span>Page {gridPage + 1} / 5</span>
                                    <button onClick={() => setGridPage(Math.min(4, gridPage + 1))} disabled={gridPage===4} className="p-1 hover:bg-slate-200 rounded"><ChevronRight className="w-4 h-4"/></button>
                                </div>
                           </div>
                           <div className="grid grid-cols-10 md:grid-cols-20 gap-px bg-slate-200 p-px select-none">
                               {Array.from({ length: 200 }, (_, i) => {
                                   const num = gridPage * 200 + i + 1;
                                   const isSelected = warehouseReceiptData.selectedPackages.includes(num);
                                   return (
                                       <div 
                                            key={num}
                                            onMouseDown={() => handleGridMouseDown(num)}
                                            onMouseEnter={() => handleGridMouseEnter(num)}
                                            className={`h-8 flex items-center justify-center text-[10px] font-bold cursor-pointer ${isSelected ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 hover:bg-blue-50'}`}
                                       >
                                           {num}
                                       </div>
                                   )
                               })}
                           </div>
                           <div className="p-3 bg-slate-50 flex justify-end">
                                <button onClick={handleSelectAllCurrentPage} className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline">Select All on Page</button>
                           </div>
                       </div>
                   </div>
               )}

               {/* --- HANDYMAN FORM --- */}
               {activeForm === 'handyman' && (
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client Name</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={handymanData.clientName} onChange={e => setHandymanData({...handymanData, clientName: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">File No</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={handymanData.fileNo} onChange={e => setHandymanData({...handymanData, fileNo: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</label><input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={handymanData.date} onChange={e => setHandymanData({...handymanData, date: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Address</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={handymanData.address} onChange={e => setHandymanData({...handymanData, address: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Handyman Assigned</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={handymanData.handymanAssigned} onChange={e => setHandymanData({...handymanData, handymanAssigned: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Day Assigned</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={handymanData.dayAssigned} onChange={e => setHandymanData({...handymanData, dayAssigned: e.target.value})} /></div>
                    </div>

                    <div className="mt-6 border-t border-slate-200 pt-6">
                        <h4 className="font-bold text-slate-800 mb-4">Service Checklist</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                { title: 'Wall Fixture', keys: ['pictureFrames', 'wallMountOrnaments', 'mirrors', 'shelvingUnits', 'tvStandMounting', 'curtainRods'] },
                                { title: 'Electrical-Fixture', keys: ['refrigerator', 'tv', 'hiFiSystem', 'chandelier', 'lights', 'washingMachine', 'dishwasher', 'electricalCooker', 'dishAntennae', 'windowAC', 'splitAC'] },
                                { title: 'Furniture', keys: ['assembly', 'disassembly', 'wardrobes'] },
                                { title: 'Valet / Maid Services', keys: ['houseCleaning', 'laundry', 'packingClothes', 'closetArrangements'] },
                                { title: 'Outdoor', keys: ['trampoline', 'gazebo', 'hammock', 'playHouse', 'swing'] },
                                { title: 'Others', keys: ['waterbed', 'childSafetyGates', 'wallPainting', 'furnitureRestoration', 'floorRepairs', 'poolTable'] }
                            ].map(cat => (
                                <div key={cat.title} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <h5 className="font-bold text-xs uppercase tracking-widest text-blue-600 mb-3">{cat.title}</h5>
                                    <div className="space-y-2">
                                        {cat.keys.map(key => (
                                            <label key={key} className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 rounded text-blue-600"
                                                    checked={(handymanData.services as any)[key]} 
                                                    onChange={e => setHandymanData({...handymanData, services: {...handymanData.services, [key]: e.target.checked}})}
                                                />
                                                <span className="text-xs text-slate-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mt-6">
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time In</label><input type="time" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={handymanData.timeIn} onChange={e => setHandymanData({...handymanData, timeIn: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time Out</label><input type="time" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={handymanData.timeOut} onChange={e => setHandymanData({...handymanData, timeOut: e.target.value})} /></div>
                    </div>
                 </div>
               )}

               {/* --- CONTAINER INSPECTION FORM --- */}
               {activeForm === 'containerInspection' && (
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</label><input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={containerData.date} onChange={e => setContainerData({...containerData, date: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Container Number</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={containerData.containerNo} onChange={e => setContainerData({...containerData, containerNo: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Seal Number</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={containerData.sealNo} onChange={e => setContainerData({...containerData, sealNo: e.target.value})} /></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        {[
                            { id: 1, title: 'Outside / Under Carriage', checks: [['Structural damage', 'p1_structuralDamage'], ['Support beams visible', 'p1_supportBeams'], ['No foreign objects', 'p1_foreignObjects']] },
                            { id: 2, title: 'Inside / Outside Doors', checks: [['Locking mechanisms secure', 'p2_lockingMechanisms'], ['Loose bolts check', 'p2_looseBolts'], ['Hinges secure', 'p2_hingesSecure']] },
                            { id: 3, title: 'Right Side', checks: [['Unusual repairs beams', 'p3_repairBeams'], ['Inside repairs visible out', 'p3_insideRepairs']] },
                            { id: 4, title: 'Left Side', checks: [['Unusual repairs beams', 'p4_repairBeams'], ['Inside repairs visible out', 'p4_insideRepairs']] },
                            { id: 5, title: 'Front Wall', checks: [['Corrugated material', 'p5_corrugated'], ['Interior blocks visible', 'p5_interiorBlocks'], ['Vents visible', 'p5_ventsVisible']] },
                            { id: 6, title: 'Ceiling / Roof', checks: [['Support beams visible', 'p6_supportBeams'], ['Ventilation holes clear', 'p6_ventHoles'], ['No foreign objects', 'p6_foreignObjects']] },
                            { id: 7, title: 'Floor', checks: [['Floor flat', 'p7_floorFlat'], ['Floor uniform height', 'p7_floorUniform'], ['Unusual repairs', 'p7_floorRepairs']] },
                            { id: 8, title: 'Seal Verification', checks: [['Seal properly affixed', 'p8_sealAffixed'], ['Seal meets ISO17712', 'p8_sealISO'], ['Seal not broken', 'p8_sealBroken']] }
                        ].map(section => (
                            <div key={section.id} className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                                <h5 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
                                    <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">{section.id}</span>
                                    {section.title}
                                </h5>
                                <div className="space-y-2.5">
                                    {section.checks.map(([label, key]) => (
                                        <label key={key} className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-white transition-colors">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded text-blue-600 mt-0.5"
                                                checked={(containerData.points as any)[key]} 
                                                onChange={e => setContainerData({...containerData, points: {...containerData.points, [key]: e.target.checked}})}
                                            />
                                            <span className="text-xs font-medium text-slate-600 leading-tight">{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-200">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Remarks</label>
                            <textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-1 focus:ring-blue-500 outline-none" rows={3} value={containerData.remarks} onChange={e => setContainerData({...containerData, remarks: e.target.value})}></textarea>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-800 font-medium">
                            I have visually inspected and verified the condition of the container noted above. I confirmed that the container is structurally sound, weather tight, has no false compartments, and the locking mechanism is in good order and shows no visible signs of being tampered noticed.
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inspected By</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={containerData.inspectedBy} onChange={e => setContainerData({...containerData, inspectedBy: e.target.value})} /></div>
                            <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verified By</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={containerData.verifiedBy} onChange={e => setContainerData({...containerData, verifiedBy: e.target.value})} /></div>
                        </div>
                    </div>
                 </div>
               )}

               {/* --- VEHICLE CONDITION FORM --- */}
               {activeForm === 'vehicleCondition' && (
                 <div className="space-y-8">
                    {/* Customer Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <h4 className="font-bold text-xs uppercase text-slate-500">Customer Details</h4>
                          <input placeholder="Customer Name" className="w-full p-2 text-sm border rounded" value={vehicleConditionData.customerName} onChange={e => setVehicleConditionData({...vehicleConditionData, customerName: e.target.value})} />
                          <input placeholder="Address" className="w-full p-2 text-sm border rounded" value={vehicleConditionData.address} onChange={e => setVehicleConditionData({...vehicleConditionData, address: e.target.value})} />
                          <input placeholder="Phone #" className="w-full p-2 text-sm border rounded" value={vehicleConditionData.phone} onChange={e => setVehicleConditionData({...vehicleConditionData, phone: e.target.value})} />
                          <input placeholder="Dealer Name" className="w-full p-2 text-sm border rounded" value={vehicleConditionData.dealerName} onChange={e => setVehicleConditionData({...vehicleConditionData, dealerName: e.target.value})} />
                       </div>
                       <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <h4 className="font-bold text-xs uppercase text-slate-500">Vehicle Info</h4>
                          <div className="grid grid-cols-2 gap-2">
                             <input placeholder="Year" className="p-2 text-sm border rounded" value={vehicleConditionData.year} onChange={e => setVehicleConditionData({...vehicleConditionData, year: e.target.value})} />
                             <input placeholder="Make" className="p-2 text-sm border rounded" value={vehicleConditionData.make} onChange={e => setVehicleConditionData({...vehicleConditionData, make: e.target.value})} />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                             <input placeholder="Model" className="p-2 text-sm border rounded" value={vehicleConditionData.model} onChange={e => setVehicleConditionData({...vehicleConditionData, model: e.target.value})} />
                             <input placeholder="Color" className="p-2 text-sm border rounded" value={vehicleConditionData.color} onChange={e => setVehicleConditionData({...vehicleConditionData, color: e.target.value})} />
                          </div>
                          <input placeholder="VIN" className="w-full p-2 text-sm border rounded" value={vehicleConditionData.vin} onChange={e => setVehicleConditionData({...vehicleConditionData, vin: e.target.value})} />
                          <div className="grid grid-cols-2 gap-2">
                             <input placeholder="License #" className="p-2 text-sm border rounded" value={vehicleConditionData.license} onChange={e => setVehicleConditionData({...vehicleConditionData, license: e.target.value})} />
                             <input placeholder="Mileage" className="p-2 text-sm border rounded" value={vehicleConditionData.mileage} onChange={e => setVehicleConditionData({...vehicleConditionData, mileage: e.target.value})} />
                          </div>
                       </div>
                    </div>

                    {/* Options Grid */}
                    <div className="border-t border-slate-200 pt-6">
                        <h4 className="font-bold text-slate-800 mb-4">Check Options Included</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            {Object.entries(vehicleConditionData.options).map(([key, val]) => (
                                <label key={key} className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={val} onChange={e => setVehicleConditionData({...vehicleConditionData, options: {...vehicleConditionData.options, [key]: e.target.checked}})} className="rounded text-blue-600" />
                                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Condition Zones */}
                    <div className="border-t border-slate-200 pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-slate-800">Condition Zones (1-21)</h4>
                            <div className="text-[10px] text-slate-500 bg-slate-100 p-2 rounded">
                                Legend: H-Hairline, S-Scratched, D-Dented, CR-Creased, R-Rusty...
                            </div>
                        </div>
                        <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                            {Array.from({length: 21}, (_, i) => i + 1).map(num => (
                                <div key={num} className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-slate-400 text-center">Zone {num}</label>
                                    <input 
                                        className="p-2 text-center border rounded text-xs font-bold uppercase" 
                                        maxLength={2}
                                        placeholder="Code"
                                        value={vehicleConditionData.damageZones[num.toString()]}
                                        onChange={e => setVehicleConditionData({...vehicleConditionData, damageZones: {...vehicleConditionData.damageZones, [num.toString()]: e.target.value}})}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Interior & Mechanical */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-200 pt-6">
                        {/* Interior */}
                        <div>
                            <h4 className="font-bold text-slate-800 mb-4">Interior</h4>
                            <div className="flex gap-4 mb-4 text-xs">
                                {['Clean', 'Average', 'Dirty'].map(opt => (
                                    <label key={opt} className="flex items-center gap-1 cursor-pointer">
                                        <input type="radio" name="interiorGen" checked={vehicleConditionData.interiorGeneral === opt} onChange={() => setVehicleConditionData({...vehicleConditionData, interiorGeneral: opt as any})} />
                                        {opt}
                                    </label>
                                ))}
                            </div>
                            <div className="space-y-2">
                                {Object.keys(vehicleConditionData.interiorSpecific).map(key => (
                                    <div key={key} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded">
                                        <span className="font-bold capitalize w-24">{key.replace(/([A-Z])/g, ' $1')}</span>
                                        <div className="flex gap-2">
                                            {['good', 'worn', 'burns', 'rips', 'stain'].map(cond => (
                                                <label key={cond} className="flex flex-col items-center cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={(vehicleConditionData.interiorSpecific as any)[key][cond]} 
                                                        onChange={e => setVehicleConditionData({
                                                            ...vehicleConditionData, 
                                                            interiorSpecific: {
                                                                ...vehicleConditionData.interiorSpecific, 
                                                                [key]: { ...(vehicleConditionData.interiorSpecific as any)[key], [cond]: e.target.checked }
                                                            }
                                                        })}
                                                    />
                                                    <span className="text-[8px] uppercase">{cond}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Mechanical & Tires */}
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-bold text-slate-800 mb-4">Mechanical</h4>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                        <span>Engine</span>
                                        <select className="bg-white border rounded p-1" value={vehicleConditionData.mechanical.engine} onChange={e => setVehicleConditionData({...vehicleConditionData, mechanical: {...vehicleConditionData.mechanical, engine: e.target.value as any}})}>
                                            <option value="">Select...</option><option value="Smooth">Smooth</option><option value="Rough">Rough</option><option value="Knock">Knock</option>
                                        </select>
                                    </div>
                                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                        <span>Trans</span>
                                        <select className="bg-white border rounded p-1" value={vehicleConditionData.mechanical.trans} onChange={e => setVehicleConditionData({...vehicleConditionData, mechanical: {...vehicleConditionData.mechanical, trans: e.target.value as any}})}>
                                            <option value="">Select...</option><option value="Smooth OK">Smooth OK</option><option value="Slips">Slips</option>
                                        </select>
                                    </div>
                                    <label className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                                        <input type="checkbox" checked={vehicleConditionData.mechanical.airBlowsHot} onChange={e => setVehicleConditionData({...vehicleConditionData, mechanical: {...vehicleConditionData.mechanical, airBlowsHot: e.target.checked}})} />
                                        <span>Air Cond Blows Hot</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-slate-800 mb-2">Tires Condition</h4>
                                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                                    {['Right Front', 'Left Front', 'Right Rear', 'Left Rear', 'Spare'].map(tire => {
                                        const key = tire.replace(' ', '').charAt(0).toLowerCase() + tire.replace(' ', '').slice(1);
                                        return (
                                            <div key={tire} className="flex flex-col gap-1">
                                                <span className="font-bold text-[9px]">{tire}</span>
                                                <select 
                                                    className="p-1 border rounded"
                                                    value={(vehicleConditionData.tires as any)[key]}
                                                    onChange={e => setVehicleConditionData({...vehicleConditionData, tires: {...vehicleConditionData.tires, [key]: e.target.value}})}
                                                >
                                                    <option value="">-</option><option value="Good">Good</option><option value="Fair">Fair</option><option value="Poor">Poor</option>
                                                </select>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-center border-t border-slate-200 pt-6">
                        <div className="flex gap-6">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold">Car Key:</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setVehicleConditionData({...vehicleConditionData, carKey: 'Yes'})} className={`px-3 py-1 rounded text-xs ${vehicleConditionData.carKey === 'Yes' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>Yes</button>
                                    <button onClick={() => setVehicleConditionData({...vehicleConditionData, carKey: 'No'})} className={`px-3 py-1 rounded text-xs ${vehicleConditionData.carKey === 'No' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>No</button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold">Docs Received:</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setVehicleConditionData({...vehicleConditionData, carDocs: 'Yes'})} className={`px-3 py-1 rounded text-xs ${vehicleConditionData.carDocs === 'Yes' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>Yes</button>
                                    <button onClick={() => setVehicleConditionData({...vehicleConditionData, carDocs: 'No'})} className={`px-3 py-1 rounded text-xs ${vehicleConditionData.carDocs === 'No' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>No</button>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
               )}

               {/* --- COMMON: SIGNATURE SECTION --- */}
               <div className="pt-8 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2"><PenTool className="w-4 h-4 text-blue-500"/> Authorization Signature</h4>
                      <button onClick={clearSignature} className="flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:bg-rose-50 px-2 py-1 rounded transition-colors">
                        <Eraser className="w-3 h-3" /> Clear
                      </button>
                  </div>
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/30 overflow-hidden relative h-40">
                     <canvas
                       ref={canvasRef}
                       className="w-full h-full cursor-crosshair touch-none"
                       onMouseDown={startDrawing}
                       onMouseMove={draw}
                       onMouseUp={endDrawing}
                       onMouseLeave={endDrawing}
                       onTouchStart={startDrawing}
                       onTouchMove={draw}
                       onTouchEnd={endDrawing}
                     />
                     {!hasSignature && !isDrawing && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-sm font-bold uppercase tracking-widest">
                           Sign Here
                        </div>
                     )}
                  </div>
                  <div className="mt-4 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                     <span>{activeForm === 'vehicleCondition' ? 'Foreman Signature' : activeForm === 'delivery' ? 'Receiver Signature' : 'Client / Rep Signature'}</span>
                     <span>Date: {new Date().toLocaleDateString()}</span>
                  </div>
               </div>
            </div>
        </div>
      </div>
    </div>
  );
};
