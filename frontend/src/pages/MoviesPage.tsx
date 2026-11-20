import React, { useEffect, useState, useMemo } from 'react';
import {
  Film,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  AlertCircle,
  X,
  Edit2,
  Check,
  Search,
  Image,
} from 'lucide-react';
import { fetchMovies, createMovie, updateMovie, Movie } from '../api/client';
import { MoviePoster } from '../components/MoviePoster';
import { setCustomPoster } from '../utils/posters';

export const MoviesPage: React.FC = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'watched' | 'unwatched'>('all');

  // Add Movie Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newYear, setNewYear] = useState<number | ''>(2026);
  const [newRuntime, setNewRuntime] = useState<number | ''>(120);
  const [newCustomPosterUrl, setNewCustomPosterUrl] = useState('');
  const [newPrereqIds, setNewPrereqIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Edit Prerequisites state
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [editPrereqIds, setEditPrereqIds] = useState<string[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMovies();
      setMovies(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load movie catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleWatched = async (movie: Movie, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const updated = await updateMovie(movie.id, { watched: !movie.watched });
      setMovies((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err: any) {
      alert(`Could not update watch status: ${err.message}`);
    }
  };

  const handleCreateMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newTitle.trim()) {
      setFormError('Movie title is required.');
      return;
    }
    if (typeof newYear !== 'number' || isNaN(newYear)) {
      setFormError('Please enter a valid release year.');
      return;
    }
    if (typeof newRuntime !== 'number' || newRuntime < 1 || newRuntime > 300) {
      setFormError('Runtime must be an integer between 1 and 300 minutes.');
      return;
    }

    try {
      setSubmitting(true);
      const created = await createMovie({
        title: newTitle.trim(),
        releaseYear: newYear,
        runtimeMinutes: newRuntime,
        prerequisiteIds: newPrereqIds,
      });

      // Save optional custom poster in localStorage
      if (newCustomPosterUrl.trim()) {
        setCustomPoster(created.id, newCustomPosterUrl.trim());
      }

      setMovies((prev) => [...prev, created]);
      setNewTitle('');
      setNewYear(2026);
      setNewRuntime(120);
      setNewCustomPosterUrl('');
      setNewPrereqIds([]);
      setShowAddModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create movie.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePrerequisites = async () => {
    if (!editingMovie) return;
    setEditError(null);
    setEditSaving(true);

    try {
      const updated = await updateMovie(editingMovie.id, {
        prerequisiteIds: editPrereqIds,
      });

      setMovies((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setEditingMovie(null);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update prerequisites.');
    } finally {
      setEditSaving(false);
    }
  };

  const openEditModal = (movie: Movie) => {
    setEditingMovie(movie);
    setEditPrereqIds(movie.prerequisites.map((p) => p.id));
    setEditError(null);
  };

  // Filter and search logic
  const filteredMovies = useMemo(() => {
    return movies.filter((movie) => {
      const matchesSearch =
        movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movie.releaseYear.toString().includes(searchQuery);

      if (!matchesSearch) return false;

      if (filterStatus === 'watched') return movie.watched;
      if (filterStatus === 'unwatched') return !movie.watched;
      return true;
    });
  }, [movies, searchQuery, filterStatus]);

  const watchedCount = movies.filter((m) => m.watched).length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Film className="w-8 h-8 text-emerald-400" />
            MCU Movies &amp; Prerequisites
          </h1>
          <p className="text-slate-400 mt-1 text-xs sm:text-sm">
            Curate your cinematic roadmap, configure prerequisite graphs, and track watch progress.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAddModal(true);
            setFormError(null);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-xs tracking-wide shadow-lg shadow-emerald-950/50 hover:shadow-emerald-500/25 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Movie</span>
        </button>
      </div>

      {/* Global Error Alert */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Search, Filter Tabs & Metrics Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900/40 p-3 sm:p-4 rounded-2xl border border-slate-800/80">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search titles or year..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800/90 text-xs font-semibold">
            {(['all', 'watched', 'unwatched'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                  filterStatus === status
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Catalog Counter */}
          <span className="hidden sm:inline-block px-3 py-1.5 bg-slate-950/60 rounded-xl text-xs font-mono text-slate-400 border border-slate-800/60">
            <span className="text-emerald-400 font-bold">{watchedCount}</span> / {movies.length} Watched
          </span>
        </div>
      </div>

      {/* Movie Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4 space-y-3 animate-pulse"
            >
              <div className="aspect-[2/3] w-full bg-slate-800/60 rounded-xl" />
              <div className="h-4 bg-slate-800 rounded w-3/4" />
              <div className="h-3 bg-slate-850 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredMovies.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/20 rounded-2xl border border-slate-800/60 space-y-3">
          <Film className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Movies Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No movie matching "${searchQuery}". Try clearing search.`
              : 'Your catalog is empty. Click "Add Movie" above to add titles.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredMovies.map((movie) => (
            <div
              key={movie.id}
              className="group bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-emerald-950/20 transition-all duration-300 flex flex-col justify-between"
            >
              {/* Poster Container with Top-Right Watched Toggle */}
              <div className="relative">
                <MoviePoster
                  movieId={movie.id}
                  title={movie.title}
                  releaseYear={movie.releaseYear}
                  runtimeMinutes={movie.runtimeMinutes}
                  className="rounded-t-2xl rounded-b-none"
                />

                {/* Floating Watched Pill Button */}
                <button
                  type="button"
                  onClick={(e) => handleToggleWatched(movie, e)}
                  title={movie.watched ? 'Mark as Unwatched' : 'Mark as Watched'}
                  className={`absolute top-3 right-3 z-20 px-2.5 py-1.5 rounded-full text-[11px] font-bold backdrop-blur-md transition-all flex items-center gap-1.5 shadow-lg ${
                    movie.watched
                      ? 'bg-emerald-500/90 text-slate-950 shadow-emerald-950/80 hover:bg-emerald-400'
                      : 'bg-slate-950/80 hover:bg-slate-900 text-slate-300 border border-white/20'
                  }`}
                >
                  {movie.watched ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Watched</span>
                    </>
                  ) : (
                    <>
                      <Circle className="w-3.5 h-3.5 text-slate-400" />
                      <span>Unwatched</span>
                    </>
                  )}
                </button>
              </div>

              {/* Card Body Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="font-bold text-white text-base leading-snug group-hover:text-emerald-300 transition-colors line-clamp-2">
                    {movie.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" /> {movie.releaseYear}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" /> {movie.runtimeMinutes}m
                    </span>
                  </div>

                  {/* Prerequisites Tag Chips */}
                  <div className="mt-3">
                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                      Prerequisites ({movie.prerequisites.length})
                    </div>
                    {movie.prerequisites.length === 0 ? (
                      <span className="text-[11px] text-slate-500 italic block">None (Stand-alone)</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {movie.prerequisites.map((p) => (
                          <span
                            key={p.id}
                            className="text-[10px] bg-slate-950 text-slate-300 px-2 py-0.5 rounded-md border border-slate-800 font-medium truncate max-w-[140px]"
                            title={p.title}
                          >
                            {p.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-600 font-mono">#{movie.id.slice(0, 6)}</span>
                  <button
                    type="button"
                    onClick={() => openEditModal(movie)}
                    className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 font-semibold text-xs transition-colors py-1 px-2 rounded-lg hover:bg-emerald-500/10"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Prerequisites</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Movie Modal / Bottom Sheet */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-white">Create New MCU Title</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateMovie} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Movie Title</label>
                <input
                  type="text"
                  placeholder="e.g. Shang-Chi and the Legend of the Ten Rings"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Release Year</label>
                  <input
                    type="number"
                    value={newYear}
                    onChange={(e) =>
                      setNewYear(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                    }
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Runtime (1–300 min)</label>
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={newRuntime}
                    onChange={(e) =>
                      setNewRuntime(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                    }
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    required
                  />
                </div>
              </div>

              {/* Optional Custom Poster URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5 text-slate-400" />
                  <span>Custom Poster Image URL (Optional)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://image.tmdb.org/t/p/... (saved locally in browser)"
                  value={newCustomPosterUrl}
                  onChange={(e) => setNewCustomPosterUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Leaves backend schema untouched. Falls back to beautiful custom gradient if left blank.
                </span>
              </div>

              {/* Prerequisite Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Required Prerequisites (Watched First)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-900 rounded-xl border border-slate-800">
                  {movies.map((m) => {
                    const isSelected = newPrereqIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setNewPrereqIds(newPrereqIds.filter((id) => id !== m.id));
                          } else {
                            setNewPrereqIds([...newPrereqIds, m.id]);
                          }
                        }}
                        className={`text-left p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 font-semibold'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span className="truncate">{m.title}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/50 disabled:opacity-50"
                >
                  {submitting ? 'Creating Movie...' : 'Save Movie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Prerequisites Modal / Bottom Sheet */}
      {editingMovie && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Prerequisites Configuration</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Editing prerequisites for <span className="text-emerald-400 font-semibold">&ldquo;{editingMovie.title}&rdquo;</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMovie(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Banner (Including 409 CIRCULAR_DEPENDENCY) */}
            {editError && (
              <div className="p-3.5 bg-red-500/15 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-start gap-2.5 shadow-lg">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <div>
                  <span className="font-bold block text-red-300">Circular Dependency Blocked</span>
                  <span>{editError}</span>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-400">
              Select all movies that must be watched before {editingMovie.title}. The graph algorithm
              validates that no circular dependencies can occur.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 bg-slate-900 rounded-xl border border-slate-800">
              {movies
                .filter((m) => m.id !== editingMovie.id)
                .map((m) => {
                  const isChecked = editPrereqIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setEditPrereqIds(editPrereqIds.filter((id) => id !== m.id));
                        } else {
                          setEditPrereqIds([...editPrereqIds, m.id]);
                        }
                      }}
                      className={`text-left p-3 rounded-lg border text-xs flex items-center justify-between transition-all ${
                        isChecked
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 font-semibold'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-white">{m.title}</div>
                        <div className="text-[10px] text-slate-500">{m.releaseYear} • {m.runtimeMinutes}m</div>
                      </div>
                      {isChecked && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-1.5" />}
                    </button>
                  );
                })}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingMovie(null)}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePrerequisites}
                disabled={editSaving}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/50 disabled:opacity-50"
              >
                {editSaving ? 'Validating Graph...' : 'Apply Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
