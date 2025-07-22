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
🔹 Full Previews
<p align="center"> <img width="500" alt="Screenshot 1" src="https://github.com/user-attachments/assets/b84295ea-909e-4e9e-aaa5-9e0ee96b50fd" /> <img width="500" alt="Screenshot 2" src="https://github.com/user-attachments/assets/762e98f3-a0b9-4dd6-ad47-83ffecedd1ce" /> <img width="500" alt="Screenshot 3" src="https://github.com/user-attachments/assets/dae020cc-fa26-4a7d-b591-387ef1560eac" /> </p>
🔹 Mini Previews
<p align="center"> <img width="200" alt="Mini 1" src="https://github.com/user-attachments/assets/c4346199-3fd0-4350-addb-36a6e2507da3" /> <img width="200" alt="Mini 2" src="https://github.com/user-attachments/assets/5460ef8a-ae33-4601-b519-ab256c6b2b37" /> <img width="200" alt="Mini 3" src="https://github.com/user-attachments/assets/1c740671-4842-4576-bd45-7917ce5de32a" /> </p>



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


