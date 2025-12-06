
 # Title : CICT RoomSched - Classroom Reservation & Management System

 ## Description
 **CICT RoomSched** is a comprehensive web-based classroom reservation and management system designed for the College of Information and Communications Technology (CICT). The system provides role-based access for administrators, instructors, and students to manage room reservations, schedules, and academic activities efficiently. The platform features real-time scheduling, conflict detection, calendar views, and comprehensive room management capabilities.

# Features
## Multi-Role Dashboard System

- **Admin Dashboard**: Full system control with user management, room management, reservation approvals, activity logs, and system monitoring
- **Instructor Dashboard**: Room reservation management, schedule viewing, time conflict detection, and student block coordination
- **Student Dashboard**: Class schedule viewing, room availability checking, study planning, and instructor/classroom search

### 📅 Advanced Scheduling & Calendar
- Interactive monthly and weekly calendar views
- Real-time room availability tracking
- Time conflict detection with visual alerts
- Multi-day scheduling with 7AM-8PM time slots
- Drag-and-drop reservation management

### 🏢 Smart Room Management
- Room availability status (Available/Occupied/Scheduled)
- Equipment tracking and capacity management
- Building-wise room organization
- Real-time occupancy detection
- Filtering by date, time, and capacity

### 👥 User Management
- Role-based access control (Admin/Instructor/Student)
- Student block system (BSIT: 5 blocks, others: 2 blocks)
- Email validation with domain restrictions
- Password management and reset functionality
- Profile management with password change

### 🔔 Notification System
- Real-time notification bell for all users
- Reservation status updates
- Approval/rejection notifications
- System alerts and announcements

### 📊 Activity & Reporting
- Comprehensive activity logs with filtering
- Reservation history tracking
- Status legend system (Approved/Pending/Active/Completed)
- Export and reporting capabilities

### 🎨 Modern UI/UX 
- Responsive design for all devices
- Maroon theme matching CICT colors
- Gradient backgrounds and smooth animations
- Toast notifications and modal systems
- Interactive cards and hover effects

## Technologies

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **React Hooks** - State and effect management

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **MySQL2** - Database connectivity
- **bcryptjs** - Password hashing
- **jsonwebtoken** - Authentication tokens
- **date-fns** - Date manipulation

### Authentication & Security
- **Custom Auth Context** - Role-based authentication
- **JWT Tokens** - Secure session management
- **Protected Routes** - Middleware-based access control
- **Input Validation** - Form validation and sanitization

## Database
- **MySQL** - Relational database management
- **Database** Migrations - Schema version control
- **Relationships** - Users, Rooms, Reservations, Schedules

## Development Tools
- **ESLint** - Code quality
- **TypeScript** - Type checking
- **Tailwind CSS v4** - Latest CSS features
- **clsx & tailwind-merge** - Dynamic class management


## PROJECT STRUCTURE 
```
cict_roomsched/
├── app/
│   ├── api/                      # API routes
│   │   ├── auth/
│   │   ├── reservations/
│   │   ├── rooms/
│   │   ├── users/
│   │   └── student-schedule/
|   |   |__ notifications/
│   ├── dashboard/
|   |       |__page.tsx                 
│   │                 
│   │             
│   │                
│   ├── login/                    # Login page
│   ├── register/                 # Registration page
│   ├── global.css                # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/
│   ├── dashboard/                # Dashboard components
│   │   ├── admindashboard.tsx 
│   │   └── instructordashboard.tsx  
|   |   |___ studentdashboard.tsx
│   └── ui/                       # UI components
│   |    ├── button.tsx            # Button components
│   |    ├── card.tsx              # Card components
│   |    └── calendar.tsx          # calendar components
|   |    |___input.tsx             # input components
|   |____NotificationBell.tsx       # Notification system
├── contexts/
│   └── AuthContext.tsx           # Authentication context
├── lib/
│   ├── api.ts                    # API client
│   ├── database.ts               # Database connection
│   └── auth.ts                   # Authentication utilities
|   |__ noticications.ts
|   |__ utils.ts      
├── scripts/
│   └── init-db.ts                   # Database seeding
├── types/
│   └── index.ts                  # TypeScript definitions
├── middleware.ts                 # Route protection
├── package.json                  # Dependencies
└── README.md                     # Project documentation
```
## 📚 Documentation
For detailed setup and installation instructions, see the [CICT Setup Guide](./CICT_SETUP_GUIDE.md).
## 🚀 Quick Start
1. **Clone**: `git clone <-repo-url>`
2. **Install**: `npm install`
3. **Setup**: 
   - Start XAMPP (Apache & MySQL)
   - Create DB: `cict_roomsched`
   - Create `.env.local` file with:
    ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=cict_roomsched
   NEXT_PUBLIC_API_URL=http://localhost:3000
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```
   - Initialize DB: `npx tsx scripts/init-db.ts`
4. **Run**: `npm run dev` → [http://localhost:3000](http://localhost:3000)

📚 [Full Setup Guide](./CICT_SETUP_GUIDE.md)

## ⚠️ Troubleshooting Common Errors
### Database Connection Error
If you see "Can't connect to MySQL server" or "Access denied":
```
# Check MySQL is running in XAMPP
# Verify credentials in .env.local
# Ensure database exists: cict_roomsched
```
### Build/Compilation Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try rebuilding
npm run build
```
## Port 3000 Already in Use
```bash
# Check what's using port 3000
netstat -ano | findstr :3000

# Kill the specific process (replace PID with actual number)
taskkill /PID <PROCESS_ID> /F

# Or use the kill-port script
npm run kill-port
```
## Script Execution Error
If **npx tsx scripts/init-db.ts** fails:
```bash
# Install tsx globally if needed
npm install -g tsx

# Or use alternative
npm run init-db  # if defined in package.json
```
## Project Members:

- CRISTIAN B. GUBAT
- ALFIE DYNE L. CASTRO 
- JEROME H. ARADO 
- NASH ARON RIOFLORIDO
- JAMES PHILLIP GUATNO 

