import React, { useEffect, useState } from 'react';
import {
  ListOrdered,
  CheckCircle,
  Circle,
  Clock,
  Sparkles,
  AlertCircle,
  Check,
  PlayCircle,
} from 'lucide-react';
import {
  fetchMovies,
  fetchRewatchOrder,
  updateMovie,
  Movie,
  RewatchOrderResponse,
} from '../api/client';
import { MoviePoster } from '../components/MoviePoster';

export const RewatchPlanPage: React.FC = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedMovieId, setSelectedMovieId] = useState<string>('');
  const [plan, setPlan] = useState<RewatchOrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load catalog
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const data = await fetchMovies();
        setMovies(data);

        // Prefer Avengers: Doomsday or the last movie as default
        const doomsday = data.find((m) => m.title.toLowerCase().includes('doomsday'));
        const defaultTarget = doomsday ? doomsday.id : data[data.length - 1]?.id || '';
        setSelectedMovieId(defaultTarget);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch movies catalog');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Compute rewatch order when selectedMovieId changes
  const loadPlan = async (targetId: string) => {
    if (!targetId) return;
    try {
      setCalculating(true);
      setError(null);
      const res = await fetchRewatchOrder(targetId);
      setPlan(res);
    } catch (err: any) {
      setError(err.message || 'Failed to compute rewatch plan');
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    if (selectedMovieId) {
      loadPlan(selectedMovieId);
    }
  }, [selectedMovieId]);

  // Toggle watch status directly from rewatch order list
  const handleToggleWatched = async (prereqMovieId: string, currentStatus: boolean) => {
    try {
      await updateMovie(prereqMovieId, { watched: !currentStatus });
      // Reload plan to recalculate stats immediately
      if (selectedMovieId) {
        await loadPlan(selectedMovieId);
      }
    } catch (err: any) {
      alert(`Could not update watch status: ${err.message}`);
    }
  };

  const percentage =
    plan && plan.totalMovies > 0
      ? Math.round((plan.watchedCount / plan.totalMovies) * 100)
      : 0;

  const formatHoursMinutes = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const selectedMovie = movies.find((m) => m.id === selectedMovieId);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="pb-6 border-b border-slate-800/80">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <ListOrdered className="w-8 h-8 text-emerald-400" />
          MCU Rewatch Roadmap
        </h1>
        <p className="text-slate-400 mt-1 text-xs sm:text-sm">
          Select any destination movie to compute its complete topological sequence and catch-up time.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Hero Destination Card with Poster & Progress */}
      <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 border border-slate-800/90 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
          {/* Target Movie Poster */}
          {selectedMovie && (
            <div className="w-36 sm:w-44 shrink-0 shadow-2xl rounded-2xl border-2 border-emerald-500/40">
              <MoviePoster
                movieId={selectedMovie.id}
                title={selectedMovie.title}
                releaseYear={selectedMovie.releaseYear}
                runtimeMinutes={selectedMovie.runtimeMinutes}
              />
            </div>
          )}

          {/* Controls & Metrics */}
          <div className="flex-1 w-full space-y-5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 block mb-1.5">
                Target Destination
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <select
                  value={selectedMovieId}
                  onChange={(e) => setSelectedMovieId(e.target.value)}
                  disabled={loading || movies.length === 0}
                  className="w-full sm:w-80 bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-white font-bold text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                >
                  {movies.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} ({m.releaseYear})
                    </option>
                  ))}
                </select>

                {selectedMovie && (
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
                    <span>{selectedMovie.releaseYear}</span>
                    <span>•</span>
                    <span>{selectedMovie.runtimeMinutes} mins</span>
                  </div>
                )}
              </div>
            </div>

            {/* Metrics Grid */}
            {plan && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
                <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Watch Progress
                  </span>
                  <div className="text-base sm:text-xl font-extrabold text-emerald-400 mt-1 flex items-center gap-1.5">
                    <span>{plan.watchedCount} of {plan.totalMovies}</span>
                  </div>
                </div>

                <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Remaining Time
                  </span>
                  <div className="text-base sm:text-xl font-extrabold text-amber-400 mt-1 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>{formatHoursMinutes(plan.totalUnwatchedRuntimeMinutes)}</span>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Readiness
                  </span>
                  <div className="text-base sm:text-xl font-extrabold text-teal-300 mt-1">
                    {percentage}% Ready
                  </div>
                </div>
              </div>
            )}

            {/* Sleek Animated Progress Bar */}
            {plan && plan.totalMovies > 0 && (
              <div className="space-y-1.5">
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full transition-all duration-700 ease-out shadow-sm"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>Start Catch-Up</span>
                  <span>{plan.unwatchedCount} movies left ({plan.totalUnwatchedRuntimeMinutes}m)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vertical Numbered Rewatch Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-emerald-400" />
            <span>Optimal Topological Rewatch Sequence</span>
          </h2>
          {plan && plan.totalMovies > 0 && (
            <span className="text-xs text-slate-500 font-mono">
              {plan.totalMovies} {plan.totalMovies === 1 ? 'prerequisite' : 'prerequisites'}
            </span>
          )}
        </div>

        {calculating ? (
          <div className="p-12 text-center text-slate-400 text-sm bg-slate-900/30 rounded-2xl border border-slate-800/80">
            Calculating topological graph order...
          </div>
        ) : !plan || plan.orderedMovies.length === 0 ? (
          /* Empty state for movies with 0 prerequisites */
          <div className="text-center py-16 px-4 bg-slate-900/30 rounded-3xl border border-slate-800/80 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">No Prerequisites Required!</h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              This title has zero prerequisites. You are completely ready to watch it immediately
              without missing any backstory!
            </p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-4">
            {/* Continuous Vertical Timeline Line */}
            <div className="absolute left-3 sm:left-4 top-4 bottom-6 w-0.5 bg-gradient-to-b from-emerald-500 via-teal-500/40 to-slate-800" />

            {plan.orderedMovies.map((item, index) => (
              <div key={item.id} className="relative flex items-center gap-4 group">
                {/* Timeline Step Node Circle */}
                <div
                  className={`absolute -left-6 sm:-left-8 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black z-10 transition-transform group-hover:scale-110 ${
                    item.watched
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/50'
                      : 'bg-slate-900 text-slate-400 border border-slate-700'
                  }`}
                >
                  {item.watched ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : index + 1}
                </div>

                {/* Timeline Item Card */}
                <div
                  className={`flex-1 p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    item.watched
                      ? 'bg-slate-900/40 border-slate-800/60 opacity-75 hover:opacity-100'
                      : 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/40 shadow-lg'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Mini Poster Thumbnail */}
                    <div className="w-12 sm:w-14 aspect-[2/3] shrink-0 rounded-lg overflow-hidden border border-slate-800 shadow-sm">
                      <MoviePoster
                        movieId={item.id}
                        title={item.title}
                        releaseYear={item.releaseYear}
                        runtimeMinutes={item.runtimeMinutes}
                      />
                    </div>

                    <div>
                      <h4
                        className={`font-bold text-sm sm:text-base leading-snug ${
                          item.watched ? 'text-slate-400 line-through' : 'text-white'
                        }`}
                      >
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2.5 text-xs text-slate-400 mt-1 font-mono">
                        <span>{item.releaseYear}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" /> {item.runtimeMinutes}m
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Watched Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleWatched(item.id, item.watched)}
                    className={`shrink-0 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      item.watched
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {item.watched ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                        <span className="hidden sm:inline">Watched</span>
                      </>
                    ) : (
                      <>
                        <Circle className="w-4 h-4 text-slate-500" />
                        <span className="hidden sm:inline">Mark Watched</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
