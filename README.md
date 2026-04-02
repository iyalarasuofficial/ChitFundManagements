# Chit Fund Management System (CFMS)
## A Story of Community, Trust, and Smart Finance

---

## 1. The Legacy of Community Lending

For generations, individuals and families have pooled their money together in informal lending circles. In South Asia, this practice is known as **Chit Funds** — a time-tested model where a group of people contribute fixed amounts regularly, and take turns receiving the pooled money through competitive auctions.

It's elegant in its simplicity:
- Members build financial discipline through regular contributions
- Capital circulates faster than traditional loans
- No collateral required — only trust
- Communities strengthen through shared financial goals

But there's a catch.

---

## 2. The Reality of Manual Management

Managing a chit fund on paper is deceptively complex. Organize with:

- **50+ members** paying contributions across multiple cycles
- **Daily tracking** of payments, penalties, arrears
- **Auction cycles** where members bid for the pooled amount
- **Real-time updates** on who paid, who's late, how much remains
- **Manual reconciliation** prone to errors, disputes, and lost time

Spreadsheets break under scale. Pen and paper fail when stakes rise. And trust erodes when records don't match reality.

What's needed is automation without losing control. Transparency without losing trust.

---

## 3. Introducing the Chit Fund Management System (CFMS)

**CFMS** is a professional, full-stack web application that digitizes the entire chit fund lifecycle — from group creation to member onboarding, contribution tracking, auction management, and real-time financial dashboards.

**Its mission:** Empower chit fund organizers and members with clarity, speed, and confidence.

---

## Key Features at a Glance

✅ **User Authentication** — Secure signup/login with JWT tokens  
✅ **Group Management** — Create, manage, and oversee multiple chit fund groups  
✅ **Contribution Tracking** — Automated tracking of member payments with status (pending, partial, overdue, arrears)  
✅ **Smart Auction System** — Real-time bidding, winner selection, and automatic payout distribution  
✅ **Penalty Enforcement** — Late payment penalties calculated automatically  
✅ **Wallet Management** — Digital wallet for fund deposits, withdrawals, and auction winnings  
✅ **Role-Based Dashboards** — Separate views for organizers and members with actionable insights  
✅ **Real-Time Updates** — Live auction bidding and contribution status via Socket.IO  
✅ **Financial Analytics** — Comprehensive reporting on group performance, cycle status, and member history

---

## Core Modules & Workflows

### 1. Group Creation & Onboarding
**Path:** Signup → Create Group → Add Members

- Organizer creates a new chit fund group
- Sets contribution amount, cycle duration, and organizer fee
- Adds members by phone number or invitation
- System auto-generates contribution schedules for each cycle

### 2. Contribution Management
**Path:** Dashboard → Contributions → Record Payment

Members or organizers can:
- View outstanding contributions for current cycle
- Record payments (via wallet balance)
- Automatically receive late-payment penalties (if overdue)
- Track payment history across all cycles

**Contribution Status Enum:**
```
enum ContributionStatus {
  Pending,      // Not yet paid
  Partial,      // Partially paid
  Paid,         // Fully paid
  Late,         // Paid after due date
  Arrear,       // Overdue and unpaid
  Defaulted     // Member marked as defaulter (3+ late payments)
}
```

### 3. Auction Management
**Path:** Dashboard → Start Auction → Place Bids → End Auction

**How it works:**
1. **Start Auction**: Organizer initiates auction when minimum pot is collected
2. **Live Bidding**: Members bid by offering discounts (e.g., "I'll take ₹90,000 instead of ₹100,000")
3. **Winner Selection**: Member with highest discount bid wins the entire pot
4. **Auto-Distribution**:
   - Winner gets their payout (pot - discount - organizer fee)
   - Non-winners receive dividend share of the discount
   - Organizer receives their fee

**Last Cycle Logic**: If only one unpaid member remains, chit fund auto-completes—no auction needed.

### 4. Wallet Management
**Path:** Dashboard → Wallet

- **Add Funds**: Members deposit money into their wallet
- **Withdraw Funds**: Members can withdraw available balance
- **Auto-Debit**: Contributions are deducted from wallet on payment
- **Auto-Credit**: Auction winnings and dividends credited instantly

### 5. Organizer Dashboard
**Path:** Dashboard → Organizer View

Organizers see:
- Total pot amount collected
- Payment status of all members (paid, pending, overdue)
- Auction history and winner trends
- Member risk assessment (frequent defaulters)
- Financial summary (total contribution, fees earned, group status)

### 6. Member Dashboard
**Path:** Dashboard → Member View

Members see:
- Current contribution status
- Payment history
- Auction participation and winnings
- Wallet balance and transaction history
- Personal performance metrics

