import { useState, useEffect } from 'react';
import { Save, CheckCircle2, Target, Heart, Shield, Activity, Sparkles } from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';
import type { ProfileData } from '../types';

export default function Profile() {
  const { profile, setProfile } = useProfile();
  const [formData, setFormData] = useState<ProfileData>(profile);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await setProfile(formData);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  };

  const priorityOptions = [
    { id: 'protein', label: 'High Protein' },
    { id: 'calories', label: 'Caloric Control' },
    { id: 'sugar', label: 'Total Sugar' },
    { id: 'added_sugar', label: 'No Added Sugar' },
    { id: 'sodium', label: 'Low Sodium' },
    { id: 'fat', label: 'Total Fat' },
    { id: 'saturated_fat', label: 'Low Saturated Fat' },
    { id: 'fibre', label: 'High Dietary Fibre' },
    { id: 'ingredients', label: 'Clean Ingredients' },
    { id: 'allergens', label: 'Allergen Avoidance' },
  ];

  const handlePriorityToggle = (id: string) => {
    setFormData(prev => ({
      ...prev,
      priorities: prev.priorities.includes(id)
        ? prev.priorities.filter(p => p !== id)
        : [...prev.priorities, id]
    }));
  };

  const handleTargetChange = (key: string, value: string) => {
    const num = value === '' ? undefined : parseFloat(value);
    setFormData(prev => ({
      ...prev,
      daily_targets: {
        ...(prev.daily_targets || {}),
        [key]: num
      }
    }));
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6">

      {/* Header */}
      <div className="pb-2 border-b border-[#eae4d5]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] font-bold tracking-wider uppercase text-[#183c27] bg-[#e6ede7] px-2.5 py-0.5 rounded-full border border-[#cfded1]">
            User Settings
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#122b1c] tracking-tight">
          Fitness & Nutrition Profile
        </h1>
        <p className="text-sm text-[#4f5f53] mt-1 max-w-2xl">
          Personalize NutriForge label intelligence to your fitness goals, dietary restrictions, and daily macronutrient targets.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Section 1: Voluntary Physical Stats */}
        <div className="bg-[#fcfbf9] p-6 md:p-8 rounded-2xl border border-[#eae4d5] shadow-health">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#eae4d5]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#f6f4ee] rounded-lg text-[#183c27] border border-[#eae4d5]">
                <Activity size={18} />
              </div>
              <h2 className="text-base font-bold text-[#122b1c]">Voluntary Body Metrics</h2>
            </div>
            <span className="text-xs text-[#68796d] font-medium bg-[#f6f4ee] px-2.5 py-1 rounded-full border border-[#eae4d5]">
              Optional Context
            </span>
          </div>

          <p className="text-xs text-[#68796d] mb-5 leading-relaxed">
            Physical metrics are strictly voluntary and used for contextual reference. NutriForge does not perform clinical diagnosis or infer medical conditions from self-reported measurements.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#38453b] mb-1.5">
                Age (years)
              </label>
              <input
                type="number"
                min="10"
                max="120"
                className="w-full rounded-xl border border-[#ded5c2] bg-white px-3.5 py-2.5 text-sm text-[#171d18] placeholder-[#8b9a8f] focus:outline-none focus:ring-2 focus:ring-[#24593b] focus:border-[#24593b] transition-all"
                placeholder="e.g. 26"
                value={formData.age}
                onChange={e => setFormData({...formData, age: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#38453b] mb-1.5">
                Height (cm)
              </label>
              <input
                type="number"
                min="50"
                max="260"
                className="w-full rounded-xl border border-[#ded5c2] bg-white px-3.5 py-2.5 text-sm text-[#171d18] placeholder-[#8b9a8f] focus:outline-none focus:ring-2 focus:ring-[#24593b] focus:border-[#24593b] transition-all"
                placeholder="e.g. 178"
                value={formData.height}
                onChange={e => setFormData({...formData, height: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#38453b] mb-1.5">
                Weight (kg)
              </label>
              <input
                type="number"
                step="any"
                min="20"
                max="300"
                className="w-full rounded-xl border border-[#ded5c2] bg-white px-3.5 py-2.5 text-sm text-[#171d18] placeholder-[#8b9a8f] focus:outline-none focus:ring-2 focus:ring-[#24593b] focus:border-[#24593b] transition-all"
                placeholder="e.g. 74"
                value={formData.weight}
                onChange={e => setFormData({...formData, weight: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Goals & Preferences */}
        <div className="bg-[#fcfbf9] p-6 md:p-8 rounded-2xl border border-[#eae4d5] shadow-health">
          <div className="flex items-center gap-2 pb-3 mb-5 border-b border-[#eae4d5]">
            <div className="p-1.5 bg-[#f6f4ee] rounded-lg text-[#183c27] border border-[#eae4d5]">
              <Target size={18} />
            </div>
            <h2 className="text-base font-bold text-[#122b1c]">Fitness Goals & Dietary Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#38453b] mb-1.5">
                Fitness & Nutrition Goal
              </label>
              <select
                className="w-full rounded-xl border border-[#ded5c2] bg-white px-3.5 py-2.5 text-sm text-[#171d18] focus:outline-none focus:ring-2 focus:ring-[#24593b] focus:border-[#24593b] transition-all font-medium"
                value={formData.goal}
                onChange={e => setFormData({...formData, goal: e.target.value})}
              >
                <option value="muscle_gain">Muscle Gain (High Protein / Energy Surplus)</option>
                <option value="fat_loss">Fat Loss (Caloric Deficit / Lower Sugar)</option>
                <option value="maintenance">Maintenance (Balanced Intake)</option>
                <option value="performance">Athletic Performance & Endurance</option>
              </select>
              <span className="text-[11px] text-[#68796d] mt-1.5 block">
                Directs product alignment scores in Smart Compare and label reviews.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#38453b] mb-1.5">
                Activity Level
              </label>
              <select
                className="w-full rounded-xl border border-[#ded5c2] bg-white px-3.5 py-2.5 text-sm text-[#171d18] focus:outline-none focus:ring-2 focus:ring-[#24593b] focus:border-[#24593b] transition-all font-medium"
                value={formData.activityLevel}
                onChange={e => setFormData({...formData, activityLevel: e.target.value})}
              >
                <option value="sedentary">Sedentary (Little or no exercise)</option>
                <option value="light">Lightly Active (1-3 gym/cardio days/week)</option>
                <option value="moderate">Moderately Active (3-5 training sessions/week)</option>
                <option value="very_active">Very Active (6-7 intense training sessions/week)</option>
              </select>
              <span className="text-[11px] text-[#68796d] mt-1.5 block">
                Reflects training frequency and general expenditure rate.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#38453b] mb-1.5">
                Dietary Preference
              </label>
              <select
                className="w-full rounded-xl border border-[#ded5c2] bg-white px-3.5 py-2.5 text-sm text-[#171d18] focus:outline-none focus:ring-2 focus:ring-[#24593b] focus:border-[#24593b] transition-all font-medium"
                value={formData.dietaryPreference}
                onChange={e => setFormData({...formData, dietaryPreference: e.target.value})}
              >
                <option value="no_preference">No Strict Preference (Standard)</option>
                <option value="vegetarian">Vegetarian (No meat, fish, or gelatin)</option>
                <option value="vegan">Vegan (Strictly plant-based / zero dairy)</option>
              </select>
              <span className="text-[11px] text-[#68796d] mt-1.5 block">
                Flags animal derivatives and dairy cross-contaminants.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#38453b] mb-1.5">
                Declared Food Restrictions & Allergens
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-[#ded5c2] bg-white px-3.5 py-2.5 text-sm text-[#171d18] placeholder-[#8b9a8f] focus:outline-none focus:ring-2 focus:ring-[#24593b] focus:border-[#24593b] transition-all"
                placeholder="e.g. Peanuts, Milk, Gluten, Shellfish"
                value={formData.restrictions}
                onChange={e => setFormData({...formData, restrictions: e.target.value})}
              />
              <span className="text-[11px] text-[#68796d] mt-1.5 block">
                Comma-separated substances. Scanned labels are strictly evaluated against these.
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Nutritional Priorities */}
        <div className="bg-[#fcfbf9] p-6 md:p-8 rounded-2xl border border-[#eae4d5] shadow-health">
          <div className="flex items-center gap-2 pb-3 mb-2 border-b border-[#eae4d5]">
            <div className="p-1.5 bg-[#f6f4ee] rounded-lg text-[#183c27] border border-[#eae4d5]">
              <Sparkles size={18} />
            </div>
            <h2 className="text-base font-bold text-[#122b1c]">Nutritional Priorities</h2>
          </div>

          <p className="text-xs text-[#68796d] mb-4">
            Select the factors that matter most to you when evaluating food labels or comparing multiple products.
          </p>

          <div className="flex flex-wrap gap-2">
            {priorityOptions.map(option => {
              const isSelected = formData.priorities.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handlePriorityToggle(option.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                    isSelected
                      ? 'bg-[#183c27] text-white border-[#122b1c] shadow-xs'
                      : 'bg-[#f6f4ee] text-[#38453b] border-[#ded5c2] hover:bg-[#eae4d5]/50'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: Daily Nutrition Targets */}
        <div className="bg-[#fcfbf9] p-6 md:p-8 rounded-2xl border border-[#eae4d5] shadow-health">
          <div className="flex items-center gap-2 pb-3 mb-2 border-b border-[#eae4d5]">
            <div className="p-1.5 bg-[#f6f4ee] rounded-lg text-[#183c27] border border-[#eae4d5]">
              <Heart size={18} />
            </div>
            <h2 className="text-base font-bold text-[#122b1c]">Voluntary Daily Nutrition Targets</h2>
          </div>

          <p className="text-xs text-[#68796d] mb-5">
            If you follow a macro plan, enter your daily goals and upper ceilings. NutriForge automatically calculates per-serving contribution percentages across all analyzed foods.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#38453b] mb-1">Calories (kcal)</label>
              <input
                type="number"
                className="w-full rounded-xl border border-[#ded5c2] bg-white px-3 py-2 text-sm text-[#171d18] focus:outline-none focus:ring-2 focus:ring-[#24593b] focus:border-[#24593b]"
                placeholder="e.g. 2200"
                value={formData.daily_targets?.calories ?? ''}
                onChange={e => handleTargetChange('calories', e.target.value)}
              />
            </div>

            <div className="bg-[#f5f8f5] p-2 rounded-xl border border-[#b4c8b6]/60">
              <label className="block text-xs font-bold text-[#183c27] mb-1">Protein (g)</label>
              <input
                type="number"
                className="w-full rounded-xl border border-[#b4c8b6] bg-white px-3 py-2 text-sm font-semibold text-[#122b1c] focus:outline-none focus:ring-2 focus:ring-[#24593b] focus:border-[#24593b]"
                placeholder="e.g. 140"
                value={formData.daily_targets?.protein ?? ''}
                onChange={e => handleTargetChange('protein', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#38453b] mb-1">Carbohydrates (g)</label>
              <input
                type="number"
                className="w-full rounded-xl border border-[#ded5c2] bg-white px-3 py-2 text-sm text-[#171d18] focus:outline-none focus:ring-2 focus:ring-[#24593b] focus:border-[#24593b]"
                placeholder="e.g. 250"
                value={formData.daily_targets?.carbohydrates ?? ''}
                onChange={e => handleTargetChange('carbohydrates', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#38453b] mb-1">Total Fat (g)</label>
              <input
                type="number"
                className="w-full rounded-xl border border-[#ded5c2] bg-white px-3 py-2 text-sm text-[#171d18] focus:outline-none focus:ring-2 focus:ring-[#24593b] focus:border-[#24593b]"
                placeholder="e.g. 70"
                value={formData.daily_targets?.total_fat ?? ''}
                onChange={e => handleTargetChange('total_fat', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#38453b] mb-1">Added Sugar Limit (g)</label>
              <input
                type="number"
                className="w-full rounded-xl border border-[#ded5c2] bg-white px-3 py-2 text-sm text-[#171d18] focus:outline-none focus:ring-2 focus:ring-[#24593b] focus:border-[#24593b]"
                placeholder="e.g. 25"
                value={formData.daily_targets?.added_sugar ?? ''}
                onChange={e => handleTargetChange('added_sugar', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#38453b] mb-1">Sodium Limit (mg)</label>
              <input
                type="number"
                className="w-full rounded-xl border border-[#ded5c2] bg-white px-3 py-2 text-sm text-[#171d18] focus:outline-none focus:ring-2 focus:ring-[#24593b] focus:border-[#24593b]"
                placeholder="e.g. 2000"
                value={formData.daily_targets?.sodium ?? ''}
                onChange={e => handleTargetChange('sodium', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#38453b] mb-1">Dietary Fibre Goal (g)</label>
              <input
                type="number"
                className="w-full rounded-xl border border-[#ded5c2] bg-white px-3 py-2 text-sm text-[#171d18] focus:outline-none focus:ring-2 focus:ring-[#24593b] focus:border-[#24593b]"
                placeholder="e.g. 30"
                value={formData.daily_targets?.fibre ?? ''}
                onChange={e => handleTargetChange('fibre', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="bg-[#fcfbf9] p-5 rounded-2xl border border-[#eae4d5] shadow-health flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-[#68796d]">
            <Shield size={16} className="text-[#183c27]" />
            <span>Profile settings persist across application sessions and database restarts.</span>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            {saved && (
              <span className="text-xs sm:text-sm text-[#1a6b41] font-semibold flex items-center gap-1.5 animate-fade-in">
                <CheckCircle2 size={16} /> Profile saved successfully!
              </span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#183c27] hover:bg-[#122b1c] text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-health transition-all disabled:opacity-50"
            >
              <Save size={16} /> {saving ? "Saving Changes..." : "Save Profile"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
