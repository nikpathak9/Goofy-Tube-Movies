import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "./details.css";

const MovieDetails = () => {
  const { id, type } = useParams();
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trailerUrl, setTrailerUrl] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVideo = async () => {
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
        if (trailer) {
          setTrailerUrl(`https://www.youtube.com/watch?v=${trailer.key}`);
        }
      } catch (err) {
        console.error("Failed to fetch trailer:", err);
      }
    };

    fetchVideo();
  }, [id, type]);

  useEffect(() => {
    const fetchDetails = async () => {
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
      } catch (err) {
        console.error("Failed to fetch media details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id, type]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "Unknown date";
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
          <p className='loading-text'>Loading movie details...</p>
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
          media.backdrop_path || media.poster_path
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
            <strong>Release Date:</strong>{" "}
            {formatDate(media.release_date || media.first_air_date)}
          </p>
          <p>
            <strong>Rating:</strong> {media.vote_average?.toFixed(1) || "N/A"}
            /10
          </p>
          <p>
            <strong>Genres:</strong>{" "}
            {media.genres?.map((genre) => genre.name).join(", ") ||
              "Not specified"}
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
    </div>
  );
};

export default MovieDetails;
