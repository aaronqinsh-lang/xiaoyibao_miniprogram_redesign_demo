import React, { useState } from 'react';
import { 
  Sparkles, 
  Heart, 
  Mail, 
  Copy, 
  Check, 
  ChevronRight, 
  Globe,
  Lock,
  UserPlus
} from 'lucide-react';

interface Props {
  onLogin: () => void;
}

// 吉祥物图片路径 - 使用 HTTPS 链接
const MASCOT_IMG = "https://picgo-1302991947.cos.ap-guangzhou.myqcloud.com/images/logo_512_image.png";

const LandingPage: React.FC<Props> = ({ onLogin }) => {
  const [copied, setCopied] = useState(false);
  const testEmail = "admin@xiaoyibao.com.cn";
  const testPass = "123456";

  const handleCopy = () => {
    const text = `账号: ${testEmail}\n密码: ${testPass}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen max-w-md mx-auto bg-brand-bg flex flex-col items-center justify-center p-8 overflow-hidden relative">
      {/* 背景装饰 */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-light/30 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-core/10 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="w-full flex-1 flex flex-col items-center justify-center space-y-12 animate-fade-in-up">
        {/* Logo 区域 */}
        <div className="relative">
          <div className="w-32 h-32 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center mascot-float border-2 border-brand-light overflow-hidden">
            <div className="w-full h-full bg-brand-soft flex items-center justify-center relative">
              <img src={MASCOT_IMG} alt="小胰宝" className="w-[85%] h-[85%] object-contain drop-shadow-md" />
            </div>
            <div className="absolute -top-3 -right-3">
              <Sparkles className="w-10 h-10 text-brand-orange fill-brand-orange" />
            </div>
          </div>
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white px-4 py-1.5 rounded-full shadow-lg border border-slate-50 flex items-center gap-1.5 whitespace-nowrap">
            <Heart className="w-3 h-3 text-red-400 fill-red-400" />
            <span className="text-[10px] font-black text-slate-800 tracking-tight uppercase">Patient Empowerment</span>
          </div>
        </div>

        {/* 品牌名称 */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Pancrepal 小胰宝</h1>
          <p className="text-sm font-bold text-slate-500 leading-relaxed px-6">
            肿瘤病友/家属科普与病情主动管理伙伴
          </p>
        </div>

        {/* 测试登录框 */}
        <div className="w-full bg-white/60 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white shadow-xl space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-brand-dark" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">测试预览账号</span>
            </div>
            {copied ? (
              <span className="text-[9px] font-black text-brand-dark flex items-center gap-1">
                <Check className="w-3 h-3" /> 已复制
              </span>
            ) : null}
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 relative group overflow-hidden">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-slate-500">账号：{testEmail}</p>
              <p className="text-[11px] font-bold text-slate-500">密码：{testPass}</p>
            </div>
            <button 
              onClick={handleCopy}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-white rounded-xl shadow-md border border-slate-100 text-brand-dark active:scale-90 transition-all hover:bg-brand-light"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          <button 
            onClick={onLogin}
            className="w-full py-5 bg-brand-dark text-white rounded-2xl font-black text-sm shadow-xl shadow-brand-dark/20 flex items-center justify-center gap-2 group active:scale-[0.98] transition-all"
          >
            一键测试登录 <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* 社交登录 */}
        <div className="w-full space-y-3">
          <div className="flex items-center gap-3 px-4">
            <div className="h-[1px] flex-1 bg-slate-200"></div>
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">其他方式</span>
            <div className="h-[1px] flex-1 bg-slate-200"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 bg-white py-4 rounded-2xl border border-slate-100 shadow-sm active:scale-95 transition-all">
              <Globe className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-black text-slate-600">Google 登录</span>
            </button>
            <button className="flex items-center justify-center gap-2 bg-white py-4 rounded-2xl border border-slate-100 shadow-sm active:scale-95 transition-all">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-black text-slate-600">邮件登录</span>
            </button>
          </div>
        </div>
      </div>

      {/* 底部链接 */}
      <div className="mt-12 space-y-6 text-center">
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <span className="text-[11px] font-bold">还没有账号？</span>
          <button className="text-[11px] font-black text-brand-dark underline decoration-2 underline-offset-4 flex items-center gap-1">
            <UserPlus className="w-3.5 h-3.5" /> 立即注册
          </button>
        </div>
        <div className="flex items-center justify-center gap-6 text-[10px] font-bold text-slate-300">
          <a href="#" className="hover:text-brand-dark transition-colors">隐私政策</a>
          <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
          <a href="#" className="hover:text-brand-dark transition-colors">服务条款</a>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;