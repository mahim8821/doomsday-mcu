import React, { useEffect, useState } from 'react';
import {
  Ticket,
  Users,
  AlertCircle,
  Sparkles,
  Building2,
  Plus,
  X,
  Package,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  fetchCinemas,
  createCinema,
  fetchBookingQuote,
  Cinema,
  BookingQuoteResponse,
} from '../api/client';

export const BookingPage: React.FC = () => {
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>('');
  const [groupSize, setGroupSize] = useState<number | ''>(6);
  const [quote, setQuote] = useState<BookingQuoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Cinema Form state
  const [showAddCinema, setShowAddCinema] = useState(false);
  const [newCinemaName, setNewCinemaName] = useState('');
  const [newBundleSizesStr, setNewBundleSizesStr] = useState('2, 5, 10');
  const [cinemaFormError, setCinemaFormError] = useState<string | null>(null);
  const [creatingCinema, setCreatingCinema] = useState(false);

  const loadCinemas = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCinemas();
      setCinemas(data);
      if (data.length > 0 && !selectedCinemaId) {
        setSelectedCinemaId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cinemas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCinemas();
  }, []);

  const handleCalculateQuote = async (customSize?: number) => {
    const targetSize = customSize !== undefined ? customSize : groupSize;
    if (!selectedCinemaId) {
      setError('Please select a cinema venue.');
      return;
    }
    if (typeof targetSize !== 'number' || targetSize < 1 || targetSize > 10000) {
      setError('Group size must be an integer between 1 and 10,000 seats.');
      return;
    }

    try {
      setCalculating(true);
      setError(null);
      const res = await fetchBookingQuote(selectedCinemaId, targetSize);
      setQuote(res);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate quote.');
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    if (selectedCinemaId && typeof groupSize === 'number' && groupSize >= 1 && groupSize <= 10000) {
      handleCalculateQuote();
    }
  }, [selectedCinemaId]);

  const handlePresetSelect = (size: number, cinemaNameIncludes?: string) => {
    setGroupSize(size);
    if (cinemaNameIncludes) {
      const match = cinemas.find((c) =>
        c.name.toLowerCase().includes(cinemaNameIncludes.toLowerCase())
      );
      if (match) {
        setSelectedCinemaId(match.id);
      }
    }
    handleCalculateQuote(size);
  };

  const handleCreateCinema = async (e: React.FormEvent) => {
    e.preventDefault();
    setCinemaFormError(null);

    if (!newCinemaName.trim()) {
      setCinemaFormError('Cinema name is required.');
      return;
    }

    const sizes = newBundleSizesStr
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    if (sizes.length === 0 || sizes.length > 10) {
      setCinemaFormError('Please enter between 1 and 10 bundle sizes.');
      return;
    }

    if (new Set(sizes).size !== sizes.length) {
      setCinemaFormError('Bundle sizes must be distinct integers.');
      return;
    }

    if (sizes.some((s) => s < 1 || s > 500)) {
      setCinemaFormError('Each bundle size must be between 1 and 500 seats.');
      return;
    }

    try {
      setCreatingCinema(true);
      const created = await createCinema({
        name: newCinemaName.trim(),
        bundleSizes: sizes,
      });

      setCinemas((prev) => [...prev, created]);
      setSelectedCinemaId(created.id);
      setNewCinemaName('');
      setNewBundleSizesStr('2, 5, 10');
      setShowAddCinema(false);
    } catch (err: any) {
      setCinemaFormError(err.message || 'Failed to create cinema.');
    } finally {
      setCreatingCinema(false);
    }
  };

  const selectedCinema = cinemas.find((c) => c.id === selectedCinemaId);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Ticket className="w-8 h-8 text-emerald-400" />
            Watch-Party Group Ticket Optimizer
          </h1>
          <p className="text-slate-400 mt-1 text-xs sm:text-sm">
            Solves the fewest bundle combinations for opening-night screenings with zero wasted seats.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddCinema(!showAddCinema)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-700/80 rounded-xl font-bold text-xs tracking-wide self-start sm:self-auto cursor-pointer transition-colors"
        >
          {showAddCinema ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showAddCinema ? 'Cancel' : 'Register Cinema'}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Add Cinema Collapsible Form */}
      {showAddCinema && (
        <form
          onSubmit={handleCreateCinema}
          className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl space-y-4 animate-fadeIn"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <span>Register Cinema Partner</span>
            </h2>
            <button
              type="button"
              onClick={() => setShowAddCinema(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {cinemaFormError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{cinemaFormError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Cinema Name</label>
              <input
                type="text"
                placeholder="e.g. Stark Multiplex"
                value={newCinemaName}
                onChange={(e) => setNewCinemaName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Bundle Sizes (comma-separated, 1–500 seats)
              </label>
              <input
                type="text"
                placeholder="e.g. 1, 3, 4"
                value={newBundleSizesStr}
                onChange={(e) => setNewBundleSizesStr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddCinema(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingCinema}
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow disabled:opacity-50"
            >
              {creatingCinema ? 'Registering...' : 'Save Cinema'}
            </button>
          </div>
        </form>
      )}

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form & Presets (7 cols on lg) */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
          <div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">
              Configuration
            </span>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <span>Cinema Venue &amp; Party Size</span>
            </h2>
          </div>

          {/* Cinema Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Select Cinema Venue
            </label>
            <select
              value={selectedCinemaId}
              onChange={(e) => setSelectedCinemaId(e.target.value)}
              disabled={loading || cinemas.length === 0}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
            >
              {cinemas.map((cinema) => (
                <option key={cinema.id} value={cinema.id}>
                  {cinema.name} — Bundles: [{cinema.bundleSizes.join(', ')}]
                </option>
              ))}
            </select>
          </div>

          {/* Active Cinema Available Packages Chips */}
          {selectedCinema && (
            <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1.5">
              <span className="text-[11px] text-slate-400 font-mono block">
                Available Opening-Night Seat Packages:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedCinema.bundleSizes.map((size) => (
                  <span
                    key={size}
                    className="px-2.5 py-1 bg-emerald-500/10 text-emerald-300 text-xs font-bold rounded-lg border border-emerald-500/20 flex items-center gap-1.5 font-mono"
                  >
                    <Package className="w-3.5 h-3.5 text-emerald-400" />
                    {size} seats
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Group Size Input & Test Presets */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Group Size (1 – 10,000 seats)
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={10000}
                value={groupSize}
                onChange={(e) => {
                  const val = e.target.value;
                  setGroupSize(val === '' ? '' : parseInt(val, 10));
                }}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-white font-bold text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <Users className="w-5 h-5 text-slate-500 absolute right-4 top-3.5" />
            </div>

            {/* Quick-Test Presets Bar */}
            <div className="pt-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Quick Test Scenarios (from Assessment Spec):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handlePresetSelect(6, 'stark')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-[11px] text-slate-300 hover:text-white transition-all text-left"
                >
                  <div className="font-bold text-emerald-400">6 seats</div>
                  <div className="text-[9px] text-slate-500 truncate">Stark [1,3,4] &rarr; 3×2</div>
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSelect(11, 'avengers')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-[11px] text-slate-300 hover:text-white transition-all text-left"
                >
                  <div className="font-bold text-emerald-400">11 seats</div>
                  <div className="text-[9px] text-slate-500 truncate">Avengers [2,5] &rarr; 4</div>
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSelect(44, 'sanctum')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-[11px] text-slate-300 hover:text-white transition-all text-left"
                >
                  <div className="font-bold text-emerald-400">44 seats</div>
                  <div className="text-[9px] text-slate-500 truncate">Sanctum [6,9,20]</div>
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSelect(7, 'wakanda')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-[11px] text-slate-300 hover:text-white transition-all text-left"
                >
                  <div className="font-bold text-amber-400">7 seats</div>
                  <div className="text-[9px] text-slate-500 truncate">Wakanda [4,6] &rarr; Fail</div>
                </button>
              </div>
            </div>
          </div>

          {/* Calculate Button */}
          <button
            type="button"
            onClick={() => handleCalculateQuote()}
            disabled={calculating}
            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
            <span>{calculating ? 'Solving Minimum Bundles...' : 'Calculate Optimal Allocation'}</span>
          </button>
        </div>

        {/* Right Column: Sleek Ticket-Stub Style Booking Quote Card (5 cols on lg) */}
        <div className="lg:col-span-5">
          {calculating ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center text-slate-400 text-sm animate-pulse space-y-3">
              <Layers className="w-8 h-8 text-emerald-400 mx-auto animate-bounce" />
              <div>Computing optimal dynamic programming quote...</div>
            </div>
          ) : !quote ? (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 text-center text-slate-500 text-sm space-y-2">
              <Ticket className="w-8 h-8 text-slate-700 mx-auto" />
              <div>Select a venue and group size to generate booking pass.</div>
            </div>
          ) : quote.possible ? (
            /* Ticket-Stub Style Card */
            <div className="relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/50 rounded-3xl shadow-2xl overflow-hidden">
              {/* Top Cinema Marquee */}
              <div className="p-5 sm:p-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                    OPENING NIGHT PASS
                  </span>
                  <h3 className="text-lg font-black text-white">{quote.cinema.name}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Ticket className="w-5 h-5" />
                </div>
              </div>

              {/* Middle Ticket Divider with Semicircle Notches */}
              <div className="relative py-3 flex items-center justify-between">
                {/* Left Notch */}
                <div className="w-4 h-8 bg-slate-950 border-r-2 border-emerald-500/50 rounded-r-full -ml-2" />
                {/* Perforated Line */}
                <div className="flex-1 border-t-2 border-dashed border-slate-800 mx-3" />
                {/* Right Notch */}
                <div className="w-4 h-8 bg-slate-950 border-l-2 border-emerald-500/50 rounded-l-full -mr-2" />
              </div>

              {/* Main Ticket Body */}
              <div className="p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Total Bundles Required
                    </span>
                    <div className="text-4xl font-black text-white tracking-tight mt-0.5">
                      {quote.totalBundles}{' '}
                      <span className="text-sm font-semibold text-emerald-400">
                        {quote.totalBundles === 1 ? 'bundle' : 'bundles'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Exact Group Size
                    </span>
                    <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                      {quote.groupSize} seats
                    </div>
                    <span className="text-[10px] text-emerald-300 font-bold block">
                      (0 seats wasted)
                    </span>
                  </div>
                </div>

                {/* Breakdown List */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Package Purchase Breakdown:
                  </span>
                  <div className="space-y-2">
                    {quote.breakdown?.map((item) => (
                      <div
                        key={item.size}
                        className="flex items-center justify-between p-3 bg-slate-950/90 rounded-xl border border-slate-800/90 font-mono text-sm"
                      >
                        <div className="flex items-center gap-2 text-slate-200">
                          <Package className="w-4 h-4 text-emerald-400" />
                          <span>
                            <span className="font-bold text-white">{item.size}</span>-seat bundle
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                          <span>{item.size} × {item.count}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                          <span className="text-white">{item.size * item.count} seats</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 text-center text-[10px] text-slate-500 font-mono">
                  Verified by DP Unbounded Knapsack Algorithm
                </div>
              </div>
            </div>
          ) : (
            /* "Not Possible" State Ticket Card */
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  Not Possible
                </span>
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">No Exact Seat Match</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  For a party size of <span className="font-bold text-white">{quote.groupSize} seats</span> at{' '}
                  <span className="font-bold text-white">{quote.cinema.name}</span> with seat packages{' '}
                  <span className="font-mono text-amber-400">[{quote.cinema.bundleSizes.join(', ')}]</span>, no
                  exact combination adds up to the group size without empty seats.
                </p>
              </div>

              <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 text-[11px] text-amber-300/80">
                Tip: Try an adjacent group size or select a different cinema venue with complementary bundle sizes.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
