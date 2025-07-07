import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./searchpage.css";

const SearchPage = () => {
  const { query } = useParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSearchResults = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(
            query
          )}&language=en-US&page=1&include_adult=false`,
          {
            method: "GET",
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
            },
          }
        );
        const data = await res.json();
        setResults(
          data.results?.filter(
            (item) => item.poster_path || item.backdrop_path
          ) || []
        );
      } catch (error) {
        console.error("Error fetching search results", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query]);

  return (
    <div className='search-page'>
      <div className='search-heading-container'>
        <h2 className='search-heading'>
          Search results for "{decodeURIComponent(query)}"
        </h2>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : results.length === 0 ? (
        <p>No results found.</p>
      ) : (
        <div className='search-grid-container'>
          {results.map((item) => (
            <Link
              to={`/details/${item.media_type}/${item.id}`}
              key={item.id}
              className='search-card'
            >
              <img
                src={`https://image.tmdb.org/t/p/w500/${
                  item.poster_path || item.backdrop_path
                }`}
                alt={item.title || item.name}
              />
              <div className='search-card-overlay'>
                <h3>{item.title || item.name}</h3>
                <p>Rating: {item.vote_average}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
