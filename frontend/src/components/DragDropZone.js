import React, { useState, useCallback } from 'react';
import { Upload, X, Image, FileAudio, Film, CheckCircle, Loader } from 'lucide-react';

const TYPE_CONFIG = {
  image: { accept: '.jpg,.jpeg,.png,.webp,.gif', maxMb: 10, icon: Image, label: 'Görsel', hint: 'JPG, PNG, WEBP — maks 10MB' },
  audio: { accept: '.mp3,.wav,.flac,.ogg,.aac', maxMb: 200, icon: FileAudio, label: 'Ses Dosyası', hint: 'MP3, WAV, FLAC — maks 200MB' },
  video: { accept: '.mp4,.mov,.avi,.webm', maxMb: 500, icon: Film, label: 'Video', hint: 'MP4, MOV — maks 500MB' },
  any: { accept: '*', maxMb: 500, icon: Upload, label: 'Dosya', hint: 'Maks 500MB' },
};

const DragDropZone = ({
  type = 'image',
  label,
  hint,
  onFile,
  onUploaded,
  uploadEndpoint,
  token,
  previewUrl,
  className = '',
  compact = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [state, setState] = useState('idle'); // idle | uploading | done | error
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(previewUrl || null);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.any;
  const Icon = cfg.icon;
  const maxBytes = cfg.maxMb * 1024 * 1024;

  const processFile = useCallback(async (file) => {
    if (!file) return;
    if (file.size > maxBytes) {
      setState('error');
      setErrorMsg(`Dosya çok büyük. Maks ${cfg.maxMb}MB`);
      return;
    }

    setFileName(file.name);

    // Preview for images
    if (type === 'image' && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }

    if (onFile) { onFile(file); return; }

    if (uploadEndpoint && token) {
      setState('uploading');
      setProgress(0);
      const formData = new FormData();
      formData.append('file', file);
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadEndpoint);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.upload.onprogress = (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setState('done');
            setProgress(100);
            const result = JSON.parse(xhr.responseText);
            onUploaded?.(result);
          } else {
            setState('error');
            setErrorMsg('Yükleme başarısız');
          }
        };
        xhr.onerror = () => { setState('error'); setErrorMsg('Ağ hatası'); };
        xhr.send(formData);
      } catch (err) {
        setState('error');
        setErrorMsg(err.message || 'Yükleme hatası');
      }
    }
  }, [type, maxBytes, uploadEndpoint, token, onFile, onUploaded]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const reset = () => {
    setState('idle');
    setProgress(0);
    setFileName('');
    setErrorMsg('');
    setPreview(null);
  };

  if (state === 'done') {
    return (
      <div className={`relative rounded-xl border border-[#10b981]/30 bg-[#10b981]/5 p-4 ${className}`}>
        {preview && type === 'image' && (
          <div className="mb-3 rounded-lg overflow-hidden h-32">
            <img src={preview} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex items-center gap-3">
          <CheckCircle size={18} className="text-[#10b981]" />
          <p className="text-sm text-[#10b981] truncate flex-1">{fileName} — yüklendi</p>
          <button type="button" onClick={reset} className="text-xs text-[#a1a1aa] hover:text-white transition-colors px-2 py-1 border border-white/10 rounded-md">
            Değiştir
          </button>
        </div>
      </div>
    );
  }

  if (state === 'uploading') {
    return (
      <div className={`rounded-xl border border-white/10 p-4 ${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <Loader size={16} className="text-[#8b5cf6] animate-spin flex-shrink-0" />
          <p className="text-sm text-white truncate">{fileName}</p>
          <span className="text-xs text-[#a1a1aa] ml-auto">{progress}%</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-[#8b5cf6] rounded-full transition-all neon-progress" style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={`rounded-xl border border-[#ec4899]/30 bg-[#ec4899]/5 p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <X size={16} className="text-[#ec4899]" />
          <p className="text-sm text-[#ec4899] flex-1">{errorMsg}</p>
          <button type="button" onClick={reset} className="text-xs text-[#a1a1aa] hover:text-white px-2 py-1 border border-white/10 rounded-md">
            Tekrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false); }}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden ${
          isDragging
            ? 'border-[#8b5cf6] bg-[#8b5cf6]/10 scale-[1.01]'
            : 'border-white/15 hover:border-[#8b5cf6]/50 hover:bg-[#8b5cf6]/5'
        } ${compact ? 'p-5' : 'p-10'}`}
      >
        <input
          type="file"
          accept={cfg.accept}
          onChange={handleChange}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />

        {/* Background preview for images */}
        {preview && type === 'image' && (
          <div className="absolute inset-0">
            <img src={preview} alt="" className="w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-[#0d0d0f]/60" />
          </div>
        )}

        {/* Animated glow when dragging */}
        {isDragging && (
          <div className="absolute inset-0 bg-[#8b5cf6]/5 animate-pulse pointer-events-none" />
        )}

        <div className="relative z-10 flex flex-col items-center gap-3 text-center">
          <div className={`rounded-xl flex items-center justify-center transition-all ${
            isDragging ? 'bg-[#8b5cf6] scale-110' : 'bg-[#8b5cf6]/10 border border-[#8b5cf6]/20'
          } ${compact ? 'w-10 h-10' : 'w-14 h-14'}`}>
            <Icon size={compact ? 18 : 24} className={isDragging ? 'text-white' : 'text-[#8b5cf6]'} />
          </div>
          <div>
            <p className={`font-semibold text-white ${compact ? 'text-sm' : 'text-base'}`}>
              {isDragging ? 'Bırak!' : (label || cfg.label)}
            </p>
            <p className="text-xs text-[#a1a1aa] mt-0.5">
              {isDragging ? 'Dosyayı buraya bırak' : `Sürükle & bırak veya tıkla`}
            </p>
            <p className="text-[10px] text-[#a1a1aa] mt-1 font-mono">{hint || cfg.hint}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DragDropZone;
