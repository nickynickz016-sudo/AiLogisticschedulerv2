
import React, { useState, useEffect, useRef } from 'react';
import { Search, Edit2, Save, X, Plus, Package, AlertTriangle, Loader2, Database, FileInput, ClipboardList, ChevronRight, Calculator, Truck, User, MapPin, RefreshCw, Trash2, Printer, ChevronDown, FileText, FileDown, Calendar, Info, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { InventoryItem, Job, JobCostSheet, CostSheetItem, UserProfile, InventoryConsumption, InventoryPriceHistory } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [editCode, setEditCode] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');
  const [editOpeningStock, setEditOpeningStock] = useState<string>('');
  const [editCriticalStock, setEditCriticalStock] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editUnit, setEditUnit] = useState<string>('PCS');
  const [editIsOutsource, setEditIsOutsource] = useState<boolean>(false);
  const [editVendorName, setEditVendorName] = useState<string>('');
  const [editOutsourceType, setEditOutsourceType] = useState<string>('');
  const [editTruckSchedule, setEditTruckSchedule] = useState<string>('');
  const [editLocation, setEditLocation] = useState<string>('');

  // Add Item State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    code: '',
    description: '',
    unit: 'PCS',
    price: 0,
    opening_stock: 0,
    critical_stock: 10,
    is_outsource: false,
    vendor_name: '',
    outsource_type: '',
    truck_schedule: '',
    location: ''
  });

  // Outsource Helpers
  const [vendors, setVendors] = useState<string[]>(['AH Technical', 'Noor', 'Writer Relocations']);
  const [showAddVendorInput, setShowAddVendorInput] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');

  const outsourceTypes = ['Packer', 'Helpers', 'Handyman', 'Overtime', 'Machine (forklift)', 'Truck (3 ton)', 'Truck (5 ton)', 'Truck (10 ton)'];
  const locations = ['Sharjah', 'Abu Dhabi', 'Dubai', 'Ras Al Khaimah', 'Fujairah'];

  // Purchase State
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedItemForPurchase, setSelectedItemForPurchase] = useState<InventoryItem | null>(null);
  const [purchaseQty, setPurchaseQty] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [purchases, setPurchases] = useState<Record<number, any[]>>({});
  const [showPurchaseHistory, setShowPurchaseHistory] = useState<number | null>(null);
  
  // Report State
  const [reportStartDate, setReportStartDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isExporting, setIsExporting] = useState(false);

  // Price History State
  const [showPriceModal, setShowPriceModal] = useState<number | null>(null);
  const [newPrice, setNewPrice] = useState<number>(0);
  const [priceEffectiveDate, setPriceEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [priceHistory, setPriceHistory] = useState<Record<number, InventoryPriceHistory[]>>({});

  // Confirmation Modals
  const [showDeleteSheetConfirm, setShowDeleteSheetConfirm] = useState(false);
  const [genericConfirm, setGenericConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
      setNotification({ message: 'Failed to load inventory data', type: 'error' });
    } else {
      setItems(data || []);
      // Fetch purchases for all items
      fetchPurchases();
    }
    setLoading(false);
  };

  const fetchPurchases = async () => {
    const { data: pData, error: pError } = await supabase
      .from('inventory_purchases')
      .select('*')
      .order('purchase_date', { ascending: false });
    
    const { data: phData, error: phError } = await supabase
      .from('inventory_price_history')
      .select('*')
      .order('effective_date', { ascending: false });

    if (pError) {
      console.error('Error fetching purchases:', pError);
    } else {
      const grouped = (pData || []).reduce((acc: any, p: any) => {
        if (!acc[p.inventory_id]) acc[p.inventory_id] = [];
        acc[p.inventory_id].push(p);
        return acc;
      }, {});
      setPurchases(grouped);
    }

    if (phError) {
        console.error('Error fetching price history:', phError);
    } else {
        const grouped = (phData || []).reduce((acc: any, ph: any) => {
            if (!acc[ph.inventory_id]) acc[ph.inventory_id] = [];
            acc[ph.inventory_id].push(ph);
            return acc;
        }, {});
        setPriceHistory(grouped);
    }
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

    // Merge Logic: Combine Master Inventory with Saved Data
    // We map over the Master 'items' so every item is present in the sheet.
    const mergedItems: CostSheetItem[] = items.map(masterItem => {
        // Check if this master item exists in the saved sheet data
        const savedItem = data?.items?.find((i: any) => i.inventory_id === masterItem.id);
        
        if (savedItem) {
            // Use saved values but ensure description/code/price/outsource fields are current from master
            return {
                ...savedItem,
                code: masterItem.code,
                description: masterItem.description,
                price: masterItem.price,
                unit: masterItem.unit,
                is_outsource: masterItem.is_outsource,
                vendor_name: masterItem.vendor_name,
                outsource_type: masterItem.outsource_type,
                truck_schedule: masterItem.truck_schedule,
                location: masterItem.location
            };
        } else {
            // Initialize with 0
            return {
                inventory_id: masterItem.id,
                code: masterItem.code,
                description: masterItem.description,
                unit: masterItem.unit,
                price: masterItem.price,
                issued_qty: 0,
                returned_qty: 0,
                is_outsource: masterItem.is_outsource,
                vendor_name: masterItem.vendor_name,
                outsource_type: masterItem.outsource_type,
                truck_schedule: masterItem.truck_schedule,
                location: masterItem.location
            };
        }
    });

    if (data) {
        setCurrentSheet({ ...data, items: mergedItems });
        
        // Determine stage
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
        // Initialize new sheet with full inventory list
        setCurrentSheet({
            job_id: jobId,
            items: mergedItems,
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
  }, [selectedJobId, onlyFinalAssessment, items]); // Added items dependency so if master list loads later, sheet updates

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // --- Inventory Functions ---

  const filteredItems = items.filter(item => 
    item.description.toLowerCase().includes(filter.toLowerCase()) ||
    (item.code && item.code.toLowerCase().includes(filter.toLowerCase()))
  );

  const startEditing = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditCode(item.code || '');
    setEditPrice(item.price.toString());
    setEditOpeningStock(item.opening_stock.toString());
    setEditCriticalStock(item.critical_stock.toString());
    setEditDescription(item.description);
    setEditUnit(item.unit);
    setEditIsOutsource(item.is_outsource || false);
    setEditVendorName(item.vendor_name || '');
    setEditOutsourceType(item.outsource_type || '');
    setEditTruckSchedule(item.truck_schedule || '');
    setEditLocation(item.location || '');
  };

  const saveEdit = async (id: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const newOpeningStock = parseInt(editOpeningStock) || 0;
    
    // If opening stock changed, we "lock in" and reset purchased_stock and stock
    const isLockingIn = newOpeningStock !== item.opening_stock;

    const { error } = await supabase
      .from('inventory_items')
      .update({
        code: editCode,
        description: editDescription,
        price: parseFloat(editPrice) || 0,
        opening_stock: newOpeningStock,
        unit: editUnit,
        critical_stock: parseInt(editCriticalStock) || 0,
        is_outsource: editIsOutsource,
        vendor_name: editVendorName,
        outsource_type: editOutsourceType,
        truck_schedule: editTruckSchedule,
        location: editLocation,
        // When locking in, we reset stock to opening_stock and purchased_stock to 0
        stock: isLockingIn ? newOpeningStock : item.stock,
        purchased_stock: isLockingIn ? 0 : item.purchased_stock,
      })
      .eq('id', id);

    if (error) {
      setNotification({ message: `Error updating item: ${error.message}`, type: 'error' });
    } else {
      if (isLockingIn) {
        // If we reset purchased_stock, we should probably delete purchase history or mark it as "archived"
        // For now, let's just keep it but it won't be counted in the current purchased_stock field
        // Actually, it's better to just keep everything and calculate purchased_stock from the table
        // but the user wants a simple "Purchased stocks added on the opening stocks".
      }
      setEditingId(null);
      fetchInventory();
    }
  };

  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForPurchase || !purchaseQty) return;

    const qty = parseInt(purchaseQty);
    const { error: purchaseError } = await supabase
      .from('inventory_purchases')
      .insert([{
        inventory_id: selectedItemForPurchase.id,
        quantity: qty,
        purchase_date: purchaseDate
      }]);

    if (purchaseError) {
      setNotification({ message: `Error adding purchase: ${purchaseError.message}`, type: 'error' });
      return;
    }

    // Update item stock and purchased_stock
    const { error: itemError } = await supabase
      .from('inventory_items')
      .update({
        purchased_stock: selectedItemForPurchase.purchased_stock + qty,
        stock: selectedItemForPurchase.stock + qty
      })
      .eq('id', selectedItemForPurchase.id);

    if (itemError) {
      setNotification({ message: `Error updating stock: ${itemError.message}`, type: 'error' });
    } else {
      setShowPurchaseModal(false);
      setSelectedItemForPurchase(null);
      setPurchaseQty('');
      fetchInventory();
    }
  };

  const handleExportExcel = async () => {
    if (items.length === 0) {
        setNotification({ message: "No inventory items found to export.", type: 'error' });
        return;
    }

    setIsExporting(true);
    try {
        // 1. Fetch Job Cost Sheets in Date Range (based on packing_date)
        const { data: rangeSheets, error: sError } = await supabase
            .from('job_cost_sheets')
            .select('items, packing_date')
            .gte('packing_date', reportStartDate)
            .lte('packing_date', reportEndDate);

        if (sError) throw sError;

        // 2. Aggregate Consumption from Sheets
        const consumptionMap = new Map<number, number>();
        (rangeSheets || []).forEach(sheet => {
            if (sheet.items && Array.isArray(sheet.items)) {
                sheet.items.forEach((item: any) => {
                    const invId = Number(item.inventory_id);
                    const consumed = (Number(item.issued_qty) || 0) - (Number(item.returned_qty) || 0);
                    if (consumed !== 0) {
                        const current = consumptionMap.get(invId) || 0;
                        consumptionMap.set(invId, current + consumed);
                    }
                });
            }
        });

        // 3. Fetch Purchases in Date Range (for reference)
        const { data: rangePurchases, error: pError } = await supabase
            .from('inventory_purchases')
            .select('*')
            .gte('purchase_date', reportStartDate)
            .lte('purchase_date', reportEndDate);

        if (pError) throw pError;

        // 4. Prepare Report Data
        // Filter: Only show items that have been consumed in the selected period
        const reportData = items
            .map(item => {
                const totalConsumedInRange = consumptionMap.get(item.id) || 0;
                
                // User Request: "system will only show to me what has been consumed on start date and end date"
                if (totalConsumedInRange === 0) return null;

                const totalPurchasedInRange = (rangePurchases || [])
                    .filter(p => Number(p.inventory_id) === Number(item.id))
                    .reduce((sum, p) => sum + Number(p.quantity), 0);

                // Lifetime Consumed (matching UI: (Opening + Purchased) - Stock)
                const lifetimeConsumed = (Number(item.opening_stock || 0) + Number(item.purchased_stock || 0)) - Number(item.stock || 0);

                return {
                    'Item Code': item.code || '-',
                    'Description': item.description,
                    'Unit': item.unit,
                    'Current Rate (Master)': item.price, // Updated Current Rate value
                    'Opening Stock': item.opening_stock,
                    'Total Purchased (Period)': totalPurchasedInRange,
                    'Consumed Qty (Period)': totalConsumedInRange,
                    'Consumed Value (Period)': (totalConsumedInRange * item.price).toFixed(2), // Consumed qty (Period) * Updated Current Rate
                    'Stock Remaining': item.stock,
                    'Lifetime Consumed (UI)': lifetimeConsumed
                };
            })
            .filter(row => row !== null);

        if (reportData.length === 0) {
            setNotification({ message: "No consumption found in the selected date range. Please check the 'Packing Date' in your cost sheets.", type: 'error' });
            return;
        }

        // 5. Generate Excel
        const worksheet = XLSX.utils.json_to_sheet(reportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Report");

        // Set column widths
        const wscols = [
            {wch: 15}, // Item Code
            {wch: 40}, // Description
            {wch: 10}, // Unit
            {wch: 15}, // Current Rate
            {wch: 15}, // Opening Stock
            {wch: 20}, // Total Purchased
            {wch: 20}, // Consumed Qty
            {wch: 20}, // Consumed Value
            {wch: 15}, // Stock Remaining
            {wch: 20}  // Lifetime Consumed
        ];
        worksheet['!cols'] = wscols;

        // Use write and Blob to trigger download
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Inventory_Report_${reportStartDate}_to_${reportEndDate}.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setNotification({ message: "Excel report exported successfully.", type: 'success' });
    } catch (error: any) {
        console.error("Excel Export Failed:", error);
        setNotification({ message: "Failed to generate report. Error: " + error.message, type: 'error' });
    } finally {
        setIsExporting(false);
    }
  };

  const handleExportOutsourceExcel = async () => {
    if (items.length === 0) {
        setNotification({ message: "No inventory items found to export.", type: 'error' });
        return;
    }

    setIsExporting(true);
    try {
        // 1. Filter for Outsource items from the master list
        const outsourceItems = items.filter(item => item.is_outsource === true);

        if (outsourceItems.length === 0) {
            setNotification({ message: "No outsource items found to export.", type: 'error' });
            return;
        }

        // 2. Fetch Job Cost Sheets in Date Range (based on packing_date)
        // This is more accurate for "Labour Reports" as it ties consumption to the job's scheduled date
        const { data: rangeSheets, error: sError } = await supabase
            .from('job_cost_sheets')
            .select('items, packing_date')
            .gte('packing_date', reportStartDate)
            .lte('packing_date', reportEndDate);

        if (sError) throw sError;

        // 3. Aggregate Consumption from Sheets
        const consumptionMap = new Map<number, number>();
        (rangeSheets || []).forEach(sheet => {
            if (sheet.items && Array.isArray(sheet.items)) {
                sheet.items.forEach((item: any) => {
                    const invId = Number(item.inventory_id);
                    const consumed = (Number(item.issued_qty) || 0) - (Number(item.returned_qty) || 0);
                    if (consumed !== 0) {
                        const current = consumptionMap.get(invId) || 0;
                        consumptionMap.set(invId, current + consumed);
                    }
                });
            }
        });

        // 4. Prepare Report Data
        // We show all outsource items that have some consumption in the range
        // We use the CURRENT item.price (updated rate) as requested
        const reportData = outsourceItems
            .map(item => {
                const totalConsumedInRange = consumptionMap.get(item.id) || 0;
                
                // If the user specifically mentioned "Item Sr 42 has 11 consumed", 
                // they might want to see it even if it's 0 in the range? 
                // Usually no, but let's ensure we are calculating it correctly.
                if (totalConsumedInRange === 0) return null;

                return {
                    'Item Code': item.code || '-',
                    'Description': item.description,
                    'Vendor': item.vendor_name || '-',
                    'Rate': item.price, // This is the updated rate from the master list
                    [`Consumed from (${reportStartDate} to ${reportEndDate})`]: totalConsumedInRange,
                    'Rate x Consumed qty (AED Price)': (totalConsumedInRange * item.price).toFixed(2)
                };
            })
            .filter(row => row !== null);

        if (reportData.length === 0) {
            setNotification({ message: "No outsource consumption found in the selected date range. Please check the 'Packing Date' in your cost sheets.", type: 'error' });
            return;
        }

        // 5. Generate Excel
        const worksheet = XLSX.utils.json_to_sheet(reportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Outsource Labour Report");

        // Set column widths
        const wscols = [
            {wch: 15}, // Item Code
            {wch: 30}, // Description
            {wch: 20}, // Vendor
            {wch: 10}, // Rate
            {wch: 35}, // Consumed from (Date range)
            {wch: 30}  // Rate x Consumed qty
        ];
        worksheet['!cols'] = wscols;

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Outsource_Labour_Report_${reportStartDate}_to_${reportEndDate}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);

        setNotification({ message: "Outsource Labour Report exported successfully!", type: 'success' });
    } catch (error: any) {
        console.error("Export failed:", error);
        setNotification({ message: "Error exporting report: " + error.message, type: 'error' });
    } finally {
        setIsExporting(false);
    }
  };

  const handleExportJobExcel = () => {
    if (!currentSheet || !currentSheet.items) {
      setNotification({ message: "No job data found to export.", type: 'error' });
      return;
    }

    const job = jobs.find(j => j.id === currentSheet.job_id);
    const jobNo = job?.id || currentSheet.job_id;

    const reportData = currentSheet.items
      .filter(item => Number(item.issued_qty || 0) > 0) // Only include items with activity
      .map(item => {
        const consumed = Math.max(0, Number(item.issued_qty || 0) - Number(item.returned_qty || 0));
        const rate = Number(item.price || 0);
        return {
          'Packing Date': currentSheet.packing_date || '-',
          'Item Code': item.code || '-',
          'Product Description': item.description,
          'Qty Consumed': consumed,
          'Rate': rate,
          'Qty Consumed X rate': (consumed * rate).toFixed(2)
        };
      });

    if (reportData.length === 0) {
      setNotification({ message: "No materials consumed for this job yet.", type: 'error' });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Job Costing Report");

    // Set column widths
    const wscols = [
      { wch: 15 }, // Packing Date
      { wch: 15 }, // Item Code
      { wch: 40 }, // Product Description
      { wch: 15 }, // Qty Consumed
      { wch: 15 }, // Rate
      { wch: 20 }, // Total Cost
    ];
    worksheet['!cols'] = wscols;

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Job_Costing_${jobNo}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExportAllJobCosting = async () => {
    setIsExporting(true);
    try {
      const { data: sheets, error: sError } = await supabase
        .from('job_cost_sheets')
        .select('*');

      if (sError) throw sError;

      const { data: allPriceHistory } = await supabase
        .from('inventory_price_history')
        .select('*')
        .order('effective_date', { ascending: false });

      if (!sheets || sheets.length === 0) {
        setNotification({ message: "No job cost sheets found.", type: 'error' });
        return;
      }

      const reportData: any[] = [];

      sheets.forEach((sheet: JobCostSheet) => {
        const job = jobs.find(j => j.id === sheet.job_id);
        const jobNo = job?.id || sheet.job_id;
        const clientName = job?.shipper_name || 'N/A';

        sheet.items.forEach((item: CostSheetItem) => {
          const consumed = Math.max(0, Number(item.issued_qty || 0) - Number(item.returned_qty || 0));
          if (consumed > 0) {
            const itemPrices = (allPriceHistory || []).filter(ph => Number(ph.inventory_id) === Number(item.inventory_id));
            const currentPrice = itemPrices[0]?.price || item.price;
            const previousPrice = itemPrices[1]?.price || '-';
            const changeDates = itemPrices.map(ph => ph.effective_date).join(', ');

            reportData.push({
              'Job No.': jobNo,
              'Client Name': clientName,
              'Item Code': item.code || '-',
              'Product Description': item.description,
              'Qty Consumed': consumed,
              'Rate': item.price,
              'Qty Consumed X rate': (consumed * item.price).toFixed(2),
              'Previous Price': previousPrice,
              'Current Update Price': currentPrice,
              'Dates when it change': changeDates || 'No changes'
            });
          }
        });
      });

      if (reportData.length === 0) {
        setNotification({ message: "No material consumption found across all jobs.", type: 'error' });
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(reportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Overall Job Costing");

      const wscols = [
        { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 30 }
      ];
      worksheet['!cols'] = wscols;

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Overall_Job_Costing_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error: any) {
      console.error("Overall Job Costing Export Failed:", error);
      setNotification({ message: "Failed to generate overall report: " + error.message, type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleUpdatePrice = async () => {
    if (!showPriceModal) return;
    
    try {
        // 1. Add to history
        const { error: hError } = await supabase
            .from('inventory_price_history')
            .insert([{
                inventory_id: showPriceModal,
                price: newPrice,
                effective_date: priceEffectiveDate
            }]);
        
        if (hError) throw hError;

        // 2. Update main item price if effective date is today or past
        if (priceEffectiveDate <= new Date().toISOString().split('T')[0]) {
            const { error: iError } = await supabase
                .from('inventory_items')
                .update({ price: newPrice })
                .eq('id', showPriceModal);
            
            if (iError) throw iError;
        }

        setShowPriceModal(null);
        fetchInventory();
        setNotification({ message: "Price updated successfully!", type: 'success' });
    } catch (error: any) {
        setNotification({ message: "Error updating price: " + error.message, type: 'error' });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCode('');
    setEditPrice('');
    setEditOpeningStock('');
    setEditCriticalStock('');
    setEditDescription('');
    setEditUnit('PCS');
    setEditIsOutsource(false);
    setEditVendorName('');
    setEditOutsourceType('');
    setEditTruckSchedule('');
    setEditLocation('');
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.description) {
        setNotification({ message: "Description is required", type: 'error' });
        return;
    }

    const { error } = await supabase
      .from('inventory_items')
      .insert([{
        code: newItem.code,
        description: newItem.description,
        unit: newItem.unit,
        price: newItem.price,
        opening_stock: newItem.opening_stock,
        stock: newItem.opening_stock, // Initial stock is opening stock
        purchased_stock: 0,
        critical_stock: newItem.critical_stock,
        is_outsource: newItem.is_outsource,
        vendor_name: newItem.vendor_name,
        outsource_type: newItem.outsource_type,
        truck_schedule: newItem.truck_schedule,
        location: newItem.location
      }]);

    if (error) {
      setNotification({ message: `Error adding item: ${error.message}`, type: 'error' });
    } else {
      setShowAddModal(false);
      setNewItem({ 
        code: '', 
        description: '', 
        unit: 'PCS', 
        price: 0, 
        opening_stock: 0, 
        critical_stock: 10,
        is_outsource: false,
        vendor_name: '',
        outsource_type: '',
        truck_schedule: '',
        location: ''
      });
      fetchInventory();
    }
  };

  const handleDeleteItem = (id: number) => {
    setItemToDelete(id);
  };

  const confirmDelete = async (id: number) => {
    console.log('Attempting to delete item with ID:', id);
    try {
      const { error, count } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase delete error:', error);
        setNotification({ message: `Error deleting item: ${error.message}`, type: 'error' });
      } else {
        console.log('Delete operation completed. Rows affected:', count);
        setNotification({ message: 'Item deleted successfully from database', type: 'success' });
        fetchInventory();
      }
    } catch (err) {
      console.error('Unexpected error during delete:', err);
      setNotification({ message: 'An unexpected error occurred while deleting the item.', type: 'error' });
    } finally {
      setItemToDelete(null);
    }
  };

  const handleSeedDatabase = async () => {
    setGenericConfirm({
        title: "Import Default Items?",
        message: "This will import the standard packing material list into your database. Existing items will not be replaced. Continue?",
        onConfirm: async () => {
            setGenericConfirm(null);
            setLoading(true);
            try {
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
                    opening_stock: 1000,
                    stock: 1000,
                    purchased_stock: 0,
                    critical_stock: 50,
                    price: parseFloat((Math.random() * 9 + 1).toFixed(2)) // Random price between 1.00 and 10.00
                }));

                const { error } = await supabase.from('inventory_items').insert(itemsToInsert);
                
                if (error) {
                    setNotification({ message: "Error importing data: " + error.message, type: 'error' });
                } else {
                    setNotification({ message: "Default items imported successfully!", type: 'success' });
                    fetchInventory();
                }
            } catch (error: any) {
                setNotification({ message: "Error importing data: " + error.message, type: 'error' });
            } finally {
                setLoading(false);
            }
        }
    });
  };

  // --- Costing Functions ---

  const selectJob = (job: Job) => {
    setSelectedJobId(job.id);
    setJobSearchTerm(`${job.id} - ${job.shipper_name}`);
    setShowJobSuggestions(false);
  };

  const filteredJobs = jobs.filter(j => 
    !j.is_transporter &&
    (j.id.toLowerCase().includes(jobSearchTerm.toLowerCase()) ||
    j.shipper_name.toLowerCase().includes(jobSearchTerm.toLowerCase()))
  );

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
        const { data: previousSheetData } = await supabase
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
                const { data: masterItem } = await supabase
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
                        // 3.1 Log Consumption
                        if (diff > 0) {
                            await supabase
                                .from('inventory_consumption')
                                .insert([{
                                    inventory_id: invId,
                                    job_id: currentSheet.job_id,
                                    quantity: diff,
                                    consumption_date: new Date().toISOString().split('T')[0]
                                }]);
                        } else if (diff < 0) {
                            // If diff is negative, it means items were returned. 
                            // We can log a negative consumption or handle it as a return.
                            // For simplicity, we log the return as negative consumption.
                            await supabase
                                .from('inventory_consumption')
                                .insert([{
                                    inventory_id: invId,
                                    job_id: currentSheet.job_id,
                                    quantity: diff,
                                    consumption_date: new Date().toISOString().split('T')[0]
                                }]);
                        }
                    }
                }
            }
        }

        // 4. Save the Sheet
        // OPTIONAL: Filter out items with 0 issued/returned to save DB space, 
        // OR save everything to maintain full state. 
        // Saving everything ensures the full list structure is preserved for history.
        const status = costingStage === 'Final' ? 'Finalized' : costingStage === 'Returned' ? 'Returned' : 'Issued';
        
        // Let's filter slightly to clean up database but keep user intent
        // Ideally we save the full list if we want to show 0s next time without re-merging from master, 
        // BUT since we re-merge on fetchCostSheet anyway, we can strictly save only modified items to DB.
        // However, to keep it simple and less prone to sync errors, we'll save the items that have any activity.
        const itemsToSave = currentSheet.items.filter(i => i.issued_qty > 0 || i.returned_qty > 0);

        const payload = {
            job_id: currentSheet.job_id,
            items: itemsToSave,
            status: status,
            total_cost: calculateTotalCost(),
            packing_date: currentSheet.packing_date || null
        };

        const { error: saveError } = await supabase
            .from('job_cost_sheets')
            .upsert(payload);

        if (saveError) throw saveError;

        setNotification({ message: `Sheet saved successfully! ${updatesMade ? 'Inventory stock has been updated.' : ''}`, type: 'success' });
        // Update local state to reflect status change
        setCurrentSheet({ ...currentSheet, status });
        await fetchInventory(); // Refresh master list to show new stock levels

    } catch (error: any) {
        console.error("Save failed:", error);
        setNotification({ message: "Error saving sheet: " + error.message, type: 'error' });
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteSheet = async () => {
    if (!currentSheet || !selectedJobId) return;
    setIsSaving(true);
    setShowDeleteSheetConfirm(false);

    try {
        // 1. Fetch Previous Sheet State from DB to check status and items
        const { data: previousSheetData, error: fetchError } = await supabase
            .from('job_cost_sheets')
            .select('items, status')
            .eq('job_id', selectedJobId)
            .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

        if (previousSheetData) {
            // Revert Stock for all items that were previously saved
            if (previousSheetData.items && previousSheetData.items.length > 0) {
                const previousItems: CostSheetItem[] = previousSheetData.items;

                // 2. Revert Stock
                for (const item of previousItems) {
                    const netConsumed = (Number(item.issued_qty) || 0) - (Number(item.returned_qty) || 0);
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

                // 3. Delete Consumption Logs
                await supabase
                    .from('inventory_consumption')
                    .delete()
                    .eq('job_id', selectedJobId);
            }

            // 4. Delete the Sheet
            const { error: deleteError } = await supabase
                .from('job_cost_sheets')
                .delete()
                .eq('job_id', selectedJobId);

            if (deleteError) throw deleteError;
        }

        setNotification({ message: "Cost sheet deleted successfully. Stock levels have been restored where applicable.", type: 'success' });
        
        // Reset local state in a safe order to prevent white screen
        // First clear the selection to trigger the placeholder view
        setSelectedJobId('');
        setJobSearchTerm('');
        setCurrentSheet(null);
        setCostingStage('Issued');
        
        // Then refresh the master list
        await fetchInventory();

    } catch (error: any) {
        console.error("Delete failed:", error);
        setNotification({ message: "Error deleting sheet: " + error.message, type: 'error' });
    } finally {
        setIsSaving(false);
    }
  };

  const handleRedeductStock = async () => {
      setGenericConfirm({
          title: "Force Re-deduct Stock?",
          message: "Only use this if stock wasn't updated automatically. This will run the deduction logic again. Continue?",
          onConfirm: async () => {
              setGenericConfirm(null);
              await saveCostSheet();
          }
      });
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
    // Only show items with activity for clean PDF
    const itemsToShow = currentSheet.items.filter(i => i.issued_qty > 0 || i.returned_qty > 0);
    const tableBody = itemsToShow.map(item => {
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
        theme: 'grid', 
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

  // Filter materials for the Cost Sheet Table View
  const visibleSheetItems = currentSheet?.items.filter(i => 
    i.description.toLowerCase().includes(searchMaterial.toLowerCase()) || 
    (i.code && i.code.toLowerCase().includes(searchMaterial.toLowerCase()))
  ) || [];

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
              <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 px-3 border-r border-slate-100">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <input 
                        type="date" 
                        value={reportStartDate}
                        onChange={(e) => setReportStartDate(e.target.value)}
                        className="text-xs font-bold text-slate-600 outline-none bg-transparent"
                    />
                    <span className="text-slate-300 text-xs">to</span>
                    <input 
                        type="date" 
                        value={reportEndDate}
                        onChange={(e) => setReportEndDate(e.target.value)}
                        className="text-xs font-bold text-slate-600 outline-none bg-transparent"
                    />
                </div>
                <button 
                    onClick={handleExportExcel}
                    disabled={isExporting}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                    {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
                    Export Excel
                </button>
                <button 
                    onClick={handleExportOutsourceExcel}
                    disabled={isExporting}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                    {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ClipboardList className="w-3 h-3" />}
                    Labour Report
                </button>
              </div>
            )}

            {viewMode === 'costing' && (
              <button
                onClick={handleExportAllJobCosting}
                disabled={isExporting}
                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 shadow-md border border-emerald-500/20"
              >
                {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                Export All Job Costing
              </button>
            )}

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
                    <th className="p-6 w-[25%]">Description</th>
                    <th className="p-6 text-center">Unit</th>
                    <th className="p-6 text-center">Opening</th>
                    <th className="p-6 text-center">Purchased</th>
                    <th className="p-6 text-center">Consumed</th>
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
                    const consumed = Math.max(0, (item.opening_stock + item.purchased_stock) - item.stock);
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
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    {item.is_outsource && (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-md text-[8px] font-bold uppercase tracking-widest border border-blue-200">
                                            Outsource
                                        </span>
                                    )}
                                    <span className="font-bold text-slate-800">{item.description}</span>
                                </div>
                                {item.is_outsource && (
                                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {item.vendor_name}</span>
                                        <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {item.outsource_type}</span>
                                        {item.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.location}</span>}
                                    </div>
                                )}
                            </div>
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
                                value={editOpeningStock}
                                onChange={(e) => setEditOpeningStock(e.target.value)}
                                className="w-20 px-2 py-2 text-center bg-white border border-blue-500 rounded-lg focus:outline-none font-bold text-slate-800"
                            />
                        ) : (
                            <span className="font-bold text-slate-700">{item.opening_stock}</span>
                        )}
                        </td>
                        <td className="p-6 text-center relative">
                            <div className="flex flex-col items-center gap-1">
                                <span className="font-bold text-blue-600">{item.purchased_stock}</span>
                                {!isReadOnly && (
                                    <button 
                                        onClick={() => {
                                            setSelectedItemForPurchase(item);
                                            setShowPurchaseModal(true);
                                        }}
                                        className="text-[9px] font-bold text-blue-500 hover:text-blue-700 underline uppercase tracking-tighter"
                                    >
                                        Add Purchase
                                    </button>
                                )}
                                {purchases[item.id] && (
                                    <button 
                                        onClick={() => setShowPurchaseHistory(showPurchaseHistory === item.id ? null : item.id)}
                                        className="text-[9px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-tighter"
                                    >
                                        {showPurchaseHistory === item.id ? 'Hide History' : 'View History'}
                                    </button>
                                )}
                            </div>
                            {showPurchaseHistory === item.id && purchases[item.id] && (
                                <div className="absolute z-50 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl p-3 text-left animate-in fade-in zoom-in-95 duration-200">
                                    <h4 className="text-[9px] font-bold text-slate-400 uppercase mb-2 border-b pb-1 tracking-widest">Purchase History</h4>
                                    <div className="max-h-32 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                                        {purchases[item.id].map((p: any) => (
                                            <div key={p.id} className="flex justify-between text-[10px] text-slate-600 font-medium">
                                                <span>{p.purchase_date}</span>
                                                <span className="font-bold text-blue-600">+{p.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </td>
                        <td className="p-6 text-center">
                            <span className="font-bold text-orange-600">{consumed}</span>
                        </td>
                        <td className="p-6 text-center">
                            <div className={`font-bold inline-flex items-center gap-1.5 px-3 py-1 rounded-lg ${isCritical ? 'text-rose-600 bg-rose-50 border border-rose-100' : 'text-slate-700 bg-slate-50'}`}>
                                {isCritical ? <AlertTriangle className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                                {item.stock}
                            </div>
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
                            <div className="flex flex-col items-end gap-1">
                               <span className="font-bold text-slate-700">AED {item.price.toFixed(2)}</span>
                               {!isReadOnly && (
                                   <button 
                                       onClick={() => {
                                           setShowPriceModal(item.id);
                                           setNewPrice(item.price);
                                       }}
                                       className="text-[9px] font-bold text-blue-500 hover:text-blue-700 underline uppercase tracking-tighter"
                                   >
                                       Update Rate
                                   </button>
                               )}
                            </div>
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
                              <div className="flex items-center justify-center gap-2 transition-all">
                                <button onClick={() => startEditing(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
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
                                            placeholder="Filter material list..."
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                                            value={searchMaterial}
                                            onChange={e => setSearchMaterial(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[600px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest sticky top-0 z-10 border-b border-slate-200">
                                            <th className="p-4 bg-slate-50">Material Description</th>
                                            <th className="p-4 text-center w-24 bg-slate-50">Unit</th>
                                            <th className="p-4 text-center w-32 bg-blue-50/50 text-blue-700">Issued Qty</th>
                                            <th className="p-4 text-center w-32 bg-orange-50/50 text-orange-700">Returned Qty</th>
                                            <th className="p-4 text-center w-24 bg-slate-100 text-slate-700">Consumed</th>
                                            {costingStage === 'Final' && <th className="p-4 text-right w-32 bg-emerald-50/50 text-emerald-700">Cost (AED)</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {visibleSheetItems.map((item) => {
                                            const consumed = Math.max(0, item.issued_qty - item.returned_qty);
                                            const cost = consumed * item.price;
                                            
                                            // Only hide items in Final stage if no activity
                                            if (costingStage === 'Final' && item.issued_qty === 0 && item.returned_qty === 0) return null;

                                            return (
                                                <tr key={item.inventory_id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-4 text-sm font-bold text-slate-700">
                                                        <div className="flex items-center gap-2">
                                                            {item.description}
                                                            {item.is_outsource && (
                                                                <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase rounded border border-blue-100 shrink-0">Outsource</span>
                                                            )}
                                                        </div>
                                                        <div className="text-[9px] text-slate-400 font-normal">{item.code}</div>
                                                    </td>
                                                    <td className="p-4 text-center text-xs font-bold text-slate-500">{item.unit}</td>
                                                    <td className="p-4 text-center bg-blue-50/10">
                                                        <input 
                                                            type="number" 
                                                            min="0"
                                                            disabled={costingStage !== 'Issued'}
                                                            className={`w-full text-center p-2 rounded-lg text-sm font-bold outline-none ${costingStage === 'Issued' ? 'bg-white border border-blue-200 focus:ring-1 focus:ring-blue-500 text-slate-900 shadow-sm' : 'bg-transparent text-slate-600'}`}
                                                            value={item.issued_qty || ''}
                                                            placeholder="0"
                                                            onChange={e => updateSheetItem(item.inventory_id, 'issued_qty', parseInt(e.target.value) || 0)}
                                                        />
                                                    </td>
                                                    <td className="p-4 text-center bg-orange-50/10">
                                                        <input 
                                                            type="number" 
                                                            min="0"
                                                            disabled={costingStage !== 'Returned'}
                                                            className={`w-full text-center p-2 rounded-lg text-sm font-bold outline-none ${costingStage === 'Returned' ? 'bg-white border border-orange-200 focus:ring-1 focus:ring-orange-500 text-slate-900 shadow-sm' : 'bg-transparent text-slate-600'}`}
                                                            value={item.returned_qty || ''}
                                                            placeholder="0"
                                                            onChange={e => updateSheetItem(item.inventory_id, 'returned_qty', parseInt(e.target.value) || 0)}
                                                        />
                                                    </td>
                                                    <td className="p-4 text-center bg-slate-50 font-bold text-slate-800 text-sm border-l border-slate-100">
                                                        {consumed}
                                                    </td>
                                                    {costingStage === 'Final' && (
                                                        <td className="p-4 text-right font-bold text-emerald-600 text-sm bg-emerald-50/20">
                                                            {cost.toFixed(2)}
                                                        </td>
                                                    )}
                                                </tr>
                                            )
                                        })}
                                        {visibleSheetItems.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-slate-400 text-sm italic">
                                                    No materials found matching filter.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {costingStage === 'Final' && (
                                        <tfoot>
                                            <tr className="bg-slate-900 text-white">
                                                <td colSpan={5} className="p-4 text-right text-xs font-bold uppercase tracking-widest">Total Material Cost</td>
                                                <td className="p-4 text-right text-lg font-black">{calculateTotalCost().toFixed(2)} AED</td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>

                            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                                {costingStage === 'Final' && currentSheet && (
                                    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 w-full md:w-auto">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">Date of Packing:</label>
                                        <input 
                                            type="date" 
                                            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-1 focus:ring-blue-500"
                                            value={currentSheet.packing_date || ''}
                                            onChange={e => setCurrentSheet({...currentSheet, packing_date: e.target.value})}
                                        />
                                    </div>
                                )}
                                <div className="flex justify-end gap-3 w-full md:w-auto">
                                    {costingStage === 'Final' && (
                                        <>
                                            <button
                                                onClick={handleExportJobExcel}
                                                className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold uppercase text-[11px] tracking-widest hover:bg-emerald-700 transition-all shadow-lg"
                                            >
                                                <FileDown className="w-4 h-4" /> Export Excel
                                            </button>
                                            <button
                                                onClick={handleExportPDF}
                                                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold uppercase text-[11px] tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                                            >
                                                <Printer className="w-4 h-4" /> Save PDF
                                            </button>
                                        </>
                                    )}
                                    {costingStage === 'Final' && currentSheet?.status === 'Finalized' && !onlyFinalAssessment && (
                                        <button
                                            onClick={handleRedeductStock}
                                            disabled={isSaving}
                                            className="flex items-center gap-2 bg-white text-slate-600 border border-slate-200 px-6 py-3 rounded-xl font-bold uppercase text-[11px] tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                                        >
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                            Re-Deduct Stock
                                        </button>
                                    )}
                                    
                                    {((costingStage === 'Issued' && !onlyFinalAssessment) || (costingStage === 'Final' && !isReadOnly)) && currentSheet && (
                                        <button
                                            onClick={() => setShowDeleteSheetConfirm(true)}
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

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-600">
                <Trash2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 uppercase tracking-widest">Confirm Delete</h3>
                <p className="text-sm text-slate-400 font-medium mt-1">Are you sure you want to remove this item from the master list? This cannot be undone and will be removed from the database.</p>
              </div>
              <div className="flex w-full gap-3 mt-4">
                <button 
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => confirmDelete(itemToDelete)}
                  className="flex-1 py-3 bg-rose-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
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
              {/* Outsource Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <Truck className={`w-5 h-5 ${newItem.is_outsource ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div>
                    <p className="text-sm font-bold text-slate-800">Outsource Item</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Toggle for external services</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setNewItem({...newItem, is_outsource: !newItem.is_outsource})}
                  className={`w-12 h-6 rounded-full transition-all relative ${newItem.is_outsource ? 'bg-blue-600' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${newItem.is_outsource ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              {newItem.is_outsource ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Item Code</label>
                      <input 
                          type="text" 
                          className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" 
                          value={newItem.code} 
                          onChange={e => setNewItem({...newItem, code: e.target.value})} 
                          placeholder="OUT-..." 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Vendor Name</label>
                      <div className="relative">
                        <select 
                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none appearance-none" 
                            value={newItem.vendor_name} 
                            onChange={e => {
                              if (e.target.value === 'ADD_NEW') {
                                setShowAddVendorInput(true);
                              } else {
                                setNewItem({...newItem, vendor_name: e.target.value});
                              }
                            }}
                        >
                            <option value="">Select Vendor</option>
                            {vendors.map(v => <option key={v} value={v}>{v}</option>)}
                            <option value="ADD_NEW">+ Add New Vendor</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {showAddVendorInput && (
                    <div className="flex gap-2 animate-in zoom-in-95 duration-200">
                      <input 
                        type="text"
                        className="flex-1 px-4 py-2 bg-white border border-blue-200 rounded-lg text-sm font-medium focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="New Vendor Name"
                        value={newVendorName}
                        onChange={e => setNewVendorName(e.target.value)}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          if (newVendorName.trim()) {
                            setVendors([...vendors, newVendorName.trim()]);
                            setNewItem({...newItem, vendor_name: newVendorName.trim()});
                            setNewVendorName('');
                            setShowAddVendorInput(false);
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all"
                      >
                        Add
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowAddVendorInput(false)}
                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Type of Outsource</label>
                      <div className="relative">
                        <select 
                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none appearance-none" 
                            value={newItem.outsource_type} 
                            onChange={e => {
                                const val = e.target.value;
                                const desc = `${val}${newItem.location ? ` - ${newItem.location}` : ''}${newItem.vendor_name ? ` (${newItem.vendor_name})` : ''}`;
                                setNewItem({...newItem, outsource_type: val, description: desc});
                            }}
                        >
                            <option value="">Select Type</option>
                            {outsourceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Location</label>
                      <div className="relative">
                        <select 
                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none appearance-none" 
                            value={newItem.location} 
                            onChange={e => {
                                const val = e.target.value;
                                const desc = `${newItem.outsource_type}${val ? ` - ${val}` : ''}${newItem.vendor_name ? ` (${newItem.vendor_name})` : ''}`;
                                setNewItem({...newItem, location: val, description: desc});
                            }}
                        >
                            <option value="">Select Location</option>
                            {locations.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {newItem.outsource_type.startsWith('Truck') && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Schedule</label>
                      <div className="flex gap-4">
                        {['Per trip', 'Full Day'].map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                                const desc = `${newItem.outsource_type} - ${newItem.location} - ${s}${newItem.vendor_name ? ` (${newItem.vendor_name})` : ''}`;
                                setNewItem({...newItem, truck_schedule: s, description: desc});
                            }}
                            className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${newItem.truck_schedule === s ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

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
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Auto-Generated Description *</label>
                    <input 
                        required
                        type="text" 
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" 
                        value={newItem.description} 
                        onChange={e => setNewItem({...newItem, description: e.target.value})} 
                        placeholder="e.g. 3 Ton Truck - Dubai - Full Day" 
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Opening Stock</label>
                        <input 
                            type="number" 
                            min="0"
                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none" 
                            value={newItem.opening_stock} 
                            onChange={e => setNewItem({...newItem, opening_stock: parseInt(e.target.value) || 0})} 
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
                </div>
              )}

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
      {/* Price History Modal */}
      {showPriceModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Update Rate</h3>
                  <p className="text-xs text-slate-500">Set month-wise pricing</p>
                </div>
              </div>
              <button onClick={() => setShowPriceModal(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">New Rate (AED)</label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Effective Date</label>
                <input
                  type="date"
                  value={priceEffectiveDate}
                  onChange={(e) => setPriceEffectiveDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                />
              </div>

              {/* History List */}
              <div className="mt-6">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Price History</h4>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                    {priceHistory[showPriceModal]?.map((ph, idx) => (
                        <div key={ph.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-xs font-bold text-slate-700">AED {ph.price.toFixed(2)}</span>
                            <span className="text-[10px] text-slate-500">{ph.effective_date}</span>
                        </div>
                    )) || <p className="text-xs text-slate-400 italic">No history found</p>}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 flex gap-3">
              <button
                onClick={() => setShowPriceModal(null)}
                className="flex-1 px-4 py-3 text-slate-600 font-bold text-xs hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePrice}
                className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200 transition-all"
              >
                Update Rate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Purchase Modal */}
      {showPurchaseModal && selectedItemForPurchase && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8 border-b bg-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 uppercase tracking-widest">Add Purchase</h3>
                <p className="text-sm text-slate-400 font-medium">{selectedItemForPurchase.description}</p>
              </div>
              <button onClick={() => setShowPurchaseModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleAddPurchase} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                  <input 
                    type="number" 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    value={purchaseQty}
                    onChange={(e) => setPurchaseQty(e.target.value)}
                    placeholder="Qty"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-[10px] font-bold text-blue-900 uppercase tracking-widest">New Stock Level</p>
                    <p className="text-lg font-bold text-blue-600">
                      {selectedItemForPurchase.stock} + {parseInt(purchaseQty) || 0} = {selectedItemForPurchase.stock + (parseInt(purchaseQty) || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="flex-1 px-6 py-3 border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-all uppercase text-[11px] tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 uppercase text-[11px] tracking-widest"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Sheet Confirmation Modal */}
      {showDeleteSheetConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-rose-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Cost Sheet?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Are you sure you want to delete this cost sheet? This will <span className="font-bold text-rose-600">reverse all stock deductions</span> associated with this job.
              </p>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button
                onClick={() => setShowDeleteSheetConfirm(false)}
                className="flex-1 px-4 py-3 text-slate-600 font-bold text-xs hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSheet}
                className="flex-1 px-4 py-3 bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 rounded-xl shadow-lg shadow-rose-200 transition-all"
              >
                Delete & Revert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generic Confirmation Modal */}
      {genericConfirm && (
        <div className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Info className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{genericConfirm.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{genericConfirm.message}</p>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button
                onClick={() => setGenericConfirm(null)}
                className="flex-1 px-4 py-3 text-slate-600 font-bold text-xs hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={genericConfirm.onConfirm}
                className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200 transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-8 right-8 z-[120] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 duration-300 ${
          notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="text-sm font-bold">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 p-1 hover:bg-white/20 rounded-lg transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Inventory;
