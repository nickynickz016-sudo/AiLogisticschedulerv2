import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { supabase } from '../supabaseClient';
import { 
  Package, Plus, Trash2, Edit2, AlertTriangle, CheckCircle, 
  MapPin, User, ArrowRight, Shield, RefreshCw, Layers, Info, 
  Database, Eye, Clipboard, HelpCircle, X, Scale, Truck, Clock,
  Archive, FileSpreadsheet, Download
} from 'lucide-react';

interface GroupageTrackerProps {
  currentUser: UserProfile;
}

export interface ShipperEntry {
  id: string;
  shipper_name: string;
  volume_cbm: number;
  destination_address: string;
  destination_city: string;
  destination_country: string;
  created_by_id: string;
  created_by_name: string;
  created_at: string;
  status: 'Pending' | 'Grouped';
  container_booking_id?: string | null;
}

export interface ContainerBooking {
  id: string;
  container_type: string;
  capacity_cbm: number;
  destination_country: string;
  destination_city: string;
  created_by_id: string;
  created_by_name: string;
  created_at: string;
  status?: string;
  container_no?: string;
  estimated_departure_date?: string;
}

export const GroupageTracker: React.FC<GroupageTrackerProps> = ({ currentUser }) => {
  const [shipperEntries, setShipperEntries] = useState<ShipperEntry[]>([]);
  const [containerBookings, setContainerBookings] = useState<ContainerBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbMode, setDbMode] = useState<'supabase' | 'sandbox'>('supabase');
  const [dbErrorMsg, setDbErrorMsg] = useState<string | null>(null);

  // Authorization checks
  const isWI061938 = currentUser.employee_id === 'WI061938';
  const isAdmin = currentUser.role === UserRole.ADMIN;
  // Let admins and Ops Admin (Karthik) also have access for easy review and management.
  const isAuthorizedToBook = isWI061938 || isAdmin || currentUser.employee_id === 'OPS-ADMIN-01';

  // Forms
  const [shipperForm, setShipperForm] = useState({
    id: '',
    shipper_name: '',
    volume_cbm: '',
    destination_address: '',
    destination_city: '',
    destination_country: '',
  });
  const [showShipperModal, setShowShipperModal] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{ title: string; message: string; onConfirm: () => void; textConfirm?: string; textCancel?: string } | null>(null);

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, textConfirm = "Yes, Proceed", textCancel = "Cancel") => {
    setConfirmModalConfig({ title, message, onConfirm, textConfirm, textCancel });
  };

  // Container Booking Form
  const [containerType, setContainerType] = useState<string>('');
  const [destinationCountry, setDestinationCountry] = useState<string>('');
  const [destinationCity, setDestinationCity] = useState<string>('');
  const [selectedShipperIds, setSelectedShipperIds] = useState<string[]>([]);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [warningMessage, setWarningMessage] = useState<string>('');

  // Add More Shippers modal state
  const [selectedBookingForAdd, setSelectedBookingForAdd] = useState<ContainerBooking | null>(null);
  const [addShipperIds, setAddShipperIds] = useState<string[]>([]);

  // Shipper list directory filter state
  const [directoryFilter, setDirectoryFilter] = useState<string>('All');
  const [showGroupedArchive, setShowGroupedArchive] = useState<boolean>(false);

  // Dispatch state
  const [dispatchingBookingId, setDispatchingBookingId] = useState<string | null>(null);
  const [dispatchContainerNo, setDispatchContainerNo] = useState<string>('');
  const [dispatchETD, setDispatchETD] = useState<string>('');

  // 1 CBM to Cubic Feet helper
  const cbmToCft = (cbm: number) => Math.round(cbm * 35.3147 * 10) / 10;

  // Calculate container capacity
  const getContainerCapacity = (type: string): number => {
    if (type.includes('20ft')) return 30;
    if (type.includes('40ft HQ') || type.includes('70 CBM')) return 70;
    if (type.includes('40ft')) return 60;
    return 0;
  };

  const selectedContainerCapacity = getContainerCapacity(containerType);

  // Fetch function
  const fetchData = async () => {
    setLoading(true);
    setDbErrorMsg(null);
    try {
      if (dbMode === 'supabase') {
        // Fetch Shippers
        const { data: shipperData, error: shipperError } = await supabase
          .from('groupage_shipper_entries')
          .select('*')
          .order('created_at', { ascending: false });

        // Fetch Container Bookings
        const { data: bookingData, error: bookingError } = await supabase
          .from('groupage_container_bookings')
          .select('*')
          .order('created_at', { ascending: false });

        if (shipperError || bookingError) {
          const errMsg = shipperError?.message || bookingError?.message || 'Relation does not exist';
          if (errMsg.includes('does not exist') || errMsg.includes('not found')) {
            console.warn('Supabase tables for Groupage Tracker not found. Switched to localStorage sandbox mode.');
            setDbMode('sandbox');
            loadSandboxData();
          } else {
            setDbErrorMsg(errMsg);
          }
        } else {
          setShipperEntries(shipperData || []);
          setContainerBookings(bookingData || []);
        }
      } else {
        loadSandboxData();
      }
    } catch (err: any) {
      console.error('Groupage fetch error:', err);
      setDbMode('sandbox');
      loadSandboxData();
    } finally {
      setLoading(false);
    }
  };

  const loadSandboxData = () => {
    const localShippers = localStorage.getItem('writer_groupage_shippers');
    const localBookings = localStorage.getItem('writer_groupage_bookings');
    
    // Seed default cargo entries if empty to populate the UI magnificently
    if (!localShippers) {
      const defaultShippers: ShipperEntry[] = [
        {
          id: 'CARGO-101',
          shipper_name: 'John Al-Maktoum',
          volume_cbm: 12.5,
          destination_address: 'Al Fahidi St, Bur Dubai',
          destination_city: 'Dubai',
          destination_country: 'United Arab Emirates',
          created_by_id: 'b2c3d4e5-f6a7-8901-2345-67890abcdef1',
          created_by_name: 'Roxanne',
          created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
          status: 'Pending',
        },
        {
          id: 'CARGO-102',
          shipper_name: 'Stark Logistics',
          volume_cbm: 24.0,
          destination_address: '75 Wall Street, Manhattan',
          destination_city: 'New York',
          destination_country: 'United States',
          created_by_id: 'c3d4e5f6-a7b8-9012-3456-7890abcdef12',
          created_by_name: 'Poonam',
          created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
          status: 'Pending',
        },
        {
          id: 'CARGO-103',
          shipper_name: 'Ahmad Al-Nahyan',
          volume_cbm: 8.2,
          destination_address: 'Khalifa City A',
          destination_city: 'Abu Dhabi',
          destination_country: 'United Arab Emirates',
          created_by_id: 'd4e5f6a7-b8c9-0123-4567-890abcdef123',
          created_by_name: 'Divya',
          created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
          status: 'Pending',
        }
      ];
      localStorage.setItem('writer_groupage_shippers', JSON.stringify(defaultShippers));
      setShipperEntries(defaultShippers);
    } else {
      setShipperEntries(JSON.parse(localShippers));
    }

    if (!localBookings) {
      const defaultBookings: ContainerBooking[] = [
        {
          id: 'BOOK-001',
          container_type: '20ft Container - 30 CBM',
          capacity_cbm: 30,
          destination_country: 'United Kingdom',
          destination_city: 'London',
          created_by_id: 'wi061938-f6a7-8901-2345-67890abcdef1',
          created_by_name: 'Groupage Specialist (WI061938)',
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('writer_groupage_bookings', JSON.stringify(defaultBookings));
      setContainerBookings(defaultBookings);
    } else {
      setContainerBookings(JSON.parse(localBookings));
    }
  };

  useEffect(() => {
    fetchData();
  }, [dbMode]);

  // Handle addition or editing of shipper entries
  const handleShipperSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipperForm.shipper_name || !shipperForm.volume_cbm || !shipperForm.destination_address || !shipperForm.destination_city || !shipperForm.destination_country) {
      alert('All fields are mandatory.');
      return;
    }

    const volumeNum = parseFloat(shipperForm.volume_cbm);
    if (isNaN(volumeNum) || volumeNum <= 0) {
      alert('Volume must be a positive number');
      return;
    }

    const itemData = {
      id: editingEntryId || `SHI-${Date.now()}`,
      shipper_name: shipperForm.shipper_name,
      volume_cbm: volumeNum,
      destination_address: shipperForm.destination_address,
      destination_city: shipperForm.destination_city,
      destination_country: shipperForm.destination_country,
      created_by_id: currentUser.id,
      created_by_name: currentUser.name || 'Unknown User',
      created_at: new Date().toISOString(),
      status: 'Pending' as const,
      container_booking_id: null
    };

    try {
      if (dbMode === 'supabase') {
        if (editingEntryId) {
          // Verify ownership (Admin can edit any, user can only edit their own)
          const target = shipperEntries.find(s => s.id === editingEntryId);
          if (target && target.created_by_id !== currentUser.id && !isAdmin) {
             alert("Access Denied: You cannot modify details recorded by other users.");
             return;
          }

          const { error } = await supabase
            .from('groupage_shipper_entries')
            .update({
              shipper_name: shipperForm.shipper_name,
              volume_cbm: volumeNum,
              destination_address: shipperForm.destination_address,
              destination_city: shipperForm.destination_city,
              destination_country: shipperForm.destination_country,
            })
            .eq('id', editingEntryId);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('groupage_shipper_entries')
            .insert([itemData]);
          if (error) throw error;
        }
      } else {
        // Local sandbox
        let updatedShippers = [...shipperEntries];
        if (editingEntryId) {
          const target = shipperEntries.find(s => s.id === editingEntryId);
          if (target && target.created_by_id !== currentUser.id && !isAdmin) {
             alert("Access Denied: You cannot modify details recorded by other users.");
             return;
          }
          updatedShippers = updatedShippers.map(item => 
            item.id === editingEntryId 
              ? { ...item, ...itemData, id: item.id, created_by_id: item.created_by_id, created_by_name: item.created_by_name, status: item.status, container_booking_id: item.container_booking_id } 
              : item
          );
        } else {
          updatedShippers.unshift(itemData);
        }
        localStorage.setItem('writer_groupage_shippers', JSON.stringify(updatedShippers));
        setShipperEntries(updatedShippers);
      }
      
      setShowShipperModal(false);
      setEditingEntryId(null);
      setShipperForm({
        id: '',
        shipper_name: '',
        volume_cbm: '',
        destination_address: '',
        destination_city: '',
        destination_country: '',
      });
      fetchData();
    } catch (err: any) {
      alert(`Error saving shipper entry: ${err.message}`);
    }
  };

  const handleEditShipper = (entry: ShipperEntry) => {
    if (entry.created_by_id !== currentUser.id && !isAdmin) {
      alert("Access Denied: You cannot edit details recorded by other users.");
      return;
    }
    if (entry.status === 'Grouped') {
      alert("This shipment cannot be edited because it is already booked/packed in a container consolidation.");
      return;
    }
    setEditingEntryId(entry.id);
    setShipperForm({
      id: entry.id || '',
      shipper_name: entry.shipper_name || '',
      volume_cbm: (entry.volume_cbm !== undefined && entry.volume_cbm !== null) ? entry.volume_cbm.toString() : '',
      destination_address: entry.destination_address || '',
      destination_city: entry.destination_city || '',
      destination_country: entry.destination_country || '',
    });
    setShowShipperModal(true);
  };

  const handleDeleteShipper = async (id: string) => {
    const target = shipperEntries.find(s => s.id === id);
    if (!target) return;

    if (target.created_by_id !== currentUser.id && !isAdmin) {
      alert("Access Denied: Only the author of the entries can delete details.");
      return;
    }

    if (target.status === 'Grouped') {
      alert("Cannot delete a cargo item that is already grouped into a locked container.");
      return;
    }

    triggerConfirm(
      "Delete Shipper Cargo",
      "Are you sure you want to delete this shipper cargo entry?",
      async () => {
        try {
          if (dbMode === 'supabase') {
            const { error } = await supabase
              .from('groupage_shipper_entries')
              .delete()
              .eq('id', id);
            if (error) throw error;
          } else {
            const updated = shipperEntries.filter(s => s.id !== id);
            localStorage.setItem('writer_groupage_shippers', JSON.stringify(updated));
            setShipperEntries(updated);
          }
          fetchData();
        } catch (err: any) {
          alert(`Error deleting: ${err.message}`);
        }
      }
    );
  };

  // Monitor total volume of selected shipper entries when booking
  const totalSelectedVolume = shipperEntries
    .filter(shipper => selectedShipperIds.includes(shipper.id))
    .reduce((sum, shipper) => sum + shipper.volume_cbm, 0);

  // Re-evaluate limits and trigger warning
  useEffect(() => {
    if (!containerType) {
      setShowWarning(false);
      return;
    }

    const currentCap = getContainerCapacity(containerType);

    // 1. If total exceeds current container capacity
    // 2. "if the WI061938 this id choose above the 70 cbm a warning will pop saying Volume will not fit"
    if (totalSelectedVolume > 70) {
      setShowWarning(true);
      setWarningMessage(`Volume will not fit: The selected cargo entries (${totalSelectedVolume} CBM) exceed the absolute structural container limit of 70 CBM by a substantial margin!`);
    } else if (totalSelectedVolume > currentCap) {
      setShowWarning(true);
      setWarningMessage(`Volume will not fit: The total selected volume of ${totalSelectedVolume} CBM exceeds the chosen ${containerType}'s capacity limit of ${currentCap} CBM! Select a higher-capacity container or remove some shipments.`);
    } else {
      setShowWarning(false);
    }
  }, [totalSelectedVolume, containerType]);

  // Handle Container Booking Creation by WI061938
  const handleCreateContainerBooking = async () => {
    if (!isAuthorizedToBook) {
      alert("Access Denied: Only the Groupage Specialist (WI061938) is authorized to book consolidations.");
      return;
    }

    if (!containerType || !destinationCountry || !destinationCity) {
      alert("Please select a container type, and specify both Destination Country and City.");
      return;
    }

    if (selectedShipperIds.length === 0) {
      alert("Please select at least one available shipper entry to group in this container.");
      return;
    }

    const currentCapacityLimit = getContainerCapacity(containerType);
    if (totalSelectedVolume > currentCapacityLimit) {
      alert("Booking Refused: Selected volume exceeds container capacity. Please resize cargo.");
      return;
    }

    const bookingId = `BK-${Date.now().toString().slice(-6)}`;
    const newBooking: ContainerBooking = {
      id: bookingId,
      container_type: containerType,
      capacity_cbm: currentCapacityLimit,
      destination_country: destinationCountry,
      destination_city: destinationCity,
      created_by_id: currentUser.id,
      created_by_name: currentUser.name || 'Specialist WI061938',
      created_at: new Date().toISOString()
    };

    try {
      if (dbMode === 'supabase') {
        const { error: bookingErr } = await supabase
          .from('groupage_container_bookings')
          .insert([newBooking]);

        if (bookingErr) throw bookingErr;

        // Update selected shipper entries
        const { error: shipperErr } = await supabase
          .from('groupage_shipper_entries')
          .update({
            status: 'Grouped',
            container_booking_id: bookingId
          })
          .in('id', selectedShipperIds);

        if (shipperErr) throw shipperErr;
      } else {
        // Sandbox mode
        const updatedBookings = [newBooking, ...containerBookings];
        const updatedShippers = shipperEntries.map(s => 
          selectedShipperIds.includes(s.id) 
            ? { ...s, status: 'Grouped' as const, container_booking_id: bookingId } 
            : s
        );

        localStorage.setItem('writer_groupage_bookings', JSON.stringify(updatedBookings));
        localStorage.setItem('writer_groupage_shippers', JSON.stringify(updatedShippers));
        
        setContainerBookings(updatedBookings);
        setShipperEntries(updatedShippers);
      }

      // Reset state
      setContainerType('');
      setDestinationCity('');
      setDestinationCountry('');
      setSelectedShipperIds([]);
      setShowWarning(false);
      alert(`Success! Container consolidated successfully with ${selectedShipperIds.length} shipper groups, total volume ${totalSelectedVolume} CBM.`);
      fetchData();
    } catch (err: any) {
      alert(`Error creating container booking: ${err.message}`);
    }
  };

  const toggleShipperSelection = (id: string, entryVol: number) => {
    if (selectedShipperIds.includes(id)) {
      setSelectedShipperIds(prev => prev.filter(i => i !== id));
    } else {
      setSelectedShipperIds(prev => [...prev, id]);
    }
  };

  // Undo / Disband container booking
  const handleDisbandBooking = async (booking: ContainerBooking) => {
    if (!isAuthorizedToBook) {
      alert("Access Denied: Only authorized coordinators can disband bookings.");
      return;
    }

    triggerConfirm(
      `Disband Booking ${booking.id}`,
      `Are you sure you want to disband booking ${booking.id} and return all grouped shippers back to the pending list?`,
      async () => {
        try {
          if (dbMode === 'supabase') {
            // Update Shippers to Pending
            const { error: shipperUpdateErr } = await supabase
              .from('groupage_shipper_entries')
              .update({ status: 'Pending', container_booking_id: null })
              .eq('container_booking_id', booking.id);

            if (shipperUpdateErr) throw shipperUpdateErr;

            // Delete Booking
            const { error: deleteErr } = await supabase
              .from('groupage_container_bookings')
              .delete()
              .eq('id', booking.id);

            if (deleteErr) throw deleteErr;
          } else {
            // Sandbox
            const updatedBookings = containerBookings.filter(b => b.id !== booking.id);
            const updatedShippers = shipperEntries.map(s => 
              s.container_booking_id === booking.id 
                ? { ...s, status: 'Pending' as const, container_booking_id: null } 
                : s
            );

            localStorage.setItem('writer_groupage_bookings', JSON.stringify(updatedBookings));
            localStorage.setItem('writer_groupage_shippers', JSON.stringify(updatedShippers));

            setContainerBookings(updatedBookings);
            setShipperEntries(updatedShippers);
          }
          alert(`Booking ${booking.id} disbanded successfully.`);
          fetchData();
        } catch (err: any) {
          alert(`Error disbanding: ${err.message}`);
        }
      },
      "Disband Block",
      "Cancel"
    );
  };

  // Add More Shippers helper calculations and handler
  const getSelectedBookingUtilizedVolume = (booking: ContainerBooking): number => {
    return shipperEntries
      .filter(s => s.container_booking_id === booking.id)
      .reduce((sum, s) => sum + s.volume_cbm, 0);
  };

  const selectedBookingUtilizedVolume = selectedBookingForAdd ? getSelectedBookingUtilizedVolume(selectedBookingForAdd) : 0;
  const selectedBookingRemainingCapacity = selectedBookingForAdd ? (selectedBookingForAdd.capacity_cbm - selectedBookingUtilizedVolume) : 0;

  const totalAdditionalVolume = shipperEntries
    .filter(s => addShipperIds.includes(s.id))
    .reduce((sum, s) => sum + s.volume_cbm, 0);

  const isAddVolumeOverflown = selectedBookingForAdd ? (selectedBookingUtilizedVolume + totalAdditionalVolume > selectedBookingForAdd.capacity_cbm) : false;

  const toggleAddShipperSelection = (id: string) => {
    if (addShipperIds.includes(id)) {
      setAddShipperIds(prev => prev.filter(i => i !== id));
    } else {
      setAddShipperIds(prev => [...prev, id]);
    }
  };

  const handleAddShippersToBooking = async () => {
    if (!selectedBookingForAdd) return;
    if (addShipperIds.length === 0) {
      alert("Please select at least one shipper cargo entry to add.");
      return;
    }

    if (isAddVolumeOverflown) {
      alert("Booking Refused: Total volume exceeds coordinates of chosen container capacity.");
      return;
    }

    try {
      if (dbMode === 'supabase') {
        const { error } = await supabase
          .from('groupage_shipper_entries')
          .update({
            status: 'Grouped',
            container_booking_id: selectedBookingForAdd.id
          })
          .in('id', addShipperIds);

        if (error) throw error;
      } else {
        const updatedShippers = shipperEntries.map(s => 
          addShipperIds.includes(s.id) 
            ? { ...s, status: 'Grouped' as const, container_booking_id: selectedBookingForAdd.id } 
            : s
        );
        localStorage.setItem('writer_groupage_shippers', JSON.stringify(updatedShippers));
        setShipperEntries(updatedShippers);
      }

      alert(`Success! Embedded ${addShipperIds.length} cargo groups into container ${selectedBookingForAdd.id}.`);
      setSelectedBookingForAdd(null);
      setAddShipperIds([]);
      fetchData();
    } catch (err: any) {
      alert(`Error appending cargo details: ${err.message}`);
    }
  };

  const handleDispatchBooking = async (bookingId: string, containerNo: string, tempETD: string) => {
    if (!containerNo || !tempETD) {
      alert("Please provide both Container No. and Estimated Departure Date.");
      return;
    }

    try {
      if (dbMode === 'supabase') {
        const { error } = await supabase
          .from('groupage_container_bookings')
          .update({
            status: 'Dispatched',
            container_no: containerNo,
            estimated_departure_date: tempETD
          })
          .eq('id', bookingId);
        
        if (error) {
          console.warn("Supabase columns might be missing or permission error. Storing dispatch details in local hybrid store.", error);
        }
      }

      // Always save to standard local dispatches so sandbox is kept perfectly in sync and handles dynamic column fallback
      const localDispatches = JSON.parse(localStorage.getItem('writer_groupage_local_dispatches') || '{}');
      localDispatches[bookingId] = {
        status: 'Dispatched',
        container_no: containerNo,
        estimated_departure_date: tempETD
      };
      localStorage.setItem('writer_groupage_local_dispatches', JSON.stringify(localDispatches));

      // If sandbox mode, also save the general booking list to local storage
      if (dbMode === 'sandbox') {
        const updatedBookings = containerBookings.map(b => 
          b.id === bookingId 
            ? { ...b, status: 'Dispatched', container_no: containerNo, estimated_departure_date: tempETD }
            : b
        );
        localStorage.setItem('writer_groupage_bookings', JSON.stringify(updatedBookings));
        setContainerBookings(updatedBookings);
      }

      alert(`Booking ${bookingId} has been successfully dispatched!`);
      setDispatchingBookingId(null);
      setDispatchContainerNo('');
      setDispatchETD('');
      fetchData();
    } catch (err: any) {
      alert(`Error dispatching container booking: ${err.message}`);
    }
  };

  const exportBookingToExcel = (booking?: ContainerBooking) => {
    // Unicode BOM for Excel UTF-8 display compatibility
    let csvContent = "\uFEFF";
    csvContent += "Booking ID,Container Type,Capacity (CBM),Destination Country,Destination City,Status,Container No,Estimated Departure Date,Dispatcher,Shipper Name,Shipper Volume (CBM),Destination Address\n";
    
    const bookingsToExport = booking ? [booking] : containerBookings;
    
    if (bookingsToExport.length === 0) {
      alert("No active authorized container bookings available to export.");
      return;
    }
    
    bookingsToExport.forEach(b => {
      const members = shipperEntries.filter(s => s.container_booking_id === b.id);
      
      const localDispatches = JSON.parse(localStorage.getItem('writer_groupage_local_dispatches') || '{}');
      const dispatchDetail = localDispatches[b.id];
      const status = b.status || dispatchDetail?.status || 'Pending';
      const containerNo = b.container_no || dispatchDetail?.container_no || 'N/A';
      const etd = b.estimated_departure_date || dispatchDetail?.estimated_departure_date || 'N/A';
      
      if (members.length === 0) {
        csvContent += `"${b.id}","${b.container_type}",${b.capacity_cbm},"${b.destination_country}","${b.destination_city}","${status}","${containerNo}","${etd}","${b.created_by_name}","N/A",0,"N/A"\n`;
      } else {
        members.forEach(m => {
          csvContent += `"${b.id}","${b.container_type}",${b.capacity_cbm},"${b.destination_country}","${b.destination_city}","${status}","${containerNo}","${etd}","${b.created_by_name}","${m.shipper_name}",${m.volume_cbm},"${m.destination_address.replace(/"/g, '""').replace(/\n/g, ' ')}"\n`;
        });
      }
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const fileName = booking 
      ? `Container-Manifest-${booking.id}.csv` 
      : `Groupage-Authorized-Bookings-Report.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8 space-y-6">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <span className="text-xs font-black uppercase text-indigo-600 tracking-wider">Operational Consolidation</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mt-1">Groupage Tracker</h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Consolidate shipper entries into unified shipping containers and optimize spatial cargo volume.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* DB mode toggle badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold ${
            dbMode === 'supabase' 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
              : 'bg-amber-50 border-amber-100 text-amber-700'
          }`}>
            <Database className="w-3.5 h-3.5" />
            <span>{dbMode === 'supabase' ? 'Supabase Synchronized' : 'Sandbox (LocalStorage) Mode'}</span>
          </div>

          <button 
            onClick={() => {
              if (dbMode === 'supabase') {
                setDbMode('sandbox');
              } else {
                setDbMode('supabase');
              }
            }}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
            title="Toggle Storage Mode"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button 
            onClick={() => {
              setEditingEntryId(null);
              setShipperForm({
                id: '',
                shipper_name: '',
                volume_cbm: '',
                destination_address: '',
                destination_city: '',
                destination_country: '',
              });
              setShowShipperModal(true);
            }}
            className="px-4 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-2xl text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-slate-200"
          >
            <Plus className="w-4 h-4" />
            <span>Record Consignee Cargo</span>
          </button>
        </div>
      </div>

      {/* Supabase migration notice if sandbox mode */}
      {dbMode === 'sandbox' && (
        <div className="bg-amber-50/70 border border-amber-100 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-amber-800 uppercase tracking-widest leading-none">DATABASE TABLES WARNING</h5>
              <p className="text-[11px] text-amber-600 mt-1 font-semibold">
                Supabase SQL tables for the Groupage Tracker were not detected. We fell back to isolated local storage. Run SQL in Supabase console to synchronize live.
              </p>
            </div>
          </div>
          <div className="text-[10px] px-3 py-1.5 bg-amber-100/60 font-bold rounded-lg text-amber-800 uppercase tracking-wider shrink-0 select-all">
            schema.sql migration applied locally
          </div>
        </div>
      )}

      {/* GRID LAYOUT FOR ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* SHIPPER CARGO ENTRIES PANEL (COL 7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            {(() => {
              const filteredShippers = shipperEntries.filter(s => {
                // If showGroupedArchive is active, show only Grouped. If inactive, show only Pending (non-Grouped)
                const isGrouped = s.status === 'Grouped';
                if (showGroupedArchive) {
                  if (!isGrouped) return false;
                } else {
                  if (isGrouped) return false;
                }

                if (directoryFilter === 'All') return true;
                return s.destination_country === directoryFilter;
              });

              const pendingCount = shipperEntries.filter(s => s.status !== 'Grouped').length;
              const archivedCount = shipperEntries.filter(s => s.status === 'Grouped').length;

              return (
                <>
                  <div className="flex justify-between items-center border-b pb-4 mb-4 flex-wrap gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                        {showGroupedArchive ? "Shipper Cargo Archive" : "Shipper Cargo Directory"}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        {showGroupedArchive 
                          ? "Review of customer payloads consolidated into shipping lines." 
                          : "Below listings represent individual customer payloads prior to consolidation."}
                      </p>
                    </div>
                    <span className="text-[10px] font-black font-mono text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full uppercase">
                      {showGroupedArchive ? `${filteredShippers.length} Archived` : `${filteredShippers.length} Active`}
                    </span>
                  </div>

                  {/* Dynamic Tab Switcher for Archive */}
                  <div className="flex gap-2 mb-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowGroupedArchive(false)}
                      className={`flex-1 py-2 px-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                        !showGroupedArchive 
                          ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-black/5' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Package className="w-3.5 h-3.5 text-indigo-600" />
                      Cargo Units ({pendingCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowGroupedArchive(true)}
                      className={`flex-1 py-2 px-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                        showGroupedArchive 
                          ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-black/5' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Archive className="w-3.5 h-3.5 text-rose-500" />
                      Archive ({archivedCount})
                    </button>
                  </div>

                  {/* Destination Country Filter Dropdown */}
                  <div className="mb-4 p-3 bg-slate-50/55 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Filter by Destination:</span>
                    <select
                      value={directoryFilter}
                      onChange={(e) => setDirectoryFilter(e.target.value)}
                      className="text-[11px] font-extrabold border bg-white rounded-xl py-1.5 px-3 outline-none text-slate-755 focus:ring-1 focus:ring-indigo-500 shadow-sm"
                    >
                      <option value="All">All Destinations</option>
                      <option value="United Kingdom - Groupage">United Kingdom - Groupage</option>
                      <option value="United States - Groupage">United States - Groupage</option>
                      <option value="Canada - Groupage">Canada - Groupage</option>
                      <option value="India - Groupage">India - Groupage</option>
                      <option value="Asia - Groupage">Asia - Groupage</option>
                      <option value="Europe - Groupage">Europe - Groupage</option>
                    </select>
                  </div>

                  {loading ? (
                    <div className="py-12 flex justify-center items-center gap-2 text-slate-400 font-medium text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Loading records...
                    </div>
                  ) : shipperEntries.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                      No shipper cargo entries recorded. Access 'Record Consignee Cargo' at top right to register entry items.
                    </div>
                  ) : filteredShippers.length === 0 ? (
                    <div className="py-12 text-center text-slate-405 text-xs font-semibold bg-slate-50/50 rounded-2xl border border-dashed">
                      {showGroupedArchive 
                        ? `No consolidated archive units match directory filter "${directoryFilter}".` 
                        : `No active cargo units match directory filter "${directoryFilter}".`}
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                      {filteredShippers.map((shipper) => {
                        const isAuthor = shipper.created_by_id === currentUser.id;
                        const canManage = isAuthor || isAdmin;
                        
                        return (
                          <div 
                            key={shipper.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              shipper.status === 'Grouped' 
                                ? 'bg-slate-50 border-slate-200' 
                                : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-extrabold text-[#E31E24] text-xs uppercase tracking-tight">{shipper.shipper_name}</h5>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                    shipper.status === 'Grouped' 
                                      ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                                      : 'bg-indigo-50 text-indigo-700'
                                  }`}>
                                    {shipper.status}
                                  </span>
                                  {shipper.container_booking_id && (
                                    <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                      Container: {shipper.container_booking_id}
                                    </span>
                                  )}
                                </div>

                                <div className="font-mono text-[10px] text-slate-500 flex flex-wrap gap-x-4">
                                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {shipper.destination_city}, {shipper.destination_country}</span>
                                  <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" /> Registered by: {shipper.created_by_name}</span>
                                </div>

                                <p className="text-[11px] font-semibold text-slate-500 italic mt-0.5">
                                  Address: {shipper.destination_address}
                                </p>
                              </div>

                              <div className="flex flex-col items-end gap-2 shrink-0">
                                <div className="bg-slate-900 text-white rounded-xl px-2.5 py-1 text-right select-all">
                                  <p className="text-xs font-black tracking-tight leading-none">{shipper.volume_cbm} CBM</p>
                                  <span className="text-[8px] font-medium text-slate-400 tracking-tight block mt-0.5">{cbmToCft(shipper.volume_cbm)} CFT</span>
                                </div>

                                {/* Controls (Author-only restrict) */}
                                <div className="flex gap-1.5 pt-1">
                                  {canManage ? (
                                    <>
                                      <button 
                                        onClick={() => handleEditShipper(shipper)}
                                        className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-all"
                                        title="Edit Entry"
                                        disabled={shipper.status === 'Grouped'}
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteShipper(shipper.id)}
                                        className="p-1 hover:bg-slate-100 text-red-400 hover:text-red-700 rounded-lg transition-all"
                                        title="Delete Entry"
                                        disabled={shipper.status === 'Grouped'}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[9px] text-slate-300 font-bold border border-slate-100 px-2 py-0.5 bg-slate-50 rounded-md select-none shrink-0 inline-flex items-center gap-1">
                                      <Shield className="w-2.5 h-2.5" /> Read Only
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* CONTAINER CONSOLIDATOR (COL 5) - Authorized dispatcher ONLY */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col h-full relative overflow-hidden">
            {/* Dispatcher Authorization Header */}
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-blue-600" />
                  Consolidation Board
                </h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Exclusive workspace for WI061938 and Admins</p>
              </div>

              <div className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                isAuthorizedToBook 
                  ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                  : 'bg-red-50 text-red-600 border border-red-100'
              }`}>
                {isAuthorizedToBook ? 'Authorized Dispatcher' : 'Unauthorized Lock'}
              </div>
            </div>

            {/* Unauthorized view */}
            {!isAuthorizedToBook ? (
              <div className="py-12 px-4 text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <h5 className="text-[11px] font-black uppercase tracking-widest text-[#E31E24]">Access Restricted</h5>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  You are logged into Ops Central as standard user <span className="underline font-bold text-slate-800">{currentUser.name}</span>. 
                  Only dispatch identifier <span className="font-extrabold text-slate-950 block select-all">Employee ID: WI061938</span> possesses authorization to organize container bookings.
                </p>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-mono text-left text-slate-600 mt-4 leading-relaxed">
                  🔐 Login with username <strong className="text-slate-950 font-bold">WI061938</strong> and password <strong className="text-slate-950 font-bold">Writer@123</strong> in order to gain access to Container bookings.
                </div>
              </div>
            ) : (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  {/* Select Container Type */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Choice Container Unit *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: '20ft Unit', desc: '30 CBM', value: '20ft Container - 30 CBM' },
                        { label: '40ft Standard', desc: '60 CBM', value: '40ft Container - 60 CBM' },
                        { label: '40ft HQ', desc: '70 CBM', value: '40ft HQ container - 70 CBM' },
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setContainerType(item.value)}
                          className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${
                            containerType === item.value 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                          }`}
                        >
                          <span className="text-[10px] font-black uppercase tracking-tight block leading-none">{item.label}</span>
                          <span className={`text-[9px] mt-1 font-bold ${containerType === item.value ? 'text-blue-100' : 'text-slate-400'}`}>{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Destination fields, visible if container type selected */}
                  {containerType && (
                    <div className="grid grid-cols-2 gap-3 pt-3 animate-in fade-in-50 duration-200">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dest. Country *</label>
                        <select 
                          value={destinationCountry}
                          onChange={(e) => setDestinationCountry(e.target.value)}
                          className="w-full text-xs font-bold border rounded-xl p-3 bg-slate-50 outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                        >
                          <option value="">-- Choose Country --</option>
                          <option value="United Kingdom - Groupage">United Kingdom - Groupage</option>
                          <option value="United States - Groupage">United States - Groupage</option>
                          <option value="Canada - Groupage">Canada - Groupage</option>
                          <option value="India - Groupage">India - Groupage</option>
                          <option value="Asia - Groupage">Asia - Groupage</option>
                          <option value="Europe - Groupage">Europe - Groupage</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dest. City *</label>
                        <input 
                          type="text" 
                          placeholder="e.g. London"
                          value={destinationCity}
                          onChange={(e) => setDestinationCity(e.target.value)}
                          className="w-full text-xs font-bold border rounded-xl p-3 bg-slate-50 outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Consolidate from other user lists */}
                  <div className="pt-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Select cargo components *</label>
                      <span className="text-[9px] font-mono font-bold text-slate-400">Match pending files</span>
                    </div>

                    <div className="border rounded-2xl p-2 bg-slate-50 max-h-[160px] overflow-y-auto space-y-1">
                      {shipperEntries.filter(s => s.status === 'Pending').length === 0 ? (
                        <div className="text-[10px] font-semibold text-slate-400 text-center py-6">
                          No pending shippers available to group. Create shipper cargo files first in the panel on the left.
                        </div>
                      ) : (
                        shipperEntries.filter(s => s.status === 'Pending').map((shipper) => {
                          const isSelected = selectedShipperIds.includes(shipper.id);
                          
                          return (
                            <button
                              key={shipper.id}
                              onClick={() => toggleShipperSelection(shipper.id, shipper.volume_cbm)}
                              className={`w-full p-2.5 rounded-xl border flex justify-between items-center text-left text-[11px] font-bold transition-all ${
                                isSelected 
                                  ? 'bg-blue-50 border-blue-200 text-blue-900 ring-1 ring-blue-500' 
                                  : 'bg-white border-slate-150 hover:border-slate-300 text-slate-700'
                              }`}
                            >
                              <div>
                                <p className="font-extrabold text-[#E31E24] text-[10px] leading-tight select-none">{shipper.shipper_name}</p>
                                <span className="text-[8px] font-medium text-slate-400 block mt-0.5 select-none">{shipper.destination_city}, {shipper.destination_country}</span>
                              </div>
                              <span className="font-mono text-[9px] bg-slate-900 text-white font-bold rounded px-1.5 py-0.5 select-none shrink-0 text-right">
                                {shipper.volume_cbm} CBM
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* CONTAINER VISUALIZATION THERMOMETER */}
                  {containerType && (
                    <div className="pt-4 space-y-1.5 animate-in slide-in-from-bottom-2 duration-200">
                      <div className="flex justify-between items-end text-[10px] select-none">
                        <span className="font-black text-slate-600 uppercase tracking-tight">Utilized Cargo Volume</span>
                        <span className={`font-black font-mono ${totalSelectedVolume > selectedContainerCapacity ? 'text-red-500' : 'text-[#E31E24]'}`}>
                          {totalSelectedVolume} / {selectedContainerCapacity} CBM ({selectedContainerCapacity ? Math.round((totalSelectedVolume / selectedContainerCapacity) * 100) : 0}%)
                        </span>
                      </div>
                      
                      {/* Bar fill represent */}
                      <div className="h-4 bg-slate-100 rounded-full overflow-hidden border p-0.5 relative flex items-center">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            totalSelectedVolume > selectedContainerCapacity 
                              ? 'bg-red-500 animate-pulse' 
                              : 'bg-indigo-600'
                          }`}
                          style={{ width: `${Math.min(100, selectedContainerCapacity ? (totalSelectedVolume / selectedContainerCapacity) * 100 : 0)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* CUSTOM AND DISTINCT PROFESSIONAL WARNING DISPLAY */}
                  {showWarning && (
                    <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-red-50 to-amber-50 border-2 border-red-500 border-dashed text-red-900 animate-pulse flex gap-3 shadow-md">
                      <AlertTriangle className="w-8 h-8 text-red-600 shrink-0 self-start mt-0.5" />
                      <div className="space-y-1">
                        <h5 className="text-[11px] font-black uppercase tracking-wider text-red-700 leading-none flex items-center gap-1">
                          <Scale className="w-3.5 h-3.5" />
                          Consolidation Alert: OVERLOAD
                        </h5>
                        <p className="text-[10px] font-semibold text-red-500 leading-relaxed">
                          {warningMessage}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6">
                  <button
                    onClick={handleCreateContainerBooking}
                    disabled={!containerType || !destinationCountry || !destinationCity || selectedShipperIds.length === 0 || totalSelectedVolume > selectedContainerCapacity}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 font-extrabold uppercase text-[11px] tracking-widest text-white disabled:text-slate-400 rounded-2xl transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Authorize & Group Booking</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* COMPLETED CONTAINER BOOKINGS ARCHIVE */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
        <div className="border-b pb-4 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Active Groupage Containers</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">List of consolidated containers dispatching from UAE ports.</p>
          </div>
          {containerBookings.length > 0 && (
            <button
              onClick={() => exportBookingToExcel()}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 hover:border-emerald-300 text-[10px] font-extrabold rounded-xl uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm shrink-0"
              title="Download Excel spreadsheet report for all grouped and authorized bookings"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Excel Report
            </button>
          )}
        </div>

        {containerBookings.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-semibold">
            No integrated containers consolidated.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {containerBookings.map((booking) => {
              // Get shipper items belonging to this container
              const members = shipperEntries.filter(s => s.container_booking_id === booking.id);
              const totalMVolume = members.reduce((sum, s) => sum + s.volume_cbm, 0);

              // Load hybrid dispatch details
              const localDispatches = JSON.parse(localStorage.getItem('writer_groupage_local_dispatches') || '{}');
              const dispatchDetail = localDispatches[booking.id];
              
              const status = booking.status || dispatchDetail?.status || 'Pending';
              const containerNo = booking.container_no || dispatchDetail?.container_no;
              const estimatedDepartureDate = booking.estimated_departure_date || dispatchDetail?.estimated_departure_date;

              return (
                <div key={booking.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 hover:border-slate-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2 border-b pb-3 mb-3 border-slate-200/60">
                      <div>
                        <span className="text-[9px] font-black font-mono text-slate-500 bg-slate-200 px-2 py-0.5 rounded uppercase">
                          {booking.id}
                        </span>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight mt-1">{booking.container_type}</h4>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-slate-900">{totalMVolume} CBM</p>
                        <span className="text-[8px] text-slate-400 font-bold block">Capacity {booking.capacity_cbm} CBM</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-[11px] font-semibold text-slate-600 mb-4 bg-white p-3 rounded-xl border border-slate-100">
                      <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" /> Destination: <strong className="text-slate-900">{booking.destination_city}, {booking.destination_country}</strong></p>
                      <p className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" /> Dispatcher: <span className="text-stone-500">{booking.created_by_name}</span></p>
                      
                      {status === 'Dispatched' ? (
                        <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 text-emerald-700">
                          <p className="flex items-center gap-1.5 font-black text-emerald-800"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Status: Dispatched 🚢</p>
                          <p className="flex items-center gap-1.5 font-bold"><strong className="text-slate-700">Container No:</strong> {containerNo}</p>
                          <p className="flex items-center gap-1.5 font-bold"><strong className="text-slate-700">ETD Date:</strong> {estimatedDepartureDate}</p>
                        </div>
                      ) : (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <p className="flex items-center gap-1.5 font-black text-amber-700"><Clock className="w-3.5 h-3.5 text-amber-500" /> Status: Ready for Dispatch ⏳</p>
                        </div>
                      )}
                    </div>

                    {/* Member List */}
                    <div className="space-y-1.5 mb-4">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Consolidated shippers</p>
                      <div className="space-y-1 max-h-[80px] overflow-y-auto">
                        {members.map(item => (
                          <div key={item.id} className="flex justify-between items-center text-[10px] font-bold py-1 border-b border-stone-100">
                            <span className="text-indigo-600 truncate max-w-[150px]">{item.shipper_name}</span>
                            <span className="font-mono text-slate-500">{item.volume_cbm} CBM</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Inline Dispatch Input Form */}
                  {dispatchingBookingId === booking.id && (
                    <div className="p-3 bg-blue-50/50 border border-blue-105 rounded-xl space-y-3 mb-4 animate-in slide-in-from-bottom-2 duration-200">
                      <p className="text-[10px] font-black uppercase text-blue-800 tracking-wide">Enter Dispatch Credentials</p>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block animate-pulse">Container No.</label>
                        <input 
                          required
                          type="text"
                          placeholder="e.g. MSKU9837482"
                          className="w-full text-xs font-bold border rounded-lg p-2.5 bg-white outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                          value={dispatchContainerNo}
                          onChange={(e) => setDispatchContainerNo(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Estimated Departure Date</label>
                        <input 
                          required
                          type="date"
                          className="w-full text-xs font-bold border rounded-lg p-2.5 bg-white outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
                          value={dispatchETD}
                          onChange={(e) => setDispatchETD(e.target.value)}
                        />
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleDispatchBooking(booking.id, dispatchContainerNo, dispatchETD)}
                          className="flex-1 py-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold uppercase text-[9px] tracking-wider rounded-lg transition-all"
                        >
                          Confirm Dispatch
                        </button>
                        <button
                          onClick={() => {
                            setDispatchingBookingId(null);
                            setDispatchContainerNo('');
                            setDispatchETD('');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold uppercase text-[9px] tracking-wider rounded-lg transition-all"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {isAuthorizedToBook && (
                    <div className="pt-3 border-t mt-3 flex justify-between gap-1.5 flex-wrap">
                      <button 
                        onClick={() => {
                          setSelectedBookingForAdd(booking);
                          setAddShipperIds([]);
                        }}
                        className="flex-1 px-2.2 py-1.5 bg-blue-50/60 hover:bg-blue-100 text-blue-600 border border-blue-100/60 text-[10px] font-bold rounded-xl uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5 shrink-0" /> Add Shipment
                      </button>

                      {status !== 'Dispatched' && dispatchingBookingId !== booking.id && (
                        <button 
                          onClick={() => {
                            setDispatchingBookingId(booking.id);
                            setDispatchContainerNo('');
                            setDispatchETD('');
                          }}
                          className="flex-1 px-2.2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-805 border border-amber-200/60 text-[10px] font-bold rounded-xl uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
                        >
                          <Truck className="w-3.5 h-3.5 shrink-0 text-amber-600" /> Dispatch
                        </button>
                      )}

                      <button 
                        onClick={() => exportBookingToExcel(booking)}
                        className="px-2.2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-150 text-[10px] font-bold rounded-xl uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
                        title="Download Container Cargo Manifest (Excel/CSV)"
                      >
                        <Download className="w-3.5 h-3.5 shrink-0 text-emerald-650" /> Excel
                      </button>

                      <button 
                        onClick={() => handleDisbandBooking(booking)}
                        className="px-2.2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-[10px] font-bold rounded-xl uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
                      >
                        <X className="w-3.5 h-3.5 shrink-0" /> Disband Block
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RECORD SHIPPER COMPONENT MODAL */}
      {showShipperModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col justify-between shrink-0 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-white shrink-0">
              <h3 className="text-md font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                {editingEntryId ? 'Update Shipper Specifications' : 'Register Customer Consignee Cargo'}
              </h3>
              <button 
                onClick={() => setShowShipperModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleShipperSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Shipper's Name *</label>
                  <input 
                    required 
                    type="text"
                    placeholder="e.g. Roxanne Stark Ltd"
                    className="w-full text-xs font-bold border rounded-xl p-3.5 bg-slate-50 outline-none focus:ring-1 focus:ring-indigo-500"
                    value={shipperForm.shipper_name}
                    onChange={(e) => setShipperForm({ ...shipperForm, shipper_name: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Volume in CBM *</label>
                  <div className="relative">
                    <input 
                      required 
                      type="number"
                      step="0.1"
                      placeholder="e.g. 15.5"
                      className="w-full text-xs font-bold border rounded-xl p-3.5 pr-12 bg-slate-50 outline-none focus:ring-1 focus:ring-indigo-500"
                      value={shipperForm.volume_cbm}
                      onChange={(e) => setShipperForm({ ...shipperForm, volume_cbm: e.target.value })}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] uppercase font-black text-slate-400">CBM</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Destination Address *</label>
                <input 
                  required 
                  type="text"
                  placeholder="e.g. Port of London Authority Warehouse A3"
                  className="w-full text-xs font-bold border rounded-xl p-3.5 bg-slate-50 outline-none focus:ring-1 focus:ring-indigo-500"
                  value={shipperForm.destination_address}
                  onChange={(e) => setShipperForm({ ...shipperForm, destination_address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Destination City *</label>
                  <input 
                    required 
                    type="text"
                    placeholder="e.g. London"
                    className="w-full text-xs font-bold border rounded-xl p-3.5 bg-slate-50 outline-none focus:ring-1 focus:ring-indigo-500"
                    value={shipperForm.destination_city}
                    onChange={(e) => setShipperForm({ ...shipperForm, destination_city: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Destination Country *</label>
                  <select 
                    required 
                    className="w-full text-xs font-bold border rounded-xl p-3.5 bg-slate-50 outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                    value={shipperForm.destination_country}
                    onChange={(e) => setShipperForm({ ...shipperForm, destination_country: e.target.value })}
                  >
                    <option value="">-- Choose Country --</option>
                    <option value="United Kingdom - Groupage">United Kingdom - Groupage</option>
                    <option value="United States - Groupage">United States - Groupage</option>
                    <option value="Canada - Groupage">Canada - Groupage</option>
                    <option value="India - Groupage">India - Groupage</option>
                    <option value="Asia - Groupage">Asia - Groupage</option>
                    <option value="Europe - Groupage">Europe - Groupage</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 flex gap-4 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setShowShipperModal(false)} 
                  className="flex-1 py-3 text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-extrabold uppercase tracking-widest shadow-lg"
                >
                  Confirm Specifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModalConfig && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200 text-left">
            <div className="flex gap-3 items-start text-amber-600">
              <div className="p-2 bg-amber-50 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">{confirmModalConfig.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">{confirmModalConfig.message}</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalConfig(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 font-extrabold uppercase text-[10px] tracking-wider rounded-xl transition-all"
              >
                {confirmModalConfig.textCancel || "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModalConfig.onConfirm();
                  setConfirmModalConfig(null);
                }}
                className="flex-1 py-3 bg-[#E31E24] hover:bg-red-700 text-white font-extrabold uppercase text-[10px] tracking-wider rounded-xl transition-all shadow-md active:scale-95"
              >
                {confirmModalConfig.textConfirm || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MORE SHIPMENTS MODAL */}
      {selectedBookingForAdd && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col justify-between shrink-0 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-white shrink-0">
              <h3 className="text-md font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Add Cargo to Container {selectedBookingForAdd.id}
              </h3>
              <button 
                onClick={() => {
                  setSelectedBookingForAdd(null);
                  setAddShipperIds([]);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto text-left">
              {/* Container info */}
              <div className="bg-slate-50 border rounded-2xl p-4 text-xs font-semibold text-slate-700 space-y-2">
                <div className="flex justify-between">
                  <span>Container Type:</span>
                  <span className="font-extrabold text-slate-900">{selectedBookingForAdd.container_type}</span>
                </div>
                <div className="flex justify-between">
                  <span>Destination:</span>
                  <span className="font-extrabold text-slate-900">{selectedBookingForAdd.destination_city}, {selectedBookingForAdd.destination_country}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between items-center">
                  <span>Capacity Utilization:</span>
                  <span className={`font-black font-mono ${isAddVolumeOverflown ? 'text-red-650' : 'text-blue-600'}`}>
                    {(selectedBookingUtilizedVolume + totalAdditionalVolume).toFixed(1)} / {selectedBookingForAdd.capacity_cbm} CBM
                  </span>
                </div>
                
                {/* Visual indicator bar */}
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden mt-1 flex">
                  <div 
                    style={{ width: `${Math.min(100, (selectedBookingUtilizedVolume / selectedBookingForAdd.capacity_cbm) * 100)}%` }} 
                    className="h-full bg-blue-500 transition-all duration-300"
                    title={`Current: ${selectedBookingUtilizedVolume} CBM`}
                  />
                  <div 
                    style={{ width: `${Math.min(100 - (selectedBookingUtilizedVolume / selectedBookingForAdd.capacity_cbm) * 100, (totalAdditionalVolume / selectedBookingForAdd.capacity_cbm) * 100)}%` }} 
                    className={`h-full ${isAddVolumeOverflown ? 'bg-red-500 animate-pulse' : 'bg-blue-600'} transition-all duration-300`}
                    title={`Additional: ${totalAdditionalVolume} CBM`}
                  />
                </div>
                
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold select-none">
                  <span>Current: {selectedBookingUtilizedVolume} CBM</span>
                  <span>Adding: {totalAdditionalVolume} CBM</span>
                  <span>Remaining: {Math.max(0, selectedBookingRemainingCapacity - totalAdditionalVolume).toFixed(1)} CBM</span>
                </div>
              </div>

              {/* Warning Area */}
              {isAddVolumeOverflown && (
                <div className="bg-red-50 border border-red-200 text-[#E31E24] p-3.5 rounded-2xl flex gap-2 items-start text-xs font-semibold select-none animate-bounce">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                  <div>
                    <span className="font-extrabold uppercase tracking-wider block text-[10px] text-red-850">Volume will not fit</span>
                    The total combined volume exceeds the absolute capacity rating of {selectedBookingForAdd.capacity_cbm} CBM. Remove some selected cargo items to proceed.
                  </div>
                </div>
              )}

              {/* Selection list */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Select pending shipments *</label>
                  <span className="text-[9px] font-mono font-bold text-slate-400">Match by destination</span>
                </div>

                <div className="border rounded-2xl p-2 bg-slate-50 max-h-[220px] overflow-y-auto space-y-1">
                  {shipperEntries.filter(s => s.status === 'Pending').length === 0 ? (
                    <div className="text-[10px] font-medium text-slate-400 text-center py-6">
                      No pending shippers available to group. Create shipper cargo files first in the panel.
                    </div>
                  ) : (
                    shipperEntries.filter(s => s.status === 'Pending').map((shipper) => {
                      const isSelected = addShipperIds.includes(shipper.id);
                      const sameDestination = 
                        shipper.destination_country.toLowerCase().trim() === selectedBookingForAdd.destination_country.toLowerCase().trim() &&
                        shipper.destination_city.toLowerCase().trim() === selectedBookingForAdd.destination_city.toLowerCase().trim();

                      return (
                        <button
                          key={shipper.id}
                          type="button"
                          onClick={() => toggleAddShipperSelection(shipper.id)}
                          className={`w-full p-2.5 rounded-xl border flex justify-between items-center text-left text-[11px] font-bold transition-all ${
                            isSelected 
                              ? 'bg-blue-50 border-blue-200 text-blue-950 ring-1 ring-blue-500' 
                              : 'bg-white border-slate-100 hover:border-slate-200 text-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-extrabold text-[#E31E24] text-[10px] leading-tight select-none">{shipper.shipper_name}</p>
                              {sameDestination && (
                                <span className="bg-emerald-50 text-[8px] font-extrabold text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 select-none">
                                  Dest. Match
                                </span>
                              )}
                            </div>
                            <span className="text-[8px] font-medium text-slate-400 block mt-0.5 select-none">{shipper.destination_city}, {shipper.destination_country}</span>
                          </div>
                          <span className="font-mono text-[9px] bg-slate-900 text-white font-bold rounded px-1.5 py-0.5 select-none shrink-0 text-right">
                            {shipper.volume_cbm} CBM
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-slate-50 flex gap-4 shrink-0">
              <button 
                type="button" 
                onClick={() => {
                  setSelectedBookingForAdd(null);
                  setAddShipperIds([]);
                }} 
                className="flex-1 py-3 text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleAddShippersToBooking}
                disabled={addShipperIds.length === 0 || isAddVolumeOverflown}
                className="flex-1 py-3 bg-[#E31E24] hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest shadow-lg transition-all"
              >
                Add Selected Shipments
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
