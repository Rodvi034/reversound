import React, { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, File, CheckCircle, XCircle, Loader, Music, Package } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ACCEPT_AUDIO = '.mp3,.wav,.flac,.ogg,.aac,.m4a';
const ACCEPT_PACK = '.zip';
const ACCEPT_IMAGE = '.jpg,.jpeg,.png,.webp,.gif';

const FileUpload = ({
  type = 'audio',   // audio | pack | image
  onUploaded,       // (result: {file_id, storage_path, url, original_filename}) => void
  label = 'Dosya Yükle',
  hint = '',
  className = '',
}) => {
  const { token } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState('idle'); // idle | uploading | done | error
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const acceptMap = { audio: ACCEPT_AUDIO, pack: ACCEPT_PACK, image: ACCEPT_IMAGE };
  const endpointMap = { audio: '/upload/audio', pack: '/upload/pack', image: '/upload/image' };

  const doUpload = useCallback(async (file) => {
    setUploadState('uploading');
    setUploadProgress(0);
    setErrorMsg('');
    setFileName(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(
        `${API}${endpointMap[type]}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          withCredentials: true,
          onUploadProgress: (e) => {
            if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        }
      );
      setUploadState('done');
      setUploadProgress(100);
      onUploaded?.(res.data);
    } catch (err) {
      setUploadState('error');
      setErrorMsg(err.response?.data?.detail || 'Yükleme başarısız. Tekrar deneyin.');
    }
  }, [type, token, onUploaded]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) doUpload(file);
  }, [doUpload]);

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) doUpload(file);
    e.target.value = '';
  };

  const reset = () => {
    setUploadState('idle');
    setUploadProgress(0);
    setFileName('');
    setErrorMsg('');
  };

  const TypeIcon = type === 'pack' ? Package : type === 'audio' ? Music : File;

  return (
    <div className={className}>
      <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">{label}</label>

      {uploadState === 'idle' && (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-md p-6 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-[#8b5cf6] bg-[#8b5cf6]/10'
              : 'border-white/10 hover:border-[#8b5cf6]/40 hover:bg-[#8b5cf6]/5'
          }`}
          data-testid={`file-upload-zone-${type}`}
        >
          <input
            type="file"
            accept={acceptMap[type]}
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <TypeIcon size={24} className="text-[#a1a1aa] mx-auto mb-2" />
          <p className="text-sm text-white">Sürükle & bırak veya <span className="text-[#8b5cf6]">dosya seç</span></p>
          <p className="text-xs text-[#a1a1aa] mt-1">
            {type === 'audio' ? 'MP3, WAV, FLAC — max 200MB' : type === 'pack' ? 'ZIP — max 500MB' : 'JPG, PNG, WEBP — max 10MB'}
          </p>
          {hint && <p className="text-xs text-[#a1a1aa] mt-1">{hint}</p>}
        </div>
      )}

      {uploadState === 'uploading' && (
        <div className="border border-white/10 rounded-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <Loader size={16} className="text-[#8b5cf6] animate-spin flex-shrink-0" />
            <p className="text-sm text-white truncate">{fileName}</p>
            <span className="text-xs text-[#a1a1aa] ml-auto">{uploadProgress}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#8b5cf6] transition-all neon-progress"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {uploadState === 'done' && (
        <div className="border border-[#10b981]/20 bg-[#10b981]/5 rounded-md p-4 flex items-center gap-3">
          <CheckCircle size={16} className="text-[#10b981] flex-shrink-0" />
          <p className="text-sm text-[#10b981] truncate flex-1">{fileName} — yüklendi</p>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-[#a1a1aa] hover:text-white transition-colors"
          >
            Değiştir
          </button>
        </div>
      )}

      {uploadState === 'error' && (
        <div className="border border-red-500/20 bg-red-500/5 rounded-md p-4 flex items-center gap-3">
          <XCircle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400 flex-1">{errorMsg}</p>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-[#a1a1aa] hover:text-white transition-colors"
          >
            Tekrar
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
