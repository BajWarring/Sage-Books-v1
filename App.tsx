
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { 
  Home, Settings, Search, MoreVertical, Plus, Minus, Calendar, 
  Clock, ArrowUpRight, ArrowDownLeft, FileText, Download, Upload, 
  Trash2, Share2, Edit2, AlertCircle, CheckCircle, ChevronLeft, Menu, Check
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { DB } from './services/db';
import { THEMES, applyTheme, getThemePdfColors } from './services/theme';
import { Cashbook, Entry, EntryType, PaymentMode, EntryChangeLog } from './types';
import { Button, Card, Header, Input, Select, Badge, FAB } from './components/UIComponents';

// --- Helpers ---

// Robust date parser to handle DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
const parseDateHelper = (dateStr: string): string => {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const cleanStr = dateStr.trim();
  
  // Try ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) return cleanStr;
  
  // Try DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
  const parts = cleanStr.split(/[-/.]/);
  if (parts.length === 3) {
    let d = parseInt(parts[0]);
    let m = parseInt(parts[1]);
    let y = parseInt(parts[2]);
    
    // Auto-correct year if 2 digits (e.g. 25 -> 2025)
    if (y < 100) y += 2000;

    // Check bounds to guess format
    if (m > 12 && d <= 12) {
      // It was MM/DD/YYYY actually
      const temp = d; d = m; m = temp;
    }
    
    // Format to YYYY-MM-DD
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  
  // Fallback to JS parser
  const timestamp = Date.parse(cleanStr);
  if (!isNaN(timestamp)) {
    return new Date(timestamp).toISOString().split('T')[0];
  }

  return cleanStr; // Return original if fail
};

const formatDateHeader = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  
  return date.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

// --- Screen: Home ---
const HomeScreen = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Cashbook[]>([]);
  const [totals, setTotals] = useState<Record<string, { totalIn: number; totalOut: number; net: number }>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBookName, setNewBookName] = useState('');

  const loadBooks = () => {
    const loadedBooks = DB.getCashbooks();
    setBooks(loadedBooks);
    
    // Calculate totals for previews
    const newTotals: any = {};
    loadedBooks.forEach(b => {
      const entries = DB.getEntries(b.id);
      newTotals[b.id] = DB.calculateTotals(entries);
    });
    setTotals(newTotals);
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const handleAddBook = () => {
    if (!newBookName.trim()) return;
    DB.addCashbook(newBookName);
    setNewBookName('');
    setShowAddModal(false);
    loadBooks();
  };

  const settings = DB.getSettings();

  return (
    <div className="pb-24 bg-slate-50 min-h-screen relative">
      {/* Clean Header */}
      <div className="bg-white px-5 py-4 shadow-sm sticky top-0 z-20 border-b border-slate-100 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 border border-primary-200 flex items-center justify-center text-lg font-bold shadow-sm">
             {settings.profile.avatarUri ? <img src={settings.profile.avatarUri} className="w-full h-full object-cover rounded-full" /> : settings.profile.name[0]}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 leading-tight">{settings.profile.name}</h2>
            <p className="text-slate-400 text-xs font-medium">My Cashbooks</p>
          </div>
        </div>
        <div className="flex gap-2">
           <button className="p-2.5 rounded-full text-slate-500 hover:bg-slate-100"><Search className="w-6 h-6" /></button>
           <button className="p-2.5 rounded-full text-slate-500 hover:bg-slate-100"><Menu className="w-6 h-6" /></button>
        </div>
      </div>

      {/* Cashbooks List */}
      <div className="p-4 space-y-4">
        {books.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center opacity-60">
            <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-600">No Cashbooks Found</h3>
            <p className="text-slate-500 max-w-xs mx-auto mb-6">Create your first cashbook to start tracking your daily income and expenses.</p>
          </div>
        ) : (
          books.map(book => {
            const stats = totals[book.id] || { totalIn: 0, totalOut: 0, net: 0 };
            return (
              <Card key={book.id} onClick={() => navigate(`/book/${book.id}`)} className="border-l-[6px] border-l-primary-500 shadow-sm active:shadow-none transition-shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-xl text-slate-800 mb-1">{book.name}</h3>
                    <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                      Updated: {new Date(book.lastUpdated).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1">Net Balance</span>
                    <span className={`text-2xl font-bold ${stats.net >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                      {stats.net.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Floating Action Button for Add */}
      <div className="fixed bottom-24 right-6 z-30">
        <FAB 
          icon={<Plus className="w-8 h-8" />} 
          onClick={() => setShowAddModal(true)} 
          color="bg-primary-600 hover:bg-primary-700 shadow-primary-300 shadow-xl" 
        />
      </div>

      {/* Add Cashbook Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-fade-in">
              <h3 className="text-xl font-bold mb-6 text-slate-800">New Cashbook</h3>
              <Input 
                autoFocus
                label="Cashbook Name" 
                placeholder="e.g., Office Expenses" 
                value={newBookName}
                onChange={e => setNewBookName(e.target.value)}
              />
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" onClick={() => setShowAddModal(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleAddBook} disabled={!newBookName.trim()} className="flex-1">Create</Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

// --- Screen: Cashbook Detail ---
const CashbookDetailScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<Cashbook | undefined>(DB.getCashbook(id || ''));
  const [groupedEntries, setGroupedEntries] = useState<Record<string, Entry[]>>({});
  const [stats, setStats] = useState({ totalIn: 0, totalOut: 0, net: 0 });
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!id) return;
    const foundBook = DB.getCashbook(id);
    if (!foundBook) {
      navigate('/'); // Redirect if not found
      return;
    }
    setBook(foundBook);
    
    // 1. Fetch
    const rawEntries = DB.getEntries(id);
    
    // 2. Sort ASCENDING (Oldest first) for Calculation
    const ascEntries = [...rawEntries].sort((a, b) => {
       const dateA = new Date(`${a.date}T${a.time}`).getTime();
       const dateB = new Date(`${b.date}T${b.time}`).getTime();
       return dateA - dateB;
    });

    // 3. Calculate Running Balance
    let runningBalance = 0;
    let totalIn = 0;
    let totalOut = 0;

    const processedEntries = ascEntries.map(e => {
       if (e.type === EntryType.IN) {
         runningBalance += e.amount;
         totalIn += e.amount;
       } else {
         runningBalance -= e.amount;
         totalOut += e.amount;
       }
       return { ...e, calculatedBalance: runningBalance }; // Add calculated balance to entry object (extended)
    });

    setStats({ totalIn, totalOut, net: runningBalance });

    // 4. Sort DESCENDING (Newest first) for Display
    const descEntries = processedEntries.sort((a, b) => {
       const dateA = new Date(`${a.date}T${a.time}`).getTime();
       const dateB = new Date(`${b.date}T${b.time}`).getTime();
       return dateB - dateA;
    });

    // 5. Filter (Search)
    const filtered = descEntries.filter(e => 
      e.remarks.toLowerCase().includes(search.toLowerCase()) || 
      e.date.includes(search)
    );

    // 6. Group by Date
    const grouped: Record<string, any[]> = {};
    filtered.forEach(e => {
       if (!grouped[e.date]) grouped[e.date] = [];
       grouped[e.date].push(e);
    });
    setGroupedEntries(grouped);

  }, [id, navigate, search]);

  if (!book) return <div className="p-10 text-center">Loading...</div>;

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <Header title={book.name} onBack={() => navigate('/')} actions={<button><MoreVertical className="text-slate-600"/></button>} />
      
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="bg-white px-4 py-3 shadow-sm z-10 sticky top-0 border-b border-slate-100">
          <Input 
            placeholder="Search by remarks & date..." 
            icon={<Search className="w-5 h-5" />} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-0"
          />
        </div>

        {/* Summary */}
        <div className="m-4 mt-4">
          <Card className="bg-white border border-primary-100 shadow-lg shadow-primary-100/50">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Net Balance</p>
                <h2 className={`text-4xl font-bold tracking-tight ${stats.net >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                  {stats.net.toLocaleString()}
                </h2>
              </div>
              <button className="bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center transition-colors border border-primary-200" onClick={() => navigate('/export-import')}>
                View Reports <FileText className="w-3 h-3 ml-2" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                <p className="text-green-600 text-[10px] font-bold uppercase tracking-wide">Total In</p>
                <p className="font-bold text-xl text-green-700 flex items-center gap-1">
                   <ArrowDownLeft className="w-4 h-4"/> {stats.totalIn.toLocaleString()}
                </p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                <p className="text-red-600 text-[10px] font-bold uppercase tracking-wide">Total Out</p>
                <p className="font-bold text-xl text-red-700 flex items-center gap-1">
                   <ArrowUpRight className="w-4 h-4"/> {stats.totalOut.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Entries List Grouped by Date */}
        <div className="px-4 space-y-2">
          {sortedDates.map(date => (
            <div key={date} className="mb-2">
               {/* Date Header */}
               <div className="sticky top-16 z-0 bg-slate-50/95 backdrop-blur-sm py-2 px-1 mb-1 flex justify-between items-end border-b border-slate-200/50">
                  <span className="font-bold text-slate-500 text-sm uppercase tracking-wide">{formatDateHeader(date)}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{date}</span>
               </div>
               
               <div className="space-y-3">
                 {groupedEntries[date].map((entry: any) => (
                    <Card key={entry.id} onClick={() => navigate(`/entry/${entry.id}`)} className="flex items-center gap-3 active:scale-[0.99] transition-transform">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm ${entry.type === EntryType.IN ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {entry.type === EntryType.IN ? <ArrowDownLeft className="w-6 h-6 stroke-[2.5]"/> : <ArrowUpRight className="w-6 h-6 stroke-[2.5]"/>}
                      </div>
                      
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold text-slate-800 truncate pr-2 text-base">{entry.remarks || 'No remarks'}</h4>
                          <span className={`font-bold text-base ${entry.type === EntryType.IN ? 'text-green-600' : 'text-red-600'}`}>
                            {entry.type === EntryType.IN ? '+' : '-'}{entry.amount.toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center mt-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase">{entry.paymentMode}</span>
                            {/* Time Display */}
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                               <Clock className="w-3 h-3" /> {entry.time}
                            </span>
                          </div>
                          
                          {/* Calculated Running Balance */}
                          <span className="text-[10px] text-slate-500 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                            Bal: {entry.calculatedBalance.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </Card>
                 ))}
               </div>
            </div>
          ))}

          {sortedDates.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <FileText className="w-8 h-8 opacity-40" />
              </div>
              <p className="font-medium">No entries found</p>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Buttons - Rounded Corner Rectangles */}
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] flex gap-4 max-w-md mx-auto z-30 rounded-t-3xl border-t border-slate-50">
        <button 
          onClick={() => navigate(`/add-entry/${id}?type=IN`)}
          className="flex-1 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-green-200 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <div className="bg-white/20 p-1 rounded-full"><Plus className="w-4 h-4 stroke-[4]" /></div>
          Cash In
        </button>
        <button 
          onClick={() => navigate(`/add-entry/${id}?type=OUT`)}
          className="flex-1 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-orange-200 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
           <div className="bg-white/20 p-1 rounded-full"><Minus className="w-4 h-4 stroke-[4]" /></div>
          Cash Out
        </button>
      </div>
    </div>
  );
};

// --- Screen: Add/Edit Entry ---
const EntryFormScreen = () => {
  const { cashbookId, entryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryType = new URLSearchParams(location.search).get('type') as EntryType || EntryType.IN;

  const [formData, setFormData] = useState<Entry>({
    id: entryId || crypto.randomUUID(),
    cashbookId: cashbookId || '',
    type: queryType,
    amount: '' as unknown as number, // Initial empty state for input
    remarks: '',
    category: 'General',
    paymentMode: PaymentMode.CASH,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    balanceAfter: 0,
    createdAt: Date.now(),
  });

  useEffect(() => {
    if (entryId) {
      const existing = DB.getEntry(entryId);
      if (existing) setFormData(existing);
    }
  }, [entryId]);

  const handleSave = (addNew: boolean) => {
    if (!formData.amount || !formData.remarks) {
      alert("Please fill amount and remarks");
      return;
    }

    const entryToSave = { ...formData, amount: Number(formData.amount) };
    if (entryId) {
      DB.updateEntry(entryToSave);
      navigate(-1);
    } else {
      DB.addEntry(entryToSave);
      if (addNew) {
        setFormData({ ...formData, id: crypto.randomUUID(), amount: '' as unknown as number, remarks: '' });
      } else {
        navigate(-1);
      }
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <Header title={entryId ? "Edit Entry" : "Add New Entry"} onBack={() => navigate(-1)} />
      
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        {/* Type Toggles */}
        <div className="flex bg-slate-200 p-1 rounded-2xl mb-6">
          <button 
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${formData.type === EntryType.IN ? 'bg-green-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-300/50'}`}
            onClick={() => setFormData({...formData, type: EntryType.IN})}
          >
            CASH IN
          </button>
          <button 
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${formData.type === EntryType.OUT ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-300/50'}`}
            onClick={() => setFormData({...formData, type: EntryType.OUT})}
          >
            CASH OUT
          </button>
        </div>

        {/* Date Time */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <Input 
              type="date" 
              label="Date"
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
              icon={<Calendar className="w-4 h-4" />}
            />
          </div>
          <div className="flex-1">
            <Input 
              type="time" 
              label="Time"
              value={formData.time}
              onChange={e => setFormData({...formData, time: e.target.value})}
              icon={<Clock className="w-4 h-4" />}
            />
          </div>
        </div>

        <Input 
          label="Amount" 
          type="number" 
          placeholder="0.00" 
          value={formData.amount} 
          onChange={e => setFormData({...formData, amount: e.target.valueAsNumber})}
          className="text-2xl font-bold text-slate-800"
        />

        <Input 
          label="Description / Remark" 
          placeholder="What is this for?" 
          value={formData.remarks} 
          onChange={e => setFormData({...formData, remarks: e.target.value})}
        />

        <Select 
          label="Category" 
          value={formData.category} 
          onChange={e => setFormData({...formData, category: e.target.value})}
        >
          <option>General</option>
          <option>Food</option>
          <option>Transport</option>
          <option>Salary</option>
          <option>Rent</option>
          <option>Bills</option>
          <option>Entertainment</option>
          <option>Shopping</option>
        </Select>

        <div className="mb-6">
          <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Payment Mode</label>
          <div className="flex flex-wrap gap-2">
            {Object.values(PaymentMode).map(mode => (
              <button
                key={mode}
                onClick={() => setFormData({...formData, paymentMode: mode})}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${formData.paymentMode === mode ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3 border border-blue-100">
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-bold text-blue-800 text-sm">Quick Tip</h5>
            <p className="text-blue-600 text-xs mt-1">Use specific categories to generate better insights in your monthly reports.</p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white border-t border-slate-100 flex gap-3 z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] sticky bottom-0">
        {!entryId ? (
          <>
            <Button variant="secondary" className="flex-1" onClick={() => handleSave(true)}>
              Save & New
            </Button>
             <Button variant="primary" className="flex-1" onClick={() => handleSave(false)}>
              Save
            </Button>
          </>
        ) : (
          <Button variant="primary" className="flex-1 w-full" onClick={() => handleSave(false)}>
            Save
          </Button>
        )}
      </div>
    </div>
  );
};

// --- Screen: Entry Detail ---
const EntryDetailScreen = () => {
  const { entryId } = useParams();
  const navigate = useNavigate();
  const entry = DB.getEntry(entryId || '');
  const logs = DB.getLogs(entryId || '');
  const [showShare, setShowShare] = useState(false);

  if (!entry) return <div className="p-10 text-center">Entry Not found</div>;

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <Header title="Entry Details" onBack={() => navigate(-1)} actions={<button onClick={() => navigate(`/edit-entry/${entry.cashbookId}/${entry.id}`)}><Edit2 className="w-5 h-5 text-slate-600" /></button>} />
      
      <div className="flex-1 overflow-y-auto p-4">
        <Card className="mb-6 shadow-md border-none">
          <div className="flex justify-between items-start mb-6">
            <Badge color={entry.type === EntryType.IN ? 'green' : 'red'}>{entry.type === EntryType.IN ? 'Cash In' : 'Cash Out'}</Badge>
            <Badge color="blue">{entry.paymentMode}</Badge>
          </div>
          
          <div className="text-center mb-6">
            <h2 className={`text-4xl font-bold mb-2 ${entry.type === EntryType.IN ? 'text-green-600' : 'text-red-600'}`}>
              {entry.type === EntryType.IN ? '+' : '-'}{entry.amount.toLocaleString()}
            </h2>
            <p className="text-slate-500 text-lg font-medium">{entry.remarks}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold">Date</p>
              <p className="text-slate-800 font-semibold">{entry.date}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold">Time</p>
              <p className="text-slate-800 font-semibold">{entry.time}</p>
            </div>
          </div>
        </Card>

        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Created On</h3>
          <p className="text-slate-700 bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-sm">
            {new Date(entry.createdAt).toLocaleString()}
          </p>
        </div>

        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Changes History</h3>
          <div className="space-y-3">
            {logs.length === 0 ? (
              <p className="text-slate-400 text-sm italic px-1">No changes recorded</p>
            ) : (
              logs.map(log => (
                <div key={log.id} className="bg-white p-3 rounded-xl border border-slate-100 text-sm shadow-sm">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span className="uppercase font-bold">{log.fieldName}</span>
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="line-through text-red-400">{log.oldValue}</span>
                    <span className="text-slate-300">→</span>
                    <span className="text-green-600 font-bold">{log.newValue}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <Button size="lg" onClick={() => setShowShare(true)} className="flex items-center justify-center gap-2 w-full">
          <Share2 className="w-5 h-5" /> Share Entry
        </Button>
      </div>

      {/* Share Sheet Simulation */}
      {showShare && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowShare(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-2"></div>
            <h3 className="text-lg font-bold text-center mb-4 text-slate-800">Share Entry</h3>
            <Button variant="outline" className="w-full justify-start gap-3 h-14" onClick={() => alert("Sharing with logs...")}>
              <div className="bg-blue-50 p-2 rounded-full text-blue-600"><FileText className="w-5 h-5"/></div>
              Share with Logs
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3 h-14" onClick={() => alert("Sharing summary only...")}>
              <div className="bg-green-50 p-2 rounded-full text-green-600"><CheckCircle className="w-5 h-5"/></div>
              Share Summary Only
            </Button>
            <Button variant="ghost" className="w-full text-red-500 mt-2 font-bold" onClick={() => setShowShare(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Screen: Import / Export ---
const ImportExportScreen = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'export'|'import'>('export');
  const [books] = useState(DB.getCashbooks());
  const [selectedBook, setSelectedBook] = useState(books[0]?.id || '');
  
  // Import Flow States
  // Step 1: File, Step 2: Mapping, Step 3: Selection
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [csvContent, setCsvContent] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  
  // Field Mappings (index of column)
  const [mapping, setMapping] = useState<Record<string, number>>({});
  
  // Parsed Entries for Selection
  const [candidateEntries, setCandidateEntries] = useState<Entry[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // --- Export Logic ---
  const handleExport = (format: 'csv' | 'pdf') => {
    // 1. Get entries (Oldest First)
    const rawEntries = DB.getEntries(selectedBook);
    const bookName = books.find(b => b.id === selectedBook)?.name || "Cashbook";
    
    // Process entries with running balance
    let runningBalance = 0;
    let totalIn = 0;
    let totalOut = 0;
    
    const entries = [...rawEntries].sort((a, b) => {
       const dateA = new Date(`${a.date}T${a.time}`).getTime();
       const dateB = new Date(`${b.date}T${b.time}`).getTime();
       return dateA - dateB;
    }).map(e => {
       if (e.type === EntryType.IN) {
         runningBalance += e.amount;
         totalIn += e.amount;
       } else {
         runningBalance -= e.amount;
         totalOut += e.amount;
       }
       return { ...e, calculatedBalance: runningBalance };
    });

    if (format === 'csv') {
       const header = ['Date', 'Time', 'Remark', 'Category', 'Mode', 'Cash In', 'Cash Out', 'Balance'];
       const rows = entries.map(e => {
        const cashIn = e.type === EntryType.IN ? e.amount : '';
        const cashOut = e.type === EntryType.OUT ? e.amount : '';
        return [
          e.date, 
          e.time, 
          `"${e.remarks.replace(/"/g, '""')}"`, 
          e.category, 
          e.paymentMode, 
          cashIn, 
          cashOut, 
          e.calculatedBalance
        ];
      });
      const csvString = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${bookName}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else {
      // --- PDF EXPORT ---
      // Get Theme Colors for PDF
      const themeKey = DB.getSettings().theme.primaryColor;
      const themePdfColors = getThemePdfColors(themeKey);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 14;

      // 1. Logo (Black Square Placeholder)
      // Center X, Top Y = 10
      const logoSize = 25;
      doc.setFillColor(0, 0, 0);
      doc.rect((pageWidth - logoSize) / 2, 10, logoSize, logoSize, 'F');

      // 2. Cashbook Name Pill
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      
      const nameText = bookName;
      const textWidth = doc.getTextWidth(nameText);
      const pillPadding = 20; // Reduced from 40 to 20
      const pillWidth = textWidth + pillPadding;
      const pillHeight = 14;
      const pillY = 45;

      // Use dynamic theme color
      doc.setFillColor(themePdfColors.primary[0], themePdfColors.primary[1], themePdfColors.primary[2]);
      doc.roundedRect((pageWidth - pillWidth) / 2, pillY, pillWidth, pillHeight, 4, 4, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.text(nameText, pageWidth / 2, pillY + 9.5, { align: 'center' });

      // 3. Duration Pill
      doc.setFontSize(12);
      doc.setTextColor(50, 50, 50); // Dark grey text
      const durationText = "Duration: All Time";
      const durTextWidth = doc.getTextWidth(durationText);
      const durPillWidth = durTextWidth + 40;
      const durPillHeight = 12;
      const durY = 65;

      doc.setDrawColor(themePdfColors.primary[0], themePdfColors.primary[1], themePdfColors.primary[2]);
      doc.setLineWidth(0.7);
      doc.roundedRect((pageWidth - durPillWidth) / 2, durY, durPillWidth, durPillHeight, 4, 4, 'S');
      
      doc.text(durationText, pageWidth / 2, durY + 8, { align: 'center' });

      // 4. Summary Cards
      const cardY = 85;
      const cardHeight = 25;
      const cardGap = 5;
      const availableWidth = pageWidth - (margin * 2);
      const cardWidth = (availableWidth - (cardGap * 2)) / 3;

      const drawSummaryCard = (x: number, label: string, value: string, valueColor: [number, number, number]) => {
          // Border
          doc.setDrawColor(themePdfColors.primary[0], themePdfColors.primary[1], themePdfColors.primary[2]);
          doc.setLineWidth(0.7);
          doc.roundedRect(x, cardY, cardWidth, cardHeight, 3, 3, 'S');

          // Label
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0); // Black label
          doc.setFont('helvetica', 'bold');
          doc.text(label, x + cardWidth / 2, cardY + 8, { align: 'center' });

          // Value
          doc.setFontSize(18); // Increased size from 14 to 18
          doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
          doc.text(value, x + cardWidth / 2, cardY + 19, { align: 'center' });
      };

      // Swapped Order: Total In (Left), Total Out (Center), Final Balance (Right)
      drawSummaryCard(margin, "Total Cash In", totalIn.toLocaleString(), [34, 197, 94]); // Green
      drawSummaryCard(margin + cardWidth + cardGap, "Total Cash Out", totalOut.toLocaleString(), [239, 68, 68]); // Red
      drawSummaryCard(margin + (cardWidth + cardGap) * 2, "Final Balance", runningBalance.toLocaleString(), [0, 0, 0]); // Black

      // 5. Table
      const tableHeaders = [['Date & Time', 'Remarks', 'Category', 'Pay Mode', 'Cash In', 'Cash Out', 'Balance']];
      
      // Format Data
      const tableBody = [...entries].reverse().map(e => {
         // Robust parsing to avoid "Invalid Date"
         let dateStr = e.date;
         let timeStr = e.time;

         // Parse Date: YYYY-MM-DD -> DD MMM YYYY
         try {
             const dateParts = e.date.split('-');
             if (dateParts.length === 3) {
                // Ensure proper local time construction for simple YYYY-MM-DD
                const d = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                if (!isNaN(d.getTime())) {
                    dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                }
             }
         } catch(err) {}

         // Parse Time: 14:30 -> 02:30 PM (or leave as is if already has AM/PM)
         try {
             if(e.time && e.time.includes(':') && !e.time.toLowerCase().match(/[a-z]/)) {
                 const [h, m] = e.time.split(':').map(Number);
                 if (!isNaN(h) && !isNaN(m)) {
                    const tObj = new Date();
                    tObj.setHours(h, m);
                    timeStr = tObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                 }
             }
         } catch(err) {}
         
         return [
           `${dateStr}\n${timeStr}`,
           e.remarks,
           e.category || 'null', 
           e.paymentMode,
           e.type === EntryType.IN ? e.amount.toLocaleString() : '',
           e.type === EntryType.OUT ? e.amount.toLocaleString() : '',
           e.calculatedBalance.toLocaleString()
         ];
      });

      autoTable(doc, {
          startY: 120,
          head: tableHeaders,
          body: tableBody,
          theme: 'grid',
          styles: {
              font: 'helvetica',
              fontSize: 8,
              cellPadding: 3,
              textColor: [0, 0, 0],
              valign: 'middle',
              halign: 'center',
              lineWidth: 0.1,
              lineColor: [240, 240, 240] // Light grey lines
          },
          headStyles: {
              fillColor: themePdfColors.primary, // Dynamic Color
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              halign: 'center',
              valign: 'middle',
              minCellHeight: 9 // Reduced height from 12 to 9
          },
          columnStyles: {
              0: { cellWidth: 25 }, // Date
              1: { cellWidth: 'auto', halign: 'center' }, // Remarks
              2: { cellWidth: 20 },
              3: { cellWidth: 20 },
              4: { cellWidth: 25, textColor: [34, 197, 94] }, // Cash In Green
              5: { cellWidth: 25, textColor: [239, 68, 68] }, // Cash Out Red
              6: { cellWidth: 25, fontStyle: 'bold' } // Balance
          },
          willDrawCell: (data) => {
              const doc = data.doc;
              const { cell, row } = data;
              
              if (data.section === 'head') {
                 doc.setFillColor(themePdfColors.primary[0], themePdfColors.primary[1], themePdfColors.primary[2]);
              } else if (data.section === 'body') {
                 // Zebra: Even rows get light tint, Odd rows get subtle tint
                 if (row.index % 2 === 0) {
                     doc.setFillColor(themePdfColors.light[0], themePdfColors.light[1], themePdfColors.light[2]); 
                 } else {
                     doc.setFillColor(themePdfColors.subtle[0], themePdfColors.subtle[1], themePdfColors.subtle[2]); 
                 }
              }

              // Draw Rounded Rectangle
              const radius = 2;
              const gap = 0.5;
              doc.roundedRect(
                  cell.x + gap, 
                  cell.y + gap, 
                  cell.width - (gap*2), 
                  cell.height - (gap*2), 
                  radius, 
                  radius, 
                  'F'
              );
          },
          didDrawPage: (data) => {
              // Footer
              const str = "Generated by - Sage Books";
              doc.setFontSize(8);
              doc.setTextColor(128, 128, 128);
              const textWidth = doc.getTextWidth(str);
              doc.text(str, (pageWidth - textWidth) / 2, pageHeight - 10);
          }
      });

      doc.save(`${bookName}_Report.pdf`);
    }
  };

  // --- Import: Step 1 File Reading ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').map(l => l.split(',')); 
      if (lines.length > 0) {
        setCsvContent(lines);
        setHeaders(lines[0]);
        // Auto-guess mapping
        const h = lines[0];
        const newMap: any = {};
        h.forEach((header, i) => {
          const lower = header.toLowerCase().replace(/"/g, '').trim();
          if (lower.includes('date')) newMap['date'] = i;
          if (lower.includes('time')) newMap['time'] = i;
          if (lower.includes('remark') || lower.includes('desc')) newMap['remarks'] = i;
          if (lower.includes('category')) newMap['category'] = i;
          if (lower.includes('mode') || lower.includes('method')) newMap['paymentMode'] = i;
          if (lower.includes('in') || lower.includes('income') || lower.includes('credit')) newMap['cashIn'] = i;
          if (lower.includes('out') || lower.includes('expense') || lower.includes('debit')) newMap['cashOut'] = i;
        });
        setMapping(newMap);
        setImportStep(2); // Move to mapping
      }
    };
    reader.readAsText(file);
  };

  // --- Import: Step 2 Processing & Preview ---
  const processAndPreview = () => {
    // Validate mapping: need Date, and at least one amount column
    if (mapping['date'] === undefined || (mapping['cashIn'] === undefined && mapping['cashOut'] === undefined)) {
      alert("Please map at least Date and one Amount column (Cash In or Cash Out)");
      return;
    }

    const newCandidates: Entry[] = [];
    // Start from 1 to skip header
    for (let i = 1; i < csvContent.length; i++) {
      const row = csvContent[i];
      if (row.length < 2) continue;

      const getVal = (key: string) => {
        const idx = mapping[key];
        return idx !== undefined && row[idx] ? row[idx].replace(/"/g, '').trim() : '';
      };

      const dateStr = getVal('date');
      const timeStr = getVal('time') || '12:00';
      const remarks = getVal('remarks') || 'Imported Entry';
      const category = getVal('category') || 'General';
      const modeStr = getVal('paymentMode');
      
      // Determine Payment Mode
      let mode = PaymentMode.CASH;
      if (modeStr.toLowerCase().includes('online')) mode = PaymentMode.ONLINE;
      if (modeStr.toLowerCase().includes('upi')) mode = PaymentMode.UPI;
      if (modeStr.toLowerCase().includes('cheque')) mode = PaymentMode.CHEQUE;

      // Determine Amount & Type
      const valIn = parseFloat(getVal('cashIn'));
      const valOut = parseFloat(getVal('cashOut'));
      
      let finalAmt = 0;
      let finalType = EntryType.IN;

      if (!isNaN(valIn) && valIn > 0) {
        finalAmt = valIn;
        finalType = EntryType.IN;
      } else if (!isNaN(valOut) && valOut > 0) {
        finalAmt = valOut;
        finalType = EntryType.OUT;
      } else {
        continue; // Skip invalid rows with no amount
      }

      newCandidates.push({
        id: crypto.randomUUID(), // Temp ID
        cashbookId: selectedBook,
        type: finalType,
        amount: finalAmt,
        remarks: remarks,
        category: category,
        paymentMode: mode,
        date: parseDateHelper(dateStr),
        time: timeStr,
        balanceAfter: 0,
        createdAt: Date.now()
      });
    }

    if (newCandidates.length === 0) {
      alert("No valid entries found. Check your mapping.");
      return;
    }

    setCandidateEntries(newCandidates);
    // Select all by default
    const allIndices = new Set<number>();
    newCandidates.forEach((_, idx) => allIndices.add(idx));
    setSelectedIndices(allIndices);
    
    setImportStep(3); // Move to selection
  };

  // --- Import: Step 3 Final Commit ---
  const handleFinalImport = () => {
    const finalEntries = candidateEntries.filter((_, idx) => selectedIndices.has(idx));
    if (finalEntries.length === 0) return;
    
    DB.importEntries(finalEntries, selectedBook);
    alert(`Successfully imported ${finalEntries.length} entries.`);
    navigate('/');
  };

  // Toggle selection
  const toggleEntry = (idx: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(idx)) newSet.delete(idx);
    else newSet.add(idx);
    setSelectedIndices(newSet);
  };

  const toggleAll = () => {
    if (selectedIndices.size === candidateEntries.length) {
      setSelectedIndices(new Set());
    } else {
      const all = new Set<number>();
      candidateEntries.forEach((_, i) => all.add(i));
      setSelectedIndices(all);
    }
  };

  // Render Mapping Field Helper
  const MappingField = ({ label, fieldKey }: { label: string, fieldKey: string }) => {
    const colIndex = mapping[fieldKey];
    const sampleVal = colIndex !== undefined && csvContent[1] ? csvContent[1][colIndex] : '---';
    return (
      <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
         <div className="flex items-center gap-3 mb-2">
            <span className="w-24 text-xs font-bold uppercase text-slate-500">{label}</span>
            <div className="flex-1">
              <Select 
                className="mb-0 text-sm py-2" 
                value={mapping[fieldKey] !== undefined ? mapping[fieldKey] : ''} 
                onChange={(e) => setMapping({...mapping, [fieldKey]: parseInt(e.target.value)})}
              >
                <option value="">-- Select Column --</option>
                {headers.map((h, i) => (
                  <option key={i} value={i}>{h}</option>
                ))}
              </Select>
            </div>
         </div>
         <div className="flex items-center gap-2 pl-24">
            <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-bold">Sample</span>
            <span className="text-xs text-slate-600 font-mono truncate">{sampleVal}</span>
         </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <Header title="Data Management" onBack={() => navigate('/')} />
      
      <div className="flex-1 overflow-y-auto p-4">
        {/* Tabs - Only show on initial step or export */}
        {activeTab === 'export' && (
          <div className="flex bg-white rounded-xl shadow-sm mb-6 p-1 border border-slate-100">
            <button onClick={() => setActiveTab('export')} className="flex-1 py-3 rounded-lg font-bold text-sm bg-primary-50 text-primary-600">Export</button>
            <button onClick={() => setActiveTab('import')} className="flex-1 py-3 rounded-lg font-bold text-sm text-slate-500">Import</button>
          </div>
        )}

        {/* --- EXPORT VIEW --- */}
        {activeTab === 'export' && (
          <div className="space-y-6 animate-fade-in">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                  <Download className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold mb-2">Export Data</h2>
                <p className="text-slate-500 text-sm mb-6">Download your cashbook data for backup or reporting.</p>
                
                <Select label="Select Cashbook" value={selectedBook} onChange={e => setSelectedBook(e.target.value)}>
                  {books.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Button variant="outline" onClick={() => handleExport('pdf')}>Export PDF</Button>
                  <Button onClick={() => handleExport('csv')}>Export CSV</Button>
                </div>
             </div>
          </div>
        )}

        {/* --- IMPORT WIZARD --- */}
        {activeTab === 'import' && (
          <div className="animate-fade-in h-full flex flex-col">
            
            {/* Step 1: File Selection */}
            {importStep === 1 && (
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">Import CSV</h2>
                  <p className="text-slate-500 text-sm mb-6">Restore data from a previously exported CSV file.</p>
                  
                  <Select label="Import into Cashbook" value={selectedBook} onChange={e => setSelectedBook(e.target.value)}>
                    {books.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </Select>

                  <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-8 hover:bg-slate-50 transition-colors mt-4">
                    <input 
                      type="file" 
                      accept=".csv,text/csv,application/csv,text/plain,application/vnd.ms-excel" 
                      onChange={handleFileSelect} 
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" 
                    />
                    <p className="text-primary-500 font-bold">Tap to select CSV file</p>
                  </div>
                  
                  <div className="mt-6 text-left">
                     <Button variant="ghost" onClick={() => setActiveTab('export')} className="w-full">Cancel</Button>
                  </div>
               </div>
            )}

            {/* Step 2: Mapping */}
            {importStep === 2 && (
              <div className="flex flex-col h-full">
                 <div className="mb-4">
                    <h2 className="text-lg font-bold text-slate-800">Map Columns</h2>
                    <p className="text-xs text-slate-400">Match your CSV columns to app fields.</p>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto mb-4 pr-1">
                    <MappingField label="Date" fieldKey="date" />
                    <MappingField label="Time" fieldKey="time" />
                    <MappingField label="Category" fieldKey="category" />
                    <MappingField label="Pay Mode" fieldKey="paymentMode" />
                    <MappingField label="Cash In" fieldKey="cashIn" />
                    <MappingField label="Cash Out" fieldKey="cashOut" />
                    <MappingField label="Remarks" fieldKey="remarks" />
                 </div>

                 <div className="flex gap-3 pt-2 bg-slate-50 border-t border-slate-200">
                    <Button variant="ghost" onClick={() => { setImportStep(1); setCsvContent([]); }}>Back</Button>
                    <Button className="flex-1" onClick={processAndPreview}>Next: Preview</Button>
                 </div>
              </div>
            )}

            {/* Step 3: Selection */}
            {importStep === 3 && (
              <div className="flex flex-col h-full">
                {/* Custom Header for Selection */}
                <div className="flex justify-between items-center mb-2 px-1">
                   <div>
                     <h2 className="text-xl font-bold text-slate-800 text-primary-600">Select Entries</h2>
                     <p className="text-[10px] text-slate-400 font-mono">Mapping from '{fileName}'</p>
                   </div>
                   <button onClick={toggleAll} className="flex items-center gap-2 text-primary-600 font-bold text-sm">
                      {selectedIndices.size === candidateEntries.length ? 'Unselect All' : 'Select All'}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedIndices.size === candidateEntries.length ? 'border-primary-500 bg-primary-500' : 'border-slate-300'}`}>
                         {selectedIndices.size === candidateEntries.length && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                      </div>
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-1">
                   {candidateEntries.map((entry, idx) => {
                     const isSelected = selectedIndices.has(idx);
                     return (
                       <div key={idx} onClick={() => toggleEntry(idx)} className={`bg-white p-3 rounded-xl shadow-sm border transition-all flex items-center gap-3 cursor-pointer ${isSelected ? 'border-primary-200 ring-1 ring-primary-100' : 'border-slate-100 opacity-80'}`}>
                          {/* Icon */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${entry.type === EntryType.IN ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                             {entry.type === EntryType.IN ? <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" /> : <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />}
                          </div>
                          
                          {/* Text */}
                          <div className="flex-1 min-w-0">
                             <h4 className="font-bold text-slate-800 text-sm truncate">{entry.remarks}</h4>
                             <div className="flex gap-2 text-[10px] text-slate-400 mt-0.5">
                                <span>{entry.date}</span>
                                <span>•</span>
                                <span className="uppercase">{entry.paymentMode}</span>
                             </div>
                          </div>

                          {/* Amount & Check */}
                          <div className="text-right">
                             <div className={`font-bold text-sm ${entry.type === EntryType.IN ? 'text-green-600' : 'text-red-500'}`}>
                                {entry.amount}
                             </div>
                          </div>
                          
                          <div className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'border-primary-500 bg-primary-500' : 'border-slate-300'}`}>
                             {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                          </div>
                       </div>
                     )
                   })}
                </div>

                <div className="pt-3">
                  <Button onClick={handleFinalImport} className="w-full bg-primary-600 hover:bg-primary-700 shadow-xl">
                     Continue ({selectedIndices.size}/{candidateEntries.length})
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Settings ---
const SettingsScreen = () => {
  const navigate = useNavigate();
  const [profileName, setProfileName] = useState(DB.getSettings().profile.name);
  const [currentTheme, setCurrentTheme] = useState(DB.getSettings().theme.primaryColor);

  const saveProfile = () => {
    const s = DB.getSettings();
    s.profile.name = profileName;
    DB.saveSettings(s);
    alert("Profile Updated");
  };

  const handleThemeChange = (colorKey: string) => {
    setCurrentTheme(colorKey);
    const s = DB.getSettings();
    s.theme.primaryColor = colorKey;
    DB.saveSettings(s);
    applyTheme(colorKey);
  };

  return (
    <div className="pb-24 bg-slate-50 min-h-screen">
      <Header title="Settings" />
      <div className="p-4 space-y-6">
        
        {/* Profile Section */}
        <section>
          <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-3 px-2">Profile</h3>
          <Card className="flex flex-col gap-4">
             <div className="flex items-center gap-4">
               <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-slate-400">
                 <span className="text-2xl font-bold">{profileName[0]}</span>
               </div>
               <Button size="sm" variant="outline">Change Photo</Button>
             </div>
             <Input label="Display Name" value={profileName} onChange={e => setProfileName(e.target.value)} />
             <Button onClick={saveProfile}>Save Changes</Button>
          </Card>
        </section>

        {/* Theme */}
        <section>
          <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-3 px-2">Appearance</h3>
          <Card>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
               {Object.entries(THEMES).map(([key, theme]) => (
                 <button 
                  key={key} 
                  onClick={() => handleThemeChange(key)}
                  className={`flex flex-col items-center gap-2 group min-w-[60px]`}
                 >
                   <div 
                    className={`w-12 h-12 rounded-full shrink-0 border-4 shadow-md transition-all flex items-center justify-center ${currentTheme === key ? 'border-slate-800 scale-110' : 'border-white group-hover:scale-105'}`}
                    style={{ backgroundColor: theme.colors[500] }}
                   >
                     {currentTheme === key && <Check className="w-5 h-5 text-white" />}
                   </div>
                   <span className={`text-[10px] font-bold ${currentTheme === key ? 'text-slate-800' : 'text-slate-400'}`}>
                     {theme.name.split(' ')[0]}
                   </span>
                 </button>
               ))}
            </div>
            <div className="bg-primary-50 rounded-xl p-4 mt-2 border border-primary-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg shadow-primary-200">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-primary-800 font-bold text-sm">Theme Preview</h4>
                <p className="text-primary-600 text-xs">Primary colors and accents will change.</p>
              </div>
            </div>
          </Card>
        </section>

        {/* Data */}
        <section>
          <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-3 px-2">Data Management</h3>
          <Card>
             <div className="space-y-1">
               <button onClick={() => navigate('/export-import')} className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors">
                 <span className="flex items-center gap-3 font-semibold text-slate-700">
                   <Download className="w-5 h-5 text-slate-400" /> Import & Export
                 </span>
                 <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180" />
               </button>
               <button onClick={() => alert("Backup Created!")} className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors">
                 <span className="flex items-center gap-3 font-semibold text-slate-700">
                   <Share2 className="w-5 h-5 text-slate-400" /> Backup & Restore
                 </span>
                 <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180" />
               </button>
             </div>
          </Card>
        </section>

        <p className="text-center text-xs text-slate-400 mt-8">Version 1.0.1 • Offline Mode</p>
      </div>
    </div>
  );
};

// --- Bottom Navigation ---
const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isSettings = location.pathname === '/settings';

  // Hide on detail pages and specific flows
  if (
    location.pathname.includes('/entry/') || 
    location.pathname.includes('/add-entry/') || 
    location.pathname.includes('/edit-entry/') || 
    location.pathname.includes('/book/') || // Hide when inside a cashbook
    location.pathname.includes('/export')
  ) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around py-3 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
      <button 
        onClick={() => navigate('/')}
        className={`flex flex-col items-center gap-1 ${!isSettings ? 'text-primary-500' : 'text-slate-400'}`}
      >
        <div className={`p-1.5 rounded-2xl transition-all ${!isSettings ? 'bg-primary-50' : ''}`}>
          <Home className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-bold">Home</span>
      </button>
      <button 
        onClick={() => navigate('/settings')}
        className={`flex flex-col items-center gap-1 ${isSettings ? 'text-primary-500' : 'text-slate-400'}`}
      >
        <div className={`p-1.5 rounded-2xl transition-all ${isSettings ? 'bg-primary-50' : ''}`}>
          <Settings className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-bold">Settings</span>
      </button>
    </div>
  );
};

// --- Main Layout & Router ---
const App = () => {
  useEffect(() => {
    // Initialize Theme
    const s = DB.getSettings();
    applyTheme(s.theme.primaryColor);
  }, []);

  return (
    <Router>
      <div className="max-w-md mx-auto min-h-screen bg-slate-50 relative shadow-2xl overflow-hidden text-slate-900">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/book/:id" element={<CashbookDetailScreen />} />
          <Route path="/entry/:entryId" element={<EntryDetailScreen />} />
          <Route path="/add-entry/:cashbookId" element={<EntryFormScreen />} />
          <Route path="/edit-entry/:cashbookId/:entryId" element={<EntryFormScreen />} />
          <Route path="/export-import" element={<ImportExportScreen />} />
        </Routes>
        <BottomNav />
      </div>
    </Router>
  );
};

export default App;
