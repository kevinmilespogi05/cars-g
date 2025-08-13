# Render WebSocket Configuration Guide

This guide explains how to configure your Render service to handle WebSocket connections for the real-time chat functionality.

## Overview

Render supports WebSocket connections, but requires specific configuration to work properly. The key is to run both HTTP and WebSocket servers on the same port.

## Configuration Steps

### 1. Render Dashboard Configuration

#### Environment Variables
In your Render dashboard, go to your service (`cars-g-api`) and add these environment variables:

```env
NODE_ENV=production
PORT=3001
WS_PORT=3001
FRONTEND_URL=https://cars-g.vercel.app
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Service Settings
1. **Build Command**: `npm install`
2. **Start Command**: `npm start`
3. **Health Check Path**: `/health`
4. **Auto-Deploy**: Enabled

### 2. Server Configuration

The server is now configured to handle both HTTP and WebSocket connections on the same port:

- **HTTP Server**: Handles API requests and health checks
- **WebSocket Server**: Handles real-time chat connections
- **Port**: Both services run on the same port (3001)

### 3. Frontend Configuration

Update your frontend environment variables:

```env
# Production
VITE_WS_URL=wss://cars-g-api.onrender.com

# Development
VITE_WS_URL=ws://localhost:3001
```

## Testing the Configuration

### 1. Health Check
Test the HTTP server:
```bash
curl https://cars-g-api.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "websocket": {
    "connections": 0,
    "rooms": 0,
    "users": 0
  }
}
```

### 2. WebSocket Connection Test
Use the test script:
```bash
VITE_WS_URL=wss://cars-g-api.onrender.com npm run test:websocket
```

### 3. Browser Test
Open browser console and test:
```javascript
const ws = new WebSocket('wss://cars-g-api.onrender.com');
ws.onopen = () => console.log('Connected!');
ws.onmessage = (event) => console.log('Message:', JSON.parse(event.data));
ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
```

## Common Issues and Solutions

### Issue 1: WebSocket Connection Fails
**Symptoms**: Connection timeout or refused
**Solution**: 
- Verify the service is running: `curl https://cars-g-api.onrender.com/health`
- Check environment variables in Render dashboard
- Ensure `VITE_WS_URL` uses `wss://` protocol

### Issue 2: CORS Errors
**Symptoms**: Browser console shows CORS errors
**Solution**:
- Verify `FRONTEND_URL` is set correctly in Render
- Check that the frontend URL matches your actual frontend domain

### Issue 3: Service Not Starting
**Symptoms**: Build fails or service doesn't start
**Solution**:
- Check Render logs for errors
- Verify all environment variables are set
- Ensure `package.json` has correct start script

### Issue 4: WebSocket Messages Not Received
**Symptoms**: Connection works but no messages
**Solution**:
- Check server logs for WebSocket errors
- Verify message format matches expected structure
- Test with the provided test script

## Monitoring and Debugging

### 1. Render Logs
Access logs in Render dashboard:
- Go to your service
- Click on "Logs" tab
- Look for WebSocket connection messages

### 2. Server Health Endpoint
Monitor server status:
```bash
curl https://cars-g-api.onrender.com/health
```

### 3. WebSocket Statistics
The server logs statistics every minute:
```
📊 Server Stats - HTTP: 3001, WS Connections: 5, Rooms: 3, Users: 4
```

## Performance Considerations

### 1. Connection Limits
- Free tier: Limited concurrent connections
- Monitor connection count in health endpoint
- Implement connection pooling if needed

### 2. Memory Usage
- WebSocket connections consume memory
- Monitor memory usage in Render dashboard
- Implement proper cleanup for disconnected clients

### 3. Rate Limiting
- Server includes rate limiting for messages and connections
- Adjust limits in `server/api.js` if needed
- Monitor rate limit violations in logs

## Security Considerations

### 1. Authentication
- WebSocket connections should be authenticated
- Implement token validation for sensitive operations
- Use HTTPS/WSS in production

### 2. Input Validation
- Validate all WebSocket messages
- Sanitize user input
- Implement proper error handling

### 3. Rate Limiting
- Prevent abuse with rate limiting
- Monitor for suspicious activity
- Implement IP-based blocking if needed

## Troubleshooting Checklist

- [ ] Service is deployed and running
- [ ] Environment variables are set correctly
- [ ] Health endpoint returns 200 OK
- [ ] WebSocket URL uses correct protocol (`wss://`)
- [ ] CORS is configured properly
- [ ] No firewall blocking WebSocket connections
- [ ] Client can connect to WebSocket endpoint
- [ ] Messages are being sent and received
- [ ] Server logs show WebSocket activity

## Support

If you encounter issues:

1. Check Render logs for errors
2. Verify environment variables
3. Test with the provided test script
4. Check the health endpoint
5. Review this configuration guide

## Additional Resources

- [Render WebSocket Documentation](https://render.com/docs/websockets)
- [WebSocket Protocol Specification](https://tools.ietf.org/html/rfc6455)
- [Node.js WebSocket Library](https://github.com/websockets/ws) 