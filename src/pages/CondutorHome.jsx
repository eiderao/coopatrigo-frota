import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, XCircle, CheckCircle2, FileText, AlertCircle } from 'lucide-react';

export default function CondutorHome() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef(null);

  // Prevenção de memory leak: desliga a câmera se o usuário trocar de página
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanner = async () => {
    setIsScanning(true);
    setScanResult(null);
    setCameraError('');

    try {
      // Pequeno delay para garantir que a div #qr-reader foi renderizada no DOM
      setTimeout(async () => {
        try {
          const html5QrCode = new Html5Qrcode("qr-reader");
          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: "environment" }, // Força o uso da câmera traseira
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0
            },
            (decodedText) => {
              // SUCESSO: QR Code encontrado
              setScanResult(decodedText);
              stopScanner(html5QrCode);
            },
            (errorMessage) => {
              // Erros de tracking frame-a-frame são normais. Ignoramos silenciosamente.
            }
          );
        } catch (err) {
          console.error("Erro ao iniciar a lente:", err);
          setCameraError('Não foi possível acessar a câmera. Verifique as permissões do seu navegador.');
          setIsScanning(false);
        }
      }, 100);
    } catch (err) {
      console.error(err);
      setIsScanning(false);
    }
  };

  const stopScanner = async (scannerInstance) => {
    const instance = scannerInstance || scannerRef.current;
    if (instance) {
      try {
        await instance.stop();
        instance.clear();
        scannerRef.current = null;
      } catch (err) {
        console.error("Erro ao parar a câmera:", err);
      }
    }
    setIsScanning(false);
  };

  const resetProcess = () => {
    setScanResult(null);
    setCameraError('');
  };

  const handleProcessReceipt = () => {
    // Aqui chamaremos a Serverless Function da SEFAZ no próximo passo
    alert(`Enviando para a nuvem: ${scanResult}`);
  };

  return (
    <div className="p-4 md:p-8 flex flex-col h-full max-w-lg mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Registrar Despesa</h1>
        <p className="text-gray-500 text-sm mt-1">Escaneie o QR Code da nota fiscal (NF-e) ou insira manualmente.</p>
      </div>

      {/* ESTADO 1: MENSAGEM DE ERRO DE PERMISSÃO */}
      {cameraError && !isScanning && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700 font-medium">{cameraError}</p>
            <button 
              onClick={startScanner}
              className="mt-3 text-sm text-red-600 underline font-semibold hover:text-red-800"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* ESTADO 2: CÂMERA ATIVA */}
      {isScanning && (
        <div className="flex flex-col items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
          <div id="qr-reader" className="w-full aspect-square max-w-sm rounded-lg overflow-hidden border-2 border-brand-500 mb-4 bg-black"></div>
          <button
            onClick={() => stopScanner()}
            className="w-full flex justify-center items-center gap-2 bg-red-50 text-red-600 py-4 rounded-xl font-medium hover:bg-red-100 transition"
          >
            <XCircle className="w-5 h-5" />
            Cancelar Câmera
          </button>
        </div>
      )}

      {/* ESTADO 3: SUCESSO (QR LIDO) */}
      {scanResult && !isScanning && (
        <div className="flex flex-col items-center bg-brand-50 p-6 rounded-2xl border border-brand-200 text-center shadow-sm">
          <CheckCircle2 className="w-16 h-16 text-brand-500 mb-4" />
          <h2 className="text-xl font-bold text-brand-900 mb-2">QR Code Lido!</h2>
          <div className="bg-white p-3 rounded-lg border border-brand-100 w-full mb-6">
            <p className="text-xs text-gray-500 font-mono break-all line-clamp-3 text-left">
              {scanResult}
            </p>
          </div>
          
          <div className="w-full space-y-3">
            <button 
              onClick={handleProcessReceipt}
              className="w-full bg-brand-600 text-white py-4 rounded-xl font-medium hover:bg-brand-700 transition shadow-sm"
            >
              Processar Nota Fiscal
            </button>
            <button 
              onClick={resetProcess}
              className="w-full bg-white text-gray-600 border border-gray-300 py-3 rounded-xl font-medium hover:bg-gray-50 transition"
            >
              Ler outro QR Code
            </button>
          </div>
        </div>
      )}

      {/* ESTADO 0: TELA INICIAL (BOTÕES DE AÇÃO) */}
      {!isScanning && !scanResult && !cameraError && (
        <div className="flex flex-col gap-5 mt-2">
          <button
            onClick={startScanner}
            className="flex flex-col items-center justify-center gap-4 bg-brand-600 text-white p-10 rounded-2xl hover:bg-brand-700 transition shadow-md group"
          >
            <Camera className="w-14 h-14 group-hover:scale-110 transition-transform" />
            <span className="text-xl font-semibold">Ler QR Code da Nota</span>
          </button>

          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">OU</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <button className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-4 rounded-xl hover:bg-gray-50 transition font-medium shadow-sm">
            <FileText className="w-5 h-5 text-gray-500" />
            Digitar Manualmente
          </button>
        </div>
      )}
    </div>
  );
}