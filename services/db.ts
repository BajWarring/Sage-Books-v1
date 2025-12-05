import { Cashbook, Entry, EntryChangeLog, AppSettings, EntryType } from '../types';

const KEYS = {
  CASHBOOKS: 'sage_cashbooks',
  ENTRIES: 'sage_entries',
  LOGS: 'sage_logs',
  SETTINGS: 'sage_settings',
};

// Initial Data
const initialSettings: AppSettings = {
  profile: { name: 'Sage User', avatarUri: null },
  theme: { primaryColor: 'orange', intensity: 100 },
};

export const DB = {
  // --- Settings ---
  getSettings: (): AppSettings => {
    const data = localStorage.getItem(KEYS.SETTINGS);
    return data ? JSON.parse(data) : initialSettings;
  },
  saveSettings: (settings: AppSettings) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },

  // --- Cashbooks ---
  getCashbooks: (): Cashbook[] => {
    const data = localStorage.getItem(KEYS.CASHBOOKS);
    const books = data ? JSON.parse(data) : [];
    return books;
  },
  
  addCashbook: (name: string): Cashbook => {
    const books = DB.getCashbooks();
    const newBook: Cashbook = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };
    localStorage.setItem(KEYS.CASHBOOKS, JSON.stringify([...books, newBook]));
    return newBook;
  },

  getCashbook: (id: string): Cashbook | undefined => {
    return DB.getCashbooks().find(b => b.id === id);
  },

  // --- Entries ---
  getEntries: (cashbookId: string): Entry[] => {
    const data = localStorage.getItem(KEYS.ENTRIES);
    const allEntries: Entry[] = data ? JSON.parse(data) : [];
    return allEntries
      .filter(e => e.cashbookId === cashbookId)
      .sort((a, b) => {
        // Sort by date desc, then time desc
        const dateA = new Date(`${a.date}T${a.time}`).getTime();
        const dateB = new Date(`${b.date}T${b.time}`).getTime();
        return dateB - dateA;
      });
  },

  getEntry: (id: string): Entry | undefined => {
    const data = localStorage.getItem(KEYS.ENTRIES);
    const allEntries: Entry[] = data ? JSON.parse(data) : [];
    return allEntries.find(e => e.id === id);
  },

  addEntry: (entry: Entry) => {
    const data = localStorage.getItem(KEYS.ENTRIES);
    const allEntries: Entry[] = data ? JSON.parse(data) : [];
    
    allEntries.push(entry);
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(allEntries));
    DB.touchCashbook(entry.cashbookId);
  },

  updateEntry: (updatedEntry: Entry) => {
    const data = localStorage.getItem(KEYS.ENTRIES);
    let allEntries: Entry[] = data ? JSON.parse(data) : [];
    
    const index = allEntries.findIndex(e => e.id === updatedEntry.id);
    if (index !== -1) {
      const oldEntry = allEntries[index];
      // Generate Logs
      const changes: EntryChangeLog[] = [];
      const fieldsToCheck: (keyof Entry)[] = ['amount', 'remarks', 'date', 'time', 'paymentMode', 'category', 'type'];
      
      fieldsToCheck.forEach(field => {
        if (oldEntry[field] !== updatedEntry[field]) {
          changes.push({
            id: crypto.randomUUID(),
            entryId: updatedEntry.id,
            fieldName: field,
            oldValue: String(oldEntry[field]),
            newValue: String(updatedEntry[field]),
            timestamp: Date.now(),
          });
        }
      });

      if (changes.length > 0) {
        DB.saveLogs(changes);
      }

      allEntries[index] = updatedEntry;
      localStorage.setItem(KEYS.ENTRIES, JSON.stringify(allEntries));
      DB.touchCashbook(updatedEntry.cashbookId);
    }
  },

  touchCashbook: (id: string) => {
    const books = DB.getCashbooks();
    const idx = books.findIndex(b => b.id === id);
    if (idx !== -1) {
      books[idx].lastUpdated = Date.now();
      localStorage.setItem(KEYS.CASHBOOKS, JSON.stringify(books));
    }
  },

  // --- Logs ---
  getLogs: (entryId: string): EntryChangeLog[] => {
    const data = localStorage.getItem(KEYS.LOGS);
    const allLogs: EntryChangeLog[] = data ? JSON.parse(data) : [];
    return allLogs.filter(l => l.entryId === entryId).sort((a, b) => b.timestamp - a.timestamp);
  },

  saveLogs: (newLogs: EntryChangeLog[]) => {
    const data = localStorage.getItem(KEYS.LOGS);
    const allLogs: EntryChangeLog[] = data ? JSON.parse(data) : [];
    localStorage.setItem(KEYS.LOGS, JSON.stringify([...allLogs, ...newLogs]));
  },

  // --- Bulk Import ---
  importEntries: (entries: Entry[], cashbookId: string) => {
    const data = localStorage.getItem(KEYS.ENTRIES);
    const allEntries: Entry[] = data ? JSON.parse(data) : [];
    
    // Add new entries
    const finalEntries = [...allEntries, ...entries];
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(finalEntries));
    
    // Create logs for imports
    const logs = entries.map(e => ({
      id: crypto.randomUUID(),
      entryId: e.id,
      fieldName: 'Import',
      oldValue: 'null',
      newValue: 'Imported from CSV',
      timestamp: Date.now(),
    }));
    DB.saveLogs(logs);
    DB.touchCashbook(cashbookId);
  },
  
  // --- Calculation Helpers ---
  calculateTotals: (entries: Entry[]) => {
    let totalIn = 0;
    let totalOut = 0;
    
    // Sort ascending for running balance
    const sorted = [...entries].sort((a, b) => {
        return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
    });

    sorted.forEach(e => {
        if (e.type === EntryType.IN) totalIn += e.amount;
        else totalOut += e.amount;
    });

    return { totalIn, totalOut, net: totalIn - totalOut };
  }
};