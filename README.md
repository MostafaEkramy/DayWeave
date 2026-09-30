# DayWeave — Visual Daily Time-Management & Productivity OS

A Visual Daily Time-Management & Productivity OS built with **React 19, TypeScript, Vite, Firebase / Firestore, and LocalStorage**.

---

## 🌟 Key Features

### 1. ⏱️ Interactive 24-Hour Timeline
- **Drag & Drop Rescheduling**: Re-arrange tasks on a continuous 24-hour visual canvas with smooth 15-minute snapping.
- **Resize Duration**: Stretch or compress activity duration directly from card edges.
- **Unoccupied Gap Detection**: Visual indicators showing available free time blocks.
- **Real-Time Marker**: Dynamic pulsing line indicating current time.

### 2. 🧠 Smart Scheduling Engine
- **Constraint-Based Scheduling**: Deterministic topological scheduling based on Priority, Energy Alignment, Deadlines, Fixed Commitments, and Task Dependencies.
- **Explainable AI Metadata**: Every placed activity includes a clear reason why that slot was chosen.
- **Strict Deadline Enforcement**: Guarantees tasks are not silently scheduled past user deadlines.
- **Automated Rest Breaks**: Inserts 15-minute recharge pauses after 90 minutes of continuous deep work.
- **Dynamic Rescheduling**: Re-allocates remaining tasks forward when plans change or tasks finish early.

### 3. ⚡ Circadian Energy Management
- **Chronotype Modeling**: Custom peak energy windows (Morning Lark, Night Owl, Balanced).
- **Time-of-Day Curve**: Dynamic energy level calculation across the 24-hour continuum.
- **Actionable Advice**: Real-time warnings when low energy mismatches demanding high-focus tasks.

### 4. ⚔️ Conflict Detection & Auto-Resolution
- **Overlap Detection**: Detects exact, partial, and nested time clashes.
- **Auto-Resolve**: Cascading shift engine that resolves clashes while preserving fixed appointments.

### 5. 🔁 Recurring Routines & Task Backlog
- **Recurring Tasks**: Daily, weekdays (Mon-Fri), weekly, custom selected days, and monthly routines.
- **Task Backlog**: Manage unscheduled ideas and tasks, then drag or schedule them onto any date.
- **Task Dependencies**: Prerequisite linking (Task B cannot start before Task A finishes).

### 6. 🎧 Focus Mode / Pomodoro
- **High-Accuracy Timer**: Delta timestamp calculations prevent background browser tab throttling.
- **Ambient Soundscapes**: Built-in Web Audio API sound generators (Gentle Rain, Brown Noise, Quiet Room).
- **Focus Logging**: Tracks deep work minutes integrated with streak analytics.

### 7. ☁️ Offline-First & Realtime Cloud Sync
- **Local-First Architecture**: Instant synchronous reads/writes via scoped `localStorage`.
- **Firestore Synchronization**: Real-time listeners (`onSnapshot`) and offline write queue with retry on reconnect.
- **Privacy & GDPR Compliance**: Permanent account and Firestore/localStorage data deletion.
- **Schema-Versioned Backup**: Safe JSON export/import with validation (Schema v1.0).

### 8. 🌐 Localization & Design System
- **Dual Language**: English & Arabic (العربية).
- **Bi-Directional**: Full RTL & LTR layout support across all cards, modals, and navigation.
- **Theming**: Flawless Dark & Light modes built with semantic CSS design tokens.
- **Keyboard Navigation**: Command palette (`Ctrl + K`), arrow key navigation, and ARIA modal accessibility.

---

## 🏗️ Architecture & Folder Structure

```
src/
├── components/
│   ├── Activity/       # Activity Modal & task creation
│   ├── Common/         # AuthModal, CommandBar, TimePicker, Toast, ErrorBoundary
│   ├── Focus/          # Focus Mode with high-accuracy timer & Web Audio
│   ├── Layout/         # Header, Sidebar, Navigation, Overview
│   ├── Planner/        # Smart Planner Modal
│   ├── Timeline/       # 24-Hour Timeline Canvas, Cards, Gaps, ConflictBanner
│   └── Views/          # WeekView, TemplatesView, DailyReviewView
├── context/
│   ├── AppContext.tsx      # Main application state, activities, backlog, templates
│   ├── AuthContext.tsx     # Firebase Auth, user session, account deletion
│   ├── LanguageContext.tsx # i18n & RTL/LTR direction provider
│   └── ThemeContext.tsx    # Dark / Light theme provider
├── i18n/
│   └── translations.ts     # Complete English & Arabic dictionary
├── pages/
│   ├── AnalyticsPage.tsx   # Productivity analytics, category donut, weekly heatmap
│   ├── NotFoundPage.tsx    # 404 Fallback page
│   ├── ReviewPage.tsx      # Daily reflection & mood journaling
│   ├── SettingsPage.tsx    # Time window, notifications, language & data backup
│   ├── TemplatesPage.tsx   # Routine templates library
│   ├── TimelinePage.tsx    # Primary visual daily schedule
│   └── WeekPage.tsx        # 7-day multi-column matrix
├── services/
│   ├── audioService.ts        # Web Audio API ambient sounds & completion chimes
│   ├── conflictEngine.ts      # Conflict detection and cascading resolution
│   ├── energyEngine.ts        # Circadian energy curve and alignment scoring
│   ├── firebase.ts            # Firebase App, Auth, Firestore configuration
│   ├── notificationService.ts # Browser Notification API integration
│   ├── recurringEngine.ts     # Recurring instance generation & due date matcher
│   ├── schedulerEngine.ts     # Constraint scheduling & dynamic rescheduling
│   └── storageService.ts      # Offline-first storage, sync queue & GDPR wipe
├── types/                     # TypeScript data models
└── utils/                     # Date arithmetic, streak calculations, time formatting
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or 20+
- npm / yarn / pnpm

### Installation
```bash
git clone https://github.com/your-username/dayweave.git
cd dayweave
npm install
```

### Environment Variables
Create a `.env` file in the root directory:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```
*(Note: If environment variables are omitted, DayWeave automatically runs in local-only offline mode seamlessly).*

### Development Server
```bash
npm run dev
```

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```

---

## 🔒 Security & Firestore Rules

Firebase Security Rules are located in `firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 📄 License
MIT License. Built for intentional time architecture and deep productivity.
