import { SignUp } from '@clerk/nextjs';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Dynamic Ambient Background */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* RouteX Branding */}
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center font-extrabold text-white text-3xl shadow-lg shadow-blue-500/30">
            R
          </div>
          <h1 className="mt-4 text-3xl font-black text-white tracking-tight">RouteX</h1>
          <p className="mt-1 text-sm text-slate-400 font-semibold">
            Create your business account
          </p>
        </div>

        {/* Clerk Sign Up Component */}
        <SignUp
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-2xl rounded-2xl',
              headerTitle: 'text-white font-black',
              headerSubtitle: 'text-slate-400',
              socialButtonsBlockButton: 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700 transition-all',
              dividerLine: 'bg-slate-700',
              dividerText: 'text-slate-500',
              formFieldLabel: 'text-slate-300 font-semibold',
              formFieldInput: 'bg-slate-950 border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl',
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all',
              footerActionText: 'text-slate-400',
              footerActionLink: 'text-blue-400 hover:text-blue-300 font-semibold',
            },
            variables: {
              colorPrimary: '#2563eb',
              colorBackground: 'transparent',
              borderRadius: '0.75rem',
            },
          }}
          routing="path"
          path="/register"
          fallbackRedirectUrl="/"
        />
      </div>
    </div>
  );
}
