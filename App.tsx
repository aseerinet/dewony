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

// --- EMPTY INITIAL DATA ---
const INITIAL_DATA: AppData = {
  clients: [],
  [span_2](start_span)debts: [][span_2](end_span)
};

// --- COLORS FOR CHARTS ---
[span_3](start_span)const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b'];[span_3](end_span)

export default function App() {
  // --- STATE ---
[span_4](start_span)const [postponedInfo, setPostponedInfo] = useState<{ date: number; note: string } | null>(null);[span_4](end_span)
[span_5](start_span)const [selectedDebtIds, setSelectedDebtIds] = useState<string[]>([]);[span_5](end_span)
const [summaryPreview, setSummaryPreview] = useState<{ text: string; phone: string } | null>(null); // حالة نافذة المعاينة الجديدة

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
    [span_6](start_span)return INITIAL_DATA;[span_6](end_span)
  });

  [span_7](start_span)const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');[span_7](end_span)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  [span_8](start_span)const [editingDebtId, setEditingDebtId] = useState<string | null>(null);[span_8](end_span)
  [span_9](start_span)const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | null>(null);[span_9](end_span)
  const [searchTerm, setSearchTerm] = useState('');
  [span_10](start_span)const [isEditClientOpen, setIsEditClientOpen] = useState(false);[span_10](end_span)
[span_11](start_span)const [editClientName, setEditClientName] = useState('');[span_11](end_span)
const [editClientPhone, setEditClientPhone] = useState('');

  // Persist Data to LocalStorage
  useEffect(() => {
    localStorage.setItem('debtCollectorData', JSON.stringify(data));
  [span_12](start_span)}, [data]);[span_12](end_span)

  // --- DATA MANAGEMENT ACTIONS ---

  const exportData = () => {
    [span_13](start_span)const dataStr = JSON.stringify(data, null, 2);[span_13](end_span)
    [span_14](start_span)const blob = new Blob([dataStr], { type: "application/json" });[span_14](end_span)
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    [span_15](start_span)link.href = url;[span_15](end_span)
    [span_16](start_span)link.download = `debt_backup_${new Date().toISOString().split('T')[0]}.json`;[span_16](end_span)
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    [span_17](start_span)const file = event.target.files?.[0];[span_17](end_span)
    [span_18](start_span)if (!file) return;[span_18](end_span)

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        [span_19](start_span)const json = JSON.parse(e.target?.result as string);[span_19](end_span)
        [span_20](start_span)if (json.clients && json.debts) {[span_20](end_span)
          if (confirm('سيتم استبدال البيانات الحالية بالنسخة المرفوعة. هل تريد الاستمرار؟')) {
            [span_21](start_span)setData(json);[span_21](end_span)
            [span_22](start_span)alert('تم استعادة البيانات بنجاح ✅');[span_22](end_span)
          }
        } else {
          [span_23](start_span)alert('الملف غير صالح ❌');[span_23](end_span)
        }
      } catch (err) {
        [span_24](start_span)alert('حدث خطأ أثناء قراءة الملف ❌');[span_24](end_span)
      }
    };
    reader.readAsText(file);
    event.target.value = ''; 
  [span_25](start_span)};[span_25](end_span)

  const resetAppData = () => {
    [span_26](start_span)if (confirm('تحذير نهائي: سيتم حذف جميع العملاء والديون والبيانات نهائياً. لا يمكن التراجع عن هذه الخطوة. هل أنت متأكد؟')) {[span_26](end_span)
      [span_27](start_span)setData({ clients: [], debts: [] });[span_27](end_span)
      [span_28](start_span)setSelectedClientId(null);[span_28](end_span)
      setEditingDebtId(null);
      setCurrentView('DASHBOARD');
      localStorage.removeItem('debtCollectorData');
      alert('تم تصفير التطبيق بالكامل بنجاح ✅');
    }
  [span_29](start_span)};[span_29](end_span)

  // --- APP ACTIONS ---

  const addClient = (client: Omit<Client, 'id' | 'createdAt'>) => {
    [span_30](start_span)const newClient: Client = { ...client, id: generateId(), createdAt: Date.now() };[span_30](end_span)
    [span_31](start_span)setData(prev => ({ ...prev, clients: [newClient, ...prev.clients] }));[span_31](end_span)
    setCurrentView('CLIENTS_LIST');
  };

  [span_32](start_span)const saveDebt = (debtData: any, isEdit: boolean) => {[span_32](end_span)
    [span_33](start_span)const { id, clientId, itemName, baseValue, profitPercentage, monthCount, startDate, paymentDay, installments } = debtData;[span_33](end_span)

    [span_34](start_span)const finalInstallmentsTotal = installments.reduce((sum: number, i: any) => sum + Number(i.amount), 0);[span_34](end_span)
    [span_35](start_span)const profitValue = finalInstallmentsTotal - Number(baseValue);[span_35](end_span)

    [span_36](start_span)const processedInstallments = installments.map((inst: any) => ({[span_36](end_span)
      ...inst,
      id: inst.id || generateId(),
      debtId: isEdit ? id : 'temp',
      status: inst.status || InstallmentStatus.PENDING
    [span_37](start_span)}));[span_37](end_span)

    [span_38](start_span)if (isEdit) {[span_38](end_span)
       setData(prev => ({
         ...prev,
         debts: prev.debts.map(d => d.id === id ? {
            ...d, itemName, baseValue, profitPercentage, profitValue,
            totalValue: finalInstallmentsTotal, monthCount,
            startDate: new Date(startDate).getTime(), paymentDay,
            installments: processedInstallments
         [span_39](start_span)} : d)[span_39](end_span)
       }));
    [span_40](start_span)} else {[span_40](end_span)
      const newDebt: Debt = {
        id: generateId(), clientId, itemName, baseValue, profitPercentage, profitValue,
        totalValue: finalInstallmentsTotal, monthCount,
        startDate: new Date(startDate).getTime(), paymentDay,
        isFullyPaid: false, installments: processedInstallments
      [span_41](start_span)};[span_41](end_span)
      [span_42](start_span)newDebt.installments.forEach(i => i.debtId = newDebt.id);[span_42](end_span)
      setData(prev => ({ ...prev, debts: [newDebt, ...prev.debts] }));
    }

    setSelectedClientId(clientId);
    setCurrentView('CLIENT_DETAILS');
    [span_43](start_span)setEditingDebtId(null);[span_43](end_span)
  };

  [span_44](start_span)const processPayment = (debtId: string, installmentId: string, paidAmount: number, paidDate: number, notes: string, newFutureInstallments: Installment[]) => {[span_44](end_span)
    setData(prev => {
      const newDebts = prev.debts.map(debt => {
        if (debt.id !== debtId) return debt;
        const pastInstallments = debt.installments.filter(i => i.id !== installmentId && (i.status === InstallmentStatus.PAID || i.status === InstallmentStatus.POSTPONED));
        const currentInstallment = debt.installments.find(i => i.id === installmentId);
        if(!currentInstallment) return debt;
     
        [span_45](start_span)const isPostponed = paidAmount === 0;[span_45](end_span)
        const updatedCurrent: Installment = {
          ...currentInstallment, amount: paidAmount, status: isPostponed ? InstallmentStatus.POSTPONED : InstallmentStatus.PAID,
          paidDate: paidDate, notes: notes
        };
        const allInstallments = [...pastInstallments, updatedCurrent, ...newFutureInstallments];
        [span_46](start_span)allInstallments.sort((a, b) => a.dueDate - b.dueDate);[span_46](end_span)
        [span_47](start_span)const allPaid = allInstallments.every(i => i.status === InstallmentStatus.PAID || i.status === InstallmentStatus.POSTPONED);[span_47](end_span)
        [span_48](start_span)return { ...debt, installments: allInstallments, isFullyPaid: allPaid, monthCount: allInstallments.length };[span_48](end_span)
      });
      [span_49](start_span)return { ...prev, debts: newDebts };[span_49](end_span)
    });
    setCurrentView('CLIENT_DETAILS');
  };
   
    [span_50](start_span)const openEditClient = (client: Client) => {[span_50](end_span)
  [span_51](start_span)setEditClientName(client.name || '');[span_51](end_span)
  [span_52](start_span)setEditClientPhone((client.phone as any) || '');[span_52](end_span)
  setIsEditClientOpen(true);
};

