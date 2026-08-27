import React, { useState } from 'react';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface VisionUploadProps {
  onDataExtracted: (data: any) => void;
}

export const VisionUpload = ({ onDataExtracted }: VisionUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setStatus('uploading');

    try {
      const response = await fetch('/api/vision/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Falha ao processar imagem');

      const data = await response.json();
      onDataExtracted(data);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error('Erro no upload de visão:', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <label className={`flex items-center justify-center px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
        status === 'uploading' ? 'border-blue-500 bg-blue-500/10' : 
        status === 'success' ? 'border-green-500 bg-green-500/10' : 
        status === 'error' ? 'border-red-500 bg-red-500/10' : 'border-slate-700 hover:border-cyan-500 hover:bg-slate-800/50'
      }`}>
        <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" disabled={isUploading} />
        
        {isUploading ? (
          <div className="flex items-center gap-2 text-blue-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Processando...</span>
          </div>
        ) : status === 'success' ? (
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Dados extraídos!</span>
          </div>
        ) : status === 'error' ? (
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Erro ao ler imagem.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400">
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium">Upload Inteligente (Print do Google Maps)</span>
          </div>
        )}
      </label>
    </div>
  );
};