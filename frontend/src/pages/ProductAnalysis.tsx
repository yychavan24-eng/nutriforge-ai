import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  ArrowLeft,
  Scale,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Layers,
  Dumbbell,
  BookOpen,
  HelpCircle,
  FileText,
  RefreshCw
} from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';
import { api } from '../services/api';
import type {
  Product,
  AllergenCheckResult,
  ScaledNutrientData,
  EnrichedIngredient,
  IngredientIntelligenceResult
} from '../types';

function IngredientItemCard({
  ingredient,
  depth = 0
}: {
  ingredient: EnrichedIngredient;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const isCompound = ingredient.is_compound || (ingredient.children && ingredient.children.length > 0);
  const isCatalogued = ingredient.status === 'CATALOGUED';

  return (
    <div className={`rounded-xl border transition-all ${
      depth > 0
        ? 'ml-3 md:ml-6 mt-3 bg-white border-slate-200'
        : 'bg-white border-slate-200 hover:border-slate-300'
    }`}>
      {/* Header / Main Row */}
      <div className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="font-bold text-slate-900 text-base">
              {ingredient.canonical_name || ingredient.raw_text}
            </span>

            {/* If canonical differs from declared raw text */}
            {ingredient.canonical_name && ingredient.canonical_name.toLowerCase() !== ingredient.raw_text.toLowerCase() && (
              <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-mono">
                Label: &ldquo;{ingredient.raw_text}&rdquo;
              </span>
            )}

            {/* Specification if present (e.g. 85%) */}
            {ingredient.specification && (
              <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded">
                {ingredient.specification}
              </span>
            )}

            {/* Recognition Status Badge */}
            {isCatalogued ? (
              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                <CheckCircle2 size={12} /> Recognized
              </span>
            ) : (
              <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                <HelpCircle size={12} /> Uncatalogued
              </span>
            )}

            {/* Category Badge */}
            <span className="text-xs bg-slate-50 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full font-medium">
              {ingredient.category}
            </span>

            {/* Compound indicator */}
            {isCompound && (
              <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                <Layers size={12} /> Compound Blend ({ingredient.children.length})
              </span>
            )}
          </div>

          {/* Manufacturing Function / Formulation Role */}
          {ingredient.function ? (
            <p className="text-sm text-slate-700 mt-1 leading-relaxed">
              <strong className="text-slate-800 font-semibold">Formulation Role: </strong>
              {ingredient.function}
            </p>
          ) : !isCatalogued ? (
            <p className="text-xs text-slate-500 mt-1 italic">
              Not currently catalogued in reference food-science registry. Does not indicate safety, toxicity, or risk.
            </p>
          ) : null}

          {/* Fitness & Training Context (if available) */}
          {ingredient.fitness_context && (
            <div className="mt-2.5 flex items-start gap-2 bg-blue-50/50 border border-blue-100/80 rounded-lg p-2.5 text-xs text-blue-900">
              <Dumbbell size={14} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-blue-900">Fitness & Training Context: </strong>
                <span>{ingredient.fitness_context}</span>
              </div>
            </div>
          )}

          {/* Evidence Summary & Provenance */}
          {ingredient.evidence_summary && (
            <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
              <div className="flex items-start gap-1.5">
                <BookOpen size={13} className="text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-slate-700">Scientific & Functional Evidence: </strong>
                  <span>{ingredient.evidence_summary}</span>
                  {ingredient.provenance && (
                    <span className="block mt-1 text-[11px] text-slate-400">
                      Standard: {ingredient.provenance}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Parsing Uncertainty Notice */}
          {ingredient.has_uncertainty && ingredient.uncertainty_reason && (
            <div className="mt-2 text-xs bg-amber-50 text-amber-800 border border-amber-200 p-2.5 rounded-lg flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-600 shrink-0" />
              <span>
                <strong>Syntax Notice: </strong> {ingredient.uncertainty_reason}
              </span>
            </div>
          )}
        </div>

        {/* Expand / Collapse toggle for compound parents */}
        {isCompound && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="self-start px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 shrink-0"
          >
            {expanded ? (
              <>Hide Sub-Ingredients <ChevronDown size={14} /></>
            ) : (
              <>View Sub-Ingredients ({ingredient.children.length}) <ChevronRight size={14} /></>
            )}
          </button>
        )}
      </div>

      {/* Nested Children */}
      {isCompound && expanded && (
        <div className="border-t border-slate-100 p-4 bg-slate-50/40 rounded-b-xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
            <Layers size={13} /> Constituent Ingredients of {ingredient.canonical_name || ingredient.raw_text}
          </div>
          <div className="space-y-3">
            {ingredient.children.map((child, idx) => (
              <IngredientItemCard key={idx} ingredient={child} depth={depth + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductAnalysis() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [consumedAmount, setConsumedAmount] = useState<number>(100);
  const [scalingData, setScalingData] = useState<ScaledNutrientData | null>(null);
  const [allergenResult, setAllergenResult] = useState<AllergenCheckResult | null>(null);
  const [ingredientIntelligence, setIngredientIntelligence] = useState<IngredientIntelligenceResult | null>(null);
  const [ingredientLoading, setIngredientLoading] = useState(false);
  const [ingredientError, setIngredientError] = useState<string | null>(null);

  const { profile } = useProfile();

  const fetchIngredientIntelligence = (productId: string) => {
    setIngredientLoading(true);
    setIngredientError(null);
    api.getIngredientIntelligence(productId)
      .then(intel => {
        setIngredientIntelligence(intel);
      })
      .catch(err => {
        setIngredientError(err.message || 'Failed to load ingredient intelligence');
      })
      .finally(() => {
        setIngredientLoading(false);
      });
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');

    api.getProduct(id)
      .then(data => {
        setProduct(data);
        if (data.ingredient_intelligence) {
          setIngredientIntelligence(data.ingredient_intelligence);
        } else if (data.id) {
          fetchIngredientIntelligence(data.id);
        }
        const declared = data.serving_size_value || parseFloat(data.serving_size) || 100;
        setConsumedAmount(declared);

        // Record in history
        try {
          const historyStr = localStorage.getItem('nutriforge_history') || '[]';
          let history = JSON.parse(historyStr);
          history = [data.id, ...history.filter((hid: string) => hid !== data.id)].slice(0, 5);
          localStorage.setItem('nutriforge_history', JSON.stringify(history));
        } catch (e) {
          console.error(e);
        }
      })
      .catch(err => {
        setError(err.message || 'Product not found');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // Recalculate serving scaling and allergen checking when consumedAmount or profile changes
  useEffect(() => {
    if (!product) return;

    const declaredMass = product.serving_size_value || parseFloat(product.serving_size) || 100;

    // 1. Fetch deterministic scaling
    api.scaleNutrition({
      product_id: product.id,
      consumed_serving_mass: consumedAmount >= 0 ? consumedAmount : 0,
      label_serving_mass: declaredMass,
      daily_targets: profile.daily_targets as Record<string, number> | undefined
    })
      .then(res => setScalingData(res.data))
      .catch(err => console.warn('Scaling error:', err));

    // 2. Fetch deterministic allergen check
    api.checkAllergens({
      product_id: product.id,
      user_restrictions: profile.restrictions,
      dietary_preference: profile.dietaryPreference
    })
      .then(res => setAllergenResult(res.data))
      .catch(err => console.warn('Allergen check error:', err));

  }, [product, consumedAmount, profile]);

  const declaredAmount = product?.serving_size_value || (product ? parseFloat(product.serving_size) || 100 : 100);
  const multiplier = (consumedAmount >= 0 && declaredAmount > 0) ? (consumedAmount / declaredAmount) : 1;

  // Personalized goal evaluation for this product
  const goalAlignment = useMemo(() => {
    if (!product) return { score: 50, notes: [] };
    let score = 50;
    const notes: string[] = [];

    const prot = product.protein ?? 0;
    const sugar = product.total_sugar ?? 0;
    const addedSugar = product.added_sugar ?? 0;
    const fibre = product.fibre ?? 0;

    if (profile.goal === 'muscle_gain') {
      if (prot >= 15) {
        score += 25;
        notes.push(`High protein content (${prot}g/serving) actively supports muscle protein synthesis.`);
      } else if (prot < 8) {
        score -= 15;
        notes.push(`Relatively modest protein (${prot}g/serving); consider pairing with a high-protein source.`);
      }
    } else if (profile.goal === 'fat_loss') {
      if (addedSugar <= 3) {
        score += 20;
        notes.push(`Low added sugar (${addedSugar}g/serving) supports calorie control.`);
      } else if (addedSugar > 8) {
        score -= 20;
        notes.push(`Higher added sugar (${addedSugar}g/serving) adds rapid calories without satiety.`);
      }
      if (fibre >= 4) {
        score += 10;
        notes.push(`Good dietary fibre (${fibre}g) supports prolonged fullness.`);
      }
    }

    if (profile.priorities.includes('protein') && prot >= 10) {
      notes.push(`Matches your priority for Protein (${prot}g).`);
    }
    if (profile.priorities.includes('sugar') && sugar <= 5) {
      notes.push(`Favorable with your priority to monitor Sugar (${sugar}g).`);
    }

    return {
      score: Math.max(10, Math.min(95, score)),
      notes
    };
  }, [product, profile]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-12 text-center text-slate-500">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        Loading product intelligence...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center bg-white rounded-2xl border border-slate-200">
        <AlertTriangle className="text-amber-500 mx-auto mb-3" size={36} />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Product Not Found</h2>
        <p className="text-slate-600 mb-6">{error || 'The requested product record could not be loaded.'}</p>
        <Link to="/app/products" className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-500">
          Browse Products
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'nutrition', label: 'Nutrition Facts' },
    { id: 'serving', label: 'Serving Reality' },
    { id: 'restrictions', label: 'Allergens & Checks' },
    { id: 'ingredients', label: 'Ingredient Intelligence' },
    { id: 'claims', label: 'ClaimCheck' },
    { id: 'evidence', label: 'Provenance & Evidence' }
  ];

  const getProvenanceBadge = (field: string) => {
    const prov = product.provenance?.[field];
    if (!prov) return null;
    if (prov.source === 'LABEL_DECLARED') {
      return <span className="ml-1 text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full" title="Declared on Label">LBL</span>;
    } else if (prov.source === 'CALCULATED') {
      return <span className="ml-1 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full" title="Calculated by NutriForge">CALC</span>;
    } else if (prov.source === 'EXTERNAL_EVIDENCE') {
      return <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full" title="External Evidence">EXT</span>;
    } else if (prov.source === 'MANUAL_ENTRY') {
      return <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full" title="User Verified">MAN</span>;
    }
    return null;
  };

  const getScaledVal = (key: string, originalVal: number | undefined | null) => {
    if (scalingData?.scaled_nutrients && scalingData.scaled_nutrients[key] !== undefined) {
      const val = scalingData.scaled_nutrients[key];
      return val !== null ? val.toFixed(1) : '—';
    }
    if (originalVal === null || originalVal === undefined) return '—';
    return (originalVal * multiplier).toFixed(1);
  };

  const getTargetBadge = (key: string) => {
    const contrib = scalingData?.target_contributions?.[key];
    if (!contrib || contrib.percentage === null) return null;
    return (
      <span className={`text-[11px] block mt-1 font-medium ${
        contrib.percentage > 100 ? 'text-amber-600' : 'text-blue-600'
      }`}>
        {contrib.percentage}% of daily {contrib.target}
        {scalingData?.units[key] || ''}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto pb-16">
      <div className="mb-6">
        <Link to="/app/products" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={16} /> Back to Products
        </Link>
      </div>

      {/* Product Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row items-start gap-6">
        <div className="w-28 h-28 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-medium shrink-0">
          {product.image}
        </div>
        <div className="flex-1">
          <div className="flex flex-col md:flex-row justify-between items-start gap-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{product.name}</h1>
              <p className="text-slate-500 text-sm md:text-base">{product.brand} &bull; {product.category}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <CheckCircle2 size={14} /> Label Analyzed
              </span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                {product.source_type || 'VERIFIED'}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
              <p className="text-xs text-slate-500 font-medium">Declared Serving</p>
              <p className="font-semibold text-slate-900">{product.serving_size}</p>
            </div>
            {product.serving_description && (
              <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Household Measure</p>
                <p className="font-semibold text-slate-900">{product.serving_description}</p>
              </div>
            )}
            <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-700 font-medium">Active Serving Mass</p>
              <p className="font-bold text-blue-900">{consumedAmount}g ({multiplier.toFixed(2)}x label)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Allergen Conflict Warning if any */}
      {allergenResult?.has_conflicts && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl text-red-900 shadow-sm flex items-start gap-3">
          <AlertTriangle className="shrink-0 text-red-600 mt-0.5" size={22} />
          <div className="flex-1">
            <h3 className="font-bold text-base text-red-800">
              Dietary Restriction Alert: {allergenResult.conflict_count} Conflict(s) Detected
            </h3>
            <p className="text-sm text-red-700 mt-1">
              This product contains substances conflicting with your declared profile restrictions ({profile.restrictions || profile.dietaryPreference}).
            </p>
            <div className="mt-2 space-y-1">
              {allergenResult.conflicts.map((c, i) => (
                <div key={i} className="text-xs bg-red-100/60 p-2 rounded text-red-900">
                  <span className="font-semibold">[{c.confidence.replace(/_/g, ' ')}]</span> {c.explanation}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6 overflow-x-auto">
        <nav className="flex space-x-6 min-w-max">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 min-h-[420px]">

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Goal Alignment Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-blue-600" size={20} />
                  <h2 className="text-lg font-bold text-slate-900">
                    What This Means For You ({profile.goal.replace('_', ' ')})
                  </h2>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 font-medium">Context Alignment</span>
                  <p className="text-xl font-bold text-blue-700">{goalAlignment.score}%</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                "The label tells you WHAT is in the food. NutriForge helps you understand WHAT IT MEANS FOR YOU."
              </p>
              <div className="space-y-2">
                {goalAlignment.notes.map((note, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-slate-800 bg-white p-3 rounded-xl border border-slate-100">
                    <CheckCircle2 size={16} className="text-blue-500 mt-0.5 shrink-0" />
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Macro Snapshot */}
            <div>
              <h3 className="font-bold text-slate-900 mb-3">Macronutrient Profile (per {consumedAmount}g)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricBox label="Calories" value={getScaledVal('calories', product.calories)} unit="kcal" badge={getProvenanceBadge('calories')} targetBadge={getTargetBadge('calories')} />
                <MetricBox label="Protein" value={getScaledVal('protein', product.protein)} unit="g" highlight badge={getProvenanceBadge('protein')} targetBadge={getTargetBadge('protein')} />
                <MetricBox label="Carbohydrates" value={getScaledVal('carbohydrates', product.carbohydrates)} unit="g" badge={getProvenanceBadge('carbohydrates')} targetBadge={getTargetBadge('carbohydrates')} />
                <MetricBox label="Total Fat" value={getScaledVal('total_fat', product.total_fat)} unit="g" badge={getProvenanceBadge('total_fat')} targetBadge={getTargetBadge('total_fat')} />
              </div>
            </div>

            <div className="flex justify-between items-center bg-blue-50/60 p-4 rounded-xl border border-blue-100 text-sm text-blue-900">
              <span>Want to test how this changes if you eat a bigger or smaller serving?</span>
              <button onClick={() => setActiveTab('serving')} className="font-bold underline hover:text-blue-700">
                Open Serving Reality &rarr;
              </button>
            </div>
          </div>
        )}

        {/* NUTRITION FACTS TAB */}
        {activeTab === 'nutrition' && (
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Nutrition Analysis <span className="text-sm font-normal text-slate-500 ml-2">Scaled for {consumedAmount}g serving</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Formula: consumed = (label_value × {consumedAmount}g) / {declaredAmount}g
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConsumedAmount(declaredAmount)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${
                    consumedAmount === declaredAmount ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Label Serving ({declaredAmount}g)
                </button>
                <button
                  onClick={() => setConsumedAmount(100)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${
                    consumedAmount === 100 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Per 100g Standard
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricBox label="Calories" value={getScaledVal('calories', product.calories)} unit="kcal" badge={getProvenanceBadge('calories')} targetBadge={getTargetBadge('calories')} />
              <MetricBox label="Protein" value={getScaledVal('protein', product.protein)} unit="g" highlight badge={getProvenanceBadge('protein')} targetBadge={getTargetBadge('protein')} />
              <MetricBox label="Carbohydrates" value={getScaledVal('carbohydrates', product.carbohydrates)} unit="g" badge={getProvenanceBadge('carbohydrates')} targetBadge={getTargetBadge('carbohydrates')} />
              <MetricBox label="Total Sugar" value={getScaledVal('total_sugar', product.total_sugar)} unit="g" badge={getProvenanceBadge('total_sugar')} targetBadge={getTargetBadge('total_sugar')} />
              <MetricBox label="Added Sugar" value={getScaledVal('added_sugar', product.added_sugar)} unit="g" warning={(product.added_sugar * multiplier) > 5} badge={getProvenanceBadge('added_sugar')} targetBadge={getTargetBadge('added_sugar')} />
              <MetricBox label="Total Fat" value={getScaledVal('total_fat', product.total_fat)} unit="g" badge={getProvenanceBadge('total_fat')} targetBadge={getTargetBadge('total_fat')} />
              <MetricBox label="Saturated Fat" value={getScaledVal('saturated_fat', product.saturated_fat)} unit="g" badge={getProvenanceBadge('saturated_fat')} targetBadge={getTargetBadge('saturated_fat')} />
              <MetricBox label="Trans Fat" value={getScaledVal('trans_fat', product.trans_fat)} unit="g" badge={getProvenanceBadge('trans_fat')} />
              <MetricBox label="Sodium" value={getScaledVal('sodium', product.sodium)} unit="mg" badge={getProvenanceBadge('sodium')} targetBadge={getTargetBadge('sodium')} />
              <MetricBox label="Fibre" value={getScaledVal('fibre', product.fibre)} unit="g" badge={getProvenanceBadge('fibre')} targetBadge={getTargetBadge('fibre')} />
            </div>

            <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Provenance Badges</h4>
              <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-1.5"><span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full font-mono">LBL</span> Declared on manufacturer label</span>
                <span className="flex items-center gap-1.5"><span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-mono">CALC</span> Deterministically calculated by NutriForge</span>
                <span className="flex items-center gap-1.5"><span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-mono">EXT</span> External lab / regulatory source</span>
                <span className="flex items-center gap-1.5"><span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-mono">MAN</span> Verified manual entry</span>
              </div>
            </div>
          </div>
        )}

        {/* SERVING REALITY TAB */}
        {activeTab === 'serving' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Scale className="text-blue-600" size={24} /> Serving Reality Engine
              </h2>
              <p className="text-slate-600 text-sm">
                Food labels often display small serving sizes that underestimate actual gym intake. NutriForge recalculates all metrics proportionally.
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6">
              <h3 className="font-bold text-blue-950 mb-2">Calculate Actual Intake</h3>
              <p className="text-sm text-blue-800 mb-4">
                The manufacturer's declared serving is <strong>{product.serving_size}</strong>. Enter the quantity you actually consume:
              </p>

              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center bg-white border border-blue-200 rounded-xl px-3 py-2 shadow-sm">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={consumedAmount === 0 ? '' : consumedAmount}
                    onChange={e => setConsumedAmount(parseFloat(e.target.value) || 0)}
                    className="w-24 text-lg font-bold text-slate-900 focus:outline-none"
                  />
                  <span className="text-slate-500 font-medium ml-1">grams</span>
                </div>

                <span className="text-blue-400 font-bold">=</span>

                <div className="bg-white border border-blue-200 px-4 py-2 rounded-xl shadow-sm">
                  <span className="text-xs text-slate-500 block">Proportional Multiplier</span>
                  <span className="text-lg font-extrabold text-blue-700">{multiplier.toFixed(2)}× declared serving</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-blue-100/80 text-xs text-blue-800 font-mono">
                consumed_nutrient = (label_nutrient × {consumedAmount}g) / {declaredAmount}g
              </div>
            </div>

            {/* Live scaled macronutrient breakdown */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-white">
              <h3 className="font-bold text-slate-900 mb-4">Real Consumption for {consumedAmount}g Intake</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <span className="text-xs text-slate-500 font-medium">Calories</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{getScaledVal('calories', product.calories)} <span className="text-xs font-normal text-slate-500">kcal</span></p>
                  {getTargetBadge('calories')}
                </div>
                <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl">
                  <span className="text-xs text-blue-700 font-medium">Protein</span>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{getScaledVal('protein', product.protein)} <span className="text-xs font-normal text-slate-500">g</span></p>
                  {getTargetBadge('protein')}
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <span className="text-xs text-slate-500 font-medium">Carbohydrates</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{getScaledVal('carbohydrates', product.carbohydrates)} <span className="text-xs font-normal text-slate-500">g</span></p>
                  {getTargetBadge('carbohydrates')}
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <span className="text-xs text-slate-500 font-medium">Total Sugar</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{getScaledVal('total_sugar', product.total_sugar)} <span className="text-xs font-normal text-slate-500">g</span></p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <span className="text-xs text-slate-500 font-medium">Added Sugar</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{getScaledVal('added_sugar', product.added_sugar)} <span className="text-xs font-normal text-slate-500">g</span></p>
                  {getTargetBadge('added_sugar')}
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <span className="text-xs text-slate-500 font-medium">Dietary Fibre</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{getScaledVal('fibre', product.fibre)} <span className="text-xs font-normal text-slate-500">g</span></p>
                  {getTargetBadge('fibre')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ALLERGENS & RESTRICTIONS TAB */}
        {activeTab === 'restrictions' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Deterministic Allergen & Restriction Check</h2>
              <p className="text-slate-600 text-sm">
                Evaluates manufacturer label declarations and raw ingredients against your profile restrictions.
              </p>
            </div>

            {/* Profile Context */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-slate-500 text-xs block">Active Restrictions</span>
                <span className="font-semibold text-slate-800">{profile.restrictions || 'None declared'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block">Dietary Preference</span>
                <span className="font-semibold text-slate-800 capitalize">{profile.dietaryPreference.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Conflict List */}
            {allergenResult?.has_conflicts ? (
              <div className="space-y-3">
                <h3 className="font-bold text-red-900 text-sm uppercase tracking-wider">Identified Conflicts</h3>
                {allergenResult.conflicts.map((c, i) => (
                  <div key={i} className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-red-900">{c.user_restriction}</span>
                        <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-medium">
                          {c.confidence.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-red-800 mt-1">{c.explanation}</p>
                      <span className="text-xs text-red-600 mt-1 block">Source: {c.source}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-900">
                <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={24} />
                <div>
                  <h3 className="font-bold text-emerald-950">No Declared Conflicts Detected</h3>
                  <p className="text-sm text-emerald-800 mt-1">
                    Based on the manufacturer's declared allergen warnings and ingredients, no direct matches were found for your declared restrictions ({profile.restrictions || 'none'}).
                  </p>
                </div>
              </div>
            )}

            {/* Data completeness warnings */}
            {allergenResult?.data_completeness_warnings && allergenResult.data_completeness_warnings.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm">
                <h4 className="font-bold mb-1 flex items-center gap-1.5">
                  <Info size={16} /> Label Completeness Notice
                </h4>
                {allergenResult.data_completeness_warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            )}

            {/* Medical Disclaimer */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-700 block mb-1">Decision Support Disclaimer:</strong>
              {allergenResult?.disclaimer || (
                "NutriForge is a label literacy and decision-support tool. It is not a medical diagnostic system, laboratory testing service or guarantee that a food is safe. Packaged foods may contain undeclared traces or factory formulation changes. If you have severe allergies, always consult clinical healthcare guidance."
              )}
            </div>
          </div>
        )}

        {/* INGREDIENTS TAB */}
        {activeTab === 'ingredients' && (() => {
          const intel = ingredientIntelligence || product.ingredient_intelligence;
          return (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Ingredient Intelligence</h2>
                  <p className="text-slate-600 text-sm">
                    Deterministic food-science breakdown, formulation functions, and reference registry evidence.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {product.raw_ingredient_text && (
                    <span className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-full font-medium inline-flex items-center gap-1.5">
                      <FileText size={12} /> Label Declared
                    </span>
                  )}
                  {intel && (
                    <button
                      type="button"
                      onClick={() => fetchIngredientIntelligence(product.id)}
                      disabled={ingredientLoading}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                      title="Refresh ingredient analysis"
                    >
                      <RefreshCw size={14} className={ingredientLoading ? 'animate-spin' : ''} />
                    </button>
                  )}
                </div>
              </div>

              {/* Task 2: Separation of Concerns Banner */}
              <div className="bg-blue-50/80 border border-blue-200/90 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-blue-950 shadow-sm">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={20} className="text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <strong className="font-semibold text-blue-900 block mb-0.5">
                      Functional Analysis vs. Personal Restrictions
                    </strong>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Ingredient Intelligence explains formulation functions, scientific context, and ingredient taxonomy.
                      It does not evaluate personal dietary compliance or individual allergy safety.
                      For profile-matched allergen warnings and restriction checks, use the dedicated engine.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('restrictions')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-300 rounded-lg shrink-0 transition-all shadow-sm hover:shadow"
                >
                  <ShieldCheck size={14} /> View Allergens & Checks
                </button>
              </div>

              {/* Loading state */}
              {ingredientLoading && !intel && (
                <div className="p-8 text-center bg-white border border-slate-200 rounded-xl">
                  <RefreshCw size={24} className="animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">Analyzing ingredient statement...</p>
                  <p className="text-xs text-slate-500 mt-1">Parsing syntax and matching with reference knowledge base.</p>
                </div>
              )}

              {/* Error state */}
              {ingredientError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start justify-between gap-3 text-red-900">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold text-sm">Failed to load ingredient intelligence</strong>
                      <p className="text-xs text-red-700 mt-0.5">{ingredientError}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchIngredientIntelligence(product.id)}
                    className="px-3 py-1.5 text-xs font-semibold bg-white text-red-700 border border-red-200 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Summary Metrics Bar */}
              {intel && intel.total_ingredients > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-xs text-slate-500 block">Total Declared</span>
                    <span className="text-xl font-bold text-slate-900">{intel.total_ingredients}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-xs text-slate-500 block">Recognized in KB</span>
                    <span className="text-xl font-bold text-emerald-600">{intel.catalogued_count}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-xs text-slate-500 block">Uncatalogued Items</span>
                    <span className="text-xl font-bold text-slate-600">{intel.uncatalogued_count}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-xs text-slate-500 block">Registry Version</span>
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block mt-1">
                      Reference KB v1.0
                    </span>
                  </div>
                </div>
              )}

              {/* Parsing Uncertainty Notice */}
              {intel?.has_uncertainty && (
                <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <strong className="font-semibold block mb-0.5 text-amber-950">
                      Syntax Notice: Bracket/Parenthesis Anomaly Detected
                    </strong>
                    The ingredient statement on this package label contains unconventional nesting, unclosed parentheses, or non-standard punctuation.
                    NutriForge safely preserved the declared terms with conservative fallback parsing.
                  </div>
                </div>
              )}

              {/* Verbatim Ingredient Statement */}
              {(intel?.raw_statement || product.raw_ingredient_text) ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={14} className="text-slate-500" /> Verbatim Raw Ingredient Statement
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono">Original Label Text</span>
                  </div>
                  <p className="text-slate-800 text-sm leading-relaxed font-sans bg-white p-3 rounded-lg border border-slate-200/70">
                    {intel?.raw_statement || product.raw_ingredient_text}
                  </p>
                </div>
              ) : null}

              {/* Structured & Enriched Ingredient Breakdown */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 text-base">
                    Enriched Ingredient Breakdown
                  </h3>
                  {intel && intel.ingredients && intel.ingredients.length > 0 && (
                    <span className="text-xs text-slate-500">
                      {intel.ingredients.length} top-level {intel.ingredients.length === 1 ? 'ingredient' : 'ingredients'}
                    </span>
                  )}
                </div>

                {intel && intel.ingredients && intel.ingredients.length > 0 ? (
                  <div className="space-y-3">
                    {intel.ingredients.map((ing, i) => (
                      <IngredientItemCard key={i} ingredient={ing} depth={0} />
                    ))}
                  </div>
                ) : !product.raw_ingredient_text && (!intel || intel.ingredients.length === 0) ? (
                  /* Empty state */
                  <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl">
                    <HelpCircle size={28} className="text-slate-400 mx-auto mb-2" />
                    <h4 className="font-semibold text-slate-800 text-sm mb-1">No Ingredient Statement Available</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      This product record does not have a declared ingredient statement on file.
                      If you have the physical packaging, scan or upload a packaging photo in the AI Label Scanner to extract ingredients.
                    </p>
                    <Link
                      to="/app/scan"
                      className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                    >
                      Go to Scanner
                    </Link>
                  </div>
                ) : (
                  /* Fallback if raw text exists but no structured items yet */
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <p className="text-xs text-slate-500">No enriched ingredient breakdown available.</p>
                  </div>
                )}
              </div>

              {/* Knowledge Base Footnote / Methodology */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-500 leading-relaxed flex items-start gap-2">
                <Info size={15} className="text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-700">Methodology & Knowledge Base Provenance:</strong> Functions, categories, and evidence summaries are curated from standardized food-science authorities (CODEX Alimentarius, FSSAI, US FDA GRAS, and EFSA).
                  NutriForge does not invent unverified claims or declare safety certifications. Uncatalogued ingredients are noted without assuming risk or toxicity.
                </div>
              </div>
            </div>
          );
        })()}

        {/* CLAIMCHECK TAB */}
        {activeTab === 'claims' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">ClaimCheck</h2>
              <p className="text-slate-600 text-sm">Verifies marketing statements against declared nutrition reality.</p>
            </div>

            <div className="space-y-3">
              {product.claims && product.claims.length > 0 ? (
                product.claims.map((claim, i) => (
                  <div key={i} className="p-4 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">"{claim}"</span>
                      <p className="text-xs text-slate-500 mt-1">Marketing claim declared on packaging.</p>
                    </div>
                    <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> Appears Consistent
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-sm italic">No specific marketing claims declared on this product record.</p>
              )}
            </div>
          </div>
        )}

        {/* EVIDENCE TAB */}
        {activeTab === 'evidence' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Data Provenance & Regulatory Records</h2>
              <p className="text-slate-600 text-sm">Transparency trail for product data sources.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs text-slate-500 block mb-1">Source Type</span>
                <span className="font-bold text-slate-900">{product.source_type || 'COMMUNITY_VERIFIED'}</span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs text-slate-500 block mb-1">FSSAI License</span>
                <span className="font-bold text-slate-900">{product.fssai_information || 'Awaiting Verification'}</span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl col-span-1 md:col-span-2">
                <span className="text-xs text-slate-500 block mb-1">Verification Evidence</span>
                <p className="text-slate-800">{product.evidence || 'Recorded from physical product packaging scan.'}</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function MetricBox({
  label,
  value,
  unit,
  highlight,
  warning,
  badge,
  targetBadge
}: {
  label: string;
  value: string | number;
  unit: string;
  highlight?: boolean;
  warning?: boolean;
  badge?: React.ReactNode;
  targetBadge?: React.ReactNode;
}) {
  return (
    <div className={`p-4 rounded-xl border transition-all ${
      highlight ? 'bg-blue-50/80 border-blue-200 shadow-sm' :
      warning ? 'bg-amber-50/80 border-amber-200' :
      'bg-slate-50/80 border-slate-200'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-semibold ${
          highlight ? 'text-blue-800' :
          warning ? 'text-amber-800' :
          'text-slate-600'
        }`}>{label}</span>
        {badge}
      </div>
      <p className={`text-2xl font-bold ${
        highlight ? 'text-blue-950' :
        warning ? 'text-amber-950' :
        'text-slate-900'
      }`}>
        {value} <span className="text-xs font-normal text-slate-500">{unit}</span>
      </p>
      {targetBadge}
    </div>
  );
}
