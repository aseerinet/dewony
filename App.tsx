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

const INITIAL_DATA: AppData = {
  clients: [],
  debts: []
};

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b'];

export default function App() {
  // --- STATE ---
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

  useEffect(() => {
    localStorage.setItem('debtCollectorData', JSON.stringify(data));
  }, [data]);

  // --- ACTIONS ---
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
          if (confirm('سيتم استبدال البيانات الحالية بالنسخة المرفوعة. هل تريد الاستمرار؟')) {
            setData(json);
            alert('تم استعادة البيانات بنجاح ✅');
          }
        }
      } catch (err) { alert('خطأ في الملف ❌'); }
    };
    reader.readAsText(file);
    event.target.value = ''; 
  };

  const resetAppData = () => {
    if (confirm('سيتم حذف جميع البيانات نهائياً. هل أنت متأكد؟')) {
      setData({ clients: [], debts: [] });
      setCurrentView('DASHBOARD');
      localStorage.removeItem('debtCollectorData');
    }
  };

  const addClient = (client: Omit<Client, 'id' | 'createdAt'>) => {
    const newClient: Client = { ...client, id: generateId(), createdAt: Date.now() };
    setData(prev => ({ ...prev, clients: [newClient, ...prev.clients] }));
    setCurrentView('CLIENTS_LIST');
  };

  const saveDebt = (debtData: any, isEdit: boolean) => {
    const { id, clientId, itemName, baseValue, profitPercentage, monthCount, startDate, paymentDay, installments } = debtData;
    const finalTotal = installments.reduce((sum: number, i: any) => sum + Number(i.amount), 0);
    const profitVal = finalTotal - Number(baseValue);
    const procInst = installments.map((inst: any) => ({
      ...inst, id: inst.id || generateId(), debtId: isEdit ? id : 'temp', status: inst.status || InstallmentStatus.PENDING
    }));

    if (isEdit) {
       setData(prev => ({
         ...prev, debts: prev.debts.map(d => d.id === id ? { ...d, itemName, baseValue, profitPercentage, profitValue: profitVal, totalValue: finalTotal, monthCount, startDate: new Date(startDate).getTime(), paymentDay, installments: procInst } : d)
       }));
    } else {
      const newDebt: Debt = { id: generateId(), clientId, itemName, baseValue, profitPercentage, profitValue: profitVal, totalValue: finalTotal, monthCount, startDate: new Date(startDate).getTime(), paymentDay, isFullyPaid: false, installments: procInst };
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
        const currentInst = debt.installments.find(i => i.id === installmentId);
        if(!currentInst) return debt;
        const updated = { ...currentInst, amount: paidAmount, status: paidAmount === 0 ? InstallmentStatus.POSTPONED : InstallmentStatus.PAID, paidDate, notes };
        const all = [...past, updated, ...newFutureInstallments].sort((a, b) => a.dueDate - b.dueDate);
        return { ...debt, installments: all, isFullyPaid: all.every(i => i.status !== InstallmentStatus.PENDING), monthCount: all.length };
      });
      return { ...prev, debts: newDebts };
    });
    setCurrentView('CLIENT_DETAILS');
  };

  const stats = useMemo(() => {
    let tL = 0, tPr = 0, tC = 0, tPe = 0;
    data.debts.forEach(debt => {
      tL += debt.baseValue; tPr += debt.profitValue;
      debt.installments.forEach(inst => {
        if (inst.status === InstallmentStatus.PAID) tC += inst.amount;
        else if (inst.status !== InstallmentStatus.POSTPONED) tPe += inst.amount;
      });
    });
    return { totalLoaned: tL, totalProfit: tPr, totalCollected: tC, totalPending: tPe };
  }, [data.debts]);

  // --- VIEWS ---

  const DashboardView = () => (
    <div className="pb-24 animate-fade-in">
      <header className="bg-white p-6 pb-8 rounded-b-3xl shadow-sm mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">مرحباً 👋</h1>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <div className="flex items-center gap-2 mb-2 text-blue-600"><Wallet size={20} /><span className="text-xs font-semibold">إجمالي الديون</span></div>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(stats.totalLoaned + stats.totalProfit)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
            <div className="flex items-center gap-2 mb-2 text-green-600"><CheckCircle2 size={20} /><span className="text-xs font-semibold">المحصل</span></div>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(stats.totalCollected)}</p>
          </div>
        </div>
      </header>
      <div className="px-4"><div className="bg-white p-5 rounded-2xl shadow-sm"><h3 className="font-bold text-gray-800 mb-4">تحليل الأداء</h3><div className="h-48 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ name: 'رأس المال', value: stats.totalLoaned }, { name: 'الأرباح', value: stats.totalProfit }, { name: 'المتبقي', value: stats.totalPending }]} barSize={40}><XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} /><Bar dataKey="value" radius={[4, 4, 0, 0]}>{ [stats.totalLoaned, stats.totalProfit, stats.totalPending].map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />) }</Bar></BarChart></ResponsiveContainer></div></div></div>
    </div>
  );

  const ClientsListView = () => {
    const clientsWithInfo = useMemo(() => {
      return data.clients.map(client => {
        const clientDebts = data.debts.filter(d => d.clientId === client.id);
        const total = clientDebts.reduce((acc, curr) => acc + curr.totalValue, 0);
        const paid = clientDebts.reduce((acc, d) => acc + d.installments.filter(i => i.status === InstallmentStatus.PAID).reduce((s, i) => s + i.amount, 0), 0);
        const remaining = total - paid;
        const nextDate = clientDebts.flatMap(d => d.installments).filter(i => i.status === InstallmentStatus.PENDING).sort((a, b) => a.dueDate - b.dueDate)[0]?.dueDate || Infinity;
        return { ...client, remaining, nextDate };
      });
    }, [data.clients, data.debts]);

    const sortedClients = useMemo(() => {
      return clientsWithInfo.filter(c => c.name.includes(searchTerm) || c.phone.includes(searchTerm)).sort((a, b) => {
        const aP = a.remaining <= 0; const bP = b.remaining <= 0;
        if (aP && !bP) return 1; if (!aP && bP) return -1;
        if (!aP && !bP) return a.nextDate - b.nextDate;
        return 0;
      });
    }, [clientsWithInfo, searchTerm]);

    return (
      <div className="pb-24 pt-4 px-4 h-full flex flex-col">
        <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold">العملاء</h2><button onClick={() => setCurrentView('ADD_CLIENT')} className="text-blue-600 p-2 bg-blue-50 rounded-full"><UserPlus size={24} /></button></div>
        <div className="relative mb-6"><input type="text" placeholder="بحث باسم العميل..." className="w-full bg-white pl-4 pr-10 py-3 rounded-xl shadow-sm text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /><Search className="absolute right-3 top-3 text-gray-400" size={20} /></div>
        <div className="space-y-3 overflow-y-auto no-scrollbar pb-20">
          {sortedClients.map(client => (
            <div key={client.id} onClick={() => { setSelectedClientId(client.id); setSelectedDebtIds([]); setCurrentView('CLIENT_DETAILS'); }} className={`bg-white p-4 rounded-xl shadow-sm cursor-pointer ${client.remaining <= 0 ? 'opacity-50 grayscale border-dashed border-gray-200' : ''}`}>
              <div className="flex justify-between items-start">
                <div><h3 className="font-bold text-gray-800">{client.name}</h3>{client.remaining > 0 && client.nextDate !== Infinity && (<p className="text-[10px] text-blue-600 font-medium mt-1">القسط القادم: {formatDate(client.nextDate)}</p>)}</div>
                <div className="text-left"><span className="block text-xs text-gray-400">المتبقي</span><span className={`font-bold ${client.remaining <= 0 ? 'text-gray-400' : 'text-red-500'}`}>{client.remaining <= 0 ? '0' : formatCurrency(client.remaining)}</span></div>
              </div>
            </div>
          ))}
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
      let text = `مرحباً ${client.name}،\nإليك كشف حسابك:\n\n`;
      let tA = 0, pA = 0;
      selected.forEach(d => {
        const p = d.installments.filter(i => i.status === InstallmentStatus.PAID).reduce((s, i) => s + i.amount, 0);
        text += `📌 *${d.itemName}*\n- إجمالي: ${formatCurrency(d.totalValue)}\n- المتبقي: ${formatCurrency(d.totalValue - p)}\n\n`;
        tA += d.totalValue; pA += p;
      });
      if (selected.length > 1) text += `📊 *الإجمالي:* ${formatCurrency(tA - pA)}\n\n`;
      text += `شكراً لك.`;
      setSummaryPreview({ text, phone: client.phone.replace(/\D/g, '') });
    };

    const sendReceipt = (debt: Debt, inst: Installment, num: number) => {
      const msg = `سند سداد قسط\nالعميل: ${client.name}\nالمبلغ: ${formatCurrency(inst.amount)}\nالتاريخ: ${formatDate(inst.paidDate || Date.now())}\nشكراً لك.`;
      window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
      <div className="pb-24 bg-gray-50 min-h-screen">
        <div className="bg-white pb-6 pt-4 px-4 rounded-b-3xl shadow-sm sticky top-0 z-10 text-center">
          <div className="flex items-center justify-between mb-4"><button onClick={() => setCurrentView('CLIENTS_LIST')} className="p-2 text-gray-600"><ArrowLeft /></button><h2 className="font-bold">ملف العميل</h2><div className="flex gap-2"><button onClick={() => { setEditClientName(client.name); setEditClientPhone(client.phone); setIsEditClientOpen(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-full"><Edit size={20} /></button></div></div>
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-2">{client.name[0]}</div>
          <h1 className="text-xl font-bold">{client.name}</h1>
          <button onClick={handlePrepareSummary} className="mt-4 flex items-center gap-2 bg-green-50 text-green-700 px-6 py-2 rounded-xl font-bold mx-auto"><Send size={16} /> كشف حساب المختارة</button>
        </div>
        <div className="px-4 mt-6 space-y-6">
          {clientDebts.map(debt => (
            <div key={debt.id} className={`bg-white rounded-2xl shadow-sm border ${selectedDebtIds.includes(debt.id) ? 'border-blue-500 ring-1' : 'border-gray-100'}`}>
               <div className="p-4 border-b bg-gray-50/50 flex justify-between items-start">
                 <div className="flex items-center gap-3"><input type="checkbox" checked={selectedDebtIds.includes(debt.id)} onChange={() => toggleDebtSelection(debt.id)} className="w-5 h-5 rounded text-blue-600" /><div><h4 className="font-bold">{debt.itemName}</h4><p className="text-xs text-gray-500">أصل: {formatCurrency(debt.baseValue)}</p></div></div>
                 <button onClick={() => { setEditingDebtId(debt.id); setCurrentView('EDIT_DEBT'); }} className="p-2 bg-gray-100 rounded-lg"><Edit size={16} /></button>
               </div>
               <div className="divide-y divide-gray-100">
                 {debt.installments.map((inst, idx) => (
                   <div key={inst.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                     <div className="flex items-center gap-3"><span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${inst.status === InstallmentStatus.PAID ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{idx + 1}</span><div><p className="text-sm font-medium">{formatCurrency(inst.amount)}</p><p className="text-xs text-gray-400">{formatDate(inst.dueDate)}</p></div></div>
                     {inst.status === InstallmentStatus.PAID || inst.status === InstallmentStatus.POSTPONED ? (<div className="flex gap-2">{inst.status === InstallmentStatus.PAID && (<button onClick={() => sendReceipt(debt, inst, idx + 1)} className="text-green-600 bg-green-50 p-1.5 rounded-md"><Receipt size={16} /></button>)}<span className="text-xs font-bold px-2 py-1 bg-gray-100 rounded-md">مدفوع</span></div>) : (<button onClick={() => { setEditingDebtId(debt.id); setSelectedInstallmentId(inst.id); setCurrentView('RECORD_PAYMENT'); }} className="text-xs font-medium bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg">تسجيل سداد</button>)}
                   </div>
                 ))}
               </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const RecordPaymentView = () => {
    const debt = data.debts.find(d => d.id === editingDebtId);
    const inst = debt?.installments.find(i => i.id === selectedInstallmentId);
    if (!debt || !inst) return null;
    const future = useMemo(() => {
        const curIdx = debt.installments.findIndex(i => i.id === inst.id);
        return debt.installments.slice(curIdx + 1);
    }, [debt, inst]);
    const [amt, setAmt] = useState<number>(inst.amount);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [remMonths, setRemMonths] = useState<number>(future.length);
    const [preview, setPreview] = useState<Installment[]>([]);
    const balance = debt.totalValue - debt.installments.filter(i => i.status === InstallmentStatus.PAID && i.id !== inst.id).reduce((s, i) => s + i.amount, 0) - amt;

    useEffect(() => {
        if (balance <= 0 && remMonths <= 0) { setPreview([]); return; }
        const safeM = (balance > 1 && remMonths === 0) ? 1 : remMonths;
        if (safeM > 0) {
            const plan = calculatePlan(Math.max(0, balance), safeM, new Date(date), debt.paymentDay);
            setPreview(plan.map(p => ({ ...p, id: generateId(), debtId: debt.id, status: InstallmentStatus.PENDING })));
        }
    }, [amt, remMonths, date, balance, debt]);

    return (
      <div className="bg-gray-50 min-h-screen pb-20 animate-fade-in">
        <div className="bg-white p-4 border-b flex items-center shadow-sm sticky top-0 z-20"><button onClick={() => setCurrentView('CLIENT_DETAILS')} className="p-2 text-gray-600"><ArrowLeft /></button><h2 className="text-xl font-bold ml-2">تسجيل دفعة</h2></div>
        <div className="p-4 space-y-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4">
            <div><label className="block text-xs text-gray-500 mb-1">المبلغ المدفوع</label><input type="number" value={amt} onChange={e => setAmt(Number(e.target.value))} className="w-full p-3 bg-gray-50 border rounded-xl font-bold" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">تاريخ السداد</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-xl" /></div>
          </div>
          {balance > 0 && (
            <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4 border-t-4 border-orange-400">
              <div className="flex justify-between items-center font-bold text-orange-600"><h3>جدولة المتبقي</h3><span>{formatCurrency(balance)}</span></div>
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl"><span className="text-sm font-medium">عدد الأشهر القادمة</span><div className="flex items-center gap-4"><button onClick={() => setRemMonths(Math.max(1, remMonths - 1))} className="w-8 h-8 rounded-full bg-white shadow-sm border flex items-center justify-center text-red-500">-</button><span className="font-bold">{remMonths}</span><button onClick={() => setRemMonths(remMonths + 1)} className="w-8 h-8 rounded-full bg-white shadow-sm border flex items-center justify-center text-green-600">+</button></div></div>
              <div className="border rounded-xl overflow-hidden divide-y divide-gray-100">{preview.map((p, i) => (<div key={i} className="p-2 flex justify-between text-xs bg-white"><span>قسط {i+1}</span><span className="font-bold">{formatCurrency(p.amount)}</span><span>{formatDate(p.dueDate)}</span></div>))}</div>
            </div>
          )}
          <button onClick={() => processPayment(debt.id, inst.id, amt, new Date(date).getTime(), '', preview)} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-100">تأكيد السداد والجدولة</button>
        </div>
      </div>
    );
  };

  const DebtFormView = () => {
    const isEdit = currentView === 'EDIT_DEBT';
    const existing = isEdit ? data.debts.find(d => d.id === editingDebtId) : null;
    const [name, setName] = useState(existing?.itemName || '');
    const [base, setBase] = useState<number | ''>(existing?.baseValue || '');
    const [profit, setProfit] = useState<number>(existing?.profitPercentage || 10);
    const [mths, setMths] = useState<number>(existing?.monthCount || 6);
    const [start, setStart] = useState(new Date().toISOString().split('T')[0]);
    const [day, setDay] = useState(existing?.paymentDay || 27);
    const [plan, setPlan] = useState<any[]>(existing?.installments || []);

    const total = Number(base) + (Number(base) * (profit / 100));

    const handleCreatePlan = () => {
        const p = calculatePlan(total, mths, new Date(start), day);
        setPlan(p.map(x => ({ ...x, id: generateId(), debtId: isEdit ? editingDebtId : 'temp' })));
    };

    return (
      <div className="bg-gray-50 min-h-screen pb-24">
        <div className="bg-white p-4 border-b flex items-center"><button onClick={() => setCurrentView('CLIENT_DETAILS')} className="p-2 text-gray-600"><ArrowLeft /></button><h2 className="text-xl font-bold ml-2">{isEdit ? 'تعديل' : 'إضافة'} مديونية</h2></div>
        <div className="p-4 space-y-4">
           <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
             <div><label className="block text-xs text-gray-500 mb-1">اسم السلعة</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-gray-50 rounded-lg border" /></div>
             <div><label className="block text-xs text-gray-500 mb-1">رأس المال</label><input type="number" value={base} onChange={e => setBase(Number(e.target.value))} className="w-full p-3 bg-gray-50 rounded-lg border font-bold" /></div>
             <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs text-gray-500 mb-1">الربح %</label><input type="number" value={profit} onChange={e => setProfit(Number(e.target.value))} className="w-full p-3 bg-gray-50 rounded-lg border" /></div><div><label className="block text-xs text-gray-500 mb-1">الأشهر</label><input type="number" value={mths} onChange={e => setMths(Number(e.target.value))} className="w-full p-3 bg-gray-50 rounded-lg border" /></div></div>
             <button onClick={handleCreatePlan} className="w-full py-2 bg-gray-100 text-gray-700 font-bold rounded-lg border border-gray-200">إنشاء جدول الأقساط</button>
           </div>
           <button onClick={() => saveDebt({ id: editingDebtId, clientId: selectedClientId, itemName: name, baseValue: base, profitPercentage: profit, monthCount: mths, startDate: start, paymentDay: day, installments: plan }, isEdit)} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200">حفظ المديونية</button>
        </div>
      </div>
    );
  };

  const AddClientView = () => {
    const [n, setN] = useState('');
    const [p, setP] = useState('');
    return (
      <div className="bg-white min-h-screen p-6 animate-fade-in">
        <div className="flex items-center mb-8"><button onClick={() => setCurrentView('CLIENTS_LIST')} className="p-2 text-gray-600 ml-2"><ArrowLeft /></button><h2 className="text-xl font-bold">إضافة عميل</h2></div>
        <div className="space-y-4"><input value={n} onChange={e => setN(e.target.value)} placeholder="اسم العميل" className="w-full p-4 bg-gray-50 rounded-xl" /><input value={p} onChange={e => setP(e.target.value)} placeholder="رقم الجوال" className="w-full p-4 bg-gray-50 rounded-xl" /><button onClick={() => addClient({ name: n, phone: p, nationalId: '' })} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg">حفظ العميل</button></div>
      </div>
    );
  };

  return (
    <>
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen relative shadow-2xl font-tajawal overflow-hidden">
        {currentView === 'DASHBOARD' && <DashboardView />}
        {currentView === 'CLIENTS_LIST' && <ClientsListView />}
        {currentView === 'CLIENT_DETAILS' && <ClientDetailsView />}
        {currentView === 'RECORD_PAYMENT' && <RecordPaymentView />}
        {(currentView === 'ADD_DEBT' || currentView === 'EDIT_DEBT') && <DebtFormView />}
        <TabBar currentView={currentView} onChangeView={setCurrentView} />
      </div>

      {summaryPreview && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg">معاينة الرسالة</h3><button onClick={() => setSummaryPreview(null)} className="p-1 bg-gray-100 rounded-full"><X size={20}/></button></div>
            <div className="bg-gray-50 p-4 rounded-2xl text-sm whitespace-pre-wrap max-h-[40vh] overflow-y-auto mb-6 border border-gray-100 leading-relaxed font-tajawal">{summaryPreview.text}</div>
            <div className="flex gap-3">
              <button onClick={() => { window.open(`https://wa.me/${summaryPreview.phone}?text=${encodeURIComponent(summaryPreview.text)}`, '_blank'); setSummaryPreview(null); }} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"><Send size={20}/> إرسال الآن</button>
              <button onClick={() => setSummaryPreview(null)} className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
