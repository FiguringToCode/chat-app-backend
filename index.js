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
const io = new Server(server, {
    cors: {origin: "*"}
})

app.use(cors())
app.use(express.json())



mongoose.connect(process.env.MONGODB, {
}).then(() => console.log("Connected to MongoDB"))
  .catch(error => console.error("MongoDB connection error", error))


const SECRET_KEY = process.env.SECRET_KEY
const MY_SECRET = process.env.MY_SECRET

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
    // console.log("User connected", socket.id)

    socket.on("join_chat", (userId) => {
        socket.join(userId)
        console.log(`User ${userId} joined room`)
    })

    socket.on("send_message", async (data) => {
        try {
            const { sender, receiver, message } = data
            const newMessage = new Messages({ sender, receiver, message, status: 'delivered' })
            await newMessage.save()
            
            io.to(receiver).emit("receive_message", newMessage)
            io.emit("message_sent", newMessage)
        } catch (error) {
            console.log("Message save error: ", error)
            socket.emit("message_error", { error: "Failed to save message" })
        }
    })

    
    socket.on("typing", (data) => {
        socket.to(data.receiver).emit("user_typing", { username: data.sender, receiver: data.receiver })
    })

    socket.on("stop_typing", (data) => {
        socket.to(data.receiver).emit("user_stop_typing", data.sender)
    })

    socket.on("message_delivered", async (data) => {
        await Messages.updateOne({_id: data.messageId}, {status: 'delivered'})
        socket.to(data.receiver).emit("message_delivered", data)
    })

    socket.on("message_read", async (data) => {
        await Messages.updateOne({_id: data.messageId}, {status: 'read'})
        socket.to(data.sender).emit("message_read", data)
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



const PORT = process.env.MONGODB
server.listen(PORT, () => console.log(`Server running on port ${PORT}`))
