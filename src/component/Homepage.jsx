import React, { useEffect, useState } from "react";
import "./homepage.css";
import { useDispatch, useSelector } from "react-redux";
import {
  setPopular,
  setTopRated,
  setTVPopular,
  setTVTopRated,
  setLoading,
  setError,
} from "../redux/slices/movieSlice";
import { Link } from "react-router-dom";
import HeroCarousel from "./HeroCarousel";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

const API_BASE_URL = "https://api.themoviedb.org/3";

const Homepage = () => {
  const dispatch = useDispatch();
  const { popular, topRated, tvPopular, tvTopRated, isLoading } = useSelector(
    (state) => state.movies
  );
  const [scrolledSections, setScrolledSections] = useState({});

  useEffect(() => {
    const fetchMovies = async () => {
      dispatch(setLoading(true));

      const headers = {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
        },
      };

      try {
        const [popularRes, topRatedRes, tvPopularRes, tvTopRatedRes] =
          await Promise.allSettled([
            fetch(
              `${API_BASE_URL}/movie/popular?language=en-US&page=1`,
              headers
            ),
            fetch(
              `${API_BASE_URL}/movie/top_rated?language=en-US&page=1`,
              headers
            ),
            fetch(`${API_BASE_URL}/tv/popular?language=en-US&page=1`, headers),
            fetch(
              `${API_BASE_URL}/tv/top_rated?language=en-US&page=1`,
              headers
            ),
          ]);

        if (popularRes.status === "fulfilled") {
          const data = await popularRes.value.json();
          dispatch(setPopular(data.results || []));
        } else {
          console.warn("Popular movies failed");
          dispatch(setPopular([]));
        }

        if (topRatedRes.status === "fulfilled") {
          const data = await topRatedRes.value.json();
          dispatch(setTopRated(data.results || []));
        } else {
          console.warn("Top Rated movies failed");
          dispatch(setTopRated([]));
        }

        if (tvPopularRes.status === "fulfilled") {
          const data = await tvPopularRes.value.json();
          dispatch(setTVPopular(data.results || []));
        } else {
          console.warn("Popular TV shows failed");
          dispatch(setTVPopular([]));
        }

        if (tvTopRatedRes.status === "fulfilled") {
          const data = await tvTopRatedRes.value.json();
          dispatch(setTVTopRated(data.results || []));
        } else {
          console.warn("Top Rated TV shows failed");
          dispatch(setTVTopRated([]));
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        dispatch(setError("Something went wrong while fetching data."));
      } finally {
        dispatch(setLoading(false));
        document.getElementById("loader")?.classList.add("fade-out");
        setTimeout(() => {
          const loader = document.getElementById("loader");
          if (loader) loader.remove();
        }, 800);
      }
    };

    fetchMovies();
  }, [dispatch]);

  const scrollLeft = (id) => {
    const container = document.getElementById(id);
    if (container) {
      container.scrollBy({
        left: -container.offsetWidth,
        behavior: "smooth",
      });

      setTimeout(() => {
        const isAtStart = container.scrollLeft - container.offsetWidth <= 0;
        setScrolledSections((prev) => ({
          ...prev,
          [id]: !isAtStart,
        }));
      }, 400);
    }
  };

  const scrollRight = (id) => {
    const container = document.getElementById(id);
    if (container) {
      container.scrollBy({
        left: container.offsetWidth,
        behavior: "smooth",
      });

      setScrolledSections((prev) => ({
        ...prev,
        [id]: true,
      }));
    }
  };

  return (
    <div className='homepage-container'>
      <div className='homepage-header'>
        <h1>Welcome to Goofy Tube</h1>
        <p>
          Explore the latest popular and top-rated movies and TV shows here!
        </p>
      </div>
      <HeroCarousel />

      {isLoading ? (
        <p>Loading content...</p>
      ) : (
        <>
          // inside return (
          {popular.length > 0 && (
            <div className='movie-section'>
              <h1>Popular Movies</h1>
              <div className='carousel-wrapper'>
                {scrolledSections["popular"] && (
                  <button
                    className='carousel-btn prev'
                    onClick={() => scrollLeft("popular")}
                  >
                    <ChevronLeftIcon />
                  </button>
                )}

                <div className='movie-grid' id='popular'>
                  {popular.map((movie) => (
                    <Link
                      to={`/details/movie/${movie.id}`}
                      className='movie-card'
                      key={movie.id}
                    >
                      <img
                        src={
                          movie.poster_path
                            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                            : ""
                        }
                        alt={movie.title}
                      />
                      <div className='movie-overlay'>
                        <h3>{movie.title}</h3>
                        <p>Rating: {movie.vote_average}</p>
                        <p>
                          Released:{" "}
                          {movie.release_date &&
                            new Date(movie.release_date).toLocaleDateString(
                              "en-US",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>

                <button
                  className='carousel-btn next'
                  onClick={() => scrollRight("popular")}
                >
                  <ChevronRightIcon />
                </button>
              </div>
            </div>
          )}
          {topRated.length > 0 && (
            <div className='movie-section'>
              <h1>Top Rated Movies</h1>
              <div className='carousel-wrapper'>
                {scrolledSections["topRated"] && (
                  <button
                    className='carousel-btn prev'
                    onClick={() => scrollLeft("topRated")}
                  >
                    <ChevronLeftIcon />
                  </button>
                )}

                <div className='movie-grid' id='topRated'>
                  {topRated.map((movie) => (
                    <Link
                      to={`/details/movie/${movie.id}`}
                      className='movie-card'
                      key={movie.id}
                    >
                      <img
                        src={
                          movie.poster_path
                            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                            : ""
                        }
                        alt={movie.title}
                      />
                      <div className='movie-overlay'>
                        <h3>{movie.title}</h3>
                        <p>Rating: {movie.vote_average}</p>
                        <p>
                          Released:{" "}
                          {movie.release_date &&
                            new Date(movie.release_date).toLocaleDateString(
                              "en-US",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>

                <button
                  className='carousel-btn next'
                  onClick={() => scrollRight("topRated")}
                >
                  <ChevronRightIcon />
                </button>
              </div>
            </div>
          )}
          {tvPopular.length > 0 && (
            <div className='movie-section'>
              <h1>Popular TV Shows</h1>
              <div className='carousel-wrapper'>
                {scrolledSections["tvPopular"] && (
                  <button
                    className='carousel-btn prev'
                    onClick={() => scrollLeft("tvPopular")}
                  >
                    <ChevronLeftIcon />
                  </button>
                )}

                <div className='movie-grid' id='tvPopular'>
                  {tvPopular.map((show) => (
                    <Link
                      to={`/details/tv/${show.id}`}
                      className='movie-card'
                      key={show.id}
                    >
                      <img
                        src={
                          show.poster_path
                            ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
                            : ""
                        }
                        alt={show.name}
                      />
                      <div className='movie-overlay'>
                        <h3>{show.name}</h3>
                        <p>Rating: {show.vote_average}</p>
                        <p>
                          Released:{" "}
                          {show.first_air_date &&
                            new Date(show.first_air_date).toLocaleDateString(
                              "en-US",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>

                <button
                  className='carousel-btn next'
                  onClick={() => scrollRight("tvPopular")}
                >
                  <ChevronRightIcon />
                </button>
              </div>
            </div>
          )}
          {tvTopRated.length > 0 && (
            <div className='movie-section'>
              <h1>Top Rated TV Shows</h1>
              <div className='carousel-wrapper'>
                {scrolledSections["tvTopRated"] && (
                  <button
                    className='carousel-btn prev'
                    onClick={() => scrollLeft("tvTopRated")}
                  >
                    <ChevronLeftIcon />
                  </button>
                )}

                <div className='movie-grid' id='tvTopRated'>
                  {tvTopRated.map((show) => (
                    <Link
                      to={`/details/tv/${show.id}`}
                      className='movie-card'
                      key={show.id}
                    >
                      <img
                        src={
                          show.poster_path
                            ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
                            : ""
                        }
                        alt={show.name}
                      />
                      <div className='movie-overlay'>
                        <h3>{show.name}</h3>
                        <p>Rating: {show.vote_average}</p>
                        <p>
                          Released:{" "}
                          {show.first_air_date &&
                            new Date(show.first_air_date).toLocaleDateString(
                              "en-US",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>

                <button
                  className='carousel-btn next'
                  onClick={() => scrollRight("tvTopRated")}
                >
                  <ChevronRightIcon />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Homepage;
