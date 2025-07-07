import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Mail } from "lucide-react";
import "./auth.css";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const users = JSON.parse(localStorage.getItem("users")) || [];

      const matchedUser = users.find(
        (u) => u.email === email && u.password === password
      );

      if (!matchedUser) {
        setError("Invalid email or password.");
        return;
      }

      // Set current logged-in user
      localStorage.setItem("user", JSON.stringify(matchedUser));
      navigate("/");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='auth-container'>
      <div className='auth-card'>
        <Link to='/' className='back-button-auth'>
          <ArrowLeft size={18} /> <span>Back</span>
        </Link>
        <h2 className='auth-title'>Sign In</h2>
        {error && <p className='auth-error'>{error}</p>}

        <form onSubmit={handleSubmit} className='auth-form'>
          <div className='input-group'>
            <Mail className='input-icon' />
            <input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='Email'
              required
              className='auth-input'
            />
          </div>

          <div className='input-group'>
            <Lock className='input-icon' />
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='Password'
              required
              className='auth-input'
            />
          </div>

          <button type='submit' className='auth-button' disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p className='auth-switch'>
          Don't have an account?{" "}
          <Link to='/signup' className='auth-link'>
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignIn;
