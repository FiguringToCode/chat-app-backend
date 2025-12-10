const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const ChatUser = require('../models/User.model')
const dotenv = require("dotenv")
const router = express.Router()

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET



router.post('/register', async (req, res) => {
    const { username, password } = req.body

    try {
        const userExists = await ChatUser.findOne({ username })
        if(userExists){
            return res.status(400).json({message: "User already exists. Register with different username."})
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const user = new ChatUser({ username: username, password: hashedPassword })
        await user.save()

        res.status(201).json({message: "User Registered Successfully", username: username, password: hashedPassword})

    } catch (error) {
        res.status(500).json({error: error})
    }
})



router.post('/login', async (req, res) => {
    const { username, password } = req.body

    try {
        const user = await ChatUser.findOne({ username: username })
        if(!user) return res.status(401).json({error: "Username not found."})

        const isPasswordMatched = await bcrypt.compare(password, user.password)
        if(!isPasswordMatched) return res.status(401).json({error: "Incorrect Password"})

        const token = jwt.sign({id: user._id}, JWT_SECRET, {expiresIn: "4h"})

        res.status(201).json({message: "Login Successfull", username: user.username, token: token})

    } catch (error) {
        res.status(500).json({error: error})
    }
})



module.exports = router
