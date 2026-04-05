import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserPlus, Calendar, CheckCircle2, 
  AlertCircle, ArrowLeft, Search, Phone, FileText, Send, 
  Trash2, TrendingUp, Wallet, Receipt, Edit, Save, Calculator, Clock,
  Percent, Coins, RefreshCw, Plus, Minus, Settings, Download, Upload, Database, X
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { TabBar } from './components/TabBar';
import { Client, Debt, Installment, AppData, ViewState, InstallmentStatus } from './types';
import { formatCurrency, formatDate, generateId, calculatePlan } from './utils';

const INITIAL_DATA: AppData = { clients: [], debts: [] };
const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b'];

export default function App() {
  const [postponedInfo, setPostponedInfo] = useState<{ date: number; note: string } | null>(null);
  const [selectedDebtIds, setSelectedDebtIds] = useState<string[]>([]);
  const [summaryPreview, setSummaryPreview] = useState<{ text: string; phone: string } | null>(null);
  
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem('debtCollectorData');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.clients && parsed.debts) return parsed;
      } catch (e) { console.error("Error parsing saved data", e); }
    }
    return INITIAL_DATA;
  });

  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');

  useEffect(() => { localStorage.setItem('debtCollectorData', JSON.stringify(data)); }, [data]);

  const exportData = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `debt_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.clients && json.debts) {
          if (confirm('سيتم استبدال البيانات الحالية بالنسخة المرفوعة؟')) { setData(json); alert('تمت الاستعادة ✅'); }
        }
      } catch (err) { alert('خطأ في الملف ❌'); }
    };
    reader.readAsText(file);
    event.target.value = ''; 
  };

  const saveDebt = (debtData: any, isEdit: boolean) => {
    const { id, clientId, itemName, baseValue, profitPercentage, monthCount, startDate, paymentDay, installments } = debtData;
    const finalInstallmentsTotal = installments.reduce((sum: number, i: any) => sum + Number(i.amount), 0);
    const profitValue = finalInstallmentsTotal - Number(baseValue);
    const processedInstallments = installments.map((inst: any) => ({
      ...inst, id: inst.id || generateId(), debtId: isEdit ? id : 'temp', status: inst.status || InstallmentStatus.PENDING
    }));

    if (isEdit) {
       setData(prev => ({
         ...prev, debts: prev.debts.map(d => d.id === id ? { ...d, itemName, baseValue, profitPercentage, profitValue, totalValue: finalInstallmentsTotal, monthCount, startDate: new Date(startDate).getTime(), paymentDay, installments: processedInstallments } : d)
       }));
    } else {
      const newDebt: Debt = { id: generateId(), clientId, itemName, baseValue, profitPercentage, profitValue, totalValue: finalInstallmentsTotal, monthCount, startDate: new Date(startDate).getTime(), paymentDay, isFullyPaid: false, installments: processedInstallments };
      newDebt.installments.forEach(i => i.debtId = newDebt.id);
      setData(prev => ({ ...prev, debts: [newDebt, ...prev.debts] }));
    }
    setCurrentView('CLIENT_DETAILS');
  };

  const processPayment = (debtId: string, installmentId: string, paidAmount: number, paidDate: number, notes: string, newFutureInstallments: Installment[]) => {
    setData(prev => {
      const newDebts = prev.debts.map(debt => {
        if (debt.id !== debtId) return debt;
        const past = debt.installments.filter(i => i.id !== installmentId && (i.status === InstallmentStatus.PAID || i.status === InstallmentStatus.POSTPONED));
        const updated = { ...debt.installments.find(i => i.id === installmentId)!, amount: paidAmount, status: paidAmount === 0 ? InstallmentStatus.POSTPONED : InstallmentStatus.PAID, paidDate, notes };
        const all = [...past, updated, ...newFutureInstallments].sort((a, b) => a.dueDate - b.dueDate);
        return { ...debt, installments: all, isFullyPaid: all.every(i => i.status !== InstallmentStatus.PENDING), monthCount: all.length };
      });
      return { ...prev, debts: newDebts };
    });
    setCurrentView('CLIENT_DETAILS');
  };

  const stats = useMemo(() => {
    let totalLoaned = 0, totalProfit = 0, totalCollected = 0, totalPending = 0;
    data.debts.forEach(debt => {
      totalLoaned += debt.baseValue; totalProfit += debt.profitValue;
      debt.installments.forEach(inst => {
        if (inst.status === InstallmentStatus.PAID) totalCollected += inst.amount;
        else if (inst.status !== InstallmentStatus.POSTPONED) totalPending += inst.amount;
      });
    });
    return { totalLoaned, totalProfit, totalCollected, totalPending };
  }, [data.debts]);

  const DashboardView = () => (
    <div className="pb-24 animate-fade-in">
      <header className="bg-white p-6 pb-8 rounded-b-3xl shadow-sm mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">مرحباً بك 👋</h1>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <div className="flex items-center gap-2 mb-2 text-blue-600"><Wallet size={20} /><span className="text-xs font-semibold">إجمالي الديون</span></div>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(stats.totalLoaned + stats.totalProfit)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
            <div className="flex items-center gap-2 mb-2 text-green-600"><CheckCircle2 size={20} /><span className="text-xs font-semibold">تم تحصيله</span></div>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(stats.totalCollected)}</p>
          </div>
        </div>
      </header>
      <div className="px-4 space-y-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp size={18} /> تحليل الأداء</h3>
          <div className="h-48 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ name: 'رأس المال', value: stats.totalLoaned }, { name: 'الأرباح', value: stats.totalProfit }, { name: 'المتبقي', value: stats.totalPending }]} barSize={40}>
                  <XAxis dataKey="name" tick={{fill: '#6b7280', fontSize: 12}} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>{ [stats.totalLoaned, stats.totalProfit, stats.totalPending].map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />) }</Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  const ClientsListView = () => {
    const clientsWithInfo = useMemo(() => {
      return data.clients.map(client => {
        const clientDebts = data.debts.filter(d => d.clientId === client.id);
        const total = clientDebts.reduce((acc, curr) => acc + curr.totalValue, 0);
        const paid = clientDebts.reduce((acc, d) => acc + d.installments.filter(i => i.status === InstallmentStatus.PAID).reduce((s, i) => s + i.amount, 0), 0);
        const remaining = total - paid;
        
        const nextInstallmentDate = clientDebts.flatMap(d => d.installments)
          .filter(i => i.status === InstallmentStatus.PENDING)
          .sort((a, b) => a.dueDate - b.dueDate)[0]?.dueDate || Infinity;

        return { ...client, remaining, total, paid, nextInstallmentDate };
      });
    }, [data.clients, data.debts]);

    const filteredClients = useMemo(() => {
      return clientsWithInfo
        .filter(c => c.name.includes(searchTerm) || c.phone.includes(searchTerm))
        .sort((a, b) => {
          const aPaid = a.remaining <= 0;
          const bPaid = b.remaining <= 0;
          if (aPaid && !bPaid) return 1;
          if (!aPaid && bPaid) return -1;
          if (!aPaid && !bPaid) return a.nextInstallmentDate - b.nextInstallmentDate;
          return 0;
        });
    }, [clientsWithInfo, searchTerm]);

    return (
      <div className="pb-24 pt-4 px-4 h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">العملاء</h2>
          <button onClick={() => setCurrentView('ADD_CLIENT')} className="text-blue-600 p-2 bg-blue-50 rounded-full"><UserPlus size={24} /></button>
        </div>
        <div className="relative mb-6">
          <input type="text" placeholder="بحث باسم العميل أو الجوال..." className="w-full bg-white pl-4 pr-10 py-3 rounded-xl shadow-sm text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <Search className="absolute right-3 top-3 text-gray-400" size={20} />
        </div>
        <div className="space-y-3 overflow-y-auto no-scrollbar">
          {filteredClients.map(client => {
            const isPaid = client.remaining <= 0;
            return (
              <div key={client.id} onClick={() => { setSelectedClientId(client.id); setSelectedDebtIds([]); setCurrentView('CLIENT_DETAILS'); }} className={`bg-white p-4 rounded-xl shadow-sm cursor-pointer ${isPaid ? 'opacity-50 grayscale border-dashed border-gray-200' : 'border border-transparent'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`font-bold ${isPaid ? 'text-gray-400' : 'text-gray-800'}`}>{client.name}</h3>
                    {!isPaid && client.nextInstallmentDate !== Infinity && (
                      <p className="text-[10px] text-blue-600 font-medium mt-1">القادم: {formatDate(client.nextInstallmentDate)}</p>
                    )}
                  </div>
                  <div className="text-left">
                    <span className="block text-xs text-gray-400">المتبقي</span>
                    <span className={`font-bold ${isPaid ? 'text-gray-400' : 'text-red-500'}`}>{isPaid ? '0' : formatCurrency(client.remaining)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const ClientDetailsView = () => {
    const client = data.clients.find(c => c.id === selectedClientId);
    if (!client) return null;
    const clientDebts = data.debts.filter(d => d.clientId === client.id);

    const toggleDebtSelection = (id: string) => {
      setSelectedDebtIds(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
    };

    const handlePrepareSummary = () => {
      const selected = selectedDebtIds.length > 0 ? clientDebts.filter(d => selectedDebtIds.includes(d.id)) : clientDebts;
      if (selected.length === 0) return alert('لا توجد مديونيات');
      
      let text = `مرحباً ${client.name}،\nإليك ملخص حسابك:\n\n`;
      let tAll = 0, pAll = 0;
      selected.forEach(d => {
        const p = d.installments.filter(i => i.status === InstallmentStatus.PAID).reduce((s, i) => s + i.amount, 0);
        text += `📌 *${d.itemName}*\n- إجمالي: ${formatCurrency(d.totalValue)}\n- المتبقي: ${formatCurrency(d.totalValue - p)}\n\n`;
        tAll += d.totalValue; pAll += p;
      });
      if (selected.length > 1) text += `📊 *الإجمالي:* ${formatCurrency(tAll - pAll)}\n\n`;
      text += `شكراً لك.`;
      setSummaryPreview({ text, phone: client.phone.replace(/\D/g, '') });
    };

    return (
      <div className="pb-24 bg-gray-50 min-h-screen">
        <div className="bg-white pb-6 pt-4 px-4 rounded-b-3xl shadow-sm sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentView('CLIENTS_LIST')} className="p-2 text-gray-600"><ArrowLeft /></button>
            <h2 className="font-bold">ملف العميل</h2>
            <div className="flex gap-2">
              <button onClick={() => { setEditClientName(client.name); setEditClientPhone(client.phone); setIsEditClientOpen(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-full"><Edit size={20} /></button>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mb-2">{client.name[0]}</div>
            <h1 className="text-xl font-bold">{client.name}</h1>
            <button onClick={handlePrepareSummary} className="mt-4 flex items-center gap-2 bg-green-50 text-green-700 px-6 py-2 rounded-xl font-bold"><Send size={18} /> كشف حساب المختارة</button>
          </div>
        </div>
        <div className="px-4 mt-6 space-y-4">
          {clientDebts.map(debt => (
            <div key={debt.id} className={`bg-white rounded-2xl border transition-all ${selectedDebtIds.includes(debt.id) ? 'border-blue-500 ring-1' : 'border-gray-100'}`}>
              <div className="p-4 flex items-center gap-3">
                <input type="checkbox" checked={selectedDebtIds.includes(debt.id)} onChange={() => toggleDebtSelection(debt.id)} className="w-5 h-5 rounded text-blue-600" />
                <div className="flex-1">
                  <h4 className="font-bold">{debt.itemName}</h4>
                  <p className="text-xs text-gray-500">{formatCurrency(debt.totalValue)}</p>
                </div>
                <button onClick={() => { setEditingDebtId(debt.id); setCurrentView('EDIT_DEBT'); }} className="p-2 text-gray-400"><Edit size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen relative shadow-2xl font-tajawal overflow-x-hidden">
        {currentView === 'DASHBOARD' && <DashboardView />}
        {currentView === 'CLIENTS_LIST' && <ClientsListView />}
        {currentView === 'CLIENT_DETAILS' && <ClientDetailsView />}
        {(currentView === 'ADD_DEBT' || currentView === 'EDIT_DEBT') && <DebtFormView data={data} selectedClientId={selectedClientId} editingDebtId={editingDebtId} saveDebt={saveDebt} setCurrentView={setCurrentView} />}
        {currentView === 'RECORD_PAYMENT' && <RecordPaymentView data={data} editingDebtId={editingDebtId} selectedInstallmentId={selectedInstallmentId} processPayment={processPayment} setCurrentView={setCurrentView} />}
        {currentView === 'SETTINGS' && <SettingsView exportData={exportData} importData={importData} setData={setData} setCurrentView={setCurrentView} />}
        <TabBar currentView={currentView} onChangeView={setCurrentView} />
      </div>

      {/* مودال معاينة كشف الحساب */}
      {summaryPreview && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">معاينة كشف الحساب</h3>
              <button onClick={() => setSummaryPreview(null)} className="p-1 bg-gray-100 rounded-full"><X size={20}/></button>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl text-sm whitespace-pre-wrap max-h-[40vh] overflow-y-auto mb-6 border border-gray-100 leading-relaxed">
              {summaryPreview.text}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { window.open(`https://wa.me/${summaryPreview.phone}?text=${encodeURIComponent(summaryPreview.text)}`, '_blank'); setSummaryPreview(null); }} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"><Send size={20}/> إرسال عبر واتساب</button>
              <button onClick={() => setSummaryPreview(null)} className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
