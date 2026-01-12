
import React, { useState, useRef, useEffect } from 'react';
import { FileText, Package, Box, Truck, Eraser, PenTool, Plus, Trash2, Printer, ClipboardCheck, Layers, ArrowLeftRight, ChevronLeft, ChevronRight, CheckSquare, Square, Monitor, Upload, Image as ImageIcon } from 'lucide-react';
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

interface WriterDocsProps {
  logo?: string;
  onUpdateLogo?: (base64: string) => void;
  isAdmin?: boolean;
  currentUser?: UserProfile;
}

export const WriterDocs: React.FC<WriterDocsProps> = ({ logo, onUpdateLogo, isAdmin, currentUser }) => {
  const [activeForm, setActiveForm] = useState<'packing' | 'unpacking' | 'delivery' | 'crating' | 'electronicList' | 'accessorial' | 'warehouseReceipt'>('packing');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Packing Form State ---
  const [packingData, setPackingData] = useState<PackingForm>({
    clientName: '', jobId: '', date: new Date().toISOString().split('T')[0],
    walkThrough: {
      noDamage: false,
      itemsCheck: false,
      foundDamage: false
    },
    clientNotes: ''
  });

  // --- Unpacking Form State ---
  const [unpackingData, setUnpackingData] = useState<UnpackingForm>({
    clientName: '', jobId: '', date: new Date().toISOString().split('T')[0],
    walkThrough: {
      noDamage: false,
      itemsCheck: false,
      foundDamage: false
    },
    clientNotes: ''
  });

  // --- Delivery Form State ---
  const [deliveryData, setDeliveryData] = useState({
    clientName: '', jobId: '', date: new Date().toISOString().split('T')[0], truckNo: '', notes: ''
  });
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>([]);

  // --- Crating Form State ---
  const [cratingData, setCratingData] = useState({
    clientName: '', jobId: '', date: new Date().toISOString().split('T')[0], notes: ''
  });
  const [crates, setCrates] = useState<CratingItem[]>([]);

  // --- Electronic List State ---
  const [electronicData, setElectronicData] = useState({
    clientName: '', jobId: '', date: new Date().toISOString().split('T')[0]
  });
  const [electronicItems, setElectronicItems] = useState<ElectronicItem[]>([]);

  // --- Accessorial Form State ---
  const [accessorialData, setAccessorialData] = useState<AccessorialForm>({
    clientName: '',
    jobId: '',
    date: new Date().toISOString().split('T')[0],
    serviceType: { packing: false, delivery: false },
    services: {
      shuttle: false, stairCarry: false, elevator: false, hoisting: false,
      longCarry: false, piano: false, crating: false, extraLabor: false,
      overtime: false, preDelivery: false, extraMileage: false, debrisPickup: false,
      handyman: false, maidService: false, other: false
    },
    details: {
      stairCarryFloors: '',
      longCarryDistance: '',
      handymanType: '',
      otherDescription: ''
    }
  });

  // --- Warehouse Receipt Form State ---
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
  
  // Warehouse UI State
  const [gridPage, setGridPage] = useState(0); // 0 = 1-200, 1 = 201-400, etc.
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

  // Global mouse up for drag selection safety
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
  const addDeliveryItem = () => {
    setDeliveryItems([...deliveryItems, { id: Date.now().toString(), description: '', condition: 'Good', quantity: 1 }]);
  };
  
  const addCrate = () => {
    setCrates([...crates, { id: Date.now().toString(), description: '', l: 0, w: 0, h: 0 }]);
  };

  const addElectronicItem = () => {
    setElectronicItems([...electronicItems, { id: Date.now().toString(), description: '', make: '', model: '', serial: '', condition: 'Good' }]);
  };

  const removeDeliveryItem = (id: string) => setDeliveryItems(deliveryItems.filter(i => i.id !== id));
  const removeCrate = (id: string) => setCrates(crates.filter(c => c.id !== id));
  const removeElectronicItem = (id: string) => setElectronicItems(electronicItems.filter(i => i.id !== id));

  const updateDeliveryItem = (id: string, field: keyof DeliveryItem, value: any) => {
    setDeliveryItems(deliveryItems.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const updateCrate = (id: string, field: keyof CratingItem, value: any) => {
    setCrates(crates.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const updateElectronicItem = (id: string, field: keyof ElectronicItem, value: any) => {
    setElectronicItems(electronicItems.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const calculateTotalVolume = () => {
    return crates.reduce((acc, c) => acc + ((c.l * c.w * c.h) / 1728 / 35.34), 0).toFixed(3);
  };

  const updatePackageSelection = (num: number, mode: 'select' | 'deselect') => {
    setWarehouseReceiptData(prev => {
        const isSelected = prev.selectedPackages.includes(num);
        if (mode === 'select' && !isSelected) {
            return { ...prev, selectedPackages: [...prev.selectedPackages, num] };
        } else if (mode === 'deselect' && isSelected) {
            return { ...prev, selectedPackages: prev.selectedPackages.filter(n => n !== num) };
        }
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
    if (isDragging) {
      updatePackageSelection(num, dragMode);
    }
  };

  const handleSelectAllCurrentPage = () => {
      const start = gridPage * 200 + 1;
      const end = Math.min((gridPage + 1) * 200, 1000);
      const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      
      const allSelected = range.every(num => warehouseReceiptData.selectedPackages.includes(num));
      
      setWarehouseReceiptData(prev => {
          let newSelection = [...prev.selectedPackages];
          if (allSelected) {
              // Deselect all in range
              newSelection = newSelection.filter(n => !range.includes(n));
          } else {
              // Select all in range
              const toAdd = range.filter(n => !newSelection.includes(n));
              newSelection = [...newSelection, ...toAdd];
          }
          return { ...prev, selectedPackages: newSelection };
      });
  };

  const handleClearForm = () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Clear signature canvas
    clearSignature();

    switch (activeForm) {
      case 'packing':
        setPackingData({
          clientName: '', jobId: '', date: today,
          walkThrough: {
            noDamage: false,
            itemsCheck: false,
            foundDamage: false
          },
          clientNotes: ''
        });
        break;
      case 'unpacking':
        setUnpackingData({
          clientName: '', jobId: '', date: today,
          walkThrough: {
            noDamage: false,
            itemsCheck: false,
            foundDamage: false
          },
          clientNotes: ''
        });
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
        setAccessorialData({
          clientName: '', jobId: '', date: today,
          serviceType: { packing: false, delivery: false },
          services: {
            shuttle: false, stairCarry: false, elevator: false, hoisting: false,
            longCarry: false, piano: false, crating: false, extraLabor: false,
            overtime: false, preDelivery: false, extraMileage: false, debrisPickup: false,
            handyman: false, maidService: false, other: false
          },
          details: { stairCarryFloors: '', longCarryDistance: '', handymanType: '', otherDescription: '' }
        });
        break;
      case 'warehouseReceipt':
        setWarehouseReceiptData({
          clientName: '', fileNo: '', date: today,
          type: 'Export', mode: 'Sea',
          whLocation: '', totalPkgs: '', volume: '',
          containerNo: '', sealNo: '', truckDetails: '',
          missingNumbers: '', unnumbered: '', doubleNumber: '',
          totalCrates: '', crateNos: '',
          totalReceived: '', totalDelivered: '', checkedBy: '',
          selectedPackages: []
        });
        setGridPage(0);
        break;
    }
  };

  const handlePrint = () => {
    // For Warehouse Receipt, use Landscape
    const isLandscape = activeForm === 'warehouseReceipt';
    const doc = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait' }) as any;
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20; // More generous margin for "luxury" feel
    let yPos = 20;

    // Premium Color Palette
    const colors = {
      textDark: [45, 55, 72], // Charcoal
      textLight: [113, 128, 150], // Muted Slate
      accent: [30, 41, 59], // Deep Slate Blue/Black for subtle accents
      border: [226, 232, 240], // Very light gray border
      bg: [248, 250, 252], // Off-white for section backgrounds
    };

    // Helper: Minimalist Header
    const addTitle = (title: string, showHeader: boolean = true) => {
      let titleXOffset = 0;

      // Company Logo Logic - Dynamic Sizing
      if (logo) {
        // Define standard box size for logo in header (approx 50mm wide x 25mm high)
        const maxLogoW = 50; 
        const maxLogoH = 25;
        
        try {
            // Get image properties to calculate aspect ratio
            const imgProps = doc.getImageProperties(logo);
            const ratio = imgProps.width / imgProps.height;
            
            // Calculate dimensions to fit in box while maintaining aspect ratio
            let renderW = maxLogoW;
            let renderH = renderW / ratio;
            
            if (renderH > maxLogoH) {
                renderH = maxLogoH;
                renderW = renderH * ratio;
            }
            
            // Add Logo
            doc.addImage(logo, 'PNG', margin, 10, renderW, renderH);
            
            // Offset text to the right of the logo, plus some padding
            titleXOffset = renderW + 5; 
        } catch (e) {
            console.error("Error adding logo", e);
            // Fallback square if calculation fails
            doc.rect(margin, 15, 10, 10);
            titleXOffset = 15;
        }
      } else {
        // Fallback: Small minimalist company mark if no logo
        doc.setDrawColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
        doc.setLineWidth(0.5);
        doc.rect(margin, 15, 6, 6, 'F'); 
        titleXOffset = 10;
      }
      
      const textX = margin + titleXOffset;

      doc.setFontSize(10);
      doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
      doc.setFont("helvetica", "bold");
      doc.text("WRITER RELOCATIONS", textX, 18);
      
      doc.setFontSize(8);
      doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
      doc.setFont("helvetica", "normal");
      doc.text("PREMIUM LOGISTICS SERVICES", textX, 22);

      // Top right Divider
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.line(margin, 38, pageWidth - margin, 38);

      yPos = 50;
      
      // Main Document Title
      if (showHeader) {
        doc.setFontSize(22);
        doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
        doc.setFont("helvetica", "bold");
        doc.text(title, margin, yPos);
        yPos += 20;
      }
    };

    // Helper: Clean Field (Label + Value)
    const addField = (label: string, value: string, x: number, y: number) => {
       doc.setFontSize(7);
       doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
       doc.setFont("helvetica", "bold");
       // Letter-spacing simulation (not supported directly, just font choice)
       doc.text(label.toUpperCase(), x, y);
       
       doc.setFontSize(10);
       doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
       doc.setFont("helvetica", "normal");
       doc.text(value || '—', x, y + 5);
    };

    // Helper: Section Divider
    const addSectionDivider = (label: string, y: number) => {
       doc.setFontSize(8);
       doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
       doc.setFont("helvetica", "bold");
       doc.text(label.toUpperCase(), margin, y);
       doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
       doc.setLineWidth(0.1);
       doc.line(margin, y + 3, pageWidth - margin, y + 3);
       return y + 10;
    };

    if (activeForm === 'packing') {
      addTitle("Packing Services Walk Through");
      
      addField("Client Name", packingData.clientName, margin, yPos);
      addField("Job Reference", packingData.jobId, margin + 90, yPos);
      addField("Date", packingData.date, margin + 140, yPos);
      yPos += 25;
      
      yPos = addSectionDivider("Walk Through Verification", yPos);
      yPos += 5;

      const checkItem = (text: string, checked: boolean, y: number) => {
         // Draw modern checkbox
         doc.setDrawColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
         doc.setLineWidth(0.2);
         doc.rect(margin, y - 3, 4, 4);
         
         if (checked) {
             doc.setFillColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
             doc.rect(margin + 1, y - 2, 2, 2, 'F');
         }
         
         doc.setFontSize(9);
         doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
         doc.setFont("helvetica", "normal");
         doc.text(text, margin + 10, y);
      };
      
      checkItem("I confirm the property was checked with the crew foreman and found NO damage.", packingData.walkThrough.noDamage, yPos + 10);
      checkItem("I confirm all items have been packed/removed; no empty cartons left behind.", packingData.walkThrough.itemsCheck, yPos + 20);
      checkItem("I confirm the property was checked and found the following damage (detailed below).", packingData.walkThrough.foundDamage, yPos + 30);
      
      yPos += 50;
      
      if (packingData.clientNotes) {
        yPos = addSectionDivider("Notes / Damage Report", yPos);
        yPos += 5;
        doc.setFontSize(9);
        doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
        doc.setFont("helvetica", "normal");
        const splitNotes = doc.splitTextToSize(packingData.clientNotes, pageWidth - (margin*2));
        doc.text(splitNotes, margin, yPos);
        yPos += splitNotes.length * 5 + 10;
      }

    } else if (activeForm === 'unpacking') {
      addTitle("Unpacking Services Walk Through");
      addField("Client Name", unpackingData.clientName, margin, yPos);
      addField("Job Reference", unpackingData.jobId, margin + 90, yPos);
      addField("Date", unpackingData.date, margin + 140, yPos);
      yPos += 25;
      
      yPos = addSectionDivider("Walk Through Verification", yPos);
      yPos += 5;

      const checkItem = (text: string, checked: boolean, y: number) => {
         doc.setDrawColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
         doc.setLineWidth(0.2);
         doc.rect(margin, y - 3, 4, 4);
         if (checked) {
             doc.setFillColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
             doc.rect(margin + 1, y - 2, 2, 2, 'F');
         }
         doc.setFontSize(9);
         doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
         doc.text(text, margin + 10, y);
      };
      checkItem("I confirm the property was checked with the crew foreman and found NO damage.", unpackingData.walkThrough.noDamage, yPos + 10);
      checkItem("I confirm all items unpacked/removed and debris cleared.", unpackingData.walkThrough.itemsCheck, yPos + 20);
      checkItem("I confirm the property was checked and found the following damage.", unpackingData.walkThrough.foundDamage, yPos + 30);
      
      yPos += 50;
      if (unpackingData.clientNotes) {
        yPos = addSectionDivider("Notes / Damage Report", yPos);
        yPos += 5;
        doc.setFontSize(9);
        doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
        const splitNotes = doc.splitTextToSize(unpackingData.clientNotes, pageWidth - (margin*2));
        doc.text(splitNotes, margin, yPos);
        yPos += splitNotes.length * 5 + 10;
      }
      
    } else if (activeForm === 'delivery') {
      addTitle("Delivery / Received Order");
      addField("Client Name", deliveryData.clientName, margin, yPos);
      addField("Job Reference", deliveryData.jobId, margin + 90, yPos);
      addField("Truck No.", deliveryData.truckNo, margin + 140, yPos);
      yPos += 30;

      // Minimal Table
      doc.autoTable({
        startY: yPos,
        head: [['ITEM DESCRIPTION', 'QTY', 'CONDITION']],
        body: deliveryItems.map(item => [item.description, item.quantity, item.condition]),
        margin: { left: margin, right: margin },
        headStyles: { 
            fillColor: [255, 255, 255], 
            textColor: colors.textLight, 
            fontStyle: 'bold', 
            fontSize: 7,
            lineWidth: { bottom: 0.1 },
            lineColor: colors.border
        }, 
        bodyStyles: { 
            textColor: colors.textDark,
            fontSize: 9,
            cellPadding: { top: 3, bottom: 3, left: 0, right: 0 }
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 20 },
            2: { cellWidth: 40 }
        },
        theme: 'plain' // Removes default striping/borders for a cleaner look
      });
      yPos = doc.lastAutoTable.finalY + 15;
      
      if (deliveryData.notes) {
        yPos = addSectionDivider("Additional Notes", yPos);
        yPos += 5;
        doc.setFontSize(9);
        doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
        const splitNotes = doc.splitTextToSize(deliveryData.notes, pageWidth - (margin*2));
        doc.text(splitNotes, margin, yPos);
        yPos += splitNotes.length * 5 + 10;
      }
      
    } else if (activeForm === 'crating') {
      addTitle("Final Crating Specification");
      addField("Client Name", cratingData.clientName, margin, yPos);
      addField("Job Reference", cratingData.jobId, margin + 90, yPos);
      addField("Date", cratingData.date, margin + 140, yPos);
      yPos += 30;

      doc.autoTable({
        startY: yPos,
        head: [['DESCRIPTION', 'LENGTH', 'WIDTH', 'HEIGHT', 'VOL (m³)']],
        body: [
            ...crates.map(c => [c.description, c.l, c.w, c.h, ((c.l * c.w * c.h) / 1728 / 35.34).toFixed(3)]),
        ],
        foot: [['', '', '', 'TOTAL VOLUME', calculateTotalVolume() + ' m³']],
        margin: { left: margin, right: margin },
        headStyles: { 
            fillColor: [255, 255, 255], 
            textColor: colors.textLight, 
            fontStyle: 'bold', 
            fontSize: 7,
            lineWidth: { bottom: 0.1 },
            lineColor: colors.border
        }, 
        bodyStyles: { 
            textColor: colors.textDark,
            fontSize: 9,
            cellPadding: { top: 3, bottom: 3, left: 0, right: 0 }
        },
        footStyles: {
            fillColor: [255, 255, 255],
            textColor: colors.textDark,
            fontStyle: 'bold',
            fontSize: 9,
            lineWidth: { top: 0.1 },
            lineColor: colors.border
        },
        theme: 'plain'
      });
      yPos = doc.lastAutoTable.finalY + 15;
      if (cratingData.notes) {
        yPos = addSectionDivider("Additional Notes", yPos);
        yPos += 5;
        doc.setFontSize(9);
        doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
        const splitNotes = doc.splitTextToSize(cratingData.notes, pageWidth - (margin*2));
        doc.text(splitNotes, margin, yPos);
        yPos += splitNotes.length * 5 + 10;
      }
    } else if (activeForm === 'electronicList') {
      addTitle("Electronic Equipment Inventory");
      
      addField("Client Name", electronicData.clientName, margin, yPos);
      addField("Job Reference", electronicData.jobId, margin + 90, yPos);
      addField("Date", electronicData.date, margin + 140, yPos);
      yPos += 30;

      doc.autoTable({
        startY: yPos,
        head: [['DESCRIPTION', 'BRAND / MAKE', 'MODEL', 'SERIAL NO.', 'CONDITION']],
        body: electronicItems.map(item => [item.description, item.make, item.model, item.serial, item.condition]),
        margin: { left: margin, right: margin },
        headStyles: { 
            fillColor: [255, 255, 255], 
            textColor: colors.textLight, 
            fontStyle: 'bold', 
            fontSize: 7,
            lineWidth: { bottom: 0.1 },
            lineColor: colors.border
        }, 
        bodyStyles: { 
            textColor: colors.textDark,
            fontSize: 9,
            cellPadding: { top: 3, bottom: 3, left: 0, right: 0 }
        },
        theme: 'plain'
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
    } else if (activeForm === 'accessorial') {
      addTitle("Accessorial Services Confirmation");
      addField("Client Name", accessorialData.clientName, margin, yPos);
      addField("Job Reference", accessorialData.jobId, margin + 90, yPos);
      addField("Date", accessorialData.date, margin + 140, yPos);
      yPos += 25;
      
      doc.setFontSize(9);
      doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
      doc.text("Services provided during:", margin, yPos);
      yPos += 8;
      
      const drawCheckbox = (x: number, y: number, checked: boolean) => {
          doc.setDrawColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
          doc.rect(x, y-3, 4, 4);
          if(checked) {
              doc.setFillColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
              doc.rect(x+1, y-2, 2, 2, 'F');
          }
      }
      
      drawCheckbox(margin + 5, yPos, accessorialData.serviceType.packing);
      doc.text("Packing Phase", margin + 13, yPos);
      drawCheckbox(margin + 60, yPos, accessorialData.serviceType.delivery);
      doc.text("Delivery Phase", margin + 68, yPos);
      
      yPos += 15;
      yPos = addSectionDivider("Service Checklist", yPos);
      yPos += 5;

      doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
      doc.setFont("helvetica", "normal");
      
      const services = [
          { key: 'shuttle', label: 'Shuttle service - van used for loading/unloading' },
          { key: 'stairCarry', label: `Stair carry ${accessorialData.details.stairCarryFloors ? `(${accessorialData.details.stairCarryFloors})` : ''} - belongings carried up stairs` },
          { key: 'elevator', label: 'Elevator - elevator was used to carry belongings' },
          { key: 'hoisting', label: 'Hoisting - via outside hoisting' },
          { key: 'longCarry', label: `Long carry ${accessorialData.details.longCarryDistance ? `(${accessorialData.details.longCarryDistance})` : ''} - > 200ft/50 meters` },
          { key: 'piano', label: 'Piano Handling - Grand/Upright' },
          { key: 'crating', label: 'Crating/Uncrating - fragile items' },
          { key: 'extraLabor', label: 'Extra Labor - assemble or handle' },
          { key: 'overtime', label: 'Overtime - beyond normal business hours' },
          { key: 'preDelivery', label: 'Pre delivery of Cartons - Prior to Pack date' },
          { key: 'extraMileage', label: 'Extra Mileage - > 50 miles/80km' },
          { key: 'debrisPickup', label: 'Additional Debris Pick up' },
          { key: 'handyman', label: `Handy Man Service ${accessorialData.details.handymanType ? `(${accessorialData.details.handymanType})` : ''}` },
          { key: 'maidService', label: 'Maid/Valet Services' },
          { key: 'other', label: `Other ${accessorialData.details.otherDescription ? `(${accessorialData.details.otherDescription})` : ''}` },
      ];
      services.forEach((service) => {
         const checked = (accessorialData.services as any)[service.key];
         drawCheckbox(margin, yPos, checked);
         // Dim unchecked items slightly
         if (checked) {
             doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
         } else {
             doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
         }
         doc.text(service.label, margin + 8, yPos);
         yPos += 8;
      });
      
    } else if (activeForm === 'warehouseReceipt') {
      
      const selected = warehouseReceiptData.selectedPackages.sort((a, b) => a - b);
      const boxWidth = 14; 
      const boxHeight = 8;
      const cols = Math.floor((pageWidth - (margin * 2)) / boxWidth);
      const availableHeightP1 = pageHeight - 90 - 50; 
      const availableHeightPn = pageHeight - 40 - 50;
      const rowsP1 = Math.floor(availableHeightP1 / boxHeight);
      const rowsPn = Math.floor(availableHeightPn / boxHeight);
      const itemsP1 = cols * rowsP1;
      const itemsPn = cols * rowsPn;
      let totalPages = 1;
      if (selected.length > itemsP1) {
          totalPages = 1 + Math.ceil((selected.length - itemsP1) / itemsPn);
      }
      
      // Function to draw header
      const drawHeader = (pageNum: number) => {
          yPos = 20;
          addTitle(`WAREHOUSE RECEIPT (Page ${pageNum}/${totalPages})`, pageNum === 1);
          
          doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
          doc.setLineWidth(0.1);
          doc.setFontSize(8);
          
          if (pageNum === 1) {
              let x = pageWidth - 90;
              let topRowY = 20; 
              ['EXPORT', 'IMPORT', 'STORAGE'].forEach(type => {
                  const checked = warehouseReceiptData.type === type;
                  doc.rect(x, topRowY, 4, 4);
                  if (checked) { doc.setFillColor(colors.textDark[0]); doc.rect(x+1, topRowY+1, 2, 2, 'F'); }
                  doc.text(type, x + 6, topRowY + 3);
                  x += 25;
              });
              
              // Clean Info Grid instead of box
              yPos = 45;
              const col1 = margin;
              const col2 = margin + 100;
              const col3 = margin + 180;
              
              // Use light line dividers
              doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5);
              
              addField("Name of Client", warehouseReceiptData.clientName, col1, yPos);
              addField("File No", warehouseReceiptData.fileNo, col2, yPos);
              addField("Date", warehouseReceiptData.date, col3, yPos);
              yPos += 15;
              
              doc.setFontSize(7);
              doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
              doc.setFont("helvetica", "bold");
              doc.text("MODE OF SHIPMENT", margin, yPos);
              
              let modeX = margin + 35;
              ['Air', 'Sea', 'Land'].forEach((mode) => {
                  const checked = warehouseReceiptData.mode === mode;
                  doc.rect(modeX, yPos - 3, 3, 3);
                  if (checked) { doc.setFillColor(colors.textDark[0]); doc.rect(modeX + 0.5, yPos - 2.5, 2, 2, 'F'); }
                  doc.setFontSize(9);
                  doc.setTextColor(colors.textDark[0]);
                  doc.setFont("helvetica", "normal");
                  doc.text(mode.toUpperCase(), modeX + 5, yPos);
                  modeX += 20;
              });
              
              yPos += 15;
          } else {
              doc.setFont("helvetica", "normal");
              doc.text(`File: ${warehouseReceiptData.fileNo} | Client: ${warehouseReceiptData.clientName}`, margin, yPos);
              yPos += 10;
          }
          
          yPos += 5;
          
          // Clean Stats Row
          const gridWidth = pageWidth - (margin * 2);
          const colWidth = gridWidth / 4;
          
          // Background strip for stats
          doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
          doc.rect(margin, yPos - 5, gridWidth, 10, 'F');
          
          const drawStat = (label: string, value: string, x: number) => {
             doc.setFontSize(7);
             doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
             doc.setFont("helvetica", "bold");
             doc.text(label.toUpperCase(), x, yPos + 2);
             doc.setFontSize(9);
             doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
             doc.setFont("helvetica", "normal");
             doc.text(value || '-', x + 25, yPos + 2);
          };
          
          drawStat("Location", warehouseReceiptData.whLocation, margin + 5);
          drawStat("Total Pkgs", warehouseReceiptData.totalPkgs, margin + colWidth + 5);
          drawStat("Volume", warehouseReceiptData.volume, margin + (colWidth * 2) + 5);
          drawStat("Page Pkgs", pageNum === 1 ? itemsP1.toString() : itemsPn.toString(), margin + (colWidth * 3) + 5);
          
          yPos += 15;
      };

      // Loop to draw pages
      for (let page = 1; page <= totalPages; page++) {
          if (page > 1) {
              doc.addPage();
          }
          drawHeader(page);
          
          const itemsThisPage = page === 1 ? itemsP1 : itemsPn;
          const startIndex = page === 1 ? 0 : itemsP1 + ((page - 2) * itemsPn);
          const pageItems = selected.slice(startIndex, startIndex + itemsThisPage);
          
          let curRow = 0;
          let curCol = 0;
          
          if (pageItems.length === 0 && selected.length === 0) {
              doc.setFontSize(10);
              doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
              doc.text("No specific packages selected.", margin, yPos + 10);
              yPos += 30;
          } else {
              pageItems.forEach(num => {
                 const x = margin + (curCol * boxWidth);
                 const y = yPos + (curRow * boxHeight);
                 
                 // Minimal grid cell
                 doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
                 doc.rect(x, y, boxWidth, boxHeight);
                 
                 doc.setFontSize(7);
                 doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
                 doc.text(num.toString(), x + boxWidth/2, y + 5, { align: 'center' });
                 
                 curCol++;
                 if (curCol >= cols) {
                     curCol = 0;
                     curRow++;
                 }
              });
              yPos += (Math.ceil(pageItems.length / cols) * boxHeight) + 10;
          }
          
          // Draw Footer on last page
          if (page === totalPages) {
              yPos = Math.max(yPos, pageHeight - 75); // Increased safety margin for summary
              
              yPos = addSectionDivider("Receipt Summary", yPos);
              
              doc.setFontSize(8);
              const drawLineInput = (label: string, value: string, x: number, y: number, w: number) => {
                  doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
                  doc.text(label, x, y);
                  
                  doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
                  doc.setFont("helvetica", "bold");
                  doc.text(value, x + 40, y); // Fixed offset for value align
                  doc.setFont("helvetica", "normal");
                  
                  // Subtle underline
                  doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
                  doc.line(x + 35, y + 2, x + w, y + 2);
              };
              
              const fCol1 = margin;
              const fCol2 = margin + 90;
              const fCol3 = margin + 180;
              
              yPos += 5;
              drawLineInput("Missing numbers:", warehouseReceiptData.missingNumbers, fCol1, yPos, 80);
              drawLineInput("Total Crates:", warehouseReceiptData.totalCrates, fCol2, yPos, 80);
              drawLineInput("Container No:", warehouseReceiptData.containerNo, fCol3, yPos, 80);
              
              yPos += 10;
              drawLineInput("Unnumbered:", warehouseReceiptData.unnumbered, fCol1, yPos, 80);
              drawLineInput("Crate Nos:", warehouseReceiptData.crateNos, fCol2, yPos, 80);
              drawLineInput("Seal No:", warehouseReceiptData.sealNo, fCol3, yPos, 80);
              
              yPos += 10;
              drawLineInput("Double number:", warehouseReceiptData.doubleNumber, fCol1, yPos, 80);
              drawLineInput("Tot Pkgs Received:", warehouseReceiptData.totalReceived, fCol2, yPos, 80);
              drawLineInput("Truck details:", warehouseReceiptData.truckDetails, fCol3, yPos, 80);
              
              yPos += 10;
              drawLineInput("Checked by:", warehouseReceiptData.checkedBy, fCol1, yPos, 80);
              drawLineInput("Tot Pkgs Delivered:", warehouseReceiptData.totalDelivered, fCol2, yPos, 80);
              
              yPos += 15;
              doc.text("Signature:", fCol1, yPos);
              // Line for signature
              doc.setDrawColor(colors.textDark[0]);
              doc.line(fCol1 + 20, yPos, fCol1 + 80, yPos);
              
              if (hasSignature && canvasRef.current) {
                 const imgData = canvasRef.current.toDataURL("image/png");
                 doc.addImage(imgData, 'PNG', fCol1 + 25, yPos - 12, 40, 15);
              }
          }
      }
    }

    // Add Signature logic for other forms
    if (activeForm !== 'warehouseReceipt' && hasSignature && canvasRef.current) {
        if (yPos > doc.internal.pageSize.getHeight() - 50) {
            doc.addPage();
            yPos = 40;
        }

        yPos += 10;
        // Clean signature line
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
        doc.line(margin, yPos, pageWidth - margin, yPos); 
        yPos += 10;

        const imgData = canvasRef.current.toDataURL("image/png");
        
        doc.setFontSize(8);
        doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
        doc.text(activeForm === 'delivery' ? "RECEIVER SIGNATURE" : "CLIENT / AUTHORIZED SIGNATURE", margin, yPos);
        
        doc.addImage(imgData, 'PNG', margin, yPos + 5, 50, 25);
        
        doc.setFontSize(7);
        doc.text(`Digitally signed: ${new Date().toLocaleString()}`, margin, yPos + 35);
    }

    // Add Global Footer (Address & Contact & User Name)
    const addGlobalFooter = () => {
        // Safe access to page count, supporting different jsPDF versions
        const pageCount = doc.getNumberOfPages ? doc.getNumberOfPages() : (doc.internal.pages.length - 1);
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        doc.setFontSize(8);
        doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
        doc.setFont("helvetica", "normal");
        
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const footerY = pageHeight - 20;
            
            // Center Address
            doc.text("P.O. Box 34892", pageWidth / 2, footerY, { align: "center" });
            doc.text("Dubai, UAE", pageWidth / 2, footerY + 4, { align: "center" });
            doc.text("Phone: (971) 4 340 8814   Fax: (971) 4 340 8815", pageWidth / 2, footerY + 8, { align: "center" });

            // Right Side User
            if (currentUser) {
                doc.text(`Generated by: ${currentUser.name}`, pageWidth - margin, footerY + 8, { align: "right" });
            }
        }
    };

    addGlobalFooter();

    // Save File
    const fileName = `Writer_${activeForm}_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(fileName);
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
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleLogoUpload} 
                  className="hidden" 
                  accept="image/png, image/jpeg" 
                />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-white text-blue-600 border border-blue-200 px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-all font-bold text-xs uppercase tracking-widest shadow-sm">
                  <Upload className="w-4 h-4" /> LOGO
                </button>
              </>
            )}
            <button 
                type="button"
                onClick={handleClearForm} 
                className="flex items-center gap-2 bg-white text-rose-600 border border-rose-200 px-5 py-2.5 rounded-xl hover:bg-rose-50 transition-all font-bold text-xs uppercase tracking-widest shadow-sm"
            >
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
           <button 
             onClick={() => setActiveForm('packing')}
             className={`p-4 rounded-2xl text-left flex items-center gap-3 transition-all ${activeForm === 'packing' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
           >
             <Package className="w-5 h-5" />
             <div>
               <p className="font-bold text-sm">Packing Services</p>
               <p className={`text-[10px] uppercase tracking-wider ${activeForm === 'packing' ? 'text-blue-200' : 'text-slate-400'}`}>Walk Through</p>
             </div>
           </button>
           <button 
             onClick={() => setActiveForm('unpacking')}
             className={`p-4 rounded-2xl text-left flex items-center gap-3 transition-all ${activeForm === 'unpacking' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
           >
             <Box className="w-5 h-5" />
             <div>
               <p className="font-bold text-sm">Unpacking Services</p>
               <p className={`text-[10px] uppercase tracking-wider ${activeForm === 'unpacking' ? 'text-blue-200' : 'text-slate-400'}`}>Walk Through</p>
             </div>
           </button>
           <button 
             onClick={() => setActiveForm('delivery')}
             className={`p-4 rounded-2xl text-left flex items-center gap-3 transition-all ${activeForm === 'delivery' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
           >
             <Truck className="w-5 h-5" />
             <div>
               <p className="font-bold text-sm">Delivery Order</p>
               <p className={`text-[10px] uppercase tracking-wider ${activeForm === 'delivery' ? 'text-blue-200' : 'text-slate-400'}`}>Received Goods</p>
             </div>
           </button>
           <button 
             onClick={() => setActiveForm('crating')}
             className={`p-4 rounded-2xl text-left flex items-center gap-3 transition-all ${activeForm === 'crating' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
           >
             <Layers className="w-5 h-5" />
             <div>
               <p className="font-bold text-sm">Final Crating List</p>
               <p className={`text-[10px] uppercase tracking-wider ${activeForm === 'crating' ? 'text-blue-200' : 'text-slate-400'}`}>Specs & Volume</p>
             </div>
           </button>
           <button 
             onClick={() => setActiveForm('electronicList')}
             className={`p-4 rounded-2xl text-left flex items-center gap-3 transition-all ${activeForm === 'electronicList' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
           >
             <Monitor className="w-5 h-5" />
             <div>
               <p className="font-bold text-sm">Electronic List</p>
               <p className={`text-[10px] uppercase tracking-wider ${activeForm === 'electronicList' ? 'text-blue-200' : 'text-slate-400'}`}>Inventory</p>
             </div>
           </button>
           <button 
             onClick={() => setActiveForm('accessorial')}
             className={`p-4 rounded-2xl text-left flex items-center gap-3 transition-all ${activeForm === 'accessorial' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
           >
             <ClipboardCheck className="w-5 h-5" />
             <div>
               <p className="font-bold text-sm">Accessorial Services</p>
               <p className={`text-[10px] uppercase tracking-wider ${activeForm === 'accessorial' ? 'text-blue-200' : 'text-slate-400'}`}>Confirmation</p>
             </div>
           </button>
           <button 
             onClick={() => setActiveForm('warehouseReceipt')}
             className={`p-4 rounded-2xl text-left flex items-center gap-3 transition-all ${activeForm === 'warehouseReceipt' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
           >
             <ArrowLeftRight className="w-5 h-5" />
             <div>
               <p className="font-bold text-sm">WH In & Out</p>
               <p className={`text-[10px] uppercase tracking-wider ${activeForm === 'warehouseReceipt' ? 'text-blue-200' : 'text-slate-400'}`}>Receipt & Tally</p>
             </div>
           </button>
        </div>

        {/* Form Content Area */}
        <div className="lg:col-span-3 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            
            {/* Header for Form */}
            <div className="bg-slate-50 p-6 md:p-8 border-b border-slate-200">
               <div className="flex justify-between items-center">
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                    <FileText className="w-6 h-6 text-blue-600" />
                    {activeForm === 'packing' && 'Walk Through Packing Services'}
                    {activeForm === 'unpacking' && 'Walk Through Unpacking Services'}
                    {activeForm === 'delivery' && 'Delivery / Received Order'}
                    {activeForm === 'crating' && 'Final Crating List'}
                    {activeForm === 'electronicList' && 'Electronic Equipment List'}
                    {activeForm === 'accessorial' && 'Confirmation of Accessorial Services'}
                    {activeForm === 'warehouseReceipt' && 'Warehouse In & Out Receipt'}
                 </h3>
                 {logo && (
                   <img src={logo} alt="Company Logo" className="h-10 w-auto object-contain opacity-80 grayscale hover:grayscale-0 transition-all" />
                 )}
               </div>
            </div>

            <div className="p-6 md:p-8 space-y-8">
               
               {/* --- PACKING FORM --- */}
               {activeForm === 'packing' && (
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client Name</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={packingData.clientName} onChange={e => setPackingData({...packingData, clientName: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Job Reference</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={packingData.jobId} onChange={e => setPackingData({...packingData, jobId: e.target.value})} />
                       </div>
                    </div>
                    
                    {/* Walk Through Verification */}
                    <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-200 mt-6 space-y-4">
                       <div>
                          <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                             <ClipboardCheck className="w-4 h-4 text-blue-500" /> 
                             Walk Through Verification
                          </h4>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed">
                             On completion of your packing/delivery the Crew foreman will walk through the property with you to check and confirm with you the following:
                          </p>
                       </div>

                       <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100">
                          <label className="flex items-start gap-3 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={packingData.walkThrough.noDamage} 
                                onChange={e => setPackingData({...packingData, walkThrough: {...packingData.walkThrough, noDamage: e.target.checked}})} 
                                className="mt-0.5 w-5 h-5 rounded text-blue-600 shrink-0" 
                              />
                              <span className="text-xs font-bold text-slate-700">I have checked the property with the crew foreman and have found NO damage.</span>
                          </label>
                          
                          <label className="flex items-start gap-3 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={packingData.walkThrough.itemsCheck} 
                                onChange={e => setPackingData({...packingData, walkThrough: {...packingData.walkThrough, itemsCheck: e.target.checked}})} 
                                className="mt-0.5 w-5 h-5 rounded text-blue-600 shrink-0" 
                              />
                              <span className="text-xs font-bold text-slate-700">I have checked the property, all the items have been packed and removed and there are no empty cartons or items left behind.</span>
                          </label>

                          <label className="flex items-start gap-3 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={packingData.walkThrough.foundDamage} 
                                onChange={e => setPackingData({...packingData, walkThrough: {...packingData.walkThrough, foundDamage: e.target.checked}})} 
                                className="mt-0.5 w-5 h-5 rounded text-blue-600 shrink-0" 
                              />
                              <span className="text-xs font-bold text-slate-700">I have checked the property with the crew foreman and have found the following damage.</span>
                          </label>
                       </div>

                       <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Client Notes / Damage Report</label>
                          <textarea 
                             rows={4} 
                             className="w-full p-4 bg-white border border-slate-200 rounded-xl font-medium text-sm text-black placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500 outline-none" 
                             placeholder="Enter any client notes or describe damage here..." 
                             value={packingData.clientNotes} 
                             onChange={e => setPackingData({...packingData, clientNotes: e.target.value})}
                          ></textarea>
                       </div>
                    </div>
                 </div>
               )}

               {/* --- UNPACKING FORM --- */}
               {activeForm === 'unpacking' && (
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client Name</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={unpackingData.clientName} onChange={e => setUnpackingData({...unpackingData, clientName: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Job Reference</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={unpackingData.jobId} onChange={e => setUnpackingData({...unpackingData, jobId: e.target.value})} />
                       </div>
                    </div>
                    {/* ... (Same Walkthrough logic as Packing) ... */}
                    <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-200 mt-6 space-y-4">
                       <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100">
                          <label className="flex items-start gap-3 cursor-pointer">
                              <input type="checkbox" checked={unpackingData.walkThrough.noDamage} onChange={e => setUnpackingData({...unpackingData, walkThrough: {...unpackingData.walkThrough, noDamage: e.target.checked}})} className="mt-0.5 w-5 h-5 rounded text-blue-600 shrink-0" />
                              <span className="text-xs font-bold text-slate-700">I have checked the property with the crew foreman and found NO damage.</span>
                          </label>
                          <label className="flex items-start gap-3 cursor-pointer">
                              <input type="checkbox" checked={unpackingData.walkThrough.itemsCheck} onChange={e => setUnpackingData({...unpackingData, walkThrough: {...unpackingData.walkThrough, itemsCheck: e.target.checked}})} className="mt-0.5 w-5 h-5 rounded text-blue-600 shrink-0" />
                              <span className="text-xs font-bold text-slate-700">I have checked the property, all items unpacked/removed, no debris.</span>
                          </label>
                          <label className="flex items-start gap-3 cursor-pointer">
                              <input type="checkbox" checked={unpackingData.walkThrough.foundDamage} onChange={e => setUnpackingData({...unpackingData, walkThrough: {...unpackingData.walkThrough, foundDamage: e.target.checked}})} className="mt-0.5 w-5 h-5 rounded text-blue-600 shrink-0" />
                              <span className="text-xs font-bold text-slate-700">I have checked the property and have found the following damage.</span>
                          </label>
                       </div>
                       <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Client Notes / Damage Report</label>
                          <textarea rows={4} className="w-full p-4 bg-white border border-slate-200 rounded-xl font-medium text-sm text-black placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Enter notes..." value={unpackingData.clientNotes} onChange={e => setUnpackingData({...unpackingData, clientNotes: e.target.value})}></textarea>
                       </div>
                    </div>
                 </div>
               )}

               {/* --- DELIVERY FORM --- */}
               {activeForm === 'delivery' && (
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client Name</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={deliveryData.clientName} onChange={e => setDeliveryData({...deliveryData, clientName: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Job Reference</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={deliveryData.jobId} onChange={e => setDeliveryData({...deliveryData, jobId: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Truck No</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={deliveryData.truckNo} onChange={e => setDeliveryData({...deliveryData, truckNo: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</label>
                          <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={deliveryData.date} onChange={e => setDeliveryData({...deliveryData, date: e.target.value})} />
                       </div>
                    </div>
                    
                    <div className="mt-6">
                       <div className="flex justify-between items-center mb-4">
                          <h4 className="font-bold text-slate-800">Items List</h4>
                          <button onClick={addDeliveryItem} className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"><Plus className="w-4 h-4" /> Add Item</button>
                       </div>
                       <div className="space-y-3">
                          {deliveryItems.map((item, index) => (
                             <div key={item.id} className="flex gap-4 items-start bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <span className="text-slate-400 font-bold text-xs pt-3 w-6 text-center">{index + 1}</span>
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                   <input type="text" placeholder="Description" className="p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium" value={item.description} onChange={e => updateDeliveryItem(item.id, 'description', e.target.value)} />
                                   <input type="number" placeholder="Qty" className="p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium" value={item.quantity} onChange={e => updateDeliveryItem(item.id, 'quantity', parseInt(e.target.value))} />
                                   <select className="p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium" value={item.condition} onChange={e => updateDeliveryItem(item.id, 'condition', e.target.value)}>
                                      <option>Good</option>
                                      <option>Damaged</option>
                                      <option>Missing</option>
                                   </select>
                                </div>
                                <button onClick={() => removeDeliveryItem(item.id)} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
                             </div>
                          ))}
                          {deliveryItems.length === 0 && <p className="text-center text-slate-400 text-sm italic py-8">No items added yet.</p>}
                       </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Additional Notes</label>
                        <textarea rows={3} className="w-full p-4 bg-white border border-slate-200 rounded-xl font-medium text-sm text-black placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500 outline-none" value={deliveryData.notes} onChange={e => setDeliveryData({...deliveryData, notes: e.target.value})}></textarea>
                    </div>
                 </div>
               )}

               {/* --- CRATING FORM --- */}
               {activeForm === 'crating' && (
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client Name</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={cratingData.clientName} onChange={e => setCratingData({...cratingData, clientName: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Job Reference</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={cratingData.jobId} onChange={e => setCratingData({...cratingData, jobId: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</label>
                          <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={cratingData.date} onChange={e => setCratingData({...cratingData, date: e.target.value})} />
                       </div>
                    </div>
                    <div className="mt-6">
                       <div className="flex justify-between items-center mb-4">
                          <h4 className="font-bold text-slate-800">Crates List</h4>
                          <button onClick={addCrate} className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"><Plus className="w-4 h-4" /> Add Crate</button>
                       </div>
                       <div className="space-y-3">
                          {crates.map((crate, index) => (
                             <div key={crate.id} className="flex flex-col md:flex-row gap-4 items-start bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <span className="text-slate-400 font-bold text-xs pt-3 w-6 text-center">{index + 1}</span>
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                                   <input type="text" placeholder="Description" className="md:col-span-1 p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium" value={crate.description} onChange={e => updateCrate(crate.id, 'description', e.target.value)} />
                                   <div className="md:col-span-3 grid grid-cols-3 gap-2">
                                      <div className="relative"><input type="number" placeholder="L" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium" value={crate.l} onChange={e => updateCrate(crate.id, 'l', parseFloat(e.target.value))} /></div>
                                      <div className="relative"><input type="number" placeholder="W" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium" value={crate.w} onChange={e => updateCrate(crate.id, 'w', parseFloat(e.target.value))} /></div>
                                      <div className="relative"><input type="number" placeholder="H" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium" value={crate.h} onChange={e => updateCrate(crate.id, 'h', parseFloat(e.target.value))} /></div>
                                   </div>
                                </div>
                                <div className="flex items-center gap-2 md:pt-2">
                                   <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 whitespace-nowrap">Vol: {((crate.l * crate.w * crate.h) / 1728 / 35.34).toFixed(3)} m³</span>
                                   <button onClick={() => removeCrate(crate.id)} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
                                </div>
                             </div>
                          ))}
                       </div>
                       <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 flex justify-between items-center">
                          <span className="text-xs font-bold text-blue-800 uppercase tracking-widest">Total Volume</span>
                          <span className="text-lg font-black text-blue-600">{calculateTotalVolume()} m³</span>
                       </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Notes</label>
                        <textarea rows={3} className="w-full p-4 bg-white border border-slate-200 rounded-xl font-medium text-sm text-black placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500 outline-none" value={cratingData.notes} onChange={e => setCratingData({...cratingData, notes: e.target.value})}></textarea>
                    </div>
                 </div>
               )}

               {/* --- ELECTRONIC LIST FORM --- */}
               {activeForm === 'electronicList' && (
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client Name</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={electronicData.clientName} onChange={e => setElectronicData({...electronicData, clientName: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Job Reference</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={electronicData.jobId} onChange={e => setElectronicData({...electronicData, jobId: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</label>
                          <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={electronicData.date} onChange={e => setElectronicData({...electronicData, date: e.target.value})} />
                       </div>
                    </div>

                    <div className="mt-6">
                       <div className="flex justify-between items-center mb-4">
                          <h4 className="font-bold text-slate-800">Electronic Equipment Inventory</h4>
                          <button onClick={addElectronicItem} className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"><Plus className="w-4 h-4" /> Add Device</button>
                       </div>
                       <div className="space-y-3">
                          {electronicItems.map((item, index) => (
                             <div key={item.id} className="flex flex-col md:flex-row gap-4 items-start bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <span className="text-slate-400 font-bold text-xs pt-3 w-6 text-center">{index + 1}</span>
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 w-full">
                                   <input type="text" placeholder="Item (e.g. TV)" className="p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium" value={item.description} onChange={e => updateElectronicItem(item.id, 'description', e.target.value)} />
                                   <input type="text" placeholder="Make / Brand" className="p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium" value={item.make} onChange={e => updateElectronicItem(item.id, 'make', e.target.value)} />
                                   <input type="text" placeholder="Model" className="p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium" value={item.model} onChange={e => updateElectronicItem(item.id, 'model', e.target.value)} />
                                   <input type="text" placeholder="Serial No." className="p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium" value={item.serial} onChange={e => updateElectronicItem(item.id, 'serial', e.target.value)} />
                                   <input type="text" placeholder="Condition" className="p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium" value={item.condition} onChange={e => updateElectronicItem(item.id, 'condition', e.target.value)} />
                                </div>
                                <button onClick={() => removeElectronicItem(item.id)} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
                             </div>
                          ))}
                          {electronicItems.length === 0 && <p className="text-center text-slate-400 text-sm italic py-8">No electronic items added.</p>}
                       </div>
                    </div>
                 </div>
               )}

               {/* --- ACCESSORIAL FORM --- */}
               {activeForm === 'accessorial' && (
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client Name</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={accessorialData.clientName} onChange={e => setAccessorialData({...accessorialData, clientName: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Job Reference</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={accessorialData.jobId} onChange={e => setAccessorialData({...accessorialData, jobId: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</label>
                          <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={accessorialData.date} onChange={e => setAccessorialData({...accessorialData, date: e.target.value})} />
                       </div>
                    </div>
                    
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mt-6">
                       <h4 className="font-bold text-slate-800 mb-4 text-xs uppercase tracking-widest">Service Phase</h4>
                       <div className="flex gap-6">
                          <label className="flex items-center gap-3 cursor-pointer">
                             <input type="checkbox" className="w-5 h-5 rounded text-blue-600" checked={accessorialData.serviceType.packing} onChange={e => setAccessorialData({...accessorialData, serviceType: {...accessorialData.serviceType, packing: e.target.checked}})} />
                             <span className="font-bold text-sm text-slate-700">Packing</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer">
                             <input type="checkbox" className="w-5 h-5 rounded text-blue-600" checked={accessorialData.serviceType.delivery} onChange={e => setAccessorialData({...accessorialData, serviceType: {...accessorialData.serviceType, delivery: e.target.checked}})} />
                             <span className="font-bold text-sm text-slate-700">Delivery</span>
                          </label>
                       </div>
                    </div>

                    <div className="space-y-3">
                       <h4 className="font-bold text-slate-800 mb-2 text-xs uppercase tracking-widest">Checklist</h4>
                       {[
                          { key: 'shuttle', label: 'Shuttle service - van used for loading/unloading' },
                          { key: 'stairCarry', label: 'Stair carry - belongings carried up stairs', hasDetail: true, detailPlaceholder: 'No. of Floors', detailKey: 'stairCarryFloors' },
                          { key: 'elevator', label: 'Elevator - elevator was used to carry belongings' },
                          { key: 'hoisting', label: 'Hoisting - via outside hoisting' },
                          { key: 'longCarry', label: 'Long carry - > 200ft/50 meters', hasDetail: true, detailPlaceholder: 'Approx Distance', detailKey: 'longCarryDistance' },
                          { key: 'piano', label: 'Piano Handling - Grand/Upright' },
                          { key: 'crating', label: 'Crating/Uncrating - fragile items' },
                          { key: 'extraLabor', label: 'Extra Labor - assemble or handle' },
                          { key: 'overtime', label: 'Overtime - beyond normal business hours' },
                          { key: 'preDelivery', label: 'Pre delivery of Cartons - Prior to Pack date' },
                          { key: 'extraMileage', label: 'Extra Mileage - > 50 miles/80km' },
                          { key: 'debrisPickup', label: 'Additional Debris Pick up' },
                          { key: 'handyman', label: 'Handy Man Service', hasDetail: true, detailPlaceholder: 'Electrician/Plumber/Other', detailKey: 'handymanType' },
                          { key: 'maidService', label: 'Maid/Valet Services' },
                          { key: 'other', label: 'Other', hasDetail: true, detailPlaceholder: 'Description', detailKey: 'otherDescription' },
                       ].map((item) => (
                          <div key={item.key} className="flex flex-col gap-2 p-3 rounded-xl border border-transparent hover:bg-slate-50 hover:border-slate-100 transition-colors">
                             <label className="flex items-center gap-3 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  className="w-5 h-5 rounded text-blue-600 shrink-0" 
                                  checked={(accessorialData.services as any)[item.key]} 
                                  onChange={e => setAccessorialData({...accessorialData, services: {...accessorialData.services, [item.key]: e.target.checked}})} 
                                />
                                <span className="font-medium text-sm text-slate-700">{item.label}</span>
                             </label>
                             {item.hasDetail && (accessorialData.services as any)[item.key] && (
                                <input 
                                  type="text" 
                                  className="ml-8 p-2 text-xs border border-slate-200 rounded-lg w-1/2 bg-white" 
                                  placeholder={item.detailPlaceholder}
                                  value={(accessorialData.details as any)[item.detailKey!]}
                                  onChange={e => setAccessorialData({...accessorialData, details: {...accessorialData.details, [item.detailKey!]: e.target.value}})}
                                />
                             )}
                          </div>
                       ))}
                    </div>
                 </div>
               )}
               
               {/* --- WAREHOUSE RECEIPT FORM --- */}
               {activeForm === 'warehouseReceipt' && (
                 <div className="space-y-6">
                    {/* Header Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client Name</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={warehouseReceiptData.clientName} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, clientName: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">File No.</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={warehouseReceiptData.fileNo} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, fileNo: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</label>
                          <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={warehouseReceiptData.date} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, date: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</label>
                          <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={warehouseReceiptData.type} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, type: e.target.value as any})}>
                             <option value="Export">Export</option>
                             <option value="Import">Import</option>
                             <option value="Storage">Storage</option>
                          </select>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mode of Shipment</label>
                          <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={warehouseReceiptData.mode} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, mode: e.target.value as any})}>
                             <option value="Air">Air</option>
                             <option value="Sea">Sea</option>
                             <option value="Land">Land</option>
                          </select>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WH Location</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={warehouseReceiptData.whLocation} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, whLocation: e.target.value})} />
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Pkgs</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={warehouseReceiptData.totalPkgs} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, totalPkgs: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Volume</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={warehouseReceiptData.volume} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, volume: e.target.value})} />
                        </div>
                    </div>
                    
                    {/* Interactive Grid 1-1000 with Pagination & Drag Selection */}
                    <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Tally Sheet (1-1000)</h4>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={handleSelectAllCurrentPage}
                                    className="text-[9px] font-bold uppercase tracking-widest bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 text-slate-500 hover:text-blue-600"
                                >
                                    {(() => {
                                        const start = gridPage * 200 + 1;
                                        const end = Math.min((gridPage + 1) * 200, 1000);
                                        const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
                                        const allSelected = range.every(num => warehouseReceiptData.selectedPackages.includes(num));
                                        return allSelected ? <Square className="w-3 h-3" /> : <CheckSquare className="w-3 h-3" />;
                                    })()}
                                    Toggle All
                                </button>
                                <div className="text-[10px] text-slate-400 font-bold">Selected: <span className="text-blue-600">{warehouseReceiptData.selectedPackages.length}</span></div>
                            </div>
                        </div>
                        
                        {/* Pagination Controls */}
                        <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 mb-4 shadow-sm">
                           <button 
                             onClick={() => setGridPage(p => Math.max(0, p - 1))}
                             disabled={gridPage === 0}
                             className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-all"
                           >
                             <ChevronLeft className="w-4 h-4 text-slate-600" />
                           </button>
                           
                           <span className="text-xs font-black text-slate-700 uppercase tracking-wide">
                              Items {gridPage * 200 + 1} - {Math.min((gridPage + 1) * 200, 1000)}
                           </span>
                           
                           <button 
                             onClick={() => setGridPage(p => Math.min(4, p + 1))}
                             disabled={gridPage === 4}
                             className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-all"
                           >
                             <ChevronRight className="w-4 h-4 text-slate-600" />
                           </button>
                        </div>

                        {/* Grid Content */}
                        <div 
                            className="grid grid-cols-[repeat(10,1fr)] sm:grid-cols-[repeat(20,1fr)] gap-1 h-[320px] overflow-y-auto custom-scrollbar content-start select-none"
                            onMouseLeave={() => setIsDragging(false)}
                        >
                            {Array.from({ length: 200 }, (_, i) => {
                                const num = (gridPage * 200) + (i + 1);
                                if (num > 1000) return null;
                                const isSelected = warehouseReceiptData.selectedPackages.includes(num);
                                return (
                                  <button
                                      key={num}
                                      onMouseDown={() => handleGridMouseDown(num)}
                                      onMouseEnter={() => handleGridMouseEnter(num)}
                                      className={`
                                          h-6 sm:h-7 text-[9px] font-bold rounded flex items-center justify-center border transition-all
                                          ${isSelected
                                              ? 'bg-slate-800 text-white border-slate-800' 
                                              : 'bg-white text-slate-400 border-slate-200 hover:border-blue-400 hover:text-blue-500'}
                                      `}
                                  >
                                      {num}
                                  </button>
                                );
                            })}
                        </div>
                        <div className="mt-2 text-center text-[10px] text-slate-400 italic">Click to toggle. Drag to select multiple. PDF will list selected packages only.</div>
                    </div>

                    {/* Footer Details */}
                    <h4 className="font-bold text-slate-800 text-sm pt-4 border-t border-slate-100">Verification Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Missing Numbers</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={warehouseReceiptData.missingNumbers} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, missingNumbers: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unnumbered</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={warehouseReceiptData.unnumbered} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, unnumbered: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Double Number</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={warehouseReceiptData.doubleNumber} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, doubleNumber: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Crates</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={warehouseReceiptData.totalCrates} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, totalCrates: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Crate Nos</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={warehouseReceiptData.crateNos} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, crateNos: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Pkgs Received</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={warehouseReceiptData.totalReceived} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, totalReceived: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Pkgs Delivered</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={warehouseReceiptData.totalDelivered} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, totalDelivered: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Container No.</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={warehouseReceiptData.containerNo} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, containerNo: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Seal No.</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={warehouseReceiptData.sealNo} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, sealNo: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Truck Details</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={warehouseReceiptData.truckDetails} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, truckDetails: e.target.value})} />
                       </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Checked By</label>
                          <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-black placeholder:text-slate-400" value={warehouseReceiptData.checkedBy} onChange={e => setWarehouseReceiptData({...warehouseReceiptData, checkedBy: e.target.value})} />
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
                     <span>{activeForm === 'delivery' ? 'Receiver Signature' : 'Client / Rep Signature'}</span>
                     <span>Date: {new Date().toLocaleDateString()}</span>
                  </div>
               </div>
            </div>
        </div>
      </div>
    </div>
  );
};
