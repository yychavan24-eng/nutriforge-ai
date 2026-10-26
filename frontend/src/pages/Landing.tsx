import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, BarChart, User, Sparkles, Scale } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#f6f4ee] text-[#171d18] font-sans">

      {/* Editorial Header */}
      <header className="bg-[#fcfbf9] border-b border-[#eae4d5] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <Link to="/">
            <BrandLogo variant="light" size="md" />
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              to="/app"
              className="text-xs sm:text-sm font-semibold text-[#38453b] hover:text-[#122b1c] transition-colors"
            >
              Overview
            </Link>
            <Link
              to="/app"
              className="bg-[#183c27] hover:bg-[#122b1c] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-health transition-all"
            >
              Launch App
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <div className="relative isolate px-6 pt-12 pb-20 lg:px-8 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e6ede7] border border-[#cfded1] text-[#183c27] text-xs font-semibold mb-6 shadow-xs">
            <Sparkles size={13} className="text-[#183c27]" />
            <span>Packaged-Food Intelligence for Gym-Goers & Fitness</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#122b1c] max-w-4xl mx-auto leading-[1.15]">
            The label tells you <span className="underline decoration-[#8ea891] decoration-wavy decoration-2">what</span> is in the food. <br className="hidden sm:inline" />
            NutriForge reveals <span className="text-[#183c27]">what it means for you</span>.
          </h1>

          <p className="mt-6 text-base sm:text-lg leading-relaxed text-[#4f5f53] max-w-2xl mx-auto font-normal">
            Turn dense nutrition fact labels, deceptive marketing claims, and hidden ingredients into personalized, comparable, and evidence-grounded fitness decisions.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              to="/app/scan"
              className="w-full sm:w-auto rounded-xl bg-[#183c27] px-6 py-3.5 text-sm font-bold text-white shadow-health-md hover:bg-[#122b1c] transition-all flex items-center justify-center gap-2"
            >
              <span>Scan Food Label</span>
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/app"
              className="w-full sm:w-auto rounded-xl bg-[#fcfbf9] px-6 py-3.5 text-sm font-semibold text-[#262f28] border border-[#ded5c2] shadow-health hover:bg-[#eae4d5]/40 transition-all flex items-center justify-center gap-2"
            >
              <span>Explore Dashboard</span>
            </Link>
          </div>

          <p className="mt-5 text-xs text-[#68796d] max-w-md mx-auto">
            NutriForge AI is an evidence-conscious packaged-food literacy and decision-support tool. It is not a clinical diagnostic system.
          </p>
        </div>

        {/* Workflow Grid Section */}
        <div className="bg-[#fcfbf9] py-16 sm:py-20 border-y border-[#eae4d5]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center mb-14">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#183c27] bg-[#e6ede7] px-2.5 py-0.5 rounded-full border border-[#cfded1]">
                System Architecture
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-[#122b1c] tracking-tight">
                The NutriForge Intelligence Workflow
              </h2>
              <p className="text-sm text-[#4f5f53] mt-2">
                Four deterministic engines working together with human-in-the-loop verification.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

              <div className="bg-[#f6f4ee] p-6 rounded-2xl border border-[#eae4d5] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#e6ede7] text-[#183c27] flex items-center justify-center mb-4 border border-[#cfded1]">
                    <User size={22} />
                  </div>
                  <h3 className="text-base font-bold text-[#122b1c] mb-1.5">Profile & Goal Grounding</h3>
                  <p className="text-xs text-[#4f5f53] leading-relaxed">
                    Set your voluntary fitness goals, calorie limits, protein targets, and declared food restrictions.
                  </p>
                </div>
              </div>

              <div className="bg-[#f6f4ee] p-6 rounded-2xl border border-[#eae4d5] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#e6ede7] text-[#183c27] flex items-center justify-center mb-4 border border-[#cfded1]">
                    <BarChart size={22} />
                  </div>
                  <h3 className="text-base font-bold text-[#122b1c] mb-1.5">Label Extraction & Review</h3>
                  <p className="text-xs text-[#4f5f53] leading-relaxed">
                    Ingest packaging photos via Vision OCR, verify parsed metrics, and tag exact data provenance (LBL vs MAN).
                  </p>
                </div>
              </div>

              <div className="bg-[#f6f4ee] p-6 rounded-2xl border border-[#eae4d5] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#e6ede7] text-[#183c27] flex items-center justify-center mb-4 border border-[#cfded1]">
                    <ShieldCheck size={22} />
                  </div>
                  <h3 className="text-base font-bold text-[#122b1c] mb-1.5">Allergen & Restriction Shield</h3>
                  <p className="text-xs text-[#4f5f53] leading-relaxed">
                    Deterministic cross-checking detects direct matches and derivatives with clear medical disclaimer boundaries.
                  </p>
                </div>
              </div>

              <div className="bg-[#f6f4ee] p-6 rounded-2xl border border-[#eae4d5] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#e6ede7] text-[#183c27] flex items-center justify-center mb-4 border border-[#cfded1]">
                    <Scale size={22} />
                  </div>
                  <h3 className="text-base font-bold text-[#122b1c] mb-1.5">Smart Compare & Trade-Offs</h3>
                  <p className="text-xs text-[#4f5f53] leading-relaxed">
                    Transparent side-by-side matrices distinguish unprinted fields from true zeros without artificial single winners.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Editorial Footer */}
      <footer className="bg-[#122b1c] text-[#f5f8f5] py-12 border-t border-[#1a422b]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <BrandLogo variant="dark" size="sm" />
          <p className="text-xs text-[#8ea891]">
            &copy; 2026 NutriForge AI &bull; Packaged Food Intelligence Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
