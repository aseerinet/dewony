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

[span_7](start_span)const INITIAL_DATA: AppData = { clients: [], debts: [] };[span_7](end_span)
[span_8](start_span)const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b'];[span_8](end_span)

export default function App() {
  // --- STATE ---
  [span_9](start_span)const [postponedInfo, setPostponedInfo] = useState<{ date: number; note: string } | null>(null);[span_9](end_span)
  [span_10](start_span)const [selectedDebtIds, setSelectedDebtIds] = useState<string[]>([]);[span_10](end_span)
  const [summaryPreview, setSummaryPreview] = useState<{ text: string; phone: string } | null>(null); // نافذة المعاينة الجديدة
  
  const [data, setData] = useState<AppData>(() => {
    [span_11](start_span)const saved = localStorage.getItem('debtCollectorData');[span_11](end_span)
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.clients && parsed.debts) return parsed;
      } catch (e) { console.error("Error parsing saved data", e); }
    }
    return INITIAL_DATA;
  });

  [span_12](start_span)const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');[span_12](end_span)
  [span_13](start_span)const [selectedClientId, setSelectedClientId] = useState<string | null>(null);[span_13](end_span)
  [span_14](start_span)const [editingDebtId, setEditingDebtId] = useState<string | null>(null);[span_14](end_span)
  [span_15](start_span)const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | null>(null);[span_15](end_span)
  [span_16](start_span)const [searchTerm, setSearchTerm] = useState('');[span_16](end_span)
  [span_17](start_span)const [isEditClientOpen, setIsEditClientOpen] = useState(false);[span_17](end_span)
  [span_18](start_span)const [editClientName, setEditClientName] = useState('');[span_18](end_span)
  [span_19](start_span)const [editClientPhone, setEditClientPhone] = useState('');[span_19](end_span)

  useEffect(() => {
    [span_20](start_span)localStorage.setItem('debtCollectorData', JSON.stringify(data));[span_20](end_span)
  }, [data]);

  // --- ACTIONS ---
  const exportData = () => {
    [span_21](start_span)const dataStr = JSON.stringify(data, null, 2);[span_21](end_span)
    [span_22](start_span)const blob = new Blob([dataStr], { type: "application/json" });[span_22](end_span)
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    [span_23](start_span)link.download = `debt_backup_${new Date().toISOString().split('T')[0]}.json`;[span_23](end_span)
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    [span_24](start_span)const file = event.target.files?.[0];[span_24](end_span)
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        [span_25](start_span)const json = JSON.parse(e.target?.result as string);[span_25](end_span)
        [span_26](start_span)if (json.clients && json.debts) {[span_26](end_span)
          if (confirm('سيتم استبدال البيانات الحالية بالنسخة المرفوعة؟')) {
            setData(json);
            [span_27](start_span)alert('تم استعادة البيانات بنجاح ✅');[span_27](end_span)
          }
        }
      } catch (err) { alert('خطأ ❌'); [span_28](start_span)}
    };
    reader.readAsText(file);
    event.target.value = ''; 
  };

  const resetAppData = () => {
    if (confirm('حذف جميع البيانات نهائياً؟')) {[span_28](end_span)
      setData({ clients: [], debts: [] });
      setSelectedClientId(null);
      [span_29](start_span)setCurrentView('DASHBOARD');[span_29](end_span)
      localStorage.removeItem('debtCollectorData');
    }
  };

  const addClient = (client: Omit<Client, 'id' | 'createdAt'>) => {
    [span_30](start_span)const newClient: Client = { ...client, id: generateId(), createdAt: Date.now() };[span_30](end_span)
    [span_31](start_span)setData(prev => ({ ...prev, clients: [newClient, ...prev.clients] }));[span_31](end_span)
    setCurrentView('CLIENTS_LIST');
  };

  const saveDebt = (debtData: any, isEdit: boolean) => {
    [span_32](start_span)const { id, clientId, itemName, baseValue, profitPercentage, monthCount, startDate, paymentDay, installments } = debtData;[span_32](end_span)
    [span_33](start_span)const finalTotal = installments.reduce((sum: number, i: any) => sum + Number(i.amount), 0);[span_33](end_span)
    const profitVal = finalTotal - Number(baseValue);
    const procInst = installments.map((inst: any) => ({
      [span_34](start_span)...inst, id: inst.id || generateId(), debtId: isEdit ? id : 'temp', status: inst.status || InstallmentStatus.PENDING[span_34](end_span)
    }));

    if (isEdit) {
       setData(prev => ({
         [span_35](start_span)...prev, debts: prev.debts.map(d => d.id === id ? {[span_35](end_span)
            ...d, itemName, baseValue, profitPercentage, profitValue: profitVal,
            totalValue: finalTotal, monthCount,
            startDate: new Date(startDate).getTime(), paymentDay, installments: procInst
         [span_36](start_span)} : d)[span_36](end_span)
       }));
    } else {
      const newDebt: Debt = {
        id: generateId(), clientId, itemName, baseValue, profitPercentage, profitValue: profitVal,
        totalValue: finalTotal, monthCount,
        startDate: new Date(startDate).getTime(), paymentDay,
        [span_37](start_span)isFullyPaid: false, installments: procInst[span_37](end_span)
      };
      [span_38](start_span)newDebt.installments.forEach(i => i.debtId = newDebt.id);[span_38](end_span)
      setData(prev => ({ ...prev, debts: [newDebt, ...prev.debts] }));
    }
    setSelectedClientId(clientId);
    setCurrentView('CLIENT_DETAILS');
    setEditingDebtId(null);
  };

  const processPayment = (debtId: string, installmentId: string, paidAmount: number, paidDate: number, notes: string, newFutureInstallments: Installment[]) => {
    setData(prev => {
      const newDebts = prev.debts.map(debt => {
        [span_39](start_span)if (debt.id !== debtId) return debt;[span_39](end_span)
        const past = debt.installments.filter(i => i.id !== installmentId && (i.status === InstallmentStatus.PAID || i.status === InstallmentStatus.POSTPONED));
        const current = debt.installments.find(i => i.id === installmentId);
        if(!current) return debt;
        [span_40](start_span)const isPostponed = paidAmount === 0;[span_40](end_span)
        const updatedCurrent: Installment = {
          ...current, amount: paidAmount, status: isPostponed ? InstallmentStatus.POSTPONED : InstallmentStatus.PAID,
          paidDate: paidDate, notes: notes
        };
        const all = [...past, updatedCurrent, ...newFutureInstallments].sort((a, b) => a.dueDate - b.dueDate);
        [span_41](start_span)const allPaid = all.every(i => i.status === InstallmentStatus.PAID || i.status === InstallmentStatus.POSTPONED);[span_41](end_span)
        [span_42](start_span)return { ...debt, installments: all, isFullyPaid: allPaid, monthCount: all.length };[span_42](end_span)
      });
      [span_43](start_span)return { ...prev, debts: newDebts };[span_43](end_span)
    });
    setCurrentView('CLIENT_DETAILS');
  };

  const openEditClient = (client: Client) => { setEditClientName(client.name || ''); setEditClientPhone((client.phone as any) || ''); setIsEditClientOpen(true); [span_44](start_span)};[span_44](end_span)
  const saveEditClient = () => {
    [span_45](start_span)if (!selectedClientId) return;[span_45](end_span)
    [span_46](start_span)setData(prev => ({ ...prev, clients: prev.clients.map(c => c.id === selectedClientId ? { ...c, name: editClientName, phone: editClientPhone } : c) }));[span_46](end_span)
    [span_47](start_span)setIsEditClientOpen(false);[span_47](end_span)
  };

  const deleteClient = (id: string) => {
    [span_48](start_span)if(!confirm('حذف العميل وجميع ديونه؟')) return;[span_48](end_span)
    [span_49](start_span)setData(prev => ({ clients: prev.clients.filter(c => c.id !== id), debts: prev.debts.filter(d => d.clientId !== id) }));[span_49](end_span)
    [span_50](start_span)setSelectedClientId(null);[span_50](end_span)
    setCurrentView('CLIENTS_LIST');
  };

  const deleteDebt = (id: string) => {
    [span_51](start_span)if(!confirm('حذف هذه المديونية؟')) return;[span_51](end_span)
    [span_52](start_span)setData(prev => ({ ...prev, debts: prev.debts.filter(d => d.id !== id) }));[span_52](end_span)
  };

  const stats = useMemo(() => {
    [span_53](start_span)let tL = 0, tP = 0, tC = 0, tPe = 0;[span_53](end_span)
    data.debts.forEach(debt => {
      tL += debt.baseValue; tP += debt.profitValue;
      debt.installments.forEach(inst => {
        if (inst.status === InstallmentStatus.PAID) tC += inst.amount;
        else if (inst.status !== InstallmentStatus.POSTPONED) tPe += inst.amount;
      });
    });
    [span_54](start_span)return { totalLoaned: tL, totalProfit: tP, totalCollected: tC, totalPending: tPe };[span_54](end_span)
  }, [data.debts]);

  const DashboardView = () => (
    <div className="pb-24 animate-fade-in text-right">
      <header className="bg-white p-6 pb-8 rounded-b-3xl shadow-sm mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">مرحباً بك 👋</h1>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center">
            [span_55](start_span)<div className="flex items-center gap-2 mb-2 text-blue-600 justify-center"><Wallet size={20} /><span className="text-xs font-semibold">إجمالي الديون</span></div>[span_55](end_span)
            <p className="text-xl font-bold text-gray-800">{formatCurrency(stats.totalLoaned + stats.totalProfit)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-2xl border border-green-100 text-center">
            [span_56](start_span)<div className="flex items-center gap-2 mb-2 text-green-600 justify-center"><CheckCircle2 size={20} /><span className="text-xs font-semibold">تم تحصيله</span></div>[span_56](end_span)
            <p className="text-xl font-bold text-gray-800">{formatCurrency(stats.totalCollected)}</p>
          </div>
        </div>
      </header>
      <div className="px-4 space-y-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm">
          [span_57](start_span)<h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 justify-end">تحليل الأداء <TrendingUp size={18} /></h3>[span_57](end_span)
          <div className="h-48 w-full">
             <ResponsiveContainer width="100%" height="100%">
                [span_58](start_span)<BarChart data={[{ name: 'أصل', value: stats.totalLoaned }, { name: 'ربح', value: stats.totalProfit }, { name: 'متبقي', value: stats.totalPending }]} barSize={40}>[span_58](end_span)
                  [span_59](start_span)<XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />[span_59](end_span)
                  <RechartsTooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    [span_60](start_span){ [stats.totalLoaned, stats.totalProfit, stats.totalPending].map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />) }[span_60](end_span)
                  </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm">
          [span_61](start_span)<h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 justify-end">استحقاقات قريبة <AlertCircle size={18} className="text-red-500" /></h3>[span_61](end_span)
          <div className="space-y-3">
             {data.debts.flatMap(d => d.installments.map(i => ({...i, clientName: data.clients.find(c => c.id === d.clientId)?.name})))
                .filter(i => i.status !== InstallmentStatus.PAID && i.status !== InstallmentStatus.POSTPONED)
                [span_62](start_span).sort((a, b) => a.dueDate - b.dueDate).slice(0, 3)[span_62](end_span)
                .map(inst => (
                  <div key={inst.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="font-bold text-blue-600 text-sm">{formatCurrency(inst.amount)}</span>
                    [span_63](start_span)<div className="text-right"><p className="font-semibold text-gray-800 text-sm">{inst.clientName}</p><p className="text-xs text-gray-500">{formatDate(inst.dueDate)}</p></div>[span_63](end_span)
                  </div>
                ))}
          </div>
        </div>
      </div>
    </div>
  );

  const ClientsListView = () => {
    const clientsWithTotals = useMemo(() => {
      return data.clients.map(client => {
        [span_64](start_span)const clientDebts = data.debts.filter(d => d.clientId === client.id);[span_64](end_span)
        const total = clientDebts.reduce((acc, curr) => acc + curr.totalValue, 0);
        const paid = clientDebts.reduce((acc, curr) => acc + curr.installments.filter(i => i.status === InstallmentStatus.PAID).reduce((s, i) => s + i.amount, 0), 0);
        [span_65](start_span)const remaining = total - paid;[span_65](end_span)
        const nextDate = clientDebts.flatMap(d => d.installments).filter(i => i.status === InstallmentStatus.PENDING).sort((a, b) => a.dueDate - b.dueDate)[0]?.dueDate || Infinity;
        return { ...client, total, paid, remaining, nextDate };
      });
    }, [data.clients, data.debts]);

    const filteredClients = useMemo(() => {
      return clientsWithTotals.filter(c => c.name.includes(searchTerm) || c.phone.includes(searchTerm)).sort((a, b) => {
        [span_66](start_span)const aP = a.remaining <= 0; const bP = b.remaining <= 0;[span_66](end_span)
        if (aP && !bP) return 1; if (!aP && bP) return -1;
        if (!aP && !bP) return a.nextDate - b.nextDate; // ترتيب الأقرب سداداً (جديد)
        [span_67](start_span)return b.remaining - a.remaining;[span_67](end_span)
      });
    }, [clientsWithTotals, searchTerm]);

    return (
      <div className="pb-24 pt-4 px-4 h-full flex flex-col text-right">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">العملاء</h2>
          [span_68](start_span)<button onClick={() => setCurrentView('ADD_CLIENT')} className="text-blue-600 p-2 bg-blue-50 rounded-full"><UserPlus size={24} /></button>[span_68](end_span)
        </div>
        <div className="relative mb-6">
          [span_69](start_span)<input type="text" placeholder="بحث..." className="w-full bg-white pl-4 pr-10 py-3 rounded-xl border-none shadow-sm text-sm text-right focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />[span_69](end_span)
          <Search className="absolute right-3 top-3 text-gray-400" size={20} />
        </div>
        <div className="space-y-3 overflow-y-auto no-scrollbar pb-20">
          {filteredClients.map(client => (
            [span_70](start_span)<div key={client.id} onClick={() => { setSelectedClientId(client.id); setSelectedDebtIds([]); setCurrentView('CLIENT_DETAILS'); }} className={`bg-white p-4 rounded-xl shadow-sm active:scale-[0.99] transition-all cursor-pointer ${client.remaining <= 0 ? 'opacity-50 grayscale border-dashed border-gray-200' : ''}`}>[span_70](end_span)
              <div className="flex justify-between items-start">
                <div className="text-right">
                  <h3 className={`font-bold ${client.remaining <= 0 ? [span_71](start_span)'text-gray-400' : 'text-gray-800'}`}>{client.name}</h3>[span_71](end_span)
                  <p className="text-xs text-gray-500 mt-1">{client.phone}</p>
                  {client.remaining > 0 && client.nextDate !== Infinity && (<p className="text-[10px] text-blue-600 font-medium">القادم: {formatDate(client.nextDate)}</p>)}
                </div>
                <div className="text-left">
                  [span_72](start_span)<span className="block text-xs text-gray-400">المتبقي</span>[span_72](end_span)
                  <span className={`font-bold ${client.remaining <= 0 ? 'text-gray-400' : 'text-red-500'}`}>{client.remaining <= 0 ? [span_73](start_span)'0' : formatCurrency(client.remaining)}</span>[span_73](end_span)
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const ClientDetailsView = () => {
    [span_74](start_span)const client = data.clients.find(c => c.id === selectedClientId);[span_74](end_span)
    if (!client) return null;
    [span_75](start_span)const clientDebts = data.debts.filter(d => d.clientId === client.id);[span_75](end_span)

    const toggleDebtSelection = (id: string) => {
      [span_76](start_span)setSelectedDebtIds(prev => prev.includes(id) ? prev.filter(debtId => debtId !== id) : [...prev, id]);[span_76](end_span)
    };

    const handlePrepareSummary = () => { // نافذة المعاينة قبل الإرسال
      [span_77](start_span)const selected = selectedDebtIds.length > 0 ? clientDebts.filter(d => selectedDebtIds.includes(d.id)) : clientDebts;[span_77](end_span)
      if (selected.length === 0) { alert('يرجى اختيار مديونية'); return; }
      [span_78](start_span)let text = `مرحباً ${client.name}،\nإليك ملخص حسابك للمديونيات المحددة:\n\n`;[span_78](end_span)
      [span_79](start_span)let tA = 0, pA = 0;[span_79](end_span)
      selected.forEach(d => {
        const p = d.installments.filter(i => i.status === InstallmentStatus.PAID).reduce((s, i) => s + i.amount, 0);
        text += `📌 *${d.itemName}*\n- إجمالي: ${formatCurrency(d.totalValue)}\n- المتبقي: ${formatCurrency(d.totalValue - p)}\n\n`;
        tA += d.totalValue; pA += p;
      });
      [span_80](start_span)if (selected.length > 1) text += `📊 *الإجمالي العام للمختار:*\n- إجمالي المتبقي: ${formatCurrency(tA - pA)}\n\n`;[span_80](end_span)
      [span_81](start_span)text += `شكراً لتعاملك معنا.`;[span_81](end_span)
      setSummaryPreview({ text, phone: client.phone.replace(/\D/g, '') });
    };

    const sendInstallmentReceipt = (debt: Debt, inst: Installment, receiptNumber: number) => {
      [span_82](start_span)const tD = clientDebts.reduce((acc, d) => acc + (d.totalValue || 0), 0);[span_82](end_span)
      [span_83](start_span)const tP = clientDebts.reduce((acc, d) => acc + d.installments.filter(i => i.status === InstallmentStatus.PAID).reduce((s, i) => s + (i.amount || 0), 0), 0);[span_83](end_span)
      // نص السند المحدث كما طلبته
      [span_84](start_span)const message = `سند سداد قسط\n\nالعميل: ${client.name} \nتم استلام\nرقم القسط: ${receiptNumber+1}\nالمبلغ: ${formatCurrency(inst.amount)}\nالتاريخ: ${formatDate(inst.paidDate || Date.now())}\n\nإجمالي المديونية: ${formatCurrency(tD)}\nإجمالي المسدد: ${formatCurrency(tP)}\nإجمالي المتبقي: ${formatCurrency(tD - tP)}\n\nشكراً لسدادكم.`;[span_84](end_span)
      [span_85](start_span)window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');[span_85](end_span)
    };

    return (
      <div className="pb-24 bg-gray-50 min-h-screen animate-fade-in text-right">
        <div className="bg-white pb-6 pt-4 px-4 rounded-b-3xl shadow-sm sticky top-0 z-10 text-center">
          <div className="flex items-center justify-between mb-4">
            [span_86](start_span)<button onClick={() => { setSelectedClientId(null); setCurrentView('CLIENTS_LIST'); }} className="p-2 -mr-2 text-gray-600"><ArrowLeft /></button>[span_86](end_span)
            <h2 className="font-bold text-lg">ملف العميل</h2>
            <div className="flex items-center gap-2">
              [span_87](start_span)<button onClick={() => openEditClient(client)} className="text-blue-600 p-2 bg-blue-50 rounded-full transition-colors"><Edit size={22} /></button>[span_87](end_span)
              <button onClick={() => deleteClient(client.id)} className="text-red-500 p-2 bg-red-50 rounded-full transition-colors"><Trash2 size={22} /></button>
            </div>
          </div>
          [span_88](start_span)<div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mb-3 mx-auto">{client.name.charAt(0)}</div>[span_88](end_span)
          <h1 className="text-xl font-bold">{client.name}</h1>
          <p className="text-gray-500 text-sm mb-4">{client.phone}</p>
          [span_89](start_span)<button onClick={handlePrepareSummary} className="mt-4 flex items-center gap-2 bg-green-50 text-green-700 px-6 py-2 rounded-xl font-bold mx-auto shadow-sm active:scale-95 transition-transform"><Send size={16} /> كشف حساب</button>[span_89](end_span)
        </div>
        <div className="px-4 mt-6 space-y-6">
           <div className="flex justify-between items-center"><h3 className="font-bold text-gray-800">الديون المسجلة</h3><button onClick={() => { setEditingDebtId(null); setCurrentView('ADD_DEBT'); [span_90](start_span)}} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors">+ مديونية جديدة</button></div>[span_90](end_span)
           {clientDebts.map(debt => (
             [span_91](start_span)<div key={debt.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${selectedDebtIds.includes(debt.id) ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-100'}`}>[span_91](end_span)
               <div className="p-4 border-b bg-gray-50/50 flex justify-between items-start">
                 [span_92](start_span)<div className="flex items-center gap-3"><input type="checkbox" checked={selectedDebtIds.includes(debt.id)} onChange={() => toggleDebtSelection(debt.id)} className="w-5 h-5 rounded border-gray-300 text-blue-600 cursor-pointer" />[span_92](end_span) <div><h4 className="font-bold text-gray-900">{debt.itemName}</h4><p className="text-xs text-gray-500">أصل: {formatCurrency(debt.baseValue)} | [span_93](start_span)ربح: {debt.profitPercentage.toFixed(1)}%</p></div></div>[span_93](end_span)
                 <div className="flex gap-2">
                   <button onClick={() => { setEditingDebtId(debt.id); setCurrentView('EDIT_DEBT'); [span_94](start_span)}} className="p-2 bg-gray-200 text-gray-600 rounded-lg"><Edit size={16} /></button>[span_94](end_span)
                   <button onClick={() => deleteDebt(debt.id)} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 size={16} /></button>
                 </div>
               </div>
               <div className="divide-y divide-gray-100">
                 {debt.installments.map((inst, idx) => (
                   [span_95](start_span)<div key={inst.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">[span_95](end_span)
                     <div className="flex items-center gap-3">
                       <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${inst.status === 'PAID' ? 'bg-green-100 text-green-700' : inst.status === InstallmentStatus.POSTPONED ? [span_96](start_span)'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>{idx + 1}</span>[span_96](end_span)
                       <div className="text-right"><p className="text-sm font-medium">{formatCurrency(inst.amount)}</p><p className="text-xs text-gray-500">{formatDate(inst.dueDate)}</p></div>
                     </div>
                     {inst.status === InstallmentStatus.PAID || inst.status === InstallmentStatus.POSTPONED ? [span_97](start_span)(
                       <div className="flex items-center gap-2">
                         {inst.status === InstallmentStatus.PAID && (<button onClick={() => sendInstallmentReceipt(debt, inst, idx)} className="text-green-600 bg-green-50 p-1.5 rounded-md hover:bg-green-100"><Receipt size={16} /></button>)}[span_97](end_span)
                         <button onClick={() => inst.status === InstallmentStatus.POSTPONED && setPostponedInfo({ date: inst.dueDate, note: inst.notes || '' })} className={`text-xs font-bold px-2 py-1 rounded-md ${inst.status === InstallmentStatus.POSTPONED ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>{inst.status === InstallmentStatus.POSTPONED ? 'تم التأجيل' : 'مدفوع'}</button>
                       </div>
                     ) : (
                       [span_98](start_span)<button onClick={() => { setEditingDebtId(debt.id); setSelectedInstallmentId(inst.id); setCurrentView('RECORD_PAYMENT'); }} className="text-xs font-medium bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">تسجيل سداد</button>[span_98](end_span)
                     )}
                   </div>
                 ))}
               </div>
               [span_99](start_span)<div className="p-3 bg-gray-50 border-t border-gray-100 text-center"><div className="flex justify-between items-center text-sm font-bold px-2"><span>الإجمالي:</span><span>{formatCurrency(debt.totalValue)}</span></div></div>[span_99](end_span)
             </div>
           ))}
        </div>
      </div>
    );
  };

  const RecordPaymentView = () => {
    [span_100](start_span)const debt = data.debts.find(d => d.id === editingDebtId);[span_100](end_span)
    [span_101](start_span)const installment = debt?.installments.find(i => i.id === selectedInstallmentId);[span_101](end_span)
    if (!debt || !installment) return null;
    [span_102](start_span)const future = useMemo(() => { const idx = debt.installments.findIndex(i => i.id === installment.id); return debt.installments.slice(idx + 1); }, [debt, installment]);[span_102](end_span)
    [span_103](start_span)const [amt, setAmt] = useState<number>(installment.amount);[span_103](end_span)
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    [span_104](start_span)const [remM, setRemM] = useState<number>(future.length);[span_104](end_span)
    const [previewInstallments, setPreviewInstallments] = useState<Installment[]>([]);
    const totalDebt = debt.totalValue;
    [span_105](start_span)const previouslyPaid = debt.installments.filter(i => i.status === InstallmentStatus.PAID && i.id !== installment.id).reduce((sum, i) => sum + i.amount, 0);[span_105](end_span)
    [span_106](start_span)const bal = totalDebt - previouslyPaid - amt;[span_106](end_span)

    // دالة التعديل اليدوي للأقساط المتبقية في شاشة السداد
    const updatePreviewInstallment = (index: number, value: any) => {
        const newInst = [...previewInstallments];
        const newAmount = Number(value); if (newAmount < 0) return;
        newInst[index].amount = newAmount;
        const remCount = newInst.length - 1 - index;
        if (remCount > 0) {
            const sumSoFar = newInst.slice(0, index + 1).reduce((s, i) => s + i.amount, 0);
            const remBal = bal - sumSoFar; const amtPerM = Math.floor(remBal / remCount); const r = remBal - (amtPerM * remCount);
            for (let j = index + 1; j < newInst.length; j++) { const isLast = j === newInst.length - 1; newInst[j].amount = Math.max(0, amtPerM + (isLast ? r : 0)); }
        }
        setPreviewInstallments(newInst);
    };

    useEffect(() => {
        [span_107](start_span)if (bal <= 0 && remM <= 0) { setPreviewInstallments([]); return; }[span_107](end_span)
        const safeM = (bal > 1 && remM === 0) ? 1 : remM;
        if (safeM > 0) {
            [span_108](start_span)const plan = calculatePlan(Math.max(0, bal), safeM, new Date(date), debt.paymentDay);[span_108](end_span)
            setPreviewInstallments(plan.map(p => ({ ...p, id: generateId(), debtId: debt.id, status: InstallmentStatus.PENDING })));
        }
    }, [amt, remM, date, bal, debt]);

    return (
        <div className="bg-gray-50 min-h-screen pb-20 animate-fade-in text-right">
            [span_109](start_span)<div className="bg-white px-4 pt-6 pb-4 border-b flex items-center sticky top-0 z-20"><button onClick={() => setCurrentView('CLIENT_DETAILS')} className="p-2 -mr-2 text-gray-600"><ArrowLeft /></button><h2 className="text-xl font-bold mr-2">تسجيل دفعة</h2></div>[span_109](end_span)
            <div className="p-4 space-y-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4">
                    [span_110](start_span)<div><label className="block text-xs text-gray-500 mb-1">المبلغ المدفوع</label><input type="number" value={amt} onChange={e => setAmt(Number(e.target.value))} className="w-full p-3 bg-gray-50 border rounded-xl font-bold text-right" /></div>[span_110](end_span)
                    [span_111](start_span)<div><label className="block text-xs text-gray-500 mb-1">ملاحظات التأجيل</label><textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-xl text-sm h-20 resize-none text-right" placeholder="سبب التأجيل..." /></div>[span_111](end_span)
                </div>
                {bal > 0 && (
                    [span_112](start_span)<div className="bg-white p-5 rounded-2xl shadow-sm border-t-4 border-orange-400 space-y-4">[span_112](end_span)
                        <div className="flex justify-between items-center font-bold text-orange-600"><h3>جدولة المتبقي</h3><span>{formatCurrency(bal)}</span></div>
                        [span_113](start_span)<div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl mt-4"><span className="text-sm font-medium">عدد الأشهر</span><div className="flex items-center gap-4"><button onClick={() => setRemM(Math.max(1, remM - 1))} className="w-10 h-10 rounded-full bg-white shadow-sm border flex items-center justify-center text-red-500">-</button><span className="font-bold text-lg">{remM}</span><button onClick={() => setRemM(remM + 1)} className="w-10 h-10 rounded-full bg-white shadow-sm border flex items-center justify-center text-green-600">+</button></div></div>[span_113](end_span)
                        <div className="mt-4 border rounded-lg overflow-hidden divide-y bg-gray-50">
                            {previewInstallments.map((p, idx) => {
                                const isLast = idx === previewInstallments.length - 1;
                                return (
                                    [span_114](start_span)<div key={idx} className="p-3 flex justify-between items-center text-sm bg-white">[span_114](end_span)
                                        <span className="text-gray-400">قسط {idx+1}</span>
                                        <input type="number" className={`p-1 rounded border text-xs w-24 font-bold text-right ${isLast ? 'bg-gray-100 text-gray-400' : 'border-orange-200'}`} value={p.amount} onChange={(e) => updatePreviewInstallment(idx, e.target.value)} disabled={isLast} />
                                        [span_115](start_span)<span className="text-gray-500 text-xs">{formatDate(p.dueDate)}</span>[span_115](end_span)
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                <button onClick={() => processPayment(debt.id, installment.id, amt, new Date(date).getTime(), notes, previewInstallments)} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform">{amt === 0 ? [span_116](start_span)'تأكيد التأجيل' : 'تأكيد السداد'}</button>[span_116](end_span)
            </div>
        </div>
    );
  };

  const AddClientView = () => { // شاشة إضافة العميل المستعادة
    [span_117](start_span)const [name, setName] = useState('');[span_117](end_span)
    [span_118](start_span)const [phone, setPhone] = useState('');[span_118](end_span)
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if(name && phone) addClient({ name, phone, nationalId: '' }); [span_119](start_span)};[span_119](end_span)
    return (
      [span_120](start_span)<div className="bg-white min-h-screen text-right animate-fade-in">[span_120](end_span)
        [span_121](start_span)<div className="px-4 pt-6 pb-4 border-b flex items-center shadow-sm"><button onClick={() => setCurrentView('CLIENTS_LIST')} className="p-2 -mr-2 text-gray-600"><ArrowLeft /></button><h2 className="text-xl font-bold mr-2">إضافة عميل جديد</h2></div>[span_121](end_span)
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
           [span_122](start_span)<div><label className="block text-sm font-medium text-gray-700 mb-2">اسم العميل</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl text-right border focus:ring-2 focus:ring-blue-500" placeholder="الاسم الثلاثي" required /></div>[span_122](end_span)
           [span_123](start_span)<div><label className="block text-sm font-medium text-gray-700 mb-2">رقم الجوال</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl text-right border focus:ring-2 focus:ring-blue-500" placeholder="9665..." required /></div>[span_123](end_span)
           [span_124](start_span)<button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg mt-10 shadow-lg active:scale-95 transition-transform">حفظ العميل</button>[span_124](end_span)
        </form>
      </div>
    );
  };

  const DebtFormView = () => { // شاشة إضافة/تعديل المديونية الأصلية مع الجدول التفاعلي
    [span_125](start_span)const isEditMode = currentView === 'EDIT_DEBT' && !!editingDebtId;[span_125](end_span)
    [span_126](start_span)const existingDebt = isEditMode ? data.debts.find(d => d.id === editingDebtId) : null;[span_126](end_span)
    [span_127](start_span)const client = data.clients.find(c => c.id === selectedClientId);[span_127](end_span)
    [span_128](start_span)const [itemName, setItemName] = useState(existingDebt?.itemName || '');[span_128](end_span)
    const [baseValue, setBaseValue] = useState<number | [span_129](start_span)''>(existingDebt?.baseValue || '');[span_129](end_span)
    const [profitType, setProfitType] = useState<'PERCENTAGE' | [span_130](start_span)'FIXED'>(existingDebt?.profitPercentage ? 'PERCENTAGE' : 'FIXED');[span_130](end_span)
    [span_131](start_span)const [profitPercentage, setProfitPercentage] = useState<number>(existingDebt?.profitPercentage || 10);[span_131](end_span)
    const [fixedProfit, setFixedProfit] = useState<number | [span_132](start_span)''>(existingDebt?.profitValue || '');[span_132](end_span)
    [span_133](start_span)const [months, setMonths] = useState<number>(existingDebt?.monthCount || 6);[span_133](end_span)
    [span_134](start_span)const [startDate, setStartDate] = useState(existingDebt ? new Date(existingDebt.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);[span_134](end_span)
    [span_135](start_span)const [paymentDay, setPaymentDay] = useState(existingDebt?.paymentDay || 27);[span_135](end_span)
    [span_136](start_span)const [manualInstallments, setManualInstallments] = useState<any[]>(existingDebt?.installments || []);[span_136](end_span)

    const handleBaseValueChange = (val: number | '') => {
        setBaseValue(val); const base = Number(val) || [span_137](start_span)0;[span_137](end_span)
        if (base > 0) { if (profitType === 'PERCENTAGE') setFixedProfit(base * (profitPercentage / 100)); else setProfitPercentage(((Number(fixedProfit) || 0) / base) * 100); [span_138](start_span)}
    };
    const handleFixedProfitChange = (val: number | '') => { setFixedProfit(val); const base = Number(baseValue) || 0; const fixed = Number(val) || 0; if (base > 0) setProfitPercentage((fixed / base) * 100); }; [cite: 143-145]
    const getCalculatedValues = () => { const base = Number(baseValue) || 0; let profit = 0; if (profitType === 'PERCENTAGE') profit = base * (profitPercentage / 100); else profit = Number(fixedProfit) || 0; return { base, profit, total: base + profit }; [cite_start]}; [cite: 146-148]
    const handleRecalculate = () => { const { total } = getCalculatedValues(); if (total === 0) return; const plan = calculatePlan(total, months, new Date(startDate), paymentDay); setManualInstallments(plan.map(p => ({ ...p, id: generateId(), debtId: isEditMode ? editingDebtId : 'temp', status: InstallmentStatus.PENDING }))); [cite_start]}; [cite: 149-151]
    
    const { total: targetTotal } = getCalculatedValues();
    const updateInstallment = (index: number, field: 'amount' | 'dueDate', value: any) => {
        [cite_start]const newInst = [...manualInstallments];[span_138](end_span)
        [span_139](start_span)if (field === 'dueDate') { newInst[index].dueDate = new Date(value).getTime(); setManualInstallments(newInst);[span_139](end_span)
        } else {
            [span_140](start_span)const newAmount = Number(value); if (newAmount < 0) return;[span_140](end_span)
            [span_141](start_span)newInst[index].amount = newAmount; const rem = newInst.length - 1 - index;[span_141](end_span)
            if (rem > 0) {
                [span_142](start_span)const sumSoFar = newInst.slice(0, index + 1).reduce((s, i) => s + i.amount, 0);[span_142](end_span)
                [span_143](start_span)const remBal = targetTotal - sumSoFar; const amtPerM = Math.floor(remBal / rem); const r = remBal - (amtPerM * rem);[span_143](end_span)
                for (let j = index + 1; j < newInst.length; j++) { const isLast = j === newInst.length - 1; newInst[j].amount = Math.max(0, amtPerM + (isLast ? r : 0)); [span_144](start_span)}
            }
            setManualInstallments(newInst);[span_144](end_span)
        }
    };

    return (
      <div className="bg-gray-50 min-h-screen pb-24 text-right animate-fade-in">
        <div className="bg-white px-4 pt-6 pb-4 border-b flex items-center sticky top-0 z-20"><button onClick={() => setCurrentView('CLIENT_DETAILS')} className="p-2 -mr-2 text-gray-600"><ArrowLeft /></button><h2 className="text-xl font-bold mr-2">{isEditMode ? 'تعديل' : 'إضافة'} مديونية</h2></div>
        <div className="p-4 space-y-5">
           <div className="bg-white p-4 rounded-xl shadow-sm space-y-4 text-right">
             [span_145](start_span)<h3 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2 mb-2 justify-end"><FileText size={18} className="text-blue-500" /> تفاصيل السلعة</h3>[span_145](end_span)
             <div><label className="block text-xs text-gray-500 mb-1">اسم السلعة</label><input type="text" value={itemName} onChange={e => setItemName(e.target.value)} className="w-full p-3 bg-gray-50 rounded-lg border text-right" /></div>
             [span_146](start_span)<div><label className="block text-xs text-gray-500 mb-1">رأس المال</label><input type="number" value={baseValue} onChange={e => handleBaseValueChange(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-3 bg-gray-50 rounded-lg border font-bold text-right" /></div>[span_146](end_span)
             <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div className="flex bg-white rounded-lg p-1 shadow-sm mb-3">
                   <button onClick={() => setProfitType('PERCENTAGE')} className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1 ${profitType === 'PERCENTAGE' ? [span_147](start_span)'bg-blue-100 text-blue-700' : 'text-gray-500'}`}><Percent size={14} /> نسبة</button>[span_147](end_span)
                   <button onClick={() => setProfitType('FIXED')} className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1 ${profitType === 'FIXED' ? [span_148](start_span)'bg-blue-100 text-blue-700' : 'text-gray-500'}`}><Coins size={14} /> ثابت</button>[span_148](end_span)
                </div>
                {profitType === 'PERCENTAGE' ? (<div><label className="block text-xs text-gray-500 mb-1">الربح (%)[span_149](start_span)</label><div className="flex gap-2"><input type="number" value={profitPercentage} onChange={e => setProfitPercentage(Number(e.target.value))} className="w-24 p-2 bg-white rounded-lg border text-center font-bold" /><div className="flex-1 p-2 bg-gray-100 rounded-lg border flex items-center justify-between px-3 font-bold">{formatCurrency(Number(fixedProfit) || 0)}</div></div></div>) : (<div><label className="block text-xs text-gray-500 mb-1">مبلغ الربح</label><input type="number" value={fixedProfit} onChange={e => handleFixedProfitChange(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 bg-white rounded-lg border font-bold text-right" /></div>)}[span_149](end_span)
             </div>
             [span_150](start_span)<div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border text-blue-800 font-bold"><span>إجمالي المديونية</span><span>{formatCurrency(targetTotal)}</span></div>[span_150](end_span)
           </div>
           <div className="bg-white p-4 rounded-xl shadow-sm space-y-4 text-right">
             <div className="grid grid-cols-2 gap-4">
               [span_151](start_span)<div><label className="block text-xs text-gray-500 mb-1">الأشهر</label><input type="number" value={months} onChange={e => setMonths(Number(e.target.value))} className="w-full p-3 bg-gray-50 rounded-lg border text-right" /></div>[span_151](end_span)
               <div><label className="block text-xs text-gray-500 mb-1">يوم السداد</label><input type="number" min="1" max="31" value={paymentDay} onChange={e => setPaymentDay(Number(e.target.value))} className="w-full p-3 bg-gray-50 rounded-lg border text-right" /></div>
             </div>
             [span_152](start_span)<button onClick={handleRecalculate} className="w-full py-2 bg-gray-100 text-gray-700 font-bold rounded-lg border">إنشاء جدول الأقساط</button>[span_152](end_span)
             <div className="mt-4">
                <div className="flex justify-between items-center mb-2"><span className="text-sm font-bold text-gray-700">جدول الأقساط</span><span className={`font-bold ${currentTotal === targetTotal ? [span_153](start_span)'text-green-600' : 'text-red-500'}`}>{formatCurrency(currentTotal)}</span></div>[span_153](end_span)
                <div className="max-h-80 overflow-y-auto border rounded-lg divide-y bg-gray-50">
                    {manualInstallments.map((inst, idx) => {
                        const isLast = idx === manualInstallments.length - 1;
                        return (
                          <div key={idx} className="p-2 flex gap-2 items-center text-sm">
                            <span className="w-6 text-center text-gray-400">{idx + 1}</span>
                            <input type="date" className="p-1 rounded border text-xs text-right w-32" value={new Date(inst.dueDate).toISOString().split('T')[0]} onChange={(e) => updateInstallment(idx, 'dueDate', e.target.value)} />
                            [span_154](start_span)<input type="number" className={`p-1 rounded border text-xs w-24 font-bold text-right ${isLast ? 'bg-gray-100 text-gray-500' : ''}`} value={inst.amount} onChange={(e) => updateInstallment(idx, 'amount', e.target.value)} disabled={isLast} />[span_154](end_span)
                          </div>
                        );
                    })}
                </div>
             </div>
           </div>
           <button onClick={handleSubmit} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-transform">{isEditMode ? [span_155](start_span)'حفظ التعديلات' : 'اعتماد المديونية'}</button>[span_155](end_span)
        </div>
      </div>
    );
  };

  const SettingsView = () => (
    <div className="bg-gray-50 min-h-screen pb-24 text-right animate-fade-in">
      [span_156](start_span)<header className="bg-white p-6 pb-8 rounded-b-3xl shadow-sm mb-6"><h1 className="text-2xl font-bold">الإعدادات</h1></header>[span_156](end_span)
      <div className="px-4 space-y-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4">
          [span_157](start_span)<button onClick={exportData} className="w-full flex items-center justify-between p-4 bg-blue-50 text-blue-700 rounded-xl font-bold shadow-sm"><Download size={20} /><span>تصدير نسخة احتياطية</span></button>[span_157](end_span)
          [span_158](start_span)<label className="w-full flex items-center justify-between p-4 bg-green-50 text-green-700 rounded-xl font-bold cursor-pointer shadow-sm"><Upload size={20} /><span>استيراد بيانات</span><input type="file" accept=".json" onChange={importData} className="hidden" /></label>[span_158](end_span)
        </div>
        [span_159](start_span)<button onClick={resetAppData} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-4 rounded-xl font-bold shadow-sm active:bg-red-100 transition-colors"><Trash2 size={20} /> تصفير جميع البيانات</button>[span_159](end_span)
      </div>
    </div>
  );

  return (
    <>
      {isEditClientOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 text-right">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-4 animate-fade-in">
            [span_160](start_span)<h3 className="font-bold mb-3 text-gray-900">تعديل بيانات العميل</h3>[span_160](end_span)
            <div className="space-y-3">
              [span_161](start_span)<div><label className="block text-xs text-gray-500 mb-1">الاسم</label><input value={editClientName} onChange={e => setEditClientName(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-xl text-right" /></div>[span_161](end_span)
              [span_162](start_span)<div><label className="block text-xs text-gray-500 mb-1">الجوال</label><input value={editClientPhone} onChange={e => setEditClientPhone(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-xl text-right" inputMode="tel" /></div>[span_162](end_span)
            </div>
            [span_163](start_span)<div className="flex gap-2 mt-4"><button onClick={saveEditClient} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">حفظ</button><button onClick={() => setIsEditClientOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold">إلغاء</button></div>[span_163](end_span)
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto bg-gray-50 min-h-screen relative shadow-2xl overflow-hidden font-tajawal">
        [span_164](start_span){currentView === 'DASHBOARD' && <DashboardView />}[span_164](end_span)
        {currentView === 'CLIENTS_LIST' && <ClientsListView />}
        {currentView === 'CLIENT_DETAILS' && <ClientDetailsView />}
        {currentView === 'RECORD_PAYMENT' && <RecordPaymentView />}
        [span_165](start_span){(currentView === 'ADD_DEBT' || currentView === 'EDIT_DEBT') && <DebtFormView />}[span_165](end_span)
        {currentView === 'ADD_CLIENT' && <AddClientView />}
        {currentView === 'SETTINGS' && <SettingsView />}
        <TabBar currentView={currentView} onChangeView={setCurrentView} />
      </div>

      {summaryPreview && ( // نافذة معاينة كشف الحساب
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl text-right animate-slide-up">
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg">مراجعة كشف الحساب</h3><button onClick={() => setSummaryPreview(null)} className="p-1 bg-gray-100 rounded-full"><X size={20}/></button></div>
            <div className="bg-gray-50 p-4 rounded-2xl text-sm whitespace-pre-wrap max-h-[40vh] overflow-y-auto mb-6 border border-gray-100 leading-relaxed font-tajawal">{summaryPreview.text}</div>
            <div className="flex gap-3">
              <button onClick={() => { window.open(`https://wa.me/${summaryPreview.phone}?text=${encodeURIComponent(summaryPreview.text)}`, '_blank'); setSummaryPreview(null); }} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"><Send size={20}/> إرسال الآن</button>
              <button onClick={() => setSummaryPreview(null)} className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      [span_166](start_span){postponedInfo !== null && ([span_166](end_span)
        <div onClick={() => setPostponedInfo(null)} className="fixed inset-0 z-[999999] bg-black/45 flex items-center justify-center text-right">
          [span_167](start_span)<div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[14px] p-[18px] w-[90%] max-w-[420px] shadow-2xl text-center">[span_167](end_span)
            <div style={{color:'#FF7700' , fontWeight: 800, marginBottom: 6 }}>تفاصيل التأجيل</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>تاريخ القسط: {formatDate(postponedInfo.date)}</div>
            <div style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#D40000',fontWeight: 800}}>{postponedInfo.note}</div>
            [span_168](start_span)<button onClick={() => setPostponedInfo(null)} style={{marginTop: 14, padding: '10px 16px', borderRadius: 12, background: '#FF7700', color: '#fff', fontWeight: 700, width: '100%'}}>إغلاق</button>[span_168](end_span)
          </div>
        </div>
      )}
    </>
  );
}
