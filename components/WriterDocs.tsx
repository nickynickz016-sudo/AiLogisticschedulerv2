
import React, { useState, useRef, useEffect } from 'react';
import { FileText, Package, Box, Truck, Eraser, PenTool, Plus, Trash2, Printer, ClipboardCheck, Layers, ArrowLeftRight, ChevronLeft, ChevronRight, CheckSquare, Square, Monitor, Upload, Image as ImageIcon, Wrench, ShieldCheck } from 'lucide-react';
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

interface WriterDocsProps {
  logo?: string;
  onUpdateLogo?: (base64: string) => void;
  isAdmin?: boolean;
  currentUser?: UserProfile;
}

export const WriterDocs: React.FC<WriterDocsProps> = ({ logo, onUpdateLogo, isAdmin, currentUser }) => {
  const [activeForm, setActiveForm] = useState<'packing' | 'unpacking' | 'delivery' | 'crating' | 'electronicList' | 'accessorial' | 'warehouseReceipt' | 'handyman' | 'containerInspection'>('packing');
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
    }
  };

  const getClientName = () => {
    switch (activeForm) {
      case 'packing': return packingData.clientName;
      case 'unpacking': return unpackingData.clientName;
      case 'delivery': return deliveryData.clientName;
      case 'crating': return cratingData.clientName;
      case 'electronicList': return electronicData.clientName;
      case 'accessorial': return accessorialData.clientName;
      case 'warehouseReceipt': return warehouseReceiptData.clientName;
      case 'handyman': return handymanData.clientName;
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
                { l: "House cleaning", k: "house cleaning" }, { l: "Laundry", k: "laundry" },
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

        yPos = colY + maxHeight + 10;
        
        // Footer Inputs
        addField("Time In", handymanData.timeIn, margin, yPos);
        addField("Time Out", handymanData.timeOut, margin, yPos + 15);
        
        yPos += 25;
        // Remarks
        if (handymanData.remarks) {
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("Remarks:", margin, yPos);
            yPos += 5;
            doc.setFont("helvetica", "normal");
            const splitRemarks = doc.splitTextToSize(handymanData.remarks, pageWidth - margin * 2);
            doc.text(splitRemarks, margin, yPos);
            yPos += splitRemarks.length * 5 + 5;
        }

    } else if (activeForm === 'containerInspection') {
        addTitle("7-POINT CONTAINER INSPECTION");
        addField("Date", containerInspectionData.date, margin, yPos);
        addField("Container No", containerInspectionData.containerNo, margin + 60, yPos);
        addField("Seal No", containerInspectionData.sealNo, margin + 120, yPos);
        yPos += 20;

        const sections = [
            { title: "1. Outside / Under Carriage", items: [
                { l: "Check for Structural damage (dents, holes, repairs)", k: "structuralDamage" },
                { l: "Support beams are visible", k: "supportBeams" },
                { l: "Ensure no foreign objects are mounted on the container", k: "foreignObjects" }
            ], key: "outsideUndercarriage" },
            { title: "2. Inside / Outside Doors", items: [
                { l: "Ensure locks and locking mechanisms are secure", k: "locksSecure" },
                { l: "Check for loose bolts", k: "looseBolts" },
                { l: "Ensure hinges are secure and reliable", k: "hingesSecure" }
            ], key: "insideOutsideDoors" },
            { title: "3. Right Side", items: [
                { l: "Look for unusual repairs to structural beams", k: "unusualRepairs" },
                { l: "Repairs to inside wall must be visible outside & vice versa", k: "repairsVisible" }
            ], key: "rightSide" },
            { title: "4. Left Side", items: [
                { l: "Look for unusual repairs to structural beams", k: "unusualRepairs" },
                { l: "Repairs to inside wall must also be visible outside & vice versa", k: "repairsVisible" }
            ], key: "leftSide" },
            { title: "5. Front Wall", items: [
                { l: "Front wall is made of corrugated material", k: "corrugated" },
                { l: "Interior blocks in top corners visible (missing/false is abnormal)", k: "blocksVisible" },
                { l: "Ensure vents are visible", k: "ventsVisible" }
            ], key: "frontWall" },
            { title: "6. Ceiling / Roof", items: [
                { l: "Ensure Support beams are visible", k: "supportBeams" },
                { l: "Ensure ventilation holes are visible (not covered/absent)", k: "ventilationHoles" },
                { l: "Ensure no foreign objects are mounted on container", k: "foreignObjects" }
            ], key: "ceilingRoof" },
            { title: "7. Floor", items: [
                { l: "Ensure floor is flat", k: "flatFloor" },
                { l: "Ensure floor is uniform in height", k: "uniformHeight" },
                { l: "Look for unusual repairs to the floor", k: "unusualRepairs" }
            ], key: "floor" },
            { title: "8. Seal Verification", items: [
                { l: "Seal properly affixed", k: "properlyAffixed" },
                { l: "Seal meets or exceeds PAS ISO17712", k: "meetsISO" },
                { l: "Ensure seal is not broken or damaged", k: "notBroken" }
            ], key: "sealVerification" }
        ];

        let colX = margin;
        let colY = yPos;
        let maxHeight = 0;

        sections.forEach((section, idx) => {
            if (idx % 2 === 0 && idx !== 0) {
                colX = margin;
                colY += maxHeight + 15;
                maxHeight = 0;
                
                // Check page break
                if (colY > pageHeight - 50) {
                    doc.addPage();
                    colY = 20;
                }
            }

            let tempY = colY;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text(section.title, colX, tempY);
            doc.line(colX, tempY + 1, colX + 80, tempY + 1);
            tempY += 8;

            doc.setFont("helvetica", "normal");
            section.items.forEach(item => {
                const checked = (containerInspectionData.checkpoints as any)[section.key][item.k];
                drawCheckbox(colX, tempY, checked);
                
                const splitText = doc.splitTextToSize(item.l, 80);
                doc.text(splitText, colX + 6, tempY);
                tempY += (splitText.length * 4) + 4;
            });

            if ((tempY - colY) > maxHeight) maxHeight = tempY - colY;
            colX += 95;
        });

        yPos = colY + maxHeight + 15;
        
        // Check page break before remarks
        if (yPos > pageHeight - 60) {
            doc.addPage();
            yPos = 30;
        }

        if (containerInspectionData.remarks) {
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("Remarks:", margin, yPos);
            yPos += 5;
            doc.setFont("helvetica", "normal");
            const splitRemarks = doc.splitTextToSize(containerInspectionData.remarks, pageWidth - margin * 2);
            doc.text(splitRemarks, margin, yPos);
            yPos += splitRemarks.length * 5 + 10;
        }

        drawCheckbox(margin, yPos, containerInspectionData.certified);
        doc.setFontSize(8);
        const certText = "I have visually inspected and verified the condition of the container noted above. I confirmed that the container is structurally sound, weather tight, has no false compartments, and the locking mechanism is in good order and shows no visible signs of being tampered with.";
        const splitCert = doc.splitTextToSize(certText, pageWidth - margin * 2 - 10);
        doc.text(splitCert, margin + 6, yPos);
        yPos += splitCert.length * 4 + 10;

    } else {
        // ... (Existing logic for other forms)
        if (activeForm === 'packing' || activeForm === 'unpacking') {
             const isPacking = activeForm === 'packing';
             const data = isPacking ? packingData : unpackingData;
             addTitle(isPacking ? "Packing Services Walk Through" : "Unpacking Services Walk Through");
             
             addField("Client Name", data.clientName, margin, yPos);
             addField("Job Reference", data.jobId, margin + 90, yPos);
             addField("Date", data.date, margin + 140, yPos);
             yPos += 25;
             yPos = addSectionDivider("Walk Through Verification", yPos); yPos += 5;
             
             // --- ADDED SENTENCE FOR PDF ---
             doc.setFontSize(9);
             doc.setFont("helvetica", "normal");
             const disclaimerText = "On completion of your packing/delivery the Crew foreman will walk through the property with you to check and confirm with you the following:";
             const splitDisclaimer = doc.splitTextToSize(disclaimerText, pageWidth - (margin * 2));
             doc.text(splitDisclaimer, margin, yPos);
             yPos += splitDisclaimer.length * 5 + 5;
             // -------------------------------

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
             addField("Client Name", cratingData.clientName, margin, yPos);
             addField("Job Ref", cratingData.jobId, margin + 90, yPos);
             yPos += 15;
             
             // New Fields in PDF
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
             yPos += splitSel.length * 5 + 20;

             // Footer Details
             if (yPos > pageHeight - 60) { doc.addPage(); yPos = 40; }
             const startY = yPos;
             
             // Column 1
             doc.setFont("helvetica", "bold"); doc.text("Missing Numbers:", margin, yPos);
             doc.setFont("helvetica", "normal"); doc.text(r.missingNumbers || '-', margin + 35, yPos); yPos += 6;
             
             doc.setFont("helvetica", "bold"); doc.text("Unnumbered:", margin, yPos);
             doc.setFont("helvetica", "normal"); doc.text(r.unnumbered || '-', margin + 35, yPos); yPos += 6;
             
             doc.setFont("helvetica", "bold"); doc.text("Double Number:", margin, yPos);
             doc.setFont("helvetica", "normal"); doc.text(r.doubleNumber || '-', margin + 35, yPos); yPos += 6;
             
             doc.setFont("helvetica", "bold"); doc.text("Checked By:", margin, yPos);
             doc.setFont("helvetica", "normal"); doc.text(r.checkedBy || '-', margin + 35, yPos);

             yPos = startY;
             const col2X = margin + 90;
             
             // Column 2
             doc.setFont("helvetica", "bold"); doc.text("Total Crates:", col2X, yPos);
             doc.setFont("helvetica", "normal"); doc.text(r.totalCrates || '-', col2X + 35, yPos); yPos += 6;
             
             doc.setFont("helvetica", "bold"); doc.text("Crate Nos:", col2X, yPos);
             doc.setFont("helvetica", "normal"); doc.text(r.crateNos || '-', col2X + 35, yPos); yPos += 6;
             
             doc.setFont("helvetica", "bold"); doc.text("Total Received:", col2X, yPos);
             doc.setFont("helvetica", "normal"); doc.text(r.totalReceived || '-', col2X + 35, yPos); yPos += 6;
             
             doc.setFont("helvetica", "bold"); doc.text("Total Delivered:", col2X, yPos);
             doc.setFont("helvetica", "normal"); doc.text(r.totalDelivered || '-', col2X + 35, yPos);

             yPos = startY;
             const col3X = margin + 180;
             
             // Column 3
             doc.setFont("helvetica", "bold"); doc.text("Truck Details:", col3X, yPos);
             doc.setFont("helvetica", "normal"); doc.text(r.truckDetails || '-', col3X + 30, yPos);
             yPos += 30; // Push yPos down for signature area
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

  const accessorialItems = [
    { key: 'shuttle', title: 'Shuttle service', desc: 'van used for loading or unloading, when a container or a trailer is not permitted at the residence' },
    { key: 'stairCarry', title: 'Stair carry', desc: 'my belongings were carried up the stairs because they could not fit all into the elevator / elevator available (does not apply to single family dwelling)', hasInput: true, inputLabel: 'Floors / Details', inputKey: 'stairCarryFloors' },
    { key: 'elevator', title: 'Elevator', desc: 'elevator was used to carry belongings' },
    { key: 'hoisting', title: 'Hoisting', desc: 'my belongings could not fit through the elevator/door frame due to size and needed to be loaded/unloaded from the residence via outside hoisting' },
    { key: 'longCarry', title: 'Long carry', desc: 'my belongings were carried for more than 200ft/ 50 meters due to narrow/difficult access to the residence', hasInput: true, inputLabel: 'Distance', inputKey: 'longCarryDistance' },
    { key: 'piano', title: 'Piano Handling', desc: 'my belongings included a piano (grand/upright), which required special handling' },
    { key: 'crating', title: 'Crating/Uncrating', desc: 'my belongings included items that needed to be crated/uncrated due to fragile nature' },
    { key: 'extraLabor', title: 'Extra Labor', desc: 'my belongings required additional labor to assemble or handle' },
    { key: 'overtime', title: 'Overtime', desc: 'the crew worked beyond normal business hours' },
    { key: 'preDelivery', title: 'Pre delivery of Cartons', desc: 'Prior to Pack date' },
    { key: 'extraMileage', title: 'Extra Mileage', desc: 'my residence was located more than 50 miles/80km away for the warehouse' },
    { key: 'debrisPickup', title: 'Additional Debris Pick up', desc: '' },
    { key: 'handyman', title: 'Handy Man Service', desc: 'Electrician Plumber Others', hasInput: true, inputLabel: 'Service Type', inputKey: 'handymanType' },
    { key: 'maidService', title: 'Maid/Valet Services', desc: '' },
    { key: 'other', title: 'Other', desc: 'my belongings required additional service, not listed above', hasInput: true, inputLabel: 'Description', inputKey: 'otherDescription' },
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
           {['packing', 'unpacking', 'delivery', 'crating', 'electronicList', 'accessorial', 'warehouseReceipt', 'handyman', 'containerInspection'].map(formId => (
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
                    {activeForm === 'containerInspection' ? <ShieldCheck className="w-6 h-6 text-blue-600" /> : <FileText className="w-6 h-6 text-blue-600" />}
                    {activeForm === 'handyman' ? 'Handyman Completion Report' : 
                     activeForm === 'containerInspection' ? '7-Point Container Inspection' :
                     activeForm.replace(/([A-Z])/g, ' $1').trim()}
                 </h3>
                 {logo && <img src={logo} alt="Company Logo" className="h-10 w-auto object-contain opacity-80 grayscale hover:grayscale-0 transition-all" />}
               </div>
            </div>

            <div className="p-6 md:p-8 space-y-8">
               
               {/* --- CONTAINER INSPECTION FORM --- */}
               {activeForm === 'containerInspection' && (
                   <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date</label><input type="date" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={containerInspectionData.date} onChange={e => setContainerInspectionData({...containerInspectionData, date: e.target.value})} /></div>
                            <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Container Number</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="ABCD 123456-7" value={containerInspectionData.containerNo} onChange={e => setContainerInspectionData({...containerInspectionData, containerNo: e.target.value})} /></div>
                            <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Seal Number</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="SEAL-001" value={containerInspectionData.sealNo} onChange={e => setContainerInspectionData({...containerInspectionData, sealNo: e.target.value})} /></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { title: '1. Outside / Under Carriage', key: 'outsideUndercarriage', items: [
                                    { label: 'Check for Structural damage (dents, holes, repairs)', subKey: 'structuralDamage' },
                                    { label: 'Support beams are visible', subKey: 'supportBeams' },
                                    { label: 'Ensure no foreign objects are mounted on the container', subKey: 'foreignObjects' }
                                ]},
                                { title: '2. Inside / Outside Doors', key: 'insideOutsideDoors', items: [
                                    { label: 'Ensure locks and locking mechanisms are secure and reliable', subKey: 'locksSecure' },
                                    { label: 'Check for loose bolts', subKey: 'looseBolts' },
                                    { label: 'Ensure hinges are secure and reliable', subKey: 'hingesSecure' }
                                ]},
                                { title: '3. Right Side', key: 'rightSide', items: [
                                    { label: 'Look for unusual repairs to structural beams', subKey: 'unusualRepairs' },
                                    { label: 'Repairs to the inside wall must also be visible on the outside & vice versa', subKey: 'repairsVisible' }
                                ]},
                                { title: '4. Left Side', key: 'leftSide', items: [
                                    { label: 'Look for unusual repairs to structural beams', subKey: 'unusualRepairs' },
                                    { label: 'Repairs to the inside wall must also be visible on the outside & vice versa', subKey: 'repairsVisible' }
                                ]},
                                { title: '5. Front Wall', key: 'frontWall', items: [
                                    { label: 'The front wall should be made of corrugated material', subKey: 'corrugated' },
                                    { label: 'Interior blocks in the top corners should be visible. Missing/false blocks are abnormal', subKey: 'blocksVisible' },
                                    { label: 'Ensure vents are visible', subKey: 'ventsVisible' }
                                ]},
                                { title: '6. Ceiling / Roof', key: 'ceilingRoof', items: [
                                    { label: 'Ensure Support beams are visible', subKey: 'supportBeams' },
                                    { label: 'Ensure ventilation holes are visible. They should not be covered or absent', subKey: 'ventilationHoles' },
                                    { label: 'Ensure no foreign objects are mounted on the container', subKey: 'foreignObjects' }
                                ]},
                                { title: '7. Floor', key: 'floor', items: [
                                    { label: 'Ensure the floor of the container is flat', subKey: 'flatFloor' },
                                    { label: 'Ensure the floor is uniform in height', subKey: 'uniformHeight' },
                                    { label: 'Look for unusual repairs to the floor', subKey: 'unusualRepairs' }
                                ]},
                                { title: '8. Seal Verification', key: 'sealVerification', items: [
                                    { label: 'Seal properly affixed', subKey: 'properlyAffixed' },
                                    { label: 'Seal meets or exceeds PAS ISO17712', subKey: 'meetsISO' },
                                    { label: 'Ensure seal is not broken or damaged', subKey: 'notBroken' }
                                ]}
                            ].map(section => (
                                <div key={section.key} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                    <h4 className="font-bold text-sm text-blue-600 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">{section.title}</h4>
                                    <div className="space-y-3">
                                        {section.items.map(item => (
                                            <label key={item.subKey} className="flex items-start gap-3 cursor-pointer group">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 mt-0.5"
                                                    checked={(containerInspectionData.checkpoints as any)[section.key][item.subKey]}
                                                    onChange={e => {
                                                        const newVal = e.target.checked;
                                                        setContainerInspectionData({
                                                            ...containerInspectionData,
                                                            checkpoints: {
                                                                ...containerInspectionData.checkpoints,
                                                                [section.key]: {
                                                                    ...(containerInspectionData.checkpoints as any)[section.key],
                                                                    [item.subKey]: newVal
                                                                }
                                                            }
                                                        });
                                                    }}
                                                />
                                                <span className="text-xs font-bold text-slate-700 group-hover:text-blue-700 transition-colors leading-snug">{item.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Remarks</label>
                                <textarea 
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 h-24" 
                                    value={containerInspectionData.remarks} 
                                    onChange={e => setContainerInspectionData({...containerInspectionData, remarks: e.target.value})} 
                                    placeholder="Enter additional observations..."
                                />
                            </div>
                            
                            <label className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-100 rounded-xl cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 mt-1 rounded text-blue-600 focus:ring-blue-500"
                                    checked={containerInspectionData.certified}
                                    onChange={e => setContainerInspectionData({...containerInspectionData, certified: e.target.checked})}
                                />
                                <span className="text-xs font-bold text-blue-800 leading-relaxed">
                                    I have visually inspected and verified the condition of the container noted above. 
                                    I confirmed that the container is structurally sound, weather tight, has no false compartments, 
                                    and the locking mechanism is in good order and shows no visible signs of being tampered with.
                                </span>
                            </label>
                        </div>
                   </div>
               )}

               {/* --- PACKING & UNPACKING FORM --- */}
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
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Name</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. John Doe" value={deliveryData.clientName} onChange={e => setDeliveryData({...deliveryData, clientName: e.target.value})} /></div>
                           <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Job Ref</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. AE-1002" value={deliveryData.jobId} onChange={e => setDeliveryData({...deliveryData, jobId: e.target.value})} /></div>
                           <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Truck No</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. DXB-998" value={deliveryData.truckNo} onChange={e => setDeliveryData({...deliveryData, truckNo: e.target.value})} /></div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <div className="md:col-span-2 space-y-1">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Delivery Address</label>
                               <input 
                                   className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" 
                                   value={deliveryData.deliveryAddress} 
                                   onChange={e => setDeliveryData({...deliveryData, deliveryAddress: e.target.value})} 
                                   placeholder="Full Address"
                               />
                           </div>
                           <div className="space-y-1">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mode of Shipment</label>
                               <select 
                                   className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" 
                                   value={deliveryData.modeOfShipment} 
                                   onChange={e => setDeliveryData({...deliveryData, modeOfShipment: e.target.value})}
                               >
                                   <option>Sea</option>
                                   <option>Air</option>
                                   <option>Land</option>
                               </select>
                           </div>
                       </div>
                       
                       <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                           <div className="flex justify-between items-center mb-6">
                               <h4 className="font-bold text-slate-700">Delivery Items</h4>
                               <button onClick={addDeliveryItem} className="p-2 bg-white text-blue-600 rounded-lg shadow-sm hover:bg-blue-50 transition-colors"><Plus className="w-4 h-4"/></button>
                           </div>
                           
                           {/* Header Row for Items */}
                           <div className="hidden md:flex gap-3 mb-2 px-2">
                               <div className="w-20 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pkg No</div>
                               <div className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</div>
                               <div className="w-28 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Condition</div>
                               <div className="w-16 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Qty</div>
                               <div className="w-24 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vol (CBM)</div>
                               <div className="w-24 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Wt (KG)</div>
                               <div className="w-8"></div>
                           </div>

                           <div className="space-y-3">
                               {deliveryItems.map(item => (
                                   <div key={item.id} className="flex flex-wrap gap-3 items-center border-b border-slate-200 pb-4 last:border-0 last:pb-0 animate-in slide-in-from-left-2 duration-300">
                                       <div className="w-20">
                                           <input 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
                                                placeholder="e.g. 101" 
                                                value={item.pkgNo} 
                                                onChange={e => updateDeliveryItem(item.id, 'pkgNo', e.target.value)} 
                                           />
                                       </div>
                                       <div className="flex-1 min-w-[200px]">
                                           <input 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
                                                placeholder="e.g. Living Room Sofa" 
                                                value={item.description} 
                                                onChange={e => updateDeliveryItem(item.id, 'description', e.target.value)} 
                                           />
                                       </div>
                                       <div className="w-28">
                                           <select 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
                                                value={item.condition} 
                                                onChange={e => updateDeliveryItem(item.id, 'condition', e.target.value)}
                                           >
                                               <option>Good</option><option>Damaged</option><option>Missing</option>
                                           </select>
                                       </div>
                                       <div className="w-16">
                                           <input 
                                                type="number" 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
                                                placeholder="1" 
                                                value={item.quantity} 
                                                onChange={e => updateDeliveryItem(item.id, 'quantity', parseInt(e.target.value))} 
                                           />
                                       </div>
                                       <div className="w-24">
                                           <input 
                                                type="number" 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
                                                placeholder="CBM" 
                                                value={item.volume} 
                                                onChange={e => updateDeliveryItem(item.id, 'volume', parseFloat(e.target.value))} 
                                           />
                                       </div>
                                       <div className="w-24">
                                           <input 
                                                type="number" 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
                                                placeholder="KG" 
                                                value={item.weight} 
                                                onChange={e => updateDeliveryItem(item.id, 'weight', parseFloat(e.target.value))} 
                                           />
                                       </div>
                                       <button onClick={() => removeDeliveryItem(item.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                                   </div>
                               ))}
                           </div>
                       </div>

                       <div className="space-y-1 mt-6">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Notes / Remarks</label>
                          <textarea 
                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 h-24 resize-none" 
                            value={deliveryData.notes} 
                            onChange={e => setDeliveryData({...deliveryData, notes: e.target.value})} 
                            placeholder="Additional instructions, gate codes, or delivery remarks..."
                          />
                       </div>
                   </div>
               )}

               {/* --- CRATING FORM --- */}
               {activeForm === 'crating' && (
                   <div className="space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Name</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. John Doe" value={cratingData.clientName} onChange={e => setCratingData({...cratingData, clientName: e.target.value})} /></div>
                           <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Job Ref</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. AE-1234" value={cratingData.jobId} onChange={e => setCratingData({...cratingData, jobId: e.target.value})} /></div>
                       </div>

                       <div className="space-y-1">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Address / Location</label>
                           <input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="Full Address" value={cratingData.address} onChange={e => setCratingData({...cratingData, address: e.target.value})} />
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                           <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Packing Date</label><input type="date" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={cratingData.packingDate} onChange={e => setCratingData({...cratingData, packingDate: e.target.value})} /></div>
                           <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Loading Date</label><input type="date" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={cratingData.loadingDate} onChange={e => setCratingData({...cratingData, loadingDate: e.target.value})} /></div>
                           <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Final Destination</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. London, UK" value={cratingData.finalDestination} onChange={e => setCratingData({...cratingData, finalDestination: e.target.value})} /></div>
                           <div className="space-y-1">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mode of Shipment</label>
                               <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={cratingData.modeOfShipment} onChange={e => setCratingData({...cratingData, modeOfShipment: e.target.value})}>
                                   <option>Air</option>
                                   <option>Sea</option>
                                   <option>Land</option>
                               </select>
                           </div>
                       </div>
                       
                       <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                           <div className="flex justify-between items-center mb-6">
                               <h4 className="font-bold text-slate-700">Crate Dimensions (inches)</h4>
                               <button onClick={addCrate} className="p-2 bg-white text-blue-600 rounded-lg shadow-sm hover:bg-blue-50 transition-colors"><Plus className="w-4 h-4"/></button>
                           </div>
                           
                           {/* Header Row */}
                           <div className="hidden md:flex gap-3 mb-2 px-2">
                               <div className="w-20 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pkg No</div>
                               <div className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</div>
                               <div className="w-20 text-[10px] font-bold text-slate-400 uppercase tracking-widest">L (in)</div>
                               <div className="w-20 text-[10px] font-bold text-slate-400 uppercase tracking-widest">W (in)</div>
                               <div className="w-20 text-[10px] font-bold text-slate-400 uppercase tracking-widest">H (in)</div>
                               <div className="w-8"></div>
                           </div>

                           <div className="space-y-3">
                               {crates.map(c => (
                                   <div key={c.id} className="flex flex-wrap gap-3 items-center border-b border-slate-200 pb-4 last:border-0 last:pb-0 animate-in slide-in-from-left-2 duration-300">
                                       <div className="w-20">
                                           <input 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
                                                placeholder="e.g. 5" 
                                                value={c.pkgNo} 
                                                onChange={e => updateCrate(c.id, 'pkgNo', e.target.value)} 
                                           />
                                       </div>
                                       <div className="flex-1 min-w-[200px]">
                                           <input 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
                                                placeholder="e.g. Large Mirror" 
                                                value={c.description} 
                                                onChange={e => updateCrate(c.id, 'description', e.target.value)} 
                                           />
                                       </div>
                                       <div className="w-20">
                                           <input 
                                                type="number" 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
                                                placeholder="L" 
                                                value={c.l} 
                                                onChange={e => updateCrate(c.id, 'l', parseFloat(e.target.value))} 
                                           />
                                       </div>
                                       <div className="w-20">
                                           <input 
                                                type="number" 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
                                                placeholder="W" 
                                                value={c.w} 
                                                onChange={e => updateCrate(c.id, 'w', parseFloat(e.target.value))} 
                                           />
                                       </div>
                                       <div className="w-20">
                                           <input 
                                                type="number" 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
                                                placeholder="H" 
                                                value={c.h} 
                                                onChange={e => updateCrate(c.id, 'h', parseFloat(e.target.value))} 
                                           />
                                       </div>
                                       <button onClick={() => removeCrate(c.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                                   </div>
                               ))}
                           </div>
                           <div className="mt-6 text-right font-black text-slate-700 text-lg border-t border-slate-100 pt-4">
                               Total Volume: {calculateTotalVolume()} CBM
                           </div>
                       </div>
                       
                       <div className="space-y-1 mt-6">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Remarks</label>
                          <textarea 
                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 h-20" 
                            value={cratingData.notes} 
                            onChange={e => setCratingData({...cratingData, notes: e.target.value})} 
                            placeholder="Additional details about crating..."
                          />
                       </div>
                   </div>
               )}

               {/* --- ELECTRONIC LIST --- */}
               {activeForm === 'electronicList' && (
                   <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Name</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. John Doe" value={electronicData.clientName} onChange={e => setElectronicData({...electronicData, clientName: e.target.value})} /></div>
                            <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Job Ref</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. AE-1234" value={electronicData.jobId} onChange={e => setElectronicData({...electronicData, jobId: e.target.value})} /></div>
                        </div>

                        <div className="space-y-1">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Address / Location</label>
                           <input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="Full Address" value={electronicData.address} onChange={e => setElectronicData({...electronicData, address: e.target.value})} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Packing Date</label><input type="date" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={electronicData.packingDate} onChange={e => setElectronicData({...electronicData, packingDate: e.target.value})} /></div>
                           <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Loading Date</label><input type="date" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={electronicData.loadingDate} onChange={e => setElectronicData({...electronicData, loadingDate: e.target.value})} /></div>
                           <div className="space-y-1">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mode of Shipment</label>
                               <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={electronicData.modeOfShipment} onChange={e => setElectronicData({...electronicData, modeOfShipment: e.target.value})}>
                                   <option>Air</option>
                                   <option>Sea</option>
                                   <option>Land</option>
                               </select>
                           </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                           <div className="flex justify-between items-center mb-4">
                               <h4 className="font-bold text-slate-700">Items</h4>
                               <button onClick={addElectronicItem} className="p-2 bg-white text-blue-600 rounded-lg shadow-sm hover:bg-blue-50"><Plus className="w-4 h-4"/></button>
                           </div>
                           
                           {/* Header Row */}
                           <div className="hidden md:flex gap-3 mb-2 px-2">
                               <div className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item Description</div>
                               <div className="w-24 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Make</div>
                               <div className="w-24 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Model</div>
                               <div className="w-24 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Serial No</div>
                               <div className="w-24 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Condition</div>
                               <div className="w-8"></div>
                           </div>

                           <div className="space-y-3">
                               {electronicItems.map(i => (
                                   <div key={i.id} className="flex flex-wrap gap-3 items-center border-b border-slate-200 pb-4 last:border-0 last:pb-0 animate-in slide-in-from-left-2 duration-300">
                                       <div className="flex-1 min-w-[200px]">
                                           <input 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
                                                placeholder="e.g. LED TV" 
                                                value={i.description} 
                                                onChange={e => updateElectronicItem(i.id, 'description', e.target.value)} 
                                           />
                                       </div>
                                       <div className="w-24">
                                           <input 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
                                                placeholder="e.g. Sony" 
                                                value={i.make} 
                                                onChange={e => updateElectronicItem(i.id, 'make', e.target.value)} 
                                           />
                                       </div>
                                       <div className="w-24">
                                           <input 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
                                                placeholder="e.g. X90" 
                                                value={i.model} 
                                                onChange={e => updateElectronicItem(i.id, 'model', e.target.value)} 
                                           />
                                       </div>
                                       <div className="w-24">
                                           <input 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
                                                placeholder="S/N 123" 
                                                value={i.serial} 
                                                onChange={e => updateElectronicItem(i.id, 'serial', e.target.value)} 
                                           />
                                       </div>
                                       <div className="w-24">
                                           <select 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" 
                                                value={i.condition} 
                                                onChange={e => updateElectronicItem(i.id, 'condition', e.target.value)}
                                           >
                                               <option>Good</option><option>Damaged</option><option>Scratch</option>
                                           </select>
                                       </div>
                                       <button onClick={() => removeElectronicItem(i.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                                   </div>
                               ))}
                           </div>
                        </div>
                        
                        <div className="space-y-1 mt-6">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Remarks</label>
                          <textarea 
                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 h-20" 
                            value={electronicData.remarks} 
                            onChange={e => setElectronicData({...electronicData, remarks: e.target.value})} 
                            placeholder="Additional details about electronics..."
                          />
                        </div>
                   </div>
               )}

               {/* --- ACCESSORIAL SERVICES --- */}
               {activeForm === 'accessorial' && (
                   <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Name</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. John Doe" value={accessorialData.clientName} onChange={e => setAccessorialData({...accessorialData, clientName: e.target.value})} /></div>
                            <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Job Ref</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. AE-1234" value={accessorialData.jobId} onChange={e => setAccessorialData({...accessorialData, jobId: e.target.value})} /></div>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-2">Please check all that apply:</h4>
                            {accessorialItems.map((item) => (
                                <div key={item.key} className={`flex flex-col p-4 rounded-xl border transition-all ${
                                    (accessorialData.services as any)[item.key] ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'
                                }`}>
                                    <label className="flex items-start gap-4 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="w-5 h-5 mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                                            checked={(accessorialData.services as any)[item.key]} 
                                            onChange={e => setAccessorialData({...accessorialData, services: {...accessorialData.services, [item.key]: e.target.checked}})}
                                        />
                                        <div className="flex-1">
                                            <span className="font-bold text-sm text-slate-800 block mb-1">{item.title}</span>
                                            {item.desc && <span className="text-xs font-medium text-slate-500">{item.desc}</span>}
                                        </div>
                                    </label>
                                    
                                    {/* Conditional Inputs for Details */}
                                    {item.hasInput && (accessorialData.services as any)[item.key] && (
                                        <div className="mt-3 ml-9 animate-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                                    {item.inputLabel}
                                                </label>
                                                <input 
                                                    type="text" 
                                                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                                                    value={(accessorialData.details as any)[item.inputKey!]} 
                                                    onChange={e => setAccessorialData({
                                                        ...accessorialData, 
                                                        details: { ...accessorialData.details, [item.inputKey!]: e.target.value }
                                                    })}
                                                    placeholder="Enter details..."
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        <div className="space-y-1 mt-6">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Remarks</label>
                          <textarea 
                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 h-20" 
                            value={accessorialData.remarks} 
                            onChange={e => setAccessorialData({...accessorialData, remarks: e.target.value})} 
                            placeholder="Additional comments..."
                          />
                        </div>
                   </div>
               )}

               {/* --- WAREHOUSE RECEIPT --- */}
               {activeForm === 'warehouseReceipt' && (
                   <div className="space-y-6">
                       {/* Header inputs */}
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <input className="px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="Client Name (e.g. Global Trading)" value={warehouseReceiptData.clientName} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, clientName: e.target.value})} />
                           <input className="px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="File No (e.g. FILE-001)" value={warehouseReceiptData.fileNo} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, fileNo: e.target.value})} />
                           <input className="px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="Total Pkgs (e.g. 50)" value={warehouseReceiptData.totalPkgs} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, totalPkgs: e.target.value})} />
                           <input className="px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="Volume (e.g. 20 CBM)" value={warehouseReceiptData.volume} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, volume: e.target.value})} />
                           <input className="px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="Container No (e.g. CONT123456)" value={warehouseReceiptData.containerNo} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, containerNo: e.target.value})} />
                           <input className="px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="Seal No (e.g. SEAL999)" value={warehouseReceiptData.sealNo} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, sealNo: e.target.value})} />
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

                       {/* Footer Details Inputs */}
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
                            <div className="space-y-4">
                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Missing Numbers</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. 5, 12, 40" value={warehouseReceiptData.missingNumbers} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, missingNumbers: e.target.value})} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Unnumbered</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. 2 Pkgs" value={warehouseReceiptData.unnumbered} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, unnumbered: e.target.value})} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Double Number</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. 10 (2)" value={warehouseReceiptData.doubleNumber} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, doubleNumber: e.target.value})} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Checked By</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="Staff Name" value={warehouseReceiptData.checkedBy} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, checkedBy: e.target.value})} /></div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Total Crates</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. 5" value={warehouseReceiptData.totalCrates} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, totalCrates: e.target.value})} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Crate Nos</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. 1-5" value={warehouseReceiptData.crateNos} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, crateNos: e.target.value})} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Total Received</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. 150" value={warehouseReceiptData.totalReceived} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, totalReceived: e.target.value})} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Total Delivered</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. 150" value={warehouseReceiptData.totalDelivered} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, totalDelivered: e.target.value})} /></div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Truck Details</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. DXB-998 / Driver Name" value={warehouseReceiptData.truckDetails} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, truckDetails: e.target.value})} /></div>
                            </div>
                       </div>
                   </div>
               )}

               {/* --- HANDYMAN FORM --- */}
               {activeForm === 'handyman' && (
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Name</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. John Doe" value={handymanData.clientName} onChange={e => setHandymanData({...handymanData, clientName: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">File No</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. FILE-101" value={handymanData.fileNo} onChange={e => setHandymanData({...handymanData, fileNo: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date</label><input type="date" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={handymanData.date} onChange={e => setHandymanData({...handymanData, date: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Address</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. Villa 12, Springs 4" value={handymanData.address} onChange={e => setHandymanData({...handymanData, address: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Handyman Assigned</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. Mike Smith" value={handymanData.handymanAssigned} onChange={e => setHandymanData({...handymanData, handymanAssigned: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Day Assigned</label><input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. Monday" value={handymanData.dayAssigned} onChange={e => setHandymanData({...handymanData, dayAssigned: e.target.value})} /></div>
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
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Time In</label><input type="time" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={handymanData.timeIn} onChange={e => setHandymanData({...handymanData, timeIn: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Time Out</label><input type="time" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400" value={handymanData.timeOut} onChange={e => setHandymanData({...handymanData, timeOut: e.target.value})} /></div>
                    </div>
                    
                    <div className="space-y-1 mt-6">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Remarks</label>
                      <textarea 
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 h-20" 
                        value={handymanData.remarks} 
                        onChange={e => setHandymanData({...handymanData, remarks: e.target.value})} 
                        placeholder="Work completion notes..."
                      />
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
                     <div className="flex flex-col">
                        <span>{activeForm === 'delivery' ? 'Receiver Signature' : 'Client / Rep Signature'}</span>
                        {getClientName() && <span className="text-slate-900 mt-0.5">{getClientName()}</span>}
                     </div>
                     <span>Date: {new Date().toLocaleDateString()}</span>
                  </div>
               </div>
            </div>
        </div>
      </div>
    </div>
  );
};
