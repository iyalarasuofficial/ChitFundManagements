# Chit Fund Management System (CFMS) - Backend

A comprehensive backend system for managing chit funds with features for organizers and members including group management, contributions, auctions, and real-time bidding.

## 🚀 Features

### For Organizers
- **Group Management**: Create, edit, and archive chit groups
- **Member Management**: Add/remove members, handle mid-cycle joins and substitutions
- **Cycle Management**: Advance cycles automatically with contribution generation
- **Auction Control**: Start, monitor, and end auctions
- **Dashboard**: View all groups, collection rates, and member risk scores
- **Penalty Management**: Apply penalties for late payments

### For Members
- **Join Groups**: Participate in multiple chit groups
- **Track Contributions**: View dues with dividend adjustments
- **Real-time Bidding**: Participate in live auctions via WebSocket
- **Dashboard**: Monitor all joined groups and upcoming payments
- **Payment History**: Track all payments and penalties

### System Features
- **JWT Authentication**: Secure OTP-based signup and login
- **Real-time Updates**: Socket.io for live auction bidding
- **Dividend Distribution**: Automatic credit to non-winners
- **Arrears Calculation**: Handle mid-cycle joins
- **Default Detection**: Auto-flag members with 3+ late payments
- **Transaction Safety**: Prisma transactions for data integrity

---

## 🛠 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma 7
- **Authentication**: JWT + bcrypt
- **Real-time**: Socket.io
- **Language**: TypeScript

---

## 📦 Installation

### Prerequisites
- Node.js 18 or higher
- PostgreSQL 14 or higher
- npm or yarn

### Setup Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd chit-fund-management/backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the backend directory:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/chitfund"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=3000
NODE_ENV=development
```

4. **Setup database**
```bash
# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

5. **Start development server**
```bash
npm run dev
```

The server will start on `http://localhost:3000`

---

