import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isPlaying: false,
  isMuted: true,
  currentTime: 0,
  duration: 0,
};

const videoSlice = createSlice({
  name: 'video',
  initialState,
  reducers: {
    setPlaying: (state, action) => {
      state.isPlaying = action.payload;
    },
    setMuted: (state, action) => {
      state.isMuted = action.payload;
    },
    setCurrentTime: (state, action) => {
      state.currentTime = action.payload;
    },
    setDuration: (state, action) => {
      state.duration = action.payload;
    },
  },
});

export const { setPlaying, setMuted, setCurrentTime, setDuration } = videoSlice.actions;
export default videoSlice.reducer;
