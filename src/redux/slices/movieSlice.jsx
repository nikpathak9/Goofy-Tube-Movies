import { createSlice } from "@reduxjs/toolkit";

const movieSlice = createSlice({
  name: "movies",
  initialState: {
    popular: [],
    topRated: [],
    tvPopular: [],
    tvTopRated: [],
    isLoading: false,
    error: null,
    selectedGenreId: null,
    selectedGenreType: null,
  },
  reducers: {
    setPopular: (state, action) => {
      state.popular = action.payload;
    },
    setTopRated: (state, action) => {
      state.topRated = action.payload;
    },
    setTVPopular: (state, action) => {
      state.tvPopular = action.payload;
    },
    setTVTopRated: (state, action) => {
      state.tvTopRated = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setSelectedGenre: (state, action) => {
      state.selectedGenre = action.payload.id;
      state.selectedGenreType = action.payload.type;
    },
  },
});

export const {
  setPopular,
  setTopRated,
  setTVPopular,
  setTVTopRated,
  setLoading,
  setError,
  setSelectedGenre,
} = movieSlice.actions;

export default movieSlice.reducer;
