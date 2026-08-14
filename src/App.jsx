import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import Navbar from "./component/Navbar";
import Footer from "./component/Footer";
import Homepage from "./component/Homepage";
import NotFound from "./component/NotFound";
import ScrollToTop from "./component/ScrollToTop";
import ErrorBoundary from "./component/ErrorBoundary";
import PageFrame from "./component/PageFrame";

/*
  Route-level code splitting. The app previously shipped as a single ~1MB
  chunk, which meant every visitor downloaded Video.js and the YouTube tech
  just to look at the home page — and videojs-youtube injected YouTube's
  IFrame API script on every route, including /signin.
*/
const MovieDetails = lazy(() => import("./component/MovieDetails"));
const VideoPlayer = lazy(() => import("./component/VideoPlayer"));
const SearchPage = lazy(() => import("./component/SearchPage"));
const Browse = lazy(() => import("./component/Browse"));
const Profile = lazy(() => import("./component/Profile"));
const SignIn = lazy(() => import("./component/SignIn"));
const SignUp = lazy(() => import("./component/SignUp"));

/*
  Routes that render without the site chrome. /watch used to be in this list,
  which — combined with a full-bleed 16:9 stage — is what made the player look
  permanently fullscreen. The player is now a contained theatre and keeps the
  navbar; fullscreen is an explicit action.
*/
const BARE_ROUTES = ["/signin", "/signup"];

const RouteFallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-hairline-strong border-t-accent" />
  </div>
);

const App = ({ onReady }) => {
  const location = useLocation();
  const bare = BARE_ROUTES.includes(location.pathname);

  /*
    Tell main.jsx the app has mounted so it can dismiss the boot loader. This
    replaces the old 20-second setTimeout, which left every non-home route
    stuck behind a full-screen spinner.
  */
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  const routes = (
    // Keyed by pathname so navigating away clears a caught error.
    <ErrorBoundary key={location.pathname}>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/browse/:type" element={<Browse />} />
          <Route path="/details/:type/:id" element={<MovieDetails />} />
          <Route path="/watch/:type/:id" element={<VideoPlayer />} />
          <Route path="/search/:query" element={<SearchPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );

  return (
    <Provider store={store}>
      <ScrollToTop />
      {bare ? (
        routes
      ) : (
        <PageFrame>
          <Navbar />
          {routes}
          <Footer />
        </PageFrame>
      )}
    </Provider>
  );
};

export default App;
