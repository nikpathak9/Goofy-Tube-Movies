![IMG_2210](https://github.com/user-attachments/assets/d20ec10c-2f18-43d9-bab7-614b53cb8326)# 🎥 Goofy Tube

A modern, responsive video streaming platform inspired by YouTube. Powered by [TMDB API](https://www.themoviedb.org/), this app allows users to search for movies and TV shows, watch trailers with custom video controls, and manage their accounts with authentication support.

![Goofy Tube Banner](<img width="1139" alt="Screenshot 2025-07-07 at 9 54 37 PM" src="https://github.com/user-attachments/assets/578fc61c-d419-483c-8126-9d8888770a35" />)

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

| Homepage | Video Details | Mobile Nav |
|---------|----------------|-------------|
| ![home](<img width="1467" alt="Screenshot 2025-07-07 at 10 06 10 PM" src="https://github.com/user-attachments/assets/f76dc6c8-adb2-4be6-ad0c-d39621255cf2" />
) | ![video](<img width="1469" alt="Screenshot 2025-07-07 at 9 55 38 PM" src="https://github.com/user-attachments/assets/416d639a-ad3c-4b06-97ba-9792d15a6202" />) | ![mobile](<img width="580" alt="Screenshot 2025-07-07 at 9 53 48 PM" src="https://github.com/user-attachments/assets/12316583-0d26-4ce1-98ba-9e384ba91e1d" />, (![IMG_2210](https://github.com/user-attachments/assets/5314e087-3ce1-4e2f-a52f-0b5205fc3e71)
))|

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


