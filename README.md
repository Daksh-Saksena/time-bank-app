Install dependencies: npm install
Start local dev server: npm run dev
Local URL: http://localhost:5173
Local Network (Phone): http://<YOUR_LOCAL_IP>:5173

Hosted at https://time-bank-app.vercel.app

Opening iOS Project (Xcode):
npx cap open ios

Opening Android Project (Android Studio):
npx cap open android

Syncing Changes to Native Apps:
After making changes to the web code, update native apps by running:
npm run build
npx cap sync
