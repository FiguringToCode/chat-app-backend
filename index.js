const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const dotenv = require('dotenv')
const http = require('http')
const jwt = require('jsonwebtoken')
const authRoutes = require('./routes/auth')
const { Server } = require('socket.io')
const Messages = require('./models/Messages.model')
const ChatUser = require('./models/User.model')


dotenv.config()

const app = express()
const server = http.createServer(app)
<<<<<<< HEAD
const io = new Server(server)
=======
const io = new Server(server, {
    cors: {
        origin: "*"
    }
})
>>>>>>> 2ddadb392ae7118c0cef9a41f6ab88d3bdb5bbd3

const corsOptions = {
    origin: "*",
    credentials: true,
    optionSuccessStatus: 200
}

app.use(cors(corsOptions))
app.use(express.json())



mongoose.connect(process.env.MONGODB, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("Connected to MongoDB"))
  .catch(error => console.error("MongoDB connection error", error))


const SECRET_KEY = process.env.ADMIN_SECRET
const MY_SECRET = process.env.JWT_SECRET

app.post('/admin/secret', (req, res) => {
    const { secret } = req.body

    if(secret === SECRET_KEY){
        const token = jwt.sign({role: "admin"}, MY_SECRET, {expiresIn: "4h"})
        res.json({message: "JWT Token Provided", token})
    }
    else {
        res.json({message: "Secret doesn't match"})
    }
})

app.use("/auth", authRoutes)



// socket io logic
io.on("connection", (socket) => {
    console.log("User connected", socket.id)

    socket.on("send_message", async (data) => {
        try {
            const { sender, receiver, message } = data
            const newMessage = new Messages({ sender, receiver, message })
            await newMessage.save()
            
            socket.to(receiver).emit("receive_message", data)
            socket.emit("message_sent", data)
        } catch (error) {
            console.log("Message save error: ", error)
            socket.emit("message_error", { error: "Failed to save message" })
        }
    })

    socket.on("join_chat", (userId) => {
        socket.join(userId)
        console.log(`User ${userId} joined room`)
    })

    socket.on("disconnect", () => {
        console.log("User disconnected", socket.id)
    })
})



app.get('/message', async (req, res) => {
    const {sender, receiver} = req.query
    try {
        const messages = await Messages.find({
            $or: [
                { sender, receiver },
                { sender: receiver, receiver: sender }
            ]
        }).sort({ createdAt: 1 })
        res.json(messages)

    } catch (error) {
        console.log("Messages fetch error:", error)
        res.status(500).json({ message: "Error fetching messages" })        
    }
})


app.get('/users', async (req, res) => {
    const { currentUser } = req.query
    try {
        const users = await ChatUser.find({username: { $ne: currentUser }})
        res.json(users)
    } catch (error) {
        console.log("User fetch error: ", error)
        res.status(500).json({message: "Error fetching users"})
    }
})



<<<<<<< HEAD
const PORT = process.env.PORT || 5001
server.listen(PORT, () => console.log(`Server running on port ${PORT}`))
=======
const PORT = process.env.MONGODB
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
>>>>>>> 2ddadb392ae7118c0cef9a41f6ab88d3bdb5bbd3