[span_53](start_span)const saveEditClient = () => {[span_53](end_span)
  [span_54](start_span)if (!selectedClientId) return;[span_54](end_span)
  [span_55](start_span)const name = editClientName.trim();[span_55](end_span)
  const phone = editClientPhone.trim();

  [span_56](start_span)if (!name) return alert('الرجاء إدخال اسم العميل');[span_56](end_span)
  [span_57](start_span)setData(prev => ({[span_57](end_span)
    ...prev,
    clients: prev.clients.map(c =>
      c.id === selectedClientId ? { ...c, name, phone } : c
    )
  }));
  [span_58](start_span)setIsEditClientOpen(false);[span_58](end_span)
};

  const deleteClient = (id: string) => {
    [span_59](start_span)if(!confirm('هل أنت متأكد من حذف هذا العميل وجميع ديونه نهائياً؟')) return;[span_59](end_span)
    [span_60](start_span)setData(prev => ({[span_60](end_span)
      clients: prev.clients.filter(c => c.id !== id),
      debts: prev.debts.filter(d => d.clientId !== id)
    }));
    [span_61](start_span)setSelectedClientId(null);[span_61](end_span)
    setCurrentView('CLIENTS_LIST');
    alert('تم حذف العميل بنجاح ✅');
  };

  const deleteDebt = (id: string) => {
    [span_62](start_span)if(!confirm('هل أنت متأكد من حذف هذه المديونية؟')) return;[span_62](end_span)
    [span_63](start_span)setData(prev => ({ ...prev, debts: prev.debts.filter(d => d.id !== id) }));[span_63](end_span)
    alert('تم حذف المديونية بنجاح ✅');
  };

  // --- STATS ---
  [span_64](start_span)const stats = useMemo(() => {[span_64](end_span)
    let totalLoaned = 0, totalProfit = 0, totalCollected = 0, totalPending = 0;
    data.debts.forEach(debt => {
      totalLoaned += debt.baseValue;
      totalProfit += debt.profitValue;
      debt.installments.forEach(inst => {
        if (inst.status === InstallmentStatus.PAID) totalCollected += inst.amount;
        else if (inst.status !== InstallmentStatus.POSTPONED) totalPending += inst.amount;
      });
    });
    [span_65](start_span)return { totalLoaned, totalProfit, totalCollected, totalPending };[span_65](end_span)
  }, [data.debts]);

  // --- SUB-VIEWS ---

  const DashboardView = () => (
    <div className="pb-24 animate-fade-in">
      <header className="bg-white p-6 pb-8 rounded-b-3xl shadow-sm mb-6 text-right">
        [span_66](start_span)<h1 className="text-2xl font-bold text-gray-900 mb-1">مرحباً بك 👋</h1>[span_66](end_span)
        <p className="text-gray-500 text-sm">إليك ملخص الديون لهذا الشهر</p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
            [span_67](start_span)<div className="flex items-center gap-2 mb-2 text-blue-600 justify-end">[span_67](end_span)
              <span className="text-xs font-semibold">إجمالي الديون</span>
              <Wallet size={20} />
            </div>
            [span_68](start_span)<p className="text-xl font-bold text-gray-800">{formatCurrency(stats.totalLoaned + stats.totalProfit)}</p>[span_68](end_span)
          </div>
          <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
            [span_69](start_span)<div className="flex items-center gap-2 mb-2 text-green-600 justify-end">[span_69](end_span)
              <span className="text-xs font-semibold">تم تحصيله</span>
              <CheckCircle2 size={20} />
            </div>
            [span_70](start_span)<p className="text-xl font-bold text-gray-800">{formatCurrency(stats.totalCollected)}</p>[span_70](end_span)
          </div>
        </div>
      </header>
   
      [span_71](start_span)<div className="px-4 space-y-6">[span_71](end_span)
        <div className="bg-white p-5 rounded-2xl shadow-sm text-right">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 justify-end">
            [span_72](start_span)تحليل الأداء <TrendingUp size={18} className="text-gray-400" />[span_72](end_span)
          </h3>
          <div className="h-48 w-full">
             <ResponsiveContainer width="100%" height="100%">
                [span_73](start_span)<BarChart data={[[span_73](end_span)
                  { name: 'أصل', value: stats.totalLoaned },
                  { name: 'ربح', value: stats.totalProfit },
                  { name: 'متبقي', value: stats.totalPending },
                ]} barSize={40}>
                  [span_74](start_span)<XAxis dataKey="name" tick={{fill: '#6b7280', fontSize: 12}} axisLine={false} tickLine={false} />[span_74](end_span)
                  <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    [span_75](start_span){ [stats.totalLoaned, stats.totalProfit, stats.totalPending].map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />) }[span_75](end_span)
                  </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
        [span_76](start_span)<div className="bg-white p-5 rounded-2xl shadow-sm text-right">[span_76](end_span)
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 justify-end">
            [span_77](start_span)استحقاقات قريبة/متأخرة <AlertCircle size={18} className="text-red-500" />[span_77](end_span)
          </h3>
          <div className="space-y-3">
             {data.debts.flatMap(d => d.installments.map(i => ({...i, clientName: data.clients.find(c => c.id === d.clientId)?.name})))
                [span_78](start_span).filter(i => i.status !== InstallmentStatus.PAID && i.status !== InstallmentStatus.POSTPONED)[span_78](end_span)
                [span_79](start_span).sort((a, b) => a.dueDate - b.dueDate).slice(0, 3)[span_79](end_span)
                .map(inst => (
                  <div key={inst.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    [span_80](start_span)<span className="font-bold text-blue-600 text-sm">{formatCurrency(inst.amount)}</span>[span_80](end_span)
                    [span_81](start_span)<div className="text-right"><p className="font-semibold text-gray-800 text-sm">{inst.clientName}</p><p className="text-xs text-gray-500">{formatDate(inst.dueDate)}</p></div>[span_81](end_span)
                  </div>
                ))}
              [span_82](start_span){data.debts.length === 0 && <p className="text-center text-gray-400 text-sm py-4">لا توجد ديون مسجلة</p>}[span_82](end_span)
          </div>
        </div>
      </div>
    </div>
  );

 [span_83](start_span)const ClientsListView = () => {[span_83](end_span)
    const clientsWithTotals = useMemo(() => {
      return data.clients.map(client => {
        const clientDebts = data.debts.filter(d => d.clientId === client.id);
        const total = clientDebts.reduce((acc, curr) => acc + curr.totalValue, 0);
        [span_84](start_span)const paid = clientDebts.reduce((acc, curr) => acc + curr.installments.filter(i => i.status === InstallmentStatus.PAID).reduce((s, i) => s + i.amount, 0), 0);[span_84](end_span)
        const remaining = total - paid;
        // حساب تاريخ السداد القادم للترتيب
        const nextDate = clientDebts.flatMap(d => d.installments).filter(i => i.status === InstallmentStatus.PENDING).sort((a, b) => a.dueDate - b.dueDate)[0]?.dueDate || Infinity;
        [span_85](start_span)return { ...client, total, paid, remaining, nextDate };[span_85](end_span)
      });
    }, [data.clients, data.debts]);

    [span_86](start_span)const filteredClients = useMemo(() => {[span_86](end_span)
      return clientsWithTotals
        .filter(c => c.name.includes(searchTerm) || c.phone.includes(searchTerm))
        .sort((a, b) => {
          const aIsPaid = a.remaining <= 0;
          const bIsPaid = b.remaining <= 0;
          [span_87](start_span)if (aIsPaid && !bIsPaid) return 1;[span_87](end_span)
          if (!aIsPaid && bIsPaid) return -1;
          
          // الترتيب حسب أقرب موعد سداد (طلب جديد)
          if (!aIsPaid && !bIsPaid) return a.nextDate - b.nextDate;
          
          [span_88](start_span)return b.remaining - a.remaining;[span_88](end_span)
        });
    }, [clientsWithTotals, searchTerm]);

    return (
      [span_89](start_span)<div className="pb-24 pt-4 px-4 h-full flex flex-col text-right">[span_89](end_span)
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">العملاء</h2>
          <button onClick={() => setCurrentView('ADD_CLIENT')} className="text-blue-600 p-2 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors">
            <UserPlus size={24} />
          </button>
        </div>
        
        [span_90](start_span)<div className="relative mb-6">[span_90](end_span)
          <input 
            type="text" 
            placeholder="بحث باسم العميل أو الجوال..." 
            className="w-full bg-white pl-4 pr-10 py-3 rounded-xl border-none shadow-sm text-sm focus:ring-2 focus:ring-blue-500 text-right" 
            value={searchTerm} 
            [span_91](start_span)onChange={(e) => setSearchTerm(e.target.value)}[span_91](end_span)
          />
          <Search className="absolute right-3 top-3 text-gray-400" size={20} />
        </div>

        [span_92](start_span)<div className="space-y-3 overflow-y-auto no-scrollbar pb-20">[span_92](end_span)
          {filteredClients.map(client => {
            const isFullyPaid = client.remaining <= 0;
            [span_93](start_span)return ([span_93](end_span)
              <div 
                key={client.id} 
                onClick={() => { setSelectedClientId(client.id);
                [span_94](start_span)setSelectedDebtIds([]);[span_94](end_span)
                setCurrentView('CLIENT_DETAILS'); }} 
                className={`bg-white p-4 rounded-xl shadow-sm active:scale-[0.99] transition-all cursor-pointer 
                  ${isFullyPaid ? [span_95](start_span)'opacity-50 grayscale border-dashed border-gray-200' : 'border border-transparent'}`}[span_95](end_span)
              >
                <div className="flex justify-between items-start">
                  [span_96](start_span)<div className="text-right">[span_96](end_span)
                    <h3 className={`font-bold ${isFullyPaid ? [span_97](start_span)'text-gray-400' : 'text-gray-800'}`}>{client.name}</h3>[span_97](end_span)
                    <p className="text-xs text-gray-500 mt-1">{client.phone}</p>
                    {client.remaining > 0 && client.nextDate !== Infinity && (
                      <p className="text-[10px] text-blue-600 font-medium mt-1">القادم: {formatDate(client.nextDate)}</p>
                    )}
                  </div>
                  <div className="text-left">
                    [span_98](start_span)<span className="block text-xs text-gray-400">المتبقي</span>[span_98](end_span)
                    <span className={`font-bold ${isFullyPaid ? [span_99](start_span)'text-gray-400' : 'text-red-500'}`}>[span_99](end_span)
                      {isFullyPaid ? [span_100](start_span)'0' : formatCurrency(client.remaining)}[span_100](end_span)
                    </span>
                  </div>
                </div>
                {!isFullyPaid && client.total > 0 && (
                   [span_101](start_span)<div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">[span_101](end_span)
                     <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${(client.paid / client.total) * 100}%` }} />
                   </div>
                )}
              </div>
            [span_102](start_span));[span_102](end_span)
          })}
          
          {filteredClients.length === 0 && (
            <div className="text-center py-10 text-gray-400 animate-fade-in">
              <Users size={48} className="mx-auto mb-2 opacity-30" />
              <p>لا يوجد عملاء مضافون حالياً</p>
              [span_103](start_span)<button onClick={() => setCurrentView('ADD_CLIENT')} className="mt-4 text-blue-600 font-bold text-sm">أضف أول عميل الآن</button>[span_103](end_span)
            </div>
          )}
        </div>
      </div>
    );
 [span_104](start_span)};[span_104](end_span)

  const ClientDetailsView = () => {
    [span_105](start_span)const client = data.clients.find(c => c.id === selectedClientId);[span_105](end_span)
    [span_106](start_span)if (!client) return null;[span_106](end_span)

    [span_107](start_span)const clientDebts = data.debts.filter(d => d.clientId === client.id);[span_107](end_span)
    
    const handlePrepareSummary = () => { // دالة تحضير المعاينة (جديدة)
      const debtsToSummarize = selectedDebtIds.length > 0 
        ? clientDebts.filter(d => selectedDebtIds.includes(d.id))
        [span_108](start_span): clientDebts;[span_108](end_span)

      if (debtsToSummarize.length === 0) {
        [span_109](start_span)alert('يرجى اختيار مديونية واحدة على الأقل لإرسال كشف الحساب');[span_109](end_span)
        return;
      }

      [span_110](start_span)let summaryText = `مرحباً ${client.name}،\nإليك ملخص حسابك للمديونيات المحددة:\n\n`;[span_110](end_span)
      let totalAll = 0;
      [span_111](start_span)let paidAll = 0;[span_111](end_span)
       
      debtsToSummarize.forEach(d => {
        const paid = d.installments.filter(i => i.status === InstallmentStatus.PAID).reduce((s, i) => s + i.amount, 0);
        const remaining = d.totalValue - paid;
        [span_112](start_span)summaryText += `📌 *${d.itemName}*\n- إجمالي: ${formatCurrency(d.totalValue)}\n- المسدد: ${formatCurrency(paid)}\n- المتبقي: ${formatCurrency(remaining)}\n\n`;[span_112](end_span)
        totalAll += d.totalValue;
        paidAll += paid;
      });
      [span_113](start_span)const remainingAll = totalAll - paidAll;[span_113](end_span)
      
      if (debtsToSummarize.length > 1) {
        summaryText += `📊 *الإجمالي العام للمختار:*\n`;
        [span_114](start_span)summaryText += `- إجمالي الديون: ${formatCurrency(totalAll)}\n`;[span_114](end_span)
        summaryText += `- إجمالي المسدد: ${formatCurrency(paidAll)}\n`;
        [span_115](start_span)summaryText += `- إجمالي المتبقي: ${formatCurrency(remainingAll)}\n\n`;[span_115](end_span)
      }
      [span_116](start_span)summaryText += `شكراً لتعاملك معنا.`;[span_116](end_span)
      setSummaryPreview({ text: summaryText, phone: client.phone.replace(/\D/g, '') });
    };

    [span_117](start_span)const toggleDebtSelection = (id: string) => {[span_117](end_span)
      setSelectedDebtIds(prev => 
        prev.includes(id) ? prev.filter(debtId => debtId !== id) : [...prev, id]
      [span_118](start_span));[span_118](end_span)
    };

    [span_119](start_span)const sendInstallmentReceipt = (debt: Debt, inst: Installment, receiptNumber: number) => {[span_119](end_span)
      [span_120](start_span)if (!client) return;[span_120](end_span)
      [span_121](start_span)const totalDebt = clientDebts.reduce((acc, d) => acc + (d.totalValue || 0), 0);[span_121](end_span)
      const totalPaid = clientDebts.reduce((acc, d) => {
        const paidForDebt = (d.installments || [])
          .filter(i => i.status === 'PAID' || i.status === InstallmentStatus.PAID)
          .reduce((s, i) => s + (i.amount || 0), 0);
        return acc + paidForDebt;
      [span_122](start_span)}, 0);[span_122](end_span)
      [span_123](start_span)const remainingTotal = totalDebt - totalPaid;[span_123](end_span)

      // نص السند بناءً على طلبك
      [span_124](start_span)const message = `سند سداد قسط\n\nالعميل: ${client.name} \nتم استلام\nرقم القسط: ${receiptNumber+1}\nالمبلغ: ${formatCurrency(inst.amount)}\nالتاريخ: ${formatDate(inst.paidDate || Date.now())}\n\nإجمالي المديونية: ${formatCurrency(totalDebt)}\nإجمالي المسدد: ${formatCurrency(totalPaid)}\nإجمالي المتبقي: ${formatCurrency(remainingTotal)}\n\nشكراً لسدادكم.`;[span_124](end_span)
      [span_125](start_span)const phone = String(client.phone || '').replace(/\D/g, '');[span_125](end_span)
      [span_126](start_span)if (!phone) return;[span_126](end_span)
      [span_127](start_span)window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');[span_127](end_span)
    };

    return (
      [span_128](start_span)<div className="pb-24 bg-gray-50 min-h-screen animate-fade-in text-right">[span_128](end_span)
        <div className="bg-white pb-6 pt-4 px-4 rounded-b-3xl shadow-sm sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { setSelectedClientId(null); setCurrentView('CLIENTS_LIST'); [span_129](start_span)}} className="p-2 -mr-2 text-gray-600"><ArrowLeft /></button>[span_129](end_span)
            <h2 className="font-bold text-lg">ملف العميل</h2>
            <div className="flex items-center gap-2">
              [span_130](start_span)<button onClick={() => openEditClient(client)} className="text-blue-600 p-2 bg-blue-50 rounded-full transition-colors" title="تعديل"><Edit size={22} /></button>[span_130](end_span)
              [span_131](start_span)<button onClick={() => deleteClient(client.id)} className="text-red-500 p-2 bg-red-50 rounded-full transition-colors" title="حذف"><Trash2 size={22} /></button>[span_131](end_span)
            </div>
          </div>
          <div className="flex flex-col items-center">
            [span_132](start_span)<div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mb-3">{client.name.charAt(0)}</div>[span_132](end_span)
            <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
            [span_133](start_span)<p className="text-gray-500 text-sm flex items-center gap-1 mt-1 justify-center">{client.phone} <Phone size={14} /></p>[span_133](end_span)
            <div className="flex gap-3 mt-4 w-full justify-center">
               [span_134](start_span)<button onClick={handlePrepareSummary} className="flex items-center gap-2 bg-green-50 text-green-700 px-6 py-2 rounded-xl font-bold active:scale-95 transition-transform shadow-sm"><Send size={16} /> كشف حساب</button>[span_134](end_span)
            </div>
          </div>
        </div>
        <div className="px-4 mt-6 space-y-6">
           <div className="flex justify-between items-center">
             <h3 className="font-bold text-gray-800">الديون المسجلة</h3>
             <button onClick={() => { setEditingDebtId(null); setCurrentView('ADD_DEBT'); [span_135](start_span)}} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors">+ مديونية جديدة</button>[span_135](end_span)
           </div>
	         {clientDebts.map(debt => (
             [span_136](start_span)<div key={debt.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden border transition-all ${selectedDebtIds.includes(debt.id) ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-100'}`}>[span_136](end_span)
               <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
                 <div className="flex items-center gap-3">
                   <input 
                     type="checkbox" 
                     checked={selectedDebtIds.includes(debt.id)} 
                     onChange={() => toggleDebtSelection(debt.id)}
                     [span_137](start_span)className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"[span_137](end_span)
                   />
                   <div className="text-right">
                     [span_138](start_span)<h4 className="font-bold text-gray-900">{debt.itemName}</h4>[span_138](end_span)
                     <p className="text-xs text-gray-500 mt-1">أصل: {formatCurrency(debt.baseValue)} | [span_139](start_span)ربح: {debt.profitPercentage.toFixed(1)}%</p>[span_139](end_span)
                   </div>
                 </div>
                 <div className="flex gap-2">
                   <button onClick={() => { setEditingDebtId(debt.id); setCurrentView('EDIT_DEBT'); [span_140](start_span)}} className="p-2 bg-gray-200 text-gray-600 rounded-lg" title="تعديل"><Edit size={16} /></button>[span_140](end_span)
                   [span_141](start_span)<button onClick={() => deleteDebt(debt.id)} className="p-2 bg-red-50 text-red-500 rounded-lg" title="حذف"><Trash2 size={16} /></button>[span_141](end_span)
                 </div>
               </div>
               <div className="divide-y divide-gray-100">
                 {debt.installments.map((inst, idx) => (
                   [span_142](start_span)<div key={inst.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">[span_142](end_span)
                     <div className="flex items-center gap-3">
                       <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${inst.status === 'PAID' ? 'bg-green-100 text-green-700' : inst.status === InstallmentStatus.POSTPONED ? [span_143](start_span)'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>{idx + 1}</span>[span_143](end_span)
                       [span_144](start_span)<div className="text-right"><p className="text-sm font-medium text-gray-900">{formatCurrency(inst.amount)}</p><p className="text-xs text-gray-500">{formatDate(inst.dueDate)}</p></div>[span_144](end_span)
                     </div>
                     {inst.status === InstallmentStatus.PAID || inst.status === InstallmentStatus.POSTPONED ? [span_145](start_span)(
                       <div className="flex items-center gap-2">
                         {inst.status === InstallmentStatus.PAID && (
                            <button onClick={() => sendInstallmentReceipt(debt, inst, idx)} className="text-green-600 bg-green-50 p-1.5 rounded-md hover:bg-green-100" title="إرسال سند"><Receipt size={16} /></button>[span_145](end_span)
                         )}
                         <button onClick={() => inst.status === InstallmentStatus.POSTPONED && setPostponedInfo({ date: inst.dueDate, note: inst.notes || '' })} className={`text-xs font-bold px-2 py-1 rounded-md ${inst.status === InstallmentStatus.POSTPONED ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>{inst.status === InstallmentStatus.POSTPONED ? [span_146](start_span)'تم التأجيل' : 'مدفوع'}</button>[span_146](end_span)
                       </div>
                     ) : (
                       [span_147](start_span)<button onClick={() => { setEditingDebtId(debt.id); setSelectedInstallmentId(inst.id); setCurrentView('RECORD_PAYMENT'); }} className="text-xs font-medium bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">تسجيل سداد</button>[span_147](end_span)
                     )}
                   </div>
                 ))}
               </div>
               [span_148](start_span)<div className="p-3 bg-gray-50 border-t border-gray-100 text-center"><div className="flex justify-between items-center text-sm font-bold px-2"><span>الإجمالي:</span><span>{formatCurrency(debt.totalValue)}</span></div></div>[span_148](end_span)
             </div>
           ))}
           [span_149](start_span){clientDebts.length === 0 && <p className="text-center text-gray-400 text-sm py-10">لا توجد ديون مسجلة حالياً</p>}[span_149](end_span)
        </div>
      </div>
    );
  [span_150](start_span)};[span_150](end_span)

  const SettingsView = () => (
    <div className="bg-gray-50 min-h-screen pb-24 animate-fade-in text-right">
      <header className="bg-white p-6 pb-8 rounded-b-3xl shadow-sm mb-6">
        [span_151](start_span)<h1 className="text-2xl font-bold text-gray-900 mb-1">الإعدادات</h1>[span_151](end_span)
        <p className="text-gray-500 text-sm">إدارة البيانات والنسخ الاحتياطي</p>
      </header>
      <div className="px-4 space-y-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-blue-600 font-bold border-b pb-3 mb-2 justify-end">
            [span_152](start_span)<h3>إدارة البيانات</h3> <Database size={20} />[span_152](end_span)
          </div>
          [span_153](start_span)<button onClick={exportData} className="w-full flex items-center justify-between p-4 bg-blue-50 text-blue-700 rounded-xl font-bold shadow-sm"><Download size={20} /><span>تصدير نسخة احتياطية</span></button>[span_153](end_span)
          <label className="w-full flex items-center justify-between p-4 bg-green-50 text-green-700 rounded-xl font-bold cursor-pointer shadow-sm">
            <Upload size={20} /><span>استيراد بيانات</span>
            [span_154](start_span)<input type="file" accept=".json" onChange={importData} className="hidden" />[span_154](end_span)
          </label>
        </div>
        [span_155](start_span)<button onClick={resetAppData} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-4 rounded-xl font-bold shadow-sm"><Trash2 size={20} /> تصفير جميع البيانات</button>[span_155](end_span)
      </div>
    </div>
  [span_156](start_span));[span_156](end_span)

  const RecordPaymentView = () => {
    [span_157](start_span)const debt = data.debts.find(d => d.id === editingDebtId);[span_157](end_span)
    [span_158](start_span)const installment = debt?.installments.find(i => i.id === selectedInstallmentId);[span_158](end_span)
    [span_159](start_span)if (!debt || !installment) return null;[span_159](end_span)
    const futurePendingInstallments = useMemo(() => {
        const currentIndex = debt.installments.findIndex(i => i.id === installment.id);
        [span_160](start_span)return debt.installments.slice(currentIndex + 1);[span_160](end_span)
    }, [debt, installment]);
    [span_161](start_span)const [paymentAmount, setPaymentAmount] = useState<number>(installment.amount);[span_161](end_span)
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    [span_162](start_span)const [notes, setNotes] = useState('');[span_162](end_span)
    [span_163](start_span)const [remainingMonths, setRemainingMonths] = useState<number>(futurePendingInstallments.length);[span_163](end_span)
    const [previewInstallments, setPreviewInstallments] = useState<Installment[]>([]);
    [span_164](start_span)const totalDebt = debt.totalValue;[span_164](end_span)
    [span_165](start_span)const previouslyPaid = debt.installments.filter(i => i.status === InstallmentStatus.PAID && i.id !== installment.id).reduce((sum, i) => sum + i.amount, 0);[span_165](end_span)
    [span_166](start_span)const balanceAfterThisPayment = totalDebt - previouslyPaid - paymentAmount;[span_166](end_span)
    [span_167](start_span)useEffect(() => { if (balanceAfterThisPayment > 1 && remainingMonths === 0) setRemainingMonths(1); }, [balanceAfterThisPayment]);[span_167](end_span)
    useEffect(() => {
        [span_168](start_span)if (balanceAfterThisPayment <= 0 && remainingMonths <= 0) { setPreviewInstallments([]); return; }[span_168](end_span)
        const safeMonths = (balanceAfterThisPayment > 1 && remainingMonths === 0) ? 1 : remainingMonths;
        if (safeMonths > 0) {
            const payDateObj = new Date(paymentDate);
            [span_169](start_span)const nextStartDate = new Date(payDateObj.getFullYear(), payDateObj.getMonth() + 1, debt.paymentDay);[span_169](end_span)
            [span_170](start_span)const plan = calculatePlan(Math.max(0, balanceAfterThisPayment), safeMonths, nextStartDate, debt.paymentDay);[span_170](end_span)
            setPreviewInstallments(plan.map(p => ({ ...p, id: generateId(), debtId: debt.id, status: InstallmentStatus.PENDING })));
        [span_171](start_span)} else setPreviewInstallments([]);[span_171](end_span)
    }, [paymentAmount, remainingMonths, paymentDate, balanceAfterThisPayment, debt]);
    const handleConfirm = () => {
        [span_172](start_span)if (paymentAmount < 0) return alert('المبلغ غير صحيح');[span_172](end_span)
        [span_173](start_span)processPayment(debt.id, installment.id, paymentAmount, new Date(paymentDate).getTime(), notes, previewInstallments);[span_173](end_span)
    };
    return (
        <div className="bg-gray-50 min-h-screen pb-20 animate-fade-in text-right">
            [span_174](start_span)<div className="bg-white px-4 pt-6 pb-4 border-b border-gray-100 flex items-center shadow-sm sticky top-0 z-20"><button onClick={() => setCurrentView('CLIENT_DETAILS')} className="p-2 -mr-2 text-gray-600"><ArrowLeft /></button><h2 className="text-xl font-bold mr-2">تسجيل دفعة</h2></div>[span_174](end_span)
            <div className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center mb-2">
                    [span_175](start_span)<div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100"><span className="text-[10px] text-gray-400 block">إجمالي الدين</span><span className="text-sm font-bold text-gray-800">{formatCurrency(totalDebt)}</span></div>[span_175](end_span)
                     [span_176](start_span)<div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100"><span className="text-[10px] text-gray-400 block">مدفوع سابقاً</span><span className="text-sm font-bold text-green-600">{formatCurrency(previouslyPaid)}</span></div>[span_176](end_span)
                     [span_177](start_span)<div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100"><span className="text-[10px] text-gray-400 block">المتبقي</span><span className="text-sm font-bold text-red-500">{formatCurrency(balanceAfterThisPayment)}</span></div>[span_177](end_span)
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4">
                    [span_178](start_span)<div className="flex items-center gap-2 text-blue-600 font-bold mb-2 justify-end"><h3>بيانات الدفعة الحالية</h3><Wallet size={20} /></div>[span_178](end_span)
                    <div className="grid grid-cols-2 gap-4">
                        [span_179](start_span)<div><label className="block text-xs text-gray-500 mb-1">المبلغ المدفوع</label><input type="number" value={paymentAmount} onChange={e => setPaymentAmount(Number(e.target.value))} className="w-full p-3 bg-gray-50 border rounded-xl font-bold text-right" /></div>[span_179](end_span)
                        [span_180](start_span)<div><label className="block text-xs text-gray-500 mb-1">تاريخ السداد</label><input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-xl text-right" /></div>[span_180](end_span)
                    </div>
                    [span_181](start_span)<div><label className="block text-xs text-gray-500 mb-1">ملاحظات (سبب التأجيل)</label><textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-xl text-sm h-20 resize-none text-right" placeholder="ملاحظات اختيارية..." /></div>[span_181](end_span)
                </div>
                {balanceAfterThisPayment > 0 && (
                    <div className="bg-white p-5 rounded-2xl shadow-sm border-t-4 border-orange-400 space-y-4">
                        [span_182](start_span)<div className="flex justify-between items-center font-bold text-orange-600"><h3>جدولة المتبقي</h3><span>{formatCurrency(balanceAfterThisPayment)}</span></div>[span_182](end_span)
                        [span_183](start_span)<div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200"><span className="text-sm font-medium">عدد الأشهر</span><div className="flex items-center gap-4"><button onClick={() => setRemainingMonths(Math.max(1, remainingMonths - 1))} className="w-8 h-8 rounded-full bg-white shadow-sm border flex items-center justify-center text-red-500">-</button><span className="font-bold">{remainingMonths}</span><button onClick={() => setRemainingMonths(remainingMonths + 1)} className="w-8 h-8 rounded-full bg-white shadow-sm border flex items-center justify-center text-green-600">+</button></div></div>[span_183](end_span)
                        [span_184](start_span)<div className="divide-y">{previewInstallments.map((inst, idx) => (<div key={idx} className="px-4 py-2 flex justify-between items-center text-sm bg-white"><span>قسط {idx+1}</span><span className="font-bold">{formatCurrency(inst.amount)}</span></div>))}</div>[span_184](end_span)
                    </div>
                )}
                <button onClick={handleConfirm} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200">{paymentAmount === 0 ? [span_185](start_span)'تأكيد التأجيل والجدولة' : 'تأكيد السداد والجدولة'}</button>[span_185](end_span)
            </div>
        </div>
    );
  [span_186](start_span)};[span_186](end_span)

  const AddClientView = () => {
    [span_187](start_span)const [name, setName] = useState('');[span_187](end_span)
    [span_188](start_span)const [phone, setPhone] = useState('');[span_188](end_span)
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if(name && phone) addClient({ name, nationalId: '', phone }); [span_189](start_span)};[span_189](end_span)
    return (
      [span_190](start_span)<div className="bg-white min-h-screen pb-20 animate-fade-in text-right">[span_190](end_span)
        [span_191](start_span)<div className="px-4 pt-6 pb-4 border-b border-gray-100 flex items-center"><button onClick={() => setCurrentView('CLIENTS_LIST')} className="p-2 -mr-2 text-gray-600"><ArrowLeft /></button><h2 className="text-xl font-bold mr-2">إضافة عميل جديد</h2></div>[span_191](end_span)
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
           [span_192](start_span)<div><label className="block text-sm font-medium text-gray-700 mb-1">اسم العميل</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl text-right" required /></div>[span_192](end_span)
           [span_193](start_span)<div><label className="block text-sm font-medium text-gray-700 mb-1">رقم الجوال</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl text-right" required /></div>[span_193](end_span)
           [span_194](start_span)<button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg mt-8 shadow-lg shadow-blue-200">حفظ العميل</button>[span_194](end_span)
        </form>
      </div>
    );
  [span_195](start_span)};[span_195](end_span)

  const DebtFormView = () => { // استعادة لوحة التعديل كما هي في الملف الأصل
    [span_196](start_span)const isEditMode = currentView === 'EDIT_DEBT' && !!editingDebtId;[span_196](end_span)
    [span_197](start_span)const existingDebt = isEditMode ? data.debts.find(d => d.id === editingDebtId) : null;[span_197](end_span)
    [span_198](start_span)const client = data.clients.find(c => c.id === selectedClientId);[span_198](end_span)
    [span_199](start_span)const [clientId, setClientId] = useState(selectedClientId || '');[span_199](end_span)
    const [itemName, setItemName] = useState('');
    const [baseValue, setBaseValue] = useState<number | [span_200](start_span)''>(0);[span_200](end_span)
    const [profitType, setProfitType] = useState<'PERCENTAGE' | [span_201](start_span)'FIXED'>('PERCENTAGE');[span_201](end_span)
    const [profitPercentage, setProfitPercentage] = useState<number>(10);
    const [fixedProfit, setFixedProfit] = useState<number | [span_202](start_span)''>('');[span_202](end_span)
    [span_203](start_span)const [months, setMonths] = useState<number>(6);[span_203](end_span)
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    [span_204](start_span)const [paymentDay, setPaymentDay] = useState(27);[span_204](end_span)
    [span_205](start_span)const [manualInstallments, setManualInstallments] = useState<any[]>([]);[span_205](end_span)
    
    useEffect(() => {
        if (isEditMode && existingDebt) {
            setClientId(existingDebt.clientId); setItemName(existingDebt.itemName); setBaseValue(existingDebt.baseValue); setProfitPercentage(existingDebt.profitPercentage);
            setFixedProfit(existingDebt.profitValue); setMonths(existingDebt.monthCount); setStartDate(new Date(existingDebt.startDate).toISOString().split('T')[0]);
            [span_206](start_span)setPaymentDay(existingDebt.paymentDay); setManualInstallments(existingDebt.installments);[span_206](end_span)
        }
    }, [isEditMode, existingDebt]);
    
    [span_207](start_span)const handleBaseValueChange = (val: number | '') => {[span_207](end_span)
        setBaseValue(val); const base = Number(val) || [span_208](start_span)0;[span_208](end_span)
        if (base > 0) { if (profitType === 'PERCENTAGE') setFixedProfit(base * (profitPercentage / 100)); else setProfitPercentage(((Number(fixedProfit) || 0) / base) * 100); [span_209](start_span)}
    };
    const handlePercentageChange = (val: number) => { setProfitPercentage(val); const base = Number(baseValue) || 0; if (base > 0) setFixedProfit(base * (val / 100)); };[span_209](end_span)
    const handleFixedProfitChange = (val: number | '') => { setFixedProfit(val); const base = Number(baseValue) || 0; const fixed = Number(val) || 0; if (base > 0) setProfitPercentage((fixed / base) * 100); [span_210](start_span)[span_211](start_span)};[span_210](end_span)[span_211](end_span)
    [span_212](start_span)const getCalculatedValues = () => {[span_212](end_span)
        const base = Number(baseValue) || [span_213](start_span)0; let profit = 0;[span_213](end_span)
        if (profitType === 'PERCENTAGE') profit = base * (profitPercentage / 100); else profit = Number(fixedProfit) || [span_214](start_span)0;[span_214](end_span)
        [span_215](start_span)return { base, profit, total: base + profit };[span_215](end_span)
    };
    const handleRecalculate = () => {
        [span_216](start_span)const { total } = getCalculatedValues(); if (total === 0) return;[span_216](end_span)
        [span_217](start_span)const plan = calculatePlan(total, months, new Date(startDate), paymentDay);[span_217](end_span)
        [span_218](start_span)setManualInstallments(plan.map(p => ({ ...p, id: generateId(), debtId: isEditMode ? editingDebtId : 'temp' })));[span_218](end_span)
    };
    [span_219](start_span)const currentTotal = manualInstallments.reduce((sum, item) => sum + Number(item.amount), 0);[span_219](end_span)
    [span_220](start_span)const { total: targetTotal } = getCalculatedValues();[span_220](end_span)
    [span_221](start_span)const updateInstallment = (index: number, field: 'amount' | 'dueDate', value: any) => {[span_221](end_span)
        [span_222](start_span)const newInstallments = [...manualInstallments];[span_222](end_span)
        [span_223](start_span)if (field === 'dueDate') { newInstallments[index].dueDate = new Date(value).getTime(); setManualInstallments(newInstallments);[span_223](end_span)
        } else {
            [span_224](start_span)const newAmount = Number(value); if (newAmount < 0) return;[span_224](end_span)
            [span_225](start_span)newInstallments[index].amount = newAmount; const remainingCount = newInstallments.length - 1 - index;[span_225](end_span)
            if (remainingCount > 0) {
                [span_226](start_span)const sumSoFar = newInstallments.slice(0, index + 1).reduce((sum, i) => sum + i.amount, 0);[span_226](end_span)
                [span_227](start_span)const remainingBalance = targetTotal - sumSoFar;[span_227](end_span)
                const amountPerMonth = Math.floor(remainingBalance / remainingCount);
                [span_228](start_span)const remainder = remainingBalance - (amountPerMonth * remainingCount);[span_228](end_span)
                [span_229](start_span)for (let j = index + 1; j < newInstallments.length; j++) {[span_229](end_span)
                     [span_230](start_span)const isLast = j === newInstallments.length - 1;[span_230](end_span)
                     [span_231](start_span)newInstallments[j].amount = Math.max(0, amountPerMonth + (isLast ? remainder : 0));[span_231](end_span)
                }
            }
            [span_232](start_span)setManualInstallments(newInstallments);[span_232](end_span)
        }
    };
    const handleSubmit = () => {
      [span_233](start_span)if(!clientId || !itemName || !baseValue) return alert('الرجاء تعبئة البيانات الأساسية');[span_233](end_span)
      [span_234](start_span)const { base, profit } = getCalculatedValues();[span_234](end_span)
      [span_235](start_span)saveDebt({ id: editingDebtId, clientId, itemName, baseValue: base, profitPercentage: (base > 0) ? (profit / base) * 100 : 0, monthCount: months, startDate, paymentDay, installments: manualInstallments }, isEditMode);[span_235](end_span)
    };
    return (
      [span_236](start_span)<div className="bg-gray-50 min-h-screen pb-24 animate-fade-in text-right">[span_236](end_span)
        <div className="bg-white px-4 pt-6 pb-4 border-b border-gray-100 flex items-center shadow-sm"><button onClick={() => setCurrentView('CLIENT_DETAILS')} className="p-2 -mr-2 text-gray-600"><ArrowLeft /></button><h2 className="text-xl font-bold mr-2">{isEditMode ? [span_237](start_span)'تعديل المديونية' : 'إضافة مديونية جديدة'}</h2></div>[span_237](end_span)
        <div className="p-4 space-y-5">
           [span_238](start_span){client && (<div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center"><p className="text-sm text-gray-600">العميل</p><p className="font-bold text-lg text-blue-900">{client.name}</p></div>)}[span_238](end_span)
           <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
             [span_239](start_span)<h3 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2 mb-2 justify-end"><FileText size={18} className="text-blue-500" /> تفاصيل السلعة</h3>[span_239](end_span)
             [span_240](start_span)<div><label className="block text-xs text-gray-500 mb-1">اسم السلعة</label><input type="text" value={itemName} onChange={e => setItemName(e.target.value)} className="w-full p-3 bg-gray-50 rounded-lg text-sm border text-right" /></div>[span_240](end_span)
             [span_241](start_span)<div><label className="block text-xs text-gray-500 mb-1">رأس المال</label><input type="number" value={baseValue} onChange={e => handleBaseValueChange(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-3 bg-gray-50 rounded-lg border font-bold text-right" /></div>[span_241](end_span)
             <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                [span_242](start_span)<div className="flex bg-white rounded-lg p-1 shadow-sm mb-3">[span_242](end_span)
                   <button onClick={() => setProfitType('PERCENTAGE')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center justify-center gap-1 ${profitType === 'PERCENTAGE' ? [span_243](start_span)'bg-blue-100 text-blue-700' : 'text-gray-500'}`}><Percent size={14} /> نسبة مئوية</button>[span_243](end_span)
                   <button onClick={() => setProfitType('FIXED')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center justify-center gap-1 ${profitType === 'FIXED' ? [span_244](start_span)'bg-blue-100 text-blue-700' : 'text-gray-500'}`}><Coins size={14} /> مبلغ ثابت</button>[span_244](end_span)
                </div>
                {profitType === 'PERCENTAGE' ? (<div><label className="block text-xs text-gray-500 mb-1">نسبة الربح (%)[span_245](start_span)</label><div className="flex gap-2"><input type="number" value={profitPercentage} onChange={e => handlePercentageChange(Number(e.target.value))} className="w-24 p-2 bg-white rounded-lg border text-center font-bold" /><div className="flex-1 p-2 bg-gray-100 rounded-lg border flex items-center justify-between px-3 font-bold">{formatCurrency(Number(fixedProfit) || 0)}</div></div></div>) : (<div><label className="block text-xs text-gray-500 mb-1">مبلغ الربح</label><input type="number" value={fixedProfit} onChange={e => handleFixedProfitChange(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 bg-white rounded-lg border font-bold text-right" /></div>)}[span_245](end_span)
             </div>
             [span_246](start_span)<div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100 font-bold"><span>إجمالي المديونية</span><span>{formatCurrency(targetTotal)}</span></div>[span_246](end_span)
           </div>
           [span_247](start_span)<div className="bg-white p-4 rounded-xl shadow-sm space-y-4">[span_247](end_span)
             [span_248](start_span)<div className="grid grid-cols-2 gap-4">[span_248](end_span)
               [span_249](start_span)<div><label className="block text-xs text-gray-500 mb-1">الأشهر</label><input type="number" value={months} onChange={e => setMonths(Number(e.target.value))} className="w-full p-3 bg-gray-50 rounded-lg text-sm border text-right" /></div>[span_249](end_span)
               [span_250](start_span)<div><label className="block text-xs text-gray-500 mb-1">يوم السداد</label><input type="number" min="1" max="31" value={paymentDay} onChange={e => setPaymentDay(Number(e.target.value))} className="w-full p-3 bg-gray-50 rounded-lg text-sm border text-right" /></div>[span_250](end_span)
             </div>
             [span_251](start_span)<div><label className="block text-xs text-gray-500 mb-1">تاريخ البداية</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 bg-gray-50 rounded-lg border text-right" /></div>[span_251](end_span)
             <button onClick={handleRecalculate} className="w-full py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 text-sm border border-gray-200">{isEditMode ? [span_252](start_span)'إعادة إنشاء الجدول (مسح التعديلات اليدوية)' : 'إنشاء جدول الأقساط'}</button>[span_252](end_span)
             
             {/* جدول الأقساط اليدوي المستعاد */}
             [span_253](start_span)<div className="mt-4">[span_253](end_span)
                [span_254](start_span)<div className="flex justify-between items-center mb-2"><span className="text-sm font-bold text-gray-700">جدول الأقساط</span><div className="text-xs font-bold text-red-500">{formatCurrency(currentTotal)}</div></div>[span_254](end_span)
                <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg divide-y bg-gray-50">
                    {manualInstallments.map((inst, idx) => {
                        const isLast = idx === manualInstallments.length - 1;
                        return (
                          <div key={idx} className="p-2 flex gap-2 items-center text-sm">
                            <span className="text-gray-400 w-6 text-center">{idx + 1}</span>
                            <input type="date" className="p-1 rounded border text-xs text-right w-32" value={new Date(inst.dueDate).toISOString().split('T')[0]} onChange={(e) => updateInstallment(idx, 'dueDate', e.target.value)} />
                            <input type="number" className={`p-1 rounded border text-xs w-24 font-bold text-right ${isLast ? 'bg-gray-100 text-gray-500' : 'border-gray-200'}`} value={inst.amount} onChange={(e) => updateInstallment(idx, 'amount', e.target.value)} disabled={isLast} />
                            {isLast && <span className="text-[10px] text-gray-400">تلقائي</span>}
                          </div>
                        [span_255](start_span));[span_255](end_span)
                    })}
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-center">* يمكنك تعديل المبلغ والتاريخ يدوياً. [span_256](start_span)القسط الأخير يحسب تلقائياً لضبط الإجمالي.</p>[span_256](end_span)
             </div>
           </div>
           <button onClick={handleSubmit} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform"><Save size={20} className="inline ml-2" />{isEditMode ? [span_257](start_span)'حفظ التعديلات' : 'اعتماد المديونية'}</button>[span_257](end_span)
        </div>
      </div>
    );
  [span_258](start_span)};[span_258](end_span)

  // --- MAIN RENDER ---
 return (
  <>
      [span_259](start_span){isEditClientOpen && ([span_259](end_span)
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    [span_260](start_span)<div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-4 text-right">[span_260](end_span)
      <div className="flex items-center justify-between mb-3">
        [span_261](start_span)<button type="button" onClick={() => setIsEditClientOpen(false)} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200" > ✕ </button>[span_261](end_span)
        [span_262](start_span)<h3 className="font-bold text-gray-900">تعديل بيانات العميل</h3>[span_262](end_span)
      </div>
      <div className="space-y-3">
        [span_263](start_span)<div><label className="block text-xs text-gray-500 mb-1">الاسم</label><input value={editClientName} onChange={(e) => setEditClientName(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-xl text-right" /></div>[span_263](end_span)
        [span_264](start_span)<div><label className="block text-xs text-gray-500 mb-1">الجوال</label><input value={editClientPhone} onChange={(e) => setEditClientPhone(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-xl text-right" inputMode="tel" /></div>[span_264](end_span)
      </div>
      [span_265](start_span)<div className="flex gap-2 mt-4"><button type="button" onClick={saveEditClient} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold" >حفظ</button><button type="button" onClick={() => setIsEditClientOpen(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold" >إلغاء</button></div>[span_265](end_span)
    </div>
  </div>
)}

    <div className="max-w-md mx-auto bg-gray-50 min-h-screen relative shadow-2xl overflow-hidden font-tajawal">
      {currentView === 'DASHBOARD' && <DashboardView />}
      {currentView === 'CLIENTS_LIST' && <ClientsListView />}
      [span_266](start_span){currentView === 'CLIENT_DETAILS' && <ClientDetailsView />}[span_266](end_span)
      {currentView === 'ADD_CLIENT' && <AddClientView />}
      [span_267](start_span){(currentView === 'ADD_DEBT' || currentView === 'EDIT_DEBT') && <DebtFormView />}[span_267](end_span)
      {currentView === 'RECORD_PAYMENT' && <RecordPaymentView />}
      {currentView === 'SETTINGS' && <SettingsView />}
      [span_268](start_span)<TabBar currentView={currentView} onChangeView={setCurrentView} />[span_268](end_span)
    </div>

    {summaryPreview && ( // نافذة معاينة كشف الحساب
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl text-right animate-slide-up">
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg">معاينة الرسالة</h3><button onClick={() => setSummaryPreview(null)} className="p-1 bg-gray-100 rounded-full"><X size={20}/></button></div>
            <div className="bg-gray-50 p-4 rounded-2xl text-sm whitespace-pre-wrap max-h-[40vh] overflow-y-auto mb-6 border border-gray-100 leading-relaxed font-tajawal">{summaryPreview.text}</div>
            <div className="flex gap-3">
              <button onClick={() => { window.open(`https://wa.me/${summaryPreview.phone}?text=${encodeURIComponent(summaryPreview.text)}`, '_blank'); setSummaryPreview(null); }} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"><Send size={20}/> إرسال الآن</button>
              <button onClick={() => setSummaryPreview(null)} className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold">إغلاق</button>
            </div>
          </div>
        </div>
      )}

   [span_269](start_span){postponedInfo !== null && ([span_269](end_span)
  [span_270](start_span)<div onClick={() => setPostponedInfo(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }} >[span_270](end_span)
    [span_271](start_span)<div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 18, width: '90%', maxWidth: 420, boxShadow: '0 12px 30px rgba(0,0,0,0.20)', textAlign: 'center' }} >[span_271](end_span)
      <div style={{color:'#FF7700' , fontWeight: 800, marginBottom: 6 }}>تفاصيل التأجيل</div>
      [span_272](start_span)<div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>تاريخ القسط: {formatDate(postponedInfo.date)}</div>[span_272](end_span)
      [span_273](start_span)<div style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#D40000',fontWeight: 800}}>{postponedInfo.note}</div>[span_273](end_span)
      [span_274](start_span)<button type="button" onClick={() => setPostponedInfo(null)} style={{ marginTop: 14, padding: '10px 16px', borderRadius: 12, background: '#FF7700', color: '#fff', fontWeight: 700, width: '100%' }} > إغلاق </button>[span_274](end_span)
    </div>
  </div>
)}
  </>
[span_275](start_span));[span_275](end_span)
}
