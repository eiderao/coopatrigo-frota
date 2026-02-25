import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Camera, XCircle, CheckCircle2, FileText, AlertCircle, ImagePlus, Loader2, ListTodo } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

// ==========================================
// CÂMERA DIRETA (Para ler QR Code ao vivo, se ele quiser)
// ==========================================
const QRScanner = ({ onSuccess, onError, onCancel }) => {
  React.useEffect(() => {
    let isMounted = true;
    const scanner = new Html5Qrcode("qr-reader");

    const startCamera = async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
          (decodedText) => {
            if (isMounted) scanner.stop().then(() => onSuccess(decodedText)).catch(() => onSuccess(decodedText));
          },
          () => {}
        );
      } catch (err) {
        if (isMounted) onError("Câmera bloqueada. Verifique as permissões do navegador.");
      }
    };
    startCamera();
    return () => {
      isMounted = false;
      if (scanner.isScanning) scanner.stop().then(() => scanner.clear()).catch(() => {});
    };
  }, [onSuccess, onError]);

  return (
    <div className="flex flex-col items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 w-full animate-fade-in">
      <p className="text-sm text-brand-600 font-semibold mb-3 text-center animate-pulse">Aponte para o QR Code</p>
      <div id="qr-reader" className="w-full aspect-square max-w-sm mb-4 bg-black rounded-xl overflow-hidden min-h-[250px]"></div>
      <button onClick={onCancel} className="w-full py-4 bg-red-50 text-red-600 rounded-xl font-medium">Cancelar Câmera</button>
    </div>
  );
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function CondutorHome() {
  const { user, profile } = useAuth();
  const [view, setView] = useState('HOME'); // HOME, SCANNER, UPLOADING, SUCCESS
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  // --- O NOVO FLUXO: UPLOAD DIRETO PARA A NUVEM (Zero Memória RAM) ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setView('UPLOADING');
    setErrorMsg('');

    try {
      // 1. Cria um nome único para o arquivo usando a data atual e o ID do usuário
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // 2. Faz o upload direto via streaming para o Supabase Storage (Não trava a memória!)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 3. Pega a URL pública/assinada da foto
      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(filePath);

      // 4. Cria a despesa como "Pendente de Revisão" no banco de dados
      const { error: dbError } = await supabase.from('expenses').insert({
        "tenantId": profile.tenantId,
        driver_id: user.id,
        expense_type: 'abastecimento', // padrão inicial
        total_value: 0, // A ser preenchido pela IA ou usuário depois
        odometer: 0,
        status: 'pendente_processamento', // Status crucial para a aba de prestação de contas
        receipt_url: publicUrl,
        data_source: 'upload'
      });

      if (dbError) throw dbError;

      setView('SUCCESS');
    } catch (err) {
      console.error("Erro no Upload:", err);
      setErrorMsg('Falha ao enviar o comprovante. Verifique sua conexão com a internet.');
      setView('HOME');
    } finally {
      e.target.value = ''; // Limpa o input
    }
  };

  // Simula o registro instantâneo se ele ler pelo QR Code direto
  const handleQRSuccess = async (qrText) => {
    setView('UPLOADING');
    try {
      await supabase.from('expenses').insert({
        "tenantId": profile.tenantId,
        driver_id: user.id,
        expense_type: 'abastecimento',
        total_value: 0,
        odometer: 0,
        status: 'pendente_processamento',
        nfe_key: qrText, // Salva o texto do QR Code
        data_source: 'qrcode'
      });
      setView('SUCCESS');
    } catch (err) {
      setErrorMsg('Erro ao salvar leitura.');
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
        
        {/* NOVO: Botão para ir para a Prestação de Contas */}
        {view === 'HOME' && (
          <button onClick={() => alert('Em breve: Lista de Prestações Pendentes')} className="p-3 bg-brand-50 text-brand-700 rounded-full hover:bg-brand-100 transition shadow-sm">
            <ListTodo className="w-6 h-6" />
          </button>
        )}
      </div>

      {errorMsg && view === 'HOME' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* --- ESTADO: ENVIANDO PARA A NUVEM --- */}
      {view === 'UPLOADING' && (
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-2xl shadow-sm border border-gray-100 mt-4">
          <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
          <h3 className="text-lg font-bold">Salvando Comprovante...</h3>
          <p className="text-sm text-gray-500 mt-2 text-center">Enviando com segurança para a nuvem.</p>
        </div>
      )}

      {/* --- ESTADO: SCANNER AO VIVO --- */}
      {view === 'SCANNER' && (
        <QRScanner 
          onSuccess={handleQRSuccess}
          onError={(err) => { setErrorMsg(err); setView('HOME'); }}
          onCancel={() => setView('HOME')}
        />
      )}

      {/* --- ESTADO: SUCESSO --- */}
      {view === 'SUCCESS' && (
        <div className="bg-brand-50 p-8 rounded-2xl text-center shadow-sm animate-fade-in">
          <CheckCircle2 className="w-20 h-20 text-brand-500 mb-4 mx-auto" />
          <h2 className="text-2xl font-bold text-brand-900 mb-2">Salvo na Nuvem!</h2>
          <p className="text-brand-700 mb-8">Seu comprovante foi guardado com segurança.</p>
          
          <button onClick={() => setView('HOME')} className="w-full bg-brand-600 text-white py-4 rounded-xl font-bold shadow-md hover:bg-brand-700 transition mb-3">
            Registrar Novo Comprovante
          </button>
          
          <button onClick={() => alert('Em breve: Ir para a revisão manual de dados')} className="w-full bg-white text-gray-700 border border-gray-300 py-3 rounded-xl font-medium">
            Fazer Prestação de Contas
          </button>
        </div>
      )}

      {/* --- ESTADO: HOME --- */}
      {view === 'HOME' && (
        <div className="flex flex-col gap-4 mt-2">
          
          {/* BOTÃO PRINCIPAL: CÂMERA NATIVA (Abre direto a câmera do celular com qualidade máxima) */}
          <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <button onClick={() => fileInputRef.current.click()} className="flex gap-4 items-center justify-center bg-brand-600 text-white py-8 rounded-2xl font-semibold shadow-md group">
            <Camera className="w-8 h-8 group-hover:scale-110 transition-transform" /> 
            <span className="text-xl">Tirar Foto do Cupom</span>
          </button>

          {/* BOTÃO SECUNDÁRIO: GALERIA / PDF */}
          <input type="file" accept="image/*,.pdf" id="gallery-upload" onChange={handleFileUpload} className="hidden" />
          <button onClick={() => document.getElementById('gallery-upload').click()} className="flex gap-3 items-center justify-center bg-white border border-gray-300 py-4 rounded-xl font-medium shadow-sm">
            <ImagePlus className="w-5 h-5 text-gray-500" /> Buscar da Galeria ou Arquivo
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">OU</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <button onClick={() => setView('SCANNER')} className="flex gap-3 items-center justify-center bg-brand-50 text-brand-700 border border-brand-200 py-4 rounded-xl font-medium shadow-sm">
            <CheckCircle2 className="w-5 h-5" /> Ler QR Code ao Vivo (Câmera Rápida)
          </button>
        </div>
      )}
    </div>
  );
}