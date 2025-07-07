import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Mail, User } from "lucide-react";
import "./auth.css";

const SignUp = () => {
  const [name, setName] = useState("");
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

      // Get existing users
      const users = JSON.parse(localStorage.getItem("users")) || [];

      // Check if user already exists
      const userExists = users.find((u) => u.email === email);
      if (userExists) {
        setError("User already exists. Please sign in.");
        return;
      }

      // Add new user
      const newUser = { name, email, password };
      users.push(newUser);
      localStorage.setItem("users", JSON.stringify(users));
      localStorage.setItem("user", JSON.stringify(newUser)); // login after signup

      navigate("/");
    } catch (err) {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='auth-container'>
      <div className='auth-card'>
        <Link to={"/"} className='back-button-auth'>
          <ArrowLeft size={18} /> <span>Back</span>
        </Link>
        <h2 className='auth-title'>Sign Up</h2>
        {error && <p className='auth-error'>{error}</p>}

        <form onSubmit={handleSubmit} className='auth-form'>
          <div className='input-group'>
            <User className='input-icon' />
            <input
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Name'
              required
              className='auth-input'
            />
          </div>

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
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <p className='auth-switch'>
          Already have an account?{" "}
          <Link to='/signin' className='auth-link'>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
