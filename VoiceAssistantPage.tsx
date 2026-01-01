import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { Mic, Loader2, X, Volume2, Info, ChevronLeft, UserCheck, Heart, MicOff, Bot } from 'lucide-react';

// 吉祥物图片路径 - 使用 HTTPS 链接以确保跨域和安全加载
const MASCOT_IMG = "https://picgo-1302991947.cos.ap-guangzhou.myqcloud.com/images/logo_512_image.png";

// --- 实用工具函数 ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const VOICE_SYSTEM_INSTRUCTION = `你现在是“小胰宝”实时语音科普助手。
核心表达风格：
1. 友好、亲切、富有同理心，语气温润且富有鼓励性。
2. 回答必须完整但极其简洁，确保每次回复的播报时长在1分钟内。
3. 风险提示规范：回复末尾必须包含一句不超过15字的极简风险提示，例如：“AI回复仅供参考，不作医疗建议。”
4. 你具有实时打断能力。当你感知到用户正在说话，请立即停止当前的回复流。
5. 仅限科普，严禁提供任何诊疗方案。`;

interface Props {
  isCareMode?: boolean;
  onBack?: () => void;
}

const VOICE_OPTIONS = [
  { id: 'Kore', label: '知性女性', voice: 'Kore' },
  { id: 'Charon', label: '稳重男性', voice: 'Charon' },
  { id: 'Puck', label: '活力青年', voice: 'Puck' },
];

const VoiceAssistantPage: React.FC<Props> = ({ isCareMode, onBack }) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0]);
  
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  const clearAllSources = () => {
    for (const source of sourcesRef.current.values()) {
      try { source.stop(); } catch(e) {}
    }
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const stopSession = () => {
    setIsActive(false);
    setStatus('idle');
    if (sessionRef.current) sessionRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close().catch(() => {});
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close().catch(() => {});
      outputAudioContextRef.current = null;
    }
    clearAllSources();
  };

  const startSession = async () => {
    try {
      // 检查 API Key 选择状态
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await aistudio.openSelectKey();
        }
      }

      setStatus('connecting');
      setIsActive(true);
      setErrorMessage(null);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus('listening');
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(2048, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              clearAllSources();
              setStatus('listening');
              return;
            }
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              setStatus('speaking');
              const ctx = outputAudioContextRef.current;
              if (!ctx) return;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setStatus('listening');
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onerror: (e: any) => {
            console.error(e);
            if (e.message?.includes("Requested entity was not found")) {
              if (aistudio) aistudio.openSelectKey();
            }
            setStatus('error');
            setErrorMessage('连接异常，请重试');
          },
          onclose: () => {
            if (isActive) stopSession();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice.voice } },
          },
          systemInstruction: VOICE_SYSTEM_INSTRUCTION,
        },
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || '无法建立通话连接');
      stopSession();
    }
  };

  const handleToggle = () => isActive ? stopSession() : startSession();

  return (
    <div className={`flex flex-col h-full bg-[#F2F9F6] items-center p-8 space-y-8 animate-in fade-in duration-500 overflow-hidden relative ${isCareMode ? 'care-mode-root' : ''}`}>
      
      {/* 背景装饰 */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-light/30 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-core/10 rounded-full blur-[80px] pointer-events-none"></div>

      {/* 顶部返回 */}
      <div className="w-full flex justify-start z-20">
        <button 
          onClick={() => { stopSession(); if (onBack) onBack(); }}
          className="flex items-center gap-2 text-slate-400 font-black hover:text-brand-dark transition-colors"
        >
          <ChevronLeft className="w-6 h-6" /> 返回对话
        </button>
      </div>

      {/* 中心视觉区域 */}
      <div className="relative py-8 flex flex-col items-center justify-center flex-1 w-full">
        {/* 呼吸灯光环 */}
        {(status === 'listening' || status === 'speaking' || status === 'connecting') && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`absolute w-72 h-72 bg-brand-core/10 rounded-full animate-pulse-subtle scale-110`}></div>
            <div className={`absolute w-80 h-80 bg-brand-core/5 rounded-full animate-pulse-subtle delay-700 scale-125`}></div>
          </div>
        )}

        {/* 核心圆形头像/开关 */}
        <div 
          onClick={handleToggle}
          role="button"
          tabIndex={0}
          className={`
            relative z-20 bg-white rounded-full flex items-center justify-center shadow-2xl p-5 mascot-float transition-all duration-500 cursor-pointer outline-none focus:ring-4 focus:ring-brand-core/20
            ${isCareMode ? 'w-64 h-64' : 'w-56 h-56'}
            ${status === 'speaking' ? 'scale-110 shadow-brand-core/20' : ''}
          `}
        >
          <div className={`w-full h-full bg-brand-core rounded-full flex items-center justify-center relative overflow-hidden transition-all duration-500 shadow-inner`}>
             <img 
               src={MASCOT_IMG} 
               alt="小胰宝" 
               className={`object-contain brightness-110 drop-shadow-md ${isCareMode ? 'w-44 h-44' : 'w-36 h-36'}`} 
             />
             
             {/* 说话时的音频能量条 */}
             {status === 'speaking' && (
              <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-1.5 px-2">
                <div className="w-1.5 h-6 bg-white/60 rounded-full animate-[bounce_0.6s_ease-in-out_infinite] delay-75"></div>
                <div className="w-1.5 h-10 bg-white rounded-full animate-[bounce_0.8s_ease-in-out_infinite]"></div>
                <div className="w-1.5 h-8 bg-white/80 rounded-full animate-[bounce_0.5s_ease-in-out_infinite] delay-150"></div>
                <div className="w-1.5 h-