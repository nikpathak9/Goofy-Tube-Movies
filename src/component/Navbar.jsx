import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Video, X, User, LogIn } from "lucide-react";

const Navbar = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setUser(null);
    }
  }, [location]);

  useEffect(() => {
    setQuery("");
    setResults([]);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setMenuOpen(false);
    navigate("/");
  };

  useEffect(() => {
    setQuery("");
    setResults([]);
  }, [location.pathname]);

  const handleSearch = () => {
    if (query.trim() !== "") {
      navigate(`/search/${encodeURIComponent(query)}`);
      setQuery("");
      setResults([]);
    }
  };

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    if (typingTimeout) clearTimeout(typingTimeout);

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/search/multi?query=${query}&include_adult=false&language=en-US&page=1`,
          {
            method: "GET",
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
            },
          }
        );
        const data = await res.json();
        setResults(data.results || []);
      } catch (err) {
        console.error("Search failed:", err);
      }
    }, 500);

    setTypingTimeout(timeout);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleResultClick = (item) => {
    setQuery("");
    setResults([]);
    setMenuOpen(false);
    navigate(`/search/${encodeURIComponent(query)}`);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className='navbar'>
      <div className='nav-container'>
        <div className='logo-section'>
          <Link to='/' className='logo'>
            <div className='logo-icon'>
              <Video className='logo-video-icon' />
            </div>
            <h1 className='logo-text'>Goofy Tube</h1>
          </Link>
          <button
            className='hamburger'
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label='Toggle menu'
          >
            <span className='bar'></span>
            <span className='bar'></span>
            <span className='bar'></span>
          </button>
        </div>

        <div className={`nav-items ${menuOpen ? "open" : ""}`}>
          <div className='search-bar' ref={dropdownRef}>
            <input
              type='text'
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder='Search...'
              className='search-input'
            />
            {query && (
              <button
                className='clear-button'
                onClick={() => {
                  setQuery("");
                  setResults([]);
                }}
                aria-label='Clear search'
              >
                <X size={18} />
              </button>
            )}
            <button className='search-button' onClick={handleSearch}>
              <Search size={18} />
            </button>

            {results.length > 0 && (
              <ul className='search-results'>
                {results.map((item) => (
                  <li
                    key={item.id}
                    className='search-result-item'
                    onClick={() => handleResultClick()}
                  >
                    {item.title || item.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {user ? (
            <div className='profile-dropdown'>
              <div className='profile-details'>
                <div className='profile'>
                  <img
                    src='https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
                    alt={user.name}
                    className='profile-image'
                  />
                </div>
                <span className='profile-name'>{user.name}</span>
              </div>
              <div className='dropdown-menu'>
                <button className='dropdown-item' onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className='auth-buttons'>
              <Link
                to='/signin'
                onClick={() => setMenuOpen(false)}
                className='auth-button'
              >
                <LogIn size={18} />
                <span>Sign In</span>
              </Link>
              <Link
                to='/signup'
                onClick={() => setMenuOpen(false)}
                className='auth-button signup'
              >
                <User size={18} />
                <span>Sign Up</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
