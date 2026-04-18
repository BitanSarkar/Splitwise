# Deploying to EC2

## 1. Launch EC2 Instance

- AMI: **Amazon Linux 2023** or Ubuntu 22.04
- Instance type: **t4g.nano** (~$3/mo ARM) or **t2.micro** (free tier 12mo)
- Storage: 8 GB gp3 is enough
- Security group: open ports **22** (SSH), **80** (HTTP), **443** (HTTPS)

## 2. Set Up Database (SQLite on EC2 — no external service needed)

The database is a plain SQLite file on the EC2 disk. Nothing to install or sign up for.

After deploying the app (step 5), run:
```bash
npm run db:push   # creates local.db and applies the schema
```

The file lives at `~/splitwise/local.db` on your EC2 instance.

## 3. Set Up Google OAuth

1. Go to console.cloud.google.com → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add Authorized redirect URIs:
   - `http://your-ec2-ip/api/auth/callback/google`
   - `https://your-domain.com/api/auth/callback/google` (after SSL)
4. Copy Client ID → `GOOGLE_CLIENT_ID`
5. Copy Client Secret → `GOOGLE_CLIENT_SECRET`

## 4. SSH Into EC2 and Install Dependencies

```bash
ssh -i your-key.pem ec2-user@your-ec2-ip

# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# For Ubuntu: use apt
# curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
# sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install nginx
sudo yum install -y nginx    # Amazon Linux
# sudo apt install -y nginx  # Ubuntu
```

## 5. Deploy the App

```bash
# Clone / upload your repo
git clone https://github.com/your-user/splitwise.git
cd splitwise

# Install dependencies
npm install

# Create .env.local with your real values
cat > .env.local << 'EOF'
AUTH_SECRET=<run: openssl rand -base64 32>
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
TURSO_DATABASE_URL=file:./local.db
NEXTAUTH_URL=http://your-ec2-ip
EOF

# Create and apply the DB schema
npm run db:push

# Build
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # follow the printed command to auto-start on reboot
```

## 6. Configure Nginx

```bash
sudo cp nginx.conf /etc/nginx/conf.d/splitwise.conf
# Edit the server_name line to your EC2 IP or domain
sudo nginx -t      # test config
sudo systemctl enable nginx
sudo systemctl start nginx
```

## 7. (Optional) Free SSL with Let's Encrypt

```bash
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
# Follow prompts — auto-renews every 90 days
```

## Cost Summary

| Resource | Monthly Cost |
|---|---|
| EC2 t4g.nano | ~$3.07 |
| EC2 t2.micro (free tier year 1) | $0 |
| EBS 8 GB gp3 | ~$0.64 |
| SQLite on EBS (no external DB) | $0 |
| Data transfer (first 100 GB) | $0 |
| **Total** | **~$3–4/month** |

## Updating the App

```bash
git pull
npm install
npm run build
pm2 restart splitwise
```
