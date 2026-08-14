import React, { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { BookmarkX, Camera, LogOut, Trash2 } from "lucide-react";
import MediaCard from "./MediaCard";
import Reveal from "./Reveal";
import { isPlayableType, titleOf } from "../lib/media";
import { useWatchlist } from "../lib/useWatchlist";
import { useAuth } from "../lib/useAuth";

const API_BASE_URL = "https://api.themoviedb.org/3";

const Profile = () => {
  const { user, isAuthenticated, watchlist, toggle } = useWatchlist();
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const imageInputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");

  const persistProfile = (nextUser) => {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    localStorage.setItem(
      "users",
      JSON.stringify(users.map((entry) => entry.email === nextUser.email ? nextUser : entry))
    );
    setUser(nextUser);
  };

  const handleImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImageError("");
    if (!file.type.startsWith("image/")) {
      setImageError("Choose a valid image file.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setImageError("Choose an image smaller than 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setImageError("That image could not be read.");
    reader.onload = () => {
      try {
        persistProfile({ ...user, profileImage: String(reader.result) });
      } catch {
        setImageError("The image could not be saved in this browser.");
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    try {
      const nextUser = { ...user };
      delete nextUser.profileImage;
      persistProfile(nextUser);
      setImageError("");
    } catch {
      setImageError("The profile image could not be removed.");
    }
  };

  const signOut = () => {
    setUser(null);
    navigate("/");
  };

  useEffect(() => {
    if (!isAuthenticated || !watchlist.length) {
      setItems([]);
      setLoading(false);
      setError("");
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError("");
      const results = await Promise.allSettled(
        watchlist.map(async (key) => {
          const [type, id] = key.split(":");
          if (!isPlayableType(type) || !id) throw new Error("Invalid watchlist item");
          const response = await fetch(`${API_BASE_URL}/${type}/${id}?language=en-US`, {
            signal: controller.signal,
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
            },
          });
          if (!response.ok) throw new Error(`TMDB responded ${response.status}`);
          return { ...(await response.json()), media_type: type };
        })
      );
      if (controller.signal.aborted) return;
      const loaded = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
      setItems(loaded);
      if (loaded.length !== watchlist.length) setError("Some saved titles could not be loaded.");
      setLoading(false);
    };
    load().catch((loadError) => {
      if (loadError.name !== "AbortError") {
        setError("Your watch list could not be loaded.");
        setLoading(false);
      }
    });
    return () => controller.abort();
  }, [isAuthenticated, watchlist]);

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return (
    <main className="min-h-[70vh] px-4 pb-16 pt-10 md:px-10">
      <section className="flex flex-col gap-6 border-b border-hairline pb-10 sm:flex-row sm:items-center">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-accent text-white ring-1 ring-hairline-strong">
          {user.profileImage ? <img src={user.profileImage} alt={`${user.name || "User"} profile`} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-3xl font-semibold" aria-hidden="true">{(user.name || "?").charAt(0).toUpperCase()}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Profile</p>
          <h1 className="mt-2 display-title text-h1 text-ink md:text-display">{user.name || "Your profile"}</h1>
          <p className="mt-2 truncate text-body text-muted">{user.email}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImage} className="sr-only" aria-label="Choose profile image" />
            <button type="button" onClick={() => imageInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-caption font-semibold text-white transition hover:bg-accent-hover"><Camera size={15} aria-hidden="true" />{user.profileImage ? "Change image" : "Add profile image"}</button>
            {user.profileImage && <button type="button" onClick={removeImage} className="inline-flex items-center gap-2 rounded-full border border-hairline px-4 py-2 text-caption text-muted transition hover:border-hairline-strong hover:text-ink"><Trash2 size={15} aria-hidden="true" />Remove image</button>}
            <button type="button" onClick={signOut} className="inline-flex items-center gap-2 rounded-full border border-hairline px-4 py-2 text-caption text-muted transition hover:border-hairline-strong hover:text-ink"><LogOut size={15} aria-hidden="true" />Sign out</button>
          </div>
          {imageError && <p role="alert" className="mt-3 text-caption text-accent-hover">{imageError}</p>}
        </div>
      </section>

      <h2 className="mt-10 display-title text-h1 text-ink">My Watch List</h2>
      <p className="mt-3 text-body text-muted">Titles saved to your profile.</p>

      {error && <p role="alert" className="mt-6 rounded-sheet border border-accent/30 bg-accent-soft px-4 py-3 text-caption text-accent-hover">{error}</p>}

      {loading ? (
        <div data-media-layout className="media-grid mt-8 gap-x-4 gap-y-7" aria-label="Loading watch list">
          {Array.from({ length: Math.max(3, watchlist.length) }).map((_, index) => <div key={index} className="media-grid-item"><div className="skeleton aspect-[2/3] rounded-card" /><div className="skeleton mt-2.5 h-3.5 w-3/4 rounded" /></div>)}
        </div>
      ) : items.length ? (
        <div data-media-layout className="media-grid mt-8 gap-x-4 gap-y-8">
          {items.map((item, index) => {
            const itemKey = `${item.media_type}:${item.id}`;
            return (
              <Reveal data-media-slot key={itemKey} delay={Math.min(index, 8) * 40} className="media-grid-item">
                <MediaCard item={item} fallbackType={item.media_type} className="w-full" />
                <button type="button" onClick={() => toggle(itemKey)} aria-label={`Remove ${titleOf(item)} from my watch list`} className="mt-3 inline-flex items-center gap-1.5 text-caption text-faint transition hover:text-accent-hover"><Trash2 size={14} aria-hidden="true" />Remove</button>
              </Reveal>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <BookmarkX size={40} className="text-faint" aria-hidden="true" />
          <h2 className="mt-4 text-h2 text-ink">Your watch list is empty</h2>
          <p className="mt-2 max-w-sm text-body text-muted">Save a movie or series and it will appear here.</p>
        </div>
      )}
    </main>
  );
};

export default Profile;
