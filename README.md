# Investment Dashboard UI

A comprehensive investment portfolio management and simulation tool built with React, TypeScript, and Vite.

## Features

- **Portfolio Management**: Create, edit, and organize multiple investment portfolios
- **Asset Allocation**: Add assets with real-time data fetching and allocation management
- **Monte Carlo Simulation**: Run sophisticated simulations to project portfolio performance
- **One-time & Monthly Deposits**: Track various deposit scenarios and changes over time
- **Tax Considerations**: Support for pension vs. regular portfolios with different tax treatments
- **Interactive Charts**: Visualize portfolio performance with ECharts integration
- **Drag & Drop**: Reorder portfolios with intuitive drag-and-drop interface
- **Data Persistence**: Choose between local storage or Supabase cloud storage
- **Google Authentication**: Optional Google OAuth integration for cloud sync

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Charts**: ECharts for React
- **Drag & Drop**: @hello-pangea/dnd
- **Backend Integration**: Supabase for authentication and data storage
- **Date Handling**: Day.js
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd investment-dashboard-ui
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Configuration

### Authentication Mode

The app can run in two modes:

1. **Local Storage Mode** (default): Data is stored locally in the browser
2. **Google Auth Mode**: Data is synced to Supabase with Google authentication

To switch modes, update the `USE_GOOGLE_AUTH` flag in `src/utils/config.ts`.

### Supabase Setup (Optional)

If using Google Auth mode, you'll need to:

1. Create a Supabase project
2. Set up Google OAuth provider
3. Update the Supabase configuration in `src/utils/supabaseClient.js`

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── AllocationsSection.jsx
│   ├── PortfolioPage.jsx
│   ├── Sidebar.jsx
│   ├── SimulationSection.jsx
│   └── SummaryPage.jsx
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
│   ├── calcMetrics.ts  # Financial calculations
│   ├── config.ts       # App configuration
│   └── supabaseClient.js
└── App.tsx             # Main application component
```

## Key Features

### Portfolio Management
- Create unlimited portfolios
- Drag and drop to reorder
- Rename, duplicate, and delete portfolios
- Toggle pension status for tax calculations

### Asset Allocation
- Add assets by symbol (stocks, ETFs, etc.)
- Automatic fetching of historical performance data
- Multiple timeframe analysis (1Y, 5Y, 10Y, Blended)
- Real-time allocation percentage management
- Auto-rebalancing to 100%

### Monte Carlo Simulation
- Sophisticated portfolio performance projections
- Multiple percentile views (10th, 50th, 90th)
- Tax-adjusted calculations for pension portfolios
- Interactive charts with zoom and pan capabilities
- Safe withdrawal rate calculations (4% rule)

### Deposit Management
- One-time deposits with specific dates
- Monthly deposit changes over time
- Automatic integration with simulation models

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Deployment

The application is deployed on Netlify and can be accessed at: https://portfolio-prophet.netlify.app
## Support

For support, please open an issue in the GitHub repository or contact the development team.