import { Link } from 'react-router-dom';
import { Activity, ArrowRight, ShieldCheck, Zap, BarChart } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="text-blue-600" size={24} />
            <span className="font-bold text-xl tracking-tight text-slate-900">NutriForge AI</span>
          </div>
          <nav>
            <Link to="/app" className="text-sm font-medium text-slate-600 hover:text-slate-900 mr-6">
              Go to App
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <div className="relative isolate px-6 pt-14 lg:px-8">
          <div className="mx-auto max-w-2xl py-20 sm:py-24 lg:py-32 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
              Understand what your food means for you.
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              Turn packaged-food labels into personalized, comparable, and evidence-aware decisions. The label tells you WHAT is in the food. NutriForge helps you understand WHAT it means for you.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                to="/app/scan"
                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Analyze a Product
              </Link>
              <Link to="/app" className="text-sm font-semibold leading-6 text-slate-900 flex items-center gap-1">
                See How It Works <ArrowRight size={16} />
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Note: NutriForge is a decision-support platform, not a medical diagnostic system.
            </p>
          </div>
        </div>

        {/* Workflow Section */}
        <div className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-base font-semibold leading-7 text-blue-600">Workflow</h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                The NutriForge Process
              </p>
            </div>
            <div className="mx-auto mt-12 max-w-2xl sm:mt-16 lg:mt-20 lg:max-w-none">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-4">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <UserIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <dt className="text-base font-semibold leading-7 text-slate-900">Profile & Scan</dt>
                  <dd className="mt-1 text-sm leading-6 text-slate-600">Define your goals and scan a product.</dd>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <BarChart className="h-6 w-6 text-blue-600" />
                  </div>
                  <dt className="text-base font-semibold leading-7 text-slate-900">Analyze & Check</dt>
                  <dd className="mt-1 text-sm leading-6 text-slate-600">Deep dive into ingredients and nutrition.</dd>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <ShieldCheck className="h-6 w-6 text-blue-600" />
                  </div>
                  <dt className="text-base font-semibold leading-7 text-slate-900">Compare & Personalize</dt>
                  <dd className="mt-1 text-sm leading-6 text-slate-600">See how it aligns with your specific needs.</dd>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <Zap className="h-6 w-6 text-blue-600" />
                  </div>
                  <dt className="text-base font-semibold leading-7 text-slate-900">Explain & Decide</dt>
                  <dd className="mt-1 text-sm leading-6 text-slate-600">Get AI-driven insights to make informed choices.</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function UserIcon(props: any) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}
