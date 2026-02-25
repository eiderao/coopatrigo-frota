import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Camera, CheckCircle2, FileText, AlertCircle, ImagePlus, Loader2, ListTodo, Edit3 } from 'lucide-react';

export default function CondutorHome() {
  const { user, profile } = useAuth();
  const [view, setView] = useState('HOME'); // HOME, UPLOADING, SUCCESS, MANUAL
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    odometer: '', fuelType: 'Gasolina', liters: '', pricePerLiter: '', totalValue: ''
  });

  // --- ENVIO DIRETO COM SISTEMA ANTI-LOCK (WAKE UP DELAY) ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setView('UPLOADING');
    setErrorMsg('');

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // 🔴 O SEGREDO 1: Dá 1 segundo para o navegador "acordar" e o Supabase destravar o login
      await new Promise(resolve => setTimeout(resolve, 1000));

      let uploadError = null;

      // 🔴 O SEGREDO 2: Sistema de Retry. Se o LockManager travar, ele tenta de novo silenciosamente.
      for (let tentativa = 1; tentativa <= 2; tentativa++) {
        const { error } = await supabase.storage
          .from('receipts')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (!error) {
          uploadError = null;
          break; // Sucesso absoluto, sai do loop!
        }

        uploadError = error;
        
        // Se o erro for o LockManager, espera mais 2 segundos e tenta a segunda vez
        if (error.message.includes('lock') || error.message.includes('LockManager')) {
          console.warn(`Tentativa ${tentativa} falhou por Lock. Tentando novamente...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          break; // Se for outro erro (ex: sem internet), aborta na hora
        }
      }

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // 3. Pega URL
      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(filePath);

      // 4. Grava no banco de dados
      const { error: dbError } = await supabase.from('expenses').insert({
        "tenantId": profile.tenantId,
        driver_id: user.id,
        expense_type: 'abastecimento',
        total_value: 0,
        odometer: 0,
        status: 'pendente_processamento',
        receipt_url: publicUrl,
        data_source: 'upload'
      });

      if (dbError) throw new Error(`Erro banco de dados: ${dbError.message}`);

      setView('SUCCESS');
    } catch (err) {
      setErrorMsg(`Erro: ${err.message}`);
      setView('HOME');
    } finally {
      e.target.value = ''; // Libera a memória do input
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setView('UPLOADING');
    try {
      const { error: dbError } = await supabase.from('expenses').insert({
        "tenantId": profile.tenantId,
        driver_id: user.id,
        expense_type: 'abastecimento',
        total_value: parseFloat(formData.totalValue),
        odometer: parseFloat(formData.odometer),
        fuel_type: formData.fuelType,
        fuel_liters: parseFloat(formData.liters),
        status: 'pendente_processamento',
        data_source: 'manual'
      });

      if (dbError) throw new Error(dbError.message);
      setView('SUCCESS');
    } catch (err) {
      setErrorMsg(`Erro ao salvar: ${err.message}`);
      setView('HOME');
    }
  };

  return (
    <div className="p-4 md:p-8 flex flex-col h-full max-w-lg mx-auto w-full">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Nova Despesa</h1>
          <p className="text-gray-500 text-sm mt-1">Guarde seus comprovantes na nuvem.</p>
        </div>
        
        {view === 'HOME' && (
          <button onClick={() => alert('Em breve: Lista de Prestações Pendentes')} className="p-3 bg-brand-50 text-brand-700 rounded-full hover:bg-brand-100 transition shadow-sm">
            <ListTodo className="w-6 h-6" />
          </button>
        )}
      </div>

      {errorMsg && view === 'HOME' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* TELA DE CARREGAMENTO */}
      {view === 'UPLOADING' && (
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-2xl shadow-sm border border-gray-100 mt-4">
          <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
          <h3 className="text-lg font-bold">Salvando Comprovante...</h3>
          <p className="text-sm text-gray-500 mt-2 text-center">Enviando com segurança para a nuvem.</p>
        </div>
      )}

      {/* TELA DE SUCESSO */}
      {view === 'SUCCESS' && (
        <div className="bg-brand-50 p-8 rounded-2xl text-center shadow-sm animate-fade-in">
          <CheckCircle2 className="w-20 h-20 text-brand-500 mb-4 mx-auto" />
          <h2 className="text-2xl font-bold text-brand-900 mb-2">Salvo com Sucesso!</h2>
          <p className="text-brand-700 mb-8">Seu registro foi guardado com segurança.</p>
          
          <button onClick={() => setView('HOME')} className="w-full bg-brand-600 text-white py-4 rounded-xl font-bold shadow-md hover:bg-brand-700 transition mb-3">
            Registrar Novo
          </button>
        </div>
      )}

      {/* FORMULÁRIO MANUAL */}
      {view === 'MANUAL' && (
        <form onSubmit={handleManualSubmit} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 animate-fade-in">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Edit3 className="w-5 h-5 text-brand-600"/> Dados Manuais</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Km do Veículo</label>
              <input type="number" required value={formData.odometer} onChange={(e) => setFormData({...formData, odometer: e.target.value})} className="w-full p-3 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Combustível</label>
              <select value={formData.fuelType} onChange={(e) => setFormData({...formData, fuelType: e.target.value})} className="w-full p-3 border rounded-lg bg-white">
                <option value="Gasolina">Gasolina</option>
                <option value="Etanol">Etanol</option>
                <option value="Diesel">Diesel</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Litros</label>
                <input type="number" step="0.01" required value={formData.liters} onChange={(e) => setFormData({...formData, liters: e.target.value})} className="w-full p-3 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Valor Total (R$)</label>
                <input type="number" step="0.01" required value={formData.totalValue} onChange={(e) => setFormData({...formData, totalValue: e.target.value})} className="w-full p-3 border rounded-lg font-bold" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={() => setView('HOME')} className="flex-1 py-3 bg-gray-100 rounded-xl font-medium">Cancelar</button>
            <button type="submit" className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-medium">Salvar</button>
          </div>
        </form>
      )}

      {/* TELA PRINCIPAL */}
      {view === 'HOME' && (
        <div className="flex flex-col gap-4 mt-2">
          
          <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <button onClick={() => fileInputRef.current.click()} className="flex gap-4 items-center justify-center bg-brand-600 text-white py-8 rounded-2xl font-semibold shadow-md group">
            <Camera className="w-8 h-8 group-hover:scale-110 transition-transform" /> 
            <span className="text-xl">Câmera Nativa</span>
          </button>

          <input type="file" accept="image/*,.pdf" id="gallery-upload" onChange={handleFileUpload} className="hidden" />
          <button onClick={() => document.getElementById('gallery-upload').click()} className="flex gap-3 items-center justify-center bg-white border border-gray-300 py-4 rounded-xl font-medium shadow-sm">
            <ImagePlus className="w-5 h-5 text-gray-500" /> Buscar da Galeria
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">OU</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <button onClick={() => setView('MANUAL')} className="flex gap-3 items-center justify-center bg-white border border-gray-300 py-4 rounded-xl font-medium shadow-sm">
            <FileText className="w-5 h-5 text-gray-500" /> Preencher Dados Manualmente
          </button>
        </div>
      )}
    </div>
  );
}