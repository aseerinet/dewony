
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserPlus, Calendar, CheckCircle2, 
  AlertCircle, ArrowLeft, Search, Phone, FileText, Send, 
  Trash2, TrendingUp, Wallet, Receipt, Edit, Save, Calculator, Clock,
  Percent, Coins, RefreshCw, Plus, Minus, Settings, Download, Upload, Database
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { TabBar } from './components/TabBar';
import { Client, Debt, Installment, AppData, ViewState, InstallmentStatus } from './types';
import { formatCurrency, formatDate, generateId, calculatePlan } from './utils';

// --- EMPTY INITIAL DATA ---
const INITIAL_DATA: AppData = {
  clients: [],
  debts: []
};

// --- COLORS FOR CHARTS ---
const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b'];

export default function App() {
  // --- STATE ---
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem('debtCollectorData');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.clients && parsed.debts) return parsed;
      } catch (e) {
        console.error("Error parsing saved data", e);
      }
    }
    return INITIAL_DATA;
  });
  
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Persist Data to LocalStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('debtCollectorData', JSON.stringify(data));
  }, [data]);

  // --- DATA MANAGEMENT ACTIONS ---

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
        } else {
          alert('الملف غير صالح ❌');
        }
      } catch (err) {
        alert('حدث خطأ أثناء قراءة الملف ❌');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; 
  };

  const resetAppData = () => {
    if (confirm('تحذير نهائي: سيتم حذف جميع العملاء والديون والبيانات نهائياً. لا يمكن التراجع عن هذه الخطوة. هل أنت متأكد؟')) {
      setData({ clients: [], debts: [] });
      setSelectedClientId(null);
      setEditingDebtId(null);
      setCurrentView('DASHBOARD');
      localStorage.removeItem('debtCollectorData');
      alert('تم تصفير التطبيق بالكامل بنجاح ✅');
    }
  };

  // --- APP ACTIONS ---

  const addClient = (client: Omit<Client, 'id' | 'createdAt'>) => {
    const newClient: Client = { ...client, id: generateId(), createdAt: Date.now() };
    setData(prev => ({ ...prev, clients: [newClient, ...prev.clients] }));
    setCurrentView('CLIENTS_LIST');
  };

  const saveDebt = (debtData: any, isEdit: boolean) => {
    const { id, clientId, itemName, baseValue, profitPercentage, monthCount, startDate, paymentDay, installments } = debtData;
    
    const finalInstallmentsTotal = installments.reduce((sum: number, i: any) => sum + Number(i.amount), 0);
    const profitValue = finalInstallmentsTotal - Number(baseValue);
    
    const processedInstallments = installments.map((inst: any) => ({
      ...inst,
      id: inst.id || generateId(),
      debtId: isEdit ? id : 'temp',
      status: inst.status || InstallmentStatus.PENDING
    }));

    if (isEdit) {
       setData(prev => ({
         ...prev,
         debts: prev.debts.map(d => d.id === id ? {
            ...d, itemName, baseValue, profitPercentage, profitValue,
            totalValue: finalInstallmentsTotal, monthCount,
            startDate: new Date(startDate).getTime(), paymentDay,
            installments: processedInstallments
         } : d)
       }));
    } else {
      const newDebt: Debt = {
        id: generateId(), clientId, itemName, baseValue, profitPercentage, profitValue,
        totalValue: finalInstallmentsTotal, monthCount,
        startDate: new Date(startDate).getTime(), paymentDay,
        isFullyPaid: false, installments: processedInstallments
      };
      newDebt.installments.forEach(i => i.debtId = newDebt.id);
      setData(prev => ({ ...prev, debts: [newDebt, ...prev.debts] }));
    }

    setSelectedClientId(clientId);
    setCurrentView('CLIENT_DETAILS');
    setEditingDebtId(null);
  };

  const processPayment = (debtId: string, installmentId: string, paidAmount: number, paidDate: number, notes: string, newFutureInstallments: Installment[]) => {
    setData(prev => {
      const newDebts = prev.debts.map(debt => {
        if (debt.id !== debtId) return debt;
        const pastInstallments = debt.installments.filter(i => i.id !== installmentId && (i.status === InstallmentStatus.PAID || i.status === InstallmentStatus.POSTPONED));
        const currentInstallment = debt.installments.find(i => i.id === installmentId);
        if(!currentInstallment) return debt;
        const isPostponed = paidAmount === 0;
        const updatedCurrent: Installment = {
          ...currentInstallment, amount: paidAmount, status: isPostponed ? InstallmentStatus.POSTPONED : InstallmentStatus.PAID,
          paidDate: paidDate, notes: notes
        };
        const allInstallments = [...pastInstallments, updatedCurrent, ...newFutureInstallments];
        allInstallments.sort((a, b) => a.dueDate - b.dueDate);
        const allPaid = allInstallments.every(i => i.status === InstallmentStatus.PAID || i.status === InstallmentStatus.POSTPONED);
        return { ...debt, installments: allInstallments, isFullyPaid: allPaid, monthCount: pastInstallments.length + 1 + newFutureInstallments.length };
      });
      return { ...prev, debts: newDebts };
    });
    setCurrentView('CLIENT_DETAILS');
  };

  const deleteClient = (id: string) => {
    if(!confirm('هل أنت متأكد من حذف هذا العميل وجميع ديونه نهائياً؟')) return;
    setData(prev => ({
      clients: prev.clients.filter(c => c.id !== id),
      debts: prev.debts.filter(d => d.clientId !== id)
    }));
    setSelectedClientId(null);
    setCurrentView('CLIENTS_LIST');
    alert('تم حذف العميل بنجاح ✅');
  };

  const deleteDebt = (id: string) => {
    if(!confirm('هل أنت متأكد من حذف هذه المديونية؟')) return;
    setData(prev => ({ ...prev, debts: prev.debts.filter(d => d.id !== id) }));
    alert('تم حذف المديونية بنجاح ✅');
  };

  // --- STATS ---
  const stats = useMemo(() => {
    let totalLoaned = 0, totalProfit = 0, totalCollected = 0, totalPending = 0;
    data.debts.forEach(debt => {
      totalLoaned += debt.baseValue;
      totalProfit += debt.profitValue;
      debt.installments.forEach(inst => {
        if (inst.status === InstallmentStatus.PAID) totalCollected += inst.amount;
        else if (inst.status !== InstallmentStatus.POSTPONED) totalPending += inst.amount;
      });
    });
    return { totalLoaned, totalProfit, totalCollected, totalPending };
  }, [data.debts]);

  // --- SUB-VIEWS ---

  const DashboardView = () => (
    <div className="pb-24 animate-fade-in">
      <header className="bg-white p-6 pb-8 rounded-b-3xl shadow-sm mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">مرحباً بك 👋</h1>
        <p className="text-gray-500 text-sm">إليك ملخص الديون لهذا الشهر</p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <div className="flex items-center gap-2 mb-2 text-blue-600">
              <Wallet size={20} />
              <span className="text-xs font-semibold">إجمالي الديون</span>
            </div>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(stats.totalLoaned + stats.totalProfit)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
            <div className="flex items-center gap-2 mb-2 text-green-600">
              <CheckCircle2 size={20} />
              <span className="text-xs font-semibold">تم تحصيله</span>
            </div>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(stats.totalCollected)}</p>
          </div>
        </div>
      </header>
      <div className="px-4 space-y-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-gray-400" /> تحليل الأداء
          </h3>
          <div className="h-48 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'رأس المال', value: stats.totalLoaned },
                  { name: 'الأرباح', value: stats.totalProfit },
                  { name: 'المتبقي', value: stats.totalPending },
                ]} barSize={40}>
                  <XAxis dataKey="name" tick={{fill: '#6b7280', fontSize: 12}} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    { [stats.totalLoaned, stats.totalProfit, stats.totalPending].map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />) }
                  </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <AlertCircle size={18} className="text-red-500" /> استحقاقات قريبة/متأخرة
          </h3>
          <div className="space-y-3">
             {data.debts.flatMap(d => d.installments.map(i => ({...i, clientName: data.clients.find(c => c.id === d.clientId)?.name})))
                .filter(i => i.status !== InstallmentStatus.PAID && i.status !== InstallmentStatus.POSTPONED)
                .sort((a, b) => a.dueDate - b.dueDate).slice(0, 3)
                .map(inst => (
                  <div key={inst.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div><p className="font-semibold text-gray-800 text-sm">{inst.clientName}</p><p className="text-xs text-gray-500">{formatDate(inst.dueDate)}</p></div>
                    <span className="font-bold text-blue-600 text-sm">{formatCurrency(inst.amount)}</span>
                  </div>
                ))}
              {data.debts.length === 0 && <p className="text-center text-gray-400 text-sm py-4">لا توجد ديون مسجلة</p>}
          </div>
        </div>
      </div>
    </div>
  );

  const ClientsListView = () => {
    const filteredClients = data.clients.filter(c => c.name.includes(searchTerm) || c.phone.includes(searchTerm));
    return (
      <div className="pb-24 pt-4 px-4 h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">العملاء</h2>
          <button onClick={() => setCurrentView('ADD_CLIENT')} className="text-blue-600 p-2 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"><UserPlus size={24} /></button>
        </div>
        <div className="relative mb-6">
          <input type="text" placeholder="بحث باسم العميل أو الجوال..." className="w-full bg-white pl-4 pr-10 py-3 rounded-xl border-none shadow-sm text-sm focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <Search className="absolute right-3 top-3 text-gray-400" size={20} />
        </div>
        <div className="space-y-3 overflow-y-auto no-scrollbar pb-20">
          {filteredClients.map(client => {
            const clientDebts = data.debts.filter(d => d.clientId === client.id);
            const totalDebt = clientDebts.reduce((acc, curr) => acc + curr.totalValue, 0);
            const paidDebt = clientDebts.reduce((acc, curr) => acc + curr.installments.filter(i => i.status === InstallmentStatus.PAID).reduce((s, i) => s + i.amount, 0), 0);
            const remaining = totalDebt - paidDebt;
            return (
              <div key={client.id} onClick={() => { setSelectedClientId(client.id); setCurrentView('CLIENT_DETAILS'); }} className="bg-white p-4 rounded-xl shadow-sm active:scale-[0.99] transition-transform cursor-pointer">
                <div className="flex justify-between items-start">
                  <div><h3 className="font-bold text-gray-800">{client.name}</h3><p className="text-xs text-gray-500 mt-1">{client.phone}</p></div>
                  <div className="text-left"><span className="block text-xs text-gray-400">المتبقي</span><span className="font-bold text-red-500">{formatCurrency(remaining)}</span></div>
                </div>
                <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${totalDebt > 0 ? (paidDebt / totalDebt) * 100 : 0}%` }} /></div>
              </div>
            );
          })}
          {filteredClients.length === 0 && (
            <div className="text-center py-10 text-gray-400 animate-fade-in">
              <Users size={48} className="mx-auto mb-2 opacity-30" />
              <p>لا يوجد عملاء مضافون حالياً</p>
              <button onClick={() => setCurrentView('ADD_CLIENT')} className="mt-4 text-blue-600 font-bold text-sm">أضف أول عميل الآن</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ClientDetailsView = () => {
    const client = data.clients.find(c => c.id === selectedClientId);
    if (!client) return null;
    const clientDebts = data.debts.filter(d => d.clientId === client.id);

    const sendWhatsAppSummary = () => {
      const total = clientDebts.reduce((acc, d) => acc + d.totalValue, 0);
      const paid = clientDebts.reduce((acc, d) => acc + d.installments.filter(i => i.status === 'PAID').reduce((s, i) => s + i.amount, 0), 0);
      const remaining = total - paid;
      const message = `مرحباً ${client.name}،\nإليك ملخص حسابك:\nإجمالي الديون: ${formatCurrency(total)}\nالمسدد: ${formatCurrency(paid)}\nالمتبقي: ${formatCurrency(remaining)}\nشكراً لتعاملك معنا.`;
      window.open(`https://wa.me/${client.phone.replace('+', '')}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const sendInstallmentReceipt = (debt: Debt, inst: Installment, index: number) => {
  if (!client) return;

  const totalDebt = clientDebts.reduce(
    (acc, d) => acc + (d.totalValue || 0),
    0
  );

  const totalPaid = clientDebts.reduce((acc, d) => {
    const paidForDebt = (d.installments || [])
      .filter(i => i.status === 'PAID' || i.status === InstallmentStatus.PAID)
      .reduce((s, i) => s + (i.amount || 0), 0);
    return acc + paidForDebt;
  }, 0);

  const remainingTotal = totalDebt - totalPaid;

  const receiptNumber = index + 1;

  const message = `سند سداد قسط

العميل: ${client.name} 
رقم القسط: ${receiptNumber}
المبلغ: ${formatCurrency(inst.amount)}
التاريخ: ${formatDate(inst.paidDate || Date.now())}

إجمالي المديونية: ${formatCurrency(totalDebt)}
إجمالي المسدد: ${formatCurrency(totalPaid)}
إجمالي المتبقي: ${formatCurrency(remainingTotal)}

شكراً لسدادكم.`;

  const phone = String(client.phone || '').replace(/\D/g, '');
  if (!phone) return;

  window.open(
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    '_blank'
  );
};

    return (
      <div className="pb-24 bg-gray-50 min-h-screen animate-fade-in">
        <div className="bg-white pb-6 pt-4 px-4 rounded-b-3xl shadow-sm sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { setSelectedClientId(null); setCurrentView('CLIENTS_LIST'); }} className="p-2 -mr-2 text-gray-600"><ArrowLeft /></button>
            <h2 className="font-bold text-lg">ملف العميل</h2>
            <button onClick={() => deleteClient(client.id)} className="text-red-500 p-2 bg-red-50 rounded-full hover:bg-red-100 transition-colors" title="حذف العميل نهائياً"><Trash2 size={22} /></button>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mb-3">{client.name.charAt(0)}</div>
            <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-gray-500 text-sm flex items-center gap-1 mt-1"><Phone size={14} /> {client.phone}</p>
            <div className="flex gap-3 mt-4 w-full justify-center">
               <button onClick={sendWhatsAppSummary} className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-100"><Send size={16} /> كشف حساب</button>
            </div>
          </div>
        </div>
        <div className="px-4 mt-6 space-y-6">
           <div className="flex justify-between items-center">
             <h3 className="font-bold text-gray-800">الديون المسجلة</h3>
             <button onClick={() => { setEditingDebtId(null); setCurrentView('ADD_DEBT'); }} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors">+ مديونية</button>
           </div>
           {clientDebts.map(debt => (
             <div key={debt.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
               <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
                 <div><h4 className="font-bold text-gray-900">{debt.itemName}</h4><p className="text-xs text-gray-500 mt-1">أصل: {formatCurrency(debt.baseValue)} | ربح: {debt.profitPercentage.toFixed(1)}%</p></div>
                 <div className="flex gap-2">
                   <button onClick={() => { setEditingDebtId(debt.id); setCurrentView('EDIT_DEBT'); }} className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300" title="تعديل"><Edit size={16} /></button>
                   <button onClick={() => deleteDebt(debt.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100" title="حذف المديونية"><Trash2 size={16} /></button>
                 </div>
               </div>
               <div className="divide-y divide-gray-100">
                 {debt.installments.map((inst, idx) => (
                   <div key={inst.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                     <div className="flex items-center gap-3">
                       <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${inst.status === 'PAID' ? 'bg-green-100 text-green-700' : inst.status === InstallmentStatus.POSTPONED ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>{idx + 1}</span>
                       <div><p className="text-sm font-medium text-gray-900">{formatCurrency(inst.amount)}</p><p className="text-xs text-gray-500">{formatDate(inst.dueDate)}</p></div>
                     </div>
                     {inst.status === InstallmentStatus.PAID || inst.status === InstallmentStatus.POSTPONED ? (
                       <div className="flex items-center gap-2">
                         {inst.status === InstallmentStatus.PAID && (
                            <button onClick={() => sendInstallmentReceipt(debt, inst, idx)} className="text-green-600 bg-green-50 p-1.5 rounded-md hover:bg-green-100" title="إرسال سند"><Receipt size={16} /></button>
                         )}
                         <span className={`text-xs font-bold px-2 py-1 rounded-md ${inst.status === InstallmentStatus.POSTPONED ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>{inst.status === InstallmentStatus.POSTPONED ? 'تم التأجيل' : 'مدفوع'}</span>
                       </div>
                     ) : (
                       <button onClick={() => { setEditingDebtId(debt.id); setSelectedInstallmentId(inst.id); setCurrentView('RECORD_PAYMENT'); }} className="text-xs font-medium bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">تسجيل سداد</button>
                     )}
                   </div>
                 ))}
               </div>
               <div className="p-3 bg-gray-50 border-t border-gray-100 text-center"><div className="flex justify-between items-center text-sm"><span className="text-gray-500">الإجمالي:</span><span className="font-bold text-gray-800">{formatCurrency(debt.totalValue)}</span></div></div>
             </div>
           ))}
           {clientDebts.length === 0 && <p className="text-center text-gray-400 text-sm py-10">لا توجد ديون مسجلة حالياً</p>}
        </div>
      </div>
    );
  };

  const SettingsView = () => (
    <div className="bg-gray-50 min-h-screen pb-24 animate-fade-in">
      <header className="bg-white p-6 pb-8 rounded-b-3xl shadow-sm mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">الإعدادات</h1>
        <p className="text-gray-500 text-sm">إدارة البيانات والنسخ الاحتياطي</p>
      </header>

      <div className="px-4 space-y-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-blue-600 font-bold border-b pb-3 mb-2">
            <Database size={20} /> <h3>إدارة البيانات</h3>
          </div>
          
          <button onClick={exportData} className="w-full flex items-center justify-between p-4 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors">
            <div className="flex items-center gap-3"><Download size={20} /><span className="font-bold text-sm">تصدير نسخة احتياطية</span></div>
            <ArrowLeft className="rotate-180" size={16} />
          </button>

          <label className="w-full flex items-center justify-between p-4 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors cursor-pointer">
            <div className="flex items-center gap-3"><Upload size={20} /><span className="font-bold text-sm">استيراد بيانات</span></div>
            <input type="file" accept=".json" onChange={importData} className="hidden" />
            <ArrowLeft className="rotate-180" size={16} />
          </label>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-red-100">
          <h3 className="text-red-600 font-bold flex items-center gap-2 mb-4"><AlertCircle size={20} /> منطقة الخطر</h3>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">تصفير التطبيق سيقوم بحذف جميع البيانات المخزنة (العملاء والديون) بشكل نهائي من المتصفح.</p>
          <button onClick={resetAppData} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-4 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors">
            <Trash2 size={20} /> تصفير جميع بيانات التطبيق
          </button>
        </div>
      </div>
    </div>
  );

  const RecordPaymentView = () => {
    const debt = data.debts.find(d => d.id === editingDebtId);
    const installment = debt?.installments.find(i => i.id === selectedInstallmentId);
    if (!debt || !installment) return null;
    const futurePendingInstallments = useMemo(() => {
        const currentIndex = debt.installments.findIndex(i => i.id === installment.id);
        return debt.installments.slice(currentIndex + 1);
    }, [debt, installment]);
    const [paymentAmount, setPaymentAmount] = useState<number>(installment.amount);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [remainingMonths, setRemainingMonths] = useState<number>(futurePendingInstallments.length);
    const [previewInstallments, setPreviewInstallments] = useState<Installment[]>([]);
    const totalDebt = debt.totalValue;
    const previouslyPaid = debt.installments.filter(i => i.status === InstallmentStatus.PAID && i.id !== installment.id).reduce((sum, i) => sum + i.amount, 0);
    const balanceAfterThisPayment = totalDebt - previouslyPaid - paymentAmount;
    useEffect(() => { if (balanceAfterThisPayment > 1 && remainingMonths === 0) setRemainingMonths(1); }, [balanceAfterThisPayment]);
    useEffect(() => {
        if (balanceAfterThisPayment <= 0 && remainingMonths <= 0) { setPreviewInstallments([]); return; }
        const safeMonths = (balanceAfterThisPayment > 1 && remainingMonths === 0) ? 1 : remainingMonths;
        if (safeMonths > 0) {
            const payDateObj = new Date(paymentDate);
            const nextStartDate = new Date(payDateObj.getFullYear(), payDateObj.getMonth() + 1, debt.paymentDay);
            const plan = calculatePlan(Math.max(0, balanceAfterThisPayment), safeMonths, nextStartDate, debt.paymentDay);
            setPreviewInstallments(plan.map(p => ({ ...p, id: generateId(), debtId: debt.id, status: InstallmentStatus.PENDING })));
        } else setPreviewInstallments([]);
    }, [paymentAmount, remainingMonths, paymentDate, balanceAfterThisPayment, debt]);
    const handleConfirm = () => {
        if (paymentAmount < 0) return alert('المبلغ غير صحيح');
        processPayment(debt.id, installment.id, paymentAmount, new Date(paymentDate).getTime(), notes, previewInstallments);
    };
    return (
        <div className="bg-gray-50 min-h-screen pb-20 animate-fade-in">
            <div className="bg-white px-4 pt-6 pb-4 border-b border-gray-100 flex items-center shadow-sm sticky top-0 z-20"><button onClick={() => setCurrentView('CLIENT_DETAILS')} className="p-2 -mr-2 text-gray-600"><ArrowLeft /></button><h2 className="text-xl font-bold mr-2">تسجيل دفعة</h2></div>
            <div className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center mb-2">
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100"><span className="text-[10px] text-gray-400 block">إجمالي الدين</span><span className="text-sm font-bold text-gray-800">{formatCurrency(totalDebt)}</span></div>
                     <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100"><span className="text-[10px] text-gray-400 block">مدفوع سابقاً</span><span className="text-sm font-bold text-green-600">{formatCurrency(previouslyPaid)}</span></div>
                     <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100"><span className="text-[10px] text-gray-400 block">المتبقي</span><span className="text-sm font-bold text-red-500">{formatCurrency(balanceAfterThisPayment)}</span></div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-blue-600 font-bold mb-2"><Wallet size={20} /><h3>بيانات الدفعة الحالية</h3></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs text-gray-500 mb-1">المبلغ المدفوع</label><input type="number" value={paymentAmount} onChange={e => setPaymentAmount(Number(e.target.value))} className="w-full p-3 bg-gray-50 border border-blue-100 focus:border-blue-500 rounded-xl font-bold text-gray-900" /></div>
                        <div><label className="block text-xs text-gray-500 mb-1">تاريخ السداد</label><input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" /></div>
                    </div>
                    <div><label className="block text-xs text-gray-500 mb-1">ملاحظات (اختياري)</label><textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm h-20 resize-none" placeholder="سبب التأجيل، ملاحظات إضافية..." /></div>
                </div>
                {balanceAfterThisPayment > 0 && (
                    <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4 animate-fade-in border-t-4 border-orange-400">
                        <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-orange-600 font-bold"><RefreshCw size={20} /><h3>جدولة المتبقي</h3></div><span className="text-sm font-bold bg-orange-50 text-orange-700 px-3 py-1 rounded-lg">{formatCurrency(balanceAfterThisPayment)}</span></div>
                        <p className="text-xs text-gray-500 leading-relaxed">تلقائياً: تم توزيع المبلغ المتبقي على الأشهر القادمة بناءً على تاريخ السداد الجديد.<br/><span className="text-orange-600 font-medium">الإجمالي ثابت لا يتغير.</span></p>
                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200"><span className="text-sm font-medium text-gray-700">عدد الأشهر القادمة</span><div className="flex items-center gap-4"><button onClick={() => setRemainingMonths(Math.max(1, remainingMonths - 1))} className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center text-red-500 active:scale-90 transition-transform"><Minus size={18} /></button><span className="font-bold text-lg w-6 text-center">{remainingMonths}</span><button onClick={() => setRemainingMonths(remainingMonths + 1)} className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center text-green-600 active:scale-90 transition-transform"><Plus size={18} /></button></div></div>
                        <div className="border rounded-xl overflow-hidden"><div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-500 flex justify-between"><span>القسط</span><span>المبلغ الجديد</span><span>التاريخ المجدول</span></div><div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">{previewInstallments.map((inst, idx) => (<div key={idx} className="px-4 py-2 flex justify-between items-center text-sm bg-white"><span className="text-gray-400 w-6 text-center">{idx + 1}</span><span className="font-bold text-gray-800">{formatCurrency(inst.amount)}</span><span className="text-gray-500 text-xs">{formatDate(inst.dueDate)}</span></div>))}</div></div>
                    </div>
                )}
                <button onClick={handleConfirm} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"><CheckCircle2 size={20} />{paymentAmount === 0 ? 'تأكيد التأجيل والجدولة' : 'تأكيد السداد والجدولة'}</button>
            </div>
        </div>
    );
  };

  const AddClientView = () => {
    const [name, setName] = useState('');
    const [idNum, setIdNum] = useState('');
    const [phone, setPhone] = useState('');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if(name && phone) addClient({ name, nationalId: idNum, phone }); };
    return (
      <div className="bg-white min-h-screen pb-20 animate-fade-in">
        <div className="px-4 pt-6 pb-4 border-b border-gray-100 flex items-center"><button onClick={() => setCurrentView('CLIENTS_LIST')} className="p-2 -mr-2 text-gray-600"><ArrowLeft /></button><h2 className="text-xl font-bold mr-2">إضافة عميل جديد</h2></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
           <div><label className="block text-sm font-medium text-gray-700 mb-1">اسم العميل</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl" required placeholder="الاسم الثلاثي" /></div>
           <div><label className="block text-sm font-medium text-gray-700 mb-1">رقم الهوية / الإقامة</label><input type="number" value={idNum} onChange={e => setIdNum(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl" placeholder="اختياري" /></div>
           <div><label className="block text-sm font-medium text-gray-700 mb-1">رقم الجوال</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl" required placeholder="9665..." /></div>
           <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg mt-8 shadow-lg shadow-blue-200">حفظ العميل</button>
        </form>
      </div>
    );
  };

  const DebtFormView = () => {
    const isEditMode = currentView === 'EDIT_DEBT' && !!editingDebtId;
    const existingDebt = isEditMode ? data.debts.find(d => d.id === editingDebtId) : null;
    const client = data.clients.find(c => c.id === selectedClientId);
    const [clientId, setClientId] = useState(selectedClientId || '');
    const [itemName, setItemName] = useState('');
    const [baseValue, setBaseValue] = useState<number | ''>('');
    const [profitType, setProfitType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
    const [profitPercentage, setProfitPercentage] = useState<number>(10);
    const [fixedProfit, setFixedProfit] = useState<number | ''>('');
    const [months, setMonths] = useState<number>(6);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentDay, setPaymentDay] = useState(27);
    const [manualInstallments, setManualInstallments] = useState<any[]>([]);
    useEffect(() => {
        if (isEditMode && existingDebt) {
            setClientId(existingDebt.clientId); setItemName(existingDebt.itemName); setBaseValue(existingDebt.baseValue); setProfitPercentage(existingDebt.profitPercentage);
            setFixedProfit(existingDebt.profitValue); setMonths(existingDebt.monthCount); setStartDate(new Date(existingDebt.startDate).toISOString().split('T')[0]);
            setPaymentDay(existingDebt.paymentDay); setManualInstallments(existingDebt.installments);
        }
    }, [isEditMode, existingDebt]);
    const handleBaseValueChange = (val: number | '') => {
        setBaseValue(val); const base = Number(val) || 0;
        if (base > 0) { if (profitType === 'PERCENTAGE') setFixedProfit(base * (profitPercentage / 100)); else setProfitPercentage(((Number(fixedProfit) || 0) / base) * 100); }
    };
    const handlePercentageChange = (val: number) => { setProfitPercentage(val); const base = Number(baseValue) || 0; if (base > 0) setFixedProfit(base * (val / 100)); };
    const handleFixedProfitChange = (val: number | '') => { setFixedProfit(val); const base = Number(baseValue) || 0; const fixed = Number(val) || 0; if (base > 0) setProfitPercentage((fixed / base) * 100); };
    const getCalculatedValues = () => {
        const base = Number(baseValue) || 0; let profit = 0;
        if (profitType === 'PERCENTAGE') profit = base * (profitPercentage / 100); else profit = Number(fixedProfit) || 0;
        return { base, profit, total: base + profit };
    };
    const handleRecalculate = () => {
        const { total } = getCalculatedValues(); if (total === 0) return;
        const plan = calculatePlan(total, months, new Date(startDate), paymentDay);
        setManualInstallments(plan.map(p => ({ ...p, id: generateId(), debtId: isEditMode ? editingDebtId : 'temp' })));
    };
    const currentTotal = manualInstallments.reduce((sum, item) => sum + Number(item.amount), 0);
    const { total: targetTotal } = getCalculatedValues();
    const updateInstallment = (index: number, field: 'amount' | 'dueDate', value: any) => {
        const newInstallments = [...manualInstallments];
        if (field === 'dueDate') { newInstallments[index].dueDate = new Date(value).getTime(); setManualInstallments(newInstallments); }
        else {
            const newAmount = Number(value); if (newAmount < 0) return;
            newInstallments[index].amount = newAmount;
            const remainingCount = newInstallments.length - 1 - index;
            if (remainingCount > 0) {
                const sumSoFar = newInstallments.slice(0, index + 1).reduce((sum, i) => sum + i.amount, 0);
                const remainingBalance = targetTotal - sumSoFar;
                const amountPerMonth = Math.floor(remainingBalance / remainingCount);
                const remainder = remainingBalance - (amountPerMonth * remainingCount);
                for (let j = index + 1; j < newInstallments.length; j++) {
                     const isLast = j === newInstallments.length - 1;
                     newInstallments[j].amount = Math.max(0, amountPerMonth + (isLast ? remainder : 0));
                }
            }
            setManualInstallments(newInstallments);
        }
    };
    const handleSubmit = () => {
      if(!clientId || !itemName || !baseValue) return alert('الرجاء تعبئة البيانات الأساسية');
      const { base, profit } = getCalculatedValues();
      saveDebt({ id: editingDebtId, clientId, itemName, baseValue: base, profitPercentage: (base > 0) ? (profit / base) * 100 : 0, monthCount: months, startDate, paymentDay, installments: manualInstallments }, isEditMode);
    };
    return (
      <div className="bg-gray-50 min-h-screen pb-24 animate-fade-in">
        <div className="bg-white px-4 pt-6 pb-4 border-b border-gray-100 flex items-center shadow-sm"><button onClick={() => setCurrentView('CLIENT_DETAILS')} className="p-2 -mr-2 text-gray-600"><ArrowLeft /></button><h2 className="text-xl font-bold mr-2">{isEditMode ? 'تعديل المديونية' : 'إضافة مديونية جديدة'}</h2></div>
        <div className="p-4 space-y-5">
           {client && (<div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center"><p className="text-sm text-gray-600">العميل</p><p className="font-bold text-lg text-blue-900">{client.name}</p></div>)}
           <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
             <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2 mb-2"><FileText size={18} className="text-blue-500" /> تفاصيل السلعة</h3>
             <div><label className="block text-xs text-gray-500 mb-1">اسم السلعة / الخدمة</label><input type="text" value={itemName} onChange={e => setItemName(e.target.value)} className="w-full p-3 bg-gray-50 rounded-lg text-sm border focus:border-blue-500" placeholder="مثال: آيفون 15 برو" /></div>
             <div><label className="block text-xs text-gray-500 mb-1">القيمة الأساسية (رأس المال)</label><input type="number" value={baseValue} onChange={e => handleBaseValueChange(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-3 bg-gray-50 rounded-lg text-sm border font-bold text-gray-800" placeholder="0" /></div>
             <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div className="flex bg-white rounded-lg p-1 shadow-sm mb-3">
                   <button onClick={() => setProfitType('PERCENTAGE')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center justify-center gap-1 ${profitType === 'PERCENTAGE' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}><Percent size={14} /> نسبة مئوية</button>
                   <button onClick={() => setProfitType('FIXED')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center justify-center gap-1 ${profitType === 'FIXED' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}><Coins size={14} /> مبلغ ثابت</button>
                </div>
                {profitType === 'PERCENTAGE' ? (<div><label className="block text-xs text-gray-500 mb-1">نسبة الربح (%)</label><div className="flex gap-2"><input type="number" value={profitPercentage} onChange={e => handlePercentageChange(Number(e.target.value))} className="w-24 p-2 bg-white rounded-lg text-sm border text-center font-bold" /><div className="flex-1 p-2 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-between px-3"><span className="text-xs text-gray-500">قيمة الربح:</span><span className="text-sm font-bold text-gray-800">{formatCurrency(Number(fixedProfit) || 0)}</span></div></div></div>) : (<div><label className="block text-xs text-gray-500 mb-1">مبلغ الربح (ريال)</label><div className="flex gap-2"><input type="number" value={fixedProfit} onChange={e => handleFixedProfitChange(e.target.value === '' ? '' : Number(e.target.value))} className="flex-1 p-2 bg-white rounded-lg text-sm border font-bold" placeholder="0" /><div className="w-24 p-2 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center flex-col"><span className="text-[10px] text-gray-500">النسبة</span><span className="text-xs font-bold text-gray-800">{profitPercentage.toFixed(1)}%</span></div></div></div>)}
             </div>
             <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100"><span className="text-xs font-bold text-blue-800">إجمالي المديونية</span><span className="text-lg font-bold text-blue-700">{formatCurrency(targetTotal)}</span></div>
           </div>
           <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
             <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2 mb-2"><Calendar size={18} className="text-blue-500" /> إعدادات الخطة</h3>
             <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs text-gray-500 mb-1">عدد الأشهر</label><input type="number" value={months} onChange={e => setMonths(Number(e.target.value))} className="w-full p-3 bg-gray-50 rounded-lg text-sm border" /></div><div><label className="block text-xs text-gray-500 mb-1">يوم الاستقطاع</label><input type="number" min="1" max="31" value={paymentDay} onChange={e => setPaymentDay(Number(e.target.value))} className="w-full p-3 bg-gray-50 rounded-lg text-sm border" /></div></div>
             <div><label className="block text-xs text-gray-500 mb-1">تاريخ بداية العقد</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 bg-gray-50 rounded-lg text-sm border text-left ltr" /></div>
             <button onClick={handleRecalculate} className="w-full py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 text-sm border border-gray-200">{isEditMode ? 'إعادة إنشاء الجدول (مسح التعديلات اليدوية)' : 'إنشاء جدول الأقساط'}</button>
             <div className="mt-4"><div className="flex justify-between items-center mb-2"><span className="text-sm font-bold text-gray-700">جدول الأقساط</span><div className="text-xs"><span className="text-gray-500 ml-1">المجموع:</span><span className={`font-bold ${currentTotal === targetTotal ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(currentTotal)}</span></div></div><div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 bg-gray-50">{manualInstallments.map((inst, idx) => { const isLast = idx === manualInstallments.length - 1; return (<div key={idx} className="p-2 flex gap-2 items-center text-sm"><span className="text-gray-400 w-6 text-center">{idx + 1}</span><input type="date" className="p-1.5 rounded border border-gray-200 text-xs w-32 text-left" value={new Date(inst.dueDate).toISOString().split('T')[0]} onChange={(e) => updateInstallment(idx, 'dueDate', e.target.value)} /><input type="number" className={`p-1.5 rounded border text-xs w-24 font-bold text-gray-800 ${isLast ? 'bg-gray-100 text-gray-500' : 'border-gray-200'}`} value={inst.amount} onChange={(e) => updateInstallment(idx, 'amount', e.target.value)} disabled={isLast} />{isLast && <span className="text-[10px] text-gray-400">تلقائي</span>}</div>); })}{manualInstallments.length === 0 && (<div className="p-4 text-center text-gray-400 text-sm">اضغط على إنشاء الجدول</div>)}</div><p className="text-[10px] text-gray-400 mt-2 text-center">* عند تعديل مبلغ قسط، سيتم إعادة توزيع المتبقي تلقائياً على الأشهر التالية. القسط الأخير يحسب تلقائياً.</p></div>
           </div>
           <button onClick={handleSubmit} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"><Save size={20} />{isEditMode ? 'حفظ التعديلات' : 'اعتماد المديونية'}</button>
        </div>
      </div>
    );
  };

  // --- MAIN RENDER ---
  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen relative shadow-2xl overflow-hidden font-tajawal">
       {currentView === 'DASHBOARD' && <DashboardView />}
       {currentView === 'CLIENTS_LIST' && <ClientsListView />}
       {currentView === 'CLIENT_DETAILS' && <ClientDetailsView />}
       {currentView === 'ADD_CLIENT' && <AddClientView />}
       {(currentView === 'ADD_DEBT' || currentView === 'EDIT_DEBT') && <DebtFormView />}
       {currentView === 'RECORD_PAYMENT' && <RecordPaymentView />}
       {currentView === 'SETTINGS' && <SettingsView />}

       <TabBar currentView={currentView} onChangeView={setCurrentView} />
    </div>
  );
}
