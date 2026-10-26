import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Target,
  AlertCircle,
  ShieldCheck,
  User,
  AlertTriangle,
  RefreshCw,
  Scan,
  Compass,
  Sparkles,
  Info
} from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';
import { api } from '../services/api';
import type { Product } from '../types';
import { Badge } from '../components/Badge';

export default function Dashboard() {
  const { profile, isLoading: isProfileLoading, error: profileError, reloadProfile } = useProfile();
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(() => {
    try {
      const historyStr = localStorage.getItem('nutriforge_history') || '[]';
      const parsed = JSON.parse(historyStr);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let isCurrent = true;
    const historyStr = localStorage.getItem('nutriforge_history') || '[]';
    let historyIds: string[] = [];
    try {
      historyIds = JSON.parse(historyStr);
    } catch {
      historyIds = [];
    }

    if (!Array.isArray(historyIds) || historyIds.length === 0) {
      return;
    }

    Promise.all(
      historyIds.map(id => api.getProduct(id).catch(() => null))
    )
      .then(data => {
        if (isCurrent) {
          setRecentProducts(data.filter((p): p is Product => p !== null));
        }
      })
      .catch(err => {
        if (isCurrent) {
          console.error(err);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  if (isProfileLoading && loading) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#183c27] border-t-transparent mb-4"></div>
        <p className="text-sm font-semibold text-[#171d18]">Synchronizing personal nutrition intelligence...</p>
        <p className="text-xs text-[#68796d] mt-1">Loading profile persistence and verified product history.</p>
      </div>
    );
  }

  // Determine if user has actively configured their profile beyond defaults
  const isProfileConfigured = Boolean(
    (profile.age && profile.age.trim() !== '') ||
    (profile.height && profile.height.trim() !== '') ||
    (profile.weight && profile.weight.trim() !== '') ||
    (profile.restrictions && profile.restrictions.trim() !== '') ||
    (profile.goal && profile.goal !== 'muscle_gain') ||
    (profile.dietaryPreference && profile.dietaryPreference !== 'no_preference') ||
    (profile.activityLevel && profile.activityLevel !== 'moderate') ||
    localStorage.getItem('nutriforge_profile_configured') === 'true'
  );

  // Contextual reference BMI calculation
  const heightM = parseFloat(profile.height) / 100;
  const weightKg = parseFloat(profile.weight);
  const calculatedBmi = (heightM > 0 && weightKg > 0) ? (weightKg / (heightM * heightM)).toFixed(1) : null;

  const goalDescriptions: Record<string, { label: string; detail: string }> = {
    muscle_gain: { label: "Muscle Gain", detail: "High Protein / Energy Surplus Focus" },
    fat_loss: { label: "Fat Loss", detail: "Caloric Deficit / Added Sugar Restriction" },
    maintenance: { label: "Maintenance", detail: "Balanced Nutrient & Macro Intake" },
    performance: { label: "Athletic Performance", detail: "Endurance & Recovery Fueling" }
  };

  const activityDescriptions: Record<string, string> = {
    sedentary: "Sedentary (Little or no exercise)",
    light: "Lightly Active (1-3 gym/cardio days/wk)",
    moderate: "Moderately Active (3-5 training sessions/wk)",
    very_active: "Very Active (6-7 intense sessions/wk)"
  };

  const activeGoal = goalDescriptions[profile.goal] || {
    label: profile.goal.replace('_', ' '),
    detail: "Custom Fitness Focus"
  };

  const insights = [
    recentProducts.length > 0
      ? `You have analyzed ${recentProducts.length} product(s) aligned with your ${activeGoal.label.toLowerCase()} goal.`
      : `Personalized evaluation is active for your ${activeGoal.label} goal. Scan or browse products to see real-time label alignment.`,
    profile.restrictions
      ? `Active allergen screening enabled for: ${profile.restrictions}.`
      : 'No specific food allergies or restrictions declared in your profile.'
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-7 pb-16">

      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#eae4d5]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#183c27] bg-[#e6ede7] px-2.5 py-0.5 rounded-full border border-[#cfded1]">
              Personalized Intelligence
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#122b1c] tracking-tight">
            Nutrition & Label Overview
          </h1>
          <p className="text-sm text-[#4f5f53] mt-1 max-w-xl">
            Decision support grounded in your declared fitness profile, voluntary targets, and verified food labels.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            to="/app/scan"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#183c27] hover:bg-[#122b1c] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-health transition-all"
          >
            <Scan size={16} />
            <span>Scan Label</span>
          </Link>
          <Link
            to="/app/profile"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-[#fcfbf9] hover:bg-[#eae4d5]/40 text-[#262f28] text-xs sm:text-sm font-semibold border border-[#ded5c2] rounded-xl shadow-health transition-all"
          >
            <User size={15} className="text-[#3b523e]" />
            <span>Profile</span>
          </Link>
        </div>
      </div>

      {/* Sync Notice if offline / error */}
      {profileError && (
        <div className="bg-[#fef3c7] border border-[#fde68a] rounded-xl p-3.5 flex items-center justify-between text-xs text-[#92400e] shadow-health">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-[#b45309] shrink-0" />
            <span>Using cached offline profile. Backend service notice: {profileError}</span>
          </div>
          <button
            type="button"
            onClick={() => reloadProfile()}
            className="inline-flex items-center gap-1 font-semibold text-[#78350f] hover:underline shrink-0 ml-2"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Unconfigured Profile Callout */}
      {!isProfileConfigured && (
        <div className="bg-[#f5f8f5] border border-[#b4c8b6] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-health">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-[#183c27] text-white rounded-xl shrink-0 mt-0.5">
              <Compass size={20} />
            </div>
            <div>
              <h3 className="font-bold text-[#122b1c] text-sm md:text-base">Personalize Your Fitness Focus</h3>
              <p className="text-xs md:text-sm text-[#38453b] mt-0.5 max-w-2xl leading-relaxed">
                Your dashboard is currently using default baseline targets. Configure your fitness goal, active dietary restrictions, and daily macronutrient targets to tailor product analysis to your routine.
              </p>
            </div>
          </div>
          <Link
            to="/app/profile"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#183c27] hover:bg-[#122b1c] text-white rounded-xl text-xs md:text-sm font-semibold shadow-health transition-all shrink-0 self-start md:self-auto"
          >
            <span>Configure Profile</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Main Focus & Priorities Card + Assistant */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Profile Alignment Details Card */}
        <div className="bg-[#fcfbf9] p-6 rounded-2xl border border-[#eae4d5] shadow-health col-span-1 md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#eae4d5]">
              <div className="flex items-center gap-2">
                <Target className="text-[#183c27]" size={18} />
                <h2 className="text-base font-bold text-[#122b1c]">Active Fitness Focus & Priorities</h2>
              </div>
              <Link to="/app/profile" className="text-xs font-semibold text-[#1e4a31] hover:text-[#122b1c] flex items-center gap-1 transition-colors">
                Edit Settings <ArrowRight size={12} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#68796d] block">Goal</span>
                <p className="text-base font-bold text-[#122b1c] capitalize mt-0.5">{activeGoal.label}</p>
                <p className="text-xs text-[#4f5f53] mt-0.5 leading-snug">{activeGoal.detail}</p>
              </div>

              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#68796d] block">Activity Level</span>
                <p className="text-sm font-bold text-[#171d18] capitalize mt-0.5">
                  {profile.activityLevel.replace('_', ' ')}
                </p>
                <p className="text-xs text-[#4f5f53] mt-0.5 leading-snug">
                  {activityDescriptions[profile.activityLevel] || "Self-reported training volume"}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#68796d] block">Dietary Preference</span>
                <p className="text-sm font-bold text-[#171d18] capitalize mt-0.5">
                  {profile.dietaryPreference.replace('_', ' ')}
                </p>
                <p className="text-xs text-[#4f5f53] mt-0.5 leading-snug">
                  {profile.dietaryPreference === 'no_preference' ? 'Standard packaging filter' : 'Strict diet rule applied'}
                </p>
              </div>
            </div>

            {/* Active Priorities Chips */}
            <div className="mt-4 pt-3.5 border-t border-[#eae4d5]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#68796d] block mb-2">
                Prioritized Label Nutrients
              </span>
              <div className="flex flex-wrap gap-1.5">
                {profile.priorities && profile.priorities.length > 0 ? (
                  profile.priorities.map((p: string) => (
                    <Badge key={p} variant="sage" size="sm">
                      {p.replace('_', ' ')}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-[#8b9a8f] italic">No specific priorities selected</span>
                )}
              </div>
            </div>
          </div>

          {/* Voluntary Physical Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-[#eae4d5]">
            <div className="bg-[#f6f4ee] p-2.5 rounded-xl border border-[#eae4d5]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#68796d] block">Age</span>
              <span className="text-sm font-bold text-[#171d18] mt-0.5 block">
                {profile.age && profile.age.trim() !== '' ? `${profile.age} yrs` : '—'}
              </span>
            </div>

            <div className="bg-[#f6f4ee] p-2.5 rounded-xl border border-[#eae4d5]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#68796d] block">Height</span>
              <span className="text-sm font-bold text-[#171d18] mt-0.5 block">
                {profile.height && profile.height.trim() !== '' ? `${profile.height} cm` : '—'}
              </span>
            </div>

            <div className="bg-[#f6f4ee] p-2.5 rounded-xl border border-[#eae4d5]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#68796d] block">Weight</span>
              <span className="text-sm font-bold text-[#171d18] mt-0.5 block">
                {profile.weight && profile.weight.trim() !== '' ? `${profile.weight} kg` : '—'}
              </span>
            </div>

            <div className="bg-[#f6f4ee] p-2.5 rounded-xl border border-[#eae4d5]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#68796d] block">Reference BMI</span>
              <span className="text-sm font-bold text-[#1e4a31] mt-0.5 block">
                {calculatedBmi || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Health-Tech Assistant Card */}
        <div className="bg-[#122b1c] text-[#f5f8f5] p-6 rounded-2xl border border-[#1a422b] shadow-health flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-[#183c27] rounded-lg border border-[#24593b]">
                <Sparkles className="text-[#8ea891]" size={18} />
              </div>
              <h2 className="text-base font-bold text-white">Label Intelligence Assistant</h2>
            </div>
            <p className="text-xs text-[#cfded1] leading-relaxed">
              Have questions regarding deceptive ingredient terms, protein purity, non-caloric sweeteners, or hidden sodium on packaged food labels?
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-[#1a422b]">
            <Link
              to="/app/assistant"
              className="w-full flex items-center justify-center gap-2 bg-[#183c27] hover:bg-[#24593b] text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors border border-[#31744d]/50 shadow-xs"
            >
              <span>Consult Assistant</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Active Allergen & Dietary Restriction Shield */}
      <div className="bg-[#fcfbf9] p-5 rounded-2xl border border-[#eae4d5] shadow-health flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
            profile.restrictions
              ? 'bg-[#fef3c7] text-[#92400e] border border-[#fde68a]'
              : 'bg-[#e6ede7] text-[#183c27] border border-[#cfded1]'
          }`}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-[#122b1c]">
                {profile.restrictions ? 'Active Allergen Shield' : 'Allergen & Restriction Monitor'}
              </h3>
              {profile.restrictions ? (
                <span className="text-[10px] bg-[#fef3c7] text-[#92400e] font-semibold px-2 py-0.5 rounded-full border border-[#fde68a]">
                  Active Shield
                </span>
              ) : (
                <span className="text-[10px] bg-[#f1ede3] text-[#4f5f53] px-2 py-0.5 rounded-full border border-[#eae4d5]">
                  Standard Screening
                </span>
              )}
            </div>
            {profile.restrictions ? (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-xs text-[#4f5f53]">Cross-checking every scanned food against:</span>
                {profile.restrictions.split(',').map((r, i) => (
                  <Badge key={i} variant="amber" size="sm">
                    {r.trim()}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#68796d] mt-1">
                No specific food allergies or restrictions declared. Products are checked against standard declared ingredients.
              </p>
            )}
          </div>
        </div>
        <Link
          to="/app/profile"
          className="text-xs font-semibold text-[#1e4a31] hover:text-[#122b1c] shrink-0 self-start sm:self-auto flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#eae4d5] hover:bg-[#eae4d5]/30 transition-all"
        >
          {profile.restrictions ? 'Modify Allergens' : 'Add Restrictions'} <ArrowRight size={13} />
        </Link>
      </div>

      {/* Daily Nutrition Targets Grid */}
      {profile.daily_targets && Object.keys(profile.daily_targets).length > 0 && (
        <div className="bg-[#fcfbf9] p-6 rounded-2xl border border-[#eae4d5] shadow-health">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="text-[#183c27]" size={18} />
              <h2 className="text-base font-bold text-[#122b1c]">Active Daily Nutrition Targets</h2>
            </div>
            <Link to="/app/profile" className="text-xs font-semibold text-[#1e4a31] hover:text-[#122b1c] flex items-center gap-1">
              Adjust Targets <ArrowRight size={12} />
            </Link>
          </div>
          <p className="text-xs text-[#68796d] mb-4">
            NutriForge uses these voluntary daily targets to scale per-serving nutrition facts and calculate % contributions.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">

            {/* Calories */}
            <div className="p-3 bg-[#f6f4ee] rounded-xl border border-[#eae4d5]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#68796d] block">Calories</span>
              <span className="text-base font-bold text-[#122b1c] mt-0.5 block">
                {profile.daily_targets.calories ?? '—'}
              </span>
              <span className="text-[10px] text-[#8b9a8f]">kcal / day</span>
            </div>

            {/* Protein - Highlighted Gym Metric */}
            <div className="p-3 bg-[#f5f8f5] rounded-xl border border-[#b4c8b6] shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#183c27] block">Protein</span>
              <span className="text-base font-extrabold text-[#122b1c] mt-0.5 block">
                {profile.daily_targets.protein ?? '—'}g
              </span>
              <span className="text-[10px] font-semibold text-[#3b523e]">daily target</span>
            </div>

            {/* Carbohydrates */}
            <div className="p-3 bg-[#f6f4ee] rounded-xl border border-[#eae4d5]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#68796d] block">Carbs</span>
              <span className="text-base font-bold text-[#171d18] mt-0.5 block">
                {profile.daily_targets.carbohydrates ?? '—'}g
              </span>
              <span className="text-[10px] text-[#8b9a8f]">daily target</span>
            </div>

            {/* Total Fat */}
            <div className="p-3 bg-[#f6f4ee] rounded-xl border border-[#eae4d5]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#68796d] block">Total Fat</span>
              <span className="text-base font-bold text-[#171d18] mt-0.5 block">
                {profile.daily_targets.total_fat ?? '—'}g
              </span>
              <span className="text-[10px] text-[#8b9a8f]">daily limit</span>
            </div>

            {/* Added Sugar */}
            <div className="p-3 bg-[#f6f4ee] rounded-xl border border-[#eae4d5]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#68796d] block">Added Sugar</span>
              <span className="text-base font-bold text-[#171d18] mt-0.5 block">
                {profile.daily_targets.added_sugar ?? '—'}g
              </span>
              <span className="text-[10px] text-[#8b9a8f]">max ceiling</span>
            </div>

            {/* Sodium */}
            <div className="p-3 bg-[#f6f4ee] rounded-xl border border-[#eae4d5]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#68796d] block">Sodium</span>
              <span className="text-base font-bold text-[#171d18] mt-0.5 block">
                {profile.daily_targets.sodium ?? '—'}mg
              </span>
              <span className="text-[10px] text-[#8b9a8f]">max ceiling</span>
            </div>

            {/* Fibre */}
            <div className="p-3 bg-[#f6f4ee] rounded-xl border border-[#eae4d5]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#68796d] block">Fibre</span>
              <span className="text-base font-bold text-[#171d18] mt-0.5 block">
                {profile.daily_targets.fibre ?? '—'}g
              </span>
              <span className="text-[10px] text-[#8b9a8f]">min baseline</span>
            </div>
          </div>
        </div>
      )}

      {/* Grounded Intelligence Insights */}
      <div className="bg-[#fcfbf9] p-6 rounded-2xl border border-[#eae4d5] shadow-health">
        <h2 className="text-base font-bold mb-3 flex items-center gap-2 text-[#122b1c]">
          <Info className="text-[#183c27]" size={18} /> Grounded Label Insights
        </h2>
        <div className="space-y-2.5">
          {insights.map((insight: string, i: number) => (
            <div key={i} className="flex gap-3 p-3.5 bg-[#f6f4ee] border border-[#eae4d5] rounded-xl">
              <AlertCircle className="text-[#3b523e] shrink-0 mt-0.5" size={17} />
              <p className="text-xs sm:text-sm text-[#262f28] leading-relaxed">{insight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Analyzed Products */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-base font-bold text-[#122b1c]">Recent Analyzed Products</h2>
            <p className="text-xs text-[#68796d]">Packaged foods inspected in your current session.</p>
          </div>
          {recentProducts.length > 0 && (
            <Link to="/app/products" className="text-xs sm:text-sm font-semibold text-[#1e4a31] hover:underline flex items-center gap-1">
              View Catalog <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {recentProducts.length === 0 ? (
          <div className="bg-[#fcfbf9] p-8 rounded-2xl border border-dashed border-[#ded5c2] text-center shadow-xs">
            <p className="text-sm text-[#4f5f53] font-medium mb-1">No products inspected yet.</p>
            <p className="text-xs text-[#68796d] mb-4 max-w-sm mx-auto">
              Scan a packaged food photograph or explore the verified catalog to begin analyzing label claims.
            </p>
            <div className="flex justify-center gap-3">
              <Link to="/app/scan" className="bg-[#183c27] text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-[#122b1c] shadow-xs transition-colors">
                Scan Label
              </Link>
              <Link to="/app/products" className="bg-[#f6f4ee] text-[#262f28] border border-[#ded5c2] text-xs font-semibold px-4 py-2 rounded-xl hover:bg-[#eae4d5]/50 transition-colors">
                Browse Catalog
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentProducts.map((p) => (
              <Link
                key={p.id}
                to={`/app/products/${p.id}`}
                className="bg-[#fcfbf9] p-4 rounded-xl border border-[#eae4d5] shadow-health flex items-center gap-4 hover:border-[#b4c8b6] hover:bg-[#f5f8f5] transition-all group"
              >
                <div className="w-12 h-12 bg-[#e6ede7] rounded-xl shrink-0 flex items-center justify-center text-xs font-semibold text-[#183c27] border border-[#cfded1]">
                  {p.category.slice(0, 3).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#122b1c] text-sm truncate group-hover:text-[#183c27]">
                    {p.name}
                  </h3>
                  <p className="text-xs text-[#68796d] truncate">{p.brand} &bull; {p.category}</p>
                </div>
                <div className="text-right text-xs shrink-0">
                  <span className="font-extrabold text-[#183c27] block text-sm">{p.protein}g</span>
                  <span className="text-[10px] text-[#68796d]">protein/srv</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
