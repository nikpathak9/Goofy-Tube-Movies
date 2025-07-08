import React, { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import "videojs-youtube";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Subtitles,
  ArrowLeft,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  setPlaying,
  setMuted,
  setCurrentTime,
  setDuration,
} from "../redux/slices/videoSlice";
import "./video.css";

const VideoPlayer = () => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [playerReady, setPlayerReady] = useState(false);

  const { id, type } = useParams();
  const [trailerUrl, setTrailerUrl] = useState(null);
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaOverview, setMediaOverview] = useState("");
  const [mediaReleaseDate, setMediaReleaseDate] = useState("");
  const [mediaRuntime, setMediaRuntime] = useState("");
  const [mediaGenres, setMediaGenres] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  const [isLoading, setIsLoading] = useState(true);

  const dispatch = useDispatch();
  const { isPlaying, isMuted, currentTime, duration } = useSelector(
    (state) => state.video
  );

  // Fetch trailer and metadata
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [videoRes, metaRes] = await Promise.all([
          fetch(
            `https://api.themoviedb.org/3/${type}/${id}/videos?language=en-US`,
            {
              headers: {
                accept: "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
              },
            }
          ),
          fetch(`https://api.themoviedb.org/3/${type}/${id}?language=en-US`, {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
            },
          }),
        ]);

        const [videoData, metaData] = await Promise.all([
          videoRes.json(),
          metaRes.json(),
        ]);

        if (isMounted) {
          const trailer = videoData.results?.find(
            (vid) => vid.site === "YouTube" && vid.type === "Trailer"
          );
          if (trailer) {
            setTrailerUrl(`https://www.youtube.com/watch?v=${trailer.key}`);
          }
          setMediaTitle(metaData.title || metaData.name);
          setMediaOverview(metaData.overview || "");
          setMediaReleaseDate(metaData.release_date || "");
          setMediaRuntime(metaData.runtime || "");
          setMediaGenres(metaData.genres || []);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [id, type]);

  // Initialize video player
  useEffect(() => {
    if (!trailerUrl) return;

    let player;
    const initializePlayer = () => {
      // Dispose previous player if exists
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }

      player = videojs(videoRef.current, {
        techOrder: ["youtube"],
        autoplay: true,
        muted: false,
        controls: false,
        fluid: true,
        responsive: true,
        loadingSpinner: false,
        aspectRatio: "16:9",
        sources: [
          {
            src: trailerUrl,
            type: "video/youtube",
          },
        ],
        youtube: {
          ytControls: 0,
          enablePrivacyEnhancedMode: true,
        },
      });

      player.ready(() => {
        setPlayerReady(true);
        playerRef.current = player;
        dispatch(setDuration(player.duration() || 0));
      });

      player.on("loadedmetadata", () => {
        dispatch(setDuration(player.duration() || 0));
      });

      player.on("timeupdate", () => {
        dispatch(setCurrentTime(player.currentTime() || 0));
      });

      player.on("play", () => {
        dispatch(setPlaying(true));
      });

      player.on("pause", () => {
        dispatch(setPlaying(false));
      });

      player.on("volumechange", () => {
        dispatch(setMuted(player.muted()));
      });

      player.on("error", () => {
        console.error("Video player error");
        setIsLoading(false);
      });
    };

    // Add slight delay to ensure DOM is ready
    const timer = setTimeout(initializePlayer, 100);

    return () => {
      clearTimeout(timer);
      if (player) {
        player.dispose();
      }
    };
  }, [trailerUrl, dispatch]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/${type}/${id}/recommendations?language=en-US&page=1`,
          {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
            },
          }
        );
        const data = await res.json();
        setRecommendations(data.results || []);
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
      }
    };

    fetchRecommendations();
  }, [id, type]);

  // Handle player source change
  useEffect(() => {
    if (playerReady && playerRef.current && trailerUrl) {
      playerRef.current.src({ type: "video/youtube", src: trailerUrl });
    }
  }, [trailerUrl, playerReady]);

  const togglePlay = () => {
    if (playerRef.current) {
      isPlaying ? playerRef.current.pause() : playerRef.current.play();
    }
  };

  const toggleMute = () => {
    if (playerRef.current) {
      const newMuted = !playerRef.current.muted();
      playerRef.current.muted(newMuted);
      dispatch(setMuted(newMuted));
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    if (playerRef.current) {
      playerRef.current.currentTime(time);
      dispatch(setCurrentTime(time));
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!trailerUrl && !isLoading) {
    return <div className='video-player-container'>No trailer available</div>;
  }

  return (
    <div className='video-player-container'>
      <main className='main-content'>
        <div className='content-wrapper'>
          <div className='video-section'>
            <button
              onClick={() => window.history.back()}
              className='back-button'
            >
              <ArrowLeft /> <span>Back</span>
            </button>
            <div className='video-and-info'>
              <div className='video-container'>
                <div className='video-wrapper'>
                  <div data-vjs-player>
                    <video
                      ref={videoRef}
                      className='video-js vjs-default-skin video-element'
                      playsInline
                      data-setup='{}'
                    />
                  </div>
                  {isLoading && (
                    <div className='loading-spinner'>
                      <div className='spinner'></div>
                    </div>
                  )}
                  <div className='custom-controls'>
                    <div className='controls-content'>
                      <button onClick={togglePlay} className='control-button'>
                        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <button onClick={toggleMute} className='control-button'>
                        {isMuted ? (
                          <>
                            <VolumeX size={16} />
                          </>
                        ) : (
                          <>
                            <Volume2 size={16} />
                          </>
                        )}
                      </button>
                      <input
                        type='range'
                        min='0'
                        max={duration || 0}
                        value={currentTime}
                        onChange={handleSeek}
                        step='0.1'
                        className='seek-slider'
                      />
                      <span className='time-display'>
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                      <button
                        className='control-button'
                        onClick={() => {
                          if (playerRef.current) {
                            if (playerRef.current.isFullscreen()) {
                              playerRef.current.exitFullscreen();
                            } else {
                              playerRef.current.requestFullscreen();
                            }
                          }
                        }}
                      >
                        <Maximize2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className='video-info'>
                <h2 className='video-title'>{mediaTitle}</h2>
                <div className='video-description'>
                  <p>{mediaOverview}</p>
                  <p className=''>Release Date: {mediaReleaseDate}</p>
                  <p className=''>Runtime: {mediaRuntime} minutes</p>
                  <p className=''>
                    Genres: {mediaGenres?.map((genre) => genre.name).join(", ")}
                  </p>
                </div>
              </div>
            </div>
            {recommendations.length > 0 && (
              <div className='recommendations-section'>
                <h2 className='section-title'>Recommended for You</h2>
                <div className='recommendation-scroll'>
                  {recommendations.map((movie) => (
                    <Link
                      to={`/details/${type}/${movie.id}`}
                      key={movie.id}
                      className='movie-card'
                    >
                      <img
                        src={
                          movie.poster_path
                            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                            : "/fallback.jpg"
                        }
                        alt={movie.title || movie.name}
                      />
                      <div className='movie-overlay'>
                        <h3>{movie.title || movie.name}</h3>
                        <p>Rating: {movie.vote_average}</p>
                        <p>
                          Released:{" "}
                          {(movie.release_date || movie.first_air_date) &&
                            new Date(
                              movie.release_date || movie.first_air_date
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
        </div>
      </main>
    </div>
  );
};

export default VideoPlayer;
