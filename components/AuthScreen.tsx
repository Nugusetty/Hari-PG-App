
import React, { useState, useEffect } from 'react';
import { Building2, Lock, RefreshCw, CheckCircle, Info } from 'lucide-react';
import { Button } from './Button';

interface AuthScreenProps {
  onLogin: (mobile: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobile.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(mockOtp);
      setStep('otp');
      setIsLoading(false);
      setTimer(60);
    }, 800);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    // Support actual generated OTP or bypass code for dev
    if (otp === generatedOtp || otp === '123456') {
      setIsLoading(true);
      setTimeout(() => {
        onLogin(mobile);
      }, 500);
    } else {
      alert("Invalid code. Please enter the 6-digit number shown.");
    }
  };

  return (
    <div className="min-h-screen bg-blue-700 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
        <div className="bg-white p-6 text-center border-b border-gray-100">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-blue-100">
            <Building2 size={40} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">HARI PG MANAGER</h1>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Admin Portal</p>
        </div>

        <div className="p-6">
          {step === 'mobile' ? (
            <form onSubmit={handleRequestOtp} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Mobile Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 font-bold">+91</div>
                  <input 
                    required
                    type="tel" 
                    maxLength={10}
                    placeholder="Enter 10 Digits"
                    className="w-full pl-14 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-xl font-bold"
                    value={mobile}
                    onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>

              <Button 
                type="submit"
                className="w-full py-4 bg-blue-600 rounded-xl text-lg font-bold shadow-lg"
                disabled={isLoading || mobile.length < 10}
              >
                {isLoading ? <RefreshCw size={24} className="animate-spin" /> : 'CONTINUE'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="bg-yellow-50 border-2 border-dashed border-yellow-400 p-4 rounded-xl text-center">
                <p className="text-xs font-bold text-yellow-700 uppercase mb-1">Access Code:</p>
                <div className="text-4xl font-black text-gray-900 tracking-widest">{generatedOtp}</div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Verification Code</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock size={20} className="text-gray-400" /></div>
                  <input 
                    required
                    autoFocus
                    type="tel" 
                    maxLength={6}
                    placeholder="000000"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-2xl text-center font-black tracking-widest"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-3">
                <Button 
                  type="submit"
                  className="w-full py-4 bg-green-600 rounded-xl text-lg font-bold shadow-lg flex items-center justify-center space-x-2"
                  disabled={isLoading || otp.length < 6}
                >
                  {isLoading ? <RefreshCw size={24} className="animate-spin" /> : (
                    <>
                      <CheckCircle size={20} />
                      <span>VERIFY AND START</span>
                    </>
                  )}
                </Button>
                <button 
                  type="button" 
                  onClick={() => setStep('mobile')}
                  className="text-sm font-bold text-blue-600 py-2"
                >
                  Change Number
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      <div className="mt-8 flex items-center text-blue-200 text-xs font-medium bg-blue-800/50 px-4 py-2 rounded-full">
        <Info size={14} className="mr-2" />
        Authorized access only for PG Administrators
      </div>
    </div>
  );
};
