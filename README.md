#  Time Bank App

A modern cross-platform application built with web technologies and native mobile support.

** Live Demo:** [https://time-bank-app.vercel.app](https://time-bank-app.vercel.app)

---

##  Quick Start

### Prerequisites
- Node.js and npm installed on your machine
- Xcode (for iOS development)
- Android Studio (for Android development)

### Installation & Development

#### 1️ Install Dependencies
```bash
npm install
```

#### 2️ Start Local Development Server
```bash
npm run dev
```

**Access your app:**
- **Desktop/Laptop:** [http://localhost:5173](http://localhost:5173)
- **Mobile Device (same network):** `http://<YOUR_LOCAL_IP>:5173`
  
>  **Tip:** Find your local IP by running `ipconfig getifaddr en0` (macOS) or `ipconfig` (Windows)

---

##  Native Development

### Opening Native Projects

####  iOS (Xcode)
```bash
npx cap open ios
```

####  Android (Android Studio)
```bash
npx cap open android
```

### Syncing Changes to Native Apps

After making changes to your web code, update the native apps:

```bash
npm run build
npx cap sync
```

>  **Remember:** Always rebuild and sync after modifying web code to see changes in native apps.

---

##  Project Structure

```
├── src/              # Web application source code
├── ios/              # iOS native project
├── android/          # Android native project
├── package.json      # Dependencies and scripts
└── README.md         # This file
```

---

## 🛠️ Available Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install project dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npx cap sync` | Sync web code to native apps |
| `npx cap open ios` | Open iOS project in Xcode |
| `npx cap open android` | Open Android project in Android Studio |

---

##  Deployment

The app is automatically deployed to:
- **Web:** [https://time-bank-app.vercel.app](https://time-bank-app.vercel.app)

---

##  Tips & Tricks

-  Test on your actual phone by accessing `http://<YOUR_LOCAL_IP>:5173`
-  Use hot module replacement (HMR) for faster development
-  Make sure to run `npm run build` before syncing to native apps
-  Check browser console for debugging web issues

---

##  Documentation

For more information about the tech stack:
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [iOS Development Guide](https://developer.apple.com/documentation/)
- [Android Development Guide](https://developer.android.com/docs)

---

##  Contributing

Feel free to submit issues and enhancement requests!

---

##  License

This project is open source and available under the MIT License.

---


