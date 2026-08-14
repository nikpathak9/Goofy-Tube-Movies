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
    // Previously initialState declared `selectedGenreId` but the reducer wrote
    // `state.selectedGenre` and Homepage read `state.selectedGenre`. It only
    // worked because Immer permits adding new keys, leaving `selectedGenreId`
    // as permanently-null dead state. One name now, used everywhere.
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
      state.selectedGenreId = action.payload.id ?? null;
      state.selectedGenreType = action.payload.type ?? null;
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
