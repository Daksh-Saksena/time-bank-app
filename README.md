Time Bank of India

Mobile-first application for the Time Bank of India platform where time is currency. Seniors can request assistance, volunteers earn time credits, and pincode admins oversee neighborhood activity.

Features
- Senior-first UX with high contrast, large touch targets, voice request support, and SOS button.
- Volunteer workflows for discovering nearby requests, active task session timer with PIN/QR verification, and impact dashboard.
- Pincode Admin dashboard for member management and pending KYC approvals.
- Digital Time Ledger tracking balances, earned hours, and service history.
- Clean design system with transparent logo branding and no emojis.

Web Testing & Development
- Install dependencies: npm install
- Start local dev server: npm run dev
- Local URL: http://localhost:5173
- Local Network (Phone): http://<YOUR_LOCAL_IP>:5173

Deploying Web Version to Vercel
1. Connect repository Daksh-Saksena/time-bank-app to Vercel.
2. Vercel automatically detects Vite, runs npm run build, and hosts the live website.
3. Every git push automatically updates the web testing link.

Native Mobile App Builds (Capacitor)
This project uses Ionic Capacitor to generate native iOS and Android apps from the codebase.

Opening iOS Project (Xcode):
npx cap open ios

Opening Android Project (Android Studio):
npx cap open android

Syncing Changes to Native Apps:
After making changes to the web code, update native apps by running:
npm run build
npx cap sync

Project Structure
- public/ : Transparent logo asset and icons
- src/components/ : Shared UI components (Modal, BottomNav, SOSButton, etc.)
- src/context/ : Global AppContext for state and actions
- src/data/ : Mock data seed and constants
- src/screens/ : Senior, Volunteer, Admin, and Shared screens
- android/ : Native Android project files
- ios/ : Native iOS Xcode project files
- capacitor.config.json : Capacitor configuration