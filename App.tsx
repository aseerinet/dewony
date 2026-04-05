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
  [span_3](start_span)const [postponedInfo, setPostponedInfo] = useState<{ date: number; note: string } | null>(null);[span_3](end_span)
  [span_4](start_span)const [selectedDebtIds, setSelectedDebtIds] = useState<string[]>([]);[span_4](end_span)
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
  [span_5](start_span)});[span_5](end_span)

  [span_6](start_span)const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');[span_6](end_span)
  [span_7](start_span)const [selectedClientId, setSelectedClientId] = useState<string | null>(null);[span_7](end_span)
  [span_8](start_span)const [editingDebtId, setEditingDebtId] = useState<string | null>(null);[span_8](end_span)
  [span_9](start_span)const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | null>(null);[span_9](end_span)
  [span_10](start_span)const [searchTerm, setSearchTerm] = useState('');[span_10](end_span)
  [span_11](start_span)const [isEditClientOpen, setIsEditClientOpen] = useState(false);[span_11](end_span)
  [span_12](start_span)const [editClientName, setEditClientName] = useState('');[span_12](end_span)
  [span_13](start_span)const [editClientPhone, setEditClientPhone] = useState('');[span_13](end_span)

  useEffect(() => {
    localStorage.setItem('debtCollectorData', JSON.stringify(data));
  [span_14](start_span)}, [data]);[span_14](end_span)

  // --- DATA MANAGEMENT ACTIONS ---
  const exportData = () => {
    [span_15](start_span)const dataStr = JSON.stringify(data, null, 2);[span_15](end_span)
    [span_16](start_span)const blob = new Blob([dataStr], { type: "application/json" });[span_16](end_span)
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    [span_17](start_span)link.download = `debt_backup_${new Date().toISOString().split('T')[0]}.json`;[span_17](end_span)
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    [span_18](start_span)const file = event.target.files?.[0];[span_18](end_span)
    [span_19](start_span)if (!file) return;[span_19](end_span)
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        [span_20](start_span)const json = JSON.parse(e.target?.result as string);[span_20](end_span)
        [span_21](start_span)if (json.clients && json.debts) {[span_21](end_span)
          [span_22](start_span)if (confirm('سيتم استبدال البيانات الحالية بالنسخة المرفوعة. هل تريد الاستمرار؟')) {[span_22](end_span)
            [span_23](start_span)setData(json);[span_23](end_span)
            [span_24](start_span)alert('تم استعادة البيانات بنجاح ✅');[span_24](end_span)
          }
        } else { alert('الملف غير صالح ❌'); [span_25](start_span)}
      } catch (err) { alert('حدث خطأ أثناء قراءة الملف ❌'); }[span_25](end_span)
    };
    reader.readAsText(file);
    event.target.value = ''; 
  };

  const resetAppData = () => {
    [span_26](start_span)if (confirm('تحذير نهائي: سيتم حذف جميع العملاء والديون والبيانات نهائياً...')) {[span_26](end_span)
      [span_27](start_span)setData({ clients: [], debts: [] });[span_27](end_span)
      [span_28](start_span)setSelectedClientId(null);[span_28](end_span)
      [span_29](start_span)setEditingDebtId(null);[span_29](end_span)
      [span_30](start_span)setCurrentView('DASHBOARD');[span_30](end_span)
      [span_31](start_span)localStorage.removeItem('debtCollectorData');[span_31](end_span)
      [span_32](start_span)alert('تم تصفير التطبيق بالكامل بنجاح ✅');[span_32](end_span)
    }
  };

  // --- APP ACTIONS ---
  const addClient = (client: Omit<Client, 'id' | 'createdAt'>) => {
    [span_33](start_span)const newClient: Client = { ...client, id: generateId(), createdAt: Date.now() };[span_33](end_span)
    [span_34](start_span)setData(prev => ({ ...prev, clients: [newClient, ...prev.clients] }));[span_34](end_span)
    [span_35](start_span)setCurrentView('CLIENTS_LIST');[span_35](end_span)
  };

  const saveDebt = (debtData: any, isEdit: boolean) => {
    [span_36](start_span)const { id, clientId, itemName, baseValue, profitPercentage, monthCount, startDate, paymentDay, installments } = debtData;[span_36](end_span)
    [span_37](start_span)const finalInstallmentsTotal = installments.reduce((sum: number, i: any) => sum + Number(i.amount), 0);[span_37](end_span)
    [span_38](start_span)const profitValue = finalInstallmentsTotal - Number(baseValue);[span_38](end_span)
    [span_39](start_span)const processedInstallments = installments.map((inst: any) => ({[span_39](end_span)
      ...inst, id: inst.id || generateId(), debtId: isEdit ? id : 'temp', status: inst.status || [span_40](start_span)InstallmentStatus.PENDING[span_40](end_span)
    }));

    [span_41](start_span)if (isEdit) {[span_41](end_span)
       setData(prev => ({
         [span_42](start_span)...prev, debts: prev.debts.map(d => d.id === id ? {[span_42](end_span)
            ...d, itemName, baseValue, profitPercentage, profitValue,
            totalValue: finalInstallmentsTotal, monthCount,
            startDate: new Date(startDate).getTime(), paymentDay,
            [span_43](start_span)installments: processedInstallments[span_43](end_span)
         [span_44](start_span)} : d)[span_44](end_span)
       }));
    [span_45](start_span)} else {[span_45](end_span)
      [span_46](start_span)const newDebt: Debt = {[span_46](end_span)
        id: generateId(), clientId, itemName, baseValue, profitPercentage, profitValue,
        totalValue: finalInstallmentsTotal, monthCount,
        startDate: new Date(startDate).getTime(), paymentDay,
        [span_47](start_span)isFullyPaid: false, installments: processedInstallments[span_47](end_span)
      };
      [span_48](start_span)newDebt.installments.forEach(i => i.debtId = newDebt.id);[span_48](end_span)
      [span_49](start_span)setData(prev => ({ ...prev, debts: [newDebt, ...prev.debts] }));[span_49](end_span)
    }
    [span_50](start_span)setSelectedClientId(clientId);[span_50](end_span)
    [span_51](start_span)setCurrentView('CLIENT_DETAILS');[span_51](end_span)
  };

  const processPayment = (debtId: string, installmentId: string, paidAmount: number, paidDate: number, notes: string, newFutureInstallments: Installment[]) => {
    setData(prev => {
      const newDebts = prev.debts.map(debt => {
        [span_52](start_span)if (debt.id !== debtId) return debt;[span_52](end_span)
        [span_53](start_span)const pastInstallments = debt.installments.filter(i => i.id !== installmentId && (i.status === InstallmentStatus.PAID || i.status === InstallmentStatus.POSTPONED));[span_53](end_span)
        [span_54](start_span)const currentInstallment = debt.installments.find(i => i.id === installmentId);[span_54](end_span)
        [span_55](start_span)if(!currentInstallment) return debt;[span_55](end_span)
        [span_56](start_span)const isPostponed = paidAmount === 0;[span_56](end_span)
        [span_57](start_span)const updatedCurrent: Installment = {[span_57](end_span)
          ...currentInstallment, amount: paidAmount, status: isPostponed ? InstallmentStatus.POSTPONED : InstallmentStatus.PAID,
          [span_58](start_span)paidDate: paidDate, notes: notes[span_58](end_span)
        };
        [span_59](start_span)const allInstallments = [...pastInstallments, updatedCurrent, ...newFutureInstallments].sort((a, b) => a.dueDate - b.dueDate);[span_59](end_span)
        [span_60](start_span)const allPaid = allInstallments.every(i => i.status === InstallmentStatus.PAID || i.status === InstallmentStatus.POSTPONED);[span_60](end_span)
        [span_61](start_span)return { ...debt, installments: allInstallments, isFullyPaid: allPaid, monthCount: pastInstallments.length + 1 + newFutureInstallments.length };[span_61](end_span)
      });
      [span_62](start_span)return { ...prev, debts: newDebts };[span_62](end_span)
    });
    [span_63](start_span)setCurrentView('CLIENT_DETAILS');[span_63](end_span)
  };

  // --- VIEWS ---

  const ClientsListView = () => {
    const clientsWithTotals = useMemo(() => {
      return data.clients.map(client => {
        [span_64](start_span)const clientDebts = data.debts.filter(d => d.clientId === client.id);[span_64](end_span)
        [span_65](start_span)const total = clientDebts.reduce((acc, curr) => acc + curr.totalValue, 0);[span_65](end_span)
        [span_66](start_span)const paid = clientDebts.reduce((acc, curr) => acc + curr.installments.filter(i => i.status === InstallmentStatus.PAID).reduce((s, i) => s + i.amount, 0), 0);[span_66](end_span)
        [span_67](start_span)const remaining = total - paid;[span_67](end_span)
        const nextDate = clientDebts.flatMap(d => d.installments).filter(i => i.status === InstallmentStatus.PENDING).sort((a, b) => a.dueDate - b.dueDate)[0]?.dueDate || Infinity;
        [span_68](start_span)return { ...client, total, paid, remaining, nextDate };[span_68](end_span)
      });
    }, [data.clients, data.debts]);

    const filteredClients = useMemo(() => {
      return clientsWithTotals
        [span_69](start_span).filter(c => c.name.includes(searchTerm) || c.phone.includes(searchTerm))[span_69](end_span)
        .sort((a, b) => {
          [span_70](start_span)const aIsPaid = a.remaining <= 0;[span_70](end_span)
          [span_71](start_span)const bIsPaid = b.remaining <= 0;[span_71](end_span)
          [span_72](start_span)if (aIsPaid && !bIsPaid) return 1;[span_72](end_span)
          [span_73](start_span)if (!aIsPaid && bIsPaid) return -1;[span_73](end_span)
          if (!aIsPaid && !bIsPaid) return a.nextDate - b.nextDate; // الترتيب المطلوب
          [span_74](start_span)return b.remaining - a.remaining;[span_74](end_span)
        });
    }, [clientsWithTotals, searchTerm]);

    return (
      <div className="pb-24 pt-4 px-4 h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          [span_75](start_span)<h2 className="text-2xl font-bold text-gray-900">العملاء</h2>[span_75](end_span)
          [span_76](start_span)<button onClick={() => setCurrentView('ADD_CLIENT')} className="text-blue-600 p-2 bg-blue-50 rounded-full"><UserPlus size={24} /></button>[span_76](end_span)
        </div>
        <div className="relative mb-6">
          [span_77](start_span)<input type="text" placeholder="بحث..." className="w-full bg-white pl-4 pr-10 py-3 rounded-xl shadow-sm text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />[span_77](end_span)
          [span_78](start_span)<Search className="absolute right-3 top-3 text-gray-400" size={20} />[span_78](end_span)
        </div>
        <div className="space-y-3 overflow-y-auto no-scrollbar pb-20">
          {filteredClients.map(client => (
            [span_79](start_span)<div key={client.id} onClick={() => { setSelectedClientId(client.id); setSelectedDebtIds([]); setCurrentView('CLIENT_DETAILS'); }} className={`bg-white p-4 rounded-xl shadow-sm cursor-pointer ${client.remaining <= 0 ? 'opacity-50 grayscale border-dashed border-gray-200' : ''}`}>[span_79](end_span)
              <div className="flex justify-between items-start">
                [span_80](start_span)<div><h3 className="font-bold text-gray-800">{client.name}</h3><p className="text-xs text-gray-500 mt-1">{client.phone}</p></div>[span_80](end_span)
                <div className="text-left"><span className="block text-xs text-gray-400">المتبقي</span><span className={`font-bold ${client.remaining <= 0 ? 'text-gray-400' : 'text-red-500'}`}>{client.remaining <= 0 ? [span_81](start_span)'0' : formatCurrency(client.remaining)}</span></div>[span_81](end_span)
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const ClientDetailsView = () => {
    [span_82](start_span)const client = data.clients.find(c => c.id === selectedClientId);[span_82](end_span)
    [span_83](start_span)if (!client) return null;[span_83](end_span)
    [span_84](start_span)const clientDebts = data.debts.filter(d => d.clientId === client.id);[span_84](end_span)

    const handlePrepareSummary = () => {
      [span_85](start_span)const selected = selectedDebtIds.length > 0 ? clientDebts.filter(d => selectedDebtIds.includes(d.id)) : clientDebts;[span_85](end_span)
      [span_86](start_span)let text = `مرحباً ${client.name}،\nإليك ملخص حسابك:\n\n`;[span_86](end_span)
      [span_87](start_span)let tA = 0, pA = 0;[span_87](end_span)
      selected.forEach(d => {
        [span_88](start_span)const p = d.installments.filter(i => i.status === InstallmentStatus.PAID).reduce((s, i) => s + i.amount, 0);[span_88](end_span)
        [span_89](start_span)text += `📌 *${d.itemName}*\n- إجمالي: ${formatCurrency(d.totalValue)}\n- المتبقي: ${formatCurrency(d.totalValue - p)}\n\n`;[span_89](end_span)
        [span_90](start_span)tA += d.totalValue; pA += p;[span_90](end_span)
      });
      [span_91](start_span)if (selected.length > 1) text += `📊 *الإجمالي:* ${formatCurrency(tA - pA)}\n\n`;[span_91](end_span)
      [span_92](start_span)text += `شكراً لك.`;[span_92](end_span)
      setSummaryPreview({ text, phone: client.phone.replace(/\D/g, '') });
    };

    return (
      <div className="pb-24 bg-gray-50 min-h-screen">
        <div className="bg-white pb-6 pt-4 px-4 rounded-b-3xl shadow-sm sticky top-0 z-10 text-center">
          [span_93](start_span)<div className="flex items-center justify-between mb-4"><button onClick={() => { setSelectedClientId(null); setCurrentView('CLIENTS_LIST'); }} className="p-2 text-gray-600"><ArrowLeft /></button><h2 className="font-bold">ملف العميل</h2><button onClick={() => deleteClient(client.id)} className="text-red-500 p-2"><Trash2 size={22} /></button></div>[span_93](end_span)
          [span_94](start_span)<div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-2">{client.name[0]}</div>[span_94](end_span)
          [span_95](start_span)<h1 className="text-xl font-bold">{client.name}</h1>[span_95](end_span)
          [span_96](start_span)<button onClick={handlePrepareSummary} className="mt-4 flex items-center gap-2 bg-green-50 text-green-700 px-6 py-2 rounded-xl font-bold mx-auto"><Send size={16} /> كشف حساب</button>[span_96](end_span)
        </div>
        <div className="px-4 mt-6 space-y-6">
          {clientDebts.map(debt => (
            [span_97](start_span)<div key={debt.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden border ${selectedDebtIds.includes(debt.id) ? 'border-blue-500 ring-1' : 'border-gray-100'}`}>[span_97](end_span)
              <div className="p-4 border-b bg-gray-50/50 flex justify-between items-start">
                [span_98](start_span)<div className="flex items-center gap-3"><input type="checkbox" checked={selectedDebtIds.includes(debt.id)} onChange={() => setSelectedDebtIds(prev => prev.includes(debt.id) ? prev.filter(id => id !== debt.id) : [...prev, debt.id])} className="w-5 h-5 rounded text-blue-600" /><div><h4 className="font-bold">{debt.itemName}</h4><p className="text-xs text-gray-500">أصل: {formatCurrency(debt.baseValue)}</p></div></div>[span_98](end_span)
                <button onClick={() => { setEditingDebtId(debt.id); setCurrentView('EDIT_DEBT'); [span_99](start_span)}} className="p-2 bg-gray-100 rounded-lg"><Edit size={16} /></button>[span_99](end_span)
              </div>
              <div className="divide-y divide-gray-100">
                {debt.installments.map((inst, idx) => (
                  <div key={inst.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      [span_100](start_span)<span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${inst.status === InstallmentStatus.PAID ? 'bg-green-100 text-green-700' : inst.status === InstallmentStatus.POSTPONED ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>{idx + 1}</span>[span_100](end_span)
                      [span_101](start_span)<div><p className="text-sm font-medium">{formatCurrency(inst.amount)}</p><p className="text-xs text-gray-400">{formatDate(inst.dueDate)}</p></div>[span_101](end_span)
                    </div>
                    {inst.status === InstallmentStatus.PAID || inst.status === InstallmentStatus.POSTPONED ? [span_102](start_span)(
                      <div className="flex items-center gap-2">
                        <button onClick={() => inst.status === InstallmentStatus.POSTPONED && setPostponedInfo({ date: inst.dueDate, note: inst.notes || '' })} className={`text-xs font-bold px-2 py-1 rounded-md ${inst.status === InstallmentStatus.POSTPONED ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>{inst.status === InstallmentStatus.POSTPONED ? 'تم التأجيل' : 'مدفوع'}</button>[span_102](end_span)
                      </div>
                    ) : (
                      [span_103](start_span)<button onClick={() => { setEditingDebtId(debt.id); setSelectedInstallmentId(inst.id); setCurrentView('RECORD_PAYMENT'); }} className="text-xs font-medium bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg">تسجيل سداد</button>[span_103](end_span)
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
    [span_104](start_span)const debt = data.debts.find(d => d.id === editingDebtId);[span_104](end_span)
    [span_105](start_span)const installment = debt?.installments.find(i => i.id === selectedInstallmentId);[span_105](end_span)
    [span_106](start_span)if (!debt || !installment) return null;[span_106](end_span)
    [span_107](start_span)const futurePending = useMemo(() => { const idx = debt.installments.findIndex(i => i.id === installment.id); return debt.installments.slice(idx + 1); }, [debt, installment]);[span_107](end_span)
    [span_108](start_span)const [pAmt, setPAmt] = useState<number>(installment.amount);[span_108](end_span)
    [span_109](start_span)const [pDate, setPDate] = useState(new Date().toISOString().split('T')[0]);[span_109](end_span)
    [span_110](start_span)const [notes, setNotes] = useState('');[span_110](end_span)
    [span_111](start_span)const [remM, setRemM] = useState<number>(futurePending.length);[span_111](end_span)
    [span_112](start_span)const [preview, setPreview] = useState<Installment[]>([]);[span_112](end_span)
    [span_113](start_span)const previouslyPaid = debt.installments.filter(i => i.status === InstallmentStatus.PAID && i.id !== installment.id).reduce((s, i) => s + i.amount, 0);[span_113](end_span)
    [span_114](start_span)const balance = debt.totalValue - previouslyPaid - pAmt;[span_114](end_span)

    useEffect(() => {
        [span_115](start_span)if (balance <= 0 && remM <= 0) { setPreview([]); return; }[span_115](end_span)
        const safeM = (balance > 1 && remM === 0) ? [span_116](start_span)1 : remM;[span_116](end_span)
        if (safeM > 0) {
            [span_117](start_span)const plan = calculatePlan(Math.max(0, balance), safeM, new Date(pDate), debt.paymentDay);[span_117](end_span)
            [span_118](start_span)setPreview(plan.map(p => ({ ...p, id: generateId(), debtId: debt.id, status: InstallmentStatus.PENDING })));[span_118](end_span)
        }
    }, [pAmt, remM, pDate, balance, debt]);

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            [span_119](start_span)<div className="bg-white p-4 border-b flex items-center sticky top-0 z-20"><button onClick={() => setCurrentView('CLIENT_DETAILS')} className="p-2 text-gray-600"><ArrowLeft /></button><h2 className="text-xl font-bold ml-2">تسجيل دفعة</h2></div>[span_119](end_span)
            <div className="p-4 space-y-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4">
                    [span_120](start_span)<div><label className="block text-xs text-gray-500 mb-1">المبلغ المدفوع</label><input type="number" value={pAmt} onChange={e => setPAmt(Number(e.target.value))} className="w-full p-3 bg-gray-50 border rounded-xl font-bold" /></div>[span_120](end_span)
                    [span_121](start_span)<div><label className="block text-xs text-gray-500 mb-1">ملاحظات (سبب التأجيل)</label><textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-xl text-sm h-20 resize-none" /></div>[span_121](end_span)
                </div>
                {balance > 0 && (
                    <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4 border-t-4 border-orange-400">
                        [span_122](start_span)<div className="flex justify-between items-center font-bold text-orange-600"><h3>إعادة جدولة المتبقي</h3><span>{formatCurrency(balance)}</span></div>[span_122](end_span)
                        [span_123](start_span)<div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl"><span className="text-sm font-medium">عدد الأشهر</span><div className="flex items-center gap-4"><button onClick={() => setRemM(Math.max(1, remM - 1))} className="w-8 h-8 rounded-full bg-white">-</button><span className="font-bold">{remM}</span><button onClick={() => setRemM(remM + 1)} className="w-8 h-8 rounded-full bg-white">+</button></div></div>[span_123](end_span)
                        [span_124](start_span)<div className="divide-y">{preview.map((p, i) => (<div key={i} className="p-2 flex justify-between text-xs"><span>قسط {i+1}</span><span className="font-bold">{formatCurrency(p.amount)}</span></div>))}</div>[span_124](end_span)
                    </div>
                )}
                <button onClick={() => processPayment(debt.id, installment.id, pAmt, new Date(pDate).getTime(), notes, preview)} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg">{pAmt === 0 ? [span_125](start_span)'تأكيد التأجيل' : 'تأكيد السداد'}</button>[span_125](end_span)
            </div>
        </div>
    );
  };

  // --- REST OF THE CODE (DASHBOARD, ADD CLIENT, DEBT FORM, SETTINGS) ---
  [span_126](start_span)// [cite: 128 - 188]

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
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg text-gray-900">مراجعة كشف الحساب</h3><button onClick={() => setSummaryPreview(null)} className="p-1 bg-gray-100 rounded-full"><X size={20}/></button></div>
            <div className="bg-gray-50 p-4 rounded-2xl text-sm whitespace-pre-wrap max-h-[40vh] overflow-y-auto mb-6 border border-gray-100 leading-relaxed font-tajawal">{summaryPreview.text}</div>
            <div className="flex gap-3">
              <button onClick={() => { window.open(`https://wa.me/${summaryPreview.phone}?text=${encodeURIComponent(summaryPreview.text)}`, '_blank'); setSummaryPreview(null); }} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"><Send size={20}/> إرسال الآن</button>
              <button onClick={() => setSummaryPreview(null)} className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      [cite_start]{postponedInfo !== null && ([span_126](end_span)
        [span_127](start_span)<div onClick={() => setPostponedInfo(null)} className="fixed inset-0 z-[999999] bg-black/45 flex items-center justify-center">[span_127](end_span)
          [span_128](start_span)<div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[14px] p-[18px] w-[90%] max-w-[420px] shadow-2xl text-center">[span_128](end_span)
            [span_129](start_span)<div style={{color:'#FF7700' , fontWeight: 800, marginBottom: 6 }}>تفاصيل التأجيل</div>[span_129](end_span)
            [span_130](start_span)<div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>تاريخ القسط: {formatDate(postponedInfo.date)}</div>[span_130](end_span)
            [span_131](start_span)<div style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#D40000',fontWeight: 800}}>{postponedInfo.note}</div>[span_131](end_span)
            [span_132](start_span)<button onClick={() => setPostponedInfo(null)} style={{marginTop: 14, padding: '10px 16px', borderRadius: 12, background: '#FF7700', color: '#fff', fontWeight: 700, width: '100%'}}>إغلاق</button>[span_132](end_span)
          </div>
        </div>
      )}
    </>
  );
}
