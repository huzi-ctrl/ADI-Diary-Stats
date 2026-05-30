# DriveStats ADI Dashboard 🚗📈

A comprehensive analytics, performance tracking, and scheduling optimization dashboard designed specifically for Approved Driving Instructors (ADIs). DriveStats seamlessly ingests calendar data (via direct OAuth integration for Google/Outlook or via `.ics` file uploads/feeds) to generate powerful business insights.

## Features ✨

*   **Intelligent Dashboard:** Visualize your active teaching weeks, average lesson durations, and peak/off-peak student distributions at a glance.
*   **Availability Widget:** Tracks the percentage of your schedule that is booked versus free based on your ideal working hours.
*   **Live Calendar Sync:** Securely connect Google Calendar or Outlook Calendar via OAuth for real-time synchronization, or subscribe to any valid `.ics` Webcal feed.
*   **AI Business Advisor:** Powered by Gemini (Google AI Studio) and OpenAI, the built-in AI assistant automatically generates highly personalized:
    *   Weekly Operational & Revenue Summaries
    *   Actionable Route-Planning Strategies
    *   Yearly Trend and Growth Analytics
*   **Yearly & Weekly Breakdowns:** Dive into historical data to analyze seasonality, track month-over-month revenue growth, and identify the most profitable days of the week.
*   **Completely Local & Private:** All data processing is done securely in the browser. Calendar files are parsed locally, ensuring student data privacy.

## Tech Stack 🛠️

*   **Frontend Framework:** React 18
*   **Build Tool:** Vite
*   **Styling:** Custom CSS with modern Glassmorphism aesthetics
*   **Routing:** React Router (with Vercel rewrites)
*   **Icons:** Lucide React
*   **AI Integration:** Direct REST API calls to Google Gemini (`generativelanguage.googleapis.com`) and OpenAI.

## Getting Started 🚀

### 1. Clone & Install
```bash
git clone https://github.com/huzi-ctrl/ADI-Diary-Stats.git
cd ADI-Diary-Stats
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the root directory and configure your OAuth Client IDs if you wish to use the Google or Microsoft login features:
```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_OUTLOOK_CLIENT_ID=your_microsoft_client_id_here
```

### 3. Run the Development Server
```bash
npm run dev
```
Navigate to `http://localhost:5173` in your browser.

## AI Configuration 🤖

To unlock the AI Insights tab, you need an API key from either Google or OpenAI:
1. Go to **[Google AI Studio](https://aistudio.google.com/app/apikey)** and generate a free API Key.
2. Ensure your key starts with `AIzaSy`.
3. Paste the key into the DriveStats settings menu and click **Re-generate**.

## Deployment (Vercel) 🌍

DriveStats is configured out-of-the-box for seamless Vercel deployment. A `vercel.json` file is included to handle React's client-side routing.

1. Create a project in [Vercel](https://vercel.com).
2. Connect this GitHub repository.
3. Add your `VITE_GOOGLE_CLIENT_ID` and `VITE_OUTLOOK_CLIENT_ID` as Environment Variables in the Vercel dashboard.
4. Deploy!
