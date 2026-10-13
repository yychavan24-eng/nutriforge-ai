import { useState, useEffect } from 'react';
import { Save, CheckCircle2, Target } from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';
import type { ProfileData } from '../types';

export default function Profile() {
  const { profile, setProfile } = useProfile();
  const [formData, setFormData] = useState<ProfileData>(profile);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const priorityOptions = [
    { id: 'protein', label: 'Protein' },
    { id: 'calories', label: 'Calories' },
    { id: 'sugar', label: 'Total Sugar' },
    { id: 'added_sugar', label: 'Added Sugar' },
    { id: 'sodium', label: 'Sodium' },
    { id: 'fat', label: 'Total Fat' },
    { id: 'saturated_fat', label: 'Saturated Fat' },
    { id: 'fibre', label: 'Fibre' },
    { id: 'ingredients', label: 'Ingredients' },
    { id: 'allergens', label: 'Allergens' },
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
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Fitness & Nutrition Profile</h1>
        <p className="text-slate-600">
          Personalize NutriForge label intelligence to your fitness goals, restrictions, and targets.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
        
        {/* Basic Stats */}
        <section>
          <div className="flex justify-between items-center border-b pb-2 mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Voluntary Physical Profile</h2>
            <span className="text-xs text-slate-500 italic">Optional self-reported metrics</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Physical metrics are strictly voluntary and used only for contextual reference. NutriForge never infers medical conditions, allergies, or clinical diagnoses from body measurements.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
              <input 
                type="number" 
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Years (optional)" 
                value={formData.age} 
                onChange={e => setFormData({...formData, age: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Height (cm)</label>
              <input 
                type="number" 
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="cm (optional)" 
                value={formData.height} 
                onChange={e => setFormData({...formData, height: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Weight (kg)</label>
              <input 
                type="number" 
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="kg (optional)" 
                value={formData.weight} 
                onChange={e => setFormData({...formData, weight: e.target.value})} 
              />
            </div>
          </div>
        </section>

        {/* Goals & Preferences */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 border-b pb-2 mb-4">Goals & Preferences</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fitness & Nutrition Goal</label>
              <select 
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                value={formData.goal} 
                onChange={e => setFormData({...formData, goal: e.target.value})}
              >
                <option value="muscle_gain">Muscle Gain (High Protein / Energy Surplus)</option>
                <option value="fat_loss">Fat Loss (Caloric Deficit / Lower Sugar)</option>
                <option value="maintenance">Maintenance (Balanced Intake)</option>
                <option value="performance">Athletic Performance & Endurance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Activity Level</label>
              <select 
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                value={formData.activityLevel} 
                onChange={e => setFormData({...formData, activityLevel: e.target.value})}
              >
                <option value="sedentary">Sedentary (Little to no exercise)</option>
                <option value="light">Lightly Active (1-3 gym/cardio days/week)</option>
                <option value="moderate">Moderately Active (3-5 training sessions/week)</option>
                <option value="very_active">Very Active (6-7 intense training sessions/week)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dietary Preference</label>
              <select 
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                value={formData.dietaryPreference} 
                onChange={e => setFormData({...formData, dietaryPreference: e.target.value})}
              >
                <option value="no_preference">No Preference</option>
                <option value="vegetarian">Vegetarian (No meat/fish/gelatin)</option>
                <option value="vegan">Vegan (Strictly plant-based / No dairy)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Declared Restrictions & Allergens</label>
              <input 
                type="text" 
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="e.g. Peanuts, Milk, Gluten, Shellfish" 
                value={formData.restrictions} 
                onChange={e => setFormData({...formData, restrictions: e.target.value})} 
              />
              <span className="text-xs text-slate-500 mt-1 block">Comma-separated list of substances you must avoid.</span>
            </div>
          </div>
        </section>

        {/* Nutritional Priorities */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 border-b pb-2 mb-2">Nutritional Priorities</h2>
          <p className="text-sm text-slate-500 mb-4">Select what matters most to you during product comparisons and analysis.</p>
          <div className="flex flex-wrap gap-2">
            {priorityOptions.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => handlePriorityToggle(option.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  formData.priorities.includes(option.id)
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        {/* Optional Daily Nutrition Targets */}
        <section>
          <div className="flex items-center gap-2 border-b pb-2 mb-2">
            <Target className="text-blue-600" size={20} />
            <h2 className="text-lg font-semibold text-slate-900">Optional Daily Nutrition Targets</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            If you track macronutrients or daily limits, enter your daily goals to calculate exact per-serving contributions.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Calories (kcal)</label>
              <input 
                type="number" 
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" 
                placeholder="e.g. 2200" 
                value={formData.daily_targets?.calories ?? ''} 
                onChange={e => handleTargetChange('calories', e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Protein (g)</label>
              <input 
                type="number" 
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" 
                placeholder="e.g. 140" 
                value={formData.daily_targets?.protein ?? ''} 
                onChange={e => handleTargetChange('protein', e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Carbohydrates (g)</label>
              <input 
                type="number" 
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" 
                placeholder="e.g. 250" 
                value={formData.daily_targets?.carbohydrates ?? ''} 
                onChange={e => handleTargetChange('carbohydrates', e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Total Fat (g)</label>
              <input 
                type="number" 
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" 
                placeholder="e.g. 70" 
                value={formData.daily_targets?.total_fat ?? ''} 
                onChange={e => handleTargetChange('total_fat', e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Added Sugar Limit (g)</label>
              <input 
                type="number" 
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" 
                placeholder="e.g. 25" 
                value={formData.daily_targets?.added_sugar ?? ''} 
                onChange={e => handleTargetChange('added_sugar', e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sodium Limit (mg)</label>
              <input 
                type="number" 
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" 
                placeholder="e.g. 2000" 
                value={formData.daily_targets?.sodium ?? ''} 
                onChange={e => handleTargetChange('sodium', e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Dietary Fibre Goal (g)</label>
              <input 
                type="number" 
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" 
                placeholder="e.g. 30" 
                value={formData.daily_targets?.fibre ?? ''} 
                onChange={e => handleTargetChange('fibre', e.target.value)} 
              />
            </div>
          </div>
        </section>

        <div className="pt-4 flex items-center justify-between border-t border-slate-100">
          <span className="text-xs text-slate-400">Settings persist across application sessions.</span>
          <div className="flex items-center gap-4">
            {saved && (
              <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                <CheckCircle2 size={16} /> Profile saved successfully!
              </span>
            )}
            <button 
              type="submit" 
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-500 transition-colors shadow-sm"
            >
              <Save size={18} /> Save Profile
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
