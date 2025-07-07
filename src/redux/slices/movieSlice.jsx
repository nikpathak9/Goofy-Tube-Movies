// redux/slices/movieSlice.js

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
  },
});

export const {
  setPopular,
  setTopRated,
  setTVPopular,
  setTVTopRated,
  setLoading,
  setError,
} = movieSlice.actions;

export default movieSlice.reducer;
