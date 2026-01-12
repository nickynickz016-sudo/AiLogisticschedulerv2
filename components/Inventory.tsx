
import React, { useState, useEffect, useRef } from 'react';
import { Search, Edit2, Save, X, Plus, Package, AlertTriangle, Loader2, Database, FileInput, ClipboardList, ChevronRight, Calculator, Truck, User, MapPin, RefreshCw, Trash2, Printer, ChevronDown, FileText } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { InventoryItem, Job, JobCostSheet, CostSheetItem, UserProfile } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface InventoryProps {
  jobs?: Job[]; // Made optional to support standalone usage if needed, but required for costing
  users?: UserProfile[];
  logo?: string;
  isReadOnly?: boolean;
  onlyFinalAssessment?: boolean;
}

export const Inventory: React.FC<InventoryProps> = ({ jobs = [], users = [], logo, isReadOnly = false, onlyFinalAssessment = false }) => {
  const [viewMode, setViewMode] = useState<'inventory' | 'costing'>('inventory');
  
  // --- Inventory Master State ---
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // New state for save operation
  const [filter, setFilter] = useState('');
  
  // Edit State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCode, setEditCode] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');
  const [editStock, setEditStock] = useState<string>('');
  const [editCriticalStock, setEditCriticalStock] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');

  // Add Item State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    code: '',
    description: '',
    unit: 'PCS',
    price: 0,
    stock: 0,
    critical_stock: 10
  });

  // --- Cost Sheet State ---
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [currentSheet, setCurrentSheet] = useState<JobCostSheet | null>(null);
  const [costingStage, setCostingStage] = useState<'Issued' | 'Returned' | 'Final'>('Issued');
  const [searchMaterial, setSearchMaterial] = useState('');
  const [sheetLoading, setSheetLoading] = useState(false); // Loading state for specific sheet
  
  // Job Search State
  const [jobSearchTerm, setJobSearchTerm] = useState('');
  const [showJobSuggestions, setShowJobSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Error fetching inventory:', error);
      alert('Failed to load inventory data');
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowJobSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCostSheet = async (jobId: string) => {
    setSheetLoading(true);
    const { data, error } = await supabase.from('job_cost_sheets').select('*').eq('job_id', jobId).single();
    
    if (error && error.code !== 'PGRST116') {
        console.error("Error fetching cost sheet:", error);
    }

    if (data) {
        setCurrentSheet(data);
        // Determine stage based on status or user override
        if (onlyFinalAssessment) {
            setCostingStage('Final');
        } else if (data.status === 'Finalized') {
            setCostingStage('Final');
        } else if (data.status === 'Returned') {
            setCostingStage('Returned');
        } else {
            setCostingStage('Issued');
        }
    } else {
        // Initialize blank sheet
        setCurrentSheet({
            job_id: jobId,
            items: [],
            status: 'Issued',
            total_cost: 0
        });
        setCostingStage(onlyFinalAssessment ? 'Final' : 'Issued');
    }
    setSheetLoading(false);
  };

  useEffect(() => {
    if (selectedJobId) {
        fetchCostSheet(selectedJobId);
        // Sync search term if ID is set programmatically
        const job = jobs.find(j => j.id === selectedJobId);
        if (job && jobSearchTerm === '') {
            setJobSearchTerm(`${job.id} - ${job.shipper_name}`);
        }
    } else {
        setCurrentSheet(null);
    }
  }, [selectedJobId, onlyFinalAssessment]);

  // --- Inventory Functions ---

  const filteredItems = items.filter(item => 
    item.description.toLowerCase().includes(filter.toLowerCase()) ||
    (item.code && item.code.toLowerCase().includes(filter.toLowerCase()))
  );

  const startEditing = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditCode(item.code);
    setEditPrice(item.price.toString());
    setEditStock(item.stock.toString());
    setEditCriticalStock(item.critical_stock.toString());
    setEditDescription(item.description);
  };

  const saveEdit = async (id: number) => {
    const { error } = await supabase
      .from('inventory_items')
      .update({
        code: editCode,
        description: editDescription,
        price: parseFloat(editPrice) || 0,
        stock: parseInt(editStock) || 0,
        critical_stock: parseInt(editCriticalStock) || 0
      })
      .eq('id', id);

    if (error) {
      alert(`Error updating item: ${error.message}`);
    } else {
      setEditingId(null);
      fetchInventory();
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCode('');
    setEditPrice('');
    setEditStock('');
    setEditCriticalStock('');
    setEditDescription('');
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.description) {
        alert("Description is required");
        return;
    }

    const { error } = await supabase
      .from('inventory_items')
      .insert([{
        code: newItem.code,
        description: newItem.description,
        unit: newItem.unit,
        price: newItem.price,
        stock: newItem.stock,
        critical_stock: newItem.critical_stock
      }]);

    if (error) {
      alert(`Error adding item: ${error.message}`);
    } else {
      setShowAddModal(false);
      setNewItem({ code: '', description: '', unit: 'PCS', price: 0, stock: 0, critical_stock: 10 });
      fetchInventory();
    }
  };

  const handleSeedDatabase = async () => {
    if (!confirm("This will import the standard packing material list into your database. Existing items will not be replaced. Continue?")) return;
    
    setLoading(true);
    const defaultItems = [
        { code: 'PKG 10182', description: 'Small Carton 46 X 34 X 34', unit: 'PCS' },
        { code: 'PKG 10183', description: 'Medium Carton 47 X 47 X 52', unit: 'PCS' },
        { code: 'PKG 10184', description: 'Large Carton 47 X 47 X 77', unit: 'PCS' },
        { code: 'PKG 10186', description: 'Flat Wardrobe 92 X 47 X 26', unit: 'PCS' },
        { code: 'PKG 10193', description: 'Hanging Wardrobe 53 X 46 X 126', unit: 'PCS' },
        { code: 'PKG 10190', description: '1 CBM BOX', unit: 'PCS' },
        { code: 'PKG 10195', description: 'Cardboard Roll 130cmx20kg', unit: 'ROL' },
        { code: 'PKG 10196', description: 'Hardboard Sheet 220x120', unit: 'PCS' },
        { code: 'PKG 10207', description: 'Air Bubble Roll', unit: 'ROL' },
        { code: 'PKG 10202', description: 'White Paper', unit: 'KGs' },
        { code: 'PKG 10197', description: 'Polythene Roll (Plastic Roll)', unit: 'ROL' },
        { code: 'PKG 100018', description: 'Shrink Wrap', unit: 'ROL' },
        { code: 'PKG 10209', description: 'Masking Tape / Packing Tape', unit: 'PCS' },
        { code: 'PKG 10214', description: '6 MM Ply HT', unit: 'EA' },
        { code: 'PKG 10219', description: '1X4 Wood HT', unit: 'EA' },
        { code: 'PKG 10224', description: '2X4 Wood HT', unit: 'EA' },
        { code: 'PKG 10243', description: 'Silica gel', unit: 'PCS' },
        { code: 'PKG 10192', description: 'Hanging Rod', unit: 'PCS' },
        { code: '', description: 'White Soft Foam', unit: 'ROL' },
        { code: '', description: 'Tools Box for all dismantled Hardware', unit: 'PCS' },
        { code: '', description: 'Salvage carton', unit: 'PCS' },
    ];

    const itemsToInsert = defaultItems.map(item => ({
        ...item,
        stock: 1000,
        critical_stock: 50,
        price: parseFloat((Math.random() * 9 + 1).toFixed(2)) // Random price between 1.00 and 10.00
    }));

    const { error } = await supabase.from('inventory_items').insert(itemsToInsert);
    
    if (error) {
        alert("Error importing data: " + error.message);
    } else {
        alert("Default items imported successfully!");
        fetchInventory();
    }
    setLoading(false);
  };

  // --- Costing Functions ---

  const selectJob = (job: Job) => {
    setSelectedJobId(job.id);
    setJobSearchTerm(`${job.id} - ${job.shipper_name}`);
    setShowJobSuggestions(false);
  };

  const filteredJobs = jobs.filter(j => 
    j.id.toLowerCase().includes(jobSearchTerm.toLowerCase()) ||
    j.shipper_name.toLowerCase().includes(jobSearchTerm.toLowerCase())
  );

  const addItemToSheet = (inventoryItem: InventoryItem) => {
    if (!currentSheet) return;
    
    const exists = currentSheet.items.find(i => i.inventory_id === inventoryItem.id);
    if (exists) return; // Prevent duplicates

    const newItem: CostSheetItem = {
        inventory_id: inventoryItem.id,
        code: inventoryItem.code,
        description: inventoryItem.description,
        unit: inventoryItem.unit,
        price: inventoryItem.price,
        issued_qty: 0,
        returned_qty: 0
    };

    setCurrentSheet({
        ...currentSheet,
        items: [...currentSheet.items, newItem]
    });
    setSearchMaterial('');
  };

  const removeItemFromSheet = (inventoryId: number) => {
    if (!currentSheet) return;
    if (confirm("Remove this item from the sheet? Any saved consumption will be reversed upon saving.")) {
        setCurrentSheet({
            ...currentSheet,
            items: currentSheet.items.filter(item => item.inventory_id !== inventoryId)
        });
    }
  };

  const updateSheetItem = (inventoryId: number, field: 'issued_qty' | 'returned_qty', value: number) => {
    if (!currentSheet) return;
    
    const updatedItems = currentSheet.items.map(item => {
        if (item.inventory_id === inventoryId) {
            return { ...item, [field]: value };
        }
        return item;
    });

    setCurrentSheet({ ...currentSheet, items: updatedItems });
  };

  const calculateTotalCost = () => {
    if (!currentSheet) return 0;
    return currentSheet.items.reduce((acc, item) => {
        const consumed = Math.max(0, item.issued_qty - item.returned_qty);
        return acc + (consumed * item.price);
    }, 0);
  };

  const saveCostSheet = async () => {
    if (!currentSheet) return;
    setIsSaving(true);

    try {
        // 1. Fetch Previous Sheet State from DB to calculate differential
        const { data: previousSheetData, error: fetchError } = await supabase
            .from('job_cost_sheets')
            .select('items')
            .eq('job_id', currentSheet.job_id)
            .single();
        
        const previousItems: CostSheetItem[] = previousSheetData ? previousSheetData.items : [];

        // 2. Build map of Consumption Changes
        // Map: InventoryID -> { oldNet: number, newNet: number, description: string }
        const changes = new Map<number, { oldNet: number, newNet: number, description: string }>();

        // A. Populate from Previous (What was already deducted)
        previousItems.forEach(item => {
            const net = (item.issued_qty || 0) - (item.returned_qty || 0);
            changes.set(item.inventory_id, { oldNet: net, newNet: 0, description: item.description });
        });

        // B. Populate from Current (What should be deducted now)
        currentSheet.items.forEach(item => {
            const net = (item.issued_qty || 0) - (item.returned_qty || 0);
            const entry = changes.get(item.inventory_id);
            if (entry) {
                entry.newNet = net;
            } else {
                changes.set(item.inventory_id, { oldNet: 0, newNet: net, description: item.description });
            }
        });

        // 3. Process Stock Updates (Differentials)
        let updatesMade = false;
        for (const [invId, { oldNet, newNet, description }] of changes.entries()) {
            const diff = newNet - oldNet; 
            // If diff > 0: Consumption increased -> Deduct from stock
            // If diff < 0: Consumption decreased -> Add to stock

            if (diff !== 0) {
                // Fetch fresh stock first
                const { data: masterItem, error: masterError } = await supabase
                    .from('inventory_items')
                    .select('stock')
                    .eq('id', invId)
                    .single();
                
                if (masterItem) {
                    const currentStock = Number(masterItem.stock);
                    const newStock = currentStock - diff; // Logic: Stock = Stock - ChangeInConsumption
                    
                    const { error: updateError } = await supabase
                        .from('inventory_items')
                        .update({ stock: newStock })
                        .eq('id', invId);
                        
                    if (updateError) {
                        console.error(`Failed to update stock for ${description}`, updateError);
                    } else {
                        updatesMade = true;
                    }
                }
            }
        }

        // 4. Save the Sheet
        const status = costingStage === 'Final' ? 'Finalized' : costingStage === 'Returned' ? 'Returned' : 'Issued';
        const payload = {
            job_id: currentSheet.job_id,
            items: currentSheet.items,
            status: status,
            total_cost: calculateTotalCost()
        };

        const { error: saveError } = await supabase
            .from('job_cost_sheets')
            .upsert(payload);

        if (saveError) throw saveError;

        alert(`Sheet saved successfully! ${updatesMade ? 'Inventory stock has been updated.' : ''}`);
        setCurrentSheet({ ...currentSheet, status });
        await fetchInventory(); // Refresh master list to show new stock levels

    } catch (error: any) {
        console.error("Save failed:", error);
        alert("Error saving sheet: " + error.message);
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteSheet = async () => {
    if (!currentSheet) return;
    if (!confirm("Are you sure you want to delete this cost sheet? This will reverse all stock deductions associated with this job.")) return;
    setIsSaving(true);

    try {
        // 1. Fetch Previous Sheet State from DB to revert stock
        const { data: previousSheetData } = await supabase
            .from('job_cost_sheets')
            .select('items')
            .eq('job_id', currentSheet.job_id)
            .single();
        
        if (previousSheetData && previousSheetData.items) {
            const previousItems: CostSheetItem[] = previousSheetData.items;

            // 2. Revert Stock
            for (const item of previousItems) {
                const netConsumed = (item.issued_qty || 0) - (item.returned_qty || 0);
                if (netConsumed !== 0) {
                    const { data: masterItem } = await supabase
                        .from('inventory_items')
                        .select('stock')
                        .eq('id', item.inventory_id)
                        .single();
                    
                    if (masterItem) {
                        const newStock = Number(masterItem.stock) + netConsumed; // Add back consumption
                        await supabase
                            .from('inventory_items')
                            .update({ stock: newStock })
                            .eq('id', item.inventory_id);
                    }
                }
            }

            // 3. Delete the Sheet
            const { error } = await supabase
                .from('job_cost_sheets')
                .delete()
                .eq('job_id', currentSheet.job_id);

            if (error) throw error;
        }

        alert("Cost sheet deleted successfully. Stock levels have been restored.");
        
        // Reset local state to blank
        setCurrentSheet({
            job_id: selectedJobId,
            items: [],
            status: 'Issued',
            total_cost: 0
        });
        setCostingStage('Issued');
        setJobSearchTerm('');
        setSelectedJobId('');
        await fetchInventory();

    } catch (error: any) {
        console.error("Delete failed:", error);
        alert("Error deleting sheet: " + error.message);
    } finally {
        setIsSaving(false);
    }
  };

  const handleRedeductStock = async () => {
      // Manual override if needed, but differential logic should handle it.
      // This button is mostly for recovery if initial deduction failed.
      if(!confirm("Force re-deduct stock? Only use this if stock wasn't updated automatically.")) return;
      await saveCostSheet();
  };

  const handleExportPDF = () => {
    if (!currentSheet || !selectedJobId) return;
    const job = jobs.find(j => j.id === selectedJobId);
    
    // LANDSCAPE MODE
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 20;

    // Colors
    const colors = {
      textDark: [45, 55, 72], // Charcoal
      textLight: [113, 128, 150], // Muted Slate
      border: [226, 232, 240], // Very light gray border
      accent: [30, 41, 59], // Deep Slate
    };

    // --- Header ---
    if (logo) {
        try {
            const imgProps = doc.getImageProperties(logo);
            const ratio = imgProps.width / imgProps.height;
            let w = 50;
            let h = w / ratio;
            if (h > 25) { h = 25; w = h * ratio; }
            doc.addImage(logo, 'PNG', margin, 10, w, h);
        } catch (e) {
            console.error("Logo error", e);
        }
    }

    doc.setFontSize(16);
    doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
    doc.setFont("helvetica", "bold");
    doc.text("WRITER RELOCATIONS", margin + 60, 18);
    
    doc.setFontSize(10);
    doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
    doc.setFont("helvetica", "normal");
    doc.text("JOB COSTING ASSESSMENT", margin + 60, 24);

    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.line(margin, 35, pageWidth - margin, 35);

    yPos = 45;

    // --- Job Details (Horizontal Layout for Landscape) ---
    const addField = (label: string, value: string, x: number, y: number) => {
       doc.setFontSize(8);
       doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
       doc.setFont("helvetica", "bold");
       doc.text(label.toUpperCase(), x, y);
       
       doc.setFontSize(10);
       doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
       doc.setFont("helvetica", "normal");
       doc.text(value || '—', x, y + 5);
    };

    addField("Job Reference", selectedJobId, margin, yPos);
    addField("Client Name", job?.shipper_name || '', margin + 50, yPos);
    addField("Location", job?.location || '', margin + 120, yPos);
    addField("Date Generated", new Date().toLocaleDateString(), margin + 200, yPos);
    
    yPos += 20;

    // --- Table ---
    const tableBody = currentSheet.items.map(item => {
        const consumed = Math.max(0, item.issued_qty - item.returned_qty);
        const cost = consumed * item.price;
        return [
            item.code,
            item.description,
            item.unit,
            item.issued_qty,
            item.returned_qty,
            consumed,
            item.price.toFixed(2),
            cost.toFixed(2)
        ];
    });

    (doc as any).autoTable({
        startY: yPos,
        head: [['Code', 'Description', 'Unit', 'Issued', 'Return', 'Net', 'Rate', 'Total']],
        body: tableBody,
        margin: { left: margin, right: margin },
        headStyles: { 
            fillColor: [248, 250, 252], 
            textColor: colors.textDark, 
            fontStyle: 'bold', 
            fontSize: 9,
            lineWidth: { bottom: 0.1 },
            lineColor: colors.border,
            halign: 'left' // Explicit left align for header text
        }, 
        bodyStyles: { 
            textColor: colors.textDark,
            fontSize: 9,
            cellPadding: 4,
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 40, halign: 'left' }, // Code
            1: { cellWidth: 'auto', halign: 'left' }, // Description (Flexible)
            2: { cellWidth: 25, halign: 'center' }, // Unit
            3: { cellWidth: 25, halign: 'center', textColor: [37, 99, 235] }, // Issued
            4: { cellWidth: 25, halign: 'center', textColor: [234, 88, 12] }, // Return
            5: { cellWidth: 25, halign: 'center', fontStyle: 'bold' }, // Net
            6: { cellWidth: 30, halign: 'right' }, // Rate
            7: { cellWidth: 40, halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] } // Total
        },
        foot: [['', '', '', '', '', '', 'GRAND TOTAL', calculateTotalCost().toFixed(2) + ' AED']],
        footStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 11,
            halign: 'right'
        },
        theme: 'grid', // 'grid' provides a neat bordered look, 'plain' is minimal. Grid is usually preferred for financial data.
        styles: {
            lineWidth: 0.1,
            lineColor: colors.border
        }
    });

    doc.save(`JobCost_${selectedJobId}.pdf`);
  }

  // New function for Master List PDF
  const handleExportMasterListPDF = () => {
    // LANDSCAPE MODE
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 20;

    // Colors (Same as Job Costing)
    const colors = {
      textDark: [45, 55, 72], // Charcoal
      textLight: [113, 128, 150], // Muted Slate
      border: [226, 232, 240], // Very light gray border
      accent: [30, 41, 59], // Deep Slate
    };

    // --- Header ---
    if (logo) {
        try {
            const imgProps = doc.getImageProperties(logo);
            const ratio = imgProps.width / imgProps.height;
            let w = 50;
            let h = w / ratio;
            if (h > 25) { h = 25; w = h * ratio; }
            doc.addImage(logo, 'PNG', margin, 10, w, h);
        } catch (e) {
            console.error("Logo error", e);
        }
    }

    doc.setFontSize(16);
    doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
    doc.setFont("helvetica", "bold");
    doc.text("WRITER RELOCATIONS", margin + 60, 18);
    
    doc.setFontSize(10);
    doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
    doc.setFont("helvetica", "normal");
    doc.text("INVENTORY MASTER LIST", margin + 60, 24);

    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.line(margin, 35, pageWidth - margin, 35);

    yPos = 45;

    // --- Meta Data ---
    doc.setFontSize(8);
    doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, yPos);
    doc.text(`Total Items: ${filteredItems.length}`, margin + 60, yPos);

    yPos += 10;

    // --- Table ---
    const tableBody = filteredItems.map((item, index) => {
        return [
            index + 1,
            item.code || '-',
            item.description,
            item.unit,
            item.stock,
            item.critical_stock,
            item.price.toFixed(2)
        ];
    });

    (doc as any).autoTable({
        startY: yPos,
        head: [['SR#', 'Code', 'Description', 'Unit', 'Stock', 'Min. Level', 'Price (AED)']],
        body: tableBody,
        margin: { left: margin, right: margin },
        headStyles: { 
            fillColor: [248, 250, 252], 
            textColor: colors.textDark, 
            fontStyle: 'bold', 
            fontSize: 9,
            lineWidth: { bottom: 0.1 },
            lineColor: colors.border,
            halign: 'left'
        }, 
        bodyStyles: { 
            textColor: colors.textDark,
            fontSize: 9,
            cellPadding: 4,
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' }, // SR#
            1: { cellWidth: 40, halign: 'left' },   // Code
            2: { cellWidth: 'auto', halign: 'left' }, // Description
            3: { cellWidth: 20, halign: 'center' }, // Unit
            4: { cellWidth: 25, halign: 'center', fontStyle: 'bold' }, // Stock
            5: { cellWidth: 25, halign: 'center', textColor: [234, 88, 12] }, // Min Level
            6: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] } // Price
        },
        theme: 'grid',
        styles: {
            lineWidth: 0.1,
            lineColor: colors.border
        }
    });

    doc.save(`Inventory_Master_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Filter materials for dropdown
  const filteredMaterialList = items.filter(i => 
    i.description.toLowerCase().includes(searchMaterial.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
            {viewMode === 'inventory' ? 'Inventory Control' : 'Job Costing'}
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {viewMode === 'inventory' ? 'Packing material consumption sheet, pricing & stock levels' : 'Material issuance, returns, and final assessment'}
          </p>
        </div>
        <div className="flex items-center gap-4">
           {viewMode === 'inventory' && (
             <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search items..." 
                  className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none w-64 shadow-sm"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
             </div>
           )}
           
           <div className="flex bg-slate-200 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('inventory')} 
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${viewMode === 'inventory' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Master List
              </button>
              <button 
                onClick={() => setViewMode('costing')} 
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${viewMode === 'costing' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Job Cost Sheets
              </button>
           </div>

           {viewMode === 'inventory' && (
             <>
                <button 
                    onClick={handleExportMasterListPDF}
                    className="bg-white text-slate-600 border border-slate-200 p-2.5 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                    title="Export PDF"
                >
                    <Printer className="w-5 h-5" />
                </button>

                {!isReadOnly && (
                  <button 
                      onClick={handleSeedDatabase}
                      className="bg-white text-slate-600 border border-slate-200 p-2.5 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                      title="Import Default List"
                  >
                      <FileInput className="w-5 h-5" />
                  </button>
                )}

                {!isReadOnly && (
                  <button 
                      onClick={() => setShowAddModal(true)}
                      className="bg-slate-900 text-white p-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-md flex items-center gap-2"
                  >
                      <Plus className="w-5 h-5" />
                  </button>
                )}
             </>
           )}
        </div>
      </div>

      {/* --- INVENTORY MASTER VIEW --- */}
      {viewMode === 'inventory' && (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200">
                    <th className="p-6 w-20 text-center">SR#</th>
                    <th className="p-6">Item Code</th>
                    <th className="p-6 w-[35%]">Description</th>
                    <th className="p-6 text-center">Unit</th>
                    <th className="p-6 text-center">Stock</th>
                    <th className="p-6 text-center">Min. Level</th>
                    <th className="p-6 text-right">Price / Unit</th>
                    {!isReadOnly && <th className="p-6 text-center">Actions</th>}
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                    <tr>
                    <td colSpan={isReadOnly ? 7 : 8} className="p-12 text-center text-slate-400 font-medium">
                        <div className="flex justify-center items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" /> Loading inventory...
                        </div>
                    </td>
                    </tr>
                ) : filteredItems.length === 0 ? (
                    <tr>
                    <td colSpan={isReadOnly ? 7 : 8} className="p-12 text-center text-slate-400 font-medium italic">
                        No items found matching your search.
                        {!isReadOnly && (
                          <>
                            <br />
                            <button onClick={handleSeedDatabase} className="text-blue-600 hover:underline mt-2 text-xs font-bold uppercase tracking-widest">
                            Import Default Inventory
                            </button>
                          </>
                        )}
                    </td>
                    </tr>
                ) : (
                    filteredItems.map((item, index) => {
                    const isCritical = item.stock <= item.critical_stock;
                    return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="p-6 text-center font-bold text-slate-400">{index + 1}</td>
                        <td className="p-6 font-mono text-slate-600 font-medium">
                            {editingId === item.id ? (
                                <input 
                                    type="text"
                                    value={editCode}
                                    onChange={(e) => setEditCode(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-blue-500 rounded-lg focus:outline-none font-mono text-slate-600"
                                />
                            ) : (
                                item.code || '-'
                            )}
                        </td>
                        <td className="p-6 font-bold text-slate-800">
                        {editingId === item.id ? (
                            <input 
                                type="text"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-blue-500 rounded-lg focus:outline-none font-bold text-slate-800"
                                autoFocus
                            />
                        ) : (
                            item.description
                        )}
                        </td>
                        <td className="p-6 text-center">
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-slate-200">
                            {item.unit}
                        </span>
                        </td>
                        <td className="p-6 text-center">
                        {editingId === item.id ? (
                            <input 
                                type="number" 
                                min="0"
                                value={editStock}
                                onChange={(e) => setEditStock(e.target.value)}
                                className="w-20 px-2 py-2 text-center bg-white border border-blue-500 rounded-lg focus:outline-none font-bold text-slate-800"
                            />
                        ) : (
                            <div className={`font-bold inline-flex items-center gap-1.5 px-3 py-1 rounded-lg ${isCritical ? 'text-rose-600 bg-rose-50 border border-rose-100' : 'text-slate-700 bg-slate-50'}`}>
                                {isCritical ? <AlertTriangle className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                                {item.stock}
                            </div>
                        )}
                        </td>
                        <td className="p-6 text-center">
                        {editingId === item.id ? (
                            <input 
                                type="number" 
                                min="0"
                                value={editCriticalStock}
                                onChange={(e) => setEditCriticalStock(e.target.value)}
                                className="w-20 px-2 py-2 text-center bg-white border border-blue-500 rounded-lg focus:outline-none font-bold text-slate-800"
                            />
                        ) : (
                            <span className="text-xs font-bold text-slate-400">{item.critical_stock}</span>
                        )}
                        </td>
                        <td className="p-6 text-right">
                        {editingId === item.id ? (
                            <input 
                            type="number" 
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-24 px-2 py-2 text-right bg-white border border-blue-500 rounded-lg focus:outline-none font-bold text-slate-800"
                            />
                        ) : (
                            <span className="font-bold text-slate-700">AED {item.price.toFixed(2)}</span>
                        )}
                        </td>
                        {!isReadOnly && (
                          <td className="p-6 text-center">
                          {editingId === item.id ? (
                              <div className="flex items-center justify-center gap-2">
                              <button onClick={() => saveEdit(item.id)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors">
                                  <Save className="w-4 h-4" />
                              </button>
                              <button onClick={cancelEdit} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors">
                                  <X className="w-4 h-4" />
                              </button>
                              </div>
                          ) : (
                              <button onClick={() => startEditing(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                              <Edit2 className="w-4 h-4" />
                              </button>
                          )}
                          </td>
                        )}
                    </tr>
                    );
                }))}
                </tbody>
            </table>
            </div>
        </div>
      )}

      {/* --- JOB COSTING VIEW --- */}
      {viewMode === 'costing' && (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Select Active Job</label>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative" ref={dropdownRef}>
                        <div className="relative">
                            <input 
                                type="text"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Search Job No. or Client Name..."
                                value={jobSearchTerm}
                                onChange={(e) => {
                                    setJobSearchTerm(e.target.value);
                                    setShowJobSuggestions(true);
                                    if (e.target.value === '') setSelectedJobId('');
                                }}
                                onFocus={() => setShowJobSuggestions(true)}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>
                        {showJobSuggestions && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                                {filteredJobs.length > 0 ? (
                                    filteredJobs.map(job => (
                                        <div 
                                            key={job.id} 
                                            onClick={() => selectJob(job)}
                                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-none"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-bold text-slate-800">{job.shipper_name}</span>
                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{job.id}</span>
                                            </div>
                                            <div className="text-xs text-slate-400 mt-0.5">{job.location || 'No Location'}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-4 py-3 text-sm text-slate-400 italic">No matching jobs found.</div>
                                )}
                            </div>
                        )}
                    </div>

                    {selectedJobId && (
                        <div className="flex gap-2 flex-wrap">
                            <div className="flex flex-col justify-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 min-w-[150px]">
                                <span className="text-[9px] text-slate-400 font-bold uppercase">Requester</span>
                                <span className="text-sm font-bold text-slate-800 truncate">
                                    {(() => {
                                        const job = jobs.find(j => j.id === selectedJobId);
                                        const user = users.find(u => u.employee_id === job?.requester_id);
                                        return user ? user.name : (job?.requester_id || 'N/A');
                                    })()}
                                </span>
                            </div>
                            <div className="flex flex-col justify-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 min-w-[150px]">
                                <span className="text-[9px] text-slate-400 font-bold uppercase">Shipper</span>
                                <span className="text-sm font-bold text-slate-800">{jobs.find(j => j.id === selectedJobId)?.shipper_name}</span>
                            </div>
                            <div className="flex flex-col justify-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 min-w-[150px]">
                                <span className="text-[9px] text-slate-400 font-bold uppercase">Location</span>
                                <span className="text-sm font-bold text-slate-800 truncate max-w-[120px]" title={jobs.find(j => j.id === selectedJobId)?.location}>
                                    {jobs.find(j => j.id === selectedJobId)?.location || 'N/A'}
                                </span>
                            </div>
                            <div className="flex flex-col justify-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-[9px] text-slate-400 font-bold uppercase">Volume</span>
                                <span className="text-sm font-bold text-slate-800">{jobs.find(j => j.id === selectedJobId)?.volume_cbm || 0} m³</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Render Cost Sheet Form only when available */}
            {selectedJobId ? (
                sheetLoading ? (
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-20 flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                        <p className="text-slate-500 font-bold text-sm">Retrieving Cost Sheet...</p>
                    </div>
                ) : currentSheet ? (
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Stage Navigation */}
                        <div className="flex border-b border-slate-200">
                            {!onlyFinalAssessment && (
                                <>
                                    <button 
                                        onClick={() => setCostingStage('Issued')} 
                                        className={`flex-1 py-4 text-center text-xs font-bold uppercase tracking-widest transition-all ${costingStage === 'Issued' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-slate-50 text-slate-400 hover:text-slate-600'}`}
                                    >
                                        1. Issued Form
                                    </button>
                                    <button 
                                        onClick={() => setCostingStage('Returned')} 
                                        className={`flex-1 py-4 text-center text-xs font-bold uppercase tracking-widest transition-all ${costingStage === 'Returned' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-slate-50 text-slate-400 hover:text-slate-600'}`}
                                    >
                                        2. Returned Form
                                    </button>
                                </>
                            )}
                            <button 
                                onClick={() => setCostingStage('Final')} 
                                className={`flex-1 py-4 text-center text-xs font-bold uppercase tracking-widest transition-all ${costingStage === 'Final' ? 'bg-white text-emerald-600 border-b-2 border-emerald-600' : 'bg-slate-50 text-slate-400 hover:text-slate-600'}`}
                            >
                                {onlyFinalAssessment ? 'Final Assessment' : '3. Final Assessment'}
                            </button>
                        </div>

                        <div className="p-6 md:p-8">
                            {costingStage !== 'Final' && (
                                <div className="flex gap-4 mb-6 items-center">
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Search materials to add..."
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                                            value={searchMaterial}
                                            onChange={e => setSearchMaterial(e.target.value)}
                                        />
                                        {searchMaterial && (
                                            <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl mt-2 max-h-48 overflow-y-auto z-10 custom-scrollbar">
                                                {filteredMaterialList.map(item => (
                                                    <div 
                                                        key={item.id} 
                                                        onClick={() => addItemToSheet(item)}
                                                        className="p-3 hover:bg-blue-50 cursor-pointer text-sm font-medium flex justify-between"
                                                    >
                                                        <span>{item.description}</span>
                                                        <span className="text-slate-400 text-xs">{item.code}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                                            <th className="p-4">Material Description</th>
                                            <th className="p-4 text-center w-24">Unit</th>
                                            <th className="p-4 text-center w-32 bg-blue-50/50 text-blue-700">Issued Qty</th>
                                            <th className="p-4 text-center w-32 bg-orange-50/50 text-orange-700">Returned Qty</th>
                                            <th className="p-4 text-center w-24 bg-slate-100 text-slate-700">Consumed</th>
                                            {costingStage === 'Issued' && <th className="p-4 text-center w-16">Action</th>}
                                            {costingStage === 'Final' && <th className="p-4 text-right w-32 bg-emerald-50/50 text-emerald-700">Cost (AED)</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {currentSheet.items.map((item) => {
                                            const consumed = Math.max(0, item.issued_qty - item.returned_qty);
                                            const cost = consumed * item.price;
                                            
                                            return (
                                                <tr key={item.inventory_id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-4 text-sm font-bold text-slate-700">
                                                        {item.description}
                                                        <div className="text-[9px] text-slate-400 font-normal">{item.code}</div>
                                                    </td>
                                                    <td className="p-4 text-center text-xs font-bold text-slate-500">{item.unit}</td>
                                                    <td className="p-4 text-center bg-blue-50/10">
                                                        <input 
                                                            type="number" 
                                                            min="0"
                                                            disabled={costingStage !== 'Issued'}
                                                            className={`w-full text-center p-2 rounded-lg text-sm font-bold outline-none ${costingStage === 'Issued' ? 'bg-white border border-blue-200 focus:ring-1 focus:ring-blue-500 text-slate-900 shadow-sm' : 'bg-transparent text-slate-600'}`}
                                                            value={item.issued_qty}
                                                            onChange={e => updateSheetItem(item.inventory_id, 'issued_qty', parseInt(e.target.value) || 0)}
                                                        />
                                                    </td>
                                                    <td className="p-4 text-center bg-orange-50/10">
                                                        <input 
                                                            type="number" 
                                                            min="0"
                                                            disabled={costingStage !== 'Returned'}
                                                            className={`w-full text-center p-2 rounded-lg text-sm font-bold outline-none ${costingStage === 'Returned' ? 'bg-white border border-orange-200 focus:ring-1 focus:ring-orange-500 text-slate-900 shadow-sm' : 'bg-transparent text-slate-600'}`}
                                                            value={item.returned_qty}
                                                            onChange={e => updateSheetItem(item.inventory_id, 'returned_qty', parseInt(e.target.value) || 0)}
                                                        />
                                                    </td>
                                                    <td className="p-4 text-center bg-slate-50 font-bold text-slate-800 text-sm border-l border-slate-100">
                                                        {consumed}
                                                    </td>
                                                    {costingStage === 'Issued' && (
                                                        <td className="p-4 text-center">
                                                            <button 
                                                                onClick={() => removeItemFromSheet(item.inventory_id)}
                                                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                                title="Remove Item"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    )}
                                                    {costingStage === 'Final' && (
                                                        <td className="p-4 text-right font-bold text-emerald-600 text-sm bg-emerald-50/20">
                                                            {cost.toFixed(2)}
                                                        </td>
                                                    )}
                                                </tr>
                                            )
                                        })}
                                        {currentSheet.items.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-slate-400 text-sm italic">
                                                    No materials added to this sheet yet. Search above to add items.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {costingStage === 'Final' && (
                                        <tfoot>
                                            <tr className="bg-slate-900 text-white">
                                                <td colSpan={6} className="p-4 text-right text-xs font-bold uppercase tracking-widest">Total Material Cost</td>
                                                <td className="p-4 text-right text-lg font-black">{calculateTotalCost().toFixed(2)} AED</td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>

                            <div className="mt-8 flex justify-end gap-3">
                                {costingStage === 'Final' && (
                                    <button
                                        onClick={handleExportPDF}
                                        className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold uppercase text-[11px] tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                                    >
                                        <Printer className="w-4 h-4" /> Save PDF
                                    </button>
                                )}
                                {costingStage === 'Final' && currentSheet.status === 'Finalized' && !onlyFinalAssessment && (
                                    <button
                                        onClick={handleRedeductStock}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 bg-white text-slate-600 border border-slate-200 px-6 py-3 rounded-xl font-bold uppercase text-[11px] tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                        Re-Deduct Stock
                                    </button>
                                )}
                                
                                {costingStage === 'Issued' && !onlyFinalAssessment && (
                                    <button
                                        onClick={handleDeleteSheet}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 bg-rose-50 text-rose-600 border border-rose-100 px-6 py-3 rounded-xl font-bold uppercase text-[11px] tracking-widest hover:bg-rose-100 transition-all shadow-sm"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        Delete Form
                                    </button>
                                )}

                                {!onlyFinalAssessment && (
                                    <button 
                                        onClick={saveCostSheet}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold uppercase text-[11px] tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        {isSaving ? 'Processing Update...' : `Save & Update Stock`}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : null
            ) : (
                <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-20 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No Job Selected</h3>
                    <p className="text-slate-400 text-sm mt-1 max-w-md">Search and select an active job above to view or create its cost sheet.</p>
                </div>
            )}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8 border-b bg-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 uppercase tracking-widest">New Inventory Item</h3>
                <p className="text-sm text-slate-400 font-medium">Add to master list</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleAddItem} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Item Code</label>
                    <input 
                        type="text" 
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" 
                        value={newItem.code} 
                        onChange={e => setNewItem({...newItem, code: e.target.value})} 
                        placeholder="PKG 10..." 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Unit of Issue</label>
                    <select 
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" 
                        value={newItem.unit} 
                        onChange={e => setNewItem({...newItem, unit: e.target.value})}
                    >
                        <option value="PCS">PCS</option>
                        <option value="ROL">ROL</option>
                        <option value="KGs">KGs</option>
                        <option value="EA">EA</option>
                        <option value="SET">SET</option>
                        <option value="HR">HR (Manpower)</option>
                        <option value="DAY">DAY (Manpower)</option>
                        <option value="TRIP">TRIP (Truck)</option>
                    </select>
                  </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Description *</label>
                <input 
                    required
                    type="text" 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" 
                    value={newItem.description} 
                    onChange={e => setNewItem({...newItem, description: e.target.value})} 
                    placeholder="e.g. Large Carton 60x60x60" 
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Price</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">AED</span>
                        <input 
                            type="number" 
                            step="0.01"
                            min="0"
                            className="w-full pl-10 pr-3 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" 
                            value={newItem.price} 
                            onChange={e => setNewItem({...newItem, price: parseFloat(e.target.value) || 0})} 
                        />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Stock</label>
                    <input 
                        type="number" 
                        min="0"
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" 
                        value={newItem.stock} 
                        onChange={e => setNewItem({...newItem, stock: parseInt(e.target.value) || 0})} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Critical Limit</label>
                    <input 
                        type="number" 
                        min="0"
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none text-rose-600" 
                        value={newItem.critical_stock} 
                        onChange={e => setNewItem({...newItem, critical_stock: parseInt(e.target.value) || 0})} 
                    />
                  </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 rounded-xl transition-all uppercase text-[10px] tracking-widest">Cancel</button>
                <button type="submit" className="flex-1 py-4 font-bold text-white bg-slate-900 rounded-xl shadow-lg hover:bg-slate-800 transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
