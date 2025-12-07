# Meet & Chat Portal (Production Starter)

Full-stack MERN app with:

- JWT auth + MongoDB users
- Create/join meeting rooms
- Realtime chat (Socket.io)
- Group video call + screen sharing (WebRTC mesh)
- Vite React frontend

## 1. Backend Setup

```bash
cd server
cp .env.example .env   # update MONGO_URI, JWT_SECRET, CLIENT_ORIGIN
npm install
npm run dev
```

## 2. Frontend Setup

```bash
cd client
npm install
npm run dev
```

- API base is controlled by `VITE_API_BASE` (defaults to `http://localhost:5000`).

Create `.env` in `client` if you want custom API base:

```bash
VITE_API_BASE=http://localhost:5000
```

## 3. Usage

1. Register a new account.
2. Login.
3. Create a room or join using room code.
4. Allow camera + mic permissions.
5. Open another browser / device, login and join same room code.

You now have:

- Realtime chat
- Group video call
- Screen sharing toggle

##  Contact & Support

 Developed by [Wearl Technologies](https://wearl.co.in)  
 Email: [hello@wearl.co.in](mailto:hello@wearl.co.in)  
 Website: [https://wearl.co.in](https://wearl.co.in)  
 Instagram: [@dev.wearl](https://instagram.com/dev.wearl)

---

##  License

This project is licensed under the **GNU General Public License v2 (GPL2)**.  
You are free to modify and redistribute this software under the same license.

---

##  Contributing

Contributions, issues, and feature requests are welcome!  
1. Fork this repo  
2. Create a new branch: `git checkout -b feature/new-feature`  
3. Commit changes: `git commit -m "Added new feature"`  
4. Push and open a Pull Request  

---

##  About Wearl Technologies

**Wearl Technologies** is a digital innovation company specializing in:  
 •  Web Development 
 •  E-commerce Solutions 
 •  Mobile App Development 
 •  AI Integrations  

We help businesses **go digital and scale faster** through custom-built tech solutions.

 [Visit wearl.co.in →](https://wearl.co.in)

---

© 2025 [Wearl Technologies](https://wearl.co.in) – All Rights Reserved.
