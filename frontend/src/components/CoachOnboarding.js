import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, Users, Music, Cpu, BookOpen, Loader } from 'lucide-react';

const QUESTIONS = [
  {
    id: 'target_audience',
    icon: Users,
    label: 'Hedef Kitlen Kim?',
    desc: 'Müziğin kime ulaşmasını istiyorsun?',
    options: ['Genç Kentli Dinleyiciler (18-25)', 'Underground/Niche Kitle', 'Geniş Mainstream Kitle', 'Diaspora & Dünya Müziği Kitlesi', 'İçerik Üreticileri / Creator\'lar'],
  },
  {
    id: 'musical_style',
    icon: Music,
    label: 'Müzik Tarzın',
    desc: 'Ağırlıklı çalıştığın türler?',
    options: ['Trap / Drill', 'Hip-Hop / Boom Bap', 'R&B / Soul', 'Pop / Mainstream', 'Electronic / EDM', 'Lo-Fi / Chillhop', 'Türkçe Pop / TYT', 'Rock / Alternative'],
    multi: true,
  },
  {
    id: 'current_equipment',
    icon: Cpu,
    label: 'Mevcut Ekipmanın',
    desc: 'Hangi araçlarla çalışıyorsun?',
    options: ['Sadece laptop/bilgisayar', 'Temel setup (interface + mic)', 'Orta düzey home studio', 'Profesyonel stüdyo erişimim var', 'Henüz ekipmanım yok'],
  },
  {
    id: 'technical_level',
    icon: BookOpen,
    label: 'Teknik Seviyен',
    desc: 'Prodüksiyon deneyimin?',
    options: ['Yeni başlıyorum', '1-2 yıllık deneyim', '3-5 yıllık deneyim', 'Profesyonel seviye'],
  },
];

const CoachOnboarding = ({ onComplete }) => {
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const currentQ = QUESTIONS[step];
  const Icon = currentQ?.icon;
  const progress = ((step) / QUESTIONS.length) * 100;

  const selectAnswer = (option) => {
    if (currentQ.multi) {
      const current = answers[currentQ.id] || [];
      const updated = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option];
      setAnswers(prev => ({ ...prev, [currentQ.id]: updated }));
    } else {
      setAnswers(prev => ({ ...prev, [currentQ.id]: option }));
    }
  };

  const isSelected = (option) => {
    const val = answers[currentQ.id];
    if (currentQ.multi) return (val || []).includes(option);
    return val === option;
  };

  const canProceed = currentQ.multi
    ? (answers[currentQ.id] || []).length > 0
    : !!answers[currentQ.id];

  const handleNext = () => {
    if (step < QUESTIONS.length - 1) {
      setStep(s => s + 1);
    } else {
      setLoading(true);
      setTimeout(() => { onComplete(answers); }, 600);
    }
  };

  return (
    <div className="max-w-lg mx-auto animate-fade-up">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center mx-auto mb-4">
          <Zap size={24} className="text-[#8b5cf6]" />
        </div>
        <h2 className="font-heading font-bold text-2xl text-white mb-2">AI Kariyer Koçun</h2>
        <p className="text-[#a1a1aa] text-sm">Sana özel yol haritası hazırlamak için birkaç soru soralım.</p>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-[#a1a1aa] mb-2">
          <span>{step + 1} / {QUESTIONS.length}</span>
          <span>%{Math.round(progress)}</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-[#8b5cf6] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className="rs-card p-6 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center">
            <Icon size={16} className="text-[#8b5cf6]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{currentQ.label}</h3>
            <p className="text-xs text-[#a1a1aa]">{currentQ.desc}</p>
          </div>
        </div>

        <div className="space-y-2">
          {currentQ.options.map(option => (
            <button
              key={option}
              onClick={() => selectAnswer(option)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-all text-sm ${
                isSelected(option)
                  ? 'border-[#8b5cf6] bg-[#8b5cf6]/10 text-white'
                  : 'border-white/10 hover:border-white/20 text-[#a1a1aa] hover:text-white'
              }`}
              data-testid={`option-${option.replace(/\s+/g, '-')}`}
            >
              <span className={`mr-2 ${isSelected(option) ? 'text-[#8b5cf6]' : ''}`}>{isSelected(option) ? '●' : '○'}</span>
              {option}
            </button>
          ))}
        </div>
        {currentQ.multi && <p className="text-xs text-[#a1a1aa] mt-2">Birden fazla seçebilirsin</p>}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex-1 border border-white/10 text-[#a1a1aa] hover:text-white py-3 rounded-xl transition-colors">
            Geri
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={!canProceed || loading}
          className="flex-2 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-40 text-white font-semibold py-3 px-8 rounded-xl transition-all hover:shadow-glow flex items-center justify-center gap-2"
          data-testid="coach-next-btn"
        >
          {loading ? <Loader size={16} className="animate-spin" /> : step === QUESTIONS.length - 1 ? <><Zap size={16} /> Koçumu Başlat</> : <>Devam Et <ArrowRight size={16} /></>}
        </button>
      </div>
    </div>
  );
};

export default CoachOnboarding;
