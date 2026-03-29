# ReverSound Auth Testing Guide

## Step 1: MongoDB Verification
```bash
mongosh
use reversound_db
db.users.find({role: "admin"}).pretty()
db.users.findOne({role: "admin"}, {password_hash: 1})
# Verify: bcrypt hash starts with $2b$
```

## Step 2: API Testing via curl
```bash
API_URL="https://freelance-beats-test.preview.emergentagent.com/api"

# Login admin
curl -c cookies.txt -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@reversound.com","password":"Admin123!"}'

# Get /me
TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@reversound.com","password":"Admin123!"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

curl -H "Authorization: Bearer $TOKEN" "$API_URL/auth/me"

# Register new user
curl -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"Test User","username":"testuser","role":"producer"}'
```

## Step 3: Test Escrow Flow
```bash
# 1. Register buyer + seller
# 2. Topup buyer wallet
# 3. Create order (POST /api/orders)
# 4. Seller delivers (POST /api/orders/{id}/deliver)
# 5. Buyer approves (POST /api/orders/{id}/approve)
# 6. Check seller wallet increased (GET /api/wallet)
```
