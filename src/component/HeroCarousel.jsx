import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./hero.css";

const HeroCarousel = () => {
  const [movies, setMovies] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPopularMovies = async () => {
      try {
        const res = await fetch(
          "https://api.themoviedb.org/3/movie/popular?language=en-US&page=1",
          {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
            },
          }
        );
        const data = await res.json();
        setMovies((data.results || []).slice(0, 5));
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch popular movies:", err);
        setLoading(false);
      }
    };

    fetchPopularMovies();
  }, []);

  useEffect(() => {
    if (movies.length === 0) return;

    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % movies.length);
    }, 5000); // 5000ms = 5 seconds

    return () => clearInterval(interval); // cleanup
  }, [movies]);

  const goToSlide = (index) => {
    if (index >= 0 && index < movies.length) {
      setActiveIndex(index);
    }
  };

  const handlePrev = () => goToSlide(activeIndex - 1);
  const handleNext = () => goToSlide(activeIndex + 1);
  const handleClick = (id) => navigate(`/details/movie/${id}`);

  if (loading) {
    return <div className='carousel-loader'>Loading...</div>;
  }

  return (
    <div className='hero-carousel'>
      {movies.length > 0 && (
        <>
          <div
            className='carousel-slides'
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {movies.map((movie, index) => (
              <div
                key={movie.id}
                className={`carousel-slide ${
                  index === activeIndex ? "active" : ""
                }`}
                onClick={() => handleClick(movie.id)}
                style={{
                  backgroundImage: `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})`,
                }}
              >
                <div className='carousel-caption'>
                  <h2>{movie.title}</h2>
                  <p>{movie.overview.slice(0, 150)}...</p>
                </div>
              </div>
            ))}
          </div>

          <button className='carousel-arrow left' onClick={handlePrev}>
            ❮
          </button>
          <button className='carousel-arrow right' onClick={handleNext}>
            ❯
          </button>

          <div className='carousel-dots'>
            {movies.map((_, idx) => (
              <span
                key={idx}
                className={`dot ${idx === activeIndex ? "active" : ""}`}
                onClick={() => goToSlide(idx)}
              ></span>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HeroCarousel;
