import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { setSelectedGenre } from "../redux/slices/movieSlice";
import { FileTerminalIcon, Filter, FilterIcon } from "lucide-react";

const GenreFilter = () => {
  const [genres, setGenres] = useState([]);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchGenres = async () => {
      const movieRes = await fetch(
        `https://api.themoviedb.org/3/genre/movie/list`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
            accept: "application/json",
          },
        }
      );
      const tvRes = await fetch(`https://api.themoviedb.org/3/genre/tv/list`, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
          accept: "application/json",
        },
      });

      const movieGenres = (await movieRes.json()).genres.map((g) => ({
        ...g,
        type: "movie",
      }));
      const tvGenres = (await tvRes.json()).genres.map((g) => ({
        ...g,
        type: "tv",
      }));
      setGenres([
        { id: null, name: "All", type: null },
        ...movieGenres,
        ...tvGenres,
      ]);
    };

    fetchGenres();
  }, []);

  const handleChange = (e) => {
    const [id, type] = e.target.value.split("|");
    dispatch(
      setSelectedGenre({ id: id === "null" ? null : parseInt(id), type })
    );
  };

  return (
    <div className='genre-filter'>
      <select onChange={handleChange}>
        {genres.map((genre) => (
          <option
            key={`${genre.type}-${genre.id}`}
            value={`${genre.id}|${genre.type}`}
          >
            {genre.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default GenreFilter;
