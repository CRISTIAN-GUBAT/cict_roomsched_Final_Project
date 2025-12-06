# Step-by-Step Setup Instructions

## 1. Prerequisites Installation
### First, install these on your machine:
•	Node.js (LTS version recommended)
•	Git
•	XAMPP (for MySQL database)

## 2. Clone the Repository
#### Open terminal/command prompt and run:
git clone <your-repository-url>
cd cict-roomsched

## 3. Install Dependencies
npm install
## 4. Set Up Environment Variables

### Create a .env.local file in the root directory with:
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=cict_roomsched
NEXT_PUBLIC_API_URL=http://localhost:3000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

## 5. Start XAMPP

1.	Open XAMPP Control Panel
2.	Start Apache and MySQL services
3.	Click "Admin" on MySQL row to open phpMyAdmin

## 6. Create Database
In phpMyAdmin (http://localhost/phpmyadmin):

1.	Click "New" in left sidebar
2.	Enter database name: cict_roomsched
3.	Click "Create"

## 7. Initialize Database Schema

# Check if you have an init-db.ts script
npx tsx scripts/init-db.ts

## 8. Start Development Server
npm run dev

## 9. Access the Application

### Open browser and go to:
# http://localhost:3000

## Quick Checklist
•	XAMPP installed and running
•	MySQL service started
•	Database cict_roomsched created
•	.env.local file created with correct values
•	Dependencies installed (npm install)
•	Database initialized (if script exists)
•	Development server started (npm run dev)

