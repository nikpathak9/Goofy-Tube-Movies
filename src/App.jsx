import React, { useEffect } from "react";
import VideoPlayer from "./component/VideoPlayer";
import Navbar from "./component/Navbar";
import { Routes, Route, useLocation } from "react-router-dom";
import Homepage from "./component/Homepage";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import MovieDetails from "./component/MovieDetails";
import Footer from "./component/Footer";
import SearchPage from "./component/SearchPage";
import SignIn from "./component/SignIn";
import SignUp from "./component/SignUp";

const App = () => {
  const location = useLocation();
  const hideNavbar =
    location.pathname === "/signin" || location.pathname === "/signup";

  useEffect(() => {
    const loader = document.getElementById("loader");
    setTimeout(() => {
      if (loader) {
        loader.classList.add("fade-out");
        setTimeout(() => loader.remove(), 800);
      }
    }, 20000);
  }, []);

  return (
    <Provider store={store}>
      <div>
        {!hideNavbar && <Navbar />}
        <Routes>
          <Route path='/' element={<Homepage />} />
          <Route path='/details/:type/:id' element={<MovieDetails />} />
          <Route path='/watch/:type/:id' element={<VideoPlayer />} />
          <Route path='/search/:query' element={<SearchPage />} />
          <Route path='/signin' element={<SignIn />} />
          <Route path='/signup' element={<SignUp />} />
        </Routes>
        {!hideNavbar && <Footer />}
      </div>
    </Provider>
  );
};

export default App;
