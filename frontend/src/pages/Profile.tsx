import { useState } from 'react';
import { Save } from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';

export default function Profile() {
  const { profile, setProfile } = useProfile();
  const [formData, setFormData] = useState(profile);

  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    // In a real app, send to /api/profile
  };

  const priorityOptions = [
    { id: 'protein', label: 'Protein' },
    { id: 'calories', label: 'Calories' },
    { id: 'sugar', label: 'Sugar' },
    { id: 'added_sugar', label: 'Added Sugar' },
    { id: 'sodium', label: 'Sodium' },
    { id: 'fat', label: 'Fat' },
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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Fitness & Nutrition Profile</h1>
        <p className="text-slate-600">Tell NutriForge about yourself to get personalized intelligence.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        
        {/* Basic Stats */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 border-b pb-2 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
              <input type="number" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Years" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Height (cm)</label>
              <input type="number" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="cm" value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Weight (kg)</label>
              <input type="number" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="kg" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
            </div>
          </div>
        </section>

        {/* Goals & Preferences */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 border-b pb-2 mb-4">Goals & Preferences</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fitness Goal</label>
              <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.goal} onChange={e => setFormData({...formData, goal: e.target.value})}>
                <option value="muscle_gain">Muscle Gain</option>
                <option value="fat_loss">Fat Loss</option>
                <option value="maintenance">Maintenance</option>
                <option value="performance">Performance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Activity Level</label>
              <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.activityLevel} onChange={e => setFormData({...formData, activityLevel: e.target.value})}>
                <option value="sedentary">Sedentary</option>
                <option value="light">Lightly Active</option>
                <option value="moderate">Moderately Active</option>
                <option value="very_active">Very Active</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dietary Preference</label>
              <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.dietaryPreference} onChange={e => setFormData({...formData, dietaryPreference: e.target.value})}>
                <option value="no_preference">No Preference</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Restrictions / Allergies</label>
              <input type="text" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Peanuts, Gluten" value={formData.restrictions} onChange={e => setFormData({...formData, restrictions: e.target.value})} />
            </div>
          </div>
        </section>

        {/* Priorities */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 border-b pb-2 mb-4">Nutritional Priorities</h2>
          <p className="text-sm text-slate-500 mb-4">Select what matters most to you when analyzing a product.</p>
          <div className="flex flex-wrap gap-2">
            {priorityOptions.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => handlePriorityToggle(option.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  formData.priorities.includes(option.id)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <div className="pt-4 flex items-center justify-end gap-4 border-t border-slate-100">
          {saved && <span className="text-sm text-green-600 font-medium">Profile updated!</span>}
          <button type="submit" className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-500 transition-colors">
            <Save size={18} /> Save Profile
          </button>
        </div>
      </form>
    </div>
  );
}
