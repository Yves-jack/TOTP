import React, { useState, useEffect, useCallback } from 'react';
import { authenticator } from 'otplib';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import { ShieldCheck, RefreshCw, Settings2, CheckCircle, XCircle, Server, QrCode, ScanFace, ShieldAlert, AlertTriangle } from 'lucide-react';
import { createDigest, createRandomBytes } from '@otplib/plugin-crypto-js';
import { keyDecoder, keyEncoder } from '@otplib/plugin-thirty-two';

// 配置浏览器兼容的 otplib 选项
// 使用 @otplib/plugin-crypto-js 提供的浏览器兼容实现
authenticator.options = {
  ...authenticator.options,
  createDigest,
  createRandomBytes,
  keyDecoder,
  keyEncoder,
};

// =========================================
// 【JS 逻辑部分】 - 状态管理与核心算法调用
// =========================================
const TOTPLab = () => {
  // --- 核心参数状态 ---
  // 初始密钥状态，会在组件挂载时生成随机密钥
  const [secret, setSecret] = useState('');
  const [step, setStep] = useState(30); // 时间步长 (秒)
  const [algorithm, setAlgorithm] = useState('sha1'); // 哈希算法
  const [digits, setDigits] = useState(6); // 口令长度

  // --- 动态运行状态 ---
  const [token, setToken] = useState('------'); // 当前生成的 Token
  const [remaining, setRemaining] = useState(30); // 当前窗口剩余时间
  const [progress, setProgress] = useState(100); // 进度条百分比

  // --- 验证功能状态 ---
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState(null); // null | { success: boolean, message: string }
  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // --- 风险预警状态 ---
  const [failCount, setFailCount] = useState(0); // 连续验证失败次数
  const RISK_THRESHOLD = 5; // 连续验证失败次数阈值，超过则显示风险预警卡片

  // 生成新的随机密钥
  const generateRandomSecret = () => {
    try {
      setSecret(authenticator.generateSecret());
      setVerifyResult(null);
      setFailCount(0); // 更换密钥时重置连续验证失败次数
    } catch (error) {
      console.error('生成随机密钥失败', error);
    }
  };

  // 初始化：组件挂载时生成随机密钥
  useEffect(() => {
    try {
      const newSecret = authenticator.generateSecret();
      setSecret(newSecret);
    } catch (error) {
      console.error('初始化密钥失败，使用默认密钥', error);
      setSecret('JBSWY3DPEHPK3PXP'); // 后备默认密钥
    }
  }, []); // 仅在组件挂载时执行一次

  // 计算 TOTP 的核心副作用函数 (每秒执行或参数变化时执行)
  useEffect(() => {
    if (!secret) {
      return; // 如果密钥还没有初始化，不启动定时器
    }

    const timer = setInterval(() => {
      // 1. 计算时间参数
      const epoch = Math.floor(Date.now() / 1000);
      const currentRemaining = step - (epoch % step);
      setRemaining(currentRemaining);
      setProgress((currentRemaining / step) * 100);

      // 2. 配置算法库参数
      authenticator.options = { step, algorithm, digits };

      // 3. 生成当前 Token
      try {
        const newToken = authenticator.generate(secret);
        setToken(newToken);
      } catch (err) {
        setToken('ERROR');
        console.error("Token生成失败，可能是密钥格式错误", err);
        console.error("当前密钥:", secret);
      }
    }, 1000);

    // 清理定时器
    return () => clearInterval(timer);
  }, [secret, step, algorithm, digits]); // 依赖项：当这些参数变化时，重新配置定时器逻辑

  // 生成用于二维码的 URI (遵循 otpauth 标准协议)
  const getOtpAuthUri = useCallback(() => {
    const user = 'totp-demo@example.com';
    const issuer = 'TOTP Lab';
    // 注意：otplib 的 keyuri 方法会自动处理算法和步长参数到 URL 中
    authenticator.options = { step, algorithm, digits};
    return authenticator.keyuri(user, issuer, secret);
  }, [secret, step, algorithm, digits]);

  // 调用后端 API 进行验证
  const handleVerify = async () => {
    if (!verifyInput || verifyInput.length !== digits) return;
    setIsLoading(true);
    setVerifyResult(null);
    try {
      const response = await axios.post('http://localhost:3001/api/verify', {
        token: verifyInput,
        secret,
        step,
        algorithm,
        digits
      });
      if (response.data.success) {
        setVerifyResult(response.data);
        setFailCount(0); // 成功则重置计数
      }
      else {
        throw new Error("验证失败");
      }
    } catch (error) {
      const newFailCount = failCount + 1;
      setFailCount(newFailCount);
      setVerifyResult({ 
        success: false, 
        message: error.response?.data?.message || '口令错误，请重新输入' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 为了演示，点击当前生成的 Token 可以直接填入验证框
  const copyToVerify = () => {
    setVerifyInput(token);
    setVerifyResult(null);
  };

  // =========================================
  // 【HTML (JSX) 视图部分】 - UI 结构与样式
  // =========================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex justify-center p-4 md:p-8 font-sans leading-relaxed selection:bg-cyan-500/30 box-border">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 box-border overflow-x-hidden">
        
        {/* --- 左侧主卡片：Token 展示与参数设置 --- */}
        <div className="lg:col-span-7 bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] p-8 border border-slate-800 shadow-2xl relative overflow-hidden group">
           {/* 背景装饰光晕 */}
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-cyan-600/20 rounded-full blur-[100px] group-hover:bg-cyan-500/30 transition-all duration-700"></div>

          {/* 标题栏 */}
          <div className="flex justify-between items-center mb-10 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-xl">
                 <ShieldCheck className="text-cyan-400 w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold tracking-wide bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">TOTP 测试展示</h1>
            </div>
            <Settings2 className="text-slate-500 w-6 h-6" />
          </div>

          {/* 核心 Token 显示区 */}
          <div className="text-center mb-12 relative z-10 cursor-pointer" onClick={copyToVerify} title="点击复制到验证框">
            <div className="inline-block relative">
              {/* Token 文本 */}
              <div className={`text-7xl md:text-8xl font-mono font-black tracking-[0.15em] bg-gradient-to-r ${remaining < 5 ? 'from-red-500 to-orange-500 animate-pulse' : 'from-cyan-400 via-blue-400 to-purple-500'} bg-clip-text text-transparent transition-all duration-300`}>
                {token === 'ERROR' || token === '------' ? token : `${token}`}
              </div>
              <p className="mt-2 text-slate-400 font-medium flex items-center justify-center gap-2">
                <ScanFace size={16}/> 点击将当前{digits}位口令复制到验证框
              </p>
            </div>
          </div>

          {/* 倒计时进度条 */}
          <div className="relative z-10 mb-12">
            <div className="flex justify-between text-sm font-bold text-slate-400 mb-3 px-1">
               <span>下次更新</span>
               <span className={remaining < 5 ? "text-red-400" : "text-cyan-400"}>{remaining}s</span>
            </div>
            <div className="w-full bg-slate-800/50 h-4 rounded-full overflow-hidden p-1 ring-1 ring-slate-700/50">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${remaining < 5 ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-cyan-500 to-blue-600'}`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

           {/* 参数设置区域 (Grid 布局) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 bg-slate-800/30 p-6 rounded-3xl border border-slate-700/50">
             {/* 密钥输入 */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-3 ml-1 tracking-wider">共享密钥 (Base32)</label>
              <div className="flex gap-3">
                <input 
                  value={secret}
                  onChange={(e) => {setSecret(e.target.value.toUpperCase()); setVerifyResult(null);}}
                  className="flex-1 bg-slate-950/50 border-2 border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 outline-none font-mono text-lg tracking-wider transition-all"
                  spellCheck="false"
                />
                <button 
                  onClick={generateRandomSecret}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 rounded-xl transition-all active:scale-95 border-2 border-slate-700 flex flex-col items-center justify-center gap-1"
                  title="重新生成随机密钥"
                >
                  <RefreshCw size={20} />
                </button>
              </div>
            </div>
            
            {/* 步长设置 */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-3 ml-1 tracking-wider">时间步长 (秒)</label>
              <div className="relative">
                 <input 
                  type="number"
                  value={step}
                  min="5" max="300"
                  onChange={(e) => {setStep(Number(e.target.value) || 30); setVerifyResult(null);}}
                  className="w-full bg-slate-950/50 border-2 border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 outline-none font-mono text-lg font-bold transition-all pl-12"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">T=</span>
              </div>
            </div>

            {/* 算法选择 */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-3 ml-1 tracking-wider">哈希算法</label>
              <select 
                value={algorithm}
                onChange={(e) => {setAlgorithm(e.target.value); setVerifyResult(null);}}
                className="w-full bg-slate-950/50 border-2 border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 outline-none font-mono text-lg font-bold transition-all appearance-none cursor-pointer"
                style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 1rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em`}}
              >
                <option value="sha1">HMAC-SHA1</option>
                <option value="sha256">HMAC-SHA256</option>
                <option value="sha512">HMAC-SHA512</option>
              </select>
            </div>

            {/* 口令长度选择 */}
              <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-3 ml-1 tracking-wider">口令长度（位）</label>
              <div className="relative">
                <input 
                  type="number"
                  value={digits}
                  min="6" max="10"
                  onChange={(e) => {setDigits(Number(e.target.value) || 6); setVerifyResult(null);}}
                  className="w-full bg-slate-950/50 border-2 border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 outline-none font-mono text-lg font-bold transition-all pl-12"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">L=</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- 右侧侧边栏：功能扩展区 --- */}
        <div className="lg:col-span-5 space-y-8 min-w-0">
          
          {/* 1. 移动端扫码卡片 */}
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] p-8 border border-slate-800 shadow-lg relative overflow-hidden">
             <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-600/20 rounded-full blur-[80px]"></div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <QrCode className="text-purple-400 w-6 h-6"/>
              <h3 className="text-lg font-bold">移动端同步</h3>
              <button 
                onClick={() => setShowScanner(!showScanner)}
                className="ml-auto text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-full transition-colors"
              >
                {showScanner ? '隐藏' : '展开'}
              </button>
            </div>

            {showScanner && (
            <div className="bg-white p-4 rounded-2xl inline-block mx-auto w-full relative z-10">
              <div className="aspect-square flex items-center justify-center">
                <QRCodeSVG 
                  value={getOtpAuthUri()} 
                  size={200}
                  bgColor={"#ffffff"}
                  fgColor={"#0f172a"}
                  level={"M"}
                  includeMargin={false}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-slate-900 text-center mt-4 text-sm font-medium">使用 Google Authenticator 或其他 App 扫描</p>
            </div>
            )}
             {!showScanner && <p className="text-slate-400 text-sm relative z-10">点击展开二维码，使用手机 App 扫描以同步当前的密钥配置。</p>}
          </div>

          {/* 2. 后端验证模拟卡片 */}
          <div className={`bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] p-8 border shadow-lg transition-all duration-300 relative overflow-hidden ${verifyResult?.success ? 'border-green-500/30 shadow-green-900/20' : verifyResult?.success === false ? 'border-red-500/30 shadow-red-900/20' : 'border-slate-800'}`}>
             <div className={`absolute -bottom-20 -left-20 w-60 h-60 rounded-full blur-[80px] transition-colors duration-500 ${verifyResult?.success ? 'bg-green-600/20' : verifyResult?.success === false ? 'bg-red-600/20' : 'bg-blue-600/10'}`}></div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <Server className="text-blue-400 w-6 h-6"/>
              <h3 className="text-lg font-bold">模拟后端验证</h3>
            </div>
            
            <div className="space-y-4 relative z-10">
              <p className="text-sm text-slate-400">输入上方生成的 {digits} 位口令发送给服务器进行核验。</p>
              <div className="flex gap-3 min-w-0">
                <input 
                  type="text" 
                  maxLength={digits}
                  placeholder={`输入 ${digits} 位口令`}
                  value={verifyInput}
                  onChange={(e) => setVerifyInput(e.target.value.replace(/\D/g,''))}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                  className="flex-1 min-w-0 bg-slate-950/50 border-2 border-slate-800 rounded-xl px-4 py-3 text-center font-mono text-xl font-bold tracking-[0.2em] focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-700 placeholder:tracking-normal"
                />
                <button 
                  onClick={handleVerify}
                  disabled={isLoading || verifyInput.length !== digits}
                  className={`px-6 rounded-xl font-bold transition-all flex items-center gap-2 flex-shrink-0 ${isLoading || verifyInput.length !== digits ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 active:scale-95'}`}
                >
                  {isLoading ? <RefreshCw className="animate-spin w-5 h-5"/> : '验证'}
                </button>
              </div>

              {/* 验证结果反馈区域 */}
              {verifyResult && (
                <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 ${verifyResult.success ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'} animate-in fade-in slide-in-from-top-2 duration-300`}>
                  {verifyResult.success ? <CheckCircle className="w-6 h-6 flex-shrink-0" /> : <XCircle className="w-6 h-6 flex-shrink-0" />}
                  <div>
                    <p className="font-bold">{verifyResult.success ? '验证通过' : '验证失败'}</p>
                    <p className="text-sm opacity-80">{verifyResult.message}</p>
                    {verifyResult.success && <p className="text-xs mt-2 text-slate-500">服务器根据当前设置的密钥和时间成功复现了该口令。</p>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 风险预警卡片 */}
          {failCount >= RISK_THRESHOLD && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-[2rem] p-6 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <div className="flex items-center gap-4 text-red-400">
                <ShieldAlert size={32} className="flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg">账号安全风险</h3>
                  <p className="text-xs opacity-80">检测到连续 {failCount} 次验证失败。系统怀疑正在遭受暴力破解，建议更换密钥或检查时间同步。</p>
                </div>
              </div>
              <button 
                onClick={() => {setFailCount(0); setVerifyResult(null);}}
                className="mt-4 w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 rounded-xl text-xs font-bold transition-all"
              >
                我知道风险，重置计数
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default TOTPLab;