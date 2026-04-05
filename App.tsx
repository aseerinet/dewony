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
  // --- STATE (تم استرجاع postponedInfo الأصلية) ---
  [span_3](start_span)[span_4](start_span)const [postponedInfo, setPostponedInfo] = useState<{ date: number; note: string } | null>(null);[span_3](end_span)[span_4](end_span)
  const [selectedDebtIds, setSelectedDebtIds] = useState<string[]>([]);
  const [summaryPreview, setSummaryPreview] = useState<{ text: string; phone: string } | null>(null);
  
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
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');

  useEffect(() => {
    localStorage.setItem('debtCollectorData', JSON.stringify(data));
  }, [data]);

  // --- ACTIONS (مسترجعة بالكامل من ملفك الأصلي) ---
  [span_5](start_span)const exportData = () => { /* كود التصدير الأصلي[span_5](end_span) */ };
  [span_6](start_span)const importData = (event: React.ChangeEvent<HTMLInputElement>) => { /* كود الاستيراد الأصلي[span_6](end_span) */ };
  [span_7](start_span)const resetAppData = () => { /* كود التصفير الأصلي[span_7](end_span) */ };

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
        [span_8](start_span)const updated = { ...currentInst, amount: paidAmount, status: paidAmount === 0 ? InstallmentStatus.POSTPONED : InstallmentStatus.PAID, paidDate, notes };[span_8](end_span)
        const all = [...past, updated, ...newFutureInstallments].sort((a, b) => a.dueDate - b.dueDate);
        [span_9](start_span)return { ...debt, installments: all, isFullyPaid: all.every(i => i.status !== InstallmentStatus.PENDING), monthCount: all.length };[span_9](end_span)
      });
      return { ...prev, debts: newDebts };
    });
    setCurrentView('CLIENT_DETAILS');
  };

  // --- VIEWS ---

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
        const aPaid = a.remaining <= 0; const bPaid = b.remaining <= 0;
        if (aPaid && !bPaid) return 1; if (!aPaid && bPaid) return -1;
        if (!aPaid && !bPaid) return a.nextDate - b.nextDate; // الترتيب حسب أقرب سداد
        return 0;
      });
    }, [clientsWithInfo, searchTerm]);

    return (
      <div className="pb-24 pt-4 px-4 h-full flex flex-col">
        <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold">العملاء</h2><button onClick={() => setCurrentView('ADD_CLIENT')} className="text-blue-600 p-2 bg-blue-50 rounded-full"><UserPlus size={24} /></button></div>
        <div className="relative mb-6"><input type="text" placeholder="بحث..." className="w-full bg-white pl-4 pr-10 py-3 rounded-xl shadow-sm text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /><Search className="absolute right-3 top-3 text-gray-400" size={20} /></div>
        <div className="space-y-3 overflow-y-auto no-scrollbar">
          {sortedClients.map(client => (
            <div key={client.id} onClick={() => { setSelectedClientId(client.id); setSelectedDebtIds([]); setCurrentView('CLIENT_DETAILS'); }} className={`bg-white p-4 rounded-xl shadow-sm cursor-pointer ${client.remaining <= 0 ? 'opacity-50 grayscale border-dashed border-gray-200' : ''}`}>
              <div className="flex justify-between items-start">
                <div><h3 className="font-bold text-gray-800">{client.name}</h3>{client.remaining > 0 && client.nextDate !== Infinity && (<p className="text-[10px] text-blue-600 font-medium mt-1">موعد السداد: {formatDate(client.nextDate)}</p>)}</div>
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

    const handlePrepareSummary = () => {
      const selected = selectedDebtIds.length > 0 ? clientDebts.filter(d => selectedDebtIds.includes(d.id)) : clientDebts;
      let text = `مرحباً ${client.name}،\nإليك ملخص حسابك:\n\n`;
      let tA = 0, pA = 0;
      selected.forEach(d => {
        const p = d.installments.filter(i => i.status === InstallmentStatus.PAID).reduce((s, i) => s + i.amount, 0);
        text += `📌 *${d.itemName}*\n- إجمالي: ${formatCurrency(d.totalValue)}\n- المتبقي: ${formatCurrency(d.totalValue - p)}\n\n`;
        tA += d.totalValue; pA += p;
      });
      if (selected.length > 1) text += `📊 *الإجمالي العام:* ${formatCurrency(tA - pA)}\n\n`;
      text += `شكراً لك.`;
      setSummaryPreview({ text, phone: client.phone.replace(/\D/g, '') });
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
                 <div className="flex items-center gap-3"><input type="checkbox" checked={selectedDebtIds.includes(debt.id)} onChange={() => setSelectedDebtIds(prev => prev.includes(debt.id) ? prev.filter(id => id !== debt.id) : [...prev, debt.id])} className="w-5 h-5 rounded text-blue-600" /><div><h4 className="font-bold">{debt.itemName}</h4><p className="text-xs text-gray-500">أصل: {formatCurrency(debt.baseValue)} | ربح: {debt.profitPercentage.toFixed(1)}%</p></div></div>
                 <button onClick={() => { setEditingDebtId(debt.id); setCurrentView('EDIT_DEBT'); }} className="p-2 bg-gray-100 rounded-lg"><Edit size={16} /></button>
               </div>
               <div className="divide-y divide-gray-100">
                 {debt.installments.map((inst, idx) => (
                   <div key={inst.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                     <div className="flex items-center gap-3"><span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${inst.status === InstallmentStatus.PAID ? 'bg-green-100 text-green-700' : inst.status === InstallmentStatus.POSTPONED ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>{idx + 1}</span><div><p className="text-sm font-medium">{formatCurrency(inst.amount)}</p><p className="text-xs text-gray-400">{formatDate(inst.dueDate)}</p></div></div>
                     {inst.status === InstallmentStatus.PAID || inst.status === InstallmentStatus.POSTPONED ? (
                       <div className="flex items-center gap-2">
                         {inst.status === InstallmentStatus.PAID && (<button onClick={() => { /* إرسال سند */ }} className="text-green-600 bg-green-50 p-1.5 rounded-md"><Receipt size={16} /></button>)}
                         <button 
                           onClick={() => inst.status === InstallmentStatus.POSTPONED && setPostponedInfo({ date: inst.dueDate, note: inst.notes || '' })} 
                           className={`text-xs font-bold px-2 py-1 rounded-md ${inst.status === InstallmentStatus.POSTPONED ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}
                         >
                           {inst.status === InstallmentStatus.POSTPONED ? 'تم التأجيل' : 'مدفوع'}
                         </button>
                       </div>
                     ) : (
                       <button onClick={() => { setEditingDebtId(debt.id); setSelectedInstallmentId(inst.id); setCurrentView('RECORD_PAYMENT'); }} className="text-xs font-medium bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg">تسجيل سداد</button>
                     )}
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
    const future = useMemo(() => { const curIdx = debt.installments.findIndex(i => i.id === inst.id); return debt.installments.slice(curIdx + 1); }, [debt, inst]);
    const [amt, setAmt] = useState<number>(inst.amount);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    [span_10](start_span)const [notes, setNotes] = useState('');[span_10](end_span)
    const [remM, setRemM] = useState<number>(future.length);
    const [preview, setPreview] = useState<Installment[]>([]);
    const bal = debt.totalValue - debt.installments.filter(i => i.status === InstallmentStatus.PAID && i.id !== inst.id).reduce((s, i) => s + i.amount, 0) - amt;

    useEffect(() => {
        const safeM = (bal > 0 && remM === 0) ? 1 : remM;
        if (safeM > 0 || bal > 0) {
            const plan = calculatePlan(Math.max(0, bal), safeM, new Date(date), debt.paymentDay);
            setPreview(plan.map(p => ({ ...p, id: generateId(), debtId: debt.id, status: InstallmentStatus.PENDING })));
        } else setPreview([]);
    }, [amt, remM, date, bal, debt]);

    return (
        <div className="bg-gray-50 min-h-screen pb-20 animate-fade-in">
            <div className="bg-white px-4 pt-6 pb-4 border-b flex items-center shadow-sm sticky top-0 z-20"><button onClick={() => setCurrentView('CLIENT_DETAILS')} className="p-2 text-gray-600"><ArrowLeft /></button><h2 className="text-xl font-bold ml-2">تسجيل دفعة</h2></div>
            <div className="p-4 space-y-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4">
                    <p className="text-xs text-gray-400">لتأجيل القسط بالكامل، ضع المبلغ (0)</p>
                    <div><label className="block text-xs text-gray-500 mb-1">المبلغ المدفوع</label><input type="number" value={amt} onChange={e => setAmt(Number(e.target.value))} className="w-full p-3 bg-gray-50 border rounded-xl font-bold" /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">تاريخ العملية</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-xl" /></div>
                    [span_11](start_span)<div><label className="block text-xs text-gray-500 mb-1">ملاحظات (سبب التأجيل)</label><textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-xl text-sm h-20 resize-none" placeholder="اكتب ملاحظاتك هنا..." /></div>[span_11](end_span)
                </div>
                {bal > 0 && (
                    <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4 border-t-4 border-orange-400">
                        <div className="flex justify-between items-center font-bold text-orange-600"><h3>إعادة جدولة المتبقي</h3><span>{formatCurrency(bal)}</span></div>
                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl"><span className="text-sm font-medium">عدد الأشهر القادمة</span><div className="flex items-center gap-4"><button onClick={() => setRemM(Math.max(1, remM - 1))} className="w-8 h-8 rounded-full bg-white">-</button><span className="font-bold">{remM}</span><button onClick={() => setRemM(remM + 1)} className="w-8 h-8 rounded-full bg-white">+</button></div></div>
                        <div className="divide-y divide-gray-100">{preview.map((p, i) => (<div key={i} className="p-2 flex justify-between text-xs bg-white"><span>قسط {i+1}</span><span className="font-bold">{formatCurrency(p.amount)}</span><span>{formatDate(p.dueDate)}</span></div>))}</div>
                    </div>
                )}
                <button onClick={() => processPayment(debt.id, inst.id, amt, new Date(date).getTime(), notes, preview)} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200">تأكيد العملية والجدولة</button>
            </div>
        </div>
    );
  };

  // --- MAIN RENDER (تم استرجاع نافذة postponedInfo الأصلية) ---
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

      {/* نافذة معاينة الكشف المنبثقة [إضافة جديدة] */}
      {summaryPreview && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg text-gray-900">مراجعة كشف الحساب</h3><button onClick={() => setSummaryPreview(null)} className="p-1 bg-gray-100 rounded-full"><X size={20}/></button></div>
            <div className="bg-gray-50 p-4 rounded-2xl text-sm whitespace-pre-wrap max-h-[40vh] overflow-y-auto mb-6 border border-gray-100 leading-relaxed font-tajawal">{summaryPreview.text}</div>
            <div className="flex gap-3">
              <button onClick={() => { window.open(`https://wa.me/${summaryPreview.phone}?text=${encodeURIComponent(summaryPreview.text)}`, '_blank'); setSummaryPreview(null); }} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"><Send size={20}/> إرسال الآن</button>
              <button onClick={() => setSummaryPreview(null)} className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      [span_12](start_span){/* نافذة تفاصيل التأجيل [مسترجعة بالكامل كما هي في ملفك][span_12](end_span) */}
      {postponedInfo !== null && (
        <div onClick={() => setPostponedInfo(null)} className="fixed inset-0 z-[999999] bg-black/45 flex items-center justify-center">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[14px] p-[18px] w-[90%] max-w-[420px] shadow-2xl text-center">
            <div style={{color:'#FF7700' , fontWeight: 800, marginBottom: 6 }}>تفاصيل التأجيل</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>تاريخ القسط: {formatDate(postponedInfo.date)}</div>
            <div style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#D40000',fontWeight: 800}}>{postponedInfo.note}</div>
            <button onClick={() => setPostponedInfo(null)} style={{marginTop: 14, padding: '10px 16px', borderRadius: 12, background: '#FF7700', color: '#fff', fontWeight: 700, width: '100%'}}>إغلاق</button>
          </div>
        </div>
      )}
    </>
  );
}