### 7. Advance Cycle
**Path:** Groups → [Group Detail] → Advance Cycle

- Organizer advances to the next cycle after auction completes
- System auto-creates next cycle's contributions for all members
- Resets pot and prepares for new bidding cycle

---

## Financial Intelligence

### Contribution Formula
```
Contribution Status = (Amount Paid, Due Date, Payment Date)

If (Amount Paid == 0 && Today > Due Date): Status = "Arrear"
If (0 < Amount Paid < Total && Today > Due Date): Status = "Late"
If (Amount Paid == Total && Payment Date <= Due Date): Status = "Paid"
```

### Penalty Calculation
```
Late Payment Penalty = (Amount Due × Days Late × 0.5%) 
(Auto-calculated and deducted from wallet)
```

### Payout Distribution
```
Pot Amount = Total Contributions for Cycle
Organizer Fee = (Pot × Organizer Fee %)
Discount = Winner's Bid Amount
Winner Payout = Pot - Discount - Organizer Fee
Dividend per Non-Winner = Discount / (Total Members - 1)
```

### Risk Assessment
- Members with 3+ late payments are marked "Defaulted"
- Defaulters cannot participate in future auctions
- Organizers receive alerts on high-risk members

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Socket.IO Client |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | PostgreSQL, Prisma ORM |
| **Real-Time** | Socket.IO for live auction updates |
| **Deployment** | Vercel (Frontend), Render (Backend) |
| **Authentication** | JWT (HS256) with localStorage persistence |

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn
- PostgreSQL database (local or cloud)

### Installation

#### 1. Clone Repository
```bash
git clone <repo-url>
cd chit-fund-management
```

#### 2. Backend Setup
```bash
cd backend
npm install
```

Create `.env` file:
```
DATABASE_URL="postgresql://user:password@localhost:5432/chit_fund"
JWT_SECRET="your-secret-key"
PORT=3001
```

Run migrations:
```bash
npx prisma migrate dev
```

Start backend:
```bash
npm run dev
```

#### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

Create `.env` file:
```
VITE_API_URL="http://localhost:3001/"
VITE_SOCKET_URL="http://localhost:3001/"
```

Start frontend:
```bash
npm run dev
```

#### 4. Access Application
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3001

---

## Project Architecture

```
chit-fund-management/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Business logic (auth, groups, auctions, contributions)
│   │   ├── routes/          # API endpoints
│   │   ├── middleware/      # Auth verification
│   │   ├── config/          # Database connection
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Helper functions
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── migrations/      # Database migrations
│   └── server.ts            # Express entry point
│
├── frontend/
│   ├── src/
│   │   ├── pages/           # Page components (Groups, Auctions, Dashboard, etc.)
│   │   ├── features/        # Feature-specific components
│   │   ├── services/        # API & Socket.IO services
│   │   ├── context/         # React Context (Auth, etc.)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Helper utilities
│   │   └── types/           # TypeScript interfaces
│   ├── App.tsx              # Main router
│   └── main.tsx             # React entry point
│
└── README.md
```

---

## Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Register new user |
| POST | `/auth/login` | Login user |
| POST | `/groups` | Create new group |
| GET | `/groups` | List user's groups |
| POST | `/groups/:id/members` | Add member to group |
| GET | `/:groupId/contributions` | List group contributions |
| POST | `/contributions/:id/pay` | Record payment |
| POST | `/auctions/:groupId/start` | Start auction |
| POST | `/auctions/:auctionId/bid` | Place bid |
| POST | `/auctions/:auctionId/end` | End auction & distribute winnings |
| GET | `/dashboard/member` | Member dashboard data |
| GET | `/dashboard/organizer` | Organizer dashboard data |

---

## Highlights & Achievements

🎯 **Architected** a production-grade full-stack system for community lending  
🎯 **Engineered** real-time auction bidding with Socket.IO for live updates  
🎯 **Implemented** ACID-compliant transaction handling for financial operations  
🎯 **Designed** role-based dashboards with comprehensive financial analytics  
🎯 **Automated** cycle advancement, penalty calculation, and payout distribution  
🎯 **Deployed** on Vercel (frontend) and Render (backend) for scalability

---

## Conclusion

The Chit Fund Management System represents a digital transformation of a centuries-old financial practice. It's a bridge between tradition and technology—preserving the trust and community of chit funds while adding clarity, speed, and security.

**From manual record-keeping to real-time dashboards.**  
**From scattered calculations to automated intelligence.**  
**From uncertainty to confidence.**

CFMS empowers organizers and members to focus on their goals, not their paperwork.

Welcome to the future of community finance.

---

## License

[MIT](LICENSE)

---

> Built with precision, designed for trust, powered by modern technology.
