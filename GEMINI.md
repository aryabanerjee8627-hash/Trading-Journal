# Trading Journal 3.0

Trading Journal 3.0 is a modern, full-stack web application designed for traders to log, track, and analyze their performance. It features a robust FastAPI backend with automated PnL calculations and a high-performance React frontend styled with Tailwind CSS 4.0.

## Project Structure

- `Backend/`: FastAPI application.
  - `app/auth.py`: JWT authentication logic (Clerk integration).
  - `app/crud.py`: Database abstraction layer (Create, Read, Update, Delete).
  - `app/database.py`: SQLAlchemy connection setup and session management.
  - `app/main.py`: Entry point, middleware configuration (CORS), and router inclusion.
  - `app/models.py`: SQLAlchemy database models (PostgreSQL schema).
  - `app/routes.py`: API endpoint definitions.
  - `app/schema.py`: Pydantic models for request/response validation.
  - `app/service.py`: Core business logic (PnL, R-multiple, instrument detection).
- `frontend/`: React application using Vite and Tailwind CSS.
  - `src/components/`: Modular UI components (TradeForm, TradeList, StatsCards).
  - `src/lib/api.js`: Centralized API client using Fetch with Auth headers.
  - `src/index.css`: Tailwind 4.0 configuration and OKLCH-based theme variables.

## Technologies

### Backend
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/)
- **ORM:** [SQLAlchemy](https://www.sqlalchemy.org/)
- **Database:** PostgreSQL (Hosted on Supabase via Connection Pooler)
- **Validation:** [Pydantic v2](https://docs.pydantic.dev/)
- **Authentication:** JWT (via Clerk and `python-jose`)
- **Decimal Support:** Uses `Decimal` for all financial calculations to ensure precision.

### Frontend
- **Framework:** [React 19](https://react.dev/)
- **Build Tool:** [Vite 8.0](https://vitejs.dev/)
- **Styling:** [Tailwind CSS 4.2](https://tailwindcss.com/) with PostCSS
- **UI Components:** [Shadcn UI](https://ui.shadcn.com/) (using `@base-ui/react` primitives)
- **Typography:** [Geist Variable Font](https://vercel.com/font)
- **Color Space:** OKLCH for consistent and perceptually uniform theming.
- **Icons:** [Lucide React](https://lucide.dev/)
- **Theme Management:** `next-themes` for dark/light mode support.
- **Auth:** [Clerk](https://clerk.com/)

## Core Calculations Logic

The `app/service.py` module handles the financial math:
- **Instrument Detection:** Automatically detects if a pair is Gold (`XAU`) or Forex based on the symbol.
- **Pip Value Multipliers:** 
  - **Gold:** Uses a multiplier of `100`.
  - **JPY Pairs:** Uses a multiplier of `1000`.
  - **Other Forex:** Uses a multiplier of `100,000`.
- **PnL Formula:** `(Exit Price - Entry Price) * Multiplier * Lot Size`.
- **R-Multiple:** Calculates the reward relative to the risk amount (`Entry - Stop Loss`).

## Recent Fixes & Improvements

- **Backend:**
  - Standardized on `commissions` (plural) across all layers.
  - Increased precision for prices and PnL columns to `Numeric(20, 6)` to handle high-value assets and large account sizes.
  - Fixed `risk_amount` persistence bug.
  - Improved robustness of stats calculations to handle open trades (null `exit_price`).
- **Frontend:**
  - **Tailwind 4.0 Migration:** Fully migrated to Tailwind 4 with CSS-first configuration and `@tailwindcss/postcss`.
  - **Theming:** Implemented a modern design system using OKLCH colors for better contrast and accessibility.
  - **Typography:** Integrated Geist Variable font for a premium look.
  - **Auth Integration:** Refined Clerk hooks usage for more stable session management.
  - **Form Handling:** Standardized numeric parsing to prevent "string vs number" type errors in the API.
