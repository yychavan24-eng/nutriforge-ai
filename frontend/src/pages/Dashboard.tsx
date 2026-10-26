import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Target,
  AlertCircle,
  ShieldCheck,
  User,
  Dumbbell,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';
import { api } from '../services/api';
import type { Product } from '../types';

export default function Dashboard() {
  const { profile, isLoading: isProfileLoading, error: profileError, reloadProfile } = useProfile();
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const historyStr = localStorage.getItem('nutriforge_history') || '[]';
    let historyIds: string[] = [];
    try {
      historyIds = JSON.parse(historyStr);
    } catch {
      historyIds = [];
    }

    if (historyIds.length === 0) {
      setLoading(false);
      return;
    }

    Promise.all(
      historyIds.map(id => api.getProduct(id).catch(() => null))
    )
      .then(data => {
        setRecentProducts(data.filter((p): p is Product => p !== null));
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (isProfileLoading && loading) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center text-slate-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3"></div>
        <p className="font-medium text-slate-700">Loading personalized profile & dashboard...</p>
      </div>
    );
  }

  // Determine if user has actively configured their profile beyond system defaults
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
    muscle_gain: { label: "Muscle Gain", detail: "High Protein / Energy Surplus" },
    fat_loss: { label: "Fat Loss", detail: "Caloric Deficit / Lower Sugar" },
    maintenance: { label: "Maintenance", detail: "Balanced Intake" },
    performance: { label: "Performance", detail: "Endurance & Recovery" }
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
      : `Personalized evaluation active for ${activeGoal.label} goal. Scan or browse products to see real-time alignment.`,
    profile.restrictions
      ? `Active allergy protection enabled for: ${profile.restrictions}.`
      : 'No specific food allergies or restrictions declared in your profile.'
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Personalized Dashboard</h1>
          <p className="text-slate-600 text-sm">Your packaged-food intelligence overview & active fitness profile.</p>
        </div>
        <Link
          to="/app/profile"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl text-sm font-semibold shadow-sm transition-all self-start sm:self-auto"
        >
          <User size={16} className="text-blue-600" />
          <span>Edit Profile</span>
          <ArrowRight size={14} className="text-slate-400" />
        </Link>
      </div>

      {/* Sync Error Notice if applicable */}
      {profileError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <span>Using cached offline profile. Unable to reach backend sync service: {profileError}</span>
          </div>
          <button
            type="button"
            onClick={() => reloadProfile()}
            className="inline-flex items-center gap-1 font-semibold text-amber-800 hover:text-amber-950 underline shrink-0"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Empty / Unconfigured Profile Guidance Callout */}
      {!isProfileConfigured && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shrink-0 mt-0.5">
              <User size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base">Complete Your Personal Profile</h3>
              <p className="text-xs md:text-sm text-slate-600 mt-0.5 max-w-2xl leading-relaxed">
                Your dashboard is currently showing default fitness values. Add your voluntary physical stats, dietary restrictions, and daily macronutrient targets to tailor label analysis to your goals.
              </p>
            </div>
          </div>
          <Link
            to="/app/profile"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs md:text-sm font-semibold shadow-sm transition-all shrink-0 self-start md:self-auto"
          >
            <span>Set Up Profile</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Main Focus & Priorities Card + Assistant */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-1 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Current Focus & Priorities</h2>
            </div>
            <Link to="/app/profile" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
              Edit <ArrowRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500 font-medium">Goal</p>
              <p className="text-base font-bold text-slate-900 capitalize mt-0.5">{activeGoal.label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{activeGoal.detail}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500 font-medium">Activity Level</p>
              <p className="text-sm font-semibold text-slate-800 capitalize mt-0.5">
                {profile.activityLevel.replace('_', ' ')}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {activityDescriptions[profile.activityLevel] || "Self-reported training frequency"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500 font-medium">Dietary Preference</p>
              <p className="text-sm font-semibold text-slate-800 capitalize mt-0.5">
                {profile.dietaryPreference.replace('_', ' ')}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {profile.dietaryPreference === 'no_preference' ? 'Standard balanced diet' : 'Strict dietary filter'}
              </p>
            </div>

            <div className="sm:col-span-3 pt-2">
              <p className="text-xs text-slate-500 font-medium mb-1.5">Active Nutritional Priorities</p>
              <div className="flex flex-wrap gap-2">
                {profile.priorities && profile.priorities.length > 0 ? (
                  profile.priorities.map((p: string) => (
                    <span key={p} className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full font-medium capitalize">
                      {p.replace('_', ' ')}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">No specific priorities selected</span>
                )}
              </div>
            </div>
          </div>

          {/* Voluntary Physical Stats Section */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Age</span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block">
                {profile.age && profile.age.trim() !== '' ? `${profile.age} yrs` : '—'}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Height</span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block">
                {profile.height && profile.height.trim() !== '' ? `${profile.height} cm` : '—'}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Weight</span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block">
                {profile.weight && profile.weight.trim() !== '' ? `${profile.weight} kg` : '—'}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Reference BMI</span>
              <span className="text-base font-bold text-blue-600 mt-0.5 block">
                {calculatedBmi || '—'}
              </span>
            </div>
          </div>
          {calculatedBmi && (
            <p className="text-[11px] text-slate-400 mt-2 italic">
              * Voluntary body measurements are strictly for personal context. NutriForge does not infer clinical diagnosis.
            </p>
          )}
        </div>

        {/* Assistant Box */}
        <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell className="text-blue-200" size={22} />
              <h2 className="text-lg font-bold">NutriForge Assistant</h2>
            </div>
            <p className="text-blue-100 text-sm leading-relaxed">
              Have a question about food label ingredients, protein quality, or deceptive health claims?
            </p>
          </div>
          <Link to="/app/assistant" className="mt-4 bg-white text-blue-600 font-semibold py-2.5 px-4 rounded-xl text-center hover:bg-blue-50 transition-colors shadow-sm text-sm">
            Ask AI Assistant &rarr;
          </Link>
        </div>
      </div>

      {/* Active Allergen & Dietary Restriction Shield */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${profile.restrictions ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {profile.restrictions ? 'Active Allergen Shield' : 'Allergen & Restriction Status'}
              </h3>
              {profile.restrictions ? (
                <span className="text-[11px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                  Protected
                </span>
              ) : (
                <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  Standard Checks
                </span>
              )}
            </div>
            {profile.restrictions ? (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="text-xs text-slate-500">Screening all products against:</span>
                {profile.restrictions.split(',').map((r, i) => (
                  <span key={i} className="text-xs bg-amber-50 text-amber-900 border border-amber-200 font-semibold px-2.5 py-0.5 rounded-full">
                    {r.trim()}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-1">
                No specific food allergies or restrictions declared. Every product is checked against standard packaging facts.
              </p>
            )}
          </div>
        </div>
        <Link
          to="/app/profile"
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 shrink-0 self-start sm:self-auto flex items-center gap-1"
        >
          {profile.restrictions ? 'Edit Restrictions' : 'Add Restrictions'} <ArrowRight size={13} />
        </Link>
      </div>

      {/* Daily Nutrition Targets Grid */}
      {profile.daily_targets && Object.keys(profile.daily_targets).length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="text-blue-600" size={20} />
              <h2 className="text-lg font-bold text-slate-900">Active Daily Nutrition Targets</h2>
            </div>
            <Link to="/app/profile" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
              Adjust Targets <ArrowRight size={12} />
            </Link>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            NutriForge serving scaling and product comparisons measure percentage contributions against these daily targets.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 block">Calories</span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block">
                {profile.daily_targets.calories ?? '—'}
              </span>
              <span className="text-[10px] text-slate-400">kcal/day</span>
            </div>

            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              <span className="text-[11px] text-blue-700 font-semibold block">Protein</span>
              <span className="text-base font-bold text-blue-900 mt-0.5 block">
                {profile.daily_targets.protein ?? '—'}g
              </span>
              <span className="text-[10px] text-blue-600">daily goal</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 block">Carbohydrates</span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block">
                {profile.daily_targets.carbohydrates ?? '—'}g
              </span>
              <span className="text-[10px] text-slate-400">daily goal</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 block">Total Fat</span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block">
                {profile.daily_targets.total_fat ?? '—'}g
              </span>
              <span className="text-[10px] text-slate-400">daily limit</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 block">Added Sugar</span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block">
                {profile.daily_targets.added_sugar ?? '—'}g
              </span>
              <span className="text-[10px] text-slate-400">max limit</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 block">Sodium</span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block">
                {profile.daily_targets.sodium ?? '—'}mg
              </span>
              <span className="text-[10px] text-slate-400">max limit</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 block">Fibre</span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block">
                {profile.daily_targets.fibre ?? '—'}g
              </span>
              <span className="text-[10px] text-slate-400">min goal</span>
            </div>
          </div>
        </div>
      )}

      {/* Grounded Intelligence Insights */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-slate-900">
          <Activity className="text-blue-600" size={20} /> Grounded Intelligence Insights
        </h2>
        <div className="space-y-2.5">
          {insights.map((insight: string, i: number) => (
            <div key={i} className="flex gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
              <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-slate-700 leading-relaxed">{insight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Analyzed Products */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-900">Recent Analyzed Products</h2>
          {recentProducts.length > 0 && (
            <Link to="/app/products" className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1">
              View All <ArrowRight size={16} />
            </Link>
          )}
        </div>

        {recentProducts.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center">
            <p className="text-slate-500 font-medium mb-3">No products analyzed yet.</p>
            <Link to="/app/products" className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-500">
              Browse Catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentProducts.map((p) => (
              <Link
                key={p.id}
                to={`/app/products/${p.id}`}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-300 hover:shadow transition-all"
              >
                <div className="w-12 h-12 bg-slate-100 rounded-lg shrink-0 flex items-center justify-center text-xs text-slate-400">
                  {p.image}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 text-sm">{p.name}</h3>
                  <p className="text-xs text-slate-500">{p.brand} &bull; {p.category}</p>
                </div>
                <div className="text-right text-xs">
                  <span className="font-bold text-blue-700 block">{p.protein}g</span>
                  <span className="text-slate-400">protein</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
