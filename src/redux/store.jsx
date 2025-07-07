import { configureStore } from "@reduxjs/toolkit";
import movieReducer from "./slices/movieSlice";
import videoReducer from "./slices/videoSlice";

export const store = configureStore({
  reducer: {
    movies: movieReducer,
    video: videoReducer,
  },
});