## 📚 Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── src/
│   ├── config/
│   │   └── db.ts             # Prisma client configuration
│   ├── controllers/
│   │   ├── auth.controller.ts        # Authentication logic
│   │   ├── group.controller.ts       # Group CRUD + cycle management
│   │   ├── contribution.controller.ts # Payment & penalty logic
│   │   ├── auctions.controller.ts    # Auction lifecycle
│   │   └── dashboard.controller.ts   # Organizer & member dashboards
│   ├── middleware/
│   │   └── auth.middleware.ts        # JWT verification
│   ├── routes/
│   │   ├── auth.route.ts
│   │   ├── group.routes.ts
│   │   ├── contribution.routes.ts
│   │   ├── auctions.routes.ts
│   │   └── dashboard.routes.ts
│   ├── types/
│   │   └── express.d.ts              # TypeScript type extensions
│   ├── utils/
│   │   └── helper.ts                 # Business logic helpers
│   └── server.ts                     # App entry point
├── .env                              # Environment variables (not committed)
├── package.json
├── tsconfig.json
└── API_DOCUMENTATION.md              # Comprehensive API docs
```

---

## 🔑 Database Schema

### Core Models

**User**
- id, name, phone (unique), email, passwordHash
- One-to-many with GroupMember

**ChitGroup**
- id, name, contributionAmount, totalMembers, durationMonths
- currentCycle, currentPotAmount, status (pending/active/completed/archived)
- organizerFeePercent, startDate, endDate
- createdBy (User reference)

**GroupMember**
- id, groupId, userId
- role (organizer/member), status (active/left/replaced/defaulted)
- dividendCredit, arrearsAmount
- joinedAt, leftAt

**Contribution**
- id, groupMemberId, cycleNumber
- dueAmount, amountPaid, status (pending/partial/paid)
- dueDate, paymentDate, paymentMethod
- penaltyAmount, latePaymentCount

**Auction**
- id, groupId, cycleNumber
- startTime, endTime, status (running/completed/cancelled)
- winnerGroupMemberId, discountAmount, payoutAmount
- dividendPerMember

**Bid**
- id, auctionId, groupMemberId
- bidAmount, createdAt

---

## 🔐 Authentication Flow

1. **Signup**
   - POST `/api/auth/signup/send-otp` → Generates 6-digit OTP
   - POST `/api/auth/signup/verify-otp` → Verifies OTP, creates user, returns JWT

2. **Login**
   - POST `/api/auth/login` → Validates credentials, returns JWT

3. **Protected Routes**
   - Include `Authorization: Bearer <token>` header
   - Middleware verifies JWT and attaches `req.user.userId`

---

## 💰 Chit Fund Business Logic

### Cycle Flow
1. **Group Creation**: Organizer creates group (status: pending)
2. **Member Joins**: Members join until slots filled
3. **Group Activation**: Status changes to 'active' when starting
4. **Cycle Operations**:
   - Contributions generated for all members
   - Members pay dues (contribution amount - dividend credit)
   - Organizer starts auction
   - Members bid with discount amounts
   - Highest discount bid wins
   - Winner receives: `pot - discount - organizer_fee`
   - Non-winners receive dividend: `discount / (members - 1)`
5. **Cycle Advancement**: Organizer advances to next cycle
6. **Completion**: After all cycles, group status → 'completed'

### Calculations

**Pot Amount**
```
currentPotAmount = Σ(all contributions this cycle)
```

**Winner Payout**
```
organizerFee = (organizerFeePercent / 100) * currentPotAmount
payout = currentPotAmount - discount - organizerFee
```

**Dividend Per Member**
```
dividendPerMember = discount / (activeMembersCount - 1)
```

**Adjusted Due**
```
adjustedDue = contributionAmount - dividendCredit
```

**Arrears (Mid-cycle Join)**
```
arrearsAmount = (currentCycle - 1) * contributionAmount
```

**Risk Score**
```
riskScore = (latePaymentCount * 10) + (arrearsAmount / contributionAmount * 5)
```

---

## 🔥 Key API Endpoints

### Authentication
- `POST /api/auth/signup/send-otp` - Send OTP
- `POST /api/auth/signup/verify-otp` - Verify & signup
- `POST /api/auth/login` - Login

### Groups
- `POST /api/groups` 🔒 - Create group
- `PUT /api/groups/:id` 🔒 - Edit group
- `POST /api/groups/:id/advance-cycle` 🔒 - Move to next cycle
- `POST /api/groups/:id/generate-contributions` 🔒 - Generate dues

### Members
- `POST /api/groups/:id/members` 🔒 - Add member
- `DELETE /api/groups/:id/members/:memberId` 🔒 - Remove member

### Contributions
- `GET /api/groups/:id/contributions` 🔒 - List dues
- `POST /api/contributions/:id/pay` 🔒 - Record payment
- `POST /api/contributions/:id/penalty` 🔒 - Apply penalty

### Auctions
- `POST /api/auctions/:groupId/start` 🔒 - Start auction
- `POST /api/auctions/:auctionId/bid` 🔒 - Place bid
- `POST /api/auctions/:auctionId/end` 🔒 - End auction

### Dashboards
- `GET /api/dashboard/organizer` 🔒 - Organizer view
- `GET /api/dashboard/member` 🔒 - Member view

🔒 = Requires authentication

**Full API documentation**: See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

## 🧪 Testing

### Manual Testing

Use real users created via signup and authenticate with those credentials:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"<registered-phone>","password":"<registered-password>"}'
```

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

---

## 🌐 WebSocket (Socket.io) Integration

### Client Connection
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000/auction');

// Join group room
socket.emit('join', { groupId: 1 });

// Listen for events
socket.on('auctionStarted', (data) => {
  console.log('Auction started:', data);
});

socket.on('newBid', (data) => {
  console.log('New bid placed:', data);
});

socket.on('auctionEnded', (data) => {
  console.log('Auction ended:', data);
});
```

### Events
- **auctionStarted**: Broadcast when organizer starts auction
- **newBid**: Real-time bid updates
- **auctionEnded**: Winner announcement with payout details

---

## 🚨 Error Handling

All errors follow consistent format:
```json
{
  "error": "Error message description"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## 📈 Production Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET` (32+ characters)
3. Configure production PostgreSQL database
4. Enable CORS for frontend domain
5. Set up SSL/TLS certificates
6. Configure environment-specific logging

### Security Checklist
- ✅ Remove OTP from API responses in production
- ✅ Rate limiting on auth endpoints
- ✅ Input validation and sanitization
- ✅ SQL injection prevention (Prisma handles this)
- ✅ XSS protection
- ✅ HTTPS only
- ✅ Secure JWT storage on client

### Database Migrations
```bash
# Production migration
npx prisma migrate deploy
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

## 👤 Author

**Your Name**
- GitHub: [@yourusername]
- Email: your.email@example.com

---

## 🙏 Acknowledgments

- Prisma for excellent ORM
- Socket.io for real-time capabilities
- Express.js community
- PostgreSQL team

---

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Email: support@example.com
- Documentation: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

**Built with ❤️ for Chit Fund Management**
