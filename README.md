# Car Rental Management System 🚗

A simple, fast, and professional Multi-Tenant Car Rental Management System built with Next.js 14 (App Router), React, TypeScript, and Neon PostgreSQL database.

## Features

- **Dashboard**: Live metrics for Total Cars, Available Cars, Rented Cars, and Total Customers.
- **Cars**: Add, edit, delete, and view cars with pricing and availability status.
- **Customers**: Add, edit, delete, and view customer records with driving license info.
- **Rentals**: 
  - Automatic rental duration and total price calculation (`Days × Price/Day`).
  - Automatic status updates (`Available` ↔ `Rented`).
  - Overlapping rental prevention for active bookings.
- **Payments**: Auto-created for each rental with status tracking (`Unpaid` / `Paid`).
- **Database**: Integrated with Neon PostgreSQL with SSL support and relational integrity.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- A [Neon](https://neon.tech) PostgreSQL database account

## Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/carab6060-maker/rent-car-sytem.git
   cd rent-car-sytem
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and paste your Neon PostgreSQL connection string:
   ```env
   DATABASE_URL=postgresql://username:password@your-neon-host.aws.neon.tech/neondb?sslmode=require
   PORT=3000
   ```

4. **Start the application**:
   ```bash
   npm start
   ```

5. Open your browser at:
   ```
   http://localhost:3000
   ```
