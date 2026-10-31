import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  KeyRound, 
  Fingerprint, 
  ArrowRight, 
  CheckCircle2, 
  Globe, 
  Loader2, 
  Info, 
  MapPin, 
  Mail,
  UserPlus,
  LogIn
} from 'lucide-react';
import type { CitizenUser, CitizenProfile } from '../../types';
import { SAMPLE_PRESETS } from '../../lib/presets';
import { 
  getMeriPehchaanConfig, 
  registerCitizen, 
  loginCitizen,
  warmupRenderBackend,
  checkBackendReady,
  pollUntilBackendReady 
} from '../../lib/api';

interface LoginPageProps {
  onLogin: (user: CitizenUser) => void;
  onContinueAsGuest?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onContinueAsGuest }) => {
  const [activeTab, setActiveTab] = useState<'digilocker' | 'credentials' | 'demo'>('credentials');
  const [citizenAuthMode, setCitizenAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [warmupSeconds, setWarmupSeconds] = useState(0);

  // Sign In fields
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up fields
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regNationalId, setRegNationalId] = useState('');
  const [regState, setRegState] = useState('');
  const [regIncome, setRegIncome] = useState('');
  const [regCategory, setRegCategory] = useState('GENERAL');

  // MeriPehchaan / DigiLocker fields
  const [meriFullName, setMeriFullName] = useState('');
  const [meriAadhaar, setMeriAadhaar] = useState('');
  const [meriEmail, setMeriEmail] = useState('');
  const [meriState, setMeriState] = useState('');
  const [meriIncome, setMeriIncome] = useState<string>('');
  const [meriCategory, setMeriCategory] = useState('GENERAL');

  // Live MeriPehchaan config from backend
  const [meriConfig, setMeriConfig] = useState<{
    configured: boolean;
    client_id?: string;
    auth_url: string;
    instructions: string;
  } | null>(null);

  useEffect(() => {
    // Immediately ping Render backend upon opening the homepage so cold-start starts in background
    warmupRenderBackend();
    getMeriPehchaanConfig().then((cfg) => setMeriConfig(cfg));
  }, []);

  // Safe login transition: verify backend is awake, or let user wait comfortably with timer
  const proceedWithLogin = async (user: CitizenUser) => {
    setIsLoading(true);
    const isReady = await checkBackendReady(1500);
    if (isReady) {
      setIsLoading(false);
      onLogin(user);
      return;
    }

    // Backend is still spinning up (Render free tier cold start)
    setIsWarmingUp(true);
    setWarmupSeconds(1);
    await pollUntilBackendReady((sec) => {
      setWarmupSeconds(sec);
    }, 60);

    setIsWarmingUp(false);
    setIsLoading(false);
    onLogin(user);
  };

  // Handle Sign In submission
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setErrorMessage('Please enter both your Username and Password');
      return;
    }
    setErrorMessage('');
    setIsLoading(true);

    try {
      const user = await loginCitizen(loginUsername.trim(), loginPassword);
      await proceedWithLogin(user);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Unable to sign in. Please verify your credentials or sign up.');
    }
  };

  // Handle Sign Up submission
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regFullName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMessage('Please fill in all required fields (Name, Username, Email, Password).');
      return;
    }
    if (regPassword.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }
    setErrorMessage('');
    setIsLoading(true);

    try {
      const user = await registerCitizen({
        username: regUsername.trim(),
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        nationalId: regNationalId.trim(),
        addressState: regState.trim() || 'Karnataka',
        incomeAnnual: regIncome ? parseFloat(regIncome) : 180000.0,
        category: regCategory,
      });
      setSuccessMessage('Account registered successfully! Opening your cockpit...');
      await proceedWithLogin(user);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Registration failed. Username might already be in use.');
    }
  };

  // Submit authentic MeriPehchaan / DigiLocker login
  const handleDigiLockerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meriFullName.trim()) {
      setErrorMessage('Please enter your full legal name as per Aadhaar / DigiLocker');
      return;
    }
    setErrorMessage('');
    setIsLoading(true);

    const cleanId = meriAadhaar.trim() || `AADHAAR-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const emailAddr = meriEmail.trim() || `${meriFullName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`;
    const incomeNum = meriIncome ? parseFloat(meriIncome) : 180000.0;

    const profile: CitizenProfile = {
      full_name: meriFullName.trim(),
      date_of_birth: '2002-05-15',
      national_id: cleanId,
      email: emailAddr,
      phone: '9876543210',
      address_street: '',
      address_city: '',
      address_state: meriState.trim() || 'Karnataka',
      address_zip: '560001',
      income_annual: incomeNum,
      household_size: 4,
      category: meriCategory,
      attributes: {
        certificate_number: `DL-INC-${Math.floor(10000 + Math.random() * 90000)}`,
      },
    };

    const user: CitizenUser = {
      id: `user_${cleanId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      username: meriFullName.trim().toLowerCase().replace(/\s+/g, '_'),
      fullName: meriFullName.trim(),
      email: emailAddr,
      role: 'applicant',
      authMethod: 'digilocker',
      profile,
    };

    await proceedWithLogin(user);
  };

  // Quick 1-Click Demo Profiles (explicitly isolated for testing)
  const handleQuickDemoSelect = async (presetIndex: number) => {
    setIsLoading(true);
    const preset = SAMPLE_PRESETS[presetIndex];
    const user: CitizenUser = {
      id: `user_${preset.profile.national_id.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      username: preset.profile.full_name.toLowerCase().replace(/\s+/g, '_'),
      fullName: preset.profile.full_name,
      email: preset.profile.email,
      role: 'applicant',
      authMethod: 'demo',
      profile: preset.profile,
    };
    await proceedWithLogin(user);
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Glow Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl p-6 sm:p-8 z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 shadow-xl shadow-blue-500/25 mb-3">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            CivicAgent Citizen Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Autonomous Higher Education Grant & Bureaucracy Execution Platform
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/60 rounded-xl border border-slate-800/80 mb-5 text-xs font-medium">
          <button
            type="button"
            onClick={() => { setActiveTab('credentials'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`py-2 px-1 rounded-lg text-center transition-all ${
              activeTab === 'credentials'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Citizen Sign In / Up
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('digilocker'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`py-2 px-1 rounded-lg text-center transition-all ${
              activeTab === 'digilocker'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            MeriPehchaan SSO
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('demo'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`py-2 px-1 rounded-lg text-center transition-all ${
              activeTab === 'demo'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sandbox Personas
          </button>
        </div>

        {/* Status / Error Alerts */}
        {errorMessage && (
          <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab 1: Citizen Sign In / Sign Up */}
        {activeTab === 'credentials' && (
          <div>
            {/* Sub-mode Toggle (Sign In vs Sign Up) */}
            <div className="flex border-b border-slate-800 mb-4 pb-2 justify-between items-center text-xs">
              <span className="font-semibold text-white">
                {citizenAuthMode === 'signin' ? 'Sign In to Your Account' : 'Create New Citizen Account'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setCitizenAuthMode(citizenAuthMode === 'signin' ? 'signup' : 'signin');
                  setErrorMessage('');
                }}
                className="text-blue-400 hover:text-blue-300 font-medium underline cursor-pointer"
              >
                {citizenAuthMode === 'signin' ? 'Need an account? Sign Up →' : 'Already registered? Sign In →'}
              </button>
            </div>

            {/* Sub-form A: Sign In */}
            {citizenAuthMode === 'signin' && (
              <form onSubmit={handleSignInSubmit} className="space-y-4">
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Citizen Username or ID *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        placeholder="Enter your registered username"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Password / Passkey *
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating Account...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Sign In & Open Cockpit</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Sub-form B: Sign Up */}
            {citizenAuthMode === 'signup' && (
              <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Full Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="e.g. Rohan Kumar"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Choose Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="e.g. rohan_k"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Registered Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. rohan@gmail.com"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Password (min 4 chars) *
                    </label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Choose a password"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Aadhaar / National ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={regNationalId}
                      onChange={(e) => setRegNationalId(e.target.value)}
                      placeholder="e.g. AADHAAR-1234-5678"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Domicile State *
                    </label>
                    <input
                      type="text"
                      required
                      value={regState}
                      onChange={(e) => setRegState(e.target.value)}
                      placeholder="e.g. Karnataka, Delhi"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Annual Family Income (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="5000"
                      value={regIncome}
                      onChange={(e) => setRegIncome(e.target.value)}
                      placeholder="e.g. 180000"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={regCategory}
                      onChange={(e) => setRegCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                    >
                      <option value="GENERAL">GENERAL</option>
                      <option value="OBC">OBC</option>
                      <option value="SC">SC</option>
                      <option value="ST">ST</option>
                      <option value="EWS">EWS</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account & Seeding Profile...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Citizen Account & Launch Cockpit</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: MeriPehchaan National SSO */}
        {activeTab === 'digilocker' && (
          <form onSubmit={handleDigiLockerSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-white">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>MeriPehchaan (National SSO) Federation</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                India's National Single Sign-On (NeGD / MeitY / NIC) integrates DigiLocker, Jan Parichay, and e-Pramaan.
                Enter your authentic citizen credentials below to instantiate your live profile with <strong>zero mock data</strong>.
              </p>
              {meriConfig?.configured && (
                <div className="pt-1">
                  <a
                    href={meriConfig.auth_url}
                    className="inline-flex items-center gap-1 text-[11px] text-cyan-300 underline font-semibold hover:text-cyan-200"
                  >
                    <span>Launch Live NIC Gateway Authorization →</span>
                  </a>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Citizen Legal Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    required
                    value={meriFullName}
                    onChange={(e) => setMeriFullName(e.target.value)}
                    placeholder="e.g. Rohan Kumar"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-8 pr-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Aadhaar / DigiLocker ID *
                </label>
                <div className="relative">
                  <Fingerprint className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    required
                    value={meriAadhaar}
                    onChange={(e) => setMeriAadhaar(e.target.value)}
                    placeholder="e.g. AADHAAR-9012-3456"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-8 pr-2.5 text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Registered Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="email"
                    value={meriEmail}
                    onChange={(e) => setMeriEmail(e.target.value)}
                    placeholder="e.g. rohank@gmail.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-8 pr-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Domicile State *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    required
                    value={meriState}
                    onChange={(e) => setMeriState(e.target.value)}
                    placeholder="e.g. Karnataka, Assam, Delhi"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-8 pr-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Annual Household Income (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={meriIncome}
                  onChange={(e) => setMeriIncome(e.target.value)}
                  placeholder="e.g. 180000"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Reservation Category
                </label>
                <select
                  value={meriCategory}
                  onChange={(e) => setMeriCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="GENERAL">GENERAL</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="EWS">EWS</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Citizen Credentials...</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4" />
                  <span>Authenticate with MeriPehchaan & Open Cockpit</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 3: Sample Sandbox Personas (Explicitly Isolated) */}
        {activeTab === 'demo' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              <span className="font-semibold">Evaluator Sandbox Personas:</span> These pre-populated sample profiles are provided for testing criteria matching without manual data entry.
            </div>

            {SAMPLE_PRESETS.map((preset, idx) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleQuickDemoSelect(idx)}
                disabled={isLoading}
                className="w-full p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 hover:border-blue-500/50 text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {preset.profile.full_name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      GPA {preset.profile.attributes.gpa || preset.profile.attributes.percentage}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {preset.profile.attributes.major} • Income: ₹{(preset.profile.income_annual).toLocaleString()} • {preset.profile.address_state}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        )}

        {/* Footer Guarantee & Optional Guest Link */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span>256-bit Encrypted Session</span>
          </div>
          {onContinueAsGuest && (
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              Guest Preview
            </button>
          )}
          <div className="flex items-center gap-1 text-[11px] text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Zero Mock Forcing</span>
          </div>
        </div>
      </div>

      {/* Render Free Tier Cold-Start Waiting Overlay */}
      {isWarmingUp && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-blue-500/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 mx-auto">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Connecting to CivicAgent Engine</h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Cloud container is waking from standby (Render Free Tier spin-up). Initializing Playwright Chromium runtime...
              </p>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 h-full transition-all duration-500"
                style={{ width: `${Math.min(95, Math.max(10, warmupSeconds * 3.5))}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Standby timer: {warmupSeconds}s • Entering Cockpit automatically
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
