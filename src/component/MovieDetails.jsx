import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, StarIcon } from "lucide-react";
import "./details.css";
import { Link } from "react-router-dom";

const MovieDetails = () => {
  const { id, type } = useParams();
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trailerUrl, setTrailerUrl] = useState(null);
  const [cast, setCast] = useState([]);
  const [directors, setDirectors] = useState([]); // Store directors
  const [recommendations, setRecommendations] = useState([]);
  const [images, setImages] = useState([]);
  const [episodeCount, setEpisodeCount] = useState(null); // For TV shows
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDetails = async () => {
      const cacheKey = `media_${type}_${id}`;
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const { media, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < 3600 * 1000) {
          // 1 hour cache
          setMedia(media);
          setLoading(false);
          return;
        }
      }

      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/${type}/${id}?language=en-US`,
          {
            method: "GET",
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
            },
          }
        );
        const data = await res.json();
        setMedia(data);
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ media: data, timestamp: Date.now() })
        );
      } catch (err) {
        console.error("Failed to fetch media details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id, type]);

  useEffect(() => {
    const fetchEpisodeCount = async () => {
      if (type !== "tv" || !media?.seasons) return;

      try {
        let totalEpisodes = 0;
        for (const season of media.seasons) {
          const cacheKey = `season_${type}_${id}_${season.season_number}`;
          const cachedData = localStorage.getItem(cacheKey);
          if (cachedData) {
            const { episodes, timestamp } = JSON.parse(cachedData);
            if (Date.now() - timestamp < 3600 * 1000) {
              totalEpisodes += episodes.length;
              continue;
            }
          }
          const res = await fetch(
            `https://api.themoviedb.org/3/tv/${id}/season/${season.season_number}?language=en-US`,
            {
              headers: {
                accept: "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
              },
            }
          );
          const data = await res.json();
          totalEpisodes += data.episodes?.length || 0;
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              episodes: data.episodes || [],
              timestamp: Date.now(),
            })
          );
        }
        setEpisodeCount(totalEpisodes);
      } catch (err) {
        console.error("Failed to fetch season details:", err);
        setEpisodeCount("Unknown");
      }
    };

    if (media) fetchEpisodeCount();
  }, [id, type, media]);

  useEffect(() => {
    const fetchImages = async () => {
      const cacheKey = `images_${type}_${id}`;
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const { images, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < 3600 * 1000) {
          setImages(images);
          return;
        }
      }

      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/${type}/${id}/images`,
          {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
            },
          }
        );
        const data = await res.json();
        const backdrops = data.backdrops?.slice(0, 10) || [];
        setImages(backdrops);
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ images: backdrops, timestamp: Date.now() })
        );
      } catch (err) {
        console.error("Failed to fetch images:", err);
      }
    };

    fetchImages();
  }, [type, id]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      const cacheKey = `recommendations_${type}_${id}`;
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const { recommendations, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < 3600 * 1000) {
          setRecommendations(recommendations);
          return;
        }
      }

      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/${type}/${id}/recommendations`,
          {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
            },
          }
        );
        const data = await res.json();
        const results = data.results || [];
        setRecommendations(results);
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ recommendations: results, timestamp: Date.now() })
        );
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
      }
    };

    fetchRecommendations();
  }, [type, id]);

  useEffect(() => {
    const fetchCastAndDirectors = async () => {
      const cacheKey = `credits_${type}_${id}`;
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const { cast, directors, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < 3600 * 1000) {
          setCast(cast);
          setDirectors(directors);
          return;
        }
      }

      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/${type}/${id}/credits`,
          {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
            },
          }
        );
        const data = await response.json();
        const castData = data.cast?.slice(0, 12) || [];
        let directorsData = [];

        if (type === "movie") {
          // Use provided logic for movies
          directorsData =
            data.crew?.filter(({ job }) => job === "Director") || [];
        } else {
          // For TV shows, use broader filter to catch directors
          directorsData =
            data.crew?.filter(
              ({ job, known_for_department }) =>
                job === "Director" || known_for_department === "Directing"
            ) || [];
        }

        setCast(castData);
        setDirectors(directorsData);
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            cast: castData,
            directors: directorsData,
            timestamp: Date.now(),
          })
        );
      } catch (err) {
        console.error("Error fetching cast and directors:", err);
      }
    };

    fetchCastAndDirectors();
  }, [id, type]);

  useEffect(() => {
    const fetchVideo = async () => {
      const cacheKey = `trailer_${type}_${id}`;
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const { trailerUrl, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < 3600 * 1000) {
          setTrailerUrl(trailerUrl);
          return;
        }
      }

      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/${type}/${id}/videos?language=en-US`,
          {
            method: "GET",
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
            },
          }
        );
        const data = await res.json();
        const trailer = data.results?.find(
          (video) =>
            video.type === "Trailer" && video.site === "YouTube" && video.key
        );
        const url = trailer
          ? `https://www.youtube.com/watch?v=${trailer.key}`
          : null;
        setTrailerUrl(url);
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ trailerUrl: url, timestamp: Date.now() })
        );
      } catch (err) {
        console.error("Failed to fetch trailer:", err);
      }
    };

    fetchVideo();
  }, [id, type]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "Unknown";
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear();
    const getDaySuffix = (d) => {
      if (d > 3 && d < 21) return "th";
      switch (d % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    };
    return `${day}${getDaySuffix(day)} ${month} ${year}`;
  };

  const formatRuntime = (minutes) => {
    if (!minutes) return "Unknown";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatCurrency = (amount) => {
    if (!amount) return "Unknown";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className='loader-screen'>
        <div className='loader-content'>
          <div className='film-spinner'>
            <div className='reel-circle'></div>
            <div className='reel-circle'></div>
            <div className='reel-circle'></div>
            <div className='reel-hole'></div>
          </div>
          <p className='loading-text'>Loading {type} details...</p>
        </div>
      </div>
    );
  }

  if (!media) return <p>No {type} found.</p>;

  return (
    <div
      className='details-container'
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.6), rgba(0,0,0,0.95)), url(https://image.tmdb.org/t/p/original${
          media.backdrop_path || media.poster_path || "/fallback.jpg"
        })`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <button onClick={() => window.history.back()} className='back-button'>
        <ArrowLeft /> <span>Back</span>
      </button>

      <div className='details-header'>
        <img
          src={
            media.poster_path
              ? `https://image.tmdb.org/t/p/w500${media.poster_path}`
              : "/fallback.jpg"
          }
          alt={media.title || media.name}
          className='details-poster'
        />

        <div className='details-info'>
          <h1>{media.title || media.name}</h1>
          <p>
            <strong>Tagline:</strong> {media.tagline || "Not available"}
          </p>
          <p>
            <strong>Release Date:</strong>{" "}
            {formatDate(media.release_date || media.first_air_date)}
          </p>
          <p className='imdb'>
            <strong>IMDb Rating:</strong>
            <StarIcon size={20} className='imdb-icon' color='#FFD700' />
            {media.vote_average.toFixed(1)}/10 ({media.vote_count} votes)
          </p>
          <p>
            <strong>Genres:</strong>{" "}
            {media.genres?.map((genre) => genre.name).join(", ") ||
              "Not specified"}
          </p>
          {type === "tv" ? (
            <>
              <p>
                <strong>Number of Seasons:</strong>{" "}
                {media.number_of_seasons || "Unknown"}
              </p>
              <p>
                <strong>Total Episodes:</strong>{" "}
                {episodeCount ?? "Calculating..."}
              </p>
              <p>
                <strong>Episode Runtime:</strong>{" "}
                {media.episode_run_time?.length
                  ? formatRuntime(media.episode_run_time[0])
                  : "Unknown"}
              </p>
              <p>
                <strong>Network:</strong>{" "}
                {media.networks?.map((n) => n.name).join(", ") ||
                  "Not specified"}
              </p>
            </>
          ) : (
            <>
              <p>
                <strong>Runtime:</strong> {formatRuntime(media.runtime)}
              </p>
              <p>
                <strong>Budget:</strong> {formatCurrency(media.budget)}
              </p>
              <p>
                <strong>Revenue:</strong> {formatCurrency(media.revenue)}
              </p>
              <p>
                <strong>Production Companies:</strong>{" "}
                {media.production_companies?.map((c) => c.name).join(", ") ||
                  "Not specified"}
              </p>
            </>
          )}
          <p>
            <strong>Status:</strong> {media.status || "Not specified"}
          </p>
          <p>
            <strong>Original Language:</strong>{" "}
            {media.original_language?.toUpperCase() || "Not specified"}
          </p>
          <p>
            <strong>Director:</strong>{" "}
            {directors.length > 0
              ? directors.map((d) => d.name).join(", ")
              : "Not specified"}
          </p>
          <p>
            <strong>Overview:</strong>
            <br />
            {media.overview || "No overview available."}
          </p>
          {trailerUrl ? (
            <button
              className='watch-button'
              onClick={() => navigate(`/watch/${type}/${id}`)}
            >
              Watch Trailer
            </button>
          ) : (
            <strong>No trailer available.</strong>
          )}
        </div>
      </div>

      {images.length > 0 && (
        <div className='extra-photos-section'>
          <h2>Gallery</h2>
          <div className='extra-photos-scroll'>
            {images.map((img, i) => (
              <img
                key={i}
                src={`https://image.tmdb.org/t/p/w500${img.file_path}`}
                alt='Media still'
                className='extra-photo'
                loading='lazy'
              />
            ))}
          </div>
        </div>
      )}

      {cast.length > 0 && (
        <div className='cast-section'>
          <h2>Top Cast</h2>
          <div className='cast-grid'>
            {cast.map((actor) => (
              <div className='cast-card' key={actor.id}>
                <img
                  src={
                    actor.profile_path
                      ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                      : "/fallback.jpg"
                  }
                  alt={actor.name}
                  loading='lazy'
                />
                <p className='actor-name'>{actor.name}</p>
                <p className='character-name'>{actor.character}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className='recommendations-section' style={{ marginTop: "3rem" }}>
          <h2 className='section-title'>Recommended for You</h2>
          <div className='recommendation-scroll'>
            {recommendations.map((item) => (
              <Link
                to={`/details/${type}/${item.id}`}
                key={item.id}
                className='movie-card'
              >
                <img
                  src={
                    item.poster_path
                      ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                      : "/fallback.jpg"
                  }
                  alt={item.title || item.name}
                  loading='lazy'
                />
                <div className='movie-overlay'>
                  <h3>{item.title || item.name}</h3>
                  <p>Rating: {item.vote_average}</p>
                  <p>
                    Released:{" "}
                    {(item.release_date || item.first_air_date) &&
                      new Date(
                        item.release_date || item.first_air_date
                      ).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieDetails;
