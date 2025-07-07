🎥 Goofy Tube

A modern, responsive video streaming platform inspired by YouTube. Powered by [TMDB API](https://www.themoviedb.org/), this app allows users to search for movies and TV shows, watch trailers with custom video controls, and manage their accounts with authentication support.

<img width="1139" alt="Screenshot 2025-07-07 at 9 54 37 PM" src="https://github.com/user-attachments/assets/578fc61c-d419-483c-8126-9d8888770a35" />

---

## 🚀 Features

- 🔍 **Smart Search** with debounce and real-time results
- 🎞️ **Custom Video Player** built with `video.js` and glassmorphism controls
- 📱 **Responsive Design** with mobile-first layout and hamburger nav
- 🔐 **User Authentication** (Sign Up / Sign In / Logout)
- 🌙 **Dark Theme** with animated gradients and Mona Sans typography
- 🔁 **Routing & Navigation** using `React Router`
- 🌐 **API Integration** with TMDB for real-time data

---

## 📸 Preview
- **Preview**:
- <img width="300" alt="Screenshot 2025-07-07 at 10 06 10 PM" src="https://github.com/user-attachments/assets/a77ee9a2-c652-432f-82f3-4f30b34376d7" /><img width="300" alt="Screenshot 2025-07-07 at 9 55 38 PM" src="https://github.com/user-attachments/assets/da03d3ae-2b6e-48ad-b87d-d8c592bb513e" />
-  <img width="200" alt="Screenshot 2025-07-07 at 9 53 48 PM" src="https://github.com/user-attachments/assets/b7d4e0aa-a3a3-4fdc-9a3a-b9ae8cf110b8" /><img width="200" alt="Screenshot 2025-07-07 at 9 53 48 PM" src="https://github.com/user-attachments/assets/5ba8ce7b-a8f8-4f69-8105-379a47e342ac" />



---

## 🛠️ Tech Stack

- **Frontend**: React, JavaScript, HTML, CSS (Tailwind-inspired custom styling)
- **Video Player**: [video.js](https://videojs.com/)
- **Routing**: React Router
- **Icons**: Lucide
- **API**: TMDB API
- **Fonts**: Mona Sans
- **Styling**: Glassmorphism + Gradients

## 🔧 Setup Instructions

1. **Clone the repo**
   ```bash
   git clone https://github.com/your-username/goofy-tube.git
   cd goofy-tube
   ```
2. **Install Dependencies**
   ```bash
   npm install
   ```
3. **Add TMDB API Key. Create a .env file in the root**
   ```bash
   VITE_TMDB_READ_TOKEN=your_tmdb_read_token_here
   ```
4. **Run the app**
    ```bash
    npm run dev
    ```


