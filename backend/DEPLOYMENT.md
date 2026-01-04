# Deployment Guide for The Brain Buzz API with NGINX

This guide explains how to deploy your backend API with NGINX handling CORS instead of using the CORS middleware in your application.

## Prerequisites

- A server with Ubuntu/Debian (you can adapt commands for other distributions)
- Node.js and npm installed
- Domain name pointed to your server
- SSL certificate (recommended for production)

## Installation Steps

### 1. Install NGINX

```bash
sudo apt update
sudo apt install nginx
```

### 2. Deploy Your Node.js Application

a. Copy your application to the server (using Git, SCP, or other methods)
b. Install dependencies:

```bash
cd /path/to/your/app
npm install --production
```

c. Set environment variables:

```bash
# Create a .env file if it doesn't exist
touch .env

# Add the following environment variables
echo "NODE_ENV=production" >> .env
echo "MONGODB_URI=your_mongodb_connection_string" >> .env
echo "JWT_SECRET=your_jwt_secret" >> .env
```

d. Set up a process manager (PM2) to keep your application running:

```bash
npm install -g pm2
pm2 start server.js --name "brain-buzz-api"
pm2 save
pm2 startup
```

### 3. Configure NGINX

a. Copy the nginx.conf file to the NGINX sites-available directory:

```bash
sudo cp /path/to/your/app/nginx.conf /etc/nginx/sites-available/brain-buzz-api
```

b. Edit the configuration file to update your domain name:

```bash
sudo nano /etc/nginx/sites-available/brain-buzz-api
```

Replace `your-backend-domain.com` with your actual backend domain.

c. Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/brain-buzz-api /etc/nginx/sites-enabled/
```

d. Test the NGINX configuration:

```bash
sudo nginx -t
```

e. If the test is successful, restart NGINX:

```bash
sudo systemctl restart nginx
```

### 4. Set Up SSL with Let's Encrypt (Recommended)

a. Install Certbot:

```bash
sudo apt install certbot python3-certbot-nginx
```

b. Obtain SSL certificate:

```bash
sudo certbot --nginx -d your-backend-domain.com
```

Follow the prompts to complete the process.

## Troubleshooting

- Check NGINX logs: `sudo tail -f /var/log/nginx/error.log`
- Check application logs: `pm2 logs brain-buzz-api`
- If you need to modify CORS settings, edit the NGINX configuration and restart NGINX

## Important Notes

1. The frontend at https://thebrainbuzz.netlify.app/ is now the only origin allowed to access your API
2. CORS is handled entirely by NGINX in production
3. In development environments, the Express CORS middleware will still be active

## Security Considerations

1. Keep your Node.js and NGINX installations updated
2. Set up a firewall (UFW) to only allow necessary ports (80, 443)
3. Use strong JWT secrets and secure database credentials
4. Consider adding rate limiting to your NGINX configuration